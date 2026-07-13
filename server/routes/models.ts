/**
 * server/routes/models.ts — Public read endpoints for the model registry.
 *
 *   GET /api/models                         list all (latest) manifests
 *   GET /api/models/:name                   signed manifest for latest version
 *   GET /api/models/:name/:version/manifest.json  signed specific version
 *
 * Manifests are signed server-side; clients verify before loading weights.
 */

import { Router } from "express";
import { z } from "zod";
import { modelRegistry, verifyManifest, type ModelManifest } from "../services/modelRegistry.js";
import { zodValidate } from "../middleware/zodValidate.js";

const ModelParams = z.object({
  name: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});

const ModelVersionParams = ModelParams.extend({
  version: z.string().min(1).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
});

export function modelsRouter(): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const list = modelRegistry.list();
      // List view does NOT include signatures (would be redundant for every model
      // and waste bandwidth). Clients call the per-name endpoint to get the
      // signed manifest.
      res.json({models: list.map(stripSignatureMetadata)});
    } catch (e) {
      res.status(500).json({error: (e as Error).message});
    }
  });

  router.get("/:name", zodValidate({ params: ModelParams }), async (req, res) => {
    try {
      const name = (req.params as z.infer<typeof ModelParams>).name;
      const signed = modelRegistry.getSigned(name);
      if (!signed) return res.status(404).json({error: "Model not found"});
      res.json(signed);
    } catch (e) {
      res.status(500).json({error: (e as Error).message});
    }
  });

  router.get("/:name/:version/manifest.json", zodValidate({ params: ModelVersionParams }), async (req, res) => {
    try {
      const { name, version } = req.params as z.infer<typeof ModelVersionParams>;
      const manifest = modelRegistry.getVersion(name, version);
      if (!manifest) return res.status(404).json({error: "Version not found"});
      const signed = {manifest, signature: ""};
      signed.signature = require("../services/modelRegistry.js").signManifest(manifest);
      // Re-verify on the way out — defence in depth.
      if (!verifyManifest(signed)) {
        return res.status(500).json({error: "Internal signature failure"});
      }
      res.json(signed);
    } catch (e) {
      res.status(500).json({error: (e as Error).message});
    }
  });

  return router;
}

function stripSignatureMetadata(m: ModelManifest): Record<string, unknown> {
  // Strip server-only fields from list view.
  const {registeredAt, ...rest} = m;
  return rest;
}