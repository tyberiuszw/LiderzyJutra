/**
 * Shared Type Definitions for Real-Time Multiplayer Games ("Rysowanie" & Activity Hub)
 * Used across Socket.io server, room state machines, canvas engine, and client hooks.
 */

export type GameType =
  | "RYSOWANIE"
  | "TWO_TRUTHS"
  | "THIS_OR_THAT"
  | "STORY_CHAIN"
  | "HOT_SEAT"
  | "QUIZ_SUPERLATIVES"
  | "HUMAN_BINGO"
  | "COLLABORATIVE_BOARD"
  | "SURVIVAL_CHALLENGE"
  | "INFORMATION_DEDUCTION";

export type GamePhase =
  | "LOBBY"
  | "WORD_SELECTION"
  | "DRAWING"
  | "TURN_INTERMISSION"
  | "GAME_OVER";

export interface ChameleonColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isGuest: boolean;
  score: number;
  isConnected: boolean;
  chameleonColors: ChameleonColors;
  hasSolved?: boolean;
  rank?: number;
  breakoutGroupId?: string;
}

export interface BreakoutGroup {
  id: string;              // "group-1", "group-2", ...
  name: string;            // "Grupa 1", "Alpha", ...
  memberIds: string[];     // Player IDs
  leaderId?: string;       // Assigned leader / negotiator
}

export interface RoomSettings {
  drawTime: number;          // Default 80s
  rounds: number;            // Default 3 rounds
  wordChoiceTime: number;    // Default 15s
  maxHints: number;          // Default 3 hints
  customWords?: string[];
  language: "pl" | "en" | "uk";
  meetingUrl?: string;
  breakoutGroups?: Record<string, BreakoutGroup>;
}

// -------------------------------------------------------------
// Canvas Actions & Geometry (Contract 2: 1200x900 canonical space)
// -------------------------------------------------------------

export interface CanonicalPoint {
  x: number;
  y: number;
}

export interface StrokeBatch {
  points: CanonicalPoint[];
  color: string;
  size: number;
}

export interface FillAction {
  x: number;
  y: number;
  color: string;
}

export type CanvasAction =
  | { type: "stroke"; points: CanonicalPoint[]; color: string; size: number }
  | { type: "fill"; x: number; y: number; color: string }
  | { type: "clear" };

// -------------------------------------------------------------
// Chat & Messaging Types
// -------------------------------------------------------------

export type ChatMessageType = "public" | "solver" | "system" | "close" | "correct";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: ChatMessageType;
}

// -------------------------------------------------------------
// Cumulative Session Leaderboard Data
// -------------------------------------------------------------

export interface SessionScoreData {
  total: number;
  byGame: Record<GameType, number>;
}

// -------------------------------------------------------------
// Rysowanie Game & Room State
// -------------------------------------------------------------

export interface RysowanieTurnScores {
  drawerScore: number;
  guesserScores: Record<string, number>;
}

export interface RysowanieRoomState {
  roomCode: string;
  hostId: string;
  phase: GamePhase;
  round: number;
  totalRounds: number;
  turnNumber: number;
  currentDrawerId: string | null;
  currentWord: string | null;       // Masked for guessers during DRAWING
  wordLength: number;
  hintPattern: string;              // e.g. "_ _ a _ _"
  revealedIndices: number[];
  drawTimeTotal: number;
  drawTimeRemaining: number;
  isTimerAccelerated: boolean;
  wordsToChoose: string[];          // Only visible to active drawer
  wordChoiceTimeRemaining: number;
  players: Record<string, Player>;
  turnOrder: string[];
  solvedPlayerIds: string[];
  canvasHistory: CanvasAction[];
  settings: RoomSettings;
  winnerPodium?: { player: Player; rank: number; score: number }[];
}

// -------------------------------------------------------------
// Activity 1: Two Truths and a Lie State
// -------------------------------------------------------------

export type TwoTruthsPhase =
  | "LOBBY"
  | "SUBMISSION"
  | "VOTING"
  | "REVEAL"
  | "ROUND_RECAP"
  | "GAME_OVER";

export interface TwoTruthsRoomState {
  roomCode: string;
  hostId: string;
  phase: TwoTruthsPhase;
  activePlayerId: string | null;
  turnNumber: number;
  totalTurns: number;
  turnOrder: string[];
  statements: [string, string, string] | null;
  lieIndex: number | null; // Masked from voters during VOTING
  votingTimeTotal: number;
  votingTimeRemaining: number;
  votes: Record<string, number>; // voterId -> statementIndex (0, 1, 2)
  fooledCount: number;
  bluffScore: number;
  correctVoters: string[];
  currentTheme?: string;
  winnerPodium?: { player: Player; rank: number; score: number }[];
}

