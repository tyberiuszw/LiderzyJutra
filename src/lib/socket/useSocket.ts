"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  RysowanieRoomState,
  UnifiedRoomState,
  SessionScoreData,
  GameType,
  CanvasAction,
  StrokeBatch,
  FillAction,
  ChatMessage,
  ChameleonColors,
  RoomSettings,
  Player,
  IncomingBingoRequest,
  BingoWinnerRecord,
  BoardDrawingStroke,
  SurvivalScenario,
  DeductionGameId,
} from "@/server/types";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketOptions {
  roomCode: string;
  guestName?: string;
  chameleonColors?: ChameleonColors;
}

export function useSocket({ roomCode, guestName, chameleonColors }: UseSocketOptions) {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [socketId, setSocketId] = useState<string>("");
  const [roomState, setRoomState] = useState<RysowanieRoomState | null>(null);
  const [unifiedState, setUnifiedState] = useState<UnifiedRoomState | null>(null);
  const [sessionScores, setSessionScores] = useState<Record<string, SessionScoreData>>({});
  const [canvasActions, setCanvasActions] = useState<CanvasAction[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [podium, setPodium] = useState<{ player: Player; rank: number; score: number }[] | null>(null);
  const [incomingBingoRequest, setIncomingBingoRequest] = useState<IncomingBingoRequest | null>(null);
  const [recentBingoCelebration, setRecentBingoCelebration] = useState<BingoWinnerRecord | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    // Connect to single-process socket server
    const socket: TypedSocket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: {
        guestName,
        chameleonColors,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setSocketId(socket.id || "");
      socket.emit("room:join", {
        roomCode,
        guestName,
        chameleonColors,
      });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("room:unified_state_sync", (state) => {
      setUnifiedState(state);
      if (state.rysowanieState) {
        setRoomState(state.rysowanieState);
        if (state.rysowanieState.canvasHistory) {
          setCanvasActions(state.rysowanieState.canvasHistory);
        }
      }
      if (state.sessionScores) {
        setSessionScores(state.sessionScores);
      }
    });

    socket.on("room:state_sync", (state) => {
      setRoomState(state);
      if (state.canvasHistory) {
        setCanvasActions(state.canvasHistory);
      }
      if (state.winnerPodium) {
        setPodium(state.winnerPodium);
      }
    });

    socket.on("session:scores_update", ({ sessionScores: scores }) => {
      setSessionScores(scores);
    });

    socket.on("canvas:replay", ({ actions }) => {
      setCanvasActions(actions);
    });

    socket.on("draw:stroke_batch", (batch) => {
      setCanvasActions((prev) => [
        ...prev,
        {
          type: "stroke",
          points: batch.points,
          color: batch.color,
          size: batch.size,
        },
      ]);
    });

    socket.on("draw:fill", (fill) => {
      setCanvasActions((prev) => [
        ...prev,
        {
          type: "fill",
          x: fill.x,
          y: fill.y,
          color: fill.color,
        },
      ]);
    });

    socket.on("draw:clear", () => {
      setCanvasActions([{ type: "clear" }]);
    });

    socket.on("draw:undo", () => {
      setCanvasActions((prev) => prev.slice(0, -1));
    });

    socket.on("game:word_options", ({ words }) => {
      setWordOptions(words);
    });

    socket.on("game:hint_update", ({ hintPattern, revealedIndices }) => {
      setRoomState((prev) => (prev ? { ...prev, hintPattern, revealedIndices } : null));
    });

    socket.on("game:timer_tick", ({ remaining, phase }) => {
      setRoomState((prev) => {
        if (!prev) return null;
        if (phase === "WORD_SELECTION") {
          return { ...prev, wordChoiceTimeRemaining: remaining };
        }
        return { ...prev, drawTimeRemaining: remaining };
      });
    });

    socket.on("game:timer_accelerated", ({ remainingSeconds }) => {
      setRoomState((prev) =>
        prev ? { ...prev, drawTimeRemaining: remainingSeconds, isTimerAccelerated: true } : null
      );
    });

    socket.on("chat:message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("guess:correct", ({ playerId, totalScore }) => {
      setRoomState((prev) => {
        if (!prev) return null;
        const player = prev.players[playerId];
        if (!player) return prev;
        return {
          ...prev,
          players: {
            ...prev.players,
            [playerId]: { ...player, score: totalScore, hasSolved: true },
          },
          solvedPlayerIds: Array.from(new Set([...prev.solvedPlayerIds, playerId])),
        };
      });
    });

    socket.on("guess:close", ({ playerName }) => {
      const msg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        senderId: "system",
        senderName: playerName,
        text: "jest bardzo blisko!",
        timestamp: Date.now(),
        type: "close",
      };
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("turn:end", ({ secretWord }) => {
      setRoomState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentWord: secretWord,
          phase: "TURN_INTERMISSION",
        };
      });
    });

    socket.on("game:over", ({ podium: newPodium }) => {
      setPodium(newPodium);
      setRoomState((prev) => (prev ? { ...prev, phase: "GAME_OVER", winnerPodium: newPodium } : null));
    });

    socket.on("rate_limit:warning", ({ message }) => {
      setNotice(message);
      setTimeout(() => setNotice(null), 3000);
    });

    socket.on("error:notice", ({ message }) => {
      setNotice(message);
      setTimeout(() => setNotice(null), 4000);
    });

    // Bingo verification request received by peer
    socket.on("bingo:verify_request", (req) => {
      setIncomingBingoRequest(req);
    });

    socket.on("bingo:line_completed", (record) => {
      setRecentBingoCelebration(record);
      setTimeout(() => setRecentBingoCelebration(null), 6000);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomCode, guestName, chameleonColors]);

  // Dispatch helpers
  const sendStrokeBatch = useCallback((batch: StrokeBatch) => {
    socketRef.current?.emit("draw:stroke_batch", batch);
    setCanvasActions((prev) => [
      ...prev,
      { type: "stroke", points: batch.points, color: batch.color, size: batch.size },
    ]);
  }, []);

  const sendFill = useCallback((fill: FillAction) => {
    socketRef.current?.emit("draw:fill", fill);
    setCanvasActions((prev) => [
      ...prev,
      { type: "fill", x: fill.x, y: fill.y, color: fill.color },
    ]);
  }, []);

  const sendClear = useCallback(() => {
    socketRef.current?.emit("draw:clear");
    setCanvasActions([{ type: "clear" }]);
  }, []);

  const sendUndo = useCallback(() => {
    socketRef.current?.emit("draw:undo");
    setCanvasActions((prev) => prev.slice(0, -1));
  }, []);

  const sendChat = useCallback((text: string) => {
    socketRef.current?.emit("chat:send", { text });
  }, []);

  const selectWord = useCallback((word: string) => {
    socketRef.current?.emit("game:select_word", { word });
    setWordOptions([]);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit("game:start");
  }, []);

  const updateSettings = useCallback((settings: Partial<RoomSettings>) => {
    socketRef.current?.emit("settings:update", settings);
  }, []);

  // Activity Switcher
  const switchGame = useCallback((gameType: GameType) => {
    socketRef.current?.emit("game:switch", { gameType });
  }, []);

  // Two Truths & A Lie Actions
  const submitTwoTruths = useCallback((statements: [string, string, string], lieIndex: number) => {
    socketRef.current?.emit("two_truths:submit", { statements, lieIndex });
  }, []);

  const voteTwoTruths = useCallback((statementIndex: number) => {
    socketRef.current?.emit("two_truths:vote", { statementIndex });
  }, []);

  const revealTwoTruths = useCallback(() => {
    socketRef.current?.emit("two_truths:reveal");
  }, []);

  const nextTwoTruths = useCallback(() => {
    socketRef.current?.emit("two_truths:next");
  }, []);

  // This or That Actions
  const voteThisOrThat = useCallback((choice: "A" | "B") => {
    socketRef.current?.emit("this_or_that:vote", { choice });
  }, []);

  const nextThisOrThat = useCallback(() => {
    socketRef.current?.emit("this_or_that:next");
  }, []);

  // Story Chain Actions
  const submitStorySegment = useCallback((text: string) => {
    socketRef.current?.emit("story_chain:submit", { text });
  }, []);

  const passStoryTurn = useCallback(() => {
    socketRef.current?.emit("story_chain:pass");
  }, []);

  const setStoryMode = useCallback((mode: "SENTENCE" | "WORD") => {
    socketRef.current?.emit("story_chain:set_mode", { mode });
  }, []);

  // Hot Seat Actions
  const selectHotSeatSpeaker = useCallback((speakerId: string) => {
    socketRef.current?.emit("hot_seat:select_speaker", { speakerId });
  }, []);

  const pickHotSeatQuestion = useCallback((question: string, tier?: 1 | 2 | 3) => {
    socketRef.current?.emit("hot_seat:pick_question", { question, tier });
  }, []);

  const submitHotSeatQuestion = useCallback((text: string) => {
    socketRef.current?.emit("hot_seat:submit_question", { text });
  }, []);

  const upvoteHotSeatQuestion = useCallback((questionId: string) => {
    socketRef.current?.emit("hot_seat:upvote_question", { questionId });
  }, []);

  const passHotSeatLifeline = useCallback(() => {
    socketRef.current?.emit("hot_seat:pass");
  }, []);

  const completeHotSeatAnswer = useCallback(() => {
    socketRef.current?.emit("hot_seat:complete_answer");
  }, []);

  // Quiz Superlatives Actions
  const voteSuperlative = useCallback((targetPlayerId: string) => {
    socketRef.current?.emit("quiz_superlatives:vote", { targetPlayerId });
  }, []);

  const nextSuperlative = useCallback(() => {
    socketRef.current?.emit("quiz_superlatives:next");
  }, []);

  // Human Bingo Actions
  const claimBingoTile = useCallback((tileIndex: number, targetPlayerId: string) => {
    socketRef.current?.emit("bingo:claim_tile", { tileIndex, targetPlayerId });
  }, []);

  const respondBingoVerification = useCallback((verificationId: string, approved: boolean) => {
    socketRef.current?.emit("bingo:verify_response", { verificationId, approved });
    setIncomingBingoRequest(null);
  }, []);

  const setBingoGridSize = useCallback((size: 4 | 5) => {
    socketRef.current?.emit("bingo:set_grid_size", { size });
  }, []);

  // Room Meeting URL & Breakout Groups
  const setMeetingUrl = useCallback((meetingUrl: string) => {
    socketRef.current?.emit("room:set_meeting_url", { meetingUrl });
  }, []);

  const createBreakoutGroups = useCallback((count: number, shuffle: boolean = true) => {
    socketRef.current?.emit("room:create_breakout_groups", { count, shuffle });
  }, []);

  const assignBreakoutGroup = useCallback((playerId: string, groupId: string) => {
    socketRef.current?.emit("room:assign_breakout_group", { playerId, groupId });
  }, []);

  // Collaborative Board (Jamboard)
  const addBoardNote = useCallback((payload: { text: string; color?: string; x?: number; y?: number }) => {
    socketRef.current?.emit("board:add_note", {
      text: payload.text,
      color: payload.color || "#FEF08A",
      x: payload.x ?? 100,
      y: payload.y ?? 100,
    });
  }, []);

  const updateBoardNote = useCallback((payload: { id: string; text?: string; color?: string; x?: number; y?: number }) => {
    socketRef.current?.emit("board:update_note", payload);
  }, []);

  const deleteBoardNote = useCallback((id: string) => {
    socketRef.current?.emit("board:delete_note", { id });
  }, []);

  const addBoardPin = useCallback((payload: { title: string; tag: "poszlaka" | "alibi" | "fakt" | "hipoteza" | "podejrzany"; x?: number; y?: number }) => {
    socketRef.current?.emit("board:add_pin", {
      title: payload.title,
      tag: payload.tag,
      x: payload.x ?? 150,
      y: payload.y ?? 150,
    });
  }, []);

  const deleteBoardPin = useCallback((id: string) => {
    socketRef.current?.emit("board:delete_pin", { id });
  }, []);

  const drawBoardStroke = useCallback((stroke: BoardDrawingStroke) => {
    socketRef.current?.emit("board:draw_stroke", stroke);
  }, []);

  const clearBoard = useCallback(() => {
    socketRef.current?.emit("board:clear");
  }, []);

  // Survival Challenge
  const selectSurvivalScenario = useCallback((scenario: SurvivalScenario) => {
    socketRef.current?.emit("survival:select_scenario", { scenario });
  }, []);

  const submitSurvivalIndividual = useCallback((ranking: number[]) => {
    socketRef.current?.emit("survival:submit_individual", { ranking });
  }, []);

  const submitSurvivalTeam = useCallback((ranking: number[]) => {
    socketRef.current?.emit("survival:submit_team", { ranking });
  }, []);

  const nextSurvivalPhase = useCallback(() => {
    socketRef.current?.emit("survival:next_phase");
  }, []);

  // Information Deduction
  const selectDeductionGame = useCallback((gameId: DeductionGameId) => {
    socketRef.current?.emit("deduction:select_game", { gameId });
  }, []);

  const dealDeductionCards = useCallback(() => {
    socketRef.current?.emit("deduction:deal_cards");
  }, []);

  const updateDeductionNotes = useCallback((notes: string) => {
    socketRef.current?.emit("deduction:update_notes", { notes });
  }, []);

  const submitDeductionSolution = useCallback((solution: string) => {
    socketRef.current?.emit("deduction:submit_solution", { solution });
  }, []);

  const designateDeductionNegotiator = useCallback((playerId: string) => {
    socketRef.current?.emit("deduction:designate_negotiator", { playerId });
  }, []);

  const nextDeductionPhase = useCallback(() => {
    socketRef.current?.emit("deduction:next_phase");
  }, []);

  return {
    isConnected,
    socketId,
    roomState,
    unifiedState,
    sessionScores,
    canvasActions,
    messages,
    wordOptions,
    notice,
    podium,
    incomingBingoRequest,
    recentBingoCelebration,
    sendStrokeBatch,
    sendFill,
    sendClear,
    sendUndo,
    sendChat,
    selectWord,
    startGame,
    updateSettings,
    switchGame,
    setMeetingUrl,
    createBreakoutGroups,
    assignBreakoutGroup,
    addBoardNote,
    updateBoardNote,
    deleteBoardNote,
    addBoardPin,
    deleteBoardPin,
    drawBoardStroke,
    clearBoard,
    selectSurvivalScenario,
    submitSurvivalIndividual,
    submitSurvivalTeam,
    nextSurvivalPhase,
    selectDeductionGame,
    dealDeductionCards,
    updateDeductionNotes,
    submitDeductionSolution,
    designateDeductionNegotiator,
    nextDeductionPhase,
    submitTwoTruths,
    voteTwoTruths,
    revealTwoTruths,
    nextTwoTruths,
    voteThisOrThat,
    nextThisOrThat,
    submitStorySegment,
    passStoryTurn,
    setStoryMode,
    selectHotSeatSpeaker,
    pickHotSeatQuestion,
    submitHotSeatQuestion,
    upvoteHotSeatQuestion,
    passHotSeatLifeline,
    completeHotSeatAnswer,
    voteSuperlative,
    nextSuperlative,
    claimBingoTile,
    respondBingoVerification,
    setBingoGridSize,
  };
}
