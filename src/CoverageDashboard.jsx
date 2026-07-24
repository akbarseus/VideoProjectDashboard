import { lazy, memo, Suspense, useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  AlertCircle, X, ChevronDown, Calendar, ArrowUpRight, TrendingUp,
} from "lucide-react";
import {
  FilmSlate, ChartPieSlice, FolderNotchOpenIcon as FolderNotchOpen, CalendarCheck,
  VideoCamera, Scissors, ClipboardText,
} from "@phosphor-icons/react";
import { filterByYear, YEARS, DEFAULT_YEAR, CURRENT_YEAR_STR, formatDateDMY } from "./useVideoProjects";
import { YoutubeIcon } from "./socialIcons";
import { isPreviewEligible, LinkPreviewButton } from "./LinkTiles";
import { CALENDAR_URL } from "./config/env";
import { DASHBOARD_COLORS } from "./styles/theme";

const CoverageAreaMap = lazy(() => import("./CoverageAreaMap"));

// Sementara redirect ke file Drive — nanti diganti kalender week-view hasil
// ekstraksi PDF Kalender Digital Bank Sinarmas 2026 (ditunda, lihat HANDOFF.md).
export { CALENDAR_URL };

/* ─── PALETTE ───────────────────────────────────────────────────────────── */
const C = {
  ...DASHBOARD_COLORS,
  bg:         "#F7F9FC",
  surface:    "#FFFFFF",
  border:     "#E4E9F2",
  borderSoft: "#F0F4FA",
  textH:      "#0A0F1E",
  text:       "#2D3748",
  textSec:    "#5C6784",
  textMut:    "#9BA3B8",
  teal:       "#3EBDAC",
  tealDark:   "#2AA897",
  sh1: "0 1px 2px rgba(10,15,30,0.04), 0 4px 12px rgba(10,15,30,0.06)",
  sh2: "0 2px 8px rgba(10,15,30,0.06), 0 12px 32px rgba(10,15,30,0.08)",
};

/* ─── COUNT-UP ANIMATION ────────────────────────────────────────────────── */
const COUNT_UP_FRAME_MS = 1000 / 30;
const countUpSubscribers = new Set();
let countUpFrameId = null;
let lastCountUpFrame = 0;

function runCountUpFrame(timestamp) {
  if (timestamp - lastCountUpFrame >= COUNT_UP_FRAME_MS) {
    lastCountUpFrame = timestamp;
    countUpSubscribers.forEach(subscriber => {
      if (!subscriber(timestamp)) countUpSubscribers.delete(subscriber);
    });
  }

  countUpFrameId = countUpSubscribers.size > 0
    ? requestAnimationFrame(runCountUpFrame)
    : null;
}

function subscribeCountUp(subscriber) {
  countUpSubscribers.add(subscriber);
  if (countUpFrameId == null) countUpFrameId = requestAnimationFrame(runCountUpFrame);
  return () => countUpSubscribers.delete(subscriber);
}

// Dashboard di-unmount total tiap pindah ke halaman lain (lihat AppRoutes.jsx
// — conditional render, bukan hidden-via-CSS), jadi tiap balik ke Dashboard
// KpiCard/PipeCard mount ulang dari 0. TANPA flag ini, angka akan replay
// count-up dari 0 setiap kali user pindah Data->Dashboard->Data->Dashboard,
// terasa mengganggu (dilaporkan user). Modul-level (bukan state) SENGAJA —
// harus bertahan lintas mount/unmount Dashboard, cukup direset kalau
// reload/tab baru (sesi baru).
let sessionCountUpDone = false;

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(() => sessionCountUpDone ? target : 0);
  const valueRef = useRef(sessionCountUpDone ? target : 0);

  useEffect(() => {
    if (sessionCountUpDone || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      valueRef.current = target;
      setVal(target);
      return undefined;
    }

    const from = valueRef.current;
    if (from === target) return undefined;

    let start = null;
    const step = timestamp => {
      if (start == null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (target - from) * eased);

      if (next !== valueRef.current) {
        valueRef.current = next;
        setVal(next);
      }

      return progress < 1;
    };

    const unsubscribe = subscribeCountUp(step);
    // Safety net: kalau requestAnimationFrame tidak jalan (tab background /
    // rAF di-throttle browser), angka wajib tetap sampai ke nilai akhir —
    // KPI tidak boleh macet di 0.
    const snap = setTimeout(() => {
      if (valueRef.current !== target) {
        valueRef.current = target;
        setVal(target);
      }
    }, duration + 300);

    return () => {
      unsubscribe();
      clearTimeout(snap);
    };
  }, [target, duration]);

  return val;
}

/* ─── LEVEL METRICS — seluruh logic pakai statusLevel (LX/L0-L5) mentah +
   statusVideoRaw (teks dropdown apa adanya), TANPA normalizeStatus lama ──── */
const DOCUMENTED_LEVELS = new Set(["L2", "L3", "L4", "L5"]);
const REVIEW_STATUSES   = new Set(["Internal Review", "Client Review"]);

function levelMetrics(rows) {
  const count = fn => rows.filter(fn).length;
  const total = rows.length;
  const documented = count(r => DOCUMENTED_LEVELS.has(r.statusLevel));
  return {
    total,
    published:  count(r => r.statusLevel === "L5"),
    documented,
    docPct:     total ? Math.round((documented / total) * 100) : 0,
    scheduled:  count(r => r.statusLevel === "L4"),
    onDocSched: count(r => r.statusLevel === "L1"),
    editing:    count(r => r.statusLevel === "L3" && r.statusVideoRaw === "Editing"),
    onReview:   count(r => r.statusLevel === "L3" && REVIEW_STATUSES.has(r.statusVideoRaw)),
  };
}

/* Urutan fallback: tahun terbaru dulu, lalu nama A-Z */
function byYearName(a, b) {
  const ya = Number(a.year) || 0;
  const yb = Number(b.year) || 0;
  if (yb !== ya) return yb - ya;
  return a.name.localeCompare(b.name);
}

/* "Latest Publication": tanggal tayang terbaru dulu; baris tanpa tanggal
   valid jatuh ke belakang dgn urutan fallback tahun/nama. */
function byTanggalTayang(a, b) {
  const ta = Date.parse(String(a.tanggalTayang || "").trim());
  const tb = Date.parse(String(b.tanggalTayang || "").trim());
  const va = Number.isNaN(ta) ? null : ta;
  const vb = Number.isNaN(tb) ? null : tb;
  if (va != null && vb != null) return vb - va;
  if (va != null) return -1;
  if (vb != null) return 1;
  return byYearName(a, b);
}

/* ─── KATEGORI — satu sumber utk kartu, list, dan drawer ─────────────────
   Copy bilingual mengikuti prinsip ux-copy: label = apa isinya (bukan jargon
   internal), sub = kalimat bantu satu baris utk drawer. */
