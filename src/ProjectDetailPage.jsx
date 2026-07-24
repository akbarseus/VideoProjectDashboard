import { memo, useState, useEffect, useMemo, useDeferredValue, useRef } from "react";
import {
  Play, Film, Search, ChevronRight,
} from "lucide-react";
import { formatDateDMY, useAutoTranslate, YEARS, CURRENT_YEAR_STR } from "./useVideoProjects";
import { LinkTiles, isPreviewEligible, LinkPreviewButton } from "./LinkTiles";
import { getStatusMeta } from "./config/statuses";
import { DETAIL_COLORS } from "./styles/theme";
import { youtubeId } from "./utils/youtube";
import GlassSelect from "./GlassSelect";

const C = {
  ...DETAIL_COLORS,
  bg:       "#F8FAFC",
  surface:  "#FFFFFF",
  border:   "#E2E8F0",
  soft:     "#F1F5F9",
  teal:     "#3EBDAC",
  tealBg:   "#E8F8F6",
  tealBd:   "rgba(62,189,172,0.28)",
  green:    "#059669",
  greenBg:  "#ECFDF5",
  amber:    "#D97706",
  amberBg:  "#FFFBEB",
  blueSch:  "#2563EB",
  blueSchBg:"#EFF6FF",
  red:      "#DC2626",
  redBg:    "#FEF2F2",
  textH:    "#0F172A",
  textSec:  "#64748B",
  textMut:  "#94A3B8",
};

const PROJECT_BATCH_SIZE = 40;

/* ── STATUS CONFIG (lama, 4-kategori) — masih dipakai utk warna/icon
   placeholder thumbnail. Badge yang TAMPIL di kartu & panel sekarang pakai
   rawCfg di bawah (teks kolom "Status Video" apa adanya). ────────────────── */
function statusCfg(statusVideo, t) {
  const map = getStatusMeta(t, C);
  const status = map[statusVideo] ?? map.na;
  return { ...status, label: status.detail };
}

/* ── BADGE STATUS BARU — teks asli dropdown "Status Video" di sheet,
   warna sejalan dgn kategori pipeline di halaman Dashboard. ─────────────── */
const RAW_STATUS_COLORS = {
  "Published":            { colorKey: "green" },
  "Ready to Publish":     { colorKey: "violet" },
  "Client Review":        { colorKey: "blueSch" },
  "Internal Review":      { colorKey: "teal" },
  "Editing":              { colorKey: "amber" },
  "Documented":           { colorKey: "amber" },
  "On Schedule Shooting": { colorKey: "blueSch" },
  "Permit Process":       { colorKey: "textSec" },
  "n/a":                  { colorKey: "red" },
};

function rawCfg(project, t) {
  const raw = String(project.statusVideoRaw || "").trim();
  const label = raw || t("Belum diisi","Not set");
  const entry = RAW_STATUS_COLORS[raw];
  if (!entry) return { label, color: C.textSec, bg: C.soft };
  const color = C[entry.colorKey] ?? C.textSec;
  const bg = C[`${entry.colorKey}Bg`] ?? C.soft;
  return { label, color, bg };
}

