/**
 * "Wspólna Historia" (Collaborative Story Chain) State Machine
 *
 * Implements:
 * 1. Circular turn queue rotating through active players.
 * 2. Sentence mode (20s) and Word-by-word mode (6s).
 * 3. Plot twist wildcards triggered every 5 turns from icebreakers.{lang}.json.
 * 4. Text and Markdown export functions.
 * 5. Scoring (+50 pts per contributed segment, +50 bonus for wildcard turns).
 */

import fs from "fs";
import path from "path";
import {
  Player,
  RoomSettings,
  StoryChainRoomState,
  StorySegment,
} from "../types";
import { cleanText } from "../../lib/game/profanity-filter";

/**
 * Compiles story segments into structured Markdown with author attributions.
 */
export function exportStoryToMarkdown(
  title: string,
  starter: string,
  segments: StorySegment[]
): string {
  let md = `# ${title || "Wspólna Historia — Liderzy Jutra"}\n\n`;
  md += `> **Początek historii:**\n> ${starter}\n\n---\n\n`;

  for (const seg of segments) {
    if (seg.isWildcard) {
      md += `\n⚡ **${seg.text}**\n\n`;
    } else {
      md += `*${seg.authorName}*: ${seg.text}\n\n`;
    }
  }

  return md.trim();
}

/**
 * Compiles story segments into a single cohesive plain-text narrative.
 */
export function exportStoryToText(starter: string, segments: StorySegment[]): string {
  const parts: string[] = [starter];
  for (const seg of segments) {
    parts.push(seg.text);
  }
  return parts.join(" ").trim();
}

interface StoryChainCallbacks {
  onStateUpdate?: (state: StoryChainRoomState) => void;
  onScoresAwarded?: (scores: Record<string, number>) => void;
  onGameOver?: (podium: { player: Player; rank: number; score: number }[]) => void;
}

export class StoryChainGameSession {
  public state: StoryChainRoomState;
  public players: Record<string, Player>;
  private starters: string[] = [];
  private wildcards: string[] = [];
  private timerInterval: NodeJS.Timeout | null = null;
  private callbacks: StoryChainCallbacks;
  private maxTurns: number = 20;

  constructor(
    roomCode: string,
    hostId: string,
    players: Record<string, Player> = {},
    settings?: Partial<RoomSettings>,
    callbacks: StoryChainCallbacks = {}
  ) {
    this.players = { ...players };
    this.callbacks = callbacks;

    const lang = settings?.language || "pl";
    this.loadContent(lang);

    const playerIds = Object.keys(this.players);
    const starter = this.getRandomStarter();

    this.state = {
      roomCode,
      hostId,
      phase: "LOBBY",
      mode: "SENTENCE",
      starter,
      currentTurnPlayerId: playerIds[0] || null,
      turnOrder: [...playerIds],
      turnIndex: 0,
      turnTimeTotal: 20,
      turnTimeRemaining: 20,
      segments: [],
      activeWildcard: null,
      fullStory: starter,
    };
  }

