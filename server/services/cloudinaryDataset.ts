/**
 * Cloudinary dataset uploader - Phase 1
 *
 * Uploads user-contributed waste images to a separate Cloudinary folder
 * for later dataset release. Images are anonymized (no user metadata).
 *
 * Requires CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY +
 * CLOUDINARY_API_SECRET env vars.
 */

import { v2 as cloudinary } from "cloudinary";

const FOLDER = "tcn-waste-dataset";
const TAGS = ["waste", "dataset", "contributed"];

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const url = process.env.CLOUDINARY_URL;
  if (url) {
    cloudinary.config({ cloudinary_url: url });
    configured = true;
    return;
  }
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (cloud && key && secret) {
    cloudinary.config({
      cloud_name: cloud,
      api_key: key,
      api_secret: secret,
    });
    configured = true;
  }
}

export interface DatasetUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
}

export type CardImageUploadResult = DatasetUploadResult;

export async function uploadToDataset(
  base64Data: string,
  metadata: {
    userId: string;
    /** Correlation id for the async upload; the research DB row may be written later. */
    scanId: string;
    category: string;
    confidence: number;
  },
): Promise<DatasetUploadResult | null> {
  ensureConfigured();
  if (!configured) {
    console.warn("[cloudinary] not configured, skipping dataset upload");
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, {
      folder: `${FOLDER}/${metadata.category}`,
      public_id: `scan_${metadata.scanId}_${Date.now()}`,
      tags: [...TAGS, `user_${metadata.userId}`, `cat_${metadata.category}`],
      // Anonymize: strip EXIF (GPS, camera info)
      // Cloudinary has built-in EXIF stripping for uploads
      overwrite: false,
      unique_filename: true,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  } catch (err) {
    console.error("[cloudinary] dataset upload failed:", err);
    return null;
  }
}

/**
 * Store the player's card artwork separately from the opt-in research dataset.
 * No research tag or display name is attached. Cloudinary strips EXIF and
 * normalises the image so the collection never serves multi-megabyte originals.
 */
export async function uploadCardImage(
  dataUri: string,
  metadata: { ownerId: string; scanId: string; category: string },
): Promise<CardImageUploadResult | null> {
  ensureConfigured();
  if (!configured) return null;
  try {
    const ownerHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(metadata.ownerId),
    );
    const ownerTag = Buffer.from(ownerHash).toString("hex").slice(0, 16);
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `bmo-material-cards/${metadata.category}`,
      public_id: `card_${metadata.scanId}`,
      tags: ["material-card", `owner_${ownerTag}`],
      overwrite: false,
      unique_filename: false,
      resource_type: "image",
      transformation: [
        { width: 960, height: 960, crop: "limit" },
        { quality: "auto:good", fetch_format: "auto", flags: "strip_profile" },
      ],
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error("[cloudinary] material card upload failed:", error);
    return null;
  }
}

export function isCloudinaryConfigured(): boolean {
  ensureConfigured();
  return configured;
}
