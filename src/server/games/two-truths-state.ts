/**
 * "Dwie Prawdy i Kłamstwo" (Two Truths and a Lie) State Machine
 *
 * Implements:
 * 1. Statement submission (2 truths, 1 lie) with profanity filtering.
 * 2. 30s secret peer voting.
 * 3. 3D flip card reveal.
 * 4. Fair normalized bluff scoring: S_bluff = round(200 * N_fooled / N_peers) <= 200 pts.
 * 5. Correct guessers earn +100 pts.
 */

import fs from "fs";
import path from "path";
import {
  Player,
  RoomSettings,
  TwoTruthsRoomState,
} from "../types";
import { cleanText } from "../../lib/game/profanity-filter";

/**
 * Calculates normalized bluff score.
 * S_bluff = round(200 * N_fooled / N_peers), capped at 200 pts.
 * If N_peers <= 0, returns 0.
 */
export function calculateBluffScore(fooledCount: number, peersCount: number): number {
  if (peersCount <= 0 || fooledCount <= 0) return 0;
  const clampedFooled = Math.max(0, Math.min(peersCount, fooledCount));
  const rawScore = Math.round(200 * (clampedFooled / peersCount));
  return Math.min(200, Math.max(0, rawScore));
}

interface TwoTruthsCallbacks {
  onStateUpdate?: (state: TwoTruthsRoomState) => void;
  onScoresAwarded?: (scores: Record<string, number>) => void;
  onGameOver?: (podium: { player: Player; rank: number; score: number }[]) => void;
}

export class TwoTruthsGameSession {
  public state: TwoTruthsRoomState;
  public players: Record<string, Player>;
  private secretLieIndex: number | null = null;
  private timerInterval: NodeJS.Timeout | null = null;
  private callbacks: TwoTruthsCallbacks;
  private themes: string[] = [];

  constructor(
    roomCode: string,
    hostId: string,
    players: Record<string, Player> = {},
    settings?: Partial<RoomSettings>,
    callbacks: TwoTruthsCallbacks = {}
  ) {
    this.players = { ...players };
    this.callbacks = callbacks;

    const lang = settings?.language || "pl";
    this.loadThemes(lang);

    const playerIds = Object.keys(this.players);

    this.state = {
      roomCode,
      hostId,
      phase: "LOBBY",
      activePlayerId: playerIds[0] || null,
      turnNumber: 0,
      totalTurns: Math.max(1, playerIds.length),
      turnOrder: [...playerIds],
      statements: null,
      lieIndex: null,
      votingTimeTotal: 30,
      votingTimeRemaining: 30,
      votes: {},
      fooledCount: 0,
      bluffScore: 0,
      correctVoters: [],
      currentTheme: this.getRandomTheme(),
    };
  }

  private loadThemes(lang: string) {
    try {
      const filePath = path.join(process.cwd(), `messages/content/icebreakers.${lang}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.two_truths?.themes) {
          this.themes = parsed.two_truths.themes;
        }
      }
    } catch {
      this.themes = [
        "Niezwykłe podróże i przygody z dzieciństwa",
        "Ukryte talenty i nietypowe hobby",
        "Śmieszne wpadki w szkole lub na studiach",
      ];
    }
  }

  public getRandomTheme(): string {
    if (this.themes.length === 0) return "Niezwykłe hobby i pasje";
    const idx = Math.floor(Math.random() * this.themes.length);
    return this.themes[idx];
  }

  public addPlayer(player: Player): void {
    this.players[player.id] = player;
    if (!this.state.turnOrder.includes(player.id)) {
      this.state.turnOrder.push(player.id);
      this.state.totalTurns = this.state.turnOrder.length;
    }
    if (!this.state.activePlayerId) {
      this.state.activePlayerId = player.id;
    }
    this.notifyUpdate();
  }

  public removePlayer(playerId: string): void {
    delete this.players[playerId];
    this.state.turnOrder = this.state.turnOrder.filter((id) => id !== playerId);
    this.state.totalTurns = Math.max(1, this.state.turnOrder.length);

    if (this.state.activePlayerId === playerId) {
      // Advance if active player left
      if (this.state.phase !== "LOBBY" && this.state.phase !== "GAME_OVER") {
        this.nextTurn();
      } else {
        this.state.activePlayerId = this.state.turnOrder[0] || null;
      }
    }
    this.notifyUpdate();
  }

  public startGame(): void {
    const playerIds = Object.keys(this.players);
    if (playerIds.length === 0) return;

    this.stopTimer();
    this.state.turnOrder = [...playerIds];
    this.state.totalTurns = playerIds.length;
    this.state.turnNumber = 1;
    this.state.activePlayerId = this.state.turnOrder[0];
    this.state.phase = "SUBMISSION";
    this.state.statements = null;
    this.state.lieIndex = null;
    this.secretLieIndex = null;
    this.state.votes = {};
    this.state.fooledCount = 0;
    this.state.bluffScore = 0;
    this.state.correctVoters = [];
    this.state.currentTheme = this.getRandomTheme();

    this.notifyUpdate();
  }

  public submitStatements(
    playerId: string,
    statements: [string, string, string],
    lieIndex: number
  ): boolean {
    if (this.state.phase !== "SUBMISSION") return false;
    if (this.state.activePlayerId !== playerId) return false;
    if (lieIndex < 0 || lieIndex > 2) return false;
    if (!statements || statements.length !== 3) return false;

    // Filter profanity
    const cleanedStatements: [string, string, string] = [
      cleanText(statements[0].trim()),
      cleanText(statements[1].trim()),
      cleanText(statements[2].trim()),
    ];

    this.state.statements = cleanedStatements;
    this.secretLieIndex = lieIndex;
    this.state.lieIndex = null; // hidden from others!
    this.state.phase = "VOTING";
    this.state.votes = {};
    this.state.votingTimeRemaining = this.state.votingTimeTotal;

    this.startVotingTimer();
    this.notifyUpdate();
    return true;
  }

  public submitVote(voterId: string, statementIndex: number): boolean {
    if (this.state.phase !== "VOTING") return false;
    // Active player cannot vote on their own card
    if (voterId === this.state.activePlayerId) return false;
    if (statementIndex < 0 || statementIndex > 2) return false;

    this.state.votes[voterId] = statementIndex;

    // Check if all peers have voted
    const peers = this.state.turnOrder.filter((id) => id !== this.state.activePlayerId);
    const votesCount = Object.keys(this.state.votes).length;

    if (votesCount >= peers.length && peers.length > 0) {
      this.revealLie();
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
        this.revealLie();
      } else {
        this.notifyUpdate();
      }
    }, 1000);
  }

  public revealLie(): void {
    this.stopTimer();
    if (this.state.phase !== "VOTING") return;

    this.state.phase = "REVEAL";
    this.state.lieIndex = this.secretLieIndex;

    const lieIdx = this.secretLieIndex ?? 0;
    const peers = this.state.turnOrder.filter((id) => id !== this.state.activePlayerId);
    const peersCount = peers.length;

    let fooledCount = 0;
    const correctVoters: string[] = [];
    const awardedScores: Record<string, number> = {};

    for (const peerId of peers) {
      const vote = this.state.votes[peerId];
      if (vote === lieIdx) {
        correctVoters.push(peerId);
        awardedScores[peerId] = (awardedScores[peerId] || 0) + 100;
        if (this.players[peerId]) {
          this.players[peerId].score += 100;
        }
      } else {
        fooledCount++;
      }
    }

    const bluffScore = calculateBluffScore(fooledCount, peersCount);
    this.state.fooledCount = fooledCount;
    this.state.bluffScore = bluffScore;
    this.state.correctVoters = correctVoters;

    if (this.state.activePlayerId && bluffScore > 0) {
      awardedScores[this.state.activePlayerId] = bluffScore;
      if (this.players[this.state.activePlayerId]) {
        this.players[this.state.activePlayerId].score += bluffScore;
      }
    }

    if (this.callbacks.onScoresAwarded && Object.keys(awardedScores).length > 0) {
      this.callbacks.onScoresAwarded(awardedScores);
    }

    this.notifyUpdate();
  }

  public nextTurn(): void {
    this.stopTimer();
    if (this.state.turnNumber >= this.state.totalTurns) {
      this.endGame();
      return;
    }

    this.state.turnNumber += 1;
    const nextIdx = (this.state.turnNumber - 1) % this.state.turnOrder.length;
    this.state.activePlayerId = this.state.turnOrder[nextIdx];
    this.state.phase = "SUBMISSION";
    this.state.statements = null;
    this.state.lieIndex = null;
    this.secretLieIndex = null;
    this.state.votes = {};
    this.state.fooledCount = 0;
    this.state.bluffScore = 0;
    this.state.correctVoters = [];
    this.state.currentTheme = this.getRandomTheme();

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

  public getPublicState(viewerId?: string): TwoTruthsRoomState {
    // If during VOTING and viewer is not the active bluffer, hide the lieIndex
    if (this.state.phase === "VOTING" && viewerId !== this.state.activePlayerId) {
      return {
        ...this.state,
        lieIndex: null,
      };
    }
    return { ...this.state };
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
