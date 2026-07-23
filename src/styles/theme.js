const shared = {
  surface: "#FFFFFF",
  soft: "#F1F5F9",
  teal: "#3EBDAC",
  tealDark: "#2AA897",
  tealBg: "#E8F8F6",
  tealBd: "rgba(62,189,172,0.28)",
  green: "#059669",
  greenBg: "#ECFDF5",
  greenBd: "rgba(5,150,105,0.25)",
  amber: "#D97706",
  amberBg: "#FFFBEB",
  blueSch: "#2563EB",
  blueSchBg: "#EFF6FF",
  blue: "#2563EB",
  blueBg: "#EFF6FF",
  red: "#DC2626",
  redBg: "#FEF2F2",
  // Token baru utk kategori pipeline "Scheduled to Publish" (L4) — satu-satunya
  // kategori yang belum punya warna semantik; violet jewel-tone, sekeluarga
  // dgn teal/green/amber/blue yang sudah ada (lihat spec dashboard redesign).
  violet: "#7C3AED",
  violetBg: "#F5F3FF",
  // Panel gelap "production deck" di halaman Dashboard — teal sangat gelap
  // turunan warna brand, dipakai sbg latar section KPI (Video Progress
  // Overall).
  deck: "#0E3B36",
  deckSoft: "#175048",
  // Panel gelap KEDUA — khusus "Video Production Pipeline", sengaja BUKAN
  // teal (beda hue, graphite/slate netral) supaya section ini "objectively
  // distinct" dari panel KPI: angka pipeline = acuan update progress
  // mingguan, harus jelas kelihatan sbg section terpisah, bukan cuma variasi
  // warna dari section yang sama. Tetap harmonis (dark, sama level kontras).
  pipeDeck:     "#171D26",
  pipeDeckSoft: "#212936",
  textH: "#0F172A",
  textSec: "#64748B",
  textMut: "#94A3B8",
};

export const APP_COLORS = {
  ...shared,
  bg: "#F8FAFC",
  border: "#E2E8F0",
};

export const DATA_COLORS = {
  ...APP_COLORS,
  slate: "#475569",
};

export const DETAIL_COLORS = APP_COLORS;

// The Highlight page intentionally uses a slightly warmer neutral palette.
// Keeping the overrides here preserves the current visual appearance while
// making future redesigns changeable from one module.
export const DASHBOARD_COLORS = {
  ...shared,
  bg: "#F7F9FC",
  border: "#E4E9F2",
  borderSoft: "#F0F4FA",
  textH: "#0A0F1E",
  text: "#2D3748",
  textSec: "#5C6784",
  textMut: "#9BA3B8",
  greenDark: "#047857",
  greenLight: "#ECFDF5",
  greenMid: "#6EE7B7",
  solar: "#F59E0B",
  solarLight: "#FFFBEB",
  amberLight: "#FFFBEB",
  amberMid: "#FCD34D",
  blueSchLight: "#EFF6FF",
  blueSchMid: "#93C5FD",
  redLight: "#FEF2F2",
  redMid: "#FCA5A5",
  blueLight: "#EFF6FF",
  sh1: "0 1px 2px rgba(10,15,30,0.04), 0 4px 12px rgba(10,15,30,0.06)",
  sh2: "0 2px 8px rgba(10,15,30,0.06), 0 12px 32px rgba(10,15,30,0.08)",
  sh3: "0 8px 24px rgba(10,15,30,0.10), 0 24px 48px rgba(10,15,30,0.08)",
};
