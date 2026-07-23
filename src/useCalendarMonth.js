import { useEffect, useState } from "react";
import { APPS_SCRIPT_URL } from "./config/env";

const MONTHS_EN = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const CACHE_KEY = "vpd_calendar_all_v1";

// Parsing manual (regex), BUKAN new Date(string) — konsisten dgn useHariIni.js,
// supaya kegagalan parse selalu jatuh ke null (bukan salah timezone/locale).
function parseSheetDate(value) {
  if (!value) return null;
  const match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(String(value).trim());
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = MONTHS_EN.indexOf(match[2].toLowerCase());
  const year = Number.parseInt(match[3], 10);
  if (month === -1 || Number.isNaN(day) || Number.isNaN(year)) return null;
  return { y: year, m: month, day };
}

function readCache() {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeCache(rows) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(rows));
  } catch {
    // Cache is an optimization only; the live dataset stays authoritative.
  }
}

/**
 * Seluruh isi tab "Kalender 2026" (tanpa filter tanggal) — dipakai halaman
 * Calendar untuk render grid bulan, terpisah dari useHariIni() (yang cuma
 * ambil 1 baris "hari ini" utk widget top-nav). Diindeks per {y,m,day} biar
 * lookup per-sel grid O(1).
 */
export function useCalendarMonth() {
  const [cachedRows] = useState(readCache);
  const [rows, setRows] = useState(cachedRows || []);
  const [loading, setLoading] = useState(!cachedRows);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    async function load() {
      try {
        const response = await fetch(`${APPS_SCRIPT_URL}?route=calendar`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`calendar-http-${response.status}`);

        const json = await response.json();
        const raw = Array.isArray(json.rows) ? json.rows : [];
        const parsed = raw
          .map(row => {
            const d = parseSheetDate(row.tanggal);
            return d ? { ...row, y: d.y, m: d.m, day: d.day } : null;
          })
          .filter(Boolean);

        if (!cancelled) {
          setRows(parsed);
          writeCache(parsed);
          setError(null);
        }
      } catch (err) {
        if (!cancelled && !cachedRows) {
          setError(err.name === "AbortError" ? "timeout" : err.message);
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rows, loading, error };
}
