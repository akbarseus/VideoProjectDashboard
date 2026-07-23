import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Dropdown gaya glassmorphism — dipakai untuk semua filter (Tahun/Sektor/Status
 * di DataPage, dst) supaya konsisten dengan style YearDropdown di Highlight.
 * Native <select> tidak dipakai karena daftar opsinya (popup OS) tidak bisa
 * di-style blur/transparan.
 */
export default function GlassSelect({ value, onChange, options, placeholder, minWidth = 150 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0, zIndex: open ? 60 : "auto" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        display:"flex", alignItems:"center", gap:8, padding:"8px 14px", height:34,
        border:"1px solid rgba(15,23,42,0.08)", borderRadius:10,
        background:"rgba(255,255,255,0.55)",
        backdropFilter:"blur(14px) saturate(1.6)", WebkitBackdropFilter:"blur(14px) saturate(1.6)",
        fontSize:12, fontWeight:600, color:"#0F172A", cursor:"pointer",
        boxShadow:"0 2px 10px rgba(15,23,42,0.06)", minWidth, justifyContent:"space-between",
        boxSizing:"border-box", whiteSpace:"nowrap",
      }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis" }}>{current ? current.label : placeholder}</span>
        <ChevronDown size={13} color="#94A3B8" style={{
          transform: open ? "rotate(180deg)" : "none", transition:"transform .15s", flexShrink:0 }} />
      </button>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:999,
          background:"rgba(255,255,255,0.88)",
          backdropFilter:"blur(24px) saturate(1.8)", WebkitBackdropFilter:"blur(24px) saturate(1.8)",
          border:"1px solid rgba(226,232,240,0.7)", borderRadius:14,
          boxShadow:"0 12px 40px rgba(15,23,42,0.18)", padding:6, minWidth: Math.max(minWidth, 180),
          maxHeight:280, overflowY:"auto",
        }}>
          {options.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                padding:"8px 12px", borderRadius:8, cursor:"pointer",
                fontSize:13, fontWeight: o.value === value ? 700 : 500,
                color: o.value === value ? "#059669" : "#2D3748",
                background: o.value === value ? "rgba(5,150,105,0.14)" : "transparent",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              }}
              onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = "rgba(15,23,42,0.05)"; }}
              onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = "transparent"; }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
