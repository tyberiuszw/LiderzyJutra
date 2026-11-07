/**
 * Unified Room Orchestrator & Room Manager
 *
 * Coordinates multi-tenant game sessions within persistent room code LJ-XXXX:
 * - Supports seamless switching of currentGameType (RYSOWANIE and all 6 integration games)
 *   without kicking players or reconnecting sockets.
 * - Accumulates workshop-wide sessionScores across all played games.
 * - Non-blocking asynchronous persistence to Prisma (GameSession, ScoreRecord).
 * - Automatic host failover migration when host disconnects.
 */

import {
  GameType,
  Player,
  RoomSettings,
  SessionScoreData,
  UnifiedRoomState,
  RysowanieRoomState,
  CanvasAction,
  ChatMessage,
  BreakoutGroup,
} from "../types";
import { RysowanieGameSession } from "../games/rysowanie-state";
import { TwoTruthsGameSession } from "../games/two-truths-state";
import { ThisOrThatGameSession } from "../games/this-or-that-state";
import { StoryChainGameSession } from "../games/story-chain-state";
import { HotSeatGameSession } from "../games/hot-seat-state";
import { QuizSuperlativesGameSession } from "../games/quiz-superlatives-state";
import { HumanBingoGameSession } from "../games/human-bingo-state";
import { CollaborativeBoardSession } from "../games/collaborative-board-state";
import { SurvivalChallengeSession } from "../games/survival-challenge-state";
import { InformationDeductionSession } from "../games/information-deduction-state";
import { prismaUnscoped } from "../../lib/db";

export interface UnifiedRoomCallbacks {
  onStateUpdate?: (unifiedState: UnifiedRoomState) => void;
  onRysowanieStateUpdate?: (state: RysowanieRoomState) => void;
  onGameOver?: (podium: unknown) => void;
  onScoresUpdate?: (sessionScores: Record<string, SessionScoreData>) => void;
}

export class UnifiedRoomSession {
  public roomCode: string;
  public hostId: string;
  public currentGameType: GameType = "RYSOWANIE";
  public players: Record<string, Player> = {};
  public sessionScores: Record<string, SessionScoreData> = {};
  public settings: RoomSettings;
  public meetingUrl: string = "";
  public breakoutGroups: Record<string, BreakoutGroup> = {};

  // Active game sub-instances
  public rysowanieSession: RysowanieGameSession;
  public twoTruthsSession: TwoTruthsGameSession | null = null;
  public thisOrThatSession: ThisOrThatGameSession | null = null;
  public storyChainSession: StoryChainGameSession | null = null;
  public hotSeatSession: HotSeatGameSession | null = null;
  public quizSuperlativesSession: QuizSuperlativesGameSession | null = null;
  public humanBingoSession: HumanBingoGameSession | null = null;
  public collaborativeBoardSession: CollaborativeBoardSession | null = null;
  public survivalChallengeSession: SurvivalChallengeSession | null = null;
  public informationDeductionSession: InformationDeductionSession | null = null;

  private callbacks: UnifiedRoomCallbacks;

  constructor(
    roomCode: string,
    hostId: string,
    settings?: Partial<RoomSettings>,
    callbacks: UnifiedRoomCallbacks = {}
  ) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.callbacks = callbacks;

    this.settings = {
      drawTime: 80,
      rounds: 3,
      wordChoiceTime: 15,
      maxHints: 3,
      language: "pl",
      ...settings,
    };

