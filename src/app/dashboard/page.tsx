"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChameleonMascot, type MascotState } from "@/components/mascot/ChameleonMascot";
import { ChameleonColorPicker, ThemeToggle } from "@/components/theme/ThemeControls";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/I18nProvider";
import {
  Users,
  Gamepad2,
  Share2,
  LogOut,
  Plus,
  Copy,
  Check,
  Building2,
  Sparkles,
  Play,
  Clock,
  Layers,
  Crown,
  Shield,
  Palette,
} from "lucide-react";

interface UserProfile {
  id: string;
  displayName: string;
  chameleonColor: string;
  chameleonSecondary: string;
  chameleonAccent: string;
  avatarState: string;
}

interface CurrentUser {
  id: string;
  email: string;
  role: string;
  status?: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    isSystemTenant: boolean;
    status?: string;
    founderId?: string | null;
  };
  profile: UserProfile | null;
  teams: { id: string; name: string; role: string }[];
}

interface MembershipRequestData {
  id: string;
  userId: string;
  organizationId: string;
  status: string;
  message: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    status: string;
    createdAt: string;
    profile: UserProfile | null;
  };
}

interface AdminOrgData {
  id: string;
  name: string;
  slug: string;
  status: string;
  founderId: string | null;
  isPublic: boolean;
  isSystemTenant: boolean;
  createdAt: string;
  _count: {
    users: number;
    teams: number;
    gameSessions: number;
    membershipRequests: number;
  };
}

interface TeamData {
  id: string;
  name: string;
  members: {
    id: string;
    role: string;
    user: {
      id: string;
      email: string;
      role: string;
      profile: UserProfile | null;
    };
  }[];
  _count: {
    members: number;
    gameSessions: number;
  };
}

interface InvitationData {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  team: { id: string; name: string } | null;
}

interface GameRoomData {
  id: string;
  roomCode: string;
  currentGameType: string;
  status: string;
  createdAt: string;
  host: {
    id: string;
    email: string;
    profile: UserProfile | null;
  };
  team: { id: string; name: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<
    "overview" | "teams" | "members" | "rooms" | "chameleon" | "requests" | "superadmin"
  >("overview");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [teams, setTeams] = useState<TeamData[]>([]);
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [rooms, setRooms] = useState<GameRoomData[]>([]);
  const [requests, setRequests] = useState<MembershipRequestData[]>([]);
  const [adminOrgs, setAdminOrgs] = useState<AdminOrgData[]>([]);
  const [adminNewOrgName, setAdminNewOrgName] = useState("");
  const [adminCreatingOrg, setAdminCreatingOrg] = useState(false);

  // Create team state
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("TEAM_MEMBER");
  const [inviteTeamId, setInviteTeamId] = useState("");
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Room launcher state
  const [selectedGameType, setSelectedGameType] = useState("RYSOWANIE");
  const [launcherTeamId, setLauncherTeamId] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);

  // Mascot preview state
  const [previewState, setPreviewState] = useState<MascotState>("idle");