// -------------------------------------------------------------
// Activity 2: This or That Dilemmas State
// -------------------------------------------------------------

export type ThisOrThatPhase = "LOBBY" | "VOTING" | "RESULTS" | "GAME_OVER";

export interface DilemmaItem {
  id: string;
  category: string;
  optionA: string;
  optionB: string;
}

export interface ThisOrThatStats {
  countA: number;
  countB: number;
  percentA: number;
  percentB: number;
}

export interface ThisOrThatOutlier {
  playerId: string;
  playerName: string;
  choice: "A" | "B";
  badge: string;
}

export interface ThisOrThatRoomState {
  roomCode: string;
  hostId: string;
  phase: ThisOrThatPhase;
  dilemmaIndex: number;
  totalDilemmas: number;
  currentDilemma: DilemmaItem | null;
  votingTimeTotal: number;
  votingTimeRemaining: number;
  votes: Record<string, "A" | "B">; // voterId -> "A" | "B"
  stats?: ThisOrThatStats;
  outliers?: ThisOrThatOutlier[];
  scores: Record<string, number>;
  winnerPodium?: { player: Player; rank: number; score: number }[];
}

// -------------------------------------------------------------
// Activity 3: Collaborative Story Chain State
// -------------------------------------------------------------

export type StoryChainPhase =
  | "LOBBY"
  | "TURN_ACTIVE"
  | "WILDCARD_ALERT"
  | "FINALE_REVEAL"
  | "GAME_OVER";

export interface StorySegment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  isWildcard?: boolean;
  timestamp: number;
}

export interface StoryChainRoomState {
  roomCode: string;
  hostId: string;
  phase: StoryChainPhase;
  mode: "SENTENCE" | "WORD";
  starter: string;
  currentTurnPlayerId: string | null;
  turnOrder: string[];
  turnIndex: number;
  turnTimeTotal: number;
  turnTimeRemaining: number;
  segments: StorySegment[];
  activeWildcard: string | null;
  wildcardAlertRemaining?: number;
  fullStory: string;
}

// -------------------------------------------------------------
// Activity 4: Hot Seat Q&A State
// -------------------------------------------------------------

export type HotSeatPhase =
  | "LOBBY"
  | "SELECTION"
  | "QUESTION_PICK"
  | "ANSWERING"
  | "GAME_OVER";

export interface HotSeatQuestion {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  tier?: 1 | 2 | 3;
  upvotes: string[]; // userIds who upvoted
  score: number;
  timestamp: number;
}

export interface HotSeatRoomState {
  roomCode: string;
  hostId: string;
  phase: HotSeatPhase;
  activeSpeakerId: string | null;
  speakerHistory: string[];
  currentTier: 1 | 2 | 3;
  currentQuestion: string | null;
  questionQueue: HotSeatQuestion[];
  answeringTimeTotal: number;
  answeringTimeRemaining: number;
  questionsAnswered: number;
  passLifelineAvailable: boolean;
  suggestedQuestions: string[];
}

// -------------------------------------------------------------
// Activity 5: Quiz Superlatives State
// -------------------------------------------------------------

export type QuizSuperlativesPhase =
  | "LOBBY"
  | "VOTING"
  | "PODIUM_COUNTDOWN"
  | "HALL_OF_FAME"
  | "GAME_OVER";

export interface SuperlativeWinner {
  playerId: string;
  playerName: string;
  votes: number;
  rank: number;
}

export interface SuperlativeHallOfFameItem {
  prompt: string;
  winnerId: string;
  winnerName: string;
  votes: number;
}

export interface QuizSuperlativesRoomState {
  roomCode: string;
  hostId: string;
  phase: QuizSuperlativesPhase;
  promptIndex: number;
  totalPrompts: number;
  currentPrompt: string | null;
  votingTimeTotal: number;
  votingTimeRemaining: number;
  votes: Record<string, string>; // voterId -> targetPlayerId
  tally?: Record<string, number>;
  podiumStep?: 3 | 2 | 1 | 0;
  podiumWinners?: SuperlativeWinner[];
  hallOfFame: SuperlativeHallOfFameItem[];
}