function getCategories(t) {
  return {
    published: {
      icon: FilmSlate, colorKey: "green",
      label: t("Portofolio Terpublikasi", "Portfolio Project Published"),
      sub:   t("Video yang sudah tayang untuk publik", "Videos already live for the public"),
      filter: r => r.statusLevel === "L5",
      sort: byTanggalTayang,
      accessory: "youtube",
    },
    documentedPct: {
      icon: ChartPieSlice, colorKey: "teal",
      label: t("Video Terdokumentasi dari Total Proyek", "Documented Video of Total Project"),
      sub:   t("Proyek yang sudah melewati tahap dokumentasi", "Projects past the documentation stage"),
      filter: r => DOCUMENTED_LEVELS.has(r.statusLevel),
      sort: byYearName,
      accessory: "badge",
    },
    documented: {
      icon: FolderNotchOpen, colorKey: "amber",
      label: t("Proyek Terdokumentasi", "Projects Documented"),
      sub:   t("Proyek yang sudah melewati tahap dokumentasi", "Projects past the documentation stage"),
      filter: r => DOCUMENTED_LEVELS.has(r.statusLevel),
      sort: byYearName,
      accessory: "badge",
    },
    scheduled: {
      icon: CalendarCheck, colorKey: "violet",
      label: t("Terjadwal Tayang", "Scheduled to Publish"),
      sub:   t("Video siap — menunggu jadwal rilis", "Video ready — waiting for its release slot"),
      filter: r => r.statusLevel === "L4",
      sort: byYearName,
      accessory: "badge",
    },
    onDocSched: {
      icon: VideoCamera, colorKey: "blueSch",
      label: t("Jadwal Dokumentasi", "On Documentation Schedule"),
      sub:   t("Menunggu giliran shooting ke lokasi", "Waiting for its on-site shoot"),
      filter: r => r.statusLevel === "L1",
      sort: byYearName,
      accessory: "badge",
    },
    editing: {
      icon: Scissors, colorKey: "amber",
      label: t("Proses Editing", "Editing Process"),
      sub:   t("Footage sedang dipotong & dirangkai", "Footage being cut and assembled"),
      filter: r => r.statusLevel === "L3" && r.statusVideoRaw === "Editing",
      sort: byYearName,
      accessory: "badge",
    },
    onReview: {
      icon: ClipboardText, colorKey: "teal",
      label: t("Dalam Review", "On Review"),
      sub:   t("Menunggu persetujuan internal atau klien", "Awaiting internal or client approval"),
      filter: r => r.statusLevel === "L3" && REVIEW_STATUSES.has(r.statusVideoRaw),
      sort: byYearName,
      accessory: "badge",
    },
    onProcess: {
      icon: Scissors, colorKey: "amber",
      label: t("Sedang Diproses", "On Process"),
      sub:   t("Editing, review internal, dan review klien", "Editing, internal review, and client review"),
      filter: r => r.statusLevel === "L3",
      sort: byYearName,
      accessory: "badge",
    },
    recentDoc: {
      icon: FolderNotchOpen, colorKey: "amber",
      label: t("Dokumentasi Terbaru", "Recent Documentation"),
      sub:   t("Baru terdokumentasi — belum masuk editing", "Freshly documented — not yet in editing"),
      filter: r => r.statusLevel === "L2",
      sort: byYearName,
      accessory: "folder",
    },
  };
}

function catColors(cat) {
  const color = C[cat.colorKey] ?? C.teal;
  const bg = C[`${cat.colorKey}Bg`] ?? C[`${cat.colorKey}Light`] ?? C.tealBg ?? "#EEF7F6";
  return { color, bg };
}

/* Badge warna utk teks statusVideoRaw di list "Sedang Diproses" & drawer */
function badgeStyle(raw) {
  const map = {
    "Editing":         { color: C.amber,   bg: C.amberBg ?? C.amberLight },
    "Internal Review": { color: C.tealDark, bg: C.tealBg ?? "#E8F8F6" },
    "Client Review":   { color: C.blueSch, bg: C.blueSchBg ?? C.blueSchLight },
  };
  return map[raw] ?? { color: C.textSec, bg: C.borderSoft };
}

/* ─── YEAR DROPDOWN ─────────────────────────────────────────────────────── */
function yearLabel(y, t) {
  if (y === "all") return t("Semua Waktu","All Time");
  if (y === CURRENT_YEAR_STR) return t("Tahun Ini","This Year");
  return y;
}

const YEAR_MENU_WIDTH = 160;

