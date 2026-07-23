import { useState, useEffect } from "react";
import { ArrowLeft, CalendarHeart } from "lucide-react";
import { useVideoProjects } from "./useVideoProjects";
import { useHariIni } from "./useHariIni";
import { APP_COLORS } from "./styles/theme";
import { getNavigation } from "./config/navigation";
import AppRoutes from "./app/AppRoutes";
import SplashScreen from "./SplashScreen";

/* ─── TOKENS ────────────────────────────────────────────────────────────── */
const C = {
  ...APP_COLORS,
  bg:      "#F8FAFC",
  surface: "#FFFFFF",
  border:  "#E2E8F0",
  soft:    "#F1F5F9",
  teal:    "#3EBDAC",
  tealBg:  "#E8F8F6",
  tealBd:  "rgba(62,189,172,0.28)",
  green:   "#059669",
  greenBg: "#ECFDF5",
  greenBd: "rgba(5,150,105,0.25)",
  textH:   "#0F172A",
  textSec: "#64748B",
  textMut: "#94A3B8",
};

const TB_H  = 56;
// Bottom nav mobile: +20% dari tinggi semula (60px) supaya tidak terlalu
// mepet dengan tepi bawah layar.
const MBN_H = 72;

/* ─── SUN LOGOGRAM (ikon sunburst resmi — sun-logogram.svg, inline SVG) ──── */
function SunMark({ size = 26 }) {
  return (
    <svg viewBox="0 0 42.35 44.83" height={size} width={Math.round((42.35 / 44.83) * size)}
      xmlns="http://www.w3.org/2000/svg" style={{ display:"block", flexShrink:0 }}>
      <g fill="#3ebdac">
        <path d="M.39,14.26c-.13,0-.26,0-.39,0,1.17,2.47,1.82,5.23,1.82,8.15s-.65,5.68-1.82,8.15c.13,0,.26,0,.39,0,4.51,0,8.16-3.65,8.16-8.16S4.89,14.26.39,14.26Z"/>
        <path d="M41.96,14.26c.13,0,.26,0,.39,0-1.17,2.47-1.82,5.23-1.82,8.15s.65,5.68,1.82,8.15c-.13,0-.26,0-.39,0-4.51,0-8.16-3.65-8.16-8.16s3.65-8.16,8.16-8.16Z"/>
        <path d="M3.72,36.34c-.07.11-.13.23-.19.34,2.72.23,5.44,1.04,7.97,2.5,2.52,1.46,4.59,3.4,6.15,5.65.07-.11.14-.22.2-.33,2.25-3.9.92-8.89-2.99-11.14s-8.89-.92-11.14,2.99Z"/>
        <path d="M24.51.33c.07-.11.13-.22.2-.33,1.56,2.25,3.62,4.19,6.15,5.65,2.52,1.46,5.24,2.27,7.97,2.5-.06.11-.12.23-.19.34-2.25,3.9-7.24,5.24-11.14,2.99s-5.24-7.24-2.99-11.14Z"/>
        <path d="M24.51,44.49c.07.11.13.22.2.33,1.56-2.25,3.62-4.19,6.15-5.65,2.52-1.46,5.24-2.27,7.97-2.5-.06-.11-.12-.23-.19-.34-2.25-3.9-7.24-5.24-11.14-2.99s-5.24,7.24-2.99,11.14Z"/>
        <path d="M3.72,8.49c-.07-.11-.13-.23-.19-.34,2.72-.23,5.44-1.04,7.97-2.5S16.09,2.25,17.64,0c.07.11.14.22.2.33,2.25,3.9.92,8.89-2.99,11.14s-8.89.92-11.14-2.99Z"/>
      </g>
    </svg>
  );
}

/* ─── HARI INI DI TOP-NAV (desktop-only) ────────────────────────────────────
 * Menggantikan kartu "Hari Ini" di halaman Dashboard — pojok kanan nav cuma
 * menampilkan TANGGAL; detail (Favourable/Unfavourable) baru keluar saat
 * di-hover, sebagai popover. Kalau data kalender tidak ada utk hari ini,
 * elemen ini tidak render sama sekali. */
