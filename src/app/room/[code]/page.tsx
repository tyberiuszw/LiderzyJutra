"use client";

import React, { useState, useEffect, use } from "react";
import {
  Copy,
  Check,
  Play,
  Settings,
  Users,
  LogIn,
  Trophy,
  Layers,
  Video,
  ExternalLink,
  GitFork,
  Edit3,
  Sparkles,
} from "lucide-react";
import { useSocket } from "@/lib/socket/useSocket";
import { RysowanieGame } from "@/components/games/rysowanie/RysowanieGame";
import { TwoTruthsGame } from "@/components/games/TwoTruthsGame";
import { ThisOrThatGame } from "@/components/games/ThisOrThatGame";
import { StoryChainGame } from "@/components/games/StoryChainGame";
import { HotSeatGame } from "@/components/games/HotSeatGame";
import { QuizSuperlativesGame } from "@/components/games/QuizSuperlativesGame";
import { HumanBingoGame } from "@/components/games/HumanBingoGame";
import { CollaborativeJamboard } from "@/components/games/collaborative-board/CollaborativeJamboard";
import { SurvivalChallengeGame } from "@/components/games/survival/SurvivalChallengeGame";
import { InformationDeductionGame } from "@/components/games/deduction/InformationDeductionGame";
import { ActivityCarousel, ACTIVITIES } from "@/components/games/ActivityCarousel";
import { SessionScoreboardModal } from "@/components/games/SessionScoreboardModal";
import { ChameleonMascot } from "@/components/mascot/ChameleonMascot";
import { ChameleonColors, GameType } from "@/server/types";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function RoomPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();

  const [guestName, setGuestName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMeeting, setCopiedMeeting] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingInput, setMeetingInput] = useState("");
  const [showBreakoutModal, setShowBreakoutModal] = useState(false);
  const [breakoutCount, setBreakoutCount] = useState(2);

  const [selectedColor, setSelectedColor] = useState<ChameleonColors>({
    primary: "#06B6D4",
    secondary: "#4F46E5",
    accent: "#F59E0B",
  });

  // Check if logged in
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser({
            id: data.user.id,
            name: data.user.profile?.displayName || data.user.email,
          });
          if (data.user.profile) {
            setSelectedColor({
              primary: data.user.profile.chameleonColor || "#06B6D4",
              secondary: data.user.profile.chameleonSecondary || "#4F46E5",
              accent: data.user.profile.chameleonAccent || "#F59E0B",
            });
          }
          setHasJoined(true);
        }
      })
      .catch(() => {});
  }, []);

  const {
    isConnected,
    socketId,
    roomState,
    unifiedState,
    sessionScores,
    canvasActions,
    messages,
    wordOptions,
    podium,
    incomingBingoRequest,
    recentBingoCelebration,
    sendStrokeBatch,
    sendFill,
    sendClear,
    sendUndo,
    sendChat,
    selectWord,
    startGame,
    updateSettings,
    switchGame,
    setMeetingUrl,
    createBreakoutGroups,
    assignBreakoutGroup,
    addBoardNote,
    updateBoardNote,
    deleteBoardNote,
    addBoardPin,
    deleteBoardPin,
    drawBoardStroke,
    clearBoard,
    selectSurvivalScenario,
    submitSurvivalIndividual,
    submitSurvivalTeam,
    nextSurvivalPhase,
    selectDeductionGame,
    dealDeductionCards,
    updateDeductionNotes,
    submitDeductionSolution,
    designateDeductionNegotiator,
    nextDeductionPhase,
    submitTwoTruths,
    voteTwoTruths,
    revealTwoTruths,
    nextTwoTruths,
    voteThisOrThat,
    nextThisOrThat,
    submitStorySegment,
    passStoryTurn,
    setStoryMode,
    selectHotSeatSpeaker,
    pickHotSeatQuestion,
    submitHotSeatQuestion,
    upvoteHotSeatQuestion,
    passHotSeatLifeline,
    completeHotSeatAnswer,
    voteSuperlative,
    nextSuperlative,
    claimBingoTile,
    respondBingoVerification,
    setBingoGridSize,
  } = useSocket({
    roomCode: hasJoined ? roomCode : "",
    guestName: currentUser?.name || guestName,
    chameleonColors: selectedColor,
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setHasJoined(true);
  };

  const playerName = currentUser?.name || guestName;
  const socketGuestId = socketId ? `guest_${socketId.substring(0, 8)}` : "";
  const allPlayers = unifiedState?.players || roomState?.players || {};
  const playersList = Object.values(allPlayers);

  const activeUserId =
    (socketGuestId && allPlayers[socketGuestId] ? socketGuestId : "") ||
    (currentUser?.id && allPlayers[currentUser.id] ? currentUser.id : "") ||
    Object.keys(allPlayers).find((id) => allPlayers[id].name === playerName) ||
    currentUser?.id ||
    socketGuestId ||
    "";

  const isHost = Boolean(
    (activeUserId && (unifiedState?.hostId === activeUserId || roomState?.hostId === activeUserId)) ||
      (activeUserId && allPlayers[activeUserId]?.isHost) ||
      playersList.find((p) => p.name === playerName)?.isHost
  );

  const currentGameType: GameType = unifiedState?.currentGameType || "RYSOWANIE";
  const currentActivityInfo = ACTIVITIES.find((a) => a.id === currentGameType);

  // If user hasn't joined as guest or logged in yet, prompt for nickname
  if (!hasJoined && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
              <ChameleonMascot state="drawing" size={60} colors={selectedColor} />
            </div>
          </div>

          <div>
            <span className="px-3 py-1 bg-cyan-950 border border-cyan-800 text-cyan-400 rounded-full text-xs font-bold uppercase tracking-wider">
              Pokój: {roomCode}
            </span>
            <h1 className="text-2xl font-black text-white mt-3">Dołącz do gry</h1>
            <p className="text-xs text-slate-400 mt-1">
              Wpisz swoje imię, aby dołączyć do zabawy w zespole
            </p>
          </div>

          <form onSubmit={handleJoinGuest} className="space-y-4">
            <div>
              <input
                type="text"
                required
                maxLength={24}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Twoje imię lub pseudonim..."
                className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={!guestName.trim()}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all active:scale-98"
            >
              Dołącz jako Gość
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 flex justify-center">
            <a
              href={`/login?redirect=/room/${roomCode}`}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline"
            >
              <LogIn className="w-3.5 h-3.5" />
              Masz konto? Zaloguj się
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Active in-game states rendering
  const isInGame =
    (unifiedState && unifiedState.phase !== "LOBBY") ||
    (roomState && roomState.phase !== "LOBBY");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Persistent Header Bar */}
      <header className="px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <ChameleonMascot state="idle" size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white leading-none">
                Liderzy Jutra
              </h1>
              {currentActivityInfo && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentActivityInfo.badgeColor}`}
                >
                  {currentActivityInfo.title}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hub Integracji & Rysowanie
            </p>
          </div>
        </div>

        {/* Action Controls & Room Code */}
        <div className="flex items-center gap-2">
          {/* Online Meeting Link Banner */}
          {unifiedState?.meetingUrl ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs shadow-sm">
              <Video className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <a
                href={unifiedState.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold hover:underline flex items-center gap-1 truncate max-w-[100px] sm:max-w-[160px]"
              >
                <span>Spotkanie</span>
                <ExternalLink className="w-3 h-3 text-emerald-400" />
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(unifiedState.meetingUrl || "");
                  setCopiedMeeting(true);
                  setTimeout(() => setCopiedMeeting(false), 2000);
                }}
                title="Kopiuj link do spotkania"
                className="p-1 text-emerald-400 hover:text-white transition"
              >
                {copiedMeeting ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
              </button>
              {isHost && (
                <button
                  type="button"
                  onClick={() => {
                    setMeetingInput(unifiedState.meetingUrl || "");
                    setShowMeetingModal(true);
                  }}
                  className="p-1 text-slate-400 hover:text-white transition"
                  title="Zmień link do spotkania"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : isHost ? (
            <button
              type="button"
              onClick={() => {
                setMeetingInput("");
                setShowMeetingModal(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white border border-slate-700 transition"
            >
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Link wideo</span>
            </button>
          ) : null}

          {/* Breakout Groups trigger */}
          <button
            type="button"
            onClick={() => setShowBreakoutModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 hover:text-white flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <GitFork className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Podgrupy</span>
            {Object.keys(unifiedState?.breakoutGroups || {}).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {Object.keys(unifiedState?.breakoutGroups || {}).length}
              </span>
            )}
          </button>

          {/* Activity Switcher trigger */}
          <button
            type="button"
            onClick={() => setShowActivityModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 hover:text-white flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">
              {isHost ? "Zmień grę" : "Lista gier"}
            </span>
          </button>

          {/* Workshop Leaderboard trigger */}
          <button
            type="button"
            onClick={() => setShowScoreboard(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Tabela Wyników</span>
          </button>

          {/* Room Code Badge */}
          <div className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg flex items-center gap-2">
            <span className="text-[10px] text-slate-400 hidden md:inline">Kod:</span>
            <span className="font-mono font-black text-cyan-400 text-xs tracking-wider">
              {roomCode}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Kopiuj link do pokoju"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MODAL: Cumulative Workshop Scoreboard */}
      {showScoreboard && (
        <SessionScoreboardModal
          players={allPlayers}
          sessionScores={sessionScores}
          onClose={() => setShowScoreboard(false)}
        />
      )}

      {/* MODAL: Activity Carousel Switcher */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <ActivityCarousel
              currentGameType={currentGameType}
              isHost={isHost}
              onSelectGame={(g) => {
                switchGame(g);
                setShowActivityModal(false);
              }}
              onClose={() => setShowActivityModal(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL: Meeting Link Setup */}
      {showMeetingModal && isHost && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-emerald-400" />
              Link do spotkania wideo (Google Meet / Zoom / Discord)
            </h3>
            <p className="text-xs text-slate-400">
              Wklej link do spotkania online. Wszyscy gracze w pokoju zobaczą przycisk szybkiego dołączenia.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setMeetingUrl(meetingInput.trim());
                setShowMeetingModal(false);
              }}
              className="space-y-4"
            >
              <input
                type="url"
                required
                value={meetingInput}
                onChange={(e) => setMeetingInput(e.target.value)}
                placeholder="https://meet.google.com/xyz-abcd-efg"
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-cyan-400 font-mono"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Zapisz link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Breakout Groups Management */}
      {showBreakoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <GitFork className="w-5 h-5 text-cyan-400" />
                  Zarządzanie Podgrupami (Breakout Groups)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Podziel uczestników na mniejsze zespoły do pracy w podgrupach (3–5 osób) lub na kanałach Discord/Meet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakoutModal(false)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
              >
                Zamknij
              </button>
            </div>

            {/* Host Controls for Shuffling & Group Creation */}
            {isHost && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Liczba podgrup:</span>
                  <select
                    value={breakoutCount}
                    onChange={(e) => setBreakoutCount(parseInt(e.target.value, 10))}
                    className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs"
                  >
                    <option value={2}>2 grupy</option>
                    <option value={3}>3 grupy</option>
                    <option value={4}>4 grupy</option>
                    <option value={5}>5 grup</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => createBreakoutGroups(breakoutCount, true)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Wymieszaj losowo (3-5 osób)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => createBreakoutGroups(breakoutCount, false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
                  >
                    Utwórz puste grupy
                  </button>
                </div>
              </div>
            )}

            {/* Existing Breakout Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(unifiedState?.breakoutGroups || {}).map((group) => (
                <div key={group.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                    <span className="font-bold text-xs text-cyan-300">{group.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {group.memberIds.length} graczy
                    </span>
                  </div>

                  <div className="space-y-1.5 min-h-16">
                    {group.memberIds.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic py-2">Brak przypisanych graczy</p>
                    ) : (
                      group.memberIds.map((mId) => {
                        const pl = allPlayers[mId];
                        if (!pl) return null;
                        return (
                          <div
                            key={mId}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <span className="text-white font-semibold truncate">{pl.name}</span>
                            {isHost && (
                              <select
                                value={group.id}
                                onChange={(e) => assignBreakoutGroup(mId, e.target.value)}
                                className="bg-slate-800 text-[10px] border border-slate-700 text-slate-300 rounded px-1.5 py-0.5"
                              >
                                {Object.values(unifiedState?.breakoutGroups || {}).map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* IN-GAME ACTIVE SCREEN */}
      {isInGame ? (
        <main className="flex-1 flex flex-col">
          {currentGameType === "RYSOWANIE" && roomState && (
            <RysowanieGame
              roomState={roomState}
              currentUserId={activeUserId}
              canvasActions={canvasActions}
              messages={messages}
              wordOptions={wordOptions}
              podium={podium}
              onStrokeBatch={sendStrokeBatch}
              onFill={sendFill}
              onClear={sendClear}
              onUndo={sendUndo}
              onSendMessage={sendChat}
              onSelectWord={selectWord}
              onRestartGame={startGame}
            />
          )}

          {currentGameType === "TWO_TRUTHS" && unifiedState?.twoTruthsState && (
            <TwoTruthsGame
              state={unifiedState.twoTruthsState}
              players={allPlayers}
              currentUserId={activeUserId}
              isHost={isHost}
              onSubmitStatements={submitTwoTruths}
              onVote={voteTwoTruths}
              onReveal={revealTwoTruths}
              onNextTurn={nextTwoTruths}
              onRestart={startGame}
            />
          )}

          {currentGameType === "THIS_OR_THAT" && unifiedState?.thisOrThatState && (
            <ThisOrThatGame
              state={unifiedState.thisOrThatState}
              players={allPlayers}
              currentUserId={activeUserId}
              isHost={isHost}
              onVote={voteThisOrThat}
              onNextDilemma={nextThisOrThat}
              onRestart={startGame}
            />
          )}

          {currentGameType === "STORY_CHAIN" && unifiedState?.storyChainState && (
            <StoryChainGame
              state={unifiedState.storyChainState}
              players={allPlayers}
              currentUserId={activeUserId}
              isHost={isHost}
              onSubmitSegment={submitStorySegment}
              onPass={passStoryTurn}
              onSetMode={setStoryMode}
              onRestart={startGame}
            />
          )}

          {currentGameType === "HOT_SEAT" && unifiedState?.hotSeatState && (
            <HotSeatGame
              state={unifiedState.hotSeatState}
              players={allPlayers}
              currentUserId={activeUserId}
              isHost={isHost}
              onSelectSpeaker={selectHotSeatSpeaker}
              onPickQuestion={pickHotSeatQuestion}
              onSubmitQuestion={submitHotSeatQuestion}
              onUpvoteQuestion={upvoteHotSeatQuestion}
              onPass={passHotSeatLifeline}
              onCompleteAnswer={completeHotSeatAnswer}
              onRestart={startGame}
            />
          )}

          {currentGameType === "QUIZ_SUPERLATIVES" && unifiedState?.quizSuperlativesState && (
            <QuizSuperlativesGame
              state={unifiedState.quizSuperlativesState}
              players={allPlayers}
              currentUserId={activeUserId}
              isHost={isHost}
              onVote={voteSuperlative}
              onNextPrompt={nextSuperlative}
              onRestart={startGame}
            />
          )}

          {currentGameType === "HUMAN_BINGO" && unifiedState?.humanBingoState && (
            <HumanBingoGame
              state={unifiedState.humanBingoState}
              players={allPlayers}
              currentUserId={activeUserId}
              isHost={isHost}
              incomingRequest={incomingBingoRequest}
              recentCelebration={recentBingoCelebration}
              onClaimTile={claimBingoTile}
              onRespondVerification={respondBingoVerification}
              onSetGridSize={setBingoGridSize}
              onRestart={startGame}
            />
          )}

          {currentGameType === "COLLABORATIVE_BOARD" && unifiedState?.collaborativeBoardState && (
            <CollaborativeJamboard
              state={unifiedState.collaborativeBoardState}
              currentUserId={activeUserId}
              currentUserName={playerName}
              isHost={isHost}
              onAddNote={addBoardNote}
              onUpdateNote={updateBoardNote}
              onDeleteNote={deleteBoardNote}
              onAddPin={addBoardPin}
              onDeletePin={deleteBoardPin}
              onDrawStroke={drawBoardStroke}
              onClearBoard={clearBoard}
            />
          )}

          {currentGameType === "SURVIVAL_CHALLENGE" && unifiedState?.survivalChallengeState && (
            <SurvivalChallengeGame
              state={unifiedState.survivalChallengeState}
              players={allPlayers}
              currentUserId={activeUserId}
              isHost={isHost}
              onSelectScenario={selectSurvivalScenario}
              onSubmitIndividual={submitSurvivalIndividual}
              onSubmitTeam={submitSurvivalTeam}
              onNextPhase={nextSurvivalPhase}
            />
          )}

          {currentGameType === "INFORMATION_DEDUCTION" && unifiedState?.informationDeductionState && (
            <InformationDeductionGame
              state={unifiedState.informationDeductionState}
              players={allPlayers}
              currentUserId={activeUserId}
              isHost={isHost}
              onSelectGame={selectDeductionGame}
              onDealCards={dealDeductionCards}
              onUpdateNotes={updateDeductionNotes}
              onSubmitSolution={submitDeductionSolution}
              onDesignateNegotiator={designateDeductionNegotiator}
              onNextPhase={nextDeductionPhase}
            />
          )}
        </main>
      ) : (
        /* LOBBY VIEW */
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Players & Game Launcher */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white">
                    Uczestnicy w pokoju ({playersList.length})
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-emerald-400" : "bg-rose-400 animate-ping"
                    }`}
                  />
                  {isConnected ? "Połączono" : "Łączenie..."}
                </div>
              </div>

              {/* Connected Players Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                {playersList.map((player) => (
                  <div
                    key={player.id}
                    className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <ChameleonMascot
                        state="idle"
                        size={32}
                        colors={player.chameleonColors}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                        <span>{player.name}</span>
                        {player.isHost && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-semibold">
                            Host
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {player.isGuest ? "Gość" : "Zalogowany"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Start Game Action */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-400 text-center sm:text-left">
                  {isHost
                    ? `Wybrana gra: ${currentActivityInfo?.title || "Rysowanie"}. Kliknij, aby rozpocząć!`
                    : "Czekamy, aż gospodarz rozpocznie rozgrywkę..."}
                </span>
                {isHost && (
                  <button
                    type="button"
                    onClick={startGame}
                    disabled={playersList.length < 1}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4" />
                    Rozpocznij {currentActivityInfo?.title || "Grę"}
                  </button>
                )}
              </div>
            </div>

            {/* Right Col: Activity Preview & Settings */}
            <div className="space-y-4">
              {/* Selected Activity Summary Card */}
              {currentActivityInfo && (
                <div
                  className={`p-5 rounded-2xl border bg-gradient-to-br shadow-xl space-y-3 ${currentActivityInfo.gradient}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentActivityInfo.badgeColor}`}
                    >
                      {currentActivityInfo.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowActivityModal(true)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
                    >
                      Zmień &rarr;
                    </button>
                  </div>

                  <h3 className="font-black text-white text-base">
                    {currentActivityInfo.title}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {currentActivityInfo.tagline}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>👥 {currentActivityInfo.players}</span>
                    <span>⏱️ {currentActivityInfo.duration}</span>
                  </div>
                </div>
              )}

              {/* Rysowanie Settings Card (if drawing is selected) */}
              {currentGameType === "RYSOWANIE" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      Ustawienia Rysowania
                    </h2>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Rundy:</label>
                      <select
                        disabled={!isHost}
                        value={roomState?.settings.rounds || 3}
                        onChange={(e) =>
                          updateSettings({ rounds: parseInt(e.target.value, 10) })
                        }
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-cyan-400 disabled:opacity-60"
                      >
                        <option value={2}>2 rundy</option>
                        <option value={3}>3 rundy (zalecane)</option>
                        <option value={5}>5 rund</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Czas na rysunek:</label>
                      <select
                        disabled={!isHost}
                        value={roomState?.settings.drawTime || 80}
                        onChange={(e) =>
                          updateSettings({ drawTime: parseInt(e.target.value, 10) })
                        }
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-cyan-400 disabled:opacity-60"
                      >
                        <option value={50}>50 sekund</option>
                        <option value={80}>80 sekund (standard)</option>
                        <option value={100}>100 sekund</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
