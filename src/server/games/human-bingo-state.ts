/**
 * "Bingo Integracyjne" (Human / Networking Bingo) State Machine
 *
 * Implements:
 * 1. 4x4 (16 tiles) or 5x5 (25 tiles with central FREE SPACE) grids.
 * 2. Shuffled from 60 localized traits in icebreakers.{lang}.json.
 * 3. 2-way peer verification workflow with 45-second timeout.
 * 4. Line detection (all rows, columns, main diagonal, anti-diagonal).
 * 5. Scoring (+50 pts per verified tile, +250 pts line bonus).
 */

import fs from "fs";
import path from "path";
import {
  Player,
  RoomSettings,
  HumanBingoRoomState,
  BingoTileData,
  BingoPendingVerification,
  BingoWinnerRecord,
} from "../types";

/**
 * Checks completed lines (rows, columns, diagonals) on a 4x4 or 5x5 grid.
 */
export function checkBingoLines(
  grid: BingoTileData[],
  size: 4 | 5
): {
  hasBingo: boolean;
  completedLines: {
    type: "row" | "col" | "main_diag" | "anti_diag";
    index?: number;
  }[];
} {
  const completedLines: {
    type: "row" | "col" | "main_diag" | "anti_diag";
    index?: number;
  }[] = [];

  if (!grid || grid.length < size * size) {
    return { hasBingo: false, completedLines: [] };
  }

  // 1. Check Rows
  for (let r = 0; r < size; r++) {
    let rowComplete = true;
    for (let c = 0; c < size; c++) {
      const tile = grid[r * size + c];
      if (!tile || (!tile.isClaimed && !tile.isFree)) {
        rowComplete = false;
        break;
      }
    }
    if (rowComplete) {
      completedLines.push({ type: "row", index: r });
    }
  }

  // 2. Check Columns
  for (let c = 0; c < size; c++) {
    let colComplete = true;
    for (let r = 0; r < size; r++) {
      const tile = grid[r * size + c];
      if (!tile || (!tile.isClaimed && !tile.isFree)) {
        colComplete = false;
        break;
      }
    }
    if (colComplete) {
      completedLines.push({ type: "col", index: c });
    }
  }

  // 3. Check Main Diagonal (r === c)
  let mainDiagComplete = true;
  for (let i = 0; i < size; i++) {
    const tile = grid[i * size + i];
    if (!tile || (!tile.isClaimed && !tile.isFree)) {
      mainDiagComplete = false;
      break;
    }
  }
  if (mainDiagComplete) {
    completedLines.push({ type: "main_diag" });
  }

  // 4. Check Anti-Diagonal (c === size - 1 - r)
  let antiDiagComplete = true;
  for (let i = 0; i < size; i++) {
    const tile = grid[i * size + (size - 1 - i)];
    if (!tile || (!tile.isClaimed && !tile.isFree)) {
      antiDiagComplete = false;
      break;
    }
  }
  if (antiDiagComplete) {
    completedLines.push({ type: "anti_diag" });
  }

  return {
    hasBingo: completedLines.length > 0,
    completedLines,
  };
}

interface HumanBingoCallbacks {
  onStateUpdate?: (state: HumanBingoRoomState) => void;
  onScoresAwarded?: (scores: Record<string, number>) => void;
  onBingoLineCompleted?: (record: BingoWinnerRecord) => void;
  onVerifyRequest?: (req: BingoPendingVerification) => void;
  onGameOver?: (podium: { player: Player; rank: number; score: number }[]) => void;
}

