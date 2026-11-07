/**
 * "Gorące Krzesło / Pytania do Lidera" (Hot Seat Q&A) State Machine
 *
 * Implements:
 * 1. Active speaker spotlight with glowing chameleon state.
 * 2. 3 Depth Tiers (Fun, Stories & Values, Leadership & Reflection) from icebreakers.{lang}.json.
 * 3. Audience question queue with upvoting: score = upvotes * 10 + recency.
 * 4. Psychological safety "Pas / Następne pytanie" lifeline with ZERO score penalty.
 * 5. Scoring (+100 pts for active speaker per answered question, +30 pts for author of chosen audience question).
 */

import fs from "fs";
import path from "path";
import {
  Player,
  RoomSettings,
  HotSeatRoomState,
  HotSeatQuestion,
} from "../types";
import { cleanText } from "../../lib/game/profanity-filter";

interface HotSeatCallbacks {
  onStateUpdate?: (state: HotSeatRoomState) => void;
  onScoresAwarded?: (scores: Record<string, number>) => void;
  onGameOver?: (podium: { player: Player; rank: number; score: number }[]) => void;
}

export class HotSeatGameSession {
  public state: HotSeatRoomState;
  public players: Record<string, Player>;
  private tierQuestions: {
    1: string[];
    2: string[];
    3: string[];
  } = { 1: [], 2: [], 3: [] };
  private timerInterval: NodeJS.Timeout | null = null;
  private callbacks: HotSeatCallbacks;

  constructor(
    roomCode: string,
    hostId: string,
    players: Record<string, Player> = {},
    settings?: Partial<RoomSettings>,
    callbacks: HotSeatCallbacks = {}
  ) {
    this.players = { ...players };
    this.callbacks = callbacks;

    const lang = settings?.language || "pl";
    this.loadQuestions(lang);

    const playerIds = Object.keys(this.players);

    this.state = {
      roomCode,
      hostId,
      phase: "LOBBY",
      activeSpeakerId: playerIds[0] || null,
      speakerHistory: [],
      currentTier: 1,
      currentQuestion: null,
      questionQueue: [],
      answeringTimeTotal: 90,
      answeringTimeRemaining: 90,
      questionsAnswered: 0,
      passLifelineAvailable: true,
      suggestedQuestions: this.tierQuestions[1].slice(0, 4),
    };
  }

