// Parser koordinat "Koordinat" (kolom P, video_projects_new_v1) — manual via
// regex, BUKAN pakai Date-style auto-detect, supaya kegagalan parse konsisten
// ke `null` (bukan NaN/exception). Mendukung 2 format yang terbukti muncul
// di data nyata Google Maps:
//   1. Desimal, dipisah koma:      "3.596856700702738, 98.68126230986603"
//   2. DMS dgn arah mata angin:    "6°49'12.9\"S 110°48'35.4\"E"

const DECIMAL_PATTERN = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;

const DMS_PATTERN =
  /^(\d+)°\s*(\d+)'\s*(\d+(?:\.\d+)?)"\s*([NSns])\s+(\d+)°\s*(\d+)'\s*(\d+(?:\.\d+)?)"\s*([EWew])$/;

function dmsToDecimal(deg, min, sec, dir) {
  const value = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
  const negative = dir === "S" || dir === "s" || dir === "W" || dir === "w";
  return negative ? -value : value;
}

/**
 * @param {string} raw - isi mentah kolom "Koordinat"
 * @returns {{lat: number, lng: number} | null}
 */
export function parseKoordinat(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const decimalMatch = DECIMAL_PATTERN.exec(value);
  if (decimalMatch) {
    const lat = Number(decimalMatch[1]);
    const lng = Number(decimalMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }

  const dmsMatch = DMS_PATTERN.exec(value);
  if (dmsMatch) {
    const [, latDeg, latMin, latSec, latDir, lngDeg, lngMin, lngSec, lngDir] = dmsMatch;
    const lat = dmsToDecimal(latDeg, latMin, latSec, latDir);
    const lng = dmsToDecimal(lngDeg, lngMin, lngSec, lngDir);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }

  return null;
}
