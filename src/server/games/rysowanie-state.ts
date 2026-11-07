/**
 * "Rysowanie" State Machine & Game Engine (Contract 3 & skribbl.io lifecycle)
 *
 * Implements:
 * 1. Lifecycle: LOBBY -> WORD_SELECTION (15s) -> DRAWING (80s) -> TURN_INTERMISSION (5s) -> GAME_OVER (15s).
 * 2. Progressive letter hints bounded by word length: K_effective = min(K, floor((L - 1) / 2)).
 * 3. Dynamic 30s timer acceleration on 1st solver with hint rescheduling across the 30s window.
 * 4. Continuous time-decay guesser scoring (100-500 pts) and zero-division guarded drawer scoring.
 * 5. Solvers-only chat isolation and Levenshtein near-miss alerts (Contract 4).
 */

import fs from "fs";
import path from "path";
import {
  GamePhase,
  Player,
  RoomSettings,
  RysowanieRoomState,
  CanvasAction,
  ChatMessage,
  RysowanieTurnScores,
} from "../types";
import { matchGuess } from "../../lib/game/fuzzy-matcher";
import { cleanText } from "../../lib/game/profanity-filter";

// -------------------------------------------------------------
// Scoring Calculations (Strictly Guaranteed & Unit-Testable)
// -------------------------------------------------------------

/**
 * Continuous time-decay guesser scoring formula.
 * Eliminates the 49% cliff caused by discrete 10s step-downs.
 * Range: 100 to 500 points base, adjusted by rank multiplier.
 *
 * @param elapsedSeconds - Seconds elapsed since round start when guess was submitted
 * @param effectiveDuration - Effective total round duration (e.g. 80s or t_accel + 30s)
 * @param solverRank - 1 for 1st solver, 2 for 2nd, etc.
 */
export function calculateGuesserScore(
  elapsedSeconds: number,
  effectiveDuration: number,
  solverRank: number
): number {
  if (effectiveDuration <= 0) return 100;

  const clampedElapsed = Math.max(0, Math.min(effectiveDuration, elapsedSeconds));
  const timeFraction = clampedElapsed / effectiveDuration;

  // Base score: 100 to 500 pts
  const basePoints = 100 + 400 * (1 - timeFraction);

  // Rank multiplier: 1.0 for 1st, 0.95 for 2nd, 0.90 for 3rd, floor at 0.70
  const rankMultiplier = Math.max(0.7, 1.0 - (solverRank - 1) * 0.05);

  return Math.round(basePoints * rankMultiplier);
}

/**
 * Drawer score formula with strict zero-division guards.
 * Returns 0 if no guessers exist or if no guesser solved the word.
 *
 * @param totalGuessers - Total number of active guessers (excluding the drawer)
 * @param solverCount - Number of guessers who correctly solved
 * @param averageElapsedSeconds - Average elapsed time of all solvers
 * @param effectiveDuration - Effective total round duration
 */
export function calculateDrawerScore(
  totalGuessers: number,
  solverCount: number,
  averageElapsedSeconds: number,
  effectiveDuration: number
): number {
  // Strict zero-division and no-solver guards
  if (totalGuessers <= 0 || solverCount <= 0 || effectiveDuration <= 0) {
    return 0;
  }

  const solverRatio = Math.min(1.0, solverCount / totalGuessers);
  const clampedAvgElapsed = Math.max(0, Math.min(effectiveDuration, averageElapsedSeconds));
  const timeFactor = 1 - clampedAvgElapsed / effectiveDuration;

  // Drawer points: proportional to solvers ratio and speed (up to 500)
  const score = solverRatio * (200 + 300 * timeFactor);

  return Math.round(score);
}

// -------------------------------------------------------------
// Letter Hint Progression & Dynamic Acceleration
// -------------------------------------------------------------

