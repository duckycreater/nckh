/**
 * server/middleware/zodValidate.ts
 *
 * Express middleware factory that validates `req.body`, `req.query`, and
 * (optionally) `req.params` against the Zod schemas declared in
 * `server/apiContract.ts`. Used by D2 to wrap every input endpoint so
 * malformed payloads are rejected with a clean 400 instead of crashing
 * deep inside a route handler.
 *
 * Usage:
 *   import { zodValidate } from "../middleware/zodValidate";
 *   import { Contracts } from "../apiContract";
 *
 *   router.post(
 *     "/api/scan-garbage",
 *     zodValidate({ body: Contracts["POST /api/scan-garbage"].body }),
 *     handler
 *   );
 *
 * The middleware is intentionally permissive on `req.query` (everything is
 * string | string[] | undefined at parse time) but strict on `req.body`
 * (which Express has already JSON-parsed).
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

interface ZodTargets {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function bad(res: Response, where: string, issues: unknown) {
  res.status(400).json({
    ok: false,
    error: "invalid_request",
    message: `Request ${where} failed validation`,
    details: issues,
  });
}

/**
 * Build an Express middleware that runs each provided Zod schema against
 * the matching part of the request. On failure, replies with HTTP 400 and
 * a JSON error envelope consistent with the rest of the API.
 */
export function zodValidate(targets: ZodTargets): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (targets.body) {
      const r = targets.body.safeParse(req.body);
      if (!r.success) return bad(res, "body", r.error.flatten());
      req.body = r.data;
    }
    if (targets.query) {
      const r = targets.query.safeParse(req.query);
      if (!r.success) return bad(res, "query", r.error.flatten());
      // Express 5 makes req.query a getter; store the parsed value on res.locals
      // so handlers can pick it up via `(res.locals.query ?? req.query)`.
      (res as Response & { locals: Record<string, unknown> }).locals.query = r.data;
    }
    if (targets.params) {
      const r = targets.params.safeParse(req.params);
      if (!r.success) return bad(res, "params", r.error.flatten());
      req.params = r.data as typeof req.params;
    }
    next();
  };
}