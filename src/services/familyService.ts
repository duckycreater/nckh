/**
 * Family Service (client-side) - CayGiaPha_NhanThuc
 *
 * Coordinates family creation, invite, member management, challenge
 * tracking, and aggregate carbon stats with the server.
 */

import type {
  Family,
  FamilyMember,
  FamilyChallenge,
  FamilyCarbonStats,
  FamilyLeaderboard,
} from "../types/family";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

class FamilyService {
  /** Create a new family. Creator becomes parent automatically. */
  async createFamily(name: string, region: string): Promise<Family> {
    const r = await fetch(`${API_BASE}/api/family`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("bmo_token") || ""}`,
      },
      body: JSON.stringify({ name, region }),
    });
    if (!r.ok) throw new Error((await r.json()).error || "Create failed");
    return r.json();
  }

  /** Get the current user's family (returns null if not in any). */
  async getMyFamily(): Promise<{ family: Family; members: FamilyMember[] } | null> {
    const r = await fetch(`${API_BASE}/api/family/me`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("bmo_token") || ""}`,
      },
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  }

  /** Join an existing family using invite code. */
  async joinFamily(inviteCode: string): Promise<Family> {
    const r = await fetch(`${API_BASE}/api/family/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("bmo_token") || ""}`,
      },
      body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
    });
    if (!r.ok) throw new Error((await r.json()).error || "Join failed");
    return r.json();
  }

  /** Leave the current family. Creator cannot leave if sole parent. */
  async leaveFamily(): Promise<void> {
    const r = await fetch(`${API_BASE}/api/family/leave`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("bmo_token") || ""}`,
      },
    });
    if (!r.ok) throw new Error("Leave failed");
  }

  /** Get active + recent challenges. */
  async getChallenges(familyId: string): Promise<FamilyChallenge[]> {
    const r = await fetch(`${API_BASE}/api/family/${familyId}/challenges`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("bmo_token") || ""}`,
      },
    });
    if (!r.ok) return [];
    const { challenges } = await r.json();
    return challenges || [];
  }

  /** Create a new challenge (parent only). */
  async createChallenge(
    familyId: string,
    data: Pick<
      FamilyChallenge,
      "title" | "description" | "type" | "target" | "endAt" | "reward"
    >,
  ): Promise<FamilyChallenge> {
    const r = await fetch(`${API_BASE}/api/family/${familyId}/challenges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("bmo_token") || ""}`,
      },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error("Create challenge failed");
    const { challenge } = await r.json();
    return challenge;
  }

  /** Get the weekly carbon stats for a family. */
  async getCarbonStats(familyId: string): Promise<FamilyCarbonStats> {
    const r = await fetch(`${API_BASE}/api/family/${familyId}/carbon`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("bmo_token") || ""}`,
      },
    });
    if (!r.ok) throw new Error("Fetch stats failed");
    return r.json();
  }

  /** Get leaderboard rank for the current family. */
  async getLeaderboard(familyId: string): Promise<FamilyLeaderboard> {
    const r = await fetch(`${API_BASE}/api/family/${familyId}/leaderboard`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("bmo_token") || ""}`,
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
