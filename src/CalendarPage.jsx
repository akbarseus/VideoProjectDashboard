import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useCalendarMonth } from "./useCalendarMonth";
import { getWIBTodayParts } from "./useHariIni";
import { CALENDAR_URL } from "./config/env";
import { APP_COLORS } from "./styles/theme";

const C = {
  ...APP_COLORS,
  surface: "#FFFFFF",
  textH: "#0F172A",
  textSec: "#64748B",
  textMut: "#94A3B8",
};

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Status di sheet cuma 2 nilai ("UNLUCKY DAY" / "MIXED ACTIVITIES") — dipetakan
// ke label singkat + warna semantik utk chip di grid (teks tetap dipertahankan,
// bukan warna doang, supaya tidak bergantung pada warna semata).
function statusMeta(status) {
  const isUnlucky = String(status || "").toUpperCase().includes("UNLUCKY");
  return isUnlucky
    ? { label: "Unlucky", color: C.red, bg: C.redBg }
    : { label: "Mixed", color: C.teal, bg: C.tealBg };
}

function buildGridDays(viewYear, viewMonth) {
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun
  const gridStart = new Date(viewYear, viewMonth, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return { y: d.getFullYear(), m: d.getMonth(), day: d.getDate(), inMonth: d.getMonth() === viewMonth };
  });
}

// Cuplikan singkat (2-3 kata pertama) utk ditampilkan langsung di sel —
// versi lengkap (semua item) baru muncul di popover saat hover.
function snippetOf(row) {
  const source = row.favourable || row.unfavourable || "";
  if (!source) return "";
  const words = source.split(/[\s,]+/).filter(Boolean).slice(0, 3);
  const hasMore = source.split(/[\s,]+/).filter(Boolean).length > 3;
  return words.join(" ") + (hasMore ? "…" : "");
}

