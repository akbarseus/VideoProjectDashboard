import { isValidUrl } from "../useVideoProjects";

/**
 * Pakai URL API (bukan satu regex kaku) supaya tahan terhadap urutan query
 * param apapun (mis. ?si=xxx&v=ID, bukan cuma ?v=ID di awal), subdomain
 * m./www., dan path /shorts/, /live/, /embed/, youtu.be/ID.
 */
export function youtubeId(url) {
  if (!isValidUrl(url)) return null;
  let u;
  try { u = new URL(url.trim()); } catch { return null; }

  const host  = u.hostname.replace(/^(www|m|music)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return /^[\w-]{11}$/.test(parts[0]) ? parts[0] : null;
  }
  if (host === "youtube.com") {
    const v = u.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const idx = parts.findIndex(p => p === "embed" || p === "shorts" || p === "live");
    if (idx !== -1 && /^[\w-]{11}$/.test(parts[idx + 1] || "")) return parts[idx + 1];
  }
  return null;
}

export function youtubeThumbnailUrl(url, quality = "hqdefault") {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/${quality}.jpg` : null;
}
