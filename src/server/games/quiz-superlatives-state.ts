/**
 * "Quiz Drużynowy / Kto w Drużynie..." (Team Superlatives) State Machine
 *
 * Implements:
 * 1. Curated superlative prompts from icebreakers.{lang}.json.
 * 2. 30s peer grid secret voting.
 * 3. Animated podium countdown (3rd -> 2nd -> 1st place champion).
 * 4. Team Hall of Fame ("Księga Pamiątkowa Drużyny") tracking superlative awards.
 * 5. Scoring (+20 pts for voting, +30 pts per vote received from teammates).
 */

import fs from "fs";
import path from "path";
import {
  Player,
  RoomSettings,
  QuizSuperlativesRoomState,
  SuperlativeWinner,
} from "../types";

/**
 * Tallies votes and produces ordered podium winners (1st, 2nd, 3rd).
 */
export function calculateSuperlativePodium(
  votes: Record<string, string>,
  players: Record<string, Player>
): SuperlativeWinner[] {
  const tally: Record<string, number> = {};

  for (const targetId of Object.values(votes)) {
    tally[targetId] = (tally[targetId] || 0) + 1;
  }

  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);

  return entries.map(([playerId, voteCount], index) => ({
    playerId,
    playerName: players[playerId]?.name || "Anonim",
    votes: voteCount,
    rank: index + 1,
  }));
}

interface QuizSuperlativesCallbacks {
  onStateUpdate?: (state: QuizSuperlativesRoomState) => void;
  onScoresAwarded?: (scores: Record<string, number>) => void;
  onGameOver?: (podium: { player: Player; rank: number; score: number }[]) => void;
}

export class QuizSuperlativesGameSession {
  public state: QuizSuperlativesRoomState;
  public players: Record<string, Player>;
  private prompts: string[] = [];
  private timerInterval: NodeJS.Timeout | null = null;
  private callbacks: QuizSuperlativesCallbacks;

  constructor(
    roomCode: string,
    hostId: string,
    players: Record<string, Player> = {},
    settings?: Partial<RoomSettings>,
    callbacks: QuizSuperlativesCallbacks = {}
  ) {
    this.players = { ...players };
    this.callbacks = callbacks;

    const lang = settings?.language || "pl";
    this.loadPrompts(lang);

    this.state = {
      roomCode,
      hostId,
      phase: "LOBBY",
      promptIndex: 0,
      totalPrompts: Math.min(10, this.prompts.length || 10),
      currentPrompt: null,
      votingTimeTotal: 30,
      votingTimeRemaining: 30,
      votes: {},
      hallOfFame: [],
    };
  }

  private loadPrompts(lang: string) {
    try {
      const filePath = path.join(process.cwd(), `messages/content/icebreakers.${lang}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.quiz_superlatives)) {
          this.prompts = parsed.quiz_superlatives;
        }
      }
    } catch {
      this.prompts = [
        "Kto w zespole pierwszy przetestuje nowe narzędzie AI?",
        "Kto potrafi zachować spokój w największym chaosie?",
        "Kto ma zawsze najlepiej zorganizowane notatki?",
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
    if (this.prompts.length === 0) return;

    this.stopTimer();
    this.state.promptIndex = 0;
    this.state.totalPrompts = Math.min(10, this.prompts.length);
    this.state.hallOfFame = [];
    this.nextPrompt();
  }

  public nextPrompt(): void {
    this.stopTimer();

    if (this.state.promptIndex >= this.state.totalPrompts) {
      this.endGame();
      return;
    }

    const prompt = this.prompts[this.state.promptIndex];
    this.state.promptIndex += 1;
    this.state.currentPrompt = prompt;
    this.state.phase = "VOTING";
    this.state.votes = {};
    this.state.tally = undefined;
    this.state.podiumStep = undefined;
    this.state.podiumWinners = undefined;
    this.state.votingTimeRemaining = this.state.votingTimeTotal;

    this.startVotingTimer();
    this.notifyUpdate();
  }

  public submitVote(voterId: string, targetPlayerId: string): boolean {
    if (this.state.phase !== "VOTING") return false;
    if (!this.players[targetPlayerId]) return false;

    this.state.votes[voterId] = targetPlayerId;

    const totalVoters = Object.keys(this.players).length;
    const currentVotes = Object.keys(this.state.votes).length;

    if (currentVotes >= totalVoters && totalVoters > 0) {
      this.revealResults();
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
        this.revealResults();
      } else {
        this.notifyUpdate();
      }
    }, 1000);
  }

  public revealResults(): void {
    this.stopTimer();
    if (this.state.phase !== "VOTING") return;

    const winners = calculateSuperlativePodium(this.state.votes, this.players);
    this.state.podiumWinners = winners;

    // Tally
    const tally: Record<string, number> = {};
    for (const targetId of Object.values(this.state.votes)) {
      tally[targetId] = (tally[targetId] || 0) + 1;
    }
    this.state.tally = tally;

    // Scoring:
    // +20 pts for voting
    // +30 pts per vote received
    const awardedScores: Record<string, number> = {};

    for (const voterId of Object.keys(this.state.votes)) {
      awardedScores[voterId] = (awardedScores[voterId] || 0) + 20;
      if (this.players[voterId]) {
        this.players[voterId].score += 20;
      }
    }

    for (const [targetId, count] of Object.entries(tally)) {
      const bonus = count * 30;
      awardedScores[targetId] = (awardedScores[targetId] || 0) + bonus;
      if (this.players[targetId]) {
        this.players[targetId].score += bonus;
      }
    }

    if (this.callbacks.onScoresAwarded && Object.keys(awardedScores).length > 0) {
      this.callbacks.onScoresAwarded(awardedScores);
    }

    // Add 1st place champion to Hall of Fame
    if (winners.length > 0 && this.state.currentPrompt) {
      this.state.hallOfFame.push({
        prompt: this.state.currentPrompt,
        winnerId: winners[0].playerId,
        winnerName: winners[0].playerName,
        votes: winners[0].votes,
      });
    }

    // Countdown animation: step 3 -> 2 -> 1 -> Hall of fame
    this.state.phase = "PODIUM_COUNTDOWN";
    this.state.podiumStep = 3;
    this.notifyUpdate();

    let step = 3;
    this.timerInterval = setInterval(() => {
      step -= 1;
      if (step >= 1) {
        this.state.podiumStep = step as 3 | 2 | 1;
        this.notifyUpdate();
      } else {
        this.stopTimer();
        this.state.phase = "HALL_OF_FAME";
        this.state.podiumStep = 0;
        this.notifyUpdate();
      }
    }, 1500);
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
