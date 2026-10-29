import { Router } from "express";
import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { getRequestNick, requireAuth } from "../auth.js";
import type { MatchState } from "../../shared/materialCards.js";
import {
  MaterialCardError,
  createMaterialCard,
  createMaterialMatch,
  getMaterialMatch,
  joinMaterialMatch,
  listMaterialCards,
  listMaterialMatches,
  submitMaterialMatch,
  type LocalEconomyAdapter,
} from "../services/materialCards.js";

const CreateCardBody = z.object({
  scanId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(160),
});

const CreateMatchBody = z.object({
  opponentId: z.string().trim().min(1).max(128).optional(),
  deckCardIds: z.array(z.string().uuid()).max(3).default([]),
});

const SubmitRoundBody = z.object({
  roundIndex: z.number().int().min(0).max(4),
  choices: z
    .array(
      z.object({
        objectId: z.string().trim().min(1).max(40),
        action: z.enum(["recycle", "compost", "special_collection", "residual"]),
        steps: z
          .array(z.enum(["clean", "dry", "protect"]))
          .max(3)
          .default([]),
      }),
    )
    .length(3),
  abilityCardId: z.string().max(80).optional(),
  abilityTargetId: z.string().trim().min(1).max(40).optional(),
});

const JoinMatchBody = z.object({
  deckCardIds: z.array(z.string().uuid()).length(3),
});

export interface MaterialCardsRouterDependencies {
  getLocalEconomy: (nick: string) => LocalEconomyAdapter | undefined;
  requireCompleteProfile?: RequestHandler;
}

function statusFor(error: MaterialCardError): number {
  switch (error.code) {
    case "scan_not_found":
    case "card_not_found":
    case "match_not_found":
      return 404;
    case "scan_forbidden":
    case "match_forbidden":
      return 403;
    case "insufficient_points":
    case "scan_ineligible":
    case "match_closed":
      return 409;
    case "invalid_submission":
      return 400;
    default:
      return 503;
  }
}

function sendError(res: Response, error: unknown) {
  if (error instanceof MaterialCardError) {
    return res.status(statusFor(error)).json({ error: error.message, code: error.code });
  }
  console.error("[material-cards]", error);
  return res.status(500).json({ error: "Không thể xử lý yêu cầu thẻ lúc này.", code: "internal" });
}

function authenticatedUserId(req: Request, fallbackNick: string): string {
  const value = (req as Request & { userId?: unknown }).userId;
  return typeof value === "string" && value.trim() ? value : fallbackNick;
}

function matchView(match: MatchState, actorId: string): MatchState {
  const isCreator = actorId.trim().toLowerCase() === match.playerId.trim().toLowerCase();
  if (match.status === "completed") {
    if (isCreator) return match;
    return {
      ...match,
      playerScore: match.opponentScore,
      opponentScore: match.playerScore,
      result: match.result === "win" ? "loss" : match.result === "loss" ? "win" : match.result,
      ratingDelta: match.opponentRatingDelta ?? 0,
      opponentRatingDelta: match.ratingDelta,
    };
  }
  return isCreator
    ? { ...match, opponentSubmissions: [], opponentScore: 0 }
    : { ...match, playerSubmissions: [], playerScore: 0 };
}

export function materialCardsRouter(deps: MaterialCardsRouterDependencies): Router {
  const router = Router();
  const completeProfile = deps.requireCompleteProfile ?? ((_req, _res, next) => next());
  router.get("/material-cards", requireAuth, async (req, res) => {
    try {
      const rawLimit = Number(req.query.limit ?? 24);
      const limit = Number.isFinite(rawLimit) ? rawLimit : 24;
      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : "";
      const rawCategory = typeof req.query.category === "string" ? req.query.category : "";
      const category = ["plastic", "paper", "glass", "metal", "organic", "hazard"].includes(
        rawCategory,
      )
        ? (rawCategory as import("../../shared/materialCards.js").WasteCategory)
        : undefined;
      const result = await listMaterialCards(getRequestNick(req), limit, cursor, search, category);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/material-cards", requireAuth, completeProfile, async (req, res) => {
    const parsed = CreateCardBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dữ liệu tạo thẻ không hợp lệ.", code: "invalid_body" });
    }
    try {
      const nick = getRequestNick(req);
      const result = await createMaterialCard({
        ownerNick: nick,
        ownerId: authenticatedUserId(req, nick),
        scanId: parsed.data.scanId,
        idempotencyKey: parsed.data.idempotencyKey,
        localEconomy: deps.getLocalEconomy(nick),
      });
      res.status(result.charged ? 201 : 200).json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/material-matches", requireAuth, completeProfile, async (req, res) => {
    const parsed = CreateMatchBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Bộ thẻ hoặc đối thủ không hợp lệ.", code: "invalid_body" });
    }
    try {
      const nick = getRequestNick(req);
      // Match identities use the authenticated nickname because that is the
      // identifier students can actually share with an opponent. Never accept
      // a player identity from the request body.
      const playerId = nick.trim().toLowerCase();
      const match = await createMaterialMatch({
        playerId,
        playerNick: nick,
        opponentId: parsed.data.opponentId,
        deckCardIds: parsed.data.deckCardIds,
      });
      res.status(201).json({ match: matchView(match, playerId) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/material-matches", requireAuth, async (req, res) => {
    try {
      const nick = getRequestNick(req).trim().toLowerCase();
      const matches = await listMaterialMatches(nick);
      res.json({ matches: matches.map((match) => matchView(match, nick)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/material-matches/:matchId", requireAuth, async (req, res) => {
    try {
      const nick = getRequestNick(req);
      const match = await getMaterialMatch(String(req.params.matchId), nick.trim().toLowerCase());
      res.json({ match: matchView(match, nick) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/material-matches/:matchId/join", requireAuth, completeProfile, async (req, res) => {
    const parsed = JoinMatchBody.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Đối kháng cần đúng ba thẻ hợp lệ.", code: "invalid_body" });
    }
    try {
      const nick = getRequestNick(req);
      const match = await joinMaterialMatch({
        matchId: String(req.params.matchId),
        opponentId: nick.trim().toLowerCase(),
        opponentNick: nick,
        deckCardIds: parsed.data.deckCardIds,
      });
      res.json({ match: matchView(match, nick) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post(
    "/material-matches/:matchId/rounds",
    requireAuth,
    completeProfile,
    async (req, res) => {
      const parsed = SubmitRoundBody.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "Lựa chọn của vòng đấu không hợp lệ.", code: "invalid_body" });
      }
      try {
        const nick = getRequestNick(req);
        const match = await submitMaterialMatch({
          matchId: String(req.params.matchId),
          actorId: nick.trim().toLowerCase(),
          submission: parsed.data,
        });
        res.json({ match: matchView(match, nick) });
      } catch (error) {
        sendError(res, error);
      }
    },
  );

  return router;
}
