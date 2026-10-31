const ALLOWED_REMOTE_IMAGE_HOSTS = new Set(["res.cloudinary.com", "images.unsplash.com"]);

/** Keep rendered image sources aligned with the app's CSP and offline fallback. */
export function isDisplayableImageUrl(value: string | null | undefined): value is string {
  const source = value?.trim();
  if (!source) return false;
  if (
    (source.startsWith("/") && !source.startsWith("//")) ||
    source.startsWith("blob:") ||
    source.startsWith("data:image/")
  ) {
    return true;
  }
  try {
    const url = new URL(source);
    return url.protocol === "https:" && ALLOWED_REMOTE_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
