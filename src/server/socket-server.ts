/**
 * Socket.io Server Engine & Real-Time Event Dispatcher (Milestone 4 + Milestone 5)
 *
 * Implements:
 * - Cookie JWT & Guest Session Authentication Handshake.
 * - Room Pinning & Cross-Room Tampering Prevention.
 * - Token Bucket Rate Limiting (4 msgs / 2s chat, 40 batches/s drawing, 200ms fill cooldown).
 * - Late-Join 50ms Canvas Action History Replay.
 * - Solvers-Only Chat Isolation & Levenshtein Near-Miss Alerts.
 * - Unified Room Orchestrator for Seamless Activity Switching across all 7 games.
 * - Full socket event wiring for the 6 Youth Integration Activities:
 *   Two Truths, This or That, Story Chain, Hot Seat, Quiz Superlatives, Human Bingo.
 */

import { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  ChameleonColors,
  Player,
  StrokeBatch,
  FillAction,
  CanvasAction,
  RysowanieRoomState,
} from "./types";
import { roomManager } from "./rooms/room-manager";
import { verifyAccessToken } from "../lib/auth/jwt";
import { CollaborativeBoardSession } from "./games/collaborative-board-state";

export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

interface RateLimitTracker {
  chatTimestamps: number[];
  lastStrokeBatchTime: number;
  strokeBatchCount: number;
  lastFillTime: number;
}

export function initSocketServer(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6, // 1MB
  });

  // Global socket rate limiting map
  const rateLimiters = new Map<string, RateLimitTracker>();

  // Handshake Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth || {};
      const query = socket.handshake.query || {};

      // 1. Check for JWT accessToken in cookie or auth header
      let token: string | undefined = auth.token;
      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(";");
        for (const c of cookies) {
          const [k, v] = c.trim().split("=");
          if (k === "tb_access_token" || k === "accessToken") {
            token = v;
            break;
          }
        }
      }

      let userId = "";
      let userName = "";
      let isGuest = true;

      if (token) {
        const payload = await verifyAccessToken(token);
        if (payload) {
          userId = payload.sub;
          userName = payload.name;
          isGuest = false;
        }
      }

      // 2. Guest fallback
      if (!userId) {
        const guestName = (auth.guestName || query.guestName || "").toString().trim();
        userId = `guest_${socket.id.substring(0, 8)}`;
        userName = guestName || `Gość ${socket.id.substring(0, 4)}`;
        isGuest = true;
      }

      const defaultColors: ChameleonColors = {
        primary: "#06B6D4",
        secondary: "#4F46E5",
        accent: "#F59E0B",
      };

      const chameleonColors: ChameleonColors = auth.chameleonColors || defaultColors;

      socket.data = {
        userId,
        userName,
        isGuest,
        chameleonColors,
      };

      next();
    } catch {
      next(new Error("Błąd uwierzytelniania połączenia WebSocket"));
    }
  });

  io.on("connection", (socket: AppSocket) => {
    const socketId = socket.id;
    rateLimiters.set(socketId, {
      chatTimestamps: [],
      lastStrokeBatchTime: 0,
      strokeBatchCount: 0,
      lastFillTime: 0,
    });

    const limiter = rateLimiters.get(socketId)!;

    // Helper to broadcast unified state to room with per-client masking
    const broadcastUnifiedState = (roomCode: string) => {
      const session = roomManager.getRoom(roomCode);
      if (!session) return;

      const room = io.sockets.adapter.rooms.get(upperRoom(roomCode));
      if (!room) return;

      for (const sId of room) {
        const s = io.sockets.sockets.get(sId) as AppSocket | undefined;
        if (s) {
          const uState = session.getUnifiedState(s.data.userId);
          s.emit("room:unified_state_sync", uState);
        }
      }

      // Backward compatibility broadcast
      io.to(upperRoom(roomCode)).emit("room:state_sync", sanitizeStateForClients(session.rysowanieSession.state));
    };

    // -----------------------------------------------------------
    // Room Joining & Room Pinning
    // -----------------------------------------------------------
    socket.on("room:join", ({ roomCode, guestName, chameleonColors }) => {
      if (!roomCode) return;

      const upperRoomCode = roomCode.toUpperCase().trim();
      socket.data.roomId = upperRoomCode;
      if (guestName) socket.data.userName = guestName.trim();
      if (chameleonColors) socket.data.chameleonColors = chameleonColors;

      socket.join(upperRoomCode);

      // Create or retrieve session in RoomManager
      const session = roomManager.getOrCreateRoom(
        upperRoomCode,
        socket.data.userId,
        undefined,
        {
          onStateUpdate: () => {
            broadcastUnifiedState(upperRoomCode);
          },
          onRysowanieStateUpdate: (rState) => {
            io.to(upperRoomCode).emit("room:state_sync", sanitizeStateForClients(rState));
          },
          onGameOver: (podium) => {
            io.to(upperRoomCode).emit("game:over", {
              podium: podium as { player: Player; rank: number; score: number }[],
            });
          },
          onScoresUpdate: (sessionScores) => {
            io.to(upperRoomCode).emit("session:scores_update", { sessionScores });
          },
        }
      );

      // Reclaim host if previous host disconnected or reconnected with same name
      const currentHostPlayer = session.players[session.hostId];
      if (
        !currentHostPlayer ||
        (currentHostPlayer.name === socket.data.userName && currentHostPlayer.id !== socket.data.userId)
      ) {
        if (currentHostPlayer && currentHostPlayer.id !== socket.data.userId) {
          session.removePlayer(currentHostPlayer.id);
        }
        session.hostId = socket.data.userId;
        session.rysowanieSession.state.hostId = socket.data.userId;
      }

      // Register player in state machine
      const isHost = session.hostId === socket.data.userId;
      const player: Player = {
        id: socket.data.userId,
        name: socket.data.userName,
        isHost,
        isGuest: socket.data.isGuest,
        score: session.players[socket.data.userId]?.score || 0,
        isConnected: true,
        chameleonColors: socket.data.chameleonColors,
      };

      session.addPlayer(player);

      // Send initial state syncs to joining client
      socket.emit("room:state_sync", sanitizeStateForClient(session.rysowanieSession.state, socket.data.userId));
      socket.emit("room:unified_state_sync", session.getUnifiedState(socket.data.userId));
      socket.emit("session:scores_update", { sessionScores: session.sessionScores });

      // Replay canvas history for late-joining client if drawing
      if (session.rysowanieSession.state.canvasHistory.length > 0) {
        socket.emit("canvas:replay", { actions: session.rysowanieSession.state.canvasHistory });
      }

      // If drawer is currently selecting words, unicast word options to drawer
      if (
        session.rysowanieSession.state.phase === "WORD_SELECTION" &&
        session.rysowanieSession.state.currentDrawerId === socket.data.userId
      ) {
        socket.emit("game:word_options", { words: session.rysowanieSession.state.wordsToChoose });
      }

      // Broadcast updated room state to all peers
      broadcastUnifiedState(upperRoomCode);
    });

    const ensureOrCheckHost = (session: NonNullable<ReturnType<typeof roomManager.getRoom>>): boolean => {
      if (session.hostId === socket.data.userId) return true;
      const hostPlayer = session.players[session.hostId];
      if (!hostPlayer || hostPlayer.name === socket.data.userName) {
        session.hostId = socket.data.userId;
        session.rysowanieSession.state.hostId = socket.data.userId;
        if (session.players[socket.data.userId]) {
          session.players[socket.data.userId].isHost = true;
        }
        return true;
      }
      return false;
    };

    // -----------------------------------------------------------
    // Game Lifecycle & Activity Switching
    // -----------------------------------------------------------
    socket.on("game:switch", ({ gameType }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode || !gameType) return;
      const session = roomManager.getRoom(roomCode);
      if (!session) return;

      if (!ensureOrCheckHost(session)) {
        socket.emit("error:notice", { message: "Tylko gospodarz może zmieniać aktywność." });
        return;
      }

      session.switchGame(gameType);
      io.to(upperRoom(roomCode)).emit("game:switched", { gameType });
      broadcastUnifiedState(roomCode);
    });

    socket.on("game:start", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session) return;

      if (!ensureOrCheckHost(session)) {
        socket.emit("error:notice", { message: "Tylko gospodarz może rozpocząć grę." });
        return;
      }

      session.startGame();

      if (session.currentGameType === "RYSOWANIE") {
        if (session.rysowanieSession.state.currentDrawerId) {
          io.to(upperRoom(roomCode)).emit("room:state_sync", sanitizeStateForClients(session.rysowanieSession.state));
          const drawerSocket = findSocketByUserId(io, roomCode, session.rysowanieSession.state.currentDrawerId);
          if (drawerSocket) {
            drawerSocket.emit("game:word_options", { words: session.rysowanieSession.state.wordsToChoose });
          }
        }
      }

      broadcastUnifiedState(roomCode);
    });

    socket.on("game:restart", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session) return;

      if (!ensureOrCheckHost(session)) return;

      session.startGame();
      broadcastUnifiedState(roomCode);
    });

    socket.on("settings:update", (newSettings) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session) return;

      if (!ensureOrCheckHost(session)) return;

      session.updateSettings(newSettings);
      broadcastUnifiedState(roomCode);
    });

    // -----------------------------------------------------------
    // RYSOWANIE Canvas Actions
    // -----------------------------------------------------------
    socket.on("game:select_word", ({ word }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || session.currentGameType !== "RYSOWANIE") return;

      if (session.rysowanieSession.state.currentDrawerId !== socket.data.userId) return;

      session.selectWord(word);
      io.to(upperRoom(roomCode)).emit("room:state_sync", sanitizeStateForClients(session.rysowanieSession.state));
      broadcastUnifiedState(roomCode);
    });

    socket.on("draw:stroke_batch", (batch: StrokeBatch) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || session.currentGameType !== "RYSOWANIE") return;

      if (
        session.rysowanieSession.state.currentDrawerId !== socket.data.userId ||
        session.rysowanieSession.state.phase !== "DRAWING"
      ) {
        return;
      }

      const now = Date.now();
      if (now - limiter.lastStrokeBatchTime < 20) {
        return;
      }
      limiter.lastStrokeBatchTime = now;

      const action: CanvasAction = {
        type: "stroke",
        points: batch.points,
        color: batch.color,
        size: batch.size,
      };
      session.addCanvasAction(action);
      socket.to(upperRoom(roomCode)).emit("draw:stroke_batch", batch);
    });

    socket.on("draw:fill", (fill: FillAction) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || session.currentGameType !== "RYSOWANIE") return;

      if (
        session.rysowanieSession.state.currentDrawerId !== socket.data.userId ||
        session.rysowanieSession.state.phase !== "DRAWING"
      ) {
        return;
      }

      const now = Date.now();
      if (now - limiter.lastFillTime < 200) {
        return;
      }
      limiter.lastFillTime = now;

      const action: CanvasAction = {
        type: "fill",
        x: fill.x,
        y: fill.y,
        color: fill.color,
      };
      session.addCanvasAction(action);
      socket.to(upperRoom(roomCode)).emit("draw:fill", fill);
    });

    socket.on("draw:clear", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || session.currentGameType !== "RYSOWANIE") return;

      if (
        session.rysowanieSession.state.currentDrawerId !== socket.data.userId ||
        session.rysowanieSession.state.phase !== "DRAWING"
      ) {
        return;
      }

      session.clearCanvas();
      io.to(upperRoom(roomCode)).emit("draw:clear");
    });

    socket.on("draw:undo", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || session.currentGameType !== "RYSOWANIE") return;

      if (
        session.rysowanieSession.state.currentDrawerId !== socket.data.userId ||
        session.rysowanieSession.state.phase !== "DRAWING"
      ) {
        return;
      }

      session.undoCanvasAction();
      io.to(upperRoom(roomCode)).emit("canvas:replay", {
        actions: session.rysowanieSession.state.canvasHistory,
      });
    });

    // -----------------------------------------------------------
    // Chat & Guess Submission
    // -----------------------------------------------------------
    socket.on("chat:send", ({ text }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode || !text) return;
      const session = roomManager.getRoom(roomCode);
      if (!session) return;

      const now = Date.now();
      limiter.chatTimestamps = limiter.chatTimestamps.filter((t) => now - t < 2000);
      if (limiter.chatTimestamps.length >= 4) {
        socket.emit("rate_limit:warning", {
          message: "Wysyłasz wiadomości zbyt szybko. Poczekaj chwilę.",
        });
        return;
      }
      limiter.chatTimestamps.push(now);

      const result = session.processMessage(socket.data.userId, text);
      if (!result.message) return;

      if (result.targetAudience === "solvers_and_drawer") {
        const drawerId = session.rysowanieSession.state.currentDrawerId;
        const recipientIds = new Set([drawerId, ...session.rysowanieSession.state.solvedPlayerIds]);

        io.in(upperRoom(roomCode))
          .fetchSockets()
          .then((roomSockets) => {
            for (const s of roomSockets) {
              const uId = (s.data as SocketData)?.userId;
              if (uId && recipientIds.has(uId)) {
                s.emit("chat:message", result.message!);
              }
            }
          });
      } else {
        io.to(upperRoom(roomCode)).emit("chat:message", result.message);

        if (result.isCorrect) {
          const player = session.players[socket.data.userId];
          io.to(upperRoom(roomCode)).emit("guess:correct", {
            playerId: socket.data.userId,
            points: result.points,
            totalScore: player?.score || 0,
          });
        }

        if (result.isClose) {
          io.to(upperRoom(roomCode)).emit("guess:close", {
            playerId: socket.data.userId,
            playerName: socket.data.userName,
          });
        }
      }
    });

    // -----------------------------------------------------------
    // TWO TRUTHS AND A LIE
    // -----------------------------------------------------------
    socket.on("two_truths:submit", ({ statements, lieIndex }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.twoTruthsSession) return;

      const success = session.twoTruthsSession.submitStatements(
        socket.data.userId,
        statements,
        lieIndex
      );
      if (success) {
        broadcastUnifiedState(roomCode);
      }
    });

    socket.on("two_truths:vote", ({ statementIndex }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.twoTruthsSession) return;

      const success = session.twoTruthsSession.submitVote(
        socket.data.userId,
        statementIndex
      );
      if (success) {
        broadcastUnifiedState(roomCode);
      }
    });

    socket.on("two_truths:reveal", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.twoTruthsSession) return;

      session.twoTruthsSession.revealLie();
      const state = session.twoTruthsSession.state;
      io.to(upperRoom(roomCode)).emit("two_truths:card_revealed", {
        lieIndex: state.lieIndex ?? 0,
        bluffScore: state.bluffScore,
        fooledCount: state.fooledCount,
      });
      broadcastUnifiedState(roomCode);
    });

    socket.on("two_truths:next", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.twoTruthsSession) return;

      if (session.hostId !== socket.data.userId) return;

      session.twoTruthsSession.nextTurn();
      broadcastUnifiedState(roomCode);
    });

    // -----------------------------------------------------------
    // THIS OR THAT
    // -----------------------------------------------------------
    socket.on("this_or_that:vote", ({ choice }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.thisOrThatSession) return;

      session.thisOrThatSession.submitVote(socket.data.userId, choice);
      broadcastUnifiedState(roomCode);
    });

    socket.on("this_or_that:next", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.thisOrThatSession) return;

      if (session.hostId !== socket.data.userId) return;

      session.thisOrThatSession.nextDilemma();
      broadcastUnifiedState(roomCode);
    });

    // -----------------------------------------------------------
    // STORY CHAIN
    // -----------------------------------------------------------
    socket.on("story_chain:submit", ({ text }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.storyChainSession) return;

      const success = session.storyChainSession.submitSegment(socket.data.userId, text);
      if (success) {
        broadcastUnifiedState(roomCode);
      }
    });

    socket.on("story_chain:pass", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.storyChainSession) return;

      if (
        session.storyChainSession.state.currentTurnPlayerId === socket.data.userId ||
        session.hostId === socket.data.userId
      ) {
        session.storyChainSession.passTurn();
        broadcastUnifiedState(roomCode);
      }
    });

    socket.on("story_chain:set_mode", ({ mode }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.storyChainSession) return;

      if (session.hostId !== socket.data.userId) return;

      session.storyChainSession.setMode(mode);
      broadcastUnifiedState(roomCode);
    });

    // -----------------------------------------------------------
    // HOT SEAT
    // -----------------------------------------------------------
    socket.on("hot_seat:select_speaker", ({ speakerId }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.hotSeatSession) return;

      if (session.hostId !== socket.data.userId && socket.data.userId !== speakerId) return;

      session.hotSeatSession.selectSpeaker(speakerId);
      io.to(upperRoom(roomCode)).emit("hot_seat:speaker_spotlight", { speakerId });
      broadcastUnifiedState(roomCode);
    });

    socket.on("hot_seat:pick_question", ({ question, tier }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.hotSeatSession) return;

      session.hotSeatSession.pickQuestion(question, tier);
      broadcastUnifiedState(roomCode);
    });

    socket.on("hot_seat:submit_question", ({ text }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.hotSeatSession) return;

      session.hotSeatSession.submitAudienceQuestion(socket.data.userId, text);
      io.to(upperRoom(roomCode)).emit(
        "hot_seat:question_queue_update",
        { queue: session.hotSeatSession.state.questionQueue }
      );
      broadcastUnifiedState(roomCode);
    });

    socket.on("hot_seat:upvote_question", ({ questionId }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.hotSeatSession) return;

      session.hotSeatSession.upvoteQuestion(questionId, socket.data.userId);
      io.to(upperRoom(roomCode)).emit(
        "hot_seat:question_queue_update",
        { queue: session.hotSeatSession.state.questionQueue }
      );
      broadcastUnifiedState(roomCode);
    });

    socket.on("hot_seat:pass", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.hotSeatSession) return;

      if (
        session.hotSeatSession.state.activeSpeakerId === socket.data.userId ||
        session.hostId === socket.data.userId
      ) {
        session.hotSeatSession.passLifeline();
        broadcastUnifiedState(roomCode);
      }
    });

    socket.on("hot_seat:complete_answer", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.hotSeatSession) return;

      if (
        session.hotSeatSession.state.activeSpeakerId === socket.data.userId ||
        session.hostId === socket.data.userId
      ) {
        session.hotSeatSession.completeAnswer();
        broadcastUnifiedState(roomCode);
      }
    });

    // -----------------------------------------------------------
    // QUIZ SUPERLATIVES
    // -----------------------------------------------------------
    socket.on("quiz_superlatives:vote", ({ targetPlayerId }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.quizSuperlativesSession) return;

      session.quizSuperlativesSession.submitVote(socket.data.userId, targetPlayerId);
      broadcastUnifiedState(roomCode);
    });

    socket.on("quiz_superlatives:next", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.quizSuperlativesSession) return;

      if (session.hostId !== socket.data.userId) return;

      session.quizSuperlativesSession.nextPrompt();
      broadcastUnifiedState(roomCode);
    });

    // -----------------------------------------------------------
    // HUMAN BINGO
    // -----------------------------------------------------------
    socket.on("bingo:set_grid_size", ({ size }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.humanBingoSession) return;

      if (session.hostId !== socket.data.userId) return;

      session.humanBingoSession.setGridSize(size);
      broadcastUnifiedState(roomCode);
    });

    socket.on("bingo:claim_tile", ({ tileIndex, targetPlayerId }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.humanBingoSession) return;

      const success = session.humanBingoSession.claimTile(
        socket.data.userId,
        tileIndex,
        targetPlayerId
      );

      if (success) {
        // Find target socket and unicast verify_request
        const targetSocket = findSocketByUserId(io, roomCode, targetPlayerId);
        const grid = session.humanBingoSession.state.playerGrids[socket.data.userId];
        const tile = grid?.[tileIndex];

        if (targetSocket && tile) {
          // Find pending request ID
          const pending = Object.values(
            session.humanBingoSession.state.pendingVerifications
          ).find(
            (p) =>
              p.requesterId === socket.data.userId &&
              p.targetId === targetPlayerId &&
              p.tileIndex === tileIndex
          );

          if (pending) {
            targetSocket.emit("bingo:verify_request", {
              verificationId: pending.id,
              requesterId: pending.requesterId,
              requesterName: pending.requesterName,
              trait: pending.trait,
              tileIndex: pending.tileIndex,
            });
          }
        }

        broadcastUnifiedState(roomCode);
      }
    });

    socket.on("bingo:verify_response", ({ verificationId, approved }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.humanBingoSession) return;

      session.humanBingoSession.respondVerification(
        verificationId,
        approved,
        socket.data.userId
      );
      broadcastUnifiedState(roomCode);
    });

    // -----------------------------------------------------------
    // ROOM MEETING URL & BREAKOUT GROUPS
    // -----------------------------------------------------------
    socket.on("room:set_meeting_url", ({ meetingUrl }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session) return;
      if (session.hostId !== socket.data.userId) return;

      session.setMeetingUrl(meetingUrl);
      io.to(upperRoom(roomCode)).emit("room:meeting_url_update", { meetingUrl });
      broadcastUnifiedState(roomCode);
    });

    socket.on("room:create_breakout_groups", ({ count, shuffle = true }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session) return;
      if (session.hostId !== socket.data.userId) return;

      session.createBreakoutGroups(count, shuffle);
      io.to(upperRoom(roomCode)).emit("room:breakout_groups_sync", {
        breakoutGroups: session.breakoutGroups,
      });
      broadcastUnifiedState(roomCode);
    });

    socket.on("room:assign_breakout_group", ({ playerId, groupId }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session) return;
      if (session.hostId !== socket.data.userId) return;

      session.assignBreakoutGroup(playerId, groupId);
      io.to(upperRoom(roomCode)).emit("room:breakout_groups_sync", {
        breakoutGroups: session.breakoutGroups,
      });
      broadcastUnifiedState(roomCode);
    });

    // -----------------------------------------------------------
    // COLLABORATIVE BOARD (JAMBOARD)
    // -----------------------------------------------------------
    socket.on("board:add_note", (payload) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session) return;

      if (!session.collaborativeBoardSession) {
        session.collaborativeBoardSession = new CollaborativeBoardSession(roomCode, {
          onStateUpdate: () => broadcastUnifiedState(roomCode),
        });
      }

      session.collaborativeBoardSession.addNote({
        ...payload,
        authorId: socket.data.userId,
        authorName: socket.data.userName,
      });
      broadcastUnifiedState(roomCode);
    });

    socket.on("board:update_note", (payload) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.collaborativeBoardSession) return;

      session.collaborativeBoardSession.updateNote(payload);
      broadcastUnifiedState(roomCode);
    });

    socket.on("board:delete_note", ({ id }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.collaborativeBoardSession) return;

      session.collaborativeBoardSession.deleteNote(id);
      broadcastUnifiedState(roomCode);
    });

    socket.on("board:add_pin", (payload) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session) return;

      if (!session.collaborativeBoardSession) {
        session.collaborativeBoardSession = new CollaborativeBoardSession(roomCode, {
          onStateUpdate: () => broadcastUnifiedState(roomCode),
        });
      }

      session.collaborativeBoardSession.addPin({
        ...payload,
        authorName: socket.data.userName,
      });
      broadcastUnifiedState(roomCode);
    });

    socket.on("board:delete_pin", ({ id }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.collaborativeBoardSession) return;

      session.collaborativeBoardSession.deletePin(id);
      broadcastUnifiedState(roomCode);
    });

    socket.on("board:draw_stroke", (stroke) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session) return;

      if (!session.collaborativeBoardSession) {
        session.collaborativeBoardSession = new CollaborativeBoardSession(roomCode, {
          onStateUpdate: () => broadcastUnifiedState(roomCode),
        });
      }

      session.collaborativeBoardSession.addStroke(stroke);
      broadcastUnifiedState(roomCode);
    });

    socket.on("board:clear", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.collaborativeBoardSession) return;

      session.collaborativeBoardSession.clear();
      broadcastUnifiedState(roomCode);
    });

    // -----------------------------------------------------------
    // SURVIVAL CHALLENGE
    // -----------------------------------------------------------
    socket.on("survival:select_scenario", ({ scenario }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.survivalChallengeSession) return;
      if (session.hostId !== socket.data.userId) return;

      session.survivalChallengeSession.setScenario(scenario);
      broadcastUnifiedState(roomCode);
    });

    socket.on("survival:submit_individual", ({ ranking }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.survivalChallengeSession) return;

      session.survivalChallengeSession.submitIndividualRanking(socket.data.userId, ranking);
      broadcastUnifiedState(roomCode);
    });

    socket.on("survival:submit_team", ({ ranking }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.survivalChallengeSession) return;

      const player = session.players[socket.data.userId];
      const groupId = player?.breakoutGroupId || "team";
      session.survivalChallengeSession.submitTeamRanking(groupId, ranking);
      broadcastUnifiedState(roomCode);
    });

    socket.on("survival:next_phase", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.survivalChallengeSession) return;
      if (session.hostId !== socket.data.userId) return;

      const currentPhase = session.survivalChallengeSession.state.phase;
      if (currentPhase === "LOBBY") {
        session.survivalChallengeSession.startIndividualPhase();
      } else if (currentPhase === "INDIVIDUAL_RANKING") {
        session.survivalChallengeSession.startTeamPhase();
      } else if (currentPhase === "TEAM_RANKING") {
        session.survivalChallengeSession.revealResults();
      } else if (currentPhase === "EXPERT_REVEAL") {
        session.survivalChallengeSession.startDebriefing();
      }
      broadcastUnifiedState(roomCode);
    });

    // -----------------------------------------------------------
    // INFORMATION DEDUCTION SUITE
    // -----------------------------------------------------------
    socket.on("deduction:select_game", ({ gameId }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.informationDeductionSession) return;
      if (session.hostId !== socket.data.userId) return;

      session.informationDeductionSession.setGame(gameId);
      session.informationDeductionSession.dealCards(Object.keys(session.players));
      broadcastUnifiedState(roomCode);
    });

    socket.on("deduction:deal_cards", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.informationDeductionSession) return;
      if (session.hostId !== socket.data.userId) return;

      session.informationDeductionSession.dealCards(Object.keys(session.players));
      broadcastUnifiedState(roomCode);
    });

    socket.on("deduction:update_notes", ({ notes }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.informationDeductionSession) return;

      session.informationDeductionSession.updateNotes(notes);
      broadcastUnifiedState(roomCode);
    });

    socket.on("deduction:submit_solution", ({ solution }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.informationDeductionSession) return;

      session.informationDeductionSession.submitSolution(solution);
      broadcastUnifiedState(roomCode);
    });

    socket.on("deduction:designate_negotiator", ({ playerId }) => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.informationDeductionSession) return;
      if (session.hostId !== socket.data.userId) return;

      session.informationDeductionSession.designateNegotiator(playerId);
      broadcastUnifiedState(roomCode);
    });

    socket.on("deduction:next_phase", () => {
      const roomCode = socket.data.roomId;
      if (!roomCode) return;
      const session = roomManager.getRoom(roomCode);
      if (!session || !session.informationDeductionSession) return;
      if (session.hostId !== socket.data.userId) return;

      const curPhase = session.informationDeductionSession.state.phase;
      if (curPhase === "LOBBY") {
        session.informationDeductionSession.dealCards(Object.keys(session.players));
        session.informationDeductionSession.setPhase("INVESTIGATION");
      } else if (curPhase === "INVESTIGATION") {
        session.informationDeductionSession.setPhase("ACCUSATION");
      } else if (curPhase === "ACCUSATION") {
        session.informationDeductionSession.setPhase("SOLUTION_REVEAL");
      } else if (curPhase === "SOLUTION_REVEAL") {
        session.informationDeductionSession.setPhase("DEBRIEFING");
      }
      broadcastUnifiedState(roomCode);
    });

    // -----------------------------------------------------------
    // Disconnection & Cleanup
    // -----------------------------------------------------------
    socket.on("disconnect", () => {
      rateLimiters.delete(socketId);
      const roomCode = socket.data.roomId;
      if (!roomCode) return;

      const session = roomManager.getRoom(roomCode);
      if (session) {
        session.removePlayer(socket.data.userId);
        broadcastUnifiedState(roomCode);
      }
    });
  });

  return io;
}

