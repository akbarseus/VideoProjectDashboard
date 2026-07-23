import { useEffect, useState } from "react";

// 6 path logogram — SAMA PERSIS dgn logo/logo sun.svg (logogram resmi).
const PETAL_PATHS = [
  "M.39,14.26c-.13,0-.26,0-.39,0,1.17,2.47,1.82,5.23,1.82,8.15s-.65,5.68-1.82,8.15c.13,0,.26,0,.39,0,4.51,0,8.16-3.65,8.16-8.16S4.89,14.26.39,14.26Z",
  "M41.96,14.26c.13,0,.26,0,.39,0-1.17,2.47-1.82,5.23-1.82,8.15s.65,5.68,1.82,8.15c-.13,0-.26,0-.39,0-4.51,0-8.16-3.65-8.16-8.16s3.65-8.16,8.16-8.16Z",
  "M3.72,36.34c-.07.11-.13.23-.19.34,2.72.23,5.44,1.04,7.97,2.5,2.52,1.46,4.59,3.4,6.15,5.65.07-.11.14-.22.2-.33,2.25-3.9.92-8.89-2.99-11.14s-8.89-.92-11.14,2.99Z",
  "M24.51.33c.07-.11.13-.22.2-.33,1.56,2.25,3.62,4.19,6.15,5.65,2.52,1.46,5.24,2.27,7.97,2.5-.06.11-.12.23-.19.34-2.25,3.9-7.24,5.24-11.14,2.99s-5.24-7.24-2.99-11.14Z",
  "M24.51,44.49c.07.11.13.22.2.33,1.56-2.25,3.62-4.19,6.15-5.65,2.52-1.46,5.24-2.27,7.97-2.5-.06-.11-.12-.23-.19-.34-2.25-3.9-7.24-5.24-11.14-2.99s-5.24,7.24-2.99,11.14Z",
  "M3.72,8.49c-.07-.11-.13-.23-.19-.34,2.72-.23,5.44-1.04,7.97-2.5S16.09,2.25,17.64,0c.07.11.14.22.2.33,2.25,3.9.92,8.89-2.99,11.14s-8.89.92-11.14-2.99Z",
];

const SPIN_CYCLE_MS = 2400;
const EXIT_MS = 650;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = e => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Splash screen — tampil setiap App.jsx mount, menutup penuh viewport.
 * `ready` jadi true begitu useVideoProjects() selesai resolve (sukses ATAU
 * fallback SAMPLE) — TIDAK menunggu useHariIni, TIDAK ada durasi minimum
 * artifisial (lihat specs/splash-loading-screen.md). Cuma logogram, tanpa
 * teks/wordmark apapun — keenam sabit berputar sebagai satu kesatuan.
 */