// -------------------------------------------------------------
// Activity 6: Human / Networking Bingo State
// -------------------------------------------------------------

export type HumanBingoPhase =
  | "LOBBY"
  | "PLAYING"
  | "BINGO_CELEBRATION"
  | "GAME_OVER";

export interface BingoTileData {
  index: number;
  row: number;
  col: number;
  trait: string;
  isFree?: boolean;
  isClaimed: boolean;
  verifiedByPeerId?: string;
  verifiedByPeerName?: string;
}

export interface BingoPendingVerification {
  id: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  tileIndex: number;
  trait: string;
  expiresAt: number;
}

export interface IncomingBingoRequest {
  verificationId: string;
  requesterId: string;
  requesterName: string;
  trait: string;
  tileIndex: number;
}

export interface BingoWinnerRecord {
  playerId: string;
  playerName: string;
  lineType: "row" | "col" | "main_diag" | "anti_diag";
  timestamp: number;
}

export interface HumanBingoRoomState {
  roomCode: string;
  hostId: string;
  phase: HumanBingoPhase;
  gridSize: 4 | 5;
  playerGrids: Record<string, BingoTileData[]>;
  pendingVerifications: Record<string, BingoPendingVerification>;
  bingoWinners: BingoWinnerRecord[];
}

// -------------------------------------------------------------
// Activity 7: Collaborative Jamboard State
// -------------------------------------------------------------

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  authorId: string;
  authorName: string;
  zIndex: number;
}

export interface CluePin {
  id: string;
  x: number;
  y: number;
  title: string;
  tag: "poszlaka" | "alibi" | "fakt" | "hipoteza" | "podejrzany";
  authorName: string;
}

export interface BoardDrawingStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

export interface CollaborativeBoardRoomState {
  roomCode: string;
  notes: StickyNote[];
  pins: CluePin[];
  strokes: BoardDrawingStroke[];
  activeTool: "select" | "note" | "pen" | "eraser";
}

// -------------------------------------------------------------
// Activity 8: Survival Challenge State
// -------------------------------------------------------------

export type SurvivalScenario = "LOST_AT_SEA" | "NASA_MOON";
export type SurvivalPhase = "LOBBY" | "INDIVIDUAL_RANKING" | "TEAM_RANKING" | "EXPERT_REVEAL" | "DEBRIEFING";

export interface SurvivalItem {
  id: number;
  title: string;
  description: string;
  expertRank: number;
  expertRationale: string;
}

export interface SurvivalScoreSummary {
  individualScore: number;
  teamScore: number;
  synergyGain: number; // individualAvg - teamScore
  bracket: {
    range: string;
    label: string;
    description: string;
  };
}

export interface SurvivalChallengeRoomState {
  roomCode: string;
  scenario: SurvivalScenario;
  phase: SurvivalPhase;
  items: SurvivalItem[];
  individualRankings: Record<string, number[]>; // playerId -> array of item ids in ranked order (1st to 15th)
  individualSubmitted: Record<string, boolean>; // playerId -> submitted
  teamRankings: Record<string, number[]>;       // groupId or "all" -> array of item ids
  teamSubmitted: Record<string, boolean>;
  scores: Record<string, SurvivalScoreSummary>; // playerId or groupId -> score summary
  timerTotal: number;
  timerRemaining: number;
  selectedDebriefQuestion?: string;
}

// -------------------------------------------------------------
// Activity 9: Information Sharing & Deduction Suite State
// -------------------------------------------------------------

export type DeductionGameId = "ZIN_OBELISK" | "DRACULA" | "MURDER_TECHSTREAM" | "MOVIE_MYSTERY";
export type DeductionPhase = "LOBBY" | "INVESTIGATION" | "ACCUSATION" | "SOLUTION_REVEAL" | "DEBRIEFING";

export interface ClueCard {
  id: string;
  text: string;
  assignedPlayerId?: string;
  isUniversal?: boolean;
}

export interface CharacterRole {
  id: string;
  name: string;
  occupation: string;
  bio: string;
  secretObjective: string;
  actionClue: string;
  assignedPlayerId?: string;
}

export interface InformationDeductionRoomState {
  roomCode: string;
  gameId: DeductionGameId;
  phase: DeductionPhase;
  title: string;
  briefing: string;
  ruleWarning: string;
  clueCards: Record<string, ClueCard[]>; // playerId -> their secret cards
  allCluesRevealed?: boolean;
  roles?: Record<string, CharacterRole>; // playerId -> role (for Movie Mystery)
  teamFactSheets?: Record<string, { title: string; facts: string[] }>; // for Dracula
  negotiators?: string[];
  submittedSolution?: string;
  isSolutionCorrect?: boolean;
  officialSolution: string;
  rationaleSteps: string[];
  debriefingQuestions: string[];
  notes: string;
}