  private loadContent(lang: string) {
    try {
      const filePath = path.join(process.cwd(), `messages/content/icebreakers.${lang}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.story_chain?.starters) {
          this.starters = parsed.story_chain.starters;
        }
        if (parsed.story_chain?.wildcards) {
          this.wildcards = parsed.story_chain.wildcards;
        }
      }
    } catch {
      this.starters = [
        "Rok 2045. W podziemiach starej warszawskiej biblioteki zespół inżynierów odkrył terminal...",
      ];
      this.wildcards = [
        "ZWROT AKCJI: Jeden z członków zespołu nagle przyznaje się, że to on zaplanował całe to zamieszanie!",
      ];
    }
  }

  public getRandomStarter(): string {
    if (this.starters.length === 0) return "Pewnego słonecznego dnia w Bielsku-Białej...";
    const idx = Math.floor(Math.random() * this.starters.length);
    return this.starters[idx];
  }

  public getRandomWildcard(): string {
    if (this.wildcards.length === 0) return "ZWROT AKCJI: Nagle gasną wszystkie światła!";
    const idx = Math.floor(Math.random() * this.wildcards.length);
    return this.wildcards[idx];
  }

  public addPlayer(player: Player): void {
    this.players[player.id] = player;
    if (!this.state.turnOrder.includes(player.id)) {
      this.state.turnOrder.push(player.id);
    }
    if (!this.state.currentTurnPlayerId) {
      this.state.currentTurnPlayerId = player.id;
    }
    this.notifyUpdate();
  }

  public removePlayer(playerId: string): void {
    delete this.players[playerId];
    this.state.turnOrder = this.state.turnOrder.filter((id) => id !== playerId);

    if (this.state.currentTurnPlayerId === playerId) {
      if (this.state.phase === "TURN_ACTIVE") {
        this.nextTurn();
      } else {
        this.state.currentTurnPlayerId = this.state.turnOrder[0] || null;
      }
    }
    this.notifyUpdate();
  }

  public setMode(mode: "SENTENCE" | "WORD"): void {
    this.state.mode = mode;
    this.state.turnTimeTotal = mode === "SENTENCE" ? 20 : 6;
    if (this.state.phase === "TURN_ACTIVE") {
      this.state.turnTimeRemaining = this.state.turnTimeTotal;
    }
    this.notifyUpdate();
  }

  public startGame(): void {
    const playerIds = Object.keys(this.players);
    if (playerIds.length === 0) return;

    this.stopTimer();
    this.state.starter = this.getRandomStarter();
    this.state.turnOrder = [...playerIds];
    this.state.turnIndex = 0;
    this.state.segments = [];
    this.state.fullStory = this.state.starter;
    this.state.turnTimeTotal = this.state.mode === "SENTENCE" ? 20 : 6;
    this.nextTurn();
  }

  public nextTurn(): void {
    this.stopTimer();

    if (this.state.turnIndex >= this.maxTurns || this.state.turnOrder.length === 0) {
      this.finishStory();
      return;
    }

    this.state.turnIndex += 1;
    const currentIdx = (this.state.turnIndex - 1) % this.state.turnOrder.length;
    this.state.currentTurnPlayerId = this.state.turnOrder[currentIdx];

    // Every 5 turns, trigger a wildcard
    if (this.state.turnIndex > 1 && this.state.turnIndex % 5 === 0) {
      const wildcard = this.getRandomWildcard();
      this.state.activeWildcard = wildcard;
      this.state.phase = "WILDCARD_ALERT";
      this.state.wildcardAlertRemaining = 3;

      this.timerInterval = setInterval(() => {
        if (!this.state.wildcardAlertRemaining || this.state.wildcardAlertRemaining <= 1) {
          this.stopTimer();
          // Insert wildcard as narrative segment
          const segment: StorySegment = {
            id: `seg-wc-${Date.now()}`,
            authorId: "system",
            authorName: "Kameleon Narrator",
            text: wildcard,
            isWildcard: true,
            timestamp: Date.now(),
          };
          this.state.segments.push(segment);
          this.state.fullStory = exportStoryToText(this.state.starter, this.state.segments);
          this.state.phase = "TURN_ACTIVE";
          this.state.turnTimeRemaining = this.state.turnTimeTotal;
          this.startTurnTimer();
          this.notifyUpdate();
        } else {
          this.state.wildcardAlertRemaining -= 1;
          this.notifyUpdate();
        }
      }, 1000);

      this.notifyUpdate();
      return;
    }

    this.state.phase = "TURN_ACTIVE";
    this.state.turnTimeRemaining = this.state.turnTimeTotal;
    this.startTurnTimer();
    this.notifyUpdate();
  }

  public submitSegment(authorId: string, text: string): boolean {
    if (this.state.phase !== "TURN_ACTIVE") return false;
    if (this.state.currentTurnPlayerId !== authorId) return false;

    const trimmed = text.trim();
    if (!trimmed) return false;

    const cleaned = cleanText(trimmed);
    const author = this.players[authorId];

    const segment: StorySegment = {
      id: `seg-${Date.now()}`,
      authorId,
      authorName: author?.name || "Uczestnik",
      text: cleaned,
      isWildcard: Boolean(this.state.activeWildcard),
      timestamp: Date.now(),
    };

    this.state.segments.push(segment);
    this.state.fullStory = exportStoryToText(this.state.starter, this.state.segments);

    // Scoring: +50 pts per segment, +50 bonus if responding to a wildcard
    let points = 50;
    if (this.state.activeWildcard) {
      points += 50;
      this.state.activeWildcard = null;
    }

    if (author) {
      author.score += points;
    }

    if (this.callbacks.onScoresAwarded) {
      this.callbacks.onScoresAwarded({ [authorId]: points });
    }

    this.nextTurn();
    return true;
  }

  public passTurn(): void {
    if (this.state.phase !== "TURN_ACTIVE") return;
    this.nextTurn();
  }

  private startTurnTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.state.turnTimeRemaining -= 1;
      if (this.state.turnTimeRemaining <= 0) {
        this.stopTimer();
        this.nextTurn();
      } else {
        this.notifyUpdate();
      }
    }, 1000);
  }

  public finishStory(): void {
    this.stopTimer();
    this.state.phase = "FINALE_REVEAL";
    this.state.fullStory = exportStoryToText(this.state.starter, this.state.segments);

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
