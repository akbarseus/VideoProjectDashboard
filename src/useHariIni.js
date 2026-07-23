import { useEffect, useState } from "react";
import { APPS_SCRIPT_URL } from "./config/env";

const MONTHS_EN = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const CACHE_KEY = "vpd_calendar_today_v1";

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

export function getWIBTodayParts() {
  const wibMilliseconds = Date.now() + 7 * 60 * 60 * 1000;
  const date = new Date(wibMilliseconds);
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

function getWIBDateKey() {
  const { y, m, day } = getWIBTodayParts();
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function readCalendarCache(dateKey) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    return cached?.dateKey === dateKey ? cached.today : null;
  } catch {
    return null;
  }
}

function writeCalendarCache(dateKey, today) {
  try {
    if (today) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ dateKey, today }));
    } else {
      sessionStorage.removeItem(CACHE_KEY);
    }
  } catch {
    // Cache is an optimization only; the live request remains authoritative.
  }
}

export function useHariIni() {
  const [dateKey] = useState(getWIBDateKey);
  const [cachedToday] = useState(() => readCalendarCache(dateKey));
  const [today, setToday] = useState(cachedToday);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    async function loadCalendar() {
      try {
        const response = await fetch(
          `${APPS_SCRIPT_URL}?route=calendar&date=${encodeURIComponent(dateKey)}`,
          {
          cache: "no-store",
          signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error(`calendar-http-${response.status}`);

        const json = await response.json();
        const rows = Array.isArray(json.rows) ? json.rows : [];
        const wib = getWIBTodayParts();

        let match = null;
        for (const row of rows) {
          const parsed = parseSheetDate(row.tanggal);
          if (
            parsed
            && parsed.y === wib.y
            && parsed.m === wib.m
            && parsed.day === wib.day
          ) {
            match = { ...row, day: parsed.day };
            break;
          }
        }

        if (!cancelled) {
          setToday(match);
          writeCalendarCache(dateKey, match);
        }
      } catch {
        // Preserve a same-day cached value when the background refresh fails.
        if (!cancelled && !cachedToday) setToday(null);
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    }

    loadCalendar();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [cachedToday, dateKey]);

  return { today, loading };
}
