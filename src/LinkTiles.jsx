import { Ribbon, Film, ArrowRight, ExternalLink } from "lucide-react";
import { GoogleDriveLogo } from "@phosphor-icons/react";
import { YoutubeIcon, LinkedinIcon, InstagramIcon } from "./socialIcons";
import { isValidUrl } from "./useVideoProjects";

/* ─── LINK PREVIEW (Frame.io) — tombol khusus proyek L3 ─────────────────
   L3 mencakup 3 sub-status (lihat CoverageDashboard.jsx REVIEW_STATUSES):
   Editing, Internal Review, Client Review. Status lain (termasuk L5) tidak
   pernah menampilkan tombol ini sama sekali. */
const PREVIEW_ELIGIBLE_STATUSES = new Set(["Editing", "Internal Review", "Client Review"]);

export function isPreviewEligible(row) {
  return row.statusLevel === "L3" && PREVIEW_ELIGIBLE_STATUSES.has(row.statusVideoRaw);
}

export function LinkPreviewButton({ url, t, size = 26 }) {
  const active = isValidUrl(url);
  const label = t("Link preview", "Link preview");
  const body = (
    <span style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: active ? "#EEF2FF" : "#F1F5F9",
      border: `1px solid ${active ? "rgba(99,102,241,0.35)" : "#E2E8F0"}`,
      color: active ? "#4F46E5" : "#CBD5E1",
      transition: "transform .12s",
    }}>
      <ExternalLink size={size >= 26 ? 13 : 12} strokeWidth={2.2} />
    </span>
  );

  if (!active) return <div title={label} style={{ cursor: "default" }}>{body}</div>;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={label}
      onClick={e => e.stopPropagation()} style={{ textDecoration: "none" }}
      onMouseEnter={e => e.currentTarget.firstChild.style.transform = "scale(1.08)"}
      onMouseLeave={e => e.currentTarget.firstChild.style.transform = "scale(1)"}>
      {body}
    </a>
  );
}

/**
 * Sumber tunggal untuk daftar tautan per proyek — dipakai di CoverageDashboard,
 * DataPage, dan ProjectDetailPage supaya konsisten (dulu ada 2 versi terpisah).
 * Semua 6 kanal SELALU ditampilkan (termasuk Instagram/LinkedIn) walau isinya
 * kosong — tautan yang belum valid ditampilkan abu-abu/nonaktif, bukan hilang,
 * supaya jelas kanal itu memang belum ada isinya (bukan bug UI).
 */
function linkItems(row, t) {
  return [
    { key:"dok", url: row.linkDokumentasi, icon: GoogleDriveLogo, color:"#4285F4", label: t("Drive","Drive") },
    { key:"yt",  url: row.linkYoutube,     icon: YoutubeIcon,   color:"#FF0000", label:"YouTube" },
    { key:"li",  url: row.linkLinkedin,    icon: LinkedinIcon,  color:"#0A66C2", label:"LinkedIn" },
    { key:"ig",  url: row.linkInstagram,   icon: InstagramIcon, color:"#E1306C", label:"Instagram" },
    { key:"ev",  url: row.linkPeresmian,   icon: Ribbon,        color:"#D97706", label: t("Peresmian","Inauguration") },
    { key:"vid", url: row.linkVideoOutput, icon: Film,          color:"#2563EB", label: t("Video","Video") },
  ];
}

/* ─── Tile besar, ikon + label di bawah — gaya "icon launcher" iOS ───────── */
function Tile({ url, icon: Icon, color, label, labelColor }) {
  const active = isValidUrl(url);
  const body = (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, width:46 }}>
      <div style={{
        width:42, height:42, borderRadius:13,
        background: active ? `${color}16` : "#F1F5F9",
        border: `1px solid ${active ? `${color}35` : "#E2E8F0"}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        color: active ? color : "#CBD5E1",
        transition:"transform .15s, box-shadow .15s",
        flexShrink:0,
      }}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <span style={{
        fontSize:10, fontWeight:600, textAlign:"center", lineHeight:1.2,
        color: labelColor ?? (active ? "#475569" : "#CBD5E1"), whiteSpace:"nowrap",
        overflow:"hidden", textOverflow:"ellipsis", maxWidth:46,
      }}>
        {label}
      </span>
    </div>
  );

  if (!active) return <div style={{ cursor:"default" }} title={label}>{body}</div>;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={label}
      onClick={e => e.stopPropagation()}
      style={{ textDecoration:"none" }}
      onMouseEnter={e => e.currentTarget.firstChild.style.transform = "scale(1.08)"}
      onMouseLeave={e => e.currentTarget.firstChild.style.transform = "scale(1)"}>
      {body}
    </a>
  );
}

/**
 * Grid ikon+label besar (gaya iOS). Menampilkan maksimal `max` kanal (default 5).
 * Kalau masih ada sisa, tile terakhir dalam baris yang sama cukup ikon panah
 * (tanpa label) — sejajar dengan tile ikon lainnya, menuju halaman Detail Proyek.
 */
export function LinkTiles({ row, lang, max = 5, onViewMore, centered = false, labelColor }) {
  const t = (id, en) => lang === "id" ? id : en;
  const items = linkItems(row, t);
  const shown = items.slice(0, max);
  const rest  = items.length - shown.length;

  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"flex-start", justifyContent: centered ? "center" : "flex-start" }}>
      {shown.map(({ key, ...item }) => <Tile key={key} {...item} labelColor={labelColor} />)}
      {rest > 0 && (
        <button onClick={() => onViewMore?.(row.id)}
          title={t(`Lihat ${rest} tautan lainnya`, `See ${rest} more link${rest > 1 ? "s" : ""}`)}
          style={{
            width:42, height:42, borderRadius:13, marginTop:0,
            background:"#F1F5F9", border:"1px solid #E2E8F0",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#059669", cursor: onViewMore ? "pointer" : "default",
            flexShrink:0, padding:0,
          }}>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

/* ─── Versi ringkas (ikon kecil saja) — untuk baris tabel yang padat ────── */
export function LinkChips({ row, lang, size = 12 }) {
  const t = (id, en) => lang === "id" ? id : en;
  const items = linkItems(row, t);

  return (
    <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
      {items.map(({ key, url, icon: Icon, color, label }) => {
        const active = isValidUrl(url);
        const style = {
          width:24, height:24, borderRadius:6, display:"flex", alignItems:"center",
          justifyContent:"center", flexShrink:0, transition:"transform .12s",
          background: active ? `${color}14` : "#F1F5F9",
          border: `1px solid ${active ? `${color}30` : "#E2E8F0"}`,
          color: active ? color : "#CBD5E1",
        };
        return active ? (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer" title={label}
            onClick={e => e.stopPropagation()} style={style}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            <Icon size={size} strokeWidth={2} />
          </a>
        ) : (
          <div key={key} title={label} style={style}>
            <Icon size={size} strokeWidth={2} />
          </div>
        );
      })}
    </div>
  );
}