    // Initialize default Rysowanie session
    this.rysowanieSession = this.createRysowanieSession();
  }

  // Compatibility getter so existing code reading session.state continues working
  public get state(): RysowanieRoomState {
    return this.rysowanieSession.state;
  }

  private initPlayerScoreData(playerId: string) {
    if (!this.sessionScores[playerId]) {
      this.sessionScores[playerId] = {
        total: 0,
        byGame: {
          RYSOWANIE: 0,
          TWO_TRUTHS: 0,
          THIS_OR_THAT: 0,
          STORY_CHAIN: 0,
          HOT_SEAT: 0,
          QUIZ_SUPERLATIVES: 0,
          HUMAN_BINGO: 0,
          COLLABORATIVE_BOARD: 0,
          SURVIVAL_CHALLENGE: 0,
          INFORMATION_DEDUCTION: 0,
        },
      };
    }
  }

  private createRysowanieSession(): RysowanieGameSession {
    return new RysowanieGameSession(this.roomCode, this.hostId, this.settings, {
      onStateUpdate: (rState) => {
        if (this.callbacks.onRysowanieStateUpdate) {
          this.callbacks.onRysowanieStateUpdate(rState);
        }
        this.notifyUnifiedUpdate();
      },
      onTurnEnd: async (_secretWord, scores) => {
        // Record scores
        for (const [userId, pts] of Object.entries(scores.guesserScores)) {
          this.addSessionScore(userId, "RYSOWANIE", pts);
        }
        if (this.rysowanieSession.state.currentDrawerId && scores.drawerScore > 0) {
          this.addSessionScore(
            this.rysowanieSession.state.currentDrawerId,
            "RYSOWANIE",
            scores.drawerScore
          );
        }
      },
      onGameOver: async (podium) => {
        if (this.callbacks.onGameOver) this.callbacks.onGameOver(podium);
        this.persistGameOver().catch(() => {});
      },
    });
  }

  public addPlayer(player: Player): void {
    this.players[player.id] = player;
    this.initPlayerScoreData(player.id);

    // Sync with active sub-sessions
    this.rysowanieSession.addPlayer(player);
    this.twoTruthsSession?.addPlayer(player);
    this.thisOrThatSession?.addPlayer(player);
    this.storyChainSession?.addPlayer(player);
    this.hotSeatSession?.addPlayer(player);
    this.quizSuperlativesSession?.addPlayer(player);
    this.humanBingoSession?.addPlayer(player);

    this.notifyUnifiedUpdate();
  }

  public removePlayer(playerId: string): void {
    delete this.players[playerId];

    // Sub-sessions removal
    this.rysowanieSession.removePlayer(playerId);
    this.twoTruthsSession?.removePlayer(playerId);
    this.thisOrThatSession?.removePlayer(playerId);
    this.storyChainSession?.removePlayer(playerId);
    this.hotSeatSession?.removePlayer(playerId);
    this.quizSuperlativesSession?.removePlayer(playerId);
    this.humanBingoSession?.removePlayer(playerId);

    // Host failover migration if host left
    if (this.hostId === playerId) {
      const remainingIds = Object.keys(this.players);
      if (remainingIds.length > 0) {
        const newHostId = remainingIds[0];
        this.hostId = newHostId;
        this.rysowanieSession.state.hostId = newHostId;
        if (this.players[newHostId]) {
          this.players[newHostId].isHost = true;
        }
        if (this.rysowanieSession.state.players[newHostId]) {
          this.rysowanieSession.state.players[newHostId].isHost = true;
        }
      }
    }

    this.notifyUnifiedUpdate();
  }

  public setMeetingUrl(meetingUrl: string): void {
    this.meetingUrl = meetingUrl;
    this.notifyUnifiedUpdate();
  }

  public createBreakoutGroups(count: number, shuffle: boolean = true): void {
    const groups: Record<string, BreakoutGroup> = {};
    for (let i = 1; i <= count; i++) {
      const gid = `group-${i}`;
      groups[gid] = {
        id: gid,
        name: `Grupa ${i}`,
        memberIds: [],
      };
    }

    if (shuffle) {
      const pIds = Object.keys(this.players);
      for (let i = pIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pIds[i], pIds[j]] = [pIds[j], pIds[i]];
      }
      pIds.forEach((pid, idx) => {
        const targetGroupIndex = (idx % count) + 1;
        const gid = `group-${targetGroupIndex}`;
        groups[gid].memberIds.push(pid);
        if (this.players[pid]) {
          this.players[pid].breakoutGroupId = gid;
        }
      });
    }

    this.breakoutGroups = groups;
    this.notifyUnifiedUpdate();
  }

  public assignBreakoutGroup(playerId: string, groupId: string): void {
    for (const grp of Object.values(this.breakoutGroups)) {
      grp.memberIds = grp.memberIds.filter((id) => id !== playerId);
    }
    if (this.breakoutGroups[groupId]) {
      this.breakoutGroups[groupId].memberIds.push(playerId);
      if (this.players[playerId]) {
        this.players[playerId].breakoutGroupId = groupId;
      }
    }
    this.notifyUnifiedUpdate();
  }

  public switchGame(newGameType: GameType): void {
    if (this.currentGameType === newGameType) return;

    // Clean up timers of previous active game
    this.destroyActiveGameTimers();

    this.currentGameType = newGameType;

    // Instantiate newly selected game session with current players & settings
    switch (newGameType) {
      case "RYSOWANIE":
        // Reset or keep rysowanie
        break;
      case "TWO_TRUTHS":
        this.twoTruthsSession = new TwoTruthsGameSession(
          this.roomCode,
          this.hostId,
          this.players,
          this.settings,
          {
            onStateUpdate: () => this.notifyUnifiedUpdate(),
            onScoresAwarded: (scores) => {
              for (const [pId, pts] of Object.entries(scores)) {
                this.addSessionScore(pId, "TWO_TRUTHS", pts);
              }
            },
            onGameOver: (podium) => this.callbacks.onGameOver?.(podium),
          }
        );
        break;
      case "THIS_OR_THAT":
        this.thisOrThatSession = new ThisOrThatGameSession(
          this.roomCode,
          this.hostId,
          this.players,
          this.settings,
          {
            onStateUpdate: () => this.notifyUnifiedUpdate(),
            onScoresAwarded: (scores) => {
              for (const [pId, pts] of Object.entries(scores)) {
                this.addSessionScore(pId, "THIS_OR_THAT", pts);
              }
            },
            onGameOver: (podium) => this.callbacks.onGameOver?.(podium),
          }
        );
        break;
      case "STORY_CHAIN":
        this.storyChainSession = new StoryChainGameSession(
          this.roomCode,
          this.hostId,
          this.players,
          this.settings,
          {
            onStateUpdate: () => this.notifyUnifiedUpdate(),
            onScoresAwarded: (scores) => {
              for (const [pId, pts] of Object.entries(scores)) {
                this.addSessionScore(pId, "STORY_CHAIN", pts);
              }
            },
            onGameOver: (podium) => this.callbacks.onGameOver?.(podium),
          }
        );
        break;
      case "HOT_SEAT":
        this.hotSeatSession = new HotSeatGameSession(
          this.roomCode,
          this.hostId,
          this.players,
          this.settings,
          {
            onStateUpdate: () => this.notifyUnifiedUpdate(),
            onScoresAwarded: (scores) => {
              for (const [pId, pts] of Object.entries(scores)) {
                this.addSessionScore(pId, "HOT_SEAT", pts);
              }
            },
            onGameOver: (podium) => this.callbacks.onGameOver?.(podium),
          }
        );
        break;
      case "QUIZ_SUPERLATIVES":
        this.quizSuperlativesSession = new QuizSuperlativesGameSession(
          this.roomCode,
          this.hostId,
          this.players,
          this.settings,
          {
            onStateUpdate: () => this.notifyUnifiedUpdate(),
            onScoresAwarded: (scores) => {
              for (const [pId, pts] of Object.entries(scores)) {
                this.addSessionScore(pId, "QUIZ_SUPERLATIVES", pts);
              }
            },
            onGameOver: (podium) => this.callbacks.onGameOver?.(podium),
          }
        );
        break;
      case "HUMAN_BINGO":
        this.humanBingoSession = new HumanBingoGameSession(
          this.roomCode,
          this.hostId,
          this.players,
          this.settings,
          {
            onStateUpdate: () => this.notifyUnifiedUpdate(),
            onScoresAwarded: (scores) => {
              for (const [pId, pts] of Object.entries(scores)) {
                this.addSessionScore(pId, "HUMAN_BINGO", pts);
              }
            },
            onGameOver: (podium) => this.callbacks.onGameOver?.(podium),
          }
        );
        break;
      case "COLLABORATIVE_BOARD":
        this.collaborativeBoardSession = new CollaborativeBoardSession(this.roomCode, {
          onStateUpdate: () => this.notifyUnifiedUpdate(),
        });
        break;
      case "SURVIVAL_CHALLENGE":
        this.survivalChallengeSession = new SurvivalChallengeSession(
          this.roomCode,
          "LOST_AT_SEA",
          {
            onStateUpdate: () => this.notifyUnifiedUpdate(),
            onScoresCalculated: (scores) => {
              if (scores.team) {
                const pts = Math.max(0, 100 - scores.team.teamScore);
                for (const pId of Object.keys(this.players)) {
                  this.addSessionScore(pId, "SURVIVAL_CHALLENGE", pts);
                }
              }
            },
          }
        );
        break;
      case "INFORMATION_DEDUCTION":
        this.informationDeductionSession = new InformationDeductionSession(
          this.roomCode,
          "ZIN_OBELISK",
          {
            onStateUpdate: () => this.notifyUnifiedUpdate(),
            onSolutionChecked: (isCorrect) => {
              if (isCorrect) {
                for (const pId of Object.keys(this.players)) {
                  this.addSessionScore(pId, "INFORMATION_DEDUCTION", 100);
                }
              }
            },
          }
        );
        this.informationDeductionSession.dealCards(Object.keys(this.players));
        break;
    }

    // Persist gameType update to DB
    this.persistCurrentGameType(newGameType).catch(() => {});

    this.notifyUnifiedUpdate();
  }

  public startGame(): void {
    switch (this.currentGameType) {
      case "RYSOWANIE":
        this.rysowanieSession.startGame();
        break;
      case "TWO_TRUTHS":
        this.twoTruthsSession?.startGame();
        break;
      case "THIS_OR_THAT":
        this.thisOrThatSession?.startGame();
        break;
      case "STORY_CHAIN":
        this.storyChainSession?.startGame();
        break;
      case "HOT_SEAT":
        this.hotSeatSession?.startGame();
        break;
      case "QUIZ_SUPERLATIVES":
        this.quizSuperlativesSession?.startGame();
        break;
      case "HUMAN_BINGO":
        this.humanBingoSession?.startGame();
        break;
      case "COLLABORATIVE_BOARD":
        // Real-time canvas is continuously interactive
        break;
      case "SURVIVAL_CHALLENGE":
        this.survivalChallengeSession?.startIndividualPhase();
        break;
      case "INFORMATION_DEDUCTION":
        this.informationDeductionSession?.dealCards(Object.keys(this.players));
        this.informationDeductionSession?.setPhase("INVESTIGATION");
        break;
    }
    this.notifyUnifiedUpdate();
  }

  public addSessionScore(playerId: string, gameType: GameType, points: number): void {
    this.initPlayerScoreData(playerId);
    this.sessionScores[playerId].total += points;
    this.sessionScores[playerId].byGame[gameType] =
      (this.sessionScores[playerId].byGame[gameType] || 0) + points;

    if (this.players[playerId]) {
      this.players[playerId].score = this.sessionScores[playerId].total;
    }

    if (this.callbacks.onScoresUpdate) {
      this.callbacks.onScoresUpdate(this.sessionScores);
    }

    // Asynchronously persist score to Prisma
    this.persistScoreRecord(playerId, gameType, points).catch(() => {});
  }

  public getUnifiedState(viewerId?: string): UnifiedRoomState {
    let phase: "LOBBY" | "IN_GAME" | "GAME_OVER" = "LOBBY";

    switch (this.currentGameType) {
      case "RYSOWANIE":
        phase =
          this.rysowanieSession.state.phase === "LOBBY"
            ? "LOBBY"
            : this.rysowanieSession.state.phase === "GAME_OVER"
            ? "GAME_OVER"
            : "IN_GAME";
        break;
      case "TWO_TRUTHS":
        phase =
          !this.twoTruthsSession || this.twoTruthsSession.state.phase === "LOBBY"
            ? "LOBBY"
            : this.twoTruthsSession.state.phase === "GAME_OVER"
            ? "GAME_OVER"
            : "IN_GAME";
        break;
      case "THIS_OR_THAT":
        phase =
          !this.thisOrThatSession || this.thisOrThatSession.state.phase === "LOBBY"
            ? "LOBBY"
            : this.thisOrThatSession.state.phase === "GAME_OVER"
            ? "GAME_OVER"
            : "IN_GAME";
        break;
      case "STORY_CHAIN":
        phase =
          !this.storyChainSession || this.storyChainSession.state.phase === "LOBBY"
            ? "LOBBY"
            : this.storyChainSession.state.phase === "GAME_OVER"
            ? "GAME_OVER"
            : "IN_GAME";
        break;
      case "HOT_SEAT":
        phase =
          !this.hotSeatSession || this.hotSeatSession.state.phase === "LOBBY"
            ? "LOBBY"
            : this.hotSeatSession.state.phase === "GAME_OVER"
            ? "GAME_OVER"
            : "IN_GAME";
        break;
      case "QUIZ_SUPERLATIVES":
        phase =
          !this.quizSuperlativesSession || this.quizSuperlativesSession.state.phase === "LOBBY"
            ? "LOBBY"
            : this.quizSuperlativesSession.state.phase === "GAME_OVER"
            ? "GAME_OVER"
            : "IN_GAME";
        break;
      case "HUMAN_BINGO":
        phase =
          !this.humanBingoSession || this.humanBingoSession.state.phase === "LOBBY"
            ? "LOBBY"
            : this.humanBingoSession.state.phase === "GAME_OVER"
            ? "GAME_OVER"
            : "IN_GAME";
        break;
      case "COLLABORATIVE_BOARD":
        phase = "IN_GAME";
        break;
      case "SURVIVAL_CHALLENGE":
        phase =
          !this.survivalChallengeSession || this.survivalChallengeSession.state.phase === "LOBBY"
            ? "LOBBY"
            : this.survivalChallengeSession.state.phase === "DEBRIEFING"
            ? "GAME_OVER"
            : "IN_GAME";
        break;
      case "INFORMATION_DEDUCTION":
        phase =
          !this.informationDeductionSession || this.informationDeductionSession.state.phase === "LOBBY"
            ? "LOBBY"
            : this.informationDeductionSession.state.phase === "DEBRIEFING"
            ? "GAME_OVER"
            : "IN_GAME";
        break;
    }

    return {
      roomCode: this.roomCode,
      hostId: this.hostId,
      currentGameType: this.currentGameType,
      phase,
      players: this.players,
      sessionScores: this.sessionScores,
      settings: this.settings,
      meetingUrl: this.meetingUrl,
      breakoutGroups: this.breakoutGroups,
      rysowanieState: this.rysowanieSession.state,
      twoTruthsState: this.twoTruthsSession?.getPublicState(viewerId),
      thisOrThatState: this.thisOrThatSession?.state,
      storyChainState: this.storyChainSession?.state,
      hotSeatState: this.hotSeatSession?.state,
      quizSuperlativesState: this.quizSuperlativesSession?.state,
      humanBingoState: this.humanBingoSession?.state,
      collaborativeBoardState: this.collaborativeBoardSession?.state,
      survivalChallengeState: this.survivalChallengeSession?.state,
      informationDeductionState: this.informationDeductionSession?.state,
    };
  }

  // Delegated Rysowanie actions for backward compatibility
  public selectWord(word: string): void {
    this.rysowanieSession.selectWord(word);
  }

  public updateSettings(newSettings: Partial<RoomSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.rysowanieSession.updateSettings(newSettings);
    this.notifyUnifiedUpdate();
  }

  public addCanvasAction(action: CanvasAction): void {
    this.rysowanieSession.addCanvasAction(action);
  }

  public clearCanvas(): void {
    this.rysowanieSession.clearCanvas();
  }

  public undoCanvasAction(): void {
    this.rysowanieSession.undoCanvasAction();
  }

  public processMessage(userId: string, text: string): {
    message: ChatMessage | null;
    isCorrect: boolean;
    isClose: boolean;
    points: number;
    targetAudience: "all" | "solvers_and_drawer";
  } {
    if (this.currentGameType === "RYSOWANIE") {
      return this.rysowanieSession.processMessage(userId, text);
    }

    // Default chat behavior for non-drawing activities
    const player = this.players[userId];
    const msg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: userId,
      senderName: player?.name || "Uczestnik",
      text,
      timestamp: Date.now(),
      type: "public",
    };

    return {
      message: msg,
      isCorrect: false,
      isClose: false,
      points: 0,
      targetAudience: "all",
    };
  }

  private destroyActiveGameTimers(): void {
    this.twoTruthsSession?.destroy();
    this.thisOrThatSession?.destroy();
    this.storyChainSession?.destroy();
    this.hotSeatSession?.destroy();
    this.quizSuperlativesSession?.destroy();
    this.humanBingoSession?.destroy();
    this.survivalChallengeSession?.cleanup();
  }

  public destroy(): void {
    this.rysowanieSession.destroy();
    this.destroyActiveGameTimers();
  }

  private notifyUnifiedUpdate(): void {
    if (this.callbacks.onStateUpdate) {
      this.callbacks.onStateUpdate(this.getUnifiedState());
    }
  }

  private async persistScoreRecord(
    playerId: string,
    gameType: GameType,
    points: number
  ): Promise<void> {
    try {
      const dbSession = await prismaUnscoped.gameSession.findUnique({
        where: { roomCode: this.roomCode },
      });
      if (!dbSession) return;

      const isGuest = playerId.startsWith("guest_");
      const player = this.players[playerId];

      await prismaUnscoped.scoreRecord.create({
        data: {
          sessionId: dbSession.id,
          userId: isGuest ? null : playerId,
          guestName: isGuest ? player?.name || playerId : null,
          gameType,
          points,
        },
      });
    } catch {
      // Safe non-blocking error handling
    }
  }

  private async persistCurrentGameType(gameType: GameType): Promise<void> {
    try {
      await prismaUnscoped.gameSession.update({
        where: { roomCode: this.roomCode },
        data: { currentGameType: gameType },
      });
    } catch {
      // Non-blocking
    }
  }

  private async persistGameOver(): Promise<void> {
    try {
      await prismaUnscoped.gameSession.update({
        where: { roomCode: this.roomCode },
        data: { status: "COMPLETED" },
      });
    } catch {
      // Non-blocking
    }
  }
}

export class RoomManager {
  private static instance: RoomManager | null = null;
  private rooms: Map<string, UnifiedRoomSession> = new Map();

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public getOrCreateRoom(
    roomCode: string,
    hostId: string,
    settings?: Partial<RoomSettings>,
    callbacks?: UnifiedRoomCallbacks
  ): UnifiedRoomSession {
    let session = this.rooms.get(roomCode);
    if (!session) {
      session = new UnifiedRoomSession(roomCode, hostId, settings, callbacks);
      this.rooms.set(roomCode, session);
    }
    return session;
  }

  public getRoom(roomCode: string): UnifiedRoomSession | undefined {
    return this.rooms.get(roomCode);
  }

  public removeRoom(roomCode: string): void {
    const session = this.rooms.get(roomCode);
    if (session) {
      session.destroy();
      this.rooms.delete(roomCode);
    }
  }

  public getCanvasHistory(roomCode: string): CanvasAction[] {
    const session = this.rooms.get(roomCode);
    return session ? session.rysowanieSession.state.canvasHistory : [];
  }
}

export const roomManager = RoomManager.getInstance();