  const gameTypes = [
    { id: "RYSOWANIE", name: t("activities.rysowanie.name"), desc: t("activities.rysowanie.desc"), icon: "🎨" },
    { id: "SURVIVAL_CHALLENGE", name: "Wyzwanie Przetrwania", desc: "Lost at Sea & NASA Moon: ranking solo, zespołowy i analiza synergii", icon: "🧭" },
    { id: "INFORMATION_DEDUCTION", name: "Śledztwo & Dedykacja", desc: "Zin Obelisk, Dracula, Murder Mystery: dzielenie informacji bez pokazywania ekranu", icon: "🔍" },
    { id: "COLLABORATIVE_BOARD", name: "Tablica Jamboard", desc: "Współdzielona tablica interaktywna: karteczki, rysowanie i poszlaki", icon: "📋" },
    { id: "TWO_TRUTHS", name: t("activities.two_truths.name"), desc: t("activities.two_truths.desc"), icon: "🎭" },
    { id: "THIS_OR_THAT", name: t("activities.this_or_that.name"), desc: t("activities.this_or_that.desc"), icon: "⚖️" },
    { id: "STORY_CHAIN", name: t("activities.story_chain.name"), desc: t("activities.story_chain.desc"), icon: "📖" },
    { id: "HOT_SEAT", name: t("activities.hot_seat.name"), desc: t("activities.hot_seat.desc"), icon: "🔥" },
    { id: "QUIZ_SUPERLATIVES", name: t("activities.quiz_superlatives.name"), desc: t("activities.quiz_superlatives.desc"), icon: "🏆" },
    { id: "HUMAN_BINGO", name: t("activities.human_bingo.name"), desc: t("activities.human_bingo.desc"), icon: "🎯" },
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return t("dashboard.roleSuperadmin");
      case "ORG_ADMIN":
        return t("dashboard.roleOrgAdmin");
      case "TEAM_FACILITATOR":
      case "FACILITATOR":
        return t("dashboard.roleFacilitator");
      default:
        return t("dashboard.roleMember");
    }
  };

  const loadData = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      const currentUser = meData.user;
      setUser(currentUser);

      // Load teams, invitations, and rooms in parallel
      const [teamsRes, invitesRes, roomsRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/invitations"),
        fetch("/api/rooms"),
      ]);

      if (teamsRes.ok) {
        const td = await teamsRes.json();
        setTeams(td.teams || []);
      }
      if (invitesRes.ok) {
        const id = await invitesRes.json();
        setInvitations(id.invitations || []);
      }
      if (roomsRes.ok) {
        const rd = await roomsRes.json();
        setRooms(rd.rooms || []);
      }

      // If org admin or superadmin or founder, load membership requests
      if (
        currentUser.role === "SUPERADMIN" ||
        currentUser.role === "ORG_ADMIN" ||
        currentUser.organization?.founderId === currentUser.id
      ) {
        const reqRes = await fetch("/api/orgs/requests");
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          setRequests(reqData.requests || []);
        }
      }

      // If superadmin, load all organizations
      if (currentUser.role === "SUPERADMIN") {
        const orgsRes = await fetch("/api/admin/orgs");
        if (orgsRes.ok) {
          const orgsData = await orgsRes.json();
          setAdminOrgs(orgsData.organizations || []);
        }
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReviewRequest = async (requestId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch("/api/orgs/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Review request error:", err);
    }
  };

  const handleUpdateOrgStatus = async (organizationId: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/admin/orgs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, status }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Update org status error:", err);
    }
  };

  const handleAdminCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNewOrgName.trim()) return;
    setAdminCreatingOrg(true);
    try {
      const res = await fetch("/api/admin/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: adminNewOrgName.trim() }),
      });
      if (res.ok) {
        setAdminNewOrgName("");
        loadData();
      }
    } catch (err) {
      console.error("Admin create org error:", err);
    } finally {
      setAdminCreatingOrg(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setCreatingTeam(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName }),
      });
      if (res.ok) {
        setNewTeamName("");
        loadData();
      }
    } catch (err) {
      console.error("Create team error:", err);
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setCreatedInviteUrl(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          teamId: inviteTeamId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.inviteUrl) {
        setCreatedInviteUrl(data.inviteUrl);
        setInviteEmail("");
        loadData();
      }
    } catch (err) {
      console.error("Create invitation error:", err);
    } finally {
      setInviting(false);
    }
  };

  const handleCreateRoom = async () => {
    setCreatingRoom(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: selectedGameType,
          teamId: launcherTeamId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setCreatedRoomCode(data.room.roomCode);
        loadData();
      }
    } catch (err) {
      console.error("Create room error:", err);
    } finally {
      setCreatingRoom(false);
    }
  };

  const copyToClipboard = (text: string, isInvite = true) => {
    navigator.clipboard.writeText(text);
    if (isInvite) {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-ink-soft">
        <div className="flex flex-col items-center gap-3">
          <ChameleonMascot state="thinking" size={90} />
          <p className="text-sm">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top Navigation */}
      <header className="border-b border-line bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <ChameleonMascot size={40} state={previewState} />
              <div className="hidden sm:block">
                <p className="font-bold text-sm leading-tight group-hover:text-cham-text transition-colors">
                  {t("common.appName")}
                </p>
                <p className="text-[11px] text-ink-soft">{t("common.appSubtitle")}</p>
              </div>
            </Link>

            <div className="h-6 w-px bg-line" />

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cham/10 border border-cham/20">
              <Building2 size={14} className="text-cham-text" />
              <span className="text-xs font-semibold text-cham-text">
                {user.organization.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-ink-soft">
              <span className="font-semibold text-ink">
                {user.profile?.displayName || user.email}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-line text-ink">
                {getRoleLabel(user.role)}
              </span>
            </div>

            <LanguageSwitcher />
            <ThemeToggle />

            <button
              onClick={handleLogout}
              title={t("nav.logout")}
              className="p-2 rounded-2xl border border-line bg-card text-ink-soft hover:text-red-500 hover:border-red-500/30 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 flex flex-col gap-8">
        {/* Status Warning Banner if pending approval */}
        {(user.status === "PENDING_APPROVAL" || user.organization.status === "PENDING_APPROVAL") && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-4 text-amber-200">
            <ChameleonMascot state="thinking" size={48} />
            <div className="text-xs">
              <p className="font-bold text-amber-300 text-sm">
                {user.organization.status === "PENDING_APPROVAL"
                  ? "Organizacja oczekuje na zatwierdzenie"
                  : "Twoje konto oczekuje na zatwierdzenie"}
              </p>
              <p className="text-amber-200/80 mt-0.5">
                {user.organization.status === "PENDING_APPROVAL"
                  ? "Twoja organizacja została zarejestrowana i oczekuje na aktywację przez Super Administratora platformy."
                  : "Twój wniosek o dołączenie do organizacji oczekuje na akceptację przez założyciela lub administratora."}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-line">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-cham text-cham-contrast shadow-sm"
                : "text-ink-soft hover:bg-card hover:text-ink"
            }`}
          >
            <Layers size={14} />
            <span>{t("dashboard.tabs.overview")}</span>
          </button>

          <button
            onClick={() => setActiveTab("rooms")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "rooms"
                ? "bg-cham text-cham-contrast shadow-sm"
                : "text-ink-soft hover:bg-card hover:text-ink"
            }`}
          >
            <Gamepad2 size={14} />
            <span>{t("dashboard.tabs.rooms")} ({rooms.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("teams")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "teams"
                ? "bg-cham text-cham-contrast shadow-sm"
                : "text-ink-soft hover:bg-card hover:text-ink"
            }`}
          >
            <Users size={14} />
            <span>{t("dashboard.tabs.teams")} ({teams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "members"
                ? "bg-cham text-cham-contrast shadow-sm"
                : "text-ink-soft hover:bg-card hover:text-ink"
            }`}
          >
            <Share2 size={14} />
            <span>{t("dashboard.tabs.members")} ({invitations.length})</span>
          </button>

          {/* Founder / Org Admin Join Requests Tab */}
          {(user.role === "SUPERADMIN" ||
            user.role === "ORG_ADMIN" ||
            user.organization.founderId === user.id) && (
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "requests"
                  ? "bg-cham text-cham-contrast shadow-sm"
                  : "text-ink-soft hover:bg-card hover:text-ink"
              }`}
            >
              <Users size={14} />
              <span>Wnioski</span>
              {requests.filter((r) => r.status === "PENDING").length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {requests.filter((r) => r.status === "PENDING").length}
                </span>
              )}
            </button>
          )}

          {/* Super Admin Oversight Tab */}
          {user.role === "SUPERADMIN" && (
            <button
              onClick={() => setActiveTab("superadmin")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "superadmin"
                  ? "bg-cham text-cham-contrast shadow-sm"
                  : "text-ink-soft hover:bg-card hover:text-ink"
              }`}
            >
              <Crown size={14} />
              <span>Super Admin</span>
              {adminOrgs.filter((o) => o.status === "PENDING_APPROVAL").length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {adminOrgs.filter((o) => o.status === "PENDING_APPROVAL").length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab("chameleon")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "chameleon"
                ? "bg-cham text-cham-contrast shadow-sm"
                : "text-ink-soft hover:bg-card hover:text-ink"
            }`}
          >
            <Palette size={14} />
            <span>{t("dashboard.tabs.chameleon")}</span>
          </button>
        </nav>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Quick Hero Banner */}
            <div className="rounded-3xl border border-line bg-card p-8 shadow-[var(--shadow-md)] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cham/10 text-cham-text text-xs font-bold">
                  <Sparkles size={14} />
                  <span>Team Bonding Liderzy Jutra</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {t("dashboard.welcome", { name: user.profile?.displayName || user.email.split("@")[0] })}
                </h1>
                <p className="text-sm text-ink-soft leading-relaxed">
                  {user.organization.name}
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab("rooms")}
                    className="flex items-center gap-2 rounded-full bg-cham px-5 py-2.5 text-xs font-semibold text-cham-contrast transition hover:brightness-105 cursor-pointer"
                    style={{ boxShadow: "0 4px 14px var(--chameleon-primary-glow)" }}
                  >
                    <Play size={14} />
                    <span>{t("dashboard.launchRoomAction")}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("members")}
                    className="flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card cursor-pointer"
                  >
                    <Share2 size={14} />
                    <span>{t("dashboard.inviteMemberAction")}</span>
                  </button>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center">
                <ChameleonMascot state="celebrate" size={180} />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-line bg-card p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cham/10 text-cham-text flex items-center justify-center font-bold">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs text-ink-soft font-semibold uppercase">{t("dashboard.statTeams")}</p>
                  <p className="text-2xl font-bold">{teams.length}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-line bg-card p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cham/10 text-cham-text flex items-center justify-center font-bold">
                  <Gamepad2 size={24} />
                </div>
                <div>
                  <p className="text-xs text-ink-soft font-semibold uppercase">{t("dashboard.statRooms")}</p>
                  <p className="text-2xl font-bold">{rooms.length}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-line bg-card p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cham/10 text-cham-text flex items-center justify-center font-bold">
                  {user.role === "SUPERADMIN" ? <Crown size={24} /> : <Shield size={24} />}
                </div>
                <div>
                  <p className="text-xs text-ink-soft font-semibold uppercase">{getRoleLabel(user.role)}</p>
                  <p className="text-base font-bold truncate">{user.role}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GAME ROOMS LAUNCHER */}
        {activeTab === "rooms" && (
          <div className="space-y-8">
            {/* Launcher Card */}
            <div className="rounded-3xl border border-line bg-card p-8 shadow-[var(--shadow-md)]">
              <div className="max-w-2xl mb-6">
                <h2 className="text-xl font-bold tracking-tight">{t("dashboard.roomsTitle")}</h2>
                <p className="text-xs text-ink-soft mt-1">
                  {t("dashboard.roomsSubtitle")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {gameTypes.map((game) => {
                  const isSelected = selectedGameType === game.id;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => setSelectedGameType(game.id)}
                      className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "border-cham bg-cham/10 ring-2 ring-cham/30"
                          : "border-line bg-surface hover:border-ink-soft/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{game.icon}</span>
                        {isSelected && <span className="text-xs font-bold text-cham-text">{t("common.confirm")}</span>}
                      </div>
                      <div>
                        <p className="font-bold text-sm leading-snug">{game.name}</p>
                        <p className="text-[11px] text-ink-soft mt-1 leading-normal line-clamp-2">
                          {game.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-line">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <label className="text-xs font-semibold text-ink-soft whitespace-nowrap">
                    {t("dashboard.assignTeamLabel")}:
                  </label>
                  <select
                    value={launcherTeamId}
                    onChange={(e) => setLauncherTeamId(e.target.value)}
                    className="rounded-2xl border border-line bg-surface px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cham"
                  >
                    <option value="">{t("dashboard.noTeamSelect")}</option>
                    {teams.map((teamItem) => (
                      <option key={teamItem.id} value={teamItem.id}>
                        {teamItem.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={creatingRoom}
                  onClick={handleCreateRoom}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-cham px-6 py-3 font-semibold text-xs text-cham-contrast transition hover:brightness-105 disabled:opacity-50 cursor-pointer"
                  style={{ boxShadow: "0 4px 14px var(--chameleon-primary-glow)" }}
                >
                  <Play size={16} />
                  <span>{creatingRoom ? t("dashboard.launchingRoom") : t("dashboard.launchRoomSubmit")}</span>
                </button>
              </div>

              {createdRoomCode && (
                <div className="mt-6 p-4 rounded-2xl border border-cham/30 bg-cham/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Sparkles size={24} className="text-cham-text" />
                    <div>
                      <p className="text-xs font-semibold text-ink-soft">
                        {t("rooms.roomCode", { code: "" })}
                      </p>
                      <p className="text-2xl font-mono font-bold tracking-wider text-cham-text">
                        {createdRoomCode}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdRoomCode, false)}
                    className="flex items-center gap-2 rounded-full border border-cham/40 bg-card px-4 py-2 text-xs font-semibold text-cham-text hover:bg-surface cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>{t("rooms.copyCode")}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Existing Rooms Table */}
            <div className="rounded-3xl border border-line bg-card p-6">
              <h3 className="text-base font-bold mb-4">{t("dashboard.activeRoomsTitle")}</h3>
              {rooms.length === 0 ? (
                <p className="text-xs text-ink-soft text-center py-8">
                  {t("dashboard.noActiveRooms")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line text-ink-soft font-semibold">
                        <th className="py-3 px-4">{t("dashboard.roomCodeLabel")}</th>
                        <th className="py-3 px-4">{t("dashboard.selectActivityLabel")}</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">{t("dashboard.statTeams")}</th>
                        <th className="py-3 px-4">{t("dashboard.roomHostLabel")}</th>
                        <th className="py-3 px-4">{t("common.appName")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((r) => (
                        <tr key={r.id} className="border-b border-line/50 hover:bg-surface/50">
                          <td className="py-3 px-4 font-mono font-bold text-cham-text">
                            {r.roomCode}
                          </td>
                          <td className="py-3 px-4 font-semibold">{r.currentGameType}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cham/10 text-cham-text">
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-ink-soft">
                            {r.team?.name || t("dashboard.noTeamSelect")}
                          </td>
                          <td className="py-3 px-4">
                            {r.host.profile?.displayName || r.host.email}
                          </td>
                          <td className="py-3 px-4 text-ink-soft">
                            {new Date(r.createdAt).toLocaleString(locale === "uk" ? "uk-UA" : locale === "en" ? "en-US" : "pl-PL")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TEAMS */}
        {activeTab === "teams" && (
          <div className="space-y-8">
            <div className="rounded-3xl border border-line bg-card p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-bold">{t("dashboard.teamsTitle")}</h2>
                <p className="text-xs text-ink-soft mt-1">
                  {t("dashboard.teamsSubtitle")}
                </p>
              </div>

              {user.role !== "TEAM_MEMBER" && (
                <form onSubmit={handleCreateTeam} className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder={t("dashboard.teamNamePlaceholder")}
                    className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-cham w-full md:w-64"
                  />
                  <button
                    type="submit"
                    disabled={creatingTeam}
                    className="flex items-center gap-1.5 rounded-full bg-cham px-4 py-2.5 text-xs font-semibold text-cham-contrast hover:brightness-105 shrink-0 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>{creatingTeam ? t("dashboard.creatingTeam") : t("dashboard.newTeamButton")}</span>
                  </button>
                </form>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div key={team.id} className="rounded-3xl border border-line bg-card p-6 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-base leading-snug">{team.name}</h3>
                      <span className="text-[11px] font-semibold text-ink-soft px-2 py-0.5 rounded-full bg-surface border border-line">
                        {team._count.members} {t("dashboard.statMembers").toLowerCase()}
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft">
                      {team._count.gameSessions} {t("dashboard.statRooms").toLowerCase()}
                    </p>
                  </div>

                  <div className="border-t border-line pt-3">
                    <p className="text-[11px] font-semibold uppercase text-ink-soft mb-2">
                      {t("dashboard.statMembers")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {team.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface border border-line text-[11px]"
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: m.user.profile?.chameleonColor || "#06B6D4" }}
                          />
                          <span className="font-medium">
                            {m.user.profile?.displayName || m.user.email.split("@")[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: MEMBERS & INVITATIONS */}
        {activeTab === "members" && (
          <div className="space-y-8">
            <div className="rounded-3xl border border-line bg-card p-8 shadow-[var(--shadow-md)]">
              <div className="max-w-2xl mb-6">
                <h2 className="text-xl font-bold">{t("dashboard.membersTitle")}</h2>
                <p className="text-xs text-ink-soft mt-1">
                  {t("dashboard.membersSubtitle")}
                </p>
              </div>

              <form onSubmit={handleCreateInvitation} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    {t("dashboard.inviteEmailLabel")}
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="nowy.uczestnik@domena.pl"
                    className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-cham"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    {t("dashboard.inviteRoleLabel")}
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-surface px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-cham"
                  >
                    <option value="TEAM_MEMBER">{t("dashboard.roleMember")}</option>
                    <option value="TEAM_FACILITATOR">{t("dashboard.roleFacilitator")}</option>
                    <option value="ORG_ADMIN">{t("dashboard.roleOrgAdmin")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    {t("dashboard.inviteTeamLabel")}
                  </label>
                  <select
                    value={inviteTeamId}
                    onChange={(e) => setInviteTeamId(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-surface px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-cham"
                  >
                    <option value="">{t("dashboard.noTeamSelect")}</option>
                    {teams.map((tItem) => (
                      <option key={tItem.id} value={tItem.id}>
                        {tItem.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex items-center gap-2 rounded-full bg-cham px-6 py-2.5 text-xs font-semibold text-cham-contrast hover:brightness-105 disabled:opacity-50 cursor-pointer"
                    style={{ boxShadow: "0 4px 14px var(--chameleon-primary-glow)" }}
                  >
                    <Share2 size={14} />
                    <span>{inviting ? t("dashboard.generatingInvite") : t("dashboard.generateInviteSubmit")}</span>
                  </button>
                </div>
              </form>

              {createdInviteUrl && (
                <div className="mt-6 p-4 rounded-2xl border border-cham/30 bg-cham/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs overflow-hidden w-full">
                    <p className="font-semibold text-cham-text mb-1">
                      {t("dashboard.inviteLinkGenerated")}
                    </p>
                    <p className="font-mono text-ink-soft truncate">{createdInviteUrl}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdInviteUrl, true)}
                    className="flex items-center gap-1.5 rounded-full border border-cham/40 bg-card px-4 py-2 text-xs font-semibold text-cham-text hover:bg-surface shrink-0 cursor-pointer"
                  >
                    {copiedInvite ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedInvite ? t("common.copied") : t("dashboard.copyInviteLink")}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Invitations Table */}
            <div className="rounded-3xl border border-line bg-card p-6">
              <h3 className="text-base font-bold mb-4">{t("dashboard.membersTitle")} ({invitations.length})</h3>
              {invitations.length === 0 ? (
                <p className="text-xs text-ink-soft text-center py-8">
                  {t("common.appName")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line text-ink-soft font-semibold">
                        <th className="py-3 px-4">{t("dashboard.inviteEmailLabel")}</th>
                        <th className="py-3 px-4">{t("dashboard.inviteRoleLabel")}</th>
                        <th className="py-3 px-4">{t("dashboard.statTeams")}</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">{t("common.appName")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((inv) => (
                        <tr key={inv.id} className="border-b border-line/50 hover:bg-surface/50">
                          <td className="py-3 px-4 font-semibold">{inv.email}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-line text-ink">
                              {getRoleLabel(inv.role)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-ink-soft">
                            {inv.team?.name || user.organization.name}
                          </td>
                          <td className="py-3 px-4">
                            {inv.acceptedAt ? (
                              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                                <Check size={12} /> {t("common.confirm")}
                              </span>
                            ) : new Date(inv.expiresAt) < new Date() ? (
                              <span className="text-red-500 font-semibold">Expired</span>
                            ) : (
                              <span className="text-amber-500 font-semibold flex items-center gap-1">
                                <Clock size={12} /> Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-ink-soft">
                            {new Date(inv.expiresAt).toLocaleDateString(locale === "uk" ? "uk-UA" : locale === "en" ? "en-US" : "pl-PL")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CHAMELEON PERSONALIZATION */}
        {activeTab === "chameleon" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6 rounded-3xl border border-line bg-card p-8">
              <div>
                <h2 className="text-xl font-bold">{t("dashboard.chameleonTabTitle")}</h2>
                <p className="text-xs text-ink-soft mt-1">
                  {t("dashboard.chameleonTabSubtitle")}
                </p>
              </div>

              <ChameleonColorPicker />

              <div className="border-t border-line pt-4">
                <p className="text-xs font-semibold text-ink-soft mb-2">{t("home.mascotStatesTitle")}:</p>
                <div className="flex flex-wrap gap-2">
                  {(["idle", "drawing", "thinking", "celebrate", "urgent"] as MascotState[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPreviewState(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        previewState === st
                          ? "bg-cham text-cham-contrast shadow-sm"
                          : "border border-line bg-surface text-ink-soft hover:bg-card"
                      }`}
                    >
                      {t(`home.states.${st}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-card p-8 flex flex-col items-center justify-center text-center">
              <ChameleonMascot state={previewState} size={260} />
              <p className="text-xs text-ink-soft mt-4">
                {t("dashboard.chameleonTabSubtitle")}
              </p>
            </div>
          </div>
        )}

        {/* TAB 6: MEMBERSHIP JOIN REQUESTS */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-line bg-card p-8 shadow-[var(--shadow-md)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="text-cham-text" size={22} />
                    Wnioski o dołączenie do organizacji
                  </h2>
                  <p className="text-xs text-ink-soft mt-1">
                    Zatwierdź użytkowników chcących dołączyć do Twojej organizacji, aby mogli brać udział w sesjach.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cham/10 text-cham-text">
                  Oczekujące: {requests.filter((r) => r.status === "PENDING").length}
                </span>
              </div>

              {requests.length === 0 ? (
                <div className="text-center py-12 text-ink-soft space-y-3">
                  <ChameleonMascot state="idle" size={80} />
                  <p className="text-sm font-semibold">Brak wniosków o dołączenie</p>
                  <p className="text-xs">Nowi użytkownicy rejestrujący się przez formularz publiczny pojawią się w tym miejscu.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line text-ink-soft font-semibold">
                        <th className="py-3 px-4">Użytkownik</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Wiadomość</th>
                        <th className="py-3 px-4">Data złożenia</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Decyzja</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((req) => (
                        <tr key={req.id} className="border-b border-line/50 hover:bg-surface/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                                style={{ backgroundColor: req.user.profile?.chameleonColor || "#06B6D4" }}
                              >
                                {(req.user.profile?.displayName || req.user.email)[0].toUpperCase()}
                              </div>
                              <span className="font-semibold text-ink">
                                {req.user.profile?.displayName || "Użytkownik"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-ink-soft font-mono">{req.user.email}</td>
                          <td className="py-3 px-4 text-ink-soft max-w-xs truncate">
                            {req.message || "—"}
                          </td>
                          <td className="py-3 px-4 text-ink-soft">
                            {new Date(req.createdAt).toLocaleDateString("pl-PL")}
                          </td>
                          <td className="py-3 px-4">
                            {req.status === "APPROVED" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Zaakceptowany
                              </span>
                            )}
                            {req.status === "REJECTED" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                Odrzucony
                              </span>
                            )}
                            {req.status === "PENDING" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Oczekuje
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {req.status === "PENDING" ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleReviewRequest(req.id, "APPROVE")}
                                  className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition shadow-sm cursor-pointer"
                                >
                                  Akceptuj
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewRequest(req.id, "REJECT")}
                                  className="px-3 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold text-[11px] transition cursor-pointer"
                                >
                                  Odrzuć
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-ink-soft">Rozpatrzony</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: SUPER ADMIN OVERSIGHT */}
        {activeTab === "superadmin" && user.role === "SUPERADMIN" && (
          <div className="space-y-8">
            {/* Create Org Directly Card */}
            <div className="rounded-3xl border border-line bg-card p-6 shadow-[var(--shadow-md)]">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                <Crown className="text-amber-400" size={20} />
                Utwórz organizację bezpośrednio (Super Admin)
              </h2>
              <p className="text-xs text-ink-soft mb-4">
                Jako Super Administrator możesz natychmiast utworzyć zatwierdzoną organizację bez przechodzenia przez proces akceptacji.
              </p>

              <form onSubmit={handleAdminCreateOrg} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  value={adminNewOrgName}
                  onChange={(e) => setAdminNewOrgName(e.target.value)}
                  placeholder="Nazwa nowej organizacji (np. I LO w Warszawie)..."
                  className="flex-1 rounded-2xl border border-line bg-surface px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-cham"
                />
                <button
                  type="submit"
                  disabled={adminCreatingOrg || !adminNewOrgName.trim()}
                  className="px-5 py-2.5 rounded-2xl bg-cham text-cham-contrast font-bold text-xs transition hover:brightness-105 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {adminCreatingOrg ? "Tworzenie..." : "Utwórz organizację"}
                </button>
              </form>
            </div>

            {/* Organizations Table */}
            <div className="rounded-3xl border border-line bg-card p-6 shadow-[var(--shadow-md)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">Wszystkie organizacje ({adminOrgs.length})</h2>
                  <p className="text-xs text-ink-soft mt-0.5">
                    Globalna lista tenantów, wniosków o rejestrację i aktywnych zespołów.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Oczekujące: {adminOrgs.filter((o) => o.status === "PENDING_APPROVAL").length}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Aktywne: {adminOrgs.filter((o) => o.status === "APPROVED").length}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-ink-soft font-semibold">
                      <th className="py-3 px-4">Organizacja</th>
                      <th className="py-3 px-4">Identyfikator (Slug)</th>
                      <th className="py-3 px-4">Użytkownicy</th>
                      <th className="py-3 px-4">Zespoły</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Data rejestracji</th>
                      <th className="py-3 px-4 text-right">Zarządzanie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminOrgs.map((org) => (
                      <tr key={org.id} className="border-b border-line/50 hover:bg-surface/50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-ink flex items-center gap-2">
                            <Building2 size={16} className="text-cham-text" />
                            <span>{org.name}</span>
                            {org.isSystemTenant && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                                System HQ
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-ink-soft text-[11px]">{org.slug}</td>
                        <td className="py-3 px-4 text-ink-soft">{org._count.users}</td>
                        <td className="py-3 px-4 text-ink-soft">{org._count.teams}</td>
                        <td className="py-3 px-4">
                          {org.status === "APPROVED" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Zatwierdzona
                            </span>
                          )}
                          {org.status === "PENDING_APPROVAL" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Oczekuje na Super Admina
                            </span>
                          )}
                          {org.status === "REJECTED" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                              Odrzucona
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-ink-soft">
                          {new Date(org.createdAt).toLocaleDateString("pl-PL")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {org.status !== "APPROVED" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrgStatus(org.id, "APPROVED")}
                                className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] transition cursor-pointer"
                              >
                                Zatwierdź
                              </button>
                            )}
                            {org.status !== "REJECTED" && !org.isSystemTenant && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrgStatus(org.id, "REJECTED")}
                                className="px-2.5 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold text-[10px] transition cursor-pointer"
                              >
                                Odrzuć
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