// -------------------------------------------------------------
// Security & Masking Helpers
// -------------------------------------------------------------

function upperRoom(roomCode: string): string {
  return roomCode.toUpperCase().trim();
}

function findSocketByUserId(io: Server, roomCode: string, userId: string): AppSocket | undefined {
  const room = io.sockets.adapter.rooms.get(upperRoom(roomCode));
  if (!room) return undefined;

  for (const socketId of room) {
    const s = io.sockets.sockets.get(socketId) as AppSocket | undefined;
    if (s && s.data.userId === userId) {
      return s;
    }
  }
  return undefined;
}

/**
 * Strips secret words from room state for general broadcast to clients.
 */
function sanitizeStateForClients(state: RysowanieRoomState): RysowanieRoomState {
  return {
    ...state,
    currentWord: state.phase === "TURN_INTERMISSION" || state.phase === "GAME_OVER" ? state.currentWord : null,
    wordsToChoose: [],
  };
}

/**
 * Returns customized state for a specific client (e.g. drawer sees currentWord and wordsToChoose).
 */
function sanitizeStateForClient(state: RysowanieRoomState, targetUserId: string): RysowanieRoomState {
  const isDrawer = state.currentDrawerId === targetUserId;
  const isRevealed = state.phase === "TURN_INTERMISSION" || state.phase === "GAME_OVER";

  return {
    ...state,
    currentWord: isDrawer || isRevealed ? state.currentWord : null,
    wordsToChoose: isDrawer ? state.wordsToChoose : [],
  };
}