  private loadQuestions(lang: string) {
    try {
      const filePath = path.join(process.cwd(), `messages/content/icebreakers.${lang}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.hot_seat) {
          if (Array.isArray(parsed.hot_seat.tier1_fun)) {
            this.tierQuestions[1] = parsed.hot_seat.tier1_fun;
          }
          if (Array.isArray(parsed.hot_seat.tier2_values)) {
            this.tierQuestions[2] = parsed.hot_seat.tier2_values;
          }
          if (Array.isArray(parsed.hot_seat.tier3_leadership)) {
            this.tierQuestions[3] = parsed.hot_seat.tier3_leadership;
          }
        }
      }
    } catch {
      this.tierQuestions = {
        1: ["Jaka jest Twoja ulubiona gra z dzieciństwa?", "Gdybyś był zwierzakiem, jakim i dlaczego?"],
        2: ["Co jest dla Ciebie najważniejsze w przyjaźni?", "Kto jest Twoim największym autorytetem?"],
        3: ["Co odróżnia prawdziwego lidera od szefa?", "Jaki błąd przywódczy popełniłeś w przeszłości?"],
      };
    }
  }

  public addPlayer(player: Player): void {
    this.players[player.id] = player;
    if (!this.state.activeSpeakerId) {
      this.state.activeSpeakerId = player.id;
    }
    this.notifyUpdate();
  }

  public removePlayer(playerId: string): void {
    delete this.players[playerId];
    if (this.state.activeSpeakerId === playerId) {
      const remaining = Object.keys(this.players);
      this.state.activeSpeakerId = remaining[0] || null;
      if (this.state.phase === "ANSWERING") {
        this.state.phase = "SELECTION";
        this.stopTimer();
      }
    }
    this.notifyUpdate();
  }

  public startGame(): void {
    const playerIds = Object.keys(this.players);
    if (playerIds.length === 0) return;

    this.stopTimer();
    this.state.phase = "SELECTION";
    this.state.activeSpeakerId = playerIds[0];
    this.state.currentTier = 1;
    this.state.currentQuestion = null;
    this.state.questionsAnswered = 0;
    this.state.speakerHistory = [];
    this.state.suggestedQuestions = this.getSuggestedQuestions(1);
    this.notifyUpdate();
  }

  public selectSpeaker(speakerId: string): boolean {
    if (!this.players[speakerId]) return false;

    this.state.activeSpeakerId = speakerId;
    if (!this.state.speakerHistory.includes(speakerId)) {
      this.state.speakerHistory.push(speakerId);
    }
    this.state.phase = "QUESTION_PICK";
    this.state.suggestedQuestions = this.getSuggestedQuestions(this.state.currentTier);
    this.notifyUpdate();
    return true;
  }

  public setTier(tier: 1 | 2 | 3): void {
    this.state.currentTier = tier;
    this.state.suggestedQuestions = this.getSuggestedQuestions(tier);
    this.notifyUpdate();
  }

  public getSuggestedQuestions(tier: 1 | 2 | 3): string[] {
    const list = this.tierQuestions[tier] || [];
    // Shuffle and pick 4
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  }

  public submitAudienceQuestion(authorId: string, text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const cleaned = cleanText(trimmed);
    const author = this.players[authorId];

    const question: HotSeatQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authorId,
      authorName: author?.name || "Uczestnik",
      text: cleaned,
      tier: this.state.currentTier,
      upvotes: [],
      score: 0,
      timestamp: Date.now(),
    };

    this.state.questionQueue.push(question);
    this.sortQuestionQueue();
    this.notifyUpdate();
    return true;
  }

  public upvoteQuestion(questionId: string, voterId: string): boolean {
    const q = this.state.questionQueue.find((item) => item.id === questionId);
    if (!q) return false;

    if (q.upvotes.includes(voterId)) {
      // Toggle off upvote
      q.upvotes = q.upvotes.filter((id) => id !== voterId);
    } else {
      q.upvotes.push(voterId);
    }

    q.score = q.upvotes.length * 10;
    this.sortQuestionQueue();
    this.notifyUpdate();
    return true;
  }

  private sortQuestionQueue(): void {
    this.state.questionQueue.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timestamp - b.timestamp;
    });
  }

  public pickQuestion(questionText: string, tier?: 1 | 2 | 3): void {
    this.stopTimer();

    if (tier) {
      this.state.currentTier = tier;
    }

    this.state.currentQuestion = questionText;
    this.state.phase = "ANSWERING";
    this.state.answeringTimeRemaining = this.state.answeringTimeTotal;
    this.state.passLifelineAvailable = true;

    // Check if question came from queue
    const queueIdx = this.state.questionQueue.findIndex((q) => q.text === questionText);
    if (queueIdx !== -1) {
      const q = this.state.questionQueue[queueIdx];
      // Reward question author: +30 pts
      if (q.authorId && this.players[q.authorId]) {
        this.players[q.authorId].score += 30;
        if (this.callbacks.onScoresAwarded) {
          this.callbacks.onScoresAwarded({ [q.authorId]: 30 });
        }
      }
      this.state.questionQueue.splice(queueIdx, 1);
    }

    this.startAnsweringTimer();
    this.notifyUpdate();
  }

  public passLifeline(): void {
    // Psychological safety lifeline: ZERO penalty!
    this.stopTimer();
    this.state.currentQuestion = null;
    this.state.phase = "QUESTION_PICK";
    this.state.suggestedQuestions = this.getSuggestedQuestions(this.state.currentTier);
    this.notifyUpdate();
  }

  public completeAnswer(): void {
    this.stopTimer();

    // Reward speaker: +100 pts
    const speakerId = this.state.activeSpeakerId;
    if (speakerId && this.players[speakerId]) {
      this.players[speakerId].score += 100;
      if (this.callbacks.onScoresAwarded) {
        this.callbacks.onScoresAwarded({ [speakerId]: 100 });
      }
    }

    this.state.questionsAnswered += 1;
    this.state.currentQuestion = null;
    this.state.phase = "QUESTION_PICK";
    this.state.suggestedQuestions = this.getSuggestedQuestions(this.state.currentTier);
    this.notifyUpdate();
  }

  private startAnsweringTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.state.answeringTimeRemaining -= 1;
      if (this.state.answeringTimeRemaining <= 0) {
        this.completeAnswer();
      } else {
        this.notifyUpdate();
      }
    }, 1000);
  }

  public endGame(): void {
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