// -------------------------------------------------------------
// Unified Multi-Activity Room State
// -------------------------------------------------------------

export interface UnifiedRoomState {
  roomCode: string;
  hostId: string;
  currentGameType: GameType;
  phase: "LOBBY" | "IN_GAME" | "GAME_OVER";
  players: Record<string, Player>;
  sessionScores: Record<string, SessionScoreData>;
  settings: RoomSettings;

  meetingUrl?: string;
  breakoutGroups?: Record<string, BreakoutGroup>;

  // Sub-states populated according to currentGameType
  rysowanieState?: RysowanieRoomState;
  twoTruthsState?: TwoTruthsRoomState;
  thisOrThatState?: ThisOrThatRoomState;
  storyChainState?: StoryChainRoomState;
  hotSeatState?: HotSeatRoomState;
  quizSuperlativesState?: QuizSuperlativesRoomState;
  humanBingoState?: HumanBingoRoomState;
  collaborativeBoardState?: CollaborativeBoardRoomState;
  survivalChallengeState?: SurvivalChallengeRoomState;
  informationDeductionState?: InformationDeductionRoomState;
}

// -------------------------------------------------------------
// Socket Event Payloads (Client <-> Server)
// -------------------------------------------------------------

export interface ClientToServerEvents {
  "room:join": (payload: {
    roomCode: string;
    guestName?: string;
    chameleonColors?: ChameleonColors;
  }) => void;
  "room:leave": () => void;
  "game:start": () => void;
  "game:select_word": (payload: { word: string }) => void;
  "draw:stroke_batch": (batch: StrokeBatch) => void;
  "draw:fill": (action: FillAction) => void;
  "draw:clear": () => void;
  "draw:undo": () => void;
  "chat:send": (payload: { text: string }) => void;
  "settings:update": (settings: Partial<RoomSettings>) => void;
  "game:restart": () => void;

  // Unified Room & Activity Hub Switcher
  "game:switch": (payload: { gameType: GameType }) => void;

  // Meeting Link & Breakout Groups
  "room:set_meeting_url": (payload: { meetingUrl: string }) => void;
  "room:create_breakout_groups": (payload: { count: number; shuffle?: boolean }) => void;
  "room:assign_breakout_group": (payload: { playerId: string; groupId: string }) => void;

  // Collaborative Board (Jamboard)
  "board:add_note": (payload: { text: string; color: string; x: number; y: number }) => void;
  "board:update_note": (payload: { id: string; text?: string; color?: string; x?: number; y?: number }) => void;
  "board:delete_note": (payload: { id: string }) => void;
  "board:add_pin": (payload: { title: string; tag: "poszlaka" | "alibi" | "fakt" | "hipoteza" | "podejrzany"; x: number; y: number }) => void;
  "board:delete_pin": (payload: { id: string }) => void;
  "board:draw_stroke": (payload: BoardDrawingStroke) => void;
  "board:clear": () => void;

  // Survival Challenge
  "survival:submit_individual": (payload: { ranking: number[] }) => void;
  "survival:submit_team": (payload: { ranking: number[] }) => void;
  "survival:next_phase": () => void;
  "survival:select_scenario": (payload: { scenario: SurvivalScenario }) => void;

  // Information Deduction
  "deduction:select_game": (payload: { gameId: DeductionGameId }) => void;
  "deduction:deal_cards": () => void;
  "deduction:update_notes": (payload: { notes: string }) => void;
  "deduction:submit_solution": (payload: { solution: string }) => void;
  "deduction:next_phase": () => void;
  "deduction:designate_negotiator": (payload: { playerId: string }) => void;

  // Two Truths & A Lie
  "two_truths:submit": (payload: { statements: [string, string, string]; lieIndex: number }) => void;
  "two_truths:vote": (payload: { statementIndex: number }) => void;
  "two_truths:reveal": () => void;
  "two_truths:next": () => void;

  // This or That
  "this_or_that:vote": (payload: { choice: "A" | "B" }) => void;
  "this_or_that:next": () => void;

