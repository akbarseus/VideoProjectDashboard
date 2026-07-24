import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MousePointerClick, MapPin, Maximize2, Minimize2, X } from "lucide-react";
import { parseKoordinat } from "./utils/coordinates";
import { isValidUrl } from "./useVideoProjects";
import { youtubeId } from "./utils/youtube";

// Div-icon inline (BUKAN L.icon dgn file gambar) — menghindari masalah klasik
// Leaflet+bundler dimana path default marker-icon.png tidak ke-resolve benar
// oleh Vite, yang bikin pin tampil sbg kotak biru rusak/hilang.
// Custom pin (Asset 1.svg dari user) — fill diinline langsung (bukan <style>
// class) supaya tidak ada risiko class .cls-1/.cls-2 bentrok antar pin di
// peta yang sama. Ukuran tampil TETAP SAMA dgn pin sebelumnya (17x22, anchor
// 8.5/22) — cuma bentuk & warna ikonnya yang diganti.
const PIN_HTML = `
  <svg width="17" height="22" viewBox="0 0 138 176" xmlns="http://www.w3.org/2000/svg">
    <path fill="#3ebdac" d="M69,0C30.89,0,0,30.89,0,69c0,14.15,4.26,27.31,11.57,38.26,14.46,21.66,37.06,37.94,48.71,61.23l1.54,3.07c1.48,2.96,4.32,4.44,7.17,4.44s5.7-1.48,7.18-4.44l1.54-3.07c11.65-23.29,34.26-39.57,48.72-61.23,7.31-10.95,11.57-24.11,11.57-38.26C138,30.89,107.11,0,69,0ZM69,105.99c-20.44,0-37-16.57-37-37s16.57-37,37-37,37,16.57,37,37-16.57,37-37,37Z"/>
    <path fill="#fff" d="M69,14.8c-29.92,0-54.19,24.27-54.19,54.19s24.25,54.19,54.19,54.19,54.19-24.27,54.19-54.19S98.92,14.8,69,14.8Z"/>
    <path fill="#3ebdac" d="M34.68,55.52c-.22,0-.43,0-.64.02,1.93,4.08,3.01,8.64,3.01,13.45s-1.08,9.37-3.01,13.45c.21.01.43.02.64.02,7.44,0,13.47-6.03,13.47-13.47s-6.03-13.47-13.47-13.47Z"/>
    <path fill="#3ebdac" d="M103.32,55.52c.22,0,.43,0,.64.02-1.93,4.08-3.01,8.64-3.01,13.45s1.08,9.37,3.01,13.45c-.21.01-.43.02-.64.02-7.44,0-13.47-6.03-13.47-13.47,0-7.44,6.03-13.47,13.47-13.47Z"/>
    <path fill="#3ebdac" d="M40.18,91.97c-.11.19-.21.38-.31.57,4.5.37,8.98,1.72,13.15,4.12,4.17,2.41,7.58,5.62,10.15,9.33.12-.18.23-.36.34-.55,3.72-6.44,1.51-14.68-4.93-18.4s-14.68-1.51-18.4,4.93Z"/>
    <path fill="#3ebdac" d="M74.5,32.54c.11-.19.22-.37.34-.55,2.57,3.71,5.98,6.92,10.15,9.33,4.17,2.41,8.65,3.75,13.15,4.12-.1.19-.2.38-.31.57-3.72,6.44-11.95,8.65-18.4,4.93-6.44-3.72-8.65-11.95-4.93-18.4Z"/>
    <path fill="#3ebdac" d="M74.5,105.44c.11.19.22.37.34.55,2.57-3.71,5.98-6.92,10.15-9.33,4.17-2.41,8.65-3.75,13.15-4.12-.1-.19-.2-.38-.31-.57-3.72-6.44-11.95-8.65-18.4-4.93-6.44,3.72-8.65,11.95-4.93,18.4Z"/>
    <path fill="#3ebdac" d="M40.18,46.01c-.11-.19-.21-.38-.31-.57,4.5-.37,8.98-1.72,13.15-4.12s7.58-5.62,10.15-9.33c.12.18.23.36.34.55,3.72,6.44,1.51,14.68-4.93,18.4-6.44,3.72-14.68,1.51-18.4-4.93Z"/>
  </svg>
`;

const tealPinIcon = L.divIcon({
  html: PIN_HTML,
  className: "coverage-map-pin",
  iconSize: [17, 22],
  iconAnchor: [8.5, 22],
  tooltipAnchor: [0, -14],
});

// View awal tetap (bukan auto-fit ke pin yang ada) supaya konsisten walau
// jumlah pin masih sedikit saat testing — pusat & zoom dipilih agar seluruh
// wilayah Indonesia (Sabang-Merauke) kelihatan.
const INITIAL_CENTER = [-2.5, 117.5];
const INITIAL_ZOOM = 5;

