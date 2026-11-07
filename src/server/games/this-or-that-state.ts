/**
 * "To czy Tamto" (This or That Dilemmas) State Machine
 *
 * Implements:
 * 1. 12s dilemma voting from localized decks (icebreakers.{lang}.json).
 * 2. Animated split percentage calculation: P_A = round(N_A / (N_A + N_B) * 100), P_B = 100 - P_A.
 * 3. Outlier detection ("Jedyny Wybraniec" / Rebel Badge):
 *    Awarded when exactly 1 player chooses an option against >= 3 peers.
 * 4. Participation scoring (+20 pts) and outlier bonus (+50 pts).
 */

import fs from "fs";
import path from "path";
import {
  Player,
  RoomSettings,
  ThisOrThatRoomState,
  DilemmaItem,
  ThisOrThatStats,
  ThisOrThatOutlier,
} from "../types";

/**
 * Calculates percentage breakdown for Option A vs Option B.
 */
export function calculateThisOrThatStats(votes: Record<string, "A" | "B">): ThisOrThatStats {
  const values = Object.values(votes);
  const total = values.length;
  if (total === 0) {
    return { countA: 0, countB: 0, percentA: 50, percentB: 50 };
  }

  const countA = values.filter((v) => v === "A").length;
  const countB = total - countA;

  const percentA = Math.round((countA / total) * 100);
  const percentB = 100 - percentA;

  return { countA, countB, percentA, percentB };
}

/**
 * Detects "Jedyny Wybraniec" outlier when exactly 1 voter chooses an option with >= 3 peers opposing.
 */
export function detectThisOrThatOutliers(
  votes: Record<string, "A" | "B">,
  players: Record<string, Player>
): ThisOrThatOutlier[] {
  const entries = Object.entries(votes);
  const countA = entries.filter(([, v]) => v === "A").length;
  const countB = entries.length - countA;

  const outliers: ThisOrThatOutlier[] = [];

  if (countA === 1 && countB >= 3) {
    const [playerId] = entries.find(([, v]) => v === "A")!;
    outliers.push({
      playerId,
      playerName: players[playerId]?.name || "Anonim",
      choice: "A",
      badge: "Jedyny Wybraniec",
    });
  } else if (countB === 1 && countA >= 3) {
    const [playerId] = entries.find(([, v]) => v === "B")!;
    outliers.push({
      playerId,
      playerName: players[playerId]?.name || "Anonim",
      choice: "B",
      badge: "Jedyny Wybraniec",
    });
  }

  return outliers;
}

interface ThisOrThatCallbacks {
  onStateUpdate?: (state: ThisOrThatRoomState) => void;
  onScoresAwarded?: (scores: Record<string, number>) => void;
  onGameOver?: (podium: { player: Player; rank: number; score: number }[]) => void;
}

export class ThisOrThatGameSession {
  public state: ThisOrThatRoomState;
  public players: Record<string, Player>;
  private dilemmas: DilemmaItem[] = [];
  private timerInterval: NodeJS.Timeout | null = null;
  private callbacks: ThisOrThatCallbacks;

  constructor(
    roomCode: string,
    hostId: string,
    players: Record<string, Player> = {},
    settings?: Partial<RoomSettings>,
    callbacks: ThisOrThatCallbacks = {}
  ) {
    this.players = { ...players };
    this.callbacks = callbacks;

    const lang = settings?.language || "pl";
    this.loadDilemmas(lang);

    this.state = {
      roomCode,
      hostId,
      phase: "LOBBY",
      dilemmaIndex: 0,
      totalDilemmas: this.dilemmas.length || 10,
      currentDilemma: null,
      votingTimeTotal: 12,
      votingTimeRemaining: 12,
      votes: {},
      scores: {},
    };
  }