function HariIniNav({ today, t }) {
  if (!today) return null;

  const isUnlucky = String(today.status || "").toUpperCase().includes("UNLUCKY");
  const favText = isUnlucky ? "Unlucky day" : today.favourable;
  const unfavText = isUnlucky ? "Unlucky day" : today.unfavourable;

  return (
    <div className="hariini-nav">
      <div className="hariini-nav-chip">
        <CalendarHeart size={13} />
        <span>{today.day} {today.bulan}</span>
      </div>
      <div className="hariini-nav-pop">
        <div style={{ fontSize:11, fontWeight:700, color: C.textMut, marginBottom:8 }}>
          {t("Hari Ini","Today")} · {today.hari || ""} {today.day} {today.bulan}
        </div>
        {favText && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:800, color:"#DC2626", letterSpacing:"0.02em", marginBottom:3 }}>
              Favourable Activities
            </div>
            <div style={{ fontSize:12, color:"#2D3748", lineHeight:1.45 }}>{favText}</div>
          </div>
        )}
        {unfavText && (
          <div>
            <div style={{ fontSize:10, fontWeight:800, color: C.textH, letterSpacing:"0.02em", marginBottom:3 }}>
              Unfavourable Activities
            </div>
            <div style={{ fontSize:12, color:"#2D3748", lineHeight:1.45 }}>{unfavText}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [page,     setPage]     = useState("highlight");
  const [scrolled, setScrolled] = useState(false);
  // Toggle bahasa dihapus (permintaan user) — seluruh app fix Bahasa Inggris.
  const lang = "en";
  const [detailId, setDetailId] = useState(null);
  // Diisi ProjectDetailPage lewat onMobileDetailChange saat mobile lagi
  // nampilin slide-in detail proyek — dipakai buat override topbar (nama
  // proyek + back-arrow balik ke list). Null kalau tidak sedang di kondisi
  // itu (termasuk saat halaman lain / desktop).
  const [mobileDetail, setMobileDetail] = useState(null);

  // Satu instance data untuk semua halaman — pindah tab tidak memicu fetch
  // ulang ke Apps Script dari nol.
  const videoData = useVideoProjects();
  const hariIniData = useHariIni();

  const openDetail = (id) => { setDetailId(id); setPage("detail"); };

  // Jaga-jaga: begitu pindah keluar dari halaman Data (detail), override
  // topbar (nama proyek) harus ikut hilang juga.
  useEffect(() => {
    if (page !== "detail") setMobileDetail(null);
  }, [page]);

  useEffect(() => {
    let rafId = null;
    const updateScrolled = () => {
      rafId = null;
      const next = window.scrollY > 20;
      setScrolled(current => current === next ? current : next);
    };
    const onScroll = () => {
      if (rafId == null) rafId = requestAnimationFrame(updateScrolled);
    };

    updateScrolled();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  const t = (id, en) => lang === "id" ? id : en;

  const NAV = getNavigation(t);
  const active = NAV.find(n => n.id === page);

  return (
    <>
      {/* Splash berakhir begitu data proyek selesai resolve (sukses ATAU
          fallback SAMPLE) — TIDAK menunggu useHariIni. Lihat
          specs/splash-loading-screen.md. */}
      <SplashScreen ready={!videoData.loading} />

      <style>{`
        /* ── TOP NAV (desktop) / TOPBAR (mobile) ── */
        .tb {
          position: fixed; top: 0; left: 0; right: 0; z-index: 300;
          height: ${TB_H}px;
          /* Grid 3-kolom (1fr auto 1fr) — cara standar bikin kolom TENGAH
             (pill menu) benar-benar center di seluruh bar, terlepas dari
             lebar brand (kiri) vs kontrol kanan yang tidak simetris. Flexbox
             + spacer tunggal (cara lama) cuma nge-push ke kanan, bukan
             nge-center relatif ke bar. */
          display: grid; grid-template-columns: 1fr auto 1fr;
          grid-template-areas: "brand pills side";
          align-items: center; column-gap: 18px;
          padding: 0 22px;
          background: rgba(255,255,255,0.82);
          -webkit-backdrop-filter: blur(14px) saturate(1.5);
          backdrop-filter: blur(14px) saturate(1.5);
          border-bottom: 1px solid rgba(226,232,240,0.7);
          transition: background 0.25s ease, box-shadow 0.25s ease;
          will-change: background;
          /* position:fixed + backdrop-filter dikenal suka gagal repaint saat
             window di-resize di Chromium — dipaksa jadi layer compositing sendiri. */
          transform: translateZ(0);
        }
        .tb.scrolled {
          background: rgba(255,255,255,0.68);
          border-bottom-color: rgba(226,232,240,0.45);
          box-shadow: 0 1px 0 rgba(15,23,42,0.05), 0 4px 20px rgba(15,23,42,0.04);
        }

        .tb-brand { grid-area: brand; justify-self: start; display: flex; align-items: center; gap: 10px; min-width: 0; }
        .tb-title { font-size: 14px; font-weight: 800; letter-spacing: -0.01em; color: ${C.textH}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Pill menu — kolom TENGAH grid, otomatis center di seluruh bar.
           Halaman aktif dapat isian teal lembut. */
        .tb-pills {
          grid-area: pills; justify-self: center;
          display: flex; align-items: center; gap: 4px;
          background: ${C.soft}; border: 1px solid ${C.border};
          border-radius: 24px; padding: 3px; flex-shrink: 0;
        }
        .tb-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 16px; border-radius: 20px; border: none;
          background: transparent; cursor: pointer;
          font-size: 12.5px; font-weight: 600; color: ${C.textSec};
          text-decoration: none; white-space: nowrap;
          transition: background .18s, color .18s, box-shadow .18s;
        }
        .tb-pill:hover { color: ${C.textH}; background: rgba(255,255,255,0.9); }
        .tb-pill.on {
          background: ${C.surface}; color: ${C.teal}; font-weight: 700;
          box-shadow: 0 1px 4px rgba(15,23,42,0.08), inset 0 0 0 1px ${C.tealBd};
        }

        /* Spacer cuma dibutuhkan di layout flex (mobile) — di grid desktop
           tidak perlu ikut menempati kolom manapun. */
        .tb-spacer { display: none; }
        .tb-side   { grid-area: side; justify-self: end; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

        /* Chip "Hari Ini" — tanggal saja; detail keluar saat hover (popover).
           Desktop-only (disembunyikan total di mobile). */
        .hariini-nav { position: relative; flex-shrink: 0; }
        .hariini-nav-chip {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 13px; border-radius: 20px;
          border: 1px solid ${C.border}; background: ${C.surface};
          font-size: 11.5px; font-weight: 700; color: ${C.textSec};
          white-space: nowrap; cursor: default;
          transition: border-color .15s, color .15s;
        }
        .hariini-nav:hover .hariini-nav-chip { border-color: ${C.tealBd}; color: ${C.teal}; }
        /* Popover glass-blur — token transparansi/blur SAMA dgn header (.tb):
           rgba 0.82 + blur(14px) saturate(1.5), supaya terasa satu lapisan
           mengambang yang sama dgn topbar, bukan kartu putih beda sendiri.
           Transisi cuma opacity+transform (GPU-composited, tanpa reflow). */
        .hariini-nav-pop {
          position: absolute; top: calc(100% + 8px); right: 0; z-index: 500;
          width: 280px; padding: 14px 16px; border-radius: 14px;
          background: rgba(255,255,255,0.70);
          -webkit-backdrop-filter: blur(70px) saturate(1.35) brightness(1.06);
          backdrop-filter: blur(70px) saturate(1.35) brightness(1.06);
          border: 1px solid rgba(226,232,240,0.7);
          box-shadow: 0 12px 40px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.58);
          opacity: 0; visibility: hidden; transform: translateY(-4px) translateZ(0);
          transition: opacity .16s ease, transform .16s ease, visibility .16s;
          pointer-events: none;
        }
        .hariini-nav:hover .hariini-nav-pop {
          opacity: 1; visibility: visible; transform: translateY(0) translateZ(0);
          pointer-events: auto;
        }
        @media (prefers-reduced-transparency: reduce) {
          .hariini-nav-pop { background: rgba(255,255,255,0.97); -webkit-backdrop-filter: none; backdrop-filter: none; }
        }

        .tb-back {
          width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
          border: 1px solid ${C.border}; background: ${C.bg};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: ${C.textSec};
          transition: background .15s, border-color .15s, color .15s;
        }
        .tb-back:hover { background: ${C.tealBg}; border-color: ${C.tealBd}; color: ${C.teal}; }
        .tb-page      { display: none; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .tb-page-name { font-size: 13px; font-weight: 700; color: ${C.textH}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* ── MAIN CONTENT ── */
        .main {
          padding-top: ${TB_H}px;
          min-height: 100vh;
          background:
            radial-gradient(ellipse 65% 45% at 0% 0%, rgba(62,189,172,0.06) 0%, transparent 55%),
            radial-gradient(ellipse 55% 40% at 100% 0%, rgba(245,158,11,0.04) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 100% 100%, rgba(37,99,235,0.035) 0%, transparent 55%),
            #F7F9FC;
        }
        .main-inner {
          width: 100%;
          max-width: 1300px;
          margin: 0 auto;
        }

        /* ── MOBILE BOTTOM NAV ── */
        .mbn {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 300;
          height: calc(${MBN_H}px + env(safe-area-inset-bottom, 0px));
          padding: 0 8px;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          background: rgba(255,255,255,0.82);
            -webkit-backdrop-filter: blur(12px) saturate(1.35);
            backdrop-filter: blur(12px) saturate(1.35);
          border-top: 1px solid rgba(226,232,240,0.7);
          transform: translateZ(0);
          align-items: flex-start; justify-content: space-around;
          transition: background 0.25s ease;
        }
        .mbn.scrolled {
          background: rgba(255,255,255,0.68);
          border-top-color: rgba(226,232,240,0.45);
        }

        @media (max-width: 768px) {
          .tb, .mbn {
            -webkit-backdrop-filter: blur(10px) saturate(1.3);
            backdrop-filter: blur(10px) saturate(1.3);
          }
        }
        @media (max-width: 768px) and (hover: none) {
          .tb-pill:hover, .hariini-nav:hover .hariini-nav-chip, .hariini-nav:hover .hariini-nav-pop, .tb-back:hover {
            color:inherit; background:inherit; border-color:inherit;
          }
        }
        @media (prefers-reduced-transparency: reduce) {
          .tb, .mbn, .tb.scrolled, .mbn.scrolled {
            background: rgba(255,255,255,0.96);
            -webkit-backdrop-filter: none;
            backdrop-filter: none;
          }
        }
        .mbn-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 3px; flex: 1; height: 100%; padding: 6px 4px;
          border: none; background: none; cursor: pointer;
          border-radius: 10px; color: ${C.textMut};
          text-decoration: none;
          transition: color .15s;
        }
        .mbn-btn.on  { color: ${C.teal}; }
        .mbn-lbl { font-size: 10px; font-weight: 600; letter-spacing: .03em; }
        .mbn-btn.on::after {
          content: ''; display: block; width: 4px; height: 4px;
          border-radius: 50%; background: ${C.teal}; margin-top: 1px;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          /* Grid 3-kolom cuma dibutuhkan utk centering pill menu (desktop) —
             di mobile balik ke flex sederhana, sama seperti sebelumnya. */
          .tb { display: flex; align-items: center; gap: 18px; }
          .tb-brand, .tb-pills, .hariini-nav { display: none; }
          .tb-page { display: flex; }
          .tb-spacer { display: block; flex: 1; min-width: 8px; }
          .mbn { display: flex; }
          /* Full-bleed: topbar & bottom nav menyatu dengan status bar / home
             indicator perangkat (safe-area-inset), bukan berhenti di bawahnya. */
          .tb { height: calc(${TB_H}px + env(safe-area-inset-top, 0px)); padding-top: env(safe-area-inset-top, 0px); }
          .mbn { height: calc(${MBN_H}px + env(safe-area-inset-bottom, 0px)); }
          .main {
            padding-top: calc(${TB_H}px + env(safe-area-inset-top, 0px));
            padding-bottom: calc(${MBN_H}px + env(safe-area-inset-bottom, 0px));
          }
        }
        @media (max-width: 480px) {
          .tb { padding: 0 16px; }
        }
        /* Desktop sempit: judul brand disembunyikan duluan supaya pills +
           kontrol kanan tidak tumpang-tindih (graceful shrink, tanpa wrap). */
        @media (min-width: 769px) and (max-width: 960px) {
          .tb-title { display: none; }
        }
      `}</style>

      {/* ── TOP NAV / TOPBAR ── */}
      <header className={`tb ${scrolled ? "scrolled" : ""}`}>
        {/* Desktop: brand kiri */}
        <div className="tb-brand">
          <SunMark size={26} />
          <span className="tb-title">{t("Video Production Dashboard","Video Production Dashboard")}</span>
        </div>

        {/* Desktop: pill menu */}
        <nav className="tb-pills">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`tb-pill ${page === id ? "on" : ""}`} onClick={() => setPage(id)}>
              <Icon size={14} strokeWidth={page === id ? 2.5 : 2} />
              {label}
            </button>
          ))}
        </nav>

        {/* Mobile: back-arrow slide-in detail + logo + nama halaman */}
        <div className="tb-page">
          {mobileDetail && (
            <button className="tb-back" onClick={() => mobileDetail.onBack()}
              title={t("Kembali ke daftar","Back to list")}>
              <ArrowLeft size={15} />
            </button>
          )}
          <SunMark size={24} />
          <span className="tb-page-name">
            {mobileDetail ? mobileDetail.name : active?.label}
          </span>
        </div>

        <div className="tb-spacer" />

        <div className="tb-side">
          <HariIniNav today={hariIniData?.today ?? null} t={t} />
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="main">
        <div className="main-inner">
          <AppRoutes
            page={page}
            lang={lang}
            videoData={videoData}
            detailId={detailId}
            onOpenDetail={openDetail}
            onMobileDetailChange={setMobileDetail}
          />
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV: Dashboard | Data | Kalender ── */}
      <nav className={`mbn ${scrolled ? "scrolled" : ""}`}>
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`mbn-btn ${page === id ? "on" : ""}`}
            onClick={() => setPage(id)}>
            <Icon size={20} strokeWidth={page === id ? 2.5 : 1.8} />
            <span className="mbn-lbl">{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