function projectsWithCoordinates(rows) {
  return rows
    .map(row => ({ row, coord: parseKoordinat(row.koordinat) }))
    .filter(entry => entry.coord !== null);
}

// Scroll page seharusnya tetap scroll page, BUKAN zoom peta — bug yang
// dilaporkan user. Leaflet default-nya scrollWheelZoom selalu aktif begitu
// kursor ada di atas map, jadi peta "mencuri" scroll wheel dari halaman.
// Fix (pola sama dgn embed Google Maps): scroll-zoom OFF secara default,
// diaktifkan sementara hanya setelah user KLIK peta (menandakan mereka
// sengaja mau berinteraksi), lalu otomatis nonaktif lagi saat kursor
// meninggalkan area peta — supaya scroll halaman di luar sesi interaksi itu
// tidak pernah ke-hijack.
function ScrollZoomGate({ active, onActiveChange }) {
  const map = useMap();

  useEffect(() => {
    if (active) map.scrollWheelZoom.enable();
    else map.scrollWheelZoom.disable();
  }, [active, map]);

  useEffect(() => {
    const container = map.getContainer();
    const activate = () => onActiveChange(true);
    const deactivate = () => onActiveChange(false);
    container.addEventListener("click", activate);
    container.addEventListener("mouseleave", deactivate);
    return () => {
      container.removeEventListener("click", activate);
      container.removeEventListener("mouseleave", deactivate);
    };
  }, [map, onActiveChange]);

  return null;
}

// FIX bug "peta cuma mengisi separuh card, sisanya blank" (dilaporkan user):
// Leaflet mengukur lebar containernya SEKALI saat inisialisasi, lalu "beku"
// di ukuran itu selamanya kalau container-nya belakangan berubah ukuran
// TANPA event resize window (mis. kolom grid coverage-insights-grid baru
// selesai reflow setelah chart di sebelahnya rerender, atau Suspense
// resolve saat layout belum final). Tombol aksi (posisinya nempel ke
// .coverage-map-box yang lebar penuh) jadi kelihatan "melayang" di area
// blank kanan yang sebenarnya cuma leaflet-container lama yang menyempit.
// ResizeObserver di container asli + invalidateSize() memaksa Leaflet
// re-ukur tiap kali container-nya benar-benar berubah, apa pun sebabnya.
function MapResizeSync() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

// Isi tooltip hover pin — thumbnail YouTube (kalau ada video valid) + nama
// proyek di bawahnya. `onError` fallback ke teks-saja kalau thumbnail gagal
// load (video sudah dihapus/private dll), bukan gambar kotak rusak.
function PinTooltipContent({ name, linkYoutube }) {
  const [broken, setBroken] = useState(false);
  const ytId = youtubeId(linkYoutube);

  return (
    <div className="coverage-map-tt">
      {ytId && !broken && (
        <img
          src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
          alt=""
          onError={() => setBroken(true)}
        />
      )}
      <span className="coverage-map-tt-name">{name}</span>
    </div>
  );
}

