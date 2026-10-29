/**
 * Family Service (client-side) - CayGiaPha_NhanThuc
 *
 * Coordinates family creation, invite, member management, challenge
 * tracking, and aggregate carbon stats with the server.
 */

import { getAuthToken } from "../lib/auth";
import type {
  Family,
  FamilyMember,
  FamilyChallenge,
  FamilyCarbonStats,
  FamilyLeaderboard,
} from "../types/family";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) ||
  "";

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeFamily(raw: Record<string, unknown>): Family {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    inviteCode: String(raw.inviteCode ?? raw.invite_code ?? ""),
    createdBy: String(raw.createdBy ?? raw.created_by ?? ""),
    createdAt: numberValue(raw.createdAt ?? raw.created_at),
    avatarSeed: String(raw.avatarSeed ?? raw.avatar_seed ?? ""),
    region: String(raw.region ?? "VN"),
    householdSize: numberValue(raw.householdSize ?? raw.household_size),
    weeklyGoal: numberValue(raw.weeklyGoal ?? raw.weekly_goal),
  };
}

function normalizeMember(raw: Record<string, unknown>): FamilyMember {
  return {
    familyId: String(raw.familyId ?? raw.family_id ?? ""),
    userId: String(raw.userId ?? raw.user_id ?? ""),
    role: (raw.role as FamilyMember["role"]) || "guest",
    joinedAt: numberValue(raw.joinedAt ?? raw.joined_at),
    contributionsWeekly: numberValue(raw.contributionsWeekly ?? raw.contributions_weekly),
    contributionsTotal: numberValue(raw.contributionsTotal ?? raw.contributions_total),
    isActive: Boolean(raw.isActive ?? raw.is_active),
  };
}

function normalizeChallenge(raw: Record<string, unknown>): FamilyChallenge {
  return {
    id: String(raw.id ?? ""),
    familyId: String(raw.familyId ?? raw.family_id ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    type: raw.type as FamilyChallenge["type"],
    target: numberValue(raw.target),
    progress: numberValue(raw.progress),
    startAt: numberValue(raw.startAt ?? raw.start_at),
    endAt: numberValue(raw.endAt ?? raw.end_at),
    reward: numberValue(raw.reward),
    completed: Boolean(raw.completed),
    createdBy: String(raw.createdBy ?? raw.created_by ?? ""),
  };
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : fallback;
}

class FamilyService {
  /** Create a new family. Creator becomes parent automatically. */
  async createFamily(name: string, region: string): Promise<Family> {
    const r = await fetch(`${API_BASE}/api/family`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ name, region }),
    });
    if (!r.ok) throw new Error(await readApiError(r, "Không thể tạo gia đình."));
    return normalizeFamily((await r.json()) as Record<string, unknown>);
  }

  /** Get the current user's family (returns null if not in any). */
  async getMyFamily(): Promise<{ family: Family; members: FamilyMember[] } | null> {
    const r = await fetch(`${API_BASE}/api/family/me`, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(await readApiError(r, "Không thể tải dữ liệu gia đình."));
    const body = (await r.json()) as {
      family: Record<string, unknown>;
      members?: Record<string, unknown>[];
    };
    return {
      family: normalizeFamily(body.family),
      members: (body.members ?? []).map(normalizeMember),
    };
  }

  /** Join an existing family using invite code. */
  async joinFamily(inviteCode: string): Promise<Family> {
    const r = await fetch(`${API_BASE}/api/family/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
    });
    if (!r.ok) throw new Error(await readApiError(r, "Không thể tham gia gia đình."));
    return normalizeFamily((await r.json()) as Record<string, unknown>);
  }

  /** Leave the current family. Creator cannot leave if sole parent. */
  async leaveFamily(): Promise<void> {
    const r = await fetch(`${API_BASE}/api/family/leave`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    if (!r.ok) throw new Error("Leave failed");
  }

  /** Get active + recent challenges. */
  async getChallenges(familyId: string): Promise<FamilyChallenge[]> {
    const r = await fetch(`${API_BASE}/api/family/${familyId}/challenges`, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    if (!r.ok) throw new Error(await readApiError(r, "Không thể tải thử thách gia đình."));
    const { challenges } = await r.json();
    return Array.isArray(challenges)
      ? challenges.map((challenge) => normalizeChallenge(challenge as Record<string, unknown>))
      : [];
  }

  /** Create a new challenge (parent only). */
  async createChallenge(
    familyId: string,
    data: Pick<FamilyChallenge, "title" | "description" | "type" | "target" | "endAt" | "reward">,
  ): Promise<FamilyChallenge> {
    const r = await fetch(`${API_BASE}/api/family/${familyId}/challenges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error("Create challenge failed");
    const { challenge } = await r.json();
    return normalizeChallenge(challenge as Record<string, unknown>);
  }

  /** Get the weekly carbon stats for a family. */
  async getCarbonStats(familyId: string): Promise<FamilyCarbonStats> {
    const r = await fetch(`${API_BASE}/api/family/${familyId}/carbon`, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    if (!r.ok) throw new Error("Fetch stats failed");
    return r.json();
  }

  /** Get leaderboard rank for the current family. */
  async getLeaderboard(familyId: string): Promise<FamilyLeaderboard> {
    const r = await fetch(`${API_BASE}/api/family/${familyId}/leaderboard`, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    if (!r.ok) throw new Error("Fetch leaderboard failed");
    return r.json();
  }

  /** Build a shareable invite link. */
  buildInviteLink(inviteCode: string): string {
    const base = typeof window !== "undefined" ? window.location.origin : "https://bmo.vn";
    return `${base}/family/join?code=${inviteCode}`;
  }
}

export const familyService = new FamilyService();