/**
 * Binds the maximum number of letter hints by word length:
 * K_effective = min(K_configured, floor((L - 1) / 2))
 * where L is the count of non-space letters in the secret word.
 */
export function calculateEffectiveHints(word: string, maxHints = 3): number {
  const lettersOnly = word.replace(/\s+/g, "");
  const L = lettersOnly.length;
  if (L <= 2) return 0;

  const bound = Math.floor((L - 1) / 2);
  return Math.max(0, Math.min(maxHints, bound));
}

/**
 * Generates display hint pattern (e.g. "_ _ a _ _" or "b _ _ z a   m _ _ g ó w").
 */
export function generateHintPattern(word: string, revealedIndices: number[]): string {
  const revealedSet = new Set(revealedIndices);
  const tokens: string[] = [];

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (ch === " ") {
      tokens.push(" ");
    } else if (revealedSet.has(i)) {
      tokens.push(ch);
    } else {
      tokens.push("_");
    }
  }

  return tokens.join(" ");
}

/**
 * Calculates standard hint reveal timestamps (remaining seconds) during a round.
 * t_hint(i) = totalDuration * (1 - i / (K_effective + 1))
 */
export function calculateHintTimes(totalDuration: number, effectiveHints: number): number[] {
  if (effectiveHints <= 0 || totalDuration <= 0) return [];

  const times: number[] = [];
  for (let i = 1; i <= effectiveHints; i++) {
    const t = Math.round(totalDuration * (1 - i / (effectiveHints + 1)));
    times.push(t);
  }
  return times;
}

/**
 * Reschedules unrevealed hints evenly across remaining duration (e.g. 30s after acceleration).
 */
export function rescheduleHintsOnAcceleration(
  remainingDuration: number,
  unrevealedCount: number
): number[] {
  if (unrevealedCount <= 0 || remainingDuration <= 0) return [];

  const times: number[] = [];
  for (let j = 1; j <= unrevealedCount; j++) {
    const t = Math.round(remainingDuration * (1 - j / (unrevealedCount + 1)));
    times.push(t);
  }
  return times;
}

// -------------------------------------------------------------
// Word Bank Selection
// -------------------------------------------------------------

const FALLBACK_WORDS: Record<string, string[]> = {
  pl: ["kameleon", "rakieta", "kot", "pies", "drzewo", "kompas", "laptop", "słońce", "książka", "most"],
  en: ["chameleon", "rocket", "cat", "dog", "tree", "compass", "laptop", "sun", "book", "bridge"],
  uk: ["хамелеон", "ракета", "кіт", "пес", "дерево", "компас", "ноутбук", "сонце", "книга", "міст"],
};