export default function CoverageAreaMap({ rows, lang }) {
  const t = (id, en) => (lang === "id" ? id : en);
  const pins = useMemo(() => projectsWithCoordinates(rows), [rows]);
  const [scrollZoomActive, setScrollZoomActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => setIsFullscreen(v => !v), []);
  useEffect(() => {
    if (!isFullscreen) return undefined;
    const onKeyDown = event => { if (event.key === "Escape") setIsFullscreen(false); };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; window.clearTimeout(timer); };
  }, [isFullscreen]);

  return (
    <div className={`coverage-map-box ${isFullscreen ? "coverage-map-fullscreen" : ""}`}>
      <style>{`
        /* Tile OSM asli agak jenuh/kontras utk sitting di sebelah kartu netral
           app ini — desaturasi tipis + kecerahan sedikit dinaikkan supaya
           menyatu dgn palet teal/abu-abu, tanpa bikin peta jadi flat/mati. */
        .coverage-map-box .leaflet-tile-pane { filter: saturate(0.75) brightness(1.04) contrast(0.97); }
        .coverage-map-box .leaflet-container { background: ${"#EAF1F0"}; font-family: inherit; }

        .coverage-map-box .leaflet-control-zoom { border: none; box-shadow: 0 2px 10px rgba(15,23,42,0.12); border-radius: 10px; overflow: hidden; }
        .coverage-map-box .leaflet-control-zoom a { width: 30px; height: 30px; line-height: 30px; color: #0A0F1E; background: #FFFFFF; border: none !important; }
        .coverage-map-box .leaflet-control-zoom a:hover { background: #ECFDF5; color: #059669; }
        .coverage-map-box .leaflet-control-attribution { background: rgba(255,255,255,0.75); border-radius: 6px 0 0 0; font-size: 10px; }

        .coverage-map-pin { filter: drop-shadow(0 2px 3px rgba(10,15,30,0.35)); cursor: pointer; transition: transform .15s ease; }
        .coverage-map-pin:hover { transform: translateY(-2px) scale(1.06); }

        /* Tooltip hover pin — thumbnail YouTube (kalau ada) + nama proyek.
           Override padding default Leaflet tooltip (0) supaya thumbnail bisa
           mepet ke tepi, caption dikasih padding sendiri di dalam. */
        .coverage-map-box .leaflet-tooltip.coverage-map-tooltip-wrap {
          padding: 0; overflow: hidden; border-radius: 10px;
          border: 1px solid rgba(15,23,42,0.10);
          box-shadow: 0 8px 24px rgba(15,23,42,0.20);
        }
        .coverage-map-tt { width: 218px; }
        .coverage-map-tt img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; background: #E4E9F2; }
        .coverage-map-tt-name { display: block; padding: 7px 9px; font-size: 11px; font-weight: 700; color: #0A0F1E; line-height: 1.3; }

        .coverage-map-hint {
          position: absolute; left: 10px; bottom: 10px; z-index: 650;
          display: flex; align-items: center; gap: 6px;
          padding: 6px 10px; border-radius: 20px;
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(14px) saturate(1.5); -webkit-backdrop-filter: blur(14px) saturate(1.5);
          border: 1px solid rgba(15,23,42,0.08);
          box-shadow: 0 2px 10px rgba(15,23,42,0.08);
          font-size: 11px; font-weight: 600; color: #5C6784;
          pointer-events: none;
          opacity: 1; transition: opacity .2s ease;
        }
        .coverage-map-hint.is-hidden { opacity: 0; }
        .coverage-map-actions { position:absolute; top:12px; right:12px; z-index:700; display:flex; gap:6px; }
        .coverage-map-action { width:36px; height:36px; display:grid; place-items:center; border:1px solid rgba(15,23,42,.1); border-radius:10px; background:rgba(255,255,255,.9); color:#0A0F1E; box-shadow:0 4px 14px rgba(15,23,42,.14); cursor:pointer; transition:background .15s, transform .15s; }
        .coverage-map-action:hover { background:#ECFDF5; transform:translateY(-1px); }
        .coverage-map-fullscreen { position:fixed !important; inset:16px; z-index:1200; height:auto !important; margin:0 !important; border-radius:20px; box-shadow:0 24px 80px rgba(10,15,30,.35); background:#EAF1F0; }
        .coverage-map-fullscreen .leaflet-container { border-radius:20px !important; }
        @media (max-width: 768px) and (hover: none) {
          .coverage-map-box .leaflet-control-zoom a:hover { background:#FFFFFF; color:#0A0F1E; }
          .coverage-map-pin:hover { transform:none; }
          .coverage-map-action:hover { background:rgba(255,255,255,.9); transform:none; }
        }
      `}</style>

      <div className="coverage-map-actions">
        <button className="coverage-map-action" type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? t("Keluar fullscreen", "Exit fullscreen") : t("Buka fullscreen", "Open fullscreen")} title={isFullscreen ? t("Keluar fullscreen", "Exit fullscreen") : t("Fullscreen", "Fullscreen")}>
          {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
        {isFullscreen && <button className="coverage-map-action" type="button" onClick={() => setIsFullscreen(false)} aria-label={t("Tutup fullscreen", "Close fullscreen")} title={t("Tutup", "Close")}><X size={18} /></button>}
      </div>

      <MapContainer
        center={INITIAL_CENTER}
        zoom={INITIAL_ZOOM}
        style={{ width: "100%", height: "100%", borderRadius: 14 }}
        scrollWheelZoom={false}
      >
        <ScrollZoomGate active={scrollZoomActive} onActiveChange={setScrollZoomActive} />
        <MapResizeSync />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {pins.map(({ row, coord }) => (
          <Marker
            key={row.id}
            position={[coord.lat, coord.lng]}
            icon={tealPinIcon}
            eventHandlers={{
              click: () => {
                if (isValidUrl(row.linkYoutube)) {
                  window.open(row.linkYoutube, "_blank", "noopener,noreferrer");
                }
              },
            }}
          >
            <Tooltip className="coverage-map-tooltip-wrap">
              <PinTooltipContent name={row.name} linkYoutube={row.linkYoutube} />
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {pins.length > 0 && (
        <div className={`coverage-map-hint ${scrollZoomActive ? "is-hidden" : ""}`} aria-hidden="true">
          <MousePointerClick size={13} />
          {t("Klik peta untuk zoom dengan scroll", "Click the map to scroll-zoom")}
        </div>
      )}

      {pins.length === 0 && (
        <div className="coverage-map-empty">
          <MapPin size={22} strokeWidth={1.75} />
          <span>{t("Belum ada site dengan koordinat terisi.", "No sites with coordinates yet.")}</span>
        </div>
      )}
    </div>
  );
}