/* ── YOUTUBE THUMBNAIL ─────────────────────────────────────────────────── */
function Thumbnail({ project, t }) {
  const cfg = statusCfg(project.statusVideo, t);
  const [broken, setBroken] = useState(false);
  const [thumbnailQuality, setThumbnailQuality] = useState("maxresdefault");
  const ytId = youtubeId(project.linkYoutube);

  // Ini cuma PREVIEW thumbnail, bukan video utuh — lebar dibuat responsive
  // (mengisi penuh lebar kolom, tanpa kekosongan di samping), tapi TINGGINYA
  // dibatasi (maxHeight) supaya di kolom detail yang lebar (desktop) tidak
  // jadi raksasa/tidak proporsional. object-fit:cover mengurus crop-nya.
  if (ytId && !broken) {
    return (
      <a href={project.linkYoutube} target="_blank" rel="noopener noreferrer"
        style={{ display:"block", position:"relative", width:"100%" }}>
        <img
          src={`https://img.youtube.com/vi/${ytId}/${thumbnailQuality}.jpg`}
          onLoad={event => {
            if (thumbnailQuality === "maxresdefault" && event.currentTarget.naturalWidth < 640) {
              setThumbnailQuality("hqdefault");
            }
          }}
          onError={() => {
            if (thumbnailQuality === "maxresdefault") setThumbnailQuality("hqdefault");
            else setBroken(true);
          }}
          alt={project.name}
          style={{ width:"100%", aspectRatio:"16/9", maxHeight:440, objectFit:"cover", borderRadius:12, border:`1px solid ${C.border}`, display:"block" }}
        />
        <div style={{
          position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(15,23,42,0.15)", borderRadius:10,
        }}>
          <div style={{
            width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.92)",
            display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(0,0,0,0.25)",
          }}>
            <Play size={17} color="#FF0000" fill="#FF0000" style={{ marginLeft:2 }} />
          </div>
        </div>
      </a>
    );
  }

  return (
    <div style={{
      width:"100%", aspectRatio:"16/9", maxHeight:440,
      background: `linear-gradient(135deg, ${cfg.bg} 0%, ${C.soft} 100%)`,
      borderRadius:10, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:8,
      border:`1px dashed ${cfg.color}44`,
    }}>
      <Film size={24} color={cfg.color} strokeWidth={1.5} />
      <span style={{ fontSize:11, color: cfg.color, fontWeight:600, textAlign:"center", padding:"0 12px" }}>
        {project.statusVideo === "published"
          ? t("Video belum tersambung ke YouTube","Video not linked to YouTube")
          : t("Belum ada video","No video yet")}
      </span>
    </div>
  );
}

/* ── PROJECT CARD (daftar kiri) — memo: list bisa ratusan baris, jangan
   re-render semua kartu tiap parent berubah (perf). ─────────────────────── */
const ProjectCard = memo(function ProjectCard({ project, selected, onSelect, t }) {
  const cfg = rawCfg(project, t);
  return (
    <div onClick={() => onSelect(project.id)} className="pc-card"
      style={{
        padding:"14px 16px", borderRadius:10, cursor:"pointer",
        border:`1.5px solid ${selected ? C.teal : C.border}`,
        background: selected ? C.tealBg : C.surface,
        transition:"border-color .18s ease, background .18s ease",
        display:"flex", flexDirection:"column", gap:8,
      }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
        <div style={{ fontSize:13, fontWeight:700, color: C.textH, lineHeight:1.35, flex:1 }}>
          {project.name}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {isPreviewEligible(project) && <LinkPreviewButton url={project.linkPreview} t={t} size={22} />}
          <div style={{
            background: cfg.bg, borderRadius:20, padding:"3px 9px", flexShrink:0,
          }}>
            <span style={{ fontSize:10, fontWeight:700, color: cfg.color, whiteSpace:"nowrap" }}>{cfg.label}</span>
          </div>
          {/* Panah "bisa di-klik" — CUMA mobile (lihat .pc-arrow di CSS). */}
          <ChevronRight className="pc-arrow" size={16} color={C.textMut} />
        </div>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8, background: C.soft, color: C.textSec, fontWeight:500 }}>
          {project.industry}
        </span>
        <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8, background: C.soft, color: C.textSec, fontWeight:500 }}>
          {project.year || "—"}
        </span>
      </div>
    </div>
  );
});