  private loadDilemmas(lang: string) {
    try {
      const filePath = path.join(process.cwd(), `messages/content/icebreakers.${lang}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.this_or_that)) {
          this.dilemmas = parsed.this_or_that;
        }
      }
    } catch {
      this.dilemmas = [
        { id: "tot-1", category: "tech", optionA: "Praca w 100% zdalna", optionB: "Codzienne spotkania w biurze" },
        { id: "tot-2", category: "tech", optionA: "AI jako doradca", optionB: "Tylko ludzka intuicja" },
      ];
    }
  }

  public addPlayer(player: Player): void {
    this.players[player.id] = player;
    this.notifyUpdate();
  }

  public removePlayer(playerId: string): void {
    delete this.players[playerId];
    this.notifyUpdate();
  }

  public startGame(): void {
    if (this.dilemmas.length === 0) return;

    this.stopTimer();
    this.state.dilemmaIndex = 0;
    this.state.totalDilemmas = Math.min(10, this.dilemmas.length);
    this.nextDilemma();
  }

  public nextDilemma(): void {
    this.stopTimer();

    if (this.state.dilemmaIndex >= this.state.totalDilemmas) {
      this.endGame();
      return;
    }

    const current = this.dilemmas[this.state.dilemmaIndex];
    this.state.dilemmaIndex += 1;
    this.state.currentDilemma = current;
    this.state.phase = "VOTING";
    this.state.votes = {};
    this.state.stats = undefined;
    this.state.outliers = undefined;
    this.state.votingTimeRemaining = this.state.votingTimeTotal;

    this.startVotingTimer();
    this.notifyUpdate();
  }

  public submitVote(voterId: string, choice: "A" | "B"): boolean {
    if (this.state.phase !== "VOTING") return false;
    if (choice !== "A" && choice !== "B") return false;

    this.state.votes[voterId] = choice;

    const totalVoters = Object.keys(this.players).length;
    const currentVotes = Object.keys(this.state.votes).length;

    // If everyone in the room has voted, calculate results immediately
    if (currentVotes >= totalVoters && totalVoters > 0) {
      this.calculateResults();
    } else {
      this.notifyUpdate();
    }

    return true;
  }

  private startVotingTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.state.votingTimeRemaining -= 1;
      if (this.state.votingTimeRemaining <= 0) {
        this.stopTimer();
        this.calculateResults();
      } else {
        this.notifyUpdate();
      }
    }, 1000);
  }

  public calculateResults(): void {
    this.stopTimer();
    if (this.state.phase !== "VOTING") return;

    this.state.phase = "RESULTS";
    const stats = calculateThisOrThatStats(this.state.votes);
    const outliers = detectThisOrThatOutliers(this.state.votes, this.players);

    this.state.stats = stats;
    this.state.outliers = outliers;

    // Award scores
    const awardedScores: Record<string, number> = {};

    // Base score for voting: +20 pts
    for (const voterId of Object.keys(this.state.votes)) {
      awardedScores[voterId] = (awardedScores[voterId] || 0) + 20;
      if (this.players[voterId]) {
        this.players[voterId].score += 20;
      }
    }

    // Outlier bonus: +50 pts
    for (const outlier of outliers) {
      awardedScores[outlier.playerId] = (awardedScores[outlier.playerId] || 0) + 50;
      if (this.players[outlier.playerId]) {
        this.players[outlier.playerId].score += 50;
      }
    }

    if (this.callbacks.onScoresAwarded && Object.keys(awardedScores).length > 0) {
      this.callbacks.onScoresAwarded(awardedScores);
    }

    this.notifyUpdate();
  }

  private endGame(): void {
    this.stopTimer();
    this.state.phase = "GAME_OVER";

    const sortedPlayers = Object.values(this.players).sort((a, b) => b.score - a.score);
    const podium = sortedPlayers.slice(0, 3).map((player, index) => ({
      player,
      rank: index + 1,
      score: player.score,
    }));

    this.state.winnerPodium = podium;
    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver(podium);
    }
    this.notifyUpdate();
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public destroy(): void {
    this.stopTimer();
  }

  private notifyUpdate(): void {
    if (this.callbacks.onStateUpdate) {
      this.callbacks.onStateUpdate(this.state);
    }
  }
}
