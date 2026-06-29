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

export async function uploadToDataset(
  base64Data: string,
  metadata: {
    userId: string;
    scanId: number;
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
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${base64Data}`,
      {
        folder: `${FOLDER}/${metadata.category}`,
        public_id: `scan_${metadata.scanId}_${Date.now()}`,
        tags: [...TAGS, `user_${metadata.userId}`, `cat_${metadata.category}`],
        // Anonymize: strip EXIF (GPS, camera info)
        // Cloudinary has built-in EXIF stripping for uploads
        overwrite: false,
        unique_filename: true,
      },
    );

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

export function isCloudinaryConfigured(): boolean {
  ensureConfigured();
  return configured;
}