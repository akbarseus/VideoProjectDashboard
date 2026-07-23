import { useCallback, useEffect, useState } from "react";
import { APPS_SCRIPT_URL } from "./config/env";
import { normalizeProjects, SAMPLE_PROJECTS } from "./data/projectModel";

export const BASE_URL = APPS_SCRIPT_URL;
const CACHE_KEY = "vpd_projects_cache_v1";

export function isValidUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

export function formatDateDMY(raw) {
  if (!raw) return "";
  const value = String(raw).trim();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = [
  ...Array.from({ length: 6 }, (_, index) => String(CURRENT_YEAR - index)),
  "all",
];
export const DEFAULT_YEAR = String(CURRENT_YEAR);
export const CURRENT_YEAR_STR = String(CURRENT_YEAR);

function readSessionCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(rows) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(rows));
  } catch {
    // Storage can be unavailable or full. Fresh network data still remains usable.
  }
}

async function fetchProjects() {
  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`${BASE_URL}?route=projects`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        const httpError = new Error(`http-${response.status}`);
        httpError.status = response.status;
        throw httpError;
      }
      const json = await response.json();
      const rows = json.rows ?? json.projects ?? json.data ?? [];
      if (!Array.isArray(rows) || rows.length === 0) throw new Error("empty");
      return rows;
    } catch (error) {
      lastError = error;
      const status = error?.status;
      const retryable = error?.name === "AbortError" || !status || status >= 500;
      if (attempt < maxAttempts && retryable) {
        await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("unknown");
}

export function useVideoProjects() {
  const [initialCache] = useState(() => readSessionCache());
  const [rows, setRows] = useState(() =>
    normalizeProjects(initialCache ?? SAMPLE_PROJECTS),
  );
  const [loading, setLoading] = useState(() => !initialCache);
  const [error, setError] = useState(null);
  const [updated, setUpdated] = useState(() => new Date());

  const load = useCallback(async () => {
    const hasCache = Boolean(readSessionCache());
    setLoading((current) => (hasCache ? current : true));
    setError(null);

    try {
      const raw = await fetchProjects();
      setRows(normalizeProjects(raw));
      writeSessionCache(raw);
    } catch (loadError) {
      if (!readSessionCache()) {
        setError(loadError.name === "AbortError" ? "timeout" : loadError.message);
        setRows(normalizeProjects(SAMPLE_PROJECTS));
      }
    } finally {
      setLoading(false);
      setUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, loading, error, updated, refresh: load };
}

export function filterByYear(rows, year) {
  if (year === "all") return rows;
  return rows.filter((row) => row.year === year);
}

const translateCache = new Map();
const TRANSLATE_CACHE_MAX = 200;

async function translateText(text, targetLang) {
  const cacheKey = `${targetLang}:${text}`;
  if (translateCache.has(cacheKey)) return translateCache.get(cacheKey);

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`translate-http-${response.status}`);
  const json = await response.json();
  const translated = json[0].map((segment) => segment[0]).join("");

  if (translateCache.size >= TRANSLATE_CACHE_MAX) {
    translateCache.delete(translateCache.keys().next().value);
  }
  translateCache.set(cacheKey, translated);
  return translated;
}

export function useAutoTranslate(text, lang) {
  const [output, setOutput] = useState(text || "");

  useEffect(() => {
    let cancelled = false;
    if (!text || lang !== "en") {
      setOutput(text || "");
      return undefined;
    }

    setOutput(text);
    translateText(text, "en")
      .then((result) => {
        if (!cancelled) setOutput(result);
      })
      .catch(() => {
        if (!cancelled) setOutput(text);
      });

    return () => {
      cancelled = true;
    };
  }, [text, lang]);

  return output;
}