  // Collaborative Story Chain
  "story_chain:submit": (payload: { text: string }) => void;
  "story_chain:pass": () => void;
  "story_chain:set_mode": (payload: { mode: "SENTENCE" | "WORD" }) => void;

  // Hot Seat Q&A
  "hot_seat:select_speaker": (payload: { speakerId: string }) => void;
  "hot_seat:pick_question": (payload: { question: string; tier?: 1 | 2 | 3 }) => void;
  "hot_seat:submit_question": (payload: { text: string }) => void;
  "hot_seat:upvote_question": (payload: { questionId: string }) => void;
  "hot_seat:pass": () => void;
  "hot_seat:complete_answer": () => void;

  // Quiz Superlatives
  "quiz_superlatives:vote": (payload: { targetPlayerId: string }) => void;
  "quiz_superlatives:next": () => void;

  // Human Bingo
  "bingo:claim_tile": (payload: { tileIndex: number; targetPlayerId: string }) => void;
  "bingo:verify_response": (payload: { verificationId: string; approved: boolean }) => void;
  "bingo:set_grid_size": (payload: { size: 4 | 5 }) => void;
}

export interface ServerToClientEvents {
  "room:state_sync": (state: RysowanieRoomState) => void;
  "room:unified_state_sync": (state: UnifiedRoomState) => void;
  "room:meeting_url_update": (payload: { meetingUrl: string }) => void;
  "room:breakout_groups_sync": (payload: { breakoutGroups: Record<string, BreakoutGroup> }) => void;
  "canvas:replay": (payload: { actions: CanvasAction[] }) => void;
  "draw:stroke_batch": (batch: StrokeBatch) => void;
  "draw:fill": (action: FillAction) => void;
  "draw:clear": () => void;
  "draw:undo": () => void;
  "game:word_options": (payload: { words: string[] }) => void;
  "game:hint_update": (payload: { hintPattern: string; revealedIndices: number[] }) => void;
  "game:timer_tick": (payload: { remaining: number; phase: GamePhase | string }) => void;
  "game:timer_accelerated": (payload: { remainingSeconds: number }) => void;
  "chat:message": (message: ChatMessage) => void;
  "guess:correct": (payload: { playerId: string; points: number; totalScore: number }) => void;
  "guess:close": (payload: { playerId: string; playerName: string }) => void;
  "turn:start": (payload: { drawerId: string; round: number; totalRounds: number }) => void;
  "turn:end": (payload: { secretWord: string; turnScores: RysowanieTurnScores }) => void;
  "game:over": (payload: { podium: { player: Player; rank: number; score: number }[] }) => void;
  "error:notice": (payload: { message: string }) => void;
  "rate_limit:warning": (payload: { message: string }) => void;

  // Unified Room & Activity Hub Events
  "game:switched": (payload: { gameType: GameType }) => void;
  "session:scores_update": (payload: { sessionScores: Record<string, SessionScoreData> }) => void;

  // Collaborative Board Events
  "board:state_sync": (state: CollaborativeBoardRoomState) => void;

  // Survival Challenge Events
  "survival:state_sync": (state: SurvivalChallengeRoomState) => void;

  // Information Deduction Events
  "deduction:state_sync": (state: InformationDeductionRoomState) => void;

  // Two Truths
  "two_truths:card_revealed": (payload: { lieIndex: number; bluffScore: number; fooledCount: number }) => void;

  // This or That
  "this_or_that:result": (payload: { stats: ThisOrThatStats; outliers: ThisOrThatOutlier[] }) => void;

  // Story Chain
  "story_chain:wildcard": (payload: { wildcard: string }) => void;
  "story_chain:segment_added": (payload: { segment: StorySegment }) => void;

  // Hot Seat
  "hot_seat:speaker_spotlight": (payload: { speakerId: string }) => void;
  "hot_seat:question_queue_update": (payload: { queue: HotSeatQuestion[] }) => void;

  // Quiz Superlatives
  "quiz_superlatives:podium_step": (payload: { step: number; winners: SuperlativeWinner[] }) => void;

  // Human Bingo
  "bingo:verify_request": (payload: IncomingBingoRequest) => void;
  "bingo:tile_verified": (payload: {
    playerId: string;
    tileIndex: number;
    targetPlayerId: string;
    targetPlayerName: string;
  }) => void;
  "bingo:line_completed": (payload: BingoWinnerRecord) => void;
}

export interface SocketData {
  userId: string;
  userName: string;
  isGuest: boolean;
  roomId?: string;
  chameleonColors: ChameleonColors;
}