export class HumanBingoGameSession {
  public state: HumanBingoRoomState;
  public players: Record<string, Player>;
  private traits: string[] = [];
  private callbacks: HumanBingoCallbacks;
  private verificationTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    roomCode: string,
    hostId: string,
    players: Record<string, Player> = {},
    settings?: Partial<RoomSettings>,
    callbacks: HumanBingoCallbacks = {}
  ) {
    this.players = { ...players };
    this.callbacks = callbacks;

    const lang = settings?.language || "pl";
    this.loadTraits(lang);

    this.state = {
      roomCode,
      hostId,
      phase: "LOBBY",
      gridSize: 4,
      playerGrids: {},
      pendingVerifications: {},
      bingoWinners: [],
    };
  }

  private loadTraits(lang: string) {
    try {
      const filePath = path.join(process.cwd(), `messages/content/icebreakers.${lang}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.human_bingo)) {
          this.traits = parsed.human_bingo;
        }
      }
    } catch {
      this.traits = [
        "Mówi płynnie w więcej niż 2 językach",
        "Gra na instrumencie muzycznym",
        "Nigdy nie pił kawy",
        "Napisał własny kod lub prompt AI",
      ];
    }
  }

  public setGridSize(size: 4 | 5): void {
    this.state.gridSize = size;
    // Regenerate grids for all current players
    for (const playerId of Object.keys(this.players)) {
      this.state.playerGrids[playerId] = this.generateGridForPlayer(playerId, size);
    }
    this.notifyUpdate();
  }

  public addPlayer(player: Player): void {
    this.players[player.id] = player;
    if (!this.state.playerGrids[player.id]) {
      this.state.playerGrids[player.id] = this.generateGridForPlayer(
        player.id,
        this.state.gridSize
      );
    }
    this.notifyUpdate();
  }

  public removePlayer(playerId: string): void {
    delete this.players[playerId];
    delete this.state.playerGrids[playerId];

    // Remove pending verifications involving this player
    for (const [id, req] of Object.entries(this.state.pendingVerifications)) {
      if (req.requesterId === playerId || req.targetId === playerId) {
        this.clearVerificationTimeout(id);
        delete this.state.pendingVerifications[id];
      }
    }
    this.notifyUpdate();
  }

  public startGame(): void {
    for (const playerId of Object.keys(this.players)) {
      this.state.playerGrids[playerId] = this.generateGridForPlayer(
        playerId,
        this.state.gridSize
      );
    }
    this.state.phase = "PLAYING";
    this.state.bingoWinners = [];
    this.notifyUpdate();
  }

  public generateGridForPlayer(playerId: string, size: 4 | 5): BingoTileData[] {
    const pool = [...this.traits];

    // Deterministic shuffle using seed from playerId + traits
    let seed = 0;
    for (let i = 0; i < playerId.length; i++) {
      seed = (seed * 31 + playerId.charCodeAt(i)) >>> 0;
    }

    const pseudoRandom = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    // Fisher-Yates
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(pseudoRandom() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const tiles: BingoTileData[] = [];
    let traitIdx = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const index = r * size + c;
        const isCenter5x5 = size === 5 && r === 2 && c === 2;

        if (isCenter5x5) {
          tiles.push({
            index,
            row: r,
            col: c,
            trait: "⭐ WOLNE POLE ⭐",
            isFree: true,
            isClaimed: true,
          });
        } else {
          const trait = pool[traitIdx % pool.length];
          traitIdx++;
          tiles.push({
            index,
            row: r,
            col: c,
            trait,
            isFree: false,
            isClaimed: false,
          });
        }
      }
    }

    return tiles;
  }

  public claimTile(
    requesterId: string,
    tileIndex: number,
    targetPlayerId: string
  ): boolean {
    if (this.state.phase !== "PLAYING") return false;
    const grid = this.state.playerGrids[requesterId];
    if (!grid || !grid[tileIndex]) return false;

    const tile = grid[tileIndex];
    if (tile.isClaimed || tile.isFree) return false;
    if (requesterId === targetPlayerId) return false; // Must ask a peer
    if (!this.players[targetPlayerId]) return false;

    const verificationId = `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = Date.now() + 45000; // 45 seconds timeout

    const pendingReq: BingoPendingVerification = {
      id: verificationId,
      requesterId,
      requesterName: this.players[requesterId]?.name || "Partner",
      targetId: targetPlayerId,
      tileIndex,
      trait: tile.trait,
      expiresAt,
    };

    this.state.pendingVerifications[verificationId] = pendingReq;

    // Set 45s expiration timeout
    const timeout = setTimeout(() => {
      this.expireVerification(verificationId);
    }, 45000);
    this.verificationTimeouts.set(verificationId, timeout);

    if (this.callbacks.onVerifyRequest) {
      this.callbacks.onVerifyRequest(pendingReq);
    }

    this.notifyUpdate();
    return true;
  }

  public respondVerification(
    verificationId: string,
    approved: boolean,
    targetId?: string
  ): boolean {
    const req = this.state.pendingVerifications[verificationId];
    if (!req) return false;

    if (targetId && req.targetId !== targetId) return false;

    this.clearVerificationTimeout(verificationId);
    delete this.state.pendingVerifications[verificationId];

    if (approved) {
      const grid = this.state.playerGrids[req.requesterId];
      if (grid && grid[req.tileIndex]) {
        const tile = grid[req.tileIndex];
        tile.isClaimed = true;
        tile.verifiedByPeerId = req.targetId;
        tile.verifiedByPeerName = this.players[req.targetId]?.name || "Partner";

        // Scoring: +50 pts for verified tile
        if (this.players[req.requesterId]) {
          this.players[req.requesterId].score += 50;
        }

        const awardedScores: Record<string, number> = {
          [req.requesterId]: 50,
        };

        // Check if BINGO line completed
        const lineCheck = checkBingoLines(grid, this.state.gridSize);
        if (lineCheck.hasBingo) {
          const firstLine = lineCheck.completedLines[0];
          const record: BingoWinnerRecord = {
            playerId: req.requesterId,
            playerName: this.players[req.requesterId]?.name || "Gracz",
            lineType: firstLine.type,
            timestamp: Date.now(),
          };

          const alreadyWon = this.state.bingoWinners.some(
            (w) => w.playerId === req.requesterId
          );
          if (!alreadyWon) {
            this.state.bingoWinners.push(record);
            // Line completion bonus: +250 pts
            awardedScores[req.requesterId] += 250;
            if (this.players[req.requesterId]) {
              this.players[req.requesterId].score += 250;
            }

            if (this.callbacks.onBingoLineCompleted) {
              this.callbacks.onBingoLineCompleted(record);
            }
          }
        }

        if (this.callbacks.onScoresAwarded) {
          this.callbacks.onScoresAwarded(awardedScores);
        }
      }
    }

    this.notifyUpdate();
    return true;
  }

  private expireVerification(verificationId: string): void {
    this.clearVerificationTimeout(verificationId);
    delete this.state.pendingVerifications[verificationId];
    this.notifyUpdate();
  }

  private clearVerificationTimeout(id: string): void {
    const t = this.verificationTimeouts.get(id);
    if (t) {
      clearTimeout(t);
      this.verificationTimeouts.delete(id);
    }
  }

  public endGame(): void {
    this.state.phase = "GAME_OVER";
    for (const id of Array.from(this.verificationTimeouts.keys())) {
      this.clearVerificationTimeout(id);
    }

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

  public destroy(): void {
    for (const id of Array.from(this.verificationTimeouts.keys())) {
      this.clearVerificationTimeout(id);
    }
    this.verificationTimeouts.clear();
  }

  private notifyUpdate(): void {
    if (this.callbacks.onStateUpdate) {
      this.callbacks.onStateUpdate(this.state);
    }
  }
}