/* ── DETAIL PANEL ───────────────────────────────────────────────────────── */
function DetailPanel({ project, lang, onOpenDetail, centered = false }) {
  const t = (id, en) => lang === "id" ? id : en;
  const cfg = rawCfg(project, t);

  const rawNote = project.catatanSchedule || "";
  const translatedNote = useAutoTranslate(rawNote || null, lang);

  const infoItems = [
    { label: t("Sektor","Sector"),               value: project.industry },
    { label: t("Tahun proyek","Project year"),    value: project.year || "—" },
    { label: t("Catatan","Notes"), value: translatedNote || "—" },
    { label: t("Tanggal tayang","Publish date"),  value: project.tanggalTayang ? formatDateDMY(project.tanggalTayang) : "—" },
  ];

  // Thumbnail cuma masuk akal untuk proyek yang SUDAH TAYANG (ada video asli
  // buat dipreview). Untuk status lain (Dalam Produksi/On Schedule/Belum Ada),
  // preview video akan selalu kosong/placeholder karena videonya memang belum
  // ada — menampilkannya cuma jadi kotak abu-abu percuma. Badge status + nama
  // proyek di bawah sudah cukup menjelaskan tahapannya.
  const showThumbnail = project.statusVideo === "published";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {showThumbnail && <Thumbnail project={project} t={t} />}

      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent: centered ? "center" : "flex-start", gap:8, marginBottom:6 }}>
          <div style={{ background: cfg.bg, borderRadius:20, padding:"4px 11px" }}>
            <span style={{ fontSize:11, fontWeight:700, color: cfg.color }}>{cfg.label}</span>
          </div>
          {isPreviewEligible(project) && <LinkPreviewButton url={project.linkPreview} t={t} />}
        </div>
        <h2 style={{ fontSize:17, fontWeight:800, color: C.textH, margin:0, lineHeight:1.3, textAlign: centered ? "center" : "left" }}>
          {project.name}
        </h2>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px 20px" }}>
        {infoItems.map(({ label, value }) => (
          <div key={label} style={{ textAlign: centered ? "center" : "left" }}>
            <div style={{ fontSize:11, color: C.textMut, fontWeight:600, marginBottom:3 }}>
              {label}
            </div>
            <div style={{ fontSize:14, fontWeight:600, color: C.textH }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: centered ? "center" : "left" }}>
        <div style={{ fontSize:11, fontWeight:700, color: C.textMut, marginBottom:8 }}>
          {t("Tautan proyek","Project links")}
        </div>
        <LinkTiles row={project} lang={lang} max={6} onViewMore={onOpenDetail} centered={centered} />
      </div>
    </div>
  );
}

/* ── MOBILE BREAKPOINT HOOK ───────────────────────────────────────────────
 * Sinkron dengan breakpoint CSS (max-width:768px) — dipakai buat menentukan
 * kapan topbar app (di App.jsx) boleh di-override utk nampilin nama proyek
 * + back-ke-list, khusus di mobile (desktop tidak boleh kena efek ini). */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = e => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