export function loadWordBank(locale: string): string[] {
  try {
    const filePath = path.join(process.cwd(), "messages", "content", `words.${locale}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (Array.isArray(data)) {
        const words: string[] = [];
        for (const cat of data) {
          if (Array.isArray(cat.words)) {
            words.push(...cat.words);
          }
        }
        if (words.length >= 3) return words;
      }
    }
  } catch {
    // Fall back to built-in list
  }
  return FALLBACK_WORDS[locale] || FALLBACK_WORDS.pl;
}

export function getRandomWordChoices(locale: string, customWords?: string[]): string[] {
  const bank = customWords && customWords.length >= 3 ? customWords : loadWordBank(locale);
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// -------------------------------------------------------------
// Rysowanie Game Instance Class
// -------------------------------------------------------------

export class RysowanieGameSession {
  public state: RysowanieRoomState;
  private solverTimes: Map<string, number> = new Map(); // playerId -> elapsedSeconds
  private hintSchedule: number[] = [];                 // remainingSeconds thresholds for hints
  private timerInterval: NodeJS.Timeout | null = null;
  private elapsedRoundSeconds = 0;
  private accelElapsedSeconds: number | null = null;
  private onStateUpdate?: (state: RysowanieRoomState) => void;
  private onMessage?: (msg: ChatMessage) => void;
  private onHintUpdate?: (pattern: string, indices: number[]) => void;
  private onTimerTick?: (remaining: number, phase: GamePhase) => void;
  private onTurnEnd?: (secretWord: string, scores: RysowanieTurnScores) => void;
  private onGameOver?: (podium: { player: Player; rank: number; score: number }[]) => void;

  constructor(
    roomCode: string,
    hostId: string,
    settings?: Partial<RoomSettings>,
    callbacks?: {
      onStateUpdate?: (state: RysowanieRoomState) => void;
      onMessage?: (msg: ChatMessage) => void;
      onHintUpdate?: (pattern: string, indices: number[]) => void;
      onTimerTick?: (remaining: number, phase: GamePhase) => void;
      onTurnEnd?: (secretWord: string, scores: RysowanieTurnScores) => void;
      onGameOver?: (podium: { player: Player; rank: number; score: number }[]) => void;
    }
  ) {
    const fullSettings: RoomSettings = {
      drawTime: 80,
      rounds: 3,
      wordChoiceTime: 15,
      maxHints: 3,
      language: "pl",
      ...settings,
    };

    this.state = {
      roomCode,
      hostId,
      phase: "LOBBY",
      round: 1,
      totalRounds: fullSettings.rounds,
      turnNumber: 0,
      currentDrawerId: null,
      currentWord: null,
      wordLength: 0,
      hintPattern: "",
      revealedIndices: [],
      drawTimeTotal: fullSettings.drawTime,
      drawTimeRemaining: fullSettings.drawTime,
      isTimerAccelerated: false,
      wordsToChoose: [],
      wordChoiceTimeRemaining: fullSettings.wordChoiceTime,
      players: {},
      turnOrder: [],
      solvedPlayerIds: [],
      canvasHistory: [],
      settings: fullSettings,
    };

    if (callbacks) {
      this.onStateUpdate = callbacks.onStateUpdate;
      this.onMessage = callbacks.onMessage;
      this.onHintUpdate = callbacks.onHintUpdate;
      this.onTimerTick = callbacks.onTimerTick;
      this.onTurnEnd = callbacks.onTurnEnd;
      this.onGameOver = callbacks.onGameOver;
    }
  }

  // -------------------------------------------------------------
  // Player Management
  // -------------------------------------------------------------

  public addPlayer(player: Player): void {
    this.state.players[player.id] = player;
    if (!this.state.turnOrder.includes(player.id)) {
      this.state.turnOrder.push(player.id);
    }
    this.notifyUpdate();
  }

  public removePlayer(playerId: string): void {
    if (this.state.players[playerId]) {
      this.state.players[playerId].isConnected = false;
    }

    // Host delegation if host leaves
    if (this.state.hostId === playerId) {
      const activePlayers = Object.values(this.state.players).filter(
        (p) => p.isConnected && p.id !== playerId
      );
      if (activePlayers.length > 0) {
        this.state.hostId = activePlayers[0].id;
        this.state.players[this.state.hostId].isHost = true;
      }
    }

    // If current drawer left during drawing, advance turn
    if (this.state.currentDrawerId === playerId && this.state.phase === "DRAWING") {
      this.endTurn();
    }

    this.notifyUpdate();
  }

  public updateSettings(newSettings: Partial<RoomSettings>): void {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.state.totalRounds = this.state.settings.rounds;
    this.state.drawTimeTotal = this.state.settings.drawTime;
    this.notifyUpdate();
  }

  // -------------------------------------------------------------
  // Turn Lifecycle
  // -------------------------------------------------------------

  public startGame(): boolean {
    const activePlayerCount = Object.values(this.state.players).filter((p) => p.isConnected).length;
    if (activePlayerCount < 1) return false;

    // Reset scores
    for (const p of Object.values(this.state.players)) {
      p.score = 0;
      p.hasSolved = false;
    }

    this.state.round = 1;
    this.state.turnNumber = 0;
    this.startWordSelection();
    return true;
  }

  public startWordSelection(): void {
    this.stopTimer();

    // Select next drawer in turnOrder
    const connectedPlayers = this.state.turnOrder.filter(
      (id) => this.state.players[id]?.isConnected
    );
    if (connectedPlayers.length === 0) return;

    const drawerIndex = this.state.turnNumber % connectedPlayers.length;
    const drawerId = connectedPlayers[drawerIndex];

    this.state.currentDrawerId = drawerId;
    this.state.phase = "WORD_SELECTION";
    this.state.wordsToChoose = getRandomWordChoices(
      this.state.settings.language,
      this.state.settings.customWords
    );
    this.state.wordChoiceTimeRemaining = this.state.settings.wordChoiceTime;
    this.state.currentWord = null;
    this.state.hintPattern = "";
    this.state.revealedIndices = [];
    this.state.solvedPlayerIds = [];
    this.state.canvasHistory = [];
    this.solverTimes.clear();
    this.elapsedRoundSeconds = 0;
    this.accelElapsedSeconds = null;

    for (const p of Object.values(this.state.players)) {
      p.hasSolved = false;
    }

    this.notifyUpdate();

    // 15s countdown for word selection
    this.timerInterval = setInterval(() => {
      this.state.wordChoiceTimeRemaining--;
      if (this.onTimerTick) {
        this.onTimerTick(this.state.wordChoiceTimeRemaining, "WORD_SELECTION");
      }

      if (this.state.wordChoiceTimeRemaining <= 0) {
        // Auto-select first word if drawer timed out
        const autoWord = this.state.wordsToChoose[0] || "kameleon";
        this.selectWord(autoWord);
      }
    }, 1000);
  }

  public selectWord(word: string): void {
    this.stopTimer();
    this.elapsedRoundSeconds = 0;
    this.accelElapsedSeconds = null;
    this.state.currentWord = word;
    this.state.wordLength = word.replace(/\s+/g, "").length;
    this.state.phase = "DRAWING";
    this.state.drawTimeTotal = this.state.settings.drawTime;
    this.state.drawTimeRemaining = this.state.settings.drawTime;
    this.state.isTimerAccelerated = false;
    this.state.revealedIndices = [];
    this.state.hintPattern = generateHintPattern(word, []);
    this.state.canvasHistory = [{ type: "clear" }];

    // Setup initial hints schedule
    const effectiveHints = calculateEffectiveHints(word, this.state.settings.maxHints);
    this.hintSchedule = calculateHintTimes(this.state.drawTimeTotal, effectiveHints);

    this.notifyUpdate();

    // Main drawing countdown loop
    this.timerInterval = setInterval(() => {
      this.elapsedRoundSeconds++;
      this.state.drawTimeRemaining--;

      if (this.onTimerTick) {
        this.onTimerTick(this.state.drawTimeRemaining, "DRAWING");
      }

      // Check if a hint reveal threshold is reached
      this.checkAndRevealHint();

      // Check time out
      if (this.state.drawTimeRemaining <= 0) {
        this.endTurn();
      }
    }, 1000);
  }

  private checkAndRevealHint(): void {
    if (!this.state.currentWord || this.hintSchedule.length === 0) return;

    // Hint schedule is descending list of remainingSeconds
    if (this.hintSchedule.includes(this.state.drawTimeRemaining)) {
      this.revealRandomLetter();
    }
  }

  private revealRandomLetter(): void {
    if (!this.state.currentWord) return;
    const word = this.state.currentWord;

    const unrevealedIndices: number[] = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== " " && !this.state.revealedIndices.includes(i)) {
        unrevealedIndices.push(i);
      }
    }

    if (unrevealedIndices.length === 0) return;

    // Pick random unrevealed index
    const pick = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
    this.state.revealedIndices.push(pick);
    this.state.hintPattern = generateHintPattern(word, this.state.revealedIndices);

    if (this.onHintUpdate) {
      this.onHintUpdate(this.state.hintPattern, this.state.revealedIndices);
    }
    this.notifyUpdate();
  }

  // -------------------------------------------------------------
  // Guess Processing & Solvers Isolation
  // -------------------------------------------------------------

  public processMessage(
    senderId: string,
    rawText: string
  ): {
    message: ChatMessage | null;
    isCorrect: boolean;
    isClose: boolean;
    points: number;
    targetAudience: "all" | "solvers_and_drawer";
  } {
    const player = this.state.players[senderId];
    if (!player) {
      return { message: null, isCorrect: false, isClose: false, points: 0, targetAudience: "all" };
    }

    const clean = cleanText(rawText);

    // If game is in DRAWING phase and secret word is active:
    if (this.state.phase === "DRAWING" && this.state.currentWord) {
      // 1. Drawer cannot guess
      if (this.state.currentDrawerId === senderId) {
        const msg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          senderId,
          senderName: player.name,
          text: clean,
          timestamp: Date.now(),
          type: "public",
        };
        return { message: msg, isCorrect: false, isClose: false, points: 0, targetAudience: "all" };
      }

      // 2. Already solved player: chat is isolated to drawer and other solvers
      if (player.hasSolved) {
        const msg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          senderId,
          senderName: player.name,
          text: clean,
          timestamp: Date.now(),
          type: "solver",
        };
        return {
          message: msg,
          isCorrect: false,
          isClose: false,
          points: 0,
          targetAudience: "solvers_and_drawer",
        };
      }

      // 3. Unsolved guesser: evaluate guess
      const match = matchGuess(this.state.currentWord, rawText);

      if (match.isExact) {
        // Player solved correctly!
        player.hasSolved = true;
        this.state.solvedPlayerIds.push(senderId);

        const elapsed = this.elapsedRoundSeconds;
        this.solverTimes.set(senderId, elapsed);

        const solverRank = this.state.solvedPlayerIds.length;

        // If 1st solver and remaining time > 30s, trigger acceleration and set effective duration
        if (solverRank === 1 && this.state.drawTimeRemaining > 30) {
          this.accelElapsedSeconds = elapsed;
          this.accelerateTimer(30);
        }

        const effectiveDuration = this.getEffectiveDuration();
        const points = calculateGuesserScore(elapsed, effectiveDuration, solverRank);

        player.score += points;

        const msg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          senderId,
          senderName: player.name,
          text: `odgadł(a) hasło! (+${points} pkt)`,
          timestamp: Date.now(),
          type: "correct",
        };

        this.notifyUpdate();

        // Check if all guessers solved
        const totalGuessers = Object.values(this.state.players).filter(
          (p) => p.isConnected && p.id !== this.state.currentDrawerId
        ).length;

        if (this.state.solvedPlayerIds.length >= totalGuessers && totalGuessers > 0) {
          // All players solved! End turn immediately
          this.endTurn();
        }

        return { message: msg, isCorrect: true, isClose: false, points, targetAudience: "all" };
      }

      if (match.isClose) {
        // Near miss notification without leaking guessed text
        const msg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          senderId,
          senderName: player.name,
          text: `jest blisko!`,
          timestamp: Date.now(),
          type: "close",
        };
        return { message: msg, isCorrect: false, isClose: true, points: 0, targetAudience: "all" };
      }
    }

    // Normal public chat message
    const msg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderId,
      senderName: player.name,
      text: clean,
      timestamp: Date.now(),
      type: "public",
    };
    return { message: msg, isCorrect: false, isClose: false, points: 0, targetAudience: "all" };
  }

  private getEffectiveDuration(): number {
    return this.accelElapsedSeconds !== null
      ? this.accelElapsedSeconds + 30
      : this.state.drawTimeTotal;
  }

  private accelerateTimer(remainingSeconds: number): void {
    this.state.isTimerAccelerated = true;
    this.state.drawTimeRemaining = remainingSeconds;

    // Reschedule unrevealed hints across the remaining 30s window
    const effectiveHints = calculateEffectiveHints(
      this.state.currentWord || "",
      this.state.settings.maxHints
    );
    const unrevealedCount = Math.max(0, effectiveHints - this.state.revealedIndices.length);

    this.hintSchedule = rescheduleHintsOnAcceleration(remainingSeconds, unrevealedCount);
  }

  // -------------------------------------------------------------
  // Turn Intermission & End
  // -------------------------------------------------------------

  public endTurn(): void {
    this.stopTimer();

    const secretWord = this.state.currentWord || "";
    this.state.phase = "TURN_INTERMISSION";

    // Calculate drawer score
    let drawerScore = 0;
    const drawerId = this.state.currentDrawerId;
    const guesserScores: Record<string, number> = {};

    for (const id of this.solverTimes.keys()) {
      guesserScores[id] = this.state.players[id]?.score || 0;
    }

    if (drawerId && this.state.players[drawerId]) {
      const activeGuessers = Object.values(this.state.players).filter(
        (p) => p.isConnected && p.id !== drawerId
      ).length;
      const solverCount = this.state.solvedPlayerIds.length;

      let avgElapsed = 0;
      if (solverCount > 0) {
        let totalTime = 0;
        for (const elapsed of this.solverTimes.values()) {
          totalTime += elapsed;
        }
        avgElapsed = totalTime / solverCount;
      }

      drawerScore = calculateDrawerScore(
        activeGuessers,
        solverCount,
        avgElapsed,
        this.getEffectiveDuration()
      );
      this.state.players[drawerId].score += drawerScore;
    }

    const turnScores: RysowanieTurnScores = {
      drawerScore,
      guesserScores,
    };

    if (this.onTurnEnd) {
      this.onTurnEnd(secretWord, turnScores);
    }
    this.notifyUpdate();

    // 5-second intermission before advancing
    setTimeout(() => {
      this.advanceAfterIntermission();
    }, 5000);
  }

  private advanceAfterIntermission(): void {
    this.state.turnNumber++;

    const connectedPlayers = this.state.turnOrder.filter(
      (id) => this.state.players[id]?.isConnected
    );

    // If every connected player has had a turn drawing in this round:
    if (this.state.turnNumber >= this.state.round * connectedPlayers.length) {
      this.state.round++;
    }

    // Check if game is over
    if (this.state.round > this.state.totalRounds) {
      this.endGame();
    } else {
      this.startWordSelection();
    }
  }

  private endGame(): void {
    this.stopTimer();
    this.state.phase = "GAME_OVER";

    // Build podium ranking
    const sortedPlayers = Object.values(this.state.players)
      .filter((p) => p.isConnected)
      .sort((a, b) => b.score - a.score);

    const podium = sortedPlayers.map((player, idx) => ({
      player,
      rank: idx + 1,
      score: player.score,
    }));

    this.state.winnerPodium = podium;

    if (this.onGameOver) {
      this.onGameOver(podium);
    }
    this.notifyUpdate();
  }

  // -------------------------------------------------------------
  // Canvas Actions Management
  // -------------------------------------------------------------

  public addCanvasAction(action: CanvasAction): void {
    this.state.canvasHistory.push(action);
  }

  public undoCanvasAction(): void {
    // Pop last action
    if (this.state.canvasHistory.length > 0) {
      this.state.canvasHistory.pop();
    }
  }

  public clearCanvas(): void {
    this.state.canvasHistory.push({ type: "clear" });
  }

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private notifyUpdate(): void {
    if (this.onStateUpdate) {
      this.onStateUpdate(this.state);
    }
  }

  public destroy(): void {
    this.stopTimer();
  }
}
