import {
  CollaborativeBoardRoomState,
  StickyNote,
  CluePin,
  BoardDrawingStroke,
} from "../types";
import crypto from "crypto";

export interface CollaborativeBoardCallbacks {
  onStateUpdate?: (state: CollaborativeBoardRoomState) => void;
}

export class CollaborativeBoardSession {
  public roomCode: string;
  public state: CollaborativeBoardRoomState;
  private callbacks: CollaborativeBoardCallbacks;
  private maxZIndex = 1;

  constructor(roomCode: string, callbacks: CollaborativeBoardCallbacks = {}) {
    this.roomCode = roomCode;
    this.callbacks = callbacks;
    this.state = {
      roomCode,
      notes: [],
      pins: [],
      strokes: [],
      activeTool: "select",
    };
  }

  public addNote(payload: {
    text: string;
    color?: string;
    x?: number;
    y?: number;
    authorId: string;
    authorName: string;
  }): StickyNote {
    this.maxZIndex++;
    const newNote: StickyNote = {
      id: `note_${crypto.randomBytes(6).toString("hex")}`,
      x: payload.x ?? 100 + (this.state.notes.length * 30) % 500,
      y: payload.y ?? 100 + (this.state.notes.length * 30) % 300,
      width: 200,
      height: 180,
      text: payload.text || "",
      color: payload.color || "#FEF08A",
      authorId: payload.authorId,
      authorName: payload.authorName,
      zIndex: this.maxZIndex,
    };

    this.state.notes.push(newNote);
    this.callbacks.onStateUpdate?.(this.state);
    return newNote;
  }

  public updateNote(payload: {
    id: string;
    text?: string;
    color?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }): StickyNote | null {
    const note = this.state.notes.find((n) => n.id === payload.id);
    if (!note) return null;

    if (payload.text !== undefined) note.text = payload.text;
    if (payload.color !== undefined) note.color = payload.color;
    if (payload.x !== undefined) note.x = payload.x;
    if (payload.y !== undefined) note.y = payload.y;
    if (payload.width !== undefined) note.width = payload.width;
    if (payload.height !== undefined) note.height = payload.height;

    this.maxZIndex++;
    note.zIndex = this.maxZIndex;

    this.callbacks.onStateUpdate?.(this.state);
    return note;
  }

  public deleteNote(id: string): boolean {
    const prevLen = this.state.notes.length;
    this.state.notes = this.state.notes.filter((n) => n.id !== id);
    if (this.state.notes.length !== prevLen) {
      this.callbacks.onStateUpdate?.(this.state);
      return true;
    }
    return false;
  }

  public addPin(payload: {
    title: string;
    tag: "poszlaka" | "alibi" | "fakt" | "hipoteza" | "podejrzany";
    x?: number;
    y?: number;
    authorName: string;
  }): CluePin {
    const newPin: CluePin = {
      id: `pin_${crypto.randomBytes(6).toString("hex")}`,
      x: payload.x ?? 120 + (this.state.pins.length * 40) % 600,
      y: payload.y ?? 120 + (this.state.pins.length * 40) % 400,
      title: payload.title,
      tag: payload.tag,
      authorName: payload.authorName,
    };

    this.state.pins.push(newPin);
    this.callbacks.onStateUpdate?.(this.state);
    return newPin;
  }

  public deletePin(id: string): boolean {
    const prevLen = this.state.pins.length;
    this.state.pins = this.state.pins.filter((p) => p.id !== id);
    if (this.state.pins.length !== prevLen) {
      this.callbacks.onStateUpdate?.(this.state);
      return true;
    }
    return false;
  }

  public addStroke(stroke: BoardDrawingStroke) {
    this.state.strokes.push(stroke);
    this.callbacks.onStateUpdate?.(this.state);
  }

  public clear() {
    this.state.strokes = [];
    this.state.notes = [];
    this.state.pins = [];
    this.callbacks.onStateUpdate?.(this.state);
  }
}