/* ── MAIN EXPORT ────────────────────────────────────────────────────────── */
export default function ProjectDetailPage({ lang = "id", data, initialId, onMobileDetailChange }) {
  const t = (id, en) => lang === "id" ? id : en;
  const { rows, loading } = data;
  const isMobile = useIsMobile();

  const [selected, setSelected] = useState(initialId ?? null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // nilai = teks kolom "Status Video" apa adanya
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR_STR);
  const [industryFilter, setIndustryFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PROJECT_BATCH_SIZE);

  // Mobile-only: "list" (default) atau "detail" (kartu detail full-screen
  // slide-in). Di desktop nilai ini tidak dipakai sama sekali (CSS selalu
  // tampil side-by-side lewat media query, lihat gotcha #8 di HANDOFF).
  // Kalau dibuka via initialId (link "Lihat N tautan lainnya") SAAT sudah di
  // mobile, langsung mulai di "detail" — user tidak perlu lihat list dulu.
  const [mobileView, setMobileView] = useState(
    () => (isMobile && initialId != null) ? "detail" : "list"
  );
  const overlayRef = useRef(null);
  const dragRef = useRef({ startX: 0, dragging: false });
  const listRef = useRef(null);
  const loadMoreRef = useRef(null);

  const goBackToList = () => setMobileView("list");

  // Tap kartu di list: pilih proyeknya, dan KHUSUS mobile langsung slide ke
  // tampilan detail full-screen. Di desktop cuma ganti proyek yg tampil di
  // panel kanan (perilaku lama, tidak berubah).
  const handleSelectProject = id => {
    setSelected(id);
    if (isMobile) setMobileView("detail");
  };

  // Kalau dibuka lewat "view more" dari halaman lain, pindah ke proyek itu —
  // dan kalau lagi di mobile, langsung slide ke tampilan detail (bukan list).
  useEffect(() => {
    if (initialId != null) {
      setSelected(initialId);
      if (isMobile) setMobileView("detail");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  useEffect(() => {
    if (selected == null && rows.length > 0) setSelected(rows[0].id);
  }, [rows, selected]);

  // Input tetap sync (instan di kotak), tapi filtering daftar proyek dijadwalkan
  // lewat useDeferredValue supaya ketikan cepat tidak nunggu re-render list+panel.
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => rows.filter(p => {
    const q = deferredSearch.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.industry.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.statusVideoRaw === statusFilter;
    const matchYear = yearFilter === "all" || p.year === yearFilter;
    const matchIndustry = industryFilter === "all" || p.industry === industryFilter;
    return matchSearch && matchStatus && matchYear && matchIndustry;
  }), [rows, deferredSearch, statusFilter, yearFilter, industryFilter]);
  const visibleProjects = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );
  const hasMoreProjects = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(PROJECT_BATCH_SIZE);
    if (listRef.current && !isMobile) listRef.current.scrollTop = 0;
  }, [deferredSearch, statusFilter, yearFilter, industryFilter, rows, isMobile]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMoreProjects || typeof window.IntersectionObserver !== "function") return undefined;

    const observer = new window.IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) return;
      setVisibleCount(current => Math.min(current + PROJECT_BATCH_SIZE, filtered.length));
    }, {
      root: isMobile ? null : listRef.current,
      rootMargin: isMobile ? "320px 0px" : "240px 0px",
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [filtered.length, hasMoreProjects, isMobile]);

  // Kalau proyek yang sedang dipilih hilang dari daftar kiri (gara-gara ganti
  // pencarian/filter), panel kanan jadi menampilkan proyek yang sudah tidak
  // kelihatan di list kiri — bikin default kanan & kiri tidak sinkron. Jadi
  // begitu daftar terlihat berubah, otomatis pilih item pertama yang tampil.
  useEffect(() => {
    if (filtered.length > 0 && !filtered.some(p => p.id === selected)) {
      setSelected(filtered[0].id);
    }
  }, [filtered, selected]);

  const project = rows.find(p => p.id === selected) ?? null;

  // Beri tahu App.jsx (pemilik topbar) kalau lagi di mode "detail" mobile —
  // topbar ganti nampilin nama proyek + back-arrow balik ke list (bukan ke
  // Highlight). Null-kan lagi begitu balik ke list/pindah proyek/unmount,
  // supaya topbar kembali ke "Detail Proyek" seperti biasa.
  useEffect(() => {
    if (isMobile && mobileView === "detail" && project) {
      onMobileDetailChange?.({ name: project.name, onBack: goBackToList });
    } else {
      onMobileDetailChange?.(null);
    }
    return () => onMobileDetailChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, mobileView, project]);

  // Swipe-back gesture (tepi kiri, gaya iOS) — hanya aktif kalau sentuhan
  // dimulai dekat tepi kiri layar (<=24px), supaya tidak bentrok dgn interaksi
  // biasa (scroll, klik link) di dalam kartu detail. Manipulasi DOM langsung
  // lewat ref (bukan setState tiap touchmove) supaya drag tetap 60fps.
  const handleTouchStart = e => {
    if (!isMobile || mobileView !== "detail") return;
    const x = e.touches[0].clientX;
    if (x > 24) return;
    dragRef.current = { startX: x, dragging: true };
    overlayRef.current?.classList.add("dragging");
  };

  const handleTouchMove = e => {
    if (!dragRef.current.dragging) return;
    const delta = Math.max(0, e.touches[0].clientX - dragRef.current.startX);
    if (overlayRef.current) overlayRef.current.style.transform = `translateX(${delta}px)`;
  };

  const handleTouchEnd = e => {
    if (!dragRef.current.dragging) return;
    const el = overlayRef.current;
    const delta = Math.max(0, e.changedTouches[0].clientX - dragRef.current.startX);
    dragRef.current = { startX: 0, dragging: false };
    const width = el?.offsetWidth || 300;
    if (el) {
      el.classList.remove("dragging");
      el.style.transform = ""; // lepas override inline, balik dikontrol class .open (CSS transition)
    }
    if (delta > width * 0.3 || delta > 100) goBackToList();
  };

  // Opsi dropdown status = nilai unik kolom "Status Video" yang benar-benar
  // ada di data, diurutkan mengikuti alur pipeline (Published paling atas).
  // Nilai tak dikenal (typo/teks lama) tetap ikut tampil di bawahnya —
  // tidak disembunyikan, supaya tetap bisa difilter.
  const RAW_STATUS_ORDER = [
    "Published", "Ready to Publish", "Client Review", "Internal Review",
    "Editing", "Documented", "On Schedule Shooting", "Permit Process", "n/a",
  ];
  const statusOptions = useMemo(() => {
    const present = new Set(rows.map(r => String(r.statusVideoRaw || "").trim()).filter(Boolean));
    const ordered = RAW_STATUS_ORDER.filter(s => present.has(s));
    const extras = [...present].filter(s => !RAW_STATUS_ORDER.includes(s)).sort();
    return [
      { value: "all", label: t("Semua status","All statuses") },
      ...[...ordered, ...extras].map(s => ({ value: s, label: s })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, lang]);

  const industryOptions = useMemo(() => {
    const present = [...new Set(rows.map(r => String(r.industry || "").trim()).filter(Boolean))].sort();
    return [
      { value: "all", label: t("Semua industri","All industries") },
      ...present.map(i => ({ value: i, label: i })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, lang]);

  const yearOptions = useMemo(() => ([
    { value: "all", label: t("Semua tahun","All years") },
    ...YEARS.filter(y => y !== "all").map(y => ({
      value: y,
      label: y === CURRENT_YEAR_STR ? t("Tahun Ini","This Year") : y,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [lang]);

  return (
    <div className="pd-page" style={{ minHeight:"100vh", background: C.bg, padding:"28px 24px 40px" }}>
      <div className="pd-title" style={{ marginBottom:18 }}>
        <h1 style={{ fontSize:18, fontWeight:800, color: C.textH, letterSpacing:"-0.02em", margin:"0 0 4px" }}>
          {t("Data","Data")}
        </h1>
        <p style={{ fontSize:13, color: C.textSec, margin:0 }}>
          {t("Lihat status dan seluruh tautan konten setiap proyek.", "View status and all content links for each project.")}
        </p>
      </div>

      <div className="proj-grid">
        {/* Wrapper ini "display:contents" di desktop (filter & detail jadi 2
            grid-item independen — filter di kolom kiri atas, detail nempel
            sticky di kolom kanan). Di mobile, wrapper ini jadi kotak sticky
            SUNGGUHAN berisi filter+detail bertumpuk — keduanya nempel di atas
            sebagai satu kesatuan, cuma list proyek di bawahnya yang discroll. */}
        <div className="pd-sticky-wrap ui-glass">
        <div className="pd-sticky-inner">
          <div className="pd-filter">
            <div style={{ position:"relative" }}>
              <Search size={13} color={C.textMut} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
              <input
                className="pd-search-input"
                placeholder={t("Cari proyek…","Search project…")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width:"100%", padding:"9px 12px 9px 30px", borderRadius:10,
                  border:"1px solid rgba(15,23,42,0.08)", background:"rgba(255,255,255,0.9)",
                  backdropFilter:"blur(14px) saturate(1.6)", WebkitBackdropFilter:"blur(14px) saturate(1.6)",
                  boxShadow:"0 2px 10px rgba(15,23,42,0.06)",
                  fontSize:12, color: C.textH, outline:"none", boxSizing:"border-box",
                }}
              />
            </div>

            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <GlassSelect value={industryFilter} onChange={setIndustryFilter}
                options={industryOptions} placeholder={t("Semua industri","All industries")} fullWidth />
              <GlassSelect value={statusFilter} onChange={setStatusFilter}
                options={statusOptions} placeholder={t("Semua status","All statuses")} fullWidth />
              <GlassSelect value={yearFilter} onChange={setYearFilter}
                options={yearOptions} placeholder={t("Semua tahun","All years")} fullWidth />
            </div>
          </div>

          <div className="detail-panel ui-card" style={{ background: C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:20 }}>
            {project
              ? <DetailPanel project={project} lang={lang} />
              : <div style={{ color: C.textMut, textAlign:"center", padding:40, fontSize:13 }}>
                  {t("Pilih proyek di kiri","Select a project on the left")}
                </div>
            }
          </div>
        </div>
        </div>

        <div className="pd-list" ref={listRef}>
          {loading && rows.length === 0 ? (
            [...Array(4)].map((_, i) => (
              <div key={i} style={{ height:64, borderRadius:10, background: C.soft, opacity:1-i*0.15 }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ padding:"32px 16px", textAlign:"center", color: C.textMut, fontSize:12, borderRadius:10, border:`1px dashed ${C.border}`, background: C.surface }}>
              {t("Tidak ada proyek ditemukan.","No projects found.")}
            </div>
          ) : (
            <>
              {visibleProjects.map(p => (
                <ProjectCard key={p.id} project={p} selected={selected === p.id} onSelect={handleSelectProject} t={t} />
              ))}
              {hasMoreProjects && (
                <button
                  ref={loadMoreRef}
                  type="button"
                  className="pd-load-more"
                  onClick={() => setVisibleCount(current => Math.min(current + PROJECT_BATCH_SIZE, filtered.length))}
                >
                  {t("Memuat proyek berikutnya…", "Loading more projects…")}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile-only: kartu detail full-screen, slide dari kanan saat sebuah
          proyek di-tap di list. Di desktop elemen ini "display:none" total
          (lihat CSS) — detail selalu tampil side-by-side seperti biasa. */}
      <div
        ref={overlayRef}
        className={`pd-mobile-detail ${mobileView === "detail" ? "open" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {project && <DetailPanel project={project} lang={lang} centered />}
      </div>

      <style>{`
        /* Desktop: preview di KIRI (70%), search+filter+list di KANAN (30%). */
        .proj-grid {
          display: grid;
          grid-template-columns: 1fr minmax(280px, 30%);
          grid-template-areas: "detail filter" "detail list";
          grid-template-rows: auto 1fr;
          gap: 20px;
        }
        /* Perf: kartu di luar viewport tidak usah di-layout/paint dulu —
           list bisa ratusan item, ini bikin scroll jauh lebih ringan. */
        .pc-card { content-visibility: auto; contain-intrinsic-size: auto 96px; }
        .pd-sticky-wrap  { display: contents; }
        .pd-sticky-inner { display: contents; }
        .pd-filter    { grid-area: filter; align-self: start; }
        .detail-panel { grid-area: detail; }
        .pd-list      { grid-area: list; display: flex; flex-direction: column; gap: 8px; align-self: start; }
        .pd-load-more { min-height: 36px; border: 0; background: transparent; color: ${C.textMut}; font: inherit; font-size: 11px; cursor: pointer; }

        /* Desktop: HANYA .pd-list yang discroll (scroll internal sendiri),
           filter & detail-panel benar-benar fixed di tempat — bukan lagi
           position:sticky yg gagal kalau detail-panel jadi lebih tinggi dari
           viewport (sticky cuma nahan bagian ATAS, bagian bawah tetap kebawa
           scroll). Solusinya: .pd-page jadi 1 layar penuh (height:100vh, tanpa
           scroll page-level), lalu tiap kolom kanan/kiri punya tinggi sendiri
           dan overflow-y:auto MASING-MASING — jadi tinggi konten filter/detail
           tidak lagi harus "pas" sama tinggi list. */
        @media (min-width: 769px) {
          .pd-page {
            height: 100vh; overflow: hidden; box-sizing: border-box;
            display: flex; flex-direction: column;
          }
          .pd-title { flex-shrink: 0; }
          .proj-grid { flex: 1; min-height: 0; }
          .pd-filter    { flex-shrink: 0; background: ${C.bg}; padding-bottom: 10px; }
          .pd-list      { align-self: stretch; overflow-y: auto; min-height: 0; padding-bottom: 8px; }
          .detail-panel { align-self: stretch; height: 100%; overflow-y: auto; }
        }

        @media (max-width: 768px) {
          /* Judul halaman disembunyikan di mobile — nama halaman sudah ada di
             topbar, jadi filter bisa langsung rapat ke header tanpa jarak. */
          .pd-title { display: none; }
          .pd-page  { padding: 0 14px 24px; }

          /* iOS Safari auto-zoom in ke input begitu di-tap kalau font-size-nya
             <16px — browser anggap itu perlu di-zoom biar kebaca. Efeknya
             layout kelihatan "berantakan"/ketarik pas keyboard muncul
             (dilaporkan user). 16px adalah threshold aman minimum, jadi
             browser tidak pernah men-trigger auto-zoom itu sama sekali. */
          .pd-search-input { font-size: 16px !important; }

          .proj-grid {
            grid-template-columns: 1fr;
            grid-template-areas: "wrap" "list";
            grid-template-rows: auto 1fr;
            gap: 0;
          }
          /* Wrapper jadi kotak sticky sungguhan (bukan display:contents lagi) —
             filter+detail card ketumpuk di dalamnya sebagai SATU unit yang
             nempel di atas, sementara .pd-list di luar wrapper tetap scroll normal.
             top HARUS setinggi topbar fixed (56px + safe-area) — kalau top:0,
             sticky-nya nempel PAS di belakang topbar yang z-index-nya lebih
             tinggi, jadi search bar (bagian paling atas) ketutupan topbar dan
             kelihatan seperti "ikut turun"/hilang walau elemennya sebenarnya
             tetap di situ (cuma ketutup). Layout flex dipisah ke .pd-sticky-inner
             (anak di dalamnya, tidak sticky) supaya display:flex tidak nempel
             di elemen sticky yang sama (kombinasi itu juga rawan bug di WebKit). */
          /* Glass-blur transparan, disamakan dgn topbar/bottom nav (App.jsx)
             supaya konsisten sebagai satu "lapisan mengambang" yang sama —
             sebelumnya solid ${C.bg}, kelihatan beda sendiri dari topbar. */
          .pd-sticky-wrap {
            display: block;
            grid-area: wrap; position: -webkit-sticky; position: sticky;
            top: calc(56px + env(safe-area-inset-top, 0px)); z-index: 20;
            margin: 0 -14px;
            padding: 0 14px;
            background: linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.38) 68%, rgba(255,255,255,0.10) 100%);
            -webkit-backdrop-filter: blur(14px) saturate(1.35);
            backdrop-filter: blur(14px) saturate(1.35);
            box-shadow: 0 10px 22px rgba(15,23,42,0.08);
          }
          .pd-sticky-wrap::after { display:none; }
          .pd-sticky-inner {
            display: flex; flex-direction: column; gap: 12px;
            padding: 14px 0 12px;
          }
          .pd-filter { display:flex; flex-direction:column; align-items:center; }
          .pd-filter > div { width:100%; max-width:340px; }
          .pd-filter > div:nth-child(2) { justify-content:center; }
          .pd-list { margin-top: 4px; }

          /* Kartu detail (sticky, stacked di atas list) DIHAPUS dari tampilan
             mobile — diganti tampilan slide full-screen (.pd-mobile-detail di
             bawah) yang muncul cuma saat sebuah proyek di-tap. Sebelumnya kartu
             ini (dgn thumbnail) bisa mengisi hampir seluruh viewport, bikin
             list di bawahnya cuma nyisa beberapa piksel yang ketutup bottom
             nav — kelihatan seperti list-nya hilang total. */
          .detail-panel { display: none; }
        }

        /* ── MOBILE DETAIL SLIDE-IN ───────────────────────────────────────
           Full-screen di atas list+filter, slide dari kanan saat kartu di
           list di-tap (lihat handleSelectProject). Ditumpangkan tepat di
           area antara topbar & bottom nav (keduanya fixed, z-index 300),
           jadi z-index elemen ini di bawah itu supaya topbar (nama proyek +
           back arrow, lihat App.jsx) & bottom nav tetap kelihatan di atasnya. */
        .pd-mobile-detail { display: none; }
        @media (max-width: 768px) {
          .pd-mobile-detail {
            display: block;
            position: fixed;
            top: calc(56px + env(safe-area-inset-top, 0px));
            bottom: calc(72px + env(safe-area-inset-bottom, 0px));
            left: 0; right: 0;
            /* Glass-blur 60% transparan (40% opak) — halaman detail proyek
               yang muncul saat kartu di list di-tap. */
            background: rgba(255,255,255,0.40);
            -webkit-backdrop-filter: blur(14px) saturate(1.5);
            backdrop-filter: blur(14px) saturate(1.5);
            z-index: 250;
            overflow-y: auto;
            padding: 16px 14px 24px;
            box-sizing: border-box;
            transform: translateX(100%);
            transition: transform .25s cubic-bezier(.4,0,.2,1);
            will-change: transform;
          }
          .pd-mobile-detail.open     { transform: translateX(0); }
          .pd-mobile-detail.dragging { transition: none; }
        }

        /* Panah "bisa di-klik" di tiap kartu list — CUMA mobile (lihat
           komentar di ProjectCard). Di desktop selalu disembunyikan. */
        .pc-arrow { display: none; flex-shrink: 0; }
        @media (max-width: 768px) {
          .pc-arrow { display: block; }
        }
      `}</style>
    </div>
  );
}
