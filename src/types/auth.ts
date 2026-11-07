export type UserRole = "SUPERADMIN" | "ORG_ADMIN" | "TEAM_FACILITATOR" | "TEAM_MEMBER";

export interface UserSessionPayload {
  sub: string;           // User ID
  email: string;
  orgId: string;
  role: UserRole;
  name: string;
  mustChangePassword?: boolean;
}

export interface UserProfileData {
  displayName: string;
  chameleonColor: string;
  chameleonSecondary: string;
  chameleonAccent: string;
  avatarState: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  profile: UserProfileData;
  teams: { id: string; name: string; role: string }[];
  mustChangePassword: boolean;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface RegisterRequestBody {
  email: string;
  password: string;
  displayName: string;
  // Either creating new org:
  orgName?: string;
  orgSlug?: string;
  // Or joining existing org via invite token:
  invitationToken?: string;
  // Chameleon customization:
  chameleonColor?: string;
  chameleonSecondary?: string;
  chameleonAccent?: string;
}

export interface SetupRequestBody {
  email: string;
  password: string;
  displayName: string;
  orgName?: string;
  teamName?: string;
}