function YearDropdown({ value, onChange, lang }) {
  const t = (id, en) => lang === "id" ? id : en;
  const [open, setOpen] = useState(false);
  // Menu nempel kanan tombol; kalau tombol kebawa wrap ke sisi kiri layar
  // sempit, anchor dibalik supaya menu tidak meluber keluar viewport kiri.
  const [align, setAlign] = useState("right");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggleOpen = () => {
    setOpen(o => {
      const next = !o;
      if (next && ref.current) {
        const r = ref.current.getBoundingClientRect();
        setAlign(r.right - YEAR_MENU_WIDTH < 8 ? "left" : "right");
      }
      return next;
    });
  };

  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0, zIndex: open ? 60 : "auto" }}>
      <button onClick={toggleOpen} style={{
        display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
        border:"1px solid rgba(255,255,255,0.6)", borderRadius:10,
        background:"#FFFFFF",
        fontSize:12, fontWeight:700, color: C.textH, cursor:"pointer",
        boxShadow: "0 2px 12px rgba(15,23,42,0.1)", transition:"border-color .15s",
      }}>
        {yearLabel(value, t)}
        <ChevronDown size={13} color={C.textMut} style={{
          transform: open ? "rotate(180deg)" : "none", transition:"transform .15s" }} />
      </button>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)",
          left: align === "left" ? 0 : "auto", right: align === "right" ? 0 : "auto",
          zIndex:999,
          background:"rgba(255,255,255,0.9)",
          backdropFilter:"blur(20px) saturate(1.8)", WebkitBackdropFilter:"blur(20px) saturate(1.8)",
          border:"1px solid rgba(255,255,255,0.6)", borderRadius:14,
          boxShadow:"0 12px 40px rgba(15,23,42,0.18)", padding:6, minWidth:160,
          maxHeight:240, overflowY:"auto",
        }}>
          {YEARS.map(y => (
            <div key={y} onClick={() => { onChange(y); setOpen(false); }}
              style={{
                padding:"8px 12px", borderRadius:8, cursor:"pointer",
                fontSize:13, fontWeight: y === value ? 700 : 500,
                color: y === value ? C.green : C.text,
                background: y === value ? "rgba(5,150,105,0.14)" : "transparent",
              }}
              onMouseEnter={e => { if (y !== value) e.currentTarget.style.background = "rgba(15,23,42,0.05)"; }}
              onMouseLeave={e => { if (y !== value) e.currentTarget.style.background = "transparent"; }}>
              {yearLabel(y, t)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── ROW PROYEK — dipakai list & drawer, klik → halaman Data ────────────── */
function RowAccessory({ row, type, t, compact }) {
  if (type === "youtube") {
    return (
      <span style={{
        width:26, height:26, borderRadius:8, background:"#FF0000",
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      }}>
        <YoutubeIcon size={13} color="#fff" />
      </span>
    );
  }
  if (type === "folder") {
    return (
      <span style={{
        width:26, height:26, borderRadius:8, background: C.amberBg ?? C.amberLight,
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      }}>
        <FolderNotchOpen size={15} weight="duotone" color={C.amber} />
      </span>
    );
  }
  // default: badge teks statusVideoRaw apa adanya (Editing/Internal Review/…)
  const raw = row.statusVideoRaw;
  if (!raw || raw.toLowerCase() === "n/a") return null;
  const s = badgeStyle(raw);

  // `compact`: dipakai di hover-panel (HoverRow) — nama proyek harus dapat
  // ruang penuh, jadi status cukup dot kecil + tooltip (bukan teks penuh yg
  // bisa menghabiskan lebar baris pada status panjang spt "On Schedule
  // Shooting"). Ini sengaja BEDA dari badge teks penuh di ProjectRow biasa
  // (lists/drawer) — di sana lebar baris cukup lapang utk teks penuh.
  if (compact) {
    return (
      <span title={t(raw, raw)} aria-label={t(raw, raw)} style={{
        width:8, height:8, borderRadius:"50%", background:s.color,
        flexShrink:0, display:"inline-block",
      }} />
    );
  }

  return (
    <span style={{
      padding:"3px 10px", borderRadius:20, flexShrink:0,
      fontSize:10.5, fontWeight:700, color:s.color, background:s.bg,
      whiteSpace:"nowrap",
    }}>
      {t(raw, raw)}
    </span>
  );
}

// 4 kategori Pipeline punya attribut list yang disederhanakan (revisi
// dashboard-tipe-kpi-and-list-revisions): tiap kategori cuma menampilkan
// Nama + SATU attribut relevan (tanggal/status), bukan industry·tahun +
// badge lengkap seperti kategori KPI (published/documented). Berlaku di
// HoverRow (preview) MAUPUN ProjectRow (drawer) — satu sumber kebenaran.
const SIMPLIFIED_PIPELINE_KEYS = new Set(["onDocSched", "editing", "onReview", "scheduled"]);

function pipelineSecondary(catKey, row) {
  if (catKey === "onDocSched") return row.tanggalDokumentasi ? formatDateDMY(row.tanggalDokumentasi) : "";
  if (catKey === "scheduled") return row.tanggalTayang ? formatDateDMY(row.tanggalTayang) : "";
  return "";
}

/* ─── HOVER-EXPAND MINI ROW — versi ringkas ProjectRow khusus dipakai di
   dalam kpi-hover-panel/pipe-hover-panel (req #9/#11 hero-pipeline-redesign).
   Terpisah dari ProjectRow (bukan reuse) karena ProjectRow hard-code warna
   tema terang lewat inline style — tidak bisa dioverride CSS utk versi
   "dark" (dipakai dalam pipe-card glass gelap). `dark` prop pilih palet. */
function HoverRow({ row, accessory, catKey, onOpenDetail, t, last, dark }) {
  const simplified = SIMPLIFIED_PIPELINE_KEYS.has(catKey);
  const isReview = catKey === "onReview";
  const secondary = simplified && !isReview ? pipelineSecondary(catKey, row) : "";
  const showAccessory = !simplified;
  return (
    <button className={`hp-row${dark ? " hp-row-dark" : ""}`} onClick={() => onOpenDetail(row.id)}
      style={{ borderBottom: last ? "none" : `1px solid ${dark ? "rgba(255,255,255,0.14)" : C.borderSoft}` }}>
      <span className="hp-row-text">
        <span className="hp-row-name">{row.name}</span>
        {secondary && <span className="hp-row-sub">{secondary}</span>}
        {/* onReview: badge status teks penuh (Client Review/Internal Review)
            DI BAWAH nama (bukan sejajar di samping) — supaya nama proyek
            tidak kepotong/terpotong ellipsis oleh lebar badge, dilaporkan
            user. Ditaruh di dalam kolom hp-row-text yg sama, bukan sbg
            accessory kanan terpisah. */}
        {isReview && <span className="hp-row-status"><RowAccessory row={row} type={accessory} t={t} /></span>}
      </span>
      {showAccessory && <RowAccessory row={row} type={accessory} t={t} compact />}
    </button>
  );
}

// Hover-panel tampil SESUAI JUMLAH DATA ASLI, maksimal 5 baris — TIDAK ada
// placeholder kosong kalau datanya kurang dari 5 (revisi: sebelumnya sempat
// dipaksa selalu 5 slot + placeholder, user minta balik ke "as it is sesuai
// data saja"). Kalau datanya 1, ya tampil 1 baris saja.
const HOVER_SLOT_COUNT = 5;

function HoverRowSlots({ rows, accessory, catKey, onOpenDetail, t, dark }) {
  if (rows.length === 0) {
    return <div className={`hp-empty${dark ? " hp-empty-dark" : ""}`}>{t("Belum ada proyek.","No projects yet.")}</div>;
  }
  return rows.map((r, i) => (
    <HoverRow key={r.id} row={r} accessory={accessory} catKey={catKey} onOpenDetail={onOpenDetail} t={t}
      last={i === rows.length - 1} dark={dark} />
  ));
}

// memo: baris list/drawer tidak perlu ikut re-render saat state parent
// (drawer, filter tahun, count-up) berubah — datanya sama.
const ProjectRow = memo(function ProjectRow({ row, accessory, catKey, onOpenDetail, t, last }) {
  const simplified = SIMPLIFIED_PIPELINE_KEYS.has(catKey);
  const isReview = catKey === "onReview";
  const secondary = simplified && !isReview
    ? pipelineSecondary(catKey, row)
    : "";
  const showAccessory = !simplified;
  return (
    <button className="lst-row" onClick={() => onOpenDetail(row.id)}
      style={{ borderBottom: last ? "none" : `1px solid ${C.borderSoft}` }}>
      <span style={{ flex:1, minWidth:0 }}>
        {/* Warna diatur via CSS (bukan inline) — inline style mengalahkan
            selector :hover, bikin efek hover-ke-primary tidak pernah menang. */}
        <span className="lst-row-name" style={{ display:"block", fontSize:13, fontWeight:650,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {row.name}
        </span>
        {secondary && (
          <span style={{ display:"block", fontSize:11, color:C.textSec, marginTop:1 }}>
            {secondary}
          </span>
        )}
        {/* onReview: badge status DI BAWAH nama, bukan sejajar di kanan —
            konsisten dgn HoverRow (dilaporkan user: nama kepotong ellipsis
            kalau badge sejajar di samping). */}
        {isReview && (
          <span style={{ display:"block", marginTop:4 }}>
            <RowAccessory row={row} type={accessory} t={t} />
          </span>
        )}
      </span>
      <span style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        {isPreviewEligible(row) && <LinkPreviewButton url={row.linkPreview} t={t} />}
        {showAccessory && <RowAccessory row={row} type={accessory} t={t} />}
      </span>
    </button>
  );
});

/* ─── DRAWER — slide-in daftar lengkap per kategori ─────────────────────── */
function CategoryDrawer({ cat, catKey, count, rows, onClose, onOpenDetail, t }) {
  const { color, bg } = catColors(cat);
  const Icon = cat.icon;

  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);

    // "overflow:hidden" saja tidak cukup di iOS Safari — body dikunci dgn
    // position:fixed di posisi scroll sekarang, dikembalikan saat tutup.
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [onClose]);

  return (
    <>
      {/* z-index 1200/1201 — HARUS di atas SEMUA layer lain di app ini (hover
          panel kpi-card-wrap:hover 1100, kontrol Leaflet 1000, menu
          YearDropdown 999), bukan cuma di atas konten biasa. Sebelumnya cuma
          400/401 — lebih RENDAH dari .coverage-map-actions (700) di peta,
          jadi tombol fullscreen peta "menembus" ke atas drawer yang lagi
          terbuka (drawer overlay tidak me-resize layout di baliknya, cuma
          menutupi sebagian layar, jadi elemen absolute di balik drawer yang
          z-index-nya lebih tinggi tetap kelihatan). Dilaporkan user. */}
      <div onClick={onClose} style={{
        position:"fixed", inset:0, background:"rgba(15,23,42,0.2)",
        zIndex:1200, animation:"drwFade .2s ease",
      }} />
      <div className="drawer-panel" style={{
        position:"fixed", top:0, right:0, bottom:0, zIndex:1201,
        width:"min(420px,100vw)",
        boxShadow:"-12px 0 48px rgba(15,23,42,0.12)",
        display:"flex", flexDirection:"column",
        animation:"drwSlide .25s cubic-bezier(.4,0,.2,1)",
      }}>
        <div style={{
          padding:"20px 20px 16px", paddingTop:"calc(20px + env(safe-area-inset-top, 0px))",
          borderBottom:`1px solid ${C.border}`, flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:bg,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon size={19} weight="duotone" color={color} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700, color: C.textH, lineHeight:1.3 }}>{cat.label}</div>
              <div style={{ fontSize:12, color: C.textSec, marginTop:3 }}>
                {count} {t("proyek","projects")} · {cat.sub}
              </div>
            </div>
            <button onClick={onClose}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${C.border}`,
                background:"none", cursor:"pointer", display:"flex", alignItems:"center",
                justifyContent:"center", flexShrink:0, color: C.textSec }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="drawer-list" style={{ flex:1, overflowY:"auto", padding:"4px 0" }}>
          {rows.length === 0 ? (
            <div style={{ padding:32, textAlign:"center", color: C.textSec, fontSize:13 }}>
              {t("Belum ada proyek di kategori ini untuk periode terpilih.",
                 "No projects in this category for the selected period.")}
            </div>
          ) : rows.map((r, i) => (
            <div key={r.id} style={{ padding:"0 8px" }}>
              <ProjectRow row={r} accessory={cat.accessory} catKey={catKey} onOpenDetail={onOpenDetail} t={t}
                last={i === rows.length - 1} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* Widget "Hari Ini" pindah ke pojok kanan top-nav (App.jsx, hover popover) —
   kartu versi lama di halaman ini dihapus supaya deck KPI dapat lebar penuh
   dan angka-angkanya lebih menonjol. */

/* ─── KPI DECK — panel gelap berisi 3 KPI utama + 4 kartu pipeline ───────── */
// Card persen (documentedPct) TIDAK pernah expand-hover (req #10) — cuma
// published & documented yang punya preview list.
// KEMBALI ke overlay terpisah (opacity + transform + transition) — versi
// "card asli melebar/tumbuh di tempat" (grid-template-rows dgn <span>)
// ternyata masih bocor konten (span inline tidak clip overflow dgn benar),
// dicoba beberapa kali tidak stabil. User minta balik ke settingan overlay
// yang sudah pernah terbukti jalan sebelumnya.
function KpiCard({ cat, value, isPct, onOpen, onOpenDetail, catKey, denom, previewRows, t }) {
  const { color, bg } = catColors(cat);
  const Icon = cat.icon;
  const animated = useCountUp(value, 900);
  const showPreview = catKey !== "documentedPct";
  return (
    <div className="kpi-card-wrap">
      <button className="kpi-card" onClick={() => onOpen(catKey)} title={cat.sub}>
        <span className="kpi-num">{animated}{isPct ? "%" : ""}</span>
        {denom && <span className="kpi-denom">{denom}</span>}
        <span className="kpi-foot">
          <span className="kpi-label">{cat.label}</span>
          <span className="kpi-chip" style={{ background:bg }}>
            <Icon size={22} weight="duotone" color={color} />
          </span>
        </span>
      </button>
      {showPreview && (
        <div className="kpi-hover-panel" onClick={e => e.stopPropagation()}>
          <div className="hp-top">
            <span className="kpi-num hp-num">{animated}{isPct ? "%" : ""}</span>
            <span className="kpi-chip" style={{ background:bg }}>
              <Icon size={22} weight="duotone" color={color} />
            </span>
          </div>
          <div className="kpi-label">{cat.label}</div>
          {denom && <div className="kpi-denom">{denom}</div>}
          <div className="hp-divider" />
          <HoverRowSlots rows={previewRows} accessory={cat.accessory} catKey={catKey} onOpenDetail={onOpenDetail} t={t} />
          <button className="hp-seeall" onClick={() => onOpen(catKey)}>
            {t("Lihat semua","See all")} <ArrowUpRight size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

function PipeCard({ cat, value, onOpen, onOpenDetail, catKey, previewRows, t }) {
  const { color, bg } = catColors(cat);
  const Icon = cat.icon;
  const animated = useCountUp(value, 800);
  return (
    <div className="pipe-card-wrap">
      <button className="pipe-card" onClick={() => onOpen(catKey)} title={cat.sub}>
        <span className="pipe-num">{animated}</span>
        <span className="pipe-foot">
          <span className="pipe-label">{cat.label}</span>
          <span className="pipe-chip" style={{ background:bg }}>
            <Icon size={16} weight="duotone" color={color} />
          </span>
        </span>
      </button>
      <div className="pipe-hover-panel" onClick={e => e.stopPropagation()}>
        <div className="hp-top">
          <span className="pipe-num hp-num">{animated}</span>
          <span className="pipe-chip" style={{ background:bg }}>
            <Icon size={16} weight="duotone" color={color} />
          </span>
        </div>
        <div className="pipe-label hp-pipe-label">{cat.label}</div>
        <div className="hp-divider hp-divider-dark" />
        <HoverRowSlots rows={previewRows} accessory={cat.accessory} catKey={catKey} onOpenDetail={onOpenDetail} t={t} dark />
        <button className="hp-seeall hp-seeall-dark" onClick={() => onOpen(catKey)}>
          {t("Lihat semua","See all")} <ArrowUpRight size={11} />
        </button>
      </div>
    </div>
  );
}

/* Video Progress Overall — panel gelap TEAL, terikat filter tahun. Section
   ini dan PipelineDeck (di bawah) SENGAJA 2 panel terpisah (gap + rounded
   corner masing-masing), BUKAN 1 panel menyatu — supaya jelas kelihatan
   sebagai 2 kelompok data yang berbeda sifat (hasil vs acuan progress
   mingguan yang sedang berjalan). */
const KpiDeck = memo(function KpiDeck({ m, cats, year, onYearChange, onOpen, onOpenDetail, hoverRows, denomText, lang }) {
  const t = (id, en) => lang === "id" ? id : en;
  return (
    <div className="kpi-deck">
      <div style={{ position:"absolute", inset:0, overflow:"hidden", borderRadius:20, pointerEvents:"none" }}>
        <div style={{
          position:"absolute", top:-70, left:-50, width:240, height:240,
          background:"radial-gradient(circle, rgba(62,189,172,0.22) 0%, transparent 70%)",
        }} />
        <div style={{
          position:"absolute", bottom:-90, right:-40, width:260, height:260,
          background:"radial-gradient(circle, rgba(62,189,172,0.14) 0%, transparent 70%)",
        }} />
      </div>

      <div className="kpi-deck-head">
        <div>
          <div className="kpi-deck-eyebrow">{t("Rekap produksi","Production recap")}</div>
          <div className="kpi-deck-title">{t("Video Progress Overall","Video Progress Overall")}</div>
        </div>
        <div className="hl-yd-desktop">
          <YearDropdown value={year} onChange={onYearChange} lang={lang} />
        </div>
        <div className="kpi-yd-mobile">
          <YearDropdown value={year} onChange={onYearChange} lang={lang} />
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard cat={cats.published}     value={m.published}  onOpen={onOpen} onOpenDetail={onOpenDetail}
          catKey="published" denom={denomText.published} previewRows={hoverRows.published} t={t} />
        <KpiCard cat={cats.documented}    value={m.documented} onOpen={onOpen} onOpenDetail={onOpenDetail}
          catKey="documented" denom={denomText.documented} previewRows={hoverRows.documented} t={t} />
        <KpiCard cat={cats.documentedPct} value={m.docPct} isPct onOpen={onOpen} onOpenDetail={onOpenDetail}
          catKey="documentedPct" denom={denomText.documentedPct} previewRows={[]} t={t} />
      </div>
    </div>
  );
});

/* Video Production Pipeline — panel gelap TERPISAH, warna graphite/slate
   (BUKAN teal, lihat pipeDeck/pipeDeckSoft di styles/theme.js) supaya
   "objectively distinct" dari panel KPI di atas — angka di sini acuan update
   progress mingguan, selalu all-time (pipelineMetrics = levelMetrics(allRows)
   di komponen utama), tidak terikat filter tahun manapun. */
const PipelineDeck = memo(function PipelineDeck({ pipelineMetrics, cats, onOpen, onOpenDetail, hoverRows, lang }) {
  const t = (id, en) => lang === "id" ? id : en;
  return (
    <div className="pipe-deck">
      <div className="pipe-label-row">
        <div>
          <div className="pipe-deck-title">{t("Video Production Pipeline","Video Production Pipeline")}</div>
          <span className="pipe-label-hint">{t("urut alur kerja","in workflow order")}</span>
        </div>
      </div>
      <div className="pipe-grid">
        <PipeCard cat={cats.onDocSched} value={pipelineMetrics.onDocSched} onOpen={onOpen} onOpenDetail={onOpenDetail}
          catKey="onDocSched" previewRows={hoverRows.onDocSched} t={t} />
        <PipeCard cat={cats.editing}    value={pipelineMetrics.editing}    onOpen={onOpen} onOpenDetail={onOpenDetail}
          catKey="editing" previewRows={hoverRows.editing} t={t} />
        <PipeCard cat={cats.onReview}   value={pipelineMetrics.onReview}   onOpen={onOpen} onOpenDetail={onOpenDetail}
          catKey="onReview" previewRows={hoverRows.onReview} t={t} />
        <PipeCard cat={cats.scheduled}  value={pipelineMetrics.scheduled}  onOpen={onOpen} onOpenDetail={onOpenDetail}
          catKey="scheduled" previewRows={hoverRows.scheduled} t={t} />
      </div>
    </div>
  );
});

/* ─── CARD WRAPPER ──────────────────────────────────────────────────────── */
function Card({ children, style }) {
  return (
    <div className="ui-card" style={{
      background: C.surface, border:`1px solid ${C.border}`, borderRadius:18,
      padding:"20px 20px 18px",
      boxShadow: C.sh1,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── SECTION HEADER ────────────────────────────────────────────────────── */
function SectionHead({ label, desc }) {
  return (
    <div className="sec-head" style={{ marginBottom:10 }}>
      <div className="sec-title ui-section-title">{label}</div>
      {desc && <div style={{ fontSize:12, color: C.textSec, lineHeight:1.4, marginTop:2 }}>{desc}</div>}
    </div>
  );
}

/* ─── IDLE-READY + DESKTOP GATE utk peta ────────────────────────────────── */
function useIdleReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => setReady(true), { timeout: 800 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(() => setReady(true), 80);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return ready;
}

// Breakpoint sama dgn widget "Hari Ini" (min-width 769px). Peta HARUS
// benar-benar tidak dirender di mobile — Leaflet gagal render tile kalau
// container di-inisialisasi saat display:none/lebar 0.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 769px)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 769px)");
    const onChange = e => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

function useNearViewport(enabled) {
  const [near, setNear] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    if (!("IntersectionObserver" in window)) { setNear(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNear(true);
        observer.disconnect();
      }
    }, { rootMargin: "320px 0px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [enabled]);
  return [ref, near];
}

function MapFallback({ lang }) {
  const t = (id, en) => lang === "id" ? id : en;
  return (
    <Card style={{ padding: "14px 16px 12px" }} aria-busy="true" aria-label={t("Memuat peta", "Loading map")}>
      <div className="coverage-map-box coverage-map-skeleton" />
    </Card>
  );
}

const YearlyDocumentationChart = memo(function YearlyDocumentationChart({ rows, lang }) {
  const t = (id, en) => lang === "id" ? id : en;
  const [hoveredYear, setHoveredYear] = useState(null);
  const points = useMemo(() => {
    const grouped = new Map();
    rows.forEach(row => {
      const year = String(row.year || "").trim();
      if (/^\d{4}$/.test(year)) grouped.set(year, (grouped.get(year) || 0) + 1);
    });
    return [...grouped.entries()].sort(([a], [b]) => Number(a) - Number(b));
  }, [rows]);
  const max = Math.max(1, ...points.map(([, value]) => value));
  return (
    <Card style={{ padding: "18px 18px 14px", height: "100%" }}>
      <div className="year-chart-head">
        <div>
          <div className="year-chart-title">{t("Proyek terdokumentasi", "Documented projects")}</div>
          <div className="year-chart-subtitle">{t("Pertahun · seluruh data", "Per year · all records")}</div>
        </div>
        <span className="year-chart-icon" aria-hidden="true"><TrendingUp size={16} /></span>
      </div>
      {points.length === 0 ? (
        <div className="year-chart-empty">{t("Belum ada data tahun.", "No yearly data yet.")}</div>
      ) : (
        <div className="year-chart" role="img" aria-label={t("Jumlah proyek per tahun", "Project count by year")}>
          <div className="year-chart-bars">
            {points.map(([year, value]) => (
              <div className={`year-chart-col ${hoveredYear === year ? "is-hovered" : ""}`} key={year}
                onMouseEnter={() => setHoveredYear(year)} onMouseLeave={() => setHoveredYear(null)}>
                <span className="year-chart-value">{value}</span>
                <div className="year-chart-track">
                  {hoveredYear === year && <span className="year-chart-tooltip">{value} {t("proyek", "projects")}</span>}
                  <div className="year-chart-bar" style={{ height: `${Math.max(10, value / max * 100)}%` }} />
                </div>
                <span className="year-chart-label">{year}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});

const CoverageInsights = memo(function CoverageInsights({ ready, lang, allRows, isDesktop }) {
  const [mapRef, mapNear] = useNearViewport(isDesktop);
  if (!isDesktop) return null;
  const t = (id, en) => lang === "id" ? id : en;
  return (
    <div className="coverage-insights-grid">
      <div><SectionHead label={t("Dokumentasi pertahun", "Yearly documentation")} /><YearlyDocumentationChart rows={allRows} lang={lang} /></div>
      <div ref={mapRef}><SectionHead label={t("Coverage Area", "Coverage Area")} />{ready && mapNear ? <Suspense fallback={<MapFallback lang={lang} />}><CoverageAreaMap lang={lang} rows={allRows} /></Suspense> : <MapFallback lang={lang} />}</div>
    </div>
  );
});

/* ─── MAIN PAGE ─────────────────────────────────────────────────────────── */
export default function CoverageDashboard({ lang = "id", data: videoData, onOpenDetail }) {
  const t = (id, en) => lang === "id" ? id : en;

  const { rows: allRows, error } = videoData;
  // Persist di sessionStorage (bukan cuma useState) — Dashboard di-unmount
  // total tiap pindah ke halaman lain (lihat AppRoutes.jsx), jadi useState
  // biasa akan reset ke DEFAULT_YEAR tiap balik ke halaman ini. Dilaporkan
  // user: filter "All Time" balik ke default tiap habis dari Data.
  const [year, setYear] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_YEAR;
    return window.sessionStorage.getItem("vpd_dashboard_year") || DEFAULT_YEAR;
  });
  const handleYearChange = useCallback(next => {
    setYear(next);
    if (typeof window !== "undefined") window.sessionStorage.setItem("vpd_dashboard_year", next);
  }, []);
  const [drawer, setDrawer] = useState(null); // key kategori aktif (state tunggal — buka baru = ganti isi)
  const mapReady = useIdleReady();
  const isDesktop = useIsDesktop();

  // Tandai count-up sudah pernah jalan sekali di sesi ini — effect anak
  // (KpiCard/PipeCard) commit LEBIH DULU dari effect induk ini di React,
  // jadi mount PERTAMA tetap animasi normal; baru mount BERIKUTNYA (habis
  // dari Data balik lagi ke sini) langsung tampil angka final tanpa replay.
  useEffect(() => { sessionCountUpDone = true; }, []);

  const data = useMemo(() => filterByYear(allRows, year), [allRows, year]);
  // "Video Progress Overall" (m/hoverRows.published/documented/drawer KPI)
  // KHUSUS project Tipe=Portofolio — project Tipe=Others tidak masuk KPI ini
  // sama sekali, tapi tetap terhitung normal di Pipeline (pipelineMetrics
  // tetap pakai allRows, tidak difilter Tipe apa pun).
  const portfolioData = useMemo(() => data.filter(r => r.tipe !== "Others"), [data]);
  const m    = useMemo(() => levelMetrics(portfolioData), [portfolioData]);
  const pipelineMetrics = useMemo(() => levelMetrics(allRows), [allRows]);
  const cats = useMemo(() => getCategories(t), [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDrawer  = useCallback(k => setDrawer(k), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  // 3 List Aktivitas (Portfolio Project Published/On Process/Recent
  // Documentation) DIHAPUS dari halaman ini (permintaan user) — mini-list
  // expand-on-hover di kpi-hover-panel/pipe-hover-panel sudah cukup
  // menampilkan preview proyek terbaru per kategori.

  // Mini-list expand-on-hover (req #9/#11 hero-pipeline-redesign): KPI
  // published/documented pakai `data` (terfilter tahun, sejalan dgn m),
  // 4 kartu pipeline pakai `allRows` (selalu all-time, sejalan dgn
  // pipelineMetrics) — 3 item teratas per kategori.
  // 5 slot selalu ditampilkan (lihat HOVER_SLOT_COUNT/HoverRowSlots) — kalau
  // datanya kurang dari 5, sisanya diisi placeholder, BUKAN dipotong. Jadi
  // limit di sini = HOVER_SLOT_COUNT (tidak perlu diambil lebih banyak dari
  // yang bisa ditampilkan).
  const HOVER_PREVIEW_LIMIT = HOVER_SLOT_COUNT;
  const hoverRows = useMemo(() => ({
    published:  portfolioData.filter(cats.published.filter).sort(cats.published.sort).slice(0, HOVER_PREVIEW_LIMIT),
    documented: portfolioData.filter(cats.documented.filter).sort(cats.documented.sort).slice(0, HOVER_PREVIEW_LIMIT),
    onDocSched: allRows.filter(cats.onDocSched.filter).sort(cats.onDocSched.sort).slice(0, HOVER_PREVIEW_LIMIT),
    editing:    allRows.filter(cats.editing.filter).sort(cats.editing.sort).slice(0, HOVER_PREVIEW_LIMIT),
    onReview:   allRows.filter(cats.onReview.filter).sort(cats.onReview.sort).slice(0, HOVER_PREVIEW_LIMIT),
    scheduled:  allRows.filter(cats.scheduled.filter).sort(cats.scheduled.sort).slice(0, HOVER_PREVIEW_LIMIT),
  }), [portfolioData, allRows, cats]);

  // Keterangan "dari total berapa" (req #3-5 hero-pipeline-redesign) — semua
  // dari `m` (levelMetrics(data), sudah terfilter tahun yang sama utk
  // numerator & denominator, jadi tidak pernah menyesatkan saat ganti tahun).
  const denomText = useMemo(() => ({
    published:     t(`dari ${m.documented} terdokumentasi`, `of ${m.documented} documented`),
    documentedPct: `${m.documented} ${t("dari","of")} ${m.total}`,
    documented:    t(`dari ${m.total} total proyek`, `of ${m.total} total projects`),
  }), [m]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kategori Pipeline (onDocSched/editing/onReview/scheduled) HARUS pakai
  // `allRows` di drawer juga — bukan `data` (terfilter tahun) — supaya
  // konsisten dgn angka di card-nya sendiri yg selalu all-time
  // (pipelineMetrics = levelMetrics(allRows)). Sebelumnya drawer selalu pakai
  // `data` utk SEMUA kategori, jadi klik card Pipeline "4" bisa nampilin
  // cuma 2 row kalau filter tahun aktif — angka card vs isi drawer beda2,
  // membingungkan (dilaporkan user).
  const PIPELINE_DRAWER_KEYS = useMemo(() => new Set(["onDocSched", "editing", "onReview", "scheduled"]), []);
  const drawerCat  = drawer ? cats[drawer] : null;
  // Kategori KPI (published/documentedPct/documented) pakai portfolioData
  // (bukan `data`) supaya drawer-nya konsisten exclude Tipe=Others juga.
  const drawerSource = drawer && PIPELINE_DRAWER_KEYS.has(drawer) ? allRows : portfolioData;
  const drawerRows = useMemo(
    () => drawerCat ? drawerSource.filter(drawerCat.filter).sort(drawerCat.sort) : [],
    [drawerSource, drawerCat],
  );

  return (
    <>
      <style>{`
        .hl-root { padding: 18px 24px 40px; }
        .hl-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; flex-wrap: wrap; }
        /* Satu ukuran judul utk SEMUA level "judul halaman/section" — Dashboard
           (judul mobile), "Coverage Area", dan judul deck KPI semua 18px/800,
           sama persis dgn h1 "Data" di ProjectDetailPage.jsx. Supaya tiap
           judul langsung ke-identifikasi sbg judul di manapun ia muncul,
           bukan tiap tempat punya ukuran sendiri-sendiri. */
        .hl-title, .sec-title, .kpi-deck-title, .pipe-deck-title { font-size: 18px; font-weight: 800; color: ${C.textH}; letter-spacing: -0.02em; line-height: 1.2; }
        .kpi-deck-title, .pipe-deck-title { color: #FFFFFF; }
        .cal-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border: 1px solid ${C.border}; border-radius: 9px; background: ${C.surface}; color: ${C.textSec}; flex-shrink: 0; transition: all .15s; box-shadow: 0 1px 3px rgba(15,23,42,0.05); text-decoration: none; }
        .cal-btn:hover { border-color: ${C.teal}; color: ${C.teal}; background: ${C.greenLight}; }

        /* Header halaman (judul + kalender + tahun) sekarang CUMA utk mobile —
           di desktop semua kontrol itu sudah pindah ke top-nav & deck KPI. */
        .hl-yd-mobile  { display: none; }
        .hl-yd-desktop { display: block; }
        @media (min-width: 769px) {
          .hl-top { display: none; }
        }
        @media (max-width: 768px) {
          .hl-top        { width: 100%; }
          .hl-title      { display: none; }
          .hl-controls   { width: 100%; display: flex; align-items: center; gap: 8px; }
          .cal-btn       { order: 1; }
          .hl-yd-mobile  { display: block; order: 2; margin-left: auto; }
          .hl-yd-mobile  { display: none; }
          .hl-yd-desktop { display: none; }
          .kpi-yd-mobile { display: block; margin-left: auto; }
        }
        @media (min-width: 769px) { .kpi-yd-mobile { display:none; } }

        /* ── VIDEO PROGRESS OVERALL — panel teal gelap ── */
        .kpi-deck {
          position: relative; border-radius: 20px;
          background: linear-gradient(150deg, ${C.deckSoft} 0%, ${C.deck} 58%);
          padding: 20px 22px 22px; margin-bottom: 28px;
          box-shadow: 0 8px 28px rgba(14,59,54,0.28), 0 2px 6px rgba(10,15,30,0.08);
        }
        .kpi-deck-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 14px; margin-bottom: 16px; position: relative;
        }
        .kpi-deck-eyebrow { font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: none; color: rgba(255,255,255,0.55); margin-bottom: 3px; }

        /* align-items: flex-start (BUKAN stretch) — sengaja, supaya tinggi
           tiap card independen. Kalau stretch, semua card ikut "ditarik"
           setinggi card yang lagi expand (dilaporkan user: card lain ikut
           kelihatan tinggi kosong padahal tidak sedang di-hover). */
        .kpi-grid  { display: flex; gap: 12px; position: relative; align-items: flex-start; }

        /* ── VIDEO PRODUCTION PIPELINE — panel TERPISAH, graphite/slate
           (bukan teal — lihat pipeDeck/pipeDeckSoft di styles/theme.js). Card
           di dalamnya expand via overlay (.pipe-hover-panel, position:absolute)
           — tidak mendorong layout section di bawahnya sama sekali. */
        .pipe-deck {
          position: relative; border-radius: 20px;
          background: linear-gradient(150deg, ${C.pipeDeckSoft} 0%, ${C.pipeDeck} 62%);
          padding: 18px 22px 20px; margin-bottom: 40px;
          box-shadow: 0 8px 26px rgba(6,9,14,0.32), 0 2px 6px rgba(10,15,30,0.1);
        }
        .pipe-grid { display: flex; gap: 14px; position: relative; align-items: flex-start; }

        .pipe-label-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; position: relative; flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .pipe-label-hint { display: block; font-size: 10.5px; font-weight: 500; color: rgba(255,255,255,0.42); margin-top: 3px; }

        /* 3 KPI: kartu putih solid (hasil/rekap) — ANGKA paling dominan.
           kpi-card-wrap membungkus tombol + hover-panel (overlay terpisah,
           settingan yang terbukti stabil — user minta balik ke sini setelah
           versi "card asli melebar di tempat" bermasalah/tidak stabil). */
        .kpi-card-wrap {
          flex: 1 1 0%; min-width: 0; position: relative;
          transition: z-index 0s linear .3s;
        }
        .kpi-card-wrap:hover { z-index: 1100; transition-delay: 0s; }
        .kpi-card {
          display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
          width: 100%; text-align: left; border: none; cursor: pointer;
          background: ${C.surface}; border-radius: 14px;
          box-shadow: 0 1px 3px rgba(10,15,30,0.12);
          transition: transform .18s cubic-bezier(0.85,0.09,0.15,0.91), box-shadow .18s cubic-bezier(0.85,0.09,0.15,0.91);
          padding: 18px 18px 14px;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(10,15,30,0.18);
        }
        .kpi-denom { font-size: 11px; font-weight: 600; color: ${C.textMut}; line-height: 1.3; }

        /* 4 kartu pipeline: LIQUID GLASS ala iOS — blur+saturate membuat blob
           dekoratif teal di belakang (lihat kpi-deck radial-gradient) terlihat
           "diteruskan" lewat kaca. Beda kelas visual dari KPI: ini "yang
           sedang mengalir", bukan hasil akhir. Panah antar kartu menegaskan
           urutan alur produksi. */
        .pipe-card-wrap {
          flex: 1 1 0%; min-width: 0; position: relative;
          transition: z-index 0s linear .3s;
        }
        .pipe-card-wrap:hover { z-index: 1100; transition-delay: 0s; }
        .pipe-card {
          display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
          width: 100%; text-align: left; cursor: pointer; position: relative;
          background: linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05));
          -webkit-backdrop-filter: blur(18px) saturate(1.6);
          backdrop-filter: blur(18px) saturate(1.6);
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 18px rgba(6,20,18,0.22);
          transition: background .18s cubic-bezier(0.85,0.09,0.15,0.91), border-color .18s cubic-bezier(0.85,0.09,0.15,0.91), transform .18s cubic-bezier(0.85,0.09,0.15,0.91);
          padding: 12px 14px 10px;
        }
        .pipe-card:hover {
          background: linear-gradient(145deg, rgba(255,255,255,0.24), rgba(255,255,255,0.09));
          border-color: rgba(255,255,255,0.4);
          transform: translateY(-2px);
        }
        .pipe-card-wrap:not(:last-child)::after {
          content: '›';
          position: absolute; right: -12px; top: 50%; transform: translateY(-54%);
          font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.4);
          pointer-events: none;
        }
        @media (prefers-reduced-transparency: reduce) {
          .pipe-card { backdrop-filter: none; -webkit-backdrop-filter: none; background: rgba(15,50,46,0.92); }
        }

        /* ── HOVER-EXPAND PANEL — overlay position:absolute, TIDAK mendorong
           layout (background/section lain diam total). Animasi MURNI
           transform (scale) + transition, TANPA opacity sbg driver — panel
           tumbuh dari titik tengah-atas CARD (transform-origin: center top),
           BUKAN dari titik tengah kotak panel penuh itu sendiri. Panel bisa
           jauh lebih tinggi dari card yang di-hover (isinya sampai 5 baris
           list) — kalau origin-nya "center center" dari BOX PANEL, titik
           tumbuhnya jatuh di tengah panel (jauh di bawah card asli, area
           kosong yang belum kelihatan), bukan dari card itu sendiri (bug
           dilaporkan user). "center top" pas karena panel & card sama-sama
           nempel di top:0 wrap — titik itu SELALU persis di card, horizontal
           tetap center (bukan nyamping/dari pojok). Padding penuh di panel
           sendiri (bukan nempel ke tepi). Warna gelap utk versi Pipeline
           (kontras dgn teks putih), solid putih utk versi KPI. */
        .kpi-hover-panel, .pipe-hover-panel {
          position: absolute; left: 0; right: 0; top: 0; z-index: 5;
          border-radius: 14px; padding: 16px 16px 12px;
          display: flex; flex-direction: column; gap: 2px;
          pointer-events: none;
          transform: scale(0.01); transform-origin: center top;
          transition: transform .3s cubic-bezier(0.85,0.09,0.15,0.91);
        }
        .kpi-card-wrap:hover .kpi-hover-panel,
        .pipe-card-wrap:hover .pipe-hover-panel {
          pointer-events: auto; transform: scale(1);
        }
        .kpi-hover-panel {
          background: ${C.surface};
          box-shadow: 0 14px 36px rgba(10,15,30,0.22), 0 2px 8px rgba(10,15,30,0.1);
        }
        .pipe-hover-panel {
          background: linear-gradient(160deg, ${C.pipeDeckSoft} 0%, ${C.pipeDeck} 100%);
          -webkit-backdrop-filter: blur(22px) saturate(1.7);
          backdrop-filter: blur(22px) saturate(1.7);
          box-shadow: 0 18px 40px rgba(6,9,14,0.45);
        }
        @media (prefers-reduced-transparency: reduce) {
          .pipe-hover-panel { backdrop-filter: none; -webkit-backdrop-filter: none; background: ${C.pipeDeck}; }
        }
        .hp-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; }
        .hp-num { font-size: inherit; }
        .hp-pipe-label { margin-top: 2px; }
        .hp-divider { height: 1px; background: ${C.borderSoft}; margin: 10px 0 4px; flex-shrink: 0; }
        .hp-divider-dark { background: rgba(255,255,255,0.16); }
        .hp-empty { padding: 10px 2px; font-size: 12px; color: ${C.textMut}; }
        .hp-empty-dark { color: rgba(255,255,255,0.55); }
        .hp-seeall {
          display: flex; align-items: center; justify-content: center; gap: 4px;
          margin-top: 6px; padding: 7px 8px; border: none; border-radius: 8px; cursor: pointer;
          background: rgba(62,189,172,0.12); color: ${C.tealDark};
          font-size: 11.5px; font-weight: 700; transition: background .15s;
        }
        .hp-seeall:hover { background: rgba(62,189,172,0.2); }
        .hp-seeall-dark { background: rgba(255,255,255,0.14); color: #fff; }
        .hp-seeall-dark:hover { background: rgba(255,255,255,0.22); }

        .hp-row {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 8px 2px; border: none; background: none; cursor: pointer;
          text-align: left; box-sizing: border-box;
        }
        .hp-row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .hp-row-name {
          font-size: 12px; font-weight: 650; color: ${C.textH}; transition: color .13s;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .hp-row-sub { font-size: 10.5px; color: ${C.textSec}; margin-top: 1px; }
        .hp-row-status { display: block; margin-top: 4px; }
        .hp-row-dark .hp-row-name { color: #fff; }
        .hp-row-dark .hp-row-sub { color: rgba(255,255,255,0.6); }
        /* Hover: nama proyek berubah ke warna primary — konsisten dgn pola
           .lst-row:hover .lst-row-name di list lain (drawer/kartu utama). */
        .hp-row:hover .hp-row-name { color: ${C.teal}; }
        .hp-row-dark:hover .hp-row-name { color: #8FE6D8; }

        @media (prefers-reduced-motion: reduce) {
          .kpi-hover-panel, .pipe-hover-panel { transition: transform .01s linear; }
        }
        /* Device tanpa hover asli (mobile/touch) — expand-on-hover dimatikan
           total, klik langsung ke drawer seperti sebelumnya (req #14).
           TIGA kondisi sekaligus (OR), bukan cuma "hover:none" saja — ada
           browser/device mobile nyata yang salah lapor "hover:hover" (mis.
           WebView tertentu), jadi panel tetap kepencet nempel kebuka waktu
           di-tap padahal seharusnya mati total di mobile (dilaporkan user:
           tampilan berantakan, harusnya khusus desktop). pointer:coarse
           (layar sentuh) dan max-width:768px (breakpoint mobile yg sudah
           dipakai di seluruh file ini) jadi jaring pengaman tambahan.
           !important supaya tidak ada rule lain yg bisa menimpanya. */
        @media (hover: none), (pointer: coarse), (max-width: 768px) {
          .kpi-hover-panel, .pipe-hover-panel { display: none !important; }
        }

        .kpi-num  { font-size: 52px; font-weight: 800; line-height: 1; color: ${C.textH}; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
        .pipe-num { font-size: 30px; font-weight: 800; line-height: 1; color: #FFFFFF; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }

        .kpi-foot, .pipe-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; margin-top: auto; }
        .kpi-label  { font-size: 11.5px; font-weight: 650; color: ${C.textSec}; line-height: 1.3; }
        .pipe-label { font-size: 10.5px; font-weight: 650; color: rgba(255,255,255,0.78); line-height: 1.25; }
        .kpi-chip  { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pipe-chip { width: 28px; height: 28px; border-radius: 8px;  display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* .lst-row/.lst-row-name dipakai ProjectRow di dalam CategoryDrawer
           (3 List Aktivitas di halaman ini sudah dihapus, tapi drawer "See
           all" masih pakai ProjectRow dgn class yg sama). */
        .lst-row {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 11px 6px; border: none; background: none; cursor: pointer;
          text-align: left; border-radius: 0; height:48px; box-sizing:border-box;
        }
        /* Hover: cukup NAMA proyek berubah ke warna primary — tanpa blok
           background, sesuai arahan user. Warna dasar diatur DI SINI (bukan
           inline style di elemennya) supaya rule :hover bisa menang. */
        .lst-row .lst-row-name { color: ${C.textH}; transition: color .13s; }
        .lst-row:hover .lst-row-name { color: ${C.teal}; }

        /* ── PETA ── */
        .coverage-map-box { height: 320px; margin-bottom: 20px; position: relative; border-radius: 14px; overflow: hidden; }
        .coverage-map-skeleton { border-radius: 14px; background: linear-gradient(90deg, ${C.borderSoft} 25%, ${C.surface} 50%, ${C.borderSoft} 75%); background-size: 200% 100%; animation: mapShimmer 1.35s ease-in-out infinite; }
        @keyframes mapShimmer { to { background-position: -200% 0; } }
        .coverage-map-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(255,255,255,0.9); font-size: 13px; font-weight: 600; color: ${C.textMut}; pointer-events: none; }
        .coverage-insights-grid { display: grid; grid-template-columns: minmax(0, .82fr) minmax(0, 1.18fr); gap: 22px; align-items: stretch; margin-top: 4px; }
        .coverage-insights-grid > div { display:flex; flex-direction:column; min-height:0; }
        .coverage-insights-grid > div > .sec-head { flex:0 0 auto; }
        .coverage-insights-grid > div > .coverage-map-box { flex:1 1 auto; height:auto; min-height:320px; margin-bottom:0; }
        .year-chart-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
        .year-chart-title { font-size: 16px; font-weight: 800; color: ${C.textH}; }
        .year-chart-subtitle { margin-top:3px; font-size:11px; color:${C.textSec}; }
        .year-chart-icon { width:32px; height:32px; border-radius:10px; display:grid; place-items:center; color:${C.teal}; background:${C.greenLight}; }
        .year-chart { height: 250px; padding: 18px 8px 0; }
        .year-chart-bars { height:100%; display:flex; align-items:stretch; justify-content:space-around; gap:12px; border-bottom:1px solid ${C.border}; }
        .year-chart-col { min-width:34px; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:7px; }
        .year-chart-value { font-size:11px; font-weight:800; color:${C.textSec}; }
        .year-chart-track { position:relative; width:100%; max-width:52px; flex:1; min-height:24px; display:flex; align-items:flex-end; background:linear-gradient(to top, rgba(62,189,172,.08), transparent); border-radius:10px 10px 0 0; }
        .year-chart-bar { width:100%; min-height:10px; border-radius:9px 9px 2px 2px; background:linear-gradient(180deg, #3EBDAC, #159A8A); box-shadow:0 5px 14px rgba(21,154,138,.22); transition:height .25s ease, filter .18s ease, transform .18s ease; transform-origin:bottom; }
        .year-chart-col { cursor:default; }
        .year-chart-col.is-hovered .year-chart-bar { filter:saturate(1.2) brightness(1.08); transform:scaleX(1.08); box-shadow:0 8px 20px rgba(21,154,138,.34); }
        .year-chart-col.is-hovered .year-chart-value, .year-chart-col.is-hovered .year-chart-label { color:${C.teal}; }
        .year-chart-tooltip { position:absolute; left:50%; bottom:calc(100% + 8px); transform:translateX(-50%); z-index:3; white-space:nowrap; padding:6px 9px; border-radius:8px; background:#0A0F1E; color:#fff; font-size:10px; font-weight:700; box-shadow:0 6px 16px rgba(10,15,30,.2); animation:chartTipIn .16s ease-out; }
        .year-chart-tooltip::after { content:""; position:absolute; left:50%; bottom:-4px; width:8px; height:8px; background:#0A0F1E; transform:translateX(-50%) rotate(45deg); }
        @keyframes chartTipIn { from { opacity:0; transform:translate(-50%, 4px); } to { opacity:1; transform:translate(-50%, 0); } }
        .year-chart-label { padding-bottom:9px; font-size:11px; font-weight:700; color:${C.textSec}; }
        .year-chart-empty { height:250px; display:grid; place-items:center; color:${C.textMut}; font-size:12px; }

        /* ── DESKTOP LEBAR ── */
        @media (min-width: 1100px) {
          .hl-root   { padding: 26px 40px 40px; }
          .sec-title, .kpi-deck-title, .pipe-deck-title { font-size: 22px; }
          .sec-head  { margin-bottom: 16px; }
          .kpi-deck  { padding: 26px 30px 30px; margin-bottom: 32px; }
          .pipe-deck { padding: 24px 30px 28px; margin-bottom: 44px; }
          .kpi-grid, .pipe-grid { gap: 16px; }
          .kpi-card  { padding: 24px 24px 18px; }
          .kpi-num   { font-size: 72px; }
          .pipe-num  { font-size: 38px; }
          .coverage-map-box { height: 420px; margin-bottom: 40px; }
          .coverage-insights-grid > div > .coverage-map-box { height:auto; margin-bottom:0; }
        }

        @keyframes drwFade  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes drwSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .drawer-panel { background: ${C.surface}; }
        @media (max-width: 900px) { .coverage-insights-grid { grid-template-columns: 1fr; gap: 16px; } }
        @media (max-width: 768px)  {
          /* padding-bottom BUKAN 80px lagi — class main (App.jsx) SUDAH
             menyediakan padding-bottom:72px+safe-area global khusus utk jarak
             bottom-nav di SEMUA halaman. 80px di sini dobel-reservasi utk hal
             yang sama, bikin white space kosong berlebih & scroll jadi lebih
             panjang dari kontennya (dilaporkan user). */
          .hl-root    { padding: 16px 16px 16px; }
          .cal-btn    { display: none; }
          /* .kpi-grid pindah row->column di mobile — TAPI align-items:flex-start
             di rule dasarnya (sengaja, biar tinggi card independen pas row di
             desktop) di layout column berarti axis silang jadi HORIZONTAL,
             jadi tiap .kpi-card-wrap ikut shrink-to-fit lebar KONTENnya
             sendiri alih-alih diregangkan penuh — 3 card jadi beda-beda lebar
             (dilaporkan user: "tidak rata ukuran cardnya di mobile"). Paksa
             lebar 100% khusus di breakpoint ini, tinggi tetap independen. */
          .kpi-grid   { flex-direction: column; }
          .kpi-card-wrap { width: 100%; }
          .pipe-grid  { flex-wrap: wrap; }
          .pipe-card-wrap { flex: 1 1 calc(50% - 7px); }
          /* Grid 2x2 di mobile — panah alur kiri→kanan jadi menyesatkan
             (kartu ke-2 "menunjuk" keluar baris), sembunyikan saja. */
          .pipe-card-wrap::after { display: none; }
          .kpi-num    { font-size: 38px; }
          /* Hover-expand (melebar+tumbuh) mati total di touch device (lihat
             @media hover:none), jadi margin-bottom besar cuma perlu ukuran
             normal di sini. */
          .kpi-deck   { margin-bottom: 28px; }
          .pipe-deck  { margin-bottom: 28px; }
          /* Glass-blur 40% transparan — khusus mobile (pola app ini). */
          .drawer-panel {
            background: rgba(255,255,255,0.60);
            -webkit-backdrop-filter: blur(14px) saturate(1.5);
            backdrop-filter: blur(14px) saturate(1.5);
          }
          .drawer-list { padding-bottom: 6px; }
        }
        @media (max-width: 768px) and (hover: none) {
          .kpi-card-wrap:hover, .pipe-card-wrap:hover { transform:none; box-shadow:0 1px 3px rgba(10,15,30,0.12); }
          .lst-seeall:hover { background:none; }
          .lst-row:hover .lst-row-name { color:${C.textH}; }
          .year-chart-col.is-hovered .year-chart-bar { filter:none; transform:none; box-shadow:0 5px 14px rgba(21,154,138,.22); }
          .year-chart-col.is-hovered .year-chart-value, .year-chart-col.is-hovered .year-chart-label { color:${C.textSec}; }
          .year-chart-tooltip { display:none; }
        }
        @media (max-width: 480px) {
          .hl-root  { padding: 14px 14px 14px; }
          .hl-title { font-size: 16px; }
        }
        @media (max-width: 360px) { .hl-root { padding: 10px 10px 10px; } }
      `}</style>

      <div className="hl-root">

        {/* ── HEADER — mobile-only (desktop: kontrol di top-nav & deck) ── */}
        <div className="hl-top">
          <div className="hl-title">
            {t("Video Production Dashboard","Video Production Dashboard")}
          </div>
          <div className="hl-controls">
            <a className="cal-btn" href={CALENDAR_URL} target="_blank" rel="noopener noreferrer"
              title={t("Kalender Digital Bank Sinarmas 2026","Bank Sinarmas 2026 Digital Calendar")}>
              <Calendar size={15} />
            </a>
            <div className="hl-yd-mobile">
              <YearDropdown value={year} onChange={handleYearChange} lang={lang} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:10, background: C.amberLight,
            border:`1px solid ${C.amber}33`, display:"flex", gap:8, alignItems:"center" }}>
            <AlertCircle size={14} color={C.amber} />
            <span style={{ fontSize:12, color: C.amber }}>
              {t(`Gagal terhubung ke Sheets — menampilkan data contoh.`, `Could not connect to Sheets — showing sample data.`)}
            </span>
          </div>
        )}

        {/* ── VIDEO PROGRESS OVERALL — panel teal, terikat filter tahun ── */}
        <KpiDeck m={m} cats={cats} year={year} onYearChange={handleYearChange}
          onOpen={openDrawer} onOpenDetail={onOpenDetail} hoverRows={hoverRows} denomText={denomText} lang={lang} />

        {/* ── VIDEO PRODUCTION PIPELINE — panel terpisah, selalu all-time ── */}
        <PipelineDeck pipelineMetrics={pipelineMetrics} cats={cats}
          onOpen={openDrawer} onOpenDetail={onOpenDetail} hoverRows={hoverRows} lang={lang} />

        {/* ── COVERAGE AREA (peta — selalu all-time, tidak ikut filter tahun) ── */}
        <CoverageInsights ready={mapReady} lang={lang} allRows={allRows} isDesktop={isDesktop} />

      </div>

      {drawerCat && (
        <CategoryDrawer cat={drawerCat} catKey={drawer} count={drawerRows.length} rows={drawerRows}
          onClose={closeDrawer} onOpenDetail={onOpenDetail} t={t} />
      )}
    </>
  );
}