export default function SplashScreen({ ready }) {
  const [mounted, setMounted] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(8);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (ready) setLeaving(true);
  }, [ready]);

  useEffect(() => {
    if (ready) { setProgress(100); return undefined; }
    const id = window.setInterval(() => setProgress(value => Math.min(value + 2, 92)), 120);
    return () => window.clearInterval(id);
  }, [ready]);

  // Fallback: kalau event `transitionend` entah kenapa tidak pernah menembak
  // (browser quirk, tab di-background, dsb), splash tidak boleh macet
  // selamanya menutupi app — paksa unmount setelah durasi transisi + jeda.
  useEffect(() => {
    if (!leaving) return undefined;
    const id = window.setTimeout(() => setMounted(false), EXIT_MS + 250);
    return () => window.clearTimeout(id);
  }, [leaving]);

  if (!mounted) return null;

  return (
    <div
      className={`splash ${leaving ? "is-leaving" : ""} ${reducedMotion ? "is-reduced" : ""}`}
      aria-hidden="true"
      onTransitionEnd={e => {
        if (e.propertyName === "transform") setMounted(false);
      }}
    >
      <div className="splash-content">
        <div className="splash-mark" data-petal-count={PETAL_PATHS.length}>
          <div className="splash-wordmark" data-text="SUN Video Production Dashboard" aria-label="SUN Video Production Dashboard">SUN Video Production Dashboard</div>
        </div>
        <div className="splash-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
          <span className="splash-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <style>{`
        .splash {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.42);
          -webkit-backdrop-filter: blur(18px) saturate(1.2);
          backdrop-filter: blur(18px) saturate(1.2);
          overflow:hidden;
          /* Ease-out-expo — cepat berangkat, mendarat lembut di ujung
             (gaya "tirai terangkat"), bukan gerakan linear/seragam. */
          transition: transform ${EXIT_MS}ms cubic-bezier(0.22, 1, 0.36, 1);
          transform: translateY(0);
          will-change: transform;
        }
        .splash::before { content:""; position:absolute; inset:-8%; z-index:0; pointer-events:none; background:radial-gradient(circle at 50% 42%, rgba(255,255,255,.82), transparent 38%), radial-gradient(circle at 20% 62%, rgba(62,189,172,.16), transparent 34%), radial-gradient(circle at 82% 34%, rgba(62,189,172,.12), transparent 30%), rgba(255,255,255,.48); background-size:100% 100%, 135% 135%, 130% 130%, 100% 100%; filter:blur(18px); animation:splash-ambient 8s ease-in-out infinite alternate; }
        @keyframes splash-ambient { from { background-position:50% 50%, 0% 50%, 100% 50%, 50% 50%; opacity:.78; } to { background-position:50% 50%, 18% 44%, 82% 56%, 50% 50%; opacity:.94; } }
        .splash.is-leaving {
          transform: translateY(-100%);
          pointer-events: none;
        }
        .splash.is-reduced {
          transition-duration: 120ms;
        }

        .splash-content { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:22px; }
        .splash-mark { position:relative; width:min(620px, 82vw); }
        .splash-wordmark {
          position:relative; font-size:clamp(18px, 3vw, 32px); font-weight:750; letter-spacing:-.045em; line-height:1.15; text-align:center; white-space:nowrap;
          background: linear-gradient(120deg, #252525 0%, #252525 40%, #3ebdac 50%, #252525 60%, #252525 100%);
          -webkit-background-clip: text; background-clip: text;
          color: transparent; -webkit-text-fill-color: transparent;
          background-size: 200% 100%;
          animation: shimmer 6s linear infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -400% 0; }
        }
        .splash-progress { width:min(220px, 44vw); height:4px; overflow:hidden; border-radius:999px; background:rgba(62,189,172,.16); }
        .splash-progress-fill { display:block; height:100%; border-radius:inherit; background:#3EBDAC; transition:width .32s cubic-bezier(0.65, 0, 0.35, 1); }
        .splash-logo-wipe::after { content:""; position:absolute; top:0; bottom:0; left:-22%; width:22%; pointer-events:none; background:linear-gradient(90deg, transparent, rgba(255,255,255,.62), transparent); mix-blend-mode:screen; opacity:0; animation:splash-sheen 3.2s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
        @keyframes splash-wipe { 0%, 12% { clip-path:inset(0 100% 0 0 round 2px); opacity:.45; } 58%, 76% { clip-path:inset(0 0 0 0 round 2px); opacity:1; } 100% { clip-path:inset(0 100% 0 0 round 2px); opacity:.45; } }
        @keyframes splash-sheen { 0%, 18% { transform:translateX(0); opacity:0; } 34% { opacity:.8; } 62% { transform:translateX(560%); opacity:0; } 100% { opacity:0; } }

        .splash-petal { fill: #3EBDAC; }

        /* Keenam sabit berputar SEBAGAI SATU KESATUAN mengelilingi pusat
           logogram — ease-in-out (melambat-cepat-melambat), bukan putaran
           linear seragam. 360° penuh per siklus kembali ke posisi identik
           (simetri 6 sabit), jadi loop-nya mulus tanpa "lompatan". */
        .splash-spin {
          transform-box: fill-box;
          transform-origin: center;
          animation: splash-spin ${SPIN_CYCLE_MS}ms cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        @keyframes splash-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* Reduced motion: logogram statis, tidak berputar. */
        .splash.is-reduced .splash-wordmark { animation:none; background-position:0 0; }
        .splash.is-reduced .splash-logo-wipe::after { animation:none; display:none; }
      `}</style>
    </div>
  );
}