function DayCell({ cell, isToday, row }) {
  const meta = row ? statusMeta(row.status) : null;
  const snippet = row ? snippetOf(row) : "";

  return (
    <div className={`cal-cell ${cell.inMonth ? "" : "cal-cell-out"} ${isToday ? "cal-cell-today" : ""} ${meta ? "cal-cell-has-data" : ""}`}>
      <div className="cal-cell-head">
        <span className="cal-cell-date">{cell.day}</span>
        {isToday && <span className="cal-today-badge">Today</span>}
      </div>

      {meta && (
        <>
          <span className="cal-chip" style={{ color: meta.color, background: meta.bg }}>
            {meta.label}
          </span>
          {snippet && <span className="cal-snippet">{snippet}</span>}
          <div className="cal-pop">
            <div className="cal-pop-date">{MONTH_LABELS[cell.m]} {cell.day}, {cell.y}</div>
            {row.favourable && (
              <div className="cal-pop-block">
                <div className="cal-pop-label" style={{ color: C.red }}>Favourable Activities</div>
                <div className="cal-pop-text">{row.favourable}</div>
              </div>
            )}
            {row.unfavourable && (
              <div className="cal-pop-block">
                <div className="cal-pop-label" style={{ color: C.textH }}>Unfavourable Activities</div>
                <div className="cal-pop-text">{row.unfavourable}</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { rows, loading, error } = useCalendarMonth();
  const today = useMemo(getWIBTodayParts, []);
  const [view, setView] = useState({ y: today.y, m: today.m });

  const rowsByKey = useMemo(() => {
    const map = new Map();
    rows.forEach(r => map.set(`${r.y}-${r.m}-${r.day}`, r));
    return map;
  }, [rows]);

  const days = useMemo(() => buildGridDays(view.y, view.m), [view]);
  const monthHasData = useMemo(
    () => rows.some(r => r.y === view.y && r.m === view.m),
    [rows, view],
  );

  const goMonth = delta => {
    setView(v => {
      const next = new Date(v.y, v.m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  };
  const goToday = () => setView({ y: today.y, m: today.m });

  return (
    <div className="cal-page">
      <style>{`
        .cal-page { padding: 18px 24px 40px; }
        .cal-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
        .cal-title { font-size: 18px; font-weight: 800; color: ${C.textH}; letter-spacing: -0.02em; margin-bottom: 3px; }
        .cal-sub { font-size: 12.5px; color: ${C.textSec}; }

        .cal-nav { display: flex; align-items: center; gap: 6px; }
        .cal-nav-btn {
          width: 30px; height: 30px; border-radius: 8px; border: 1px solid ${C.border};
          background: ${C.surface}; color: ${C.textSec}; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: border-color .15s, color .15s;
        }
        .cal-nav-btn:hover { border-color: ${C.tealBd}; color: ${C.teal}; }
        .cal-nav-label { font-size: 14px; font-weight: 700; color: ${C.textH}; min-width: 132px; text-align: center; }
        .cal-today-btn {
          padding: 7px 14px; border-radius: 8px; border: 1px solid ${C.border}; background: ${C.surface};
          font-size: 12px; font-weight: 650; color: ${C.textSec}; cursor: pointer; transition: all .15s;
        }
        .cal-today-btn:hover { border-color: ${C.tealBd}; color: ${C.teal}; }
        .cal-pdf-link {
          display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600;
          color: ${C.textMut}; text-decoration: none; padding: 7px 4px; transition: color .15s;
        }
        .cal-pdf-link:hover { color: ${C.teal}; }

        /* TANPA overflow:hidden — kalau di-clip, popover hover (yg posisinya
           absolute, bisa menjorok keluar kotak) ikut kepotong utk sel di
           baris/kolom pinggir. Sudut membulat cukup ditaruh di elemen ujung
           saja (header atas, 2 sel pojok bawah — grid selalu 6 baris x 7
           kolom = 42 sel tetap). */
        .cal-grid-wrap { background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 16px; box-shadow: 0 1px 2px rgba(10,15,30,0.04), 0 4px 12px rgba(10,15,30,0.05); }
        .cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); background: ${C.bg}; border-bottom: 1px solid ${C.border}; border-radius: 16px 16px 0 0; }
        .cal-weekday { padding: 10px 0; text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: ${C.textMut}; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); }

        .cal-cell {
          position: relative; min-height: 92px; padding: 8px; border-right: 1px solid ${C.border}; border-bottom: 1px solid ${C.border};
          display: flex; flex-direction: column; gap: 6px;
        }
        .cal-grid .cal-cell:nth-child(7n) { border-right: none; }
        .cal-grid .cal-cell:nth-child(36) { border-bottom-left-radius: 16px; }
        .cal-grid .cal-cell:nth-child(42) { border-bottom-right-radius: 16px; }
        .cal-cell-out { background: ${C.bg}; }
        .cal-cell-out .cal-cell-date { color: ${C.textMut}; }
        .cal-cell-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
        .cal-cell-date { font-size: 12.5px; font-weight: 650; color: ${C.textH}; font-variant-numeric: tabular-nums; }
        .cal-today-badge { font-size: 9px; font-weight: 800; letter-spacing: 0.04em; color: #fff; background: ${C.teal}; padding: 2px 6px; border-radius: 8px; }
        .cal-cell-today { box-shadow: inset 0 0 0 1.5px ${C.teal}; background: ${C.tealBg}; }

        /* Chip status — teks singkat, detail lengkap baru muncul saat hover
           (popover) supaya grid tetap ringkas & tidak padat (per arahan user). */
        .cal-chip {
          align-self: flex-start; font-size: 10.5px; font-weight: 700;
          padding: 3px 9px; border-radius: 20px; cursor: default;
        }
        .cal-cell-has-data { cursor: default; }
        .cal-snippet {
          font-size: 10.5px; color: ${C.textMut}; line-height: 1.3;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .cal-pop {
          position: absolute; left: 4px; top: calc(100% + 6px); z-index: 40;
          width: 240px; padding: 12px 14px; border-radius: 12px;
          background: rgba(255,255,255,0.9);
          -webkit-backdrop-filter: blur(16px) saturate(1.6);
          backdrop-filter: blur(16px) saturate(1.6);
          border: 1px solid rgba(226,232,240,0.8);
          box-shadow: 0 12px 32px rgba(15,23,42,0.16);
          opacity: 0; visibility: hidden; transform: translateY(-4px);
          transition: opacity .15s ease, transform .15s ease, visibility .15s;
          pointer-events: none;
        }
        .cal-cell-has-data:hover .cal-pop { opacity: 1; visibility: visible; transform: translateY(0); pointer-events: auto; }
        /* 2 kolom paling kanan (Fri/Sat) — popover 240px lebar bisa nembus
           keluar viewport kalau tetap nempel kiri. Anchor dari kanan sel
           supaya tumbuh ke kiri, tetap dalam batas grid. */
        .cal-grid .cal-cell:nth-child(7n-1) .cal-pop,
        .cal-grid .cal-cell:nth-child(7n) .cal-pop {
          left: auto; right: 4px;
        }
        .cal-pop-date { font-size: 10.5px; font-weight: 700; color: ${C.textMut}; margin-bottom: 8px; }
        .cal-pop-block + .cal-pop-block { margin-top: 9px; }
        .cal-pop-label { font-size: 9.5px; font-weight: 800; letter-spacing: 0.03em; margin-bottom: 3px; }
        .cal-pop-text { font-size: 11.5px; color: #2D3748; line-height: 1.45; }

        .cal-empty-note { padding: 32px 16px; text-align: center; font-size: 12.5px; color: ${C.textMut}; }
        .cal-error { margin-bottom: 14px; padding: 10px 14px; border-radius: 10px; background: ${C.amberBg}; border: 1px solid ${C.amber}33; font-size: 12px; color: ${C.amber}; }

        @media (max-width: 768px) {
          .cal-page { padding: 16px 12px 80px; }
          .cal-cell { min-height: 64px; padding: 6px; }
          .cal-cell-date { font-size: 11px; }
          .cal-chip { font-size: 9px; padding: 2px 7px; }
          .cal-snippet { display: none; } /* cell mobile terlalu sempit utk cuplikan + chip + tanggal */
          .cal-today-badge { display: none; }
          .cal-pop { width: 200px; left: 0; }
          .cal-weekday { font-size: 9.5px; }
        }
      `}</style>

      <div className="cal-top">
        <div>
          <div className="cal-title">Calendar</div>
          <div className="cal-sub">See which days favor shoots, meetings, or releases.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={() => goMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={15} />
            </button>
            <span className="cal-nav-label">{MONTH_LABELS[view.m]} {view.y}</span>
            <button className="cal-nav-btn" onClick={() => goMonth(1)} aria-label="Next month">
              <ChevronRight size={15} />
            </button>
          </div>
          <button className="cal-today-btn" onClick={goToday}>Today</button>
          <a className="cal-pdf-link" href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
            Full PDF <ArrowUpRight size={12} />
          </a>
        </div>
      </div>

      {error && (
        <div className="cal-error">Could not load calendar data — showing what's cached.</div>
      )}

      <div className="cal-grid-wrap">
        <div className="cal-weekdays">
          {WEEKDAY_LABELS.map(w => <div key={w} className="cal-weekday">{w}</div>)}
        </div>
        <div className="cal-grid">
          {days.map((cell, i) => (
            <DayCell
              key={i}
              cell={cell}
              isToday={cell.y === today.y && cell.m === today.m && cell.day === today.day}
              row={rowsByKey.get(`${cell.y}-${cell.m}-${cell.day}`)}
            />
          ))}
        </div>
        {!loading && !monthHasData && (
          <div className="cal-empty-note">No calendar data for {MONTH_LABELS[view.m]} {view.y} yet.</div>
        )}
      </div>
    </div>
  );
}
