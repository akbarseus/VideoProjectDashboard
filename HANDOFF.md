# HANDOFF — Video Production Dashboard (SUN Energy)
> Baca file ini sebelum melanjutkan sesi. Berisi semua konteks, keputusan desain, dan status pekerjaan.

---

## ⚠️ 0. ACTION ITEMS SEBELUM LANJUT (update 2026-07-13, sesi ke-4)

1. **Redeploy Apps Script — SELESAI & TERVERIFIKASI 2026-07-15**. Deployment live sudah memakai optimasi smart chip dan kalender per tanggal. Tes langsung: `route=calendar&date=2026-07-15` mengembalikan 1 baris dengan `_meta.requestedDate` yang benar; `route=projects` tetap normal dan mengembalikan 250 proyek.
2. **Deploy ke Netlify** — `npm run build` sudah dijalankan ulang (terakhir: sesi ke-4, setelah fitur "Hari Ini" #16), folder **`dist/` sudah siap dan up-to-date**. Tinggal drag & drop ke Netlify.
3. **Isi kolom N & O di Sheets** (opsional, fitur lama) — kolom N = "Catatan Status Dokumentasi" (dipakai utk catatan proyek **On Schedule**), kolom O = "Catatan Status Produksi" (dipakai utk catatan proyek **Dalam Produksi**). Kalau kosong, halaman Detail Proyek otomatis fallback ke "Status Dokumentasi" seperti biasa — tidak error.
4. **User membenarkan data yang tertukar kolom di Sheets** (Link Youtube/Linkedin/Video Output kadang salah isi — lihat #3b)
5. **User perlu konfirmasi**: apakah bug "layout kepotong/nyangkut saat resize window" (lihat #15) masih terjadi di browser asli mereka setelah 2 mitigasi ditambahkan. Kalau masih terjadi, perlu digali lebih dalam sesi berikutnya.
6. **Widget "Hari Ini" (BARU, #16)** — sudah di-build & dikonfirmasi tampil benar oleh user (setelah beberapa revisi visual). Belum ada action item tersisa untuk fitur ini kecuali user melaporkan masalah baru.

---

## 1. Gambaran Proyek

**Nama:** Video Production Dashboard — SUN Energy
**Tujuan:** Dashboard internal untuk melacak progres konten video dari setiap proyek SUN Energy. Sumber data: tab **`video_projects_new_v1`** di Google Sheets, dibaca via Google Apps Script.
**Stack:** React 19 + Vite 8 (SPA, tanpa router) · Inline CSS (inline style + `<style>` tag per komponen) · Lucide React icons · Recharts (chart)
**Deployment:** Netlify — deploy manual dengan drag & drop folder `dist/`
**Dev server:** `npm run dev` → `http://localhost:5173`
**Build:** `npm run build` → output ke folder `dist/` (sudah dijalankan, siap upload)

**Spreadsheet:** https://docs.google.com/spreadsheets/d/1wXUKGyZcuy_RH2jDihICOSdK4gJ4p9C4LipgP2QpbKs/

---

## 2. Struktur File Penting

```
coverage-dashboard/
├── apps-script/
│   └── Code.gs                  # Backend Apps Script — HARUS di-paste manual ke Apps Script editor (lihat #0)
├── src/
│   ├── App.jsx                  # Topbar, sidebar (logo+toggle di header sidebar, menu Kalender), bottom nav mobile. Panggil useVideoProjects() SEKALI, teruskan sebagai props ke semua halaman
│   ├── CoverageDashboard.jsx    # Halaman "Highlight" — hero Total Coverage (solid teal), 4 kartu status ringkas, chart, ikon kalender
│   ├── DataPage.jsx             # Halaman "Data" — tabel proyek, filter sticky (Tahun/Sektor/Status via GlassSelect)
│   ├── ProjectDetailPage.jsx    # Halaman "Detail Proyek" — list+card+filter dgn layout grid-area responsif (lihat #5 gotcha sticky)
│   ├── useVideoProjects.js      # Shared data hook — tahun dinamis, cache sessionStorage, useAutoTranslate, formatDateDMY
│   ├── LinkTiles.jsx            # LinkTiles (tile besar gaya iOS + "Lihat N tautan lainnya →") & LinkChips (ikon kecil tabel)
│   ├── GlassSelect.jsx          # (BARU) Dropdown custom gaya glass — dipakai DataPage, pengganti native <select>
│   ├── ErrorBoundary.jsx        # (BARU) Bungkus tiap halaman — kalau ada error render, tampil pesan+tombol reload, bukan blank putih
│   ├── socialIcons.jsx          # Ikon custom Youtube/Linkedin/Instagram (tidak ada di lucide-react)
│   ├── main.jsx                 # Entry point React
│   └── index.css                # CSS reset minimal
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── dist/                        # Build output — SIAP deploy ke Netlify (terakhir di-build sesi ini)
├── specs/                       # (BARU) Spec ditulis via skill /spec, di-build via /build
│   └── mobile-detail-slide-nav.md  # Spec fitur slide-in detail mobile (lihat #15)
├── index.html                    # viewport-fit=cover + theme-color utk full-bleed mobile
└── HANDOFF.md                   # File ini
```

---

## 3. Arsitektur Data

### Sumber data: tab `video_projects_new_v1`

| Header di Sheet | Field internal | Keterangan |
|---|---|---|
| Id | `id` | |
| Tahun Project | `year` | filter tahun |
| Nama | `name` | nama proyek |
| Jenis Industri | `industry` | sektor |
| Status Video Output | `statusVideo` | `published` / `on progress` / `on schedule` / `n/a` |
| Status Dokumentasi | `statusDoc` | checkbox TRUE/FALSE — dasar coverage % |
| Link Drive Dokumentasi | `linkDokumentasi` | |
| Link Drive Video Output | `linkVideoOutput` | |
| Link Video Peresmian | `linkPeresmian` | ikon "Rilis" |
| Link Youtube | `linkYoutube` | ikon YouTube + thumbnail preview |
| Link Linkedin | `linkLinkedin` | ikon LinkedIn |
| Link Instagram | `linkInstagram` | ikon Instagram |
| Tanggal Tayang Social Media | `tanggalTayang` | diformat dd/mm/yyyy |
| **Catatan Status Dokumentasi** (kolom N) | `catatanSchedule` | **(BARU)** teks bebas, dipakai di kartu proyek "On Schedule" |
| **Catatan Status Produksi** (kolom O) | `catatanProduksi` | **(BARU)** teks bebas, dipakai di kartu proyek "Dalam Produksi" |

### 3a. Koneksi ke Google Sheets
- **Middleware:** Google Apps Script Web App (`apps-script/Code.gs`)
- **Performa:** seluruh sheet dibaca dengan hanya ~4 panggilan Sheets API total (`getDisplayValues`/`getValues`/`getRichTextValues`/`getFormulas` + 1 panggilan Advanced Sheets API utk chip), diproses di memori — BUKAN `getRange()` per sel (versi sangat lama bisa ribuan panggilan API, sangat lambat).
- **TIDAK ada cache di backend** (`CacheService` sengaja dihapus) — edit di Sheets langsung kebaca di dashboard tanpa delay.
- **Resilient terhadap perubahan kolom** — Apps Script cari kolom berdasarkan **nama header** (`FIELD_ALIASES`), bukan posisi huruf. Kolom N/O (catatan) juga ada fallback ke posisi kolom kalau nama header berubah.
- **3 lapis pembacaan link, urutan prioritas:**
  1. Smart chip (`@` mention Drive file) — via **Advanced Sheets API** (`Sheets.Spreadsheets.get`, field `chipRuns`) — **butuh service di-enable manual**, kalau tidak ada di-skip otomatis (try/catch)
  2. Hyperlink teks biasa — via `getRichTextValues()`
  3. Formula `=HYPERLINK("url","label")` — regex match
  4. Fallback: teks polos apa adanya
- **Fallback ke SAMPLE:** kalau fetch gagal DAN belum pernah berhasil sebelumnya (tidak ada cache sessionStorage) → tampil data SAMPLE + banner. Kalau sudah pernah berhasil connect, error sesaat TIDAK memicu banner (supaya tidak salah kasih kesan "gagal" padahal cuma network blip — lihat `useVideoProjects.js`).
- **Auto-translate:** `useAutoTranslate()` hook — terjemahkan teks bebas (kolom N/O) ke EN via endpoint gratis Google Translate (`translate.googleapis.com`, tanpa API key, tidak resmi tapi stabil), cuma jalan saat toggle EN aktif & proyek itu sedang dibuka. Cache dibatasi 200 entry (FIFO) biar tidak membengkak.

### 3b. ⚠️ Isu data yang DIKETAHUI (bukan bug kode)
Beberapa baris di sheet isi kolomnya tertukar (mapping kolom di Apps Script sudah benar sesuai header):
- **Link Youtube** kadang berisi teks judul video, bukan URL
- **Link Linkedin** kadang berisi URL YouTube
- **Link Drive Video Output** kadang berisi nama file (`.mp4`) bukan URL Drive

Mitigasi kode: `isValidUrl()` — tile/ikon link hanya aktif (bisa diklik) kalau isi sel diawali `http://`/`https://`; kalau bukan URL valid, tile tetap TAMPIL tapi abu-abu/nonaktif (bukan hilang) — supaya jelas kanal itu memang belum ada isinya. User membenarkan data ini manual di Sheets.

### Kategori Status Video (4 kartu, ringkas — cuma label+ikon+angka, tanpa teks panjang)
| Kartu | Kondisi (`statusVideo`) | Warna |
|---|---|---|
| Sudah Tayang | `published` | Hijau |
| Dalam Produksi | `on progress` | Amber |
| On Schedule | `on schedule` | Biru |
| Belum Ada Konten | `n/a` (atau kosong) | Merah |

### Coverage % (hero section)
```
coverage% = count(Status Dokumentasi === TRUE) / count(semua baris, di tahun terpilih) × 100
```
Filter tahun: **dinamis** (`new Date().getFullYear()`, BUKAN hardcode) — urutan Tahun Ini → turun ke tahun-tahun sebelumnya (6 tahun ke belakang) → "Semua Waktu" di akhir. Lihat `YEARS`/`DEFAULT_YEAR` di `useVideoProjects.js`.

### State Management
- `lang` state di `App.jsx` → prop ke semua halaman. Pattern: `const t = (id, en) => lang === "id" ? id : en`
- Tidak pakai Context API atau React Router — sengaja sederhana

---

## 4. Desain & UX (update besar 2026-07-11 malam)

### Hero "Total Coverage"
- Background **solid teal `#3EBDAC`** (sama persis warna logo SUN Energy) — bukan gradient lagi
- **Semua teks putih** (keputusan sadar dari user meski secara WCAG kontrasnya ~2.3:1, di bawah standar 3:1 utk teks besar — sudah ditambah text-shadow tipis utk bantu keterbacaan praktis)
- Ringkas: satu baris (persen + keterangan + dropdown tahun), lalu bar status + legend di baris kedua — jauh lebih pendek dari versi lama
- Bar status dikasih outline putih tiap segmen supaya kebaca jelas di atas teal solid
- Dropdown tahun: solid putih (bukan glass/transparan), TANPA label "Tahun:" — langsung tampil value-nya saja

### Section & judul
- Semua judul section (Status video, Distribusi & tren, dst) & judul halaman (Data, Detail Proyek) disamakan ukurannya (18px, class `.sec-title`/`.hl-title`) dengan title utama "Video Production Dashboard"
- Layout dirapatkan (margin/padding dipangkas) supaya Total Coverage + Status Video + Distribusi & Tren muat tanpa scroll di viewport standar

### Sidebar & navigasi
- Toggle collapse sidebar **cuma 1 tombol** (dulu ada 2 identik — di topbar & footer sidebar — membingungkan), sekarang di header sidebar sebelah logo
- Logo sidebar: **icon saja**, tanpa teks "Dashboard Produksi"
- Tombol **back** (ikon panah, beda dari ikon collapse) muncul di topbar tiap halaman selain Highlight, klik → balik ke Highlight
- Menu **Kalender** di sidebar + ikon kalender di topbar Highlight (sebelah "Diperbarui") — redirect ke link Google Drive (lihat #6)

### Mobile
- Full-bleed: topbar & bottom nav pakai `env(safe-area-inset-top/bottom)`, menyatu sampai area status bar/home indicator perangkat
- Sidebar tetap tersembunyi di mobile (bottom nav 3 tombol: Highlight/Data/Detail Proyek) — ikon refresh FAB yang sempat ditambah **sudah dihapus lagi** sesuai permintaan user
- Filter di Data page & Detail Proyek: **sticky** (nempel) saat discroll

### Detail Proyek — reorder mobile & fix sticky (⚠️ baca gotcha #9)
- Urutan mobile: **filter → detail card → list** (filter+card jadi 1 unit sticky, cuma list yang scroll)
- List kiri otomatis sinkron dgn card kanan kalau item yang dipilih hilang dari hasil filter/search
- Thumbnail preview **hanya untuk status "Sudah Tayang"** — status lain tidak tampilkan kotak placeholder video kosong
- `useDeferredValue` di search (Data page & Detail Proyek) — ketikan tetap instan, filtering berat dijadwalkan low-priority

---

## 5. Fitur "Catatan Status" (kolom N/O) — BARU
Di halaman Detail Proyek, field "Status Dokumentasi" otomatis berganti jadi **"Status proyek"** khusus untuk:
- **Dalam Produksi** → isi dari kolom **O** ("Catatan Status Produksi")
- **On Schedule** → isi dari kolom **N** ("Catatan Status Dokumentasi" — nama headernya agak menyesatkan tapi itu yang dipakai untuk catatan On Schedule)

Teks ini di-auto-translate ke EN kalau toggle bahasa di-set EN (lihat `useAutoTranslate` di #3a). Untuk status lain (Sudah Tayang, Belum Ada), tetap tampil "Status Dokumentasi" seperti biasa.

---

## 6. Fitur Kalender — DITUNDA (sementara redirect ke Drive)
User punya PDF "Kalender Digital Bank Sinarmas 2026" yang idealnya diekstrak jadi tampilan kalender week-view (kayak Google Calendar). **Belum bisa dikerjakan** karena:
- Environment Claude tidak punya `poppler-utils` (tool render PDF) — PDF gagal diproses sama sekali
- URL `banksinarmas.com/id/kalenderdigital/2026` render via JS, tidak bisa di-extract otomatis via WebFetch

**Solusi sementara (aktif sekarang):** ikon kalender di topbar Highlight + menu "Kalender" di sidebar, keduanya redirect (`target="_blank"`) ke file Drive: `https://drive.google.com/file/d/1pH_GKS_rmPAIRI1viXJ1b-DGHj2AWz5a/view?usp=sharing` — constant `CALENDAR_URL` di-export dari `CoverageDashboard.jsx`, diimport oleh `App.jsx`.

**Kalau mau lanjutkan fitur asli (week-view):** butuh salah satu — (a) user screenshot halaman-halaman PDF yang ada tanggal merahnya, atau (b) pakai data hari libur nasional 2026 generik (tidak dijamin 100% sama dgn versi Bank Sinarmas), lalu Claude bangun UI kalender dari situ.

---

## 7. Performa & Keandalan (arsitektur async/sync)
- **1 fetch data untuk semua halaman** — `useVideoProjects()` dipanggil sekali di `App.jsx`, bukan per-halaman (dulu tiap pindah tab fetch ulang dari nol)
- **`useDeferredValue`** di search DataPage & ProjectDetailPage — input tetap sync/instan, filtering di-defer
- **`ErrorBoundary`** membungkus tiap halaman (`key={page}` supaya reset saat ganti halaman) — kalau ada error render, tampil pesan + tombol reload, bukan blank putih total
- **Cache sessionStorage** (stale-while-revalidate) — data lama langsung tampil tanpa spinner sambil fetch baru jalan di belakang
- **Cache translate dibatasi 200 entry** (FIFO) — cegah memory growth di sesi panjang
- Backend Apps Script: lihat #3a (batch read, tanpa cache server)

---

## 8. ⚠️ GOTCHA PENTING: `position: sticky` + topbar fixed

**Bug yang pernah terjadi:** search bar di Detail Proyek (mobile) terlihat "ikut turun"/hilang saat discroll, padahal kode sudah `position:sticky`. Root cause: CSS `top:0` pada elemen sticky berarti ia nempel PAS di viewport-top (y=0) — tapi topbar app itu `position:fixed` dgn tinggi ~56px dan `z-index:300` (lebih tinggi dari elemen sticky manapun di konten). Jadi kalau sticky pakai `top:0`, bagian ATAS elemen sticky (search bar, karena dia anak PALING ATAS) ke-COVER oleh topbar — elemen itu SECARA GEOMETRI ada di situ (```getBoundingClientRect()``` tidak akan mendeteksi ini!), tapi visual ketutupan.

**Aturan wajib:** SEMUA `position: sticky` di halaman manapun harus pakai:
```css
top: calc(56px + env(safe-area-inset-top, 0px));   /* ATAU + margin tambahan */
```
BUKAN `top: 0`, kecuali elemen itu memang dimaksudkan sejajar dgn topbar (tidak ada kasus begini di app ini).

**Cara verifikasi yang BENAR** (bukan cuma cek `getBoundingClientRect().top` konstan saat scroll — itu bisa false-positive kalau ketutup elemen lain):
```js
const tb = document.querySelector('.tb');
const el = document.querySelector('.target-sticky');
window.scrollTo(0, 600);
const tbBottom = tb.getBoundingClientRect().bottom;
const elTop = el.getBoundingClientRect().top;
console.log(elTop >= tbBottom); // harus true — elemen bener2 di BAWAH topbar, bukan ketutup
```

**Gotcha kedua (sudah diperbaiki juga):** kombinasi `display:flex` + `position:sticky` di elemen YANG SAMA rawan bug di WebKit/Safari mobile. Solusi: pisah jadi 2 layer — elemen luar cuma `display:block` + `position:sticky`, elemen anak di dalamnya cuma `display:flex` (tanpa sticky). Lihat `.pd-sticky-wrap` (luar) vs `.pd-sticky-inner` (dalam) di `ProjectDetailPage.jsx`.

---

## 9. Design System / Warna

```js
const C = {
  teal:     "#3EBDAC",   // brand SUN Energy — background hero solid + logo
  tealDark: "#2AA897",
  green:    "#059669",   // status "Sudah Tayang"
  amber:    "#D97706",   // status "Dalam Produksi"
  blueSch:  "#2563EB",   // status "On Schedule"
  red:      "#DC2626",   // status "Belum Ada"
  textH:    "#0F172A",
  textSec:  "#64748B",
  textMut:  "#94A3B8",
  bg:       "#F8FAFC",
  surface:  "#FFFFFF",
  border:   "#E2E8F0",
};
```

**Font:** DM Sans (Google Fonts, di-load di `index.html`)
**Icons:** Lucide React + ikon custom di `src/socialIcons.jsx` (Youtube/Linkedin/Instagram — tidak tersedia built-in di versi lucide-react yang dipakai)
**Judul/section:** semua 18px/800 weight, konsisten di semua halaman (lihat #4)
**Huruf kapital:** TIDAK ADA teks full-caps di manapun di app ini (sudah dirapikan) — semua sentence case

---

## 10. Yang Belum Selesai / TODO

### Prioritas Tinggi
- [ ] User redeploy Apps Script (lihat #0 — smart chip + no-cache)
- [ ] User deploy `dist/` ke Netlify (sudah di-build, siap upload)
- [ ] User isi kolom N/O (Catatan Status Dokumentasi/Produksi) kalau mau fitur "Status proyek" di Detail Proyek aktif
- [ ] User membenarkan data kolom link yang tertukar di Sheets (#3b)

### Prioritas Menengah
- [ ] Fitur kalender week-view asli dari PDF (ditunda, lihat #6) — masih redirect ke Drive
- [ ] Tambah fitur export data (CSV/PDF)
- [ ] Bundle JS 637KB (gzip 187KB) — muncul warning "chunk besar" saat build, belum genting tapi bisa dipecah pakai dynamic import kalau makin besar

---

## 11. Cara Lanjut di Sesi Baru

1. **Buka folder project:** `C:\Users\sarap\coverage-dashboard`
2. **Jalankan dev server:** `npm run dev`
3. **Baca file yang relevan** sebelum edit (gunakan Read tool)
4. Kalau dashboard nampilin data SAMPLE + banner error, cek #0/#3a dulu (kemungkinan Apps Script perlu di-redeploy)
5. Kalau nambah `position:sticky` baru di manapun, WAJIB baca gotcha #8 dulu

### Contoh instruksi untuk sesi baru:
> "Saya punya project Video Production Dashboard untuk SUN Energy. Baca dulu file HANDOFF.md di `C:\Users\sarap\coverage-dashboard\HANDOFF.md` untuk konteks lengkapnya, lalu bantu saya [sebutkan task berikutnya]."

---

## 12. Perintah Berguna

```bash
npm run dev      # Dev server → http://localhost:5173
npm run build    # Build production → folder dist/ (sudah dijalankan per akhir sesi ini)
```

---

## 13. Catatan Khusus / Gotcha Lain

- **lucide-react versi ini TIDAK punya ikon brand** (Youtube, Linkedin, Instagram, dll). Kalau butuh ikon brand baru, buat inline SVG di `src/socialIcons.jsx`, JANGAN import langsung dari `lucide-react` — akan bikin `SyntaxError` dan app blank putih tanpa error di UI (harus cek console).
- **Kolom Sheets bisa berubah urutan/nama** — Apps Script cari kolom berdasarkan nama header (`FIELD_ALIASES`), bukan posisi. Kalau header berubah nama total, tambahkan alias baru di situ.
- **Logo:** Jangan pakai `<img src="...">` — harus inline SVG (komponen `SunLogo`/`SunIcon` di `App.jsx`)
- **BASE_URL SATU untuk semua halaman**, didefinisikan di `src/useVideoProjects.js`
- **Coverage % ≠ status video.** Status Dokumentasi (checkbox) dan Status Video Output (dropdown) adalah dua kolom independen — jangan disamakan saat debugging.
- **`position: sticky` — lihat gotcha #8 SEBELUM menambah sticky baru** di halaman manapun.
- **Preview sandbox Claude tidak bisa reach `script.google.com`** (network egress terbatas) — kalau lagi develop di preview dan lihat banner "Gagal terhubung" ATAU thumbnail YouTube tidak load (link isinya `https://youtube.com/xx` dkk), itu SAMPLE DATA fallback karena sandbox gagal fetch, bukan bug kode (endpoint sehat, sudah dikonfirmasi via curl & via app real di browser user).

## 14. Perbaikan Sesi Lanjutan (2026-07-11, setelah handoff di atas)

- **Thumbnail preview responsive** (`ProjectDetailPage.jsx`) — lebar `100%` (mengisi penuh kolom, tanpa sisa kiri-kanan di desktop lebar manapun), tinggi dibatasi `maxHeight:220` + `object-fit:cover` (crop, bukan pillarbox) supaya tidak jadi raksasa tidak proporsional.
- **Detail Proyek desktop: cuma `.pd-list` yang scroll** — filter & detail card sungguhan fixed (bukan `position:sticky` yang gagal kalau kontennya lebih tinggi dari viewport). `.pd-page` jadi `height:100vh` + `overflow:hidden`, `.pd-list`/`.detail-panel` masing-masing `overflow-y:auto` sendiri.
- **Detail Proyek mobile: `.detail-panel` dibatasi `max-height:44vh`** + scroll internal — sebelumnya kalau proyek "Sudah Tayang" (ada thumbnail), card detail bisa hampir memenuhi seluruh viewport, bikin list di bawahnya ketutup total oleh bottom nav (`z-index:300`).
- **Bottom nav mobile tidak lagi geser ke samping** saat pindah halaman — root cause: tidak ada `overflow-x:hidden` di level global, jadi kalau ada konten yang overflow horizontal (tabel lebar, dll), seluruh "canvas" termasuk elemen `position:fixed` ikut ter-drag ke samping di beberapa mobile browser. Fix: `overflow-x:hidden` + `max-width:100vw` di `html`/`body`/`#root` (`index.css`).
- **Dropdown "Tahun Ini" di hero tidak lagi kepotong di mobile sempit** — sebelumnya anchor selalu `right:0` (asumsi tombol dekat sisi kanan), tapi kalau `hero-inner` wrap di layar sempit tombol bisa jatuh ke sisi KIRI baris, bikin menu meluber ke luar viewport kiri. Fix: `YearDropdown` (`CoverageDashboard.jsx`) sekarang ukur posisi tombol tiap dibuka (`getBoundingClientRect`) dan flip ke anchor `left:0` kalau ruang di kiri tidak cukup.
- **Highlight desktop diperbesar proporsional** — hero, status card, dan chart diperbesar via `@media (min-width:1100px)` supaya fold pertama (judul + hero + Status video + Distribusi&tren) mengisi tinggi layar tanpa terasa "stretchy", "Prioritas produksi" baru muncul setelah scroll.

---

## 15. Sesi Ketiga (2026-07-11) — Mobile Slide Nav + Glass-Blur Redesign

### 15a. Fitur BARU: Mobile Detail Slide Navigation
Spec ditulis via skill `/spec` → `specs/mobile-detail-slide-nav.md`, di-build via `/build`. Ubah UX halaman **Detail Proyek KHUSUS mobile** (≤768px, desktop sama sekali tidak berubah):

- Kartu detail (thumbnail+info) **tidak lagi nempel di atas list** — list jadi tampilan utama/default.
- Tap kartu di list → **slide-in full-screen dari kanan** ke tampilan detail proyek itu (`.pd-mobile-detail` di `ProjectDetailPage.jsx`), terpisah total dari `.detail-panel` desktop (yang di mobile di-`display:none`).
- Topbar (`App.jsx`) berubah nampilin **nama proyek** + back-arrow saat mobile detail terbuka, lewat prop baru `onMobileDetailChange` yg di-panggil `ProjectDetailPage` → state `mobileDetail` di `App.jsx`. Back-arrow di kondisi ini balik ke **list** (bukan ke Highlight) — cek `mobileDetail ? mobileDetail.onBack() : setPage("highlight")`.
- **Swipe-back gesture** (edge kiri ≤24px) juga balik ke list — implementasi manual pakai touch handlers + ref (BUKAN state per-frame, supaya tetap 60fps saat drag), lihat `handleTouchStart/Move/End` di `ProjectDetailPage.jsx`.
- List **scroll position & highlight item dipertahankan** saat balik dari detail (list tidak pernah di-unmount, cuma di-cover overlay).
- Link "Lihat N tautan lainnya" dari Highlight/Data, di mobile, **langsung loncat ke slide-in detail** (skip tampilan list) — lewat `initialId` + cek `isMobile` di effect.
- Resize lintas breakpoint **tidak reset state** `mobileView` — sengaja dibiarkan begitu (bukan bug) supaya kalau detail lagi kebuka pas mobile→desktop→mobile lagi, tetap di detail (bukan balik ke list).

### 15b. Desain Glass-Blur (redesign visual, mobile-only kecuali disebutkan lain)
Semua transparansi pakai token blur yg SAMA dgn topbar/bottom nav (`blur(14px) saturate(1.5)`), biar konsisten:
- **`.pd-sticky-wrap`** (search+filter Detail Proyek, mobile) — glass `rgba(255,255,255,0.82)`.
- **`.pd-mobile-detail`** (halaman detail slide-in, mobile) — glass, transparansi di-iterate user beberapa kali: 18%→25%→**60% (final: `rgba(255,255,255,0.40)`)**.
- **`.drawer-panel`** (drawer "Lihat semua" dari kartu status di Highlight, `CoverageDashboard.jsx`) — glass, **khusus mobile**, transparansi di-iterate: 65%→**50% (final: `rgba(255,255,255,0.50)`)**. Desktop tetap solid `C.surface` (lihat rule dasar `.drawer-panel` di luar media query).
- **Kartu list `ProjectCard`** — SEMPAT dicoba glass juga, tapi **DIBATALKAN** (user klarifikasi: transparansi dimaksud untuk halaman DETAIL, bukan kartu list) — kartu list tetap solid seperti semula.
- **Panah "bisa di-klik"** (`ChevronRight`, class `.pc-arrow`) ditambahkan di tiap `ProjectCard`, **cuma tampil di mobile** (disclosure indicator gaya iOS table view).
- **Logo diperbesar**: sidebar desktop `SunLogo` 24px→30px (`SunIcon` collapsed 24→28), topbar mobile halaman Highlight `SunLogo` 20px→26px (ganti teks "Highlight" — cuma di halaman Highlight, cuma mobile, lihat `.tb-logo-mobile`/`.tb-page-name-hl` di `App.jsx`).
- **Bottom nav mobile +20% tinggi** (60px→72px) — constant `MBN_H` baru di `App.jsx`, dipakai juga utk sinkronin `bottom` offset `.pd-mobile-detail`.
- **Drawer (`CoverageDashboard.jsx`) dirapikan**: footer teks "Tekan Esc atau klik di luar untuk tutup" **dihapus**; border-top berwarna 3px (`borderTop:3px solid meta.color`) di header drawer **dihapus** (user: "warna outline ini remove saja"); list drawer (`.drawer-list`) dikasih `padding-bottom:6px` biar jarak SETELAH item terakhir sama persis dgn margin kiri-kanan (20px, dikurangi padding vertikal row sendiri 14px = 6px) — bukan angka sembarang.

### 15c. ⚠️ Investigasi bug "layout kepotong saat window di-resize" — BUKAN bug kode
User laporkan (dgn screenshot dari browser asli, drag resize window manual): setelah resize, tampilan app "kepotong"/nyangkut di pojok kiri-atas, sisa layar kosong/blank, sampai ada interaksi (scroll/klik).

**Sudah dibuktikan BUKAN bug layout/CSS** — pakai `document.elementFromPoint(x,y)` di titik yang KELIHATAN kosong di screenshot, ternyata SELALU ada konten asli di situ dgn posisi benar. Direproduksi juga di halaman **Highlight** yg CSS-nya sama sekali beda dari Detail Proyek (bukan spesifik satu komponen) → jadi ini murni **browser gagal repaint** setelah resize (dikenal terjadi di Chromium utk `position:fixed`+`backdrop-filter`), bukan kesalahan CSS/JS aplikasi.

**Mitigasi yang ditambahkan** (belum 100% terverifikasi menghilangkan gejala di browser asli user — perlu konfirmasi user, lihat action item #0.5):
1. `transform: translateZ(0)` di `.tb` (topbar) & `.mbn` (bottom nav) — paksa compositing layer sendiri.
2. Listener `resize` di `App.jsx` yang paksa reflow (`body.style.display="none"` → `offsetHeight` → `display=""`) via `requestAnimationFrame`.

**Kalau user masih lapor bug ini di sesi berikutnya**: jangan langsung asumsikan CSS salah — verifikasi dulu pakai `elementFromPoint` sebelum ubah-ubah layout, karena riwayatnya sering ternyata cuma repaint, bukan struktur yang salah.

---

## 16. Fitur BARU: Widget "Hari Ini" (sesi ke-4)

Spec ditulis via skill `/spec` → `specs/hari-ini-widget.md`, di-build via `/build`. Widget kalender baik-buruk hari (gaya primbon/lunar) di halaman **Highlight, khusus desktop (≥769px)** — mobile tidak berubah sama sekali.

### 16a. Sumber data
- Tab BARU **"Kalender 2026"** di spreadsheet yang sama dengan `video_projects_new_v1`.
- Kolom A–H, data mulai **baris 9** (baris 8 = header): `A` Tanggal (`"01 January 2026"`, nama bulan Inggris), `B` Hari, `C` Tahun, `D` Bulan (Indonesia), `E` Status/Indikator (`"UNLUCKY DAY"` / `"MIXED ACTIVITIES"`), `F` Favourable Activities, `G` Unfavourable Activities, `H` Deskripsi Asli (TIDAK dipakai di UI, cuma di-fetch).
- Backend: `apps-script/Code.gs` route baru **`route=calendar`** → fungsi `readCalendar()`. **User SUDAH redeploy** Apps Script dan dikonfirmasi jalan (dites via curl, response JSON valid).

### 16b. Frontend
- `src/useHariIni.js` — hook terpisah dari `useVideoProjects` (sengaja: kalau fetch kalender gagal, TIDAK BOLEH memicu banner "Gagal terhubung ke Sheets" milik data proyek). Cari baris yang cocok dgn "hari ini".
- **"Hari ini" dihitung dari WIB (UTC+7)**, BUKAN timezone browser — pakai `Date.now() + 7*3600000` lalu baca dgn `getUTC*()`, supaya user di luar WIB tetap lihat tanggal yg sama dgn Indonesia. JANGAN ganti ke `new Date()` biasa.
- Parse tanggal kolom A manual (regex + lookup nama bulan Inggris), BUKAN `new Date(string)` bawaan — biar gagal parse konsisten ke `null` (bukan salah timezone/locale-dependent).
- `BASE_URL` di-export dari `useVideoProjects.js` (sebelumnya cuma const lokal) supaya bisa dipakai bareng di `useHariIni.js`.
- Kalau tidak ada baris yg cocok (atau fetch gagal) → `HariIniPanel` return `null`, tidak render apa-apa, tidak ada placeholder kosong.

### 16c. Tampilan (⚠️ revisi beberapa kali berdasar review visual user — baca baik-baik sebelum ubah lagi)
- Card "Hari Ini" **sejajar dengan hero "Total Coverage"** (bukan sejajar dengan judul "Video Production Dashboard") — judul tetap full-width sendiri di baris paling atas. Struktur: `.hl-hero-row` (flex row, desktop-only) membungkus `<HariIniPanel>` + `<CoverageHero>`; `.hero-box` di dalam row ini `margin-bottom:0` (row yg pegang jarak ke section berikutnya, bukan hero-nya sendiri).
- HariIniPanel pakai komponen `Card` yang sudah ada (BUKAN div+className custom) — supaya border/shadow-nya konsisten & pasti kelihatan (sempat ada masalah "kartunya ga kelihatan sama sekali" waktu masih pakai class CSS custom sendiri).
- Isi: label "Hari Ini" → angka tanggal besar abu-abu terang (`C.textMut`, BUKAN `C.textSec` yg lebih gelap) + nama bulan (mis. "13 Juli") → 2 kolom **sejajar horizontal** (`flex-direction:row`, BUKAN column): "Favourable Activities" (label merah) & "Unfavourable Activities" (label hitam/`C.textH`), masing-masing `flex:0 0 auto` (lebar natural, JANGAN `flex:1` — sempat kepasang `flex:1` dan bikin 2 kolom itu melebar sampai ke tepi card, salah).
- **Hari "Unlucky Day" TETAP pakai layout 2 kolom yang sama** (bukan diganti paragraf deskripsi kolom H) — kolom F/G memang kosong di sheet utk baris ini, jadi tampilkan teks fallback **"Unlucky day"** di kedua kolom. (Spec awal minta versi deskripsi H, tapi DIREVISI setelah user kasih reference visual — kolom H di-fetch tapi sengaja tidak pernah dirender di UI manapun.)
- Semua keputusan warna/ukuran di atas hasil dari beberapa putaran review screenshot user — kalau mau ubah lagi, hati-hati jangan asal tebak, screenshot dulu sebelum & sesudah kalau bisa.

### 16d. Batasan sandbox Claude (sudah dikonfirmasi, bukan bug)
Sandbox preview Claude tidak bisa fetch `route=calendar` (sama seperti `route=projects` — network egress terbatas), jadi `HariIniPanel` SELALU return `null` di preview sandbox manapun sesi Claude berjalan. Verifikasi visual widget ini **hanya bisa dilakukan user sendiri** (browser asli / VS Code preview mereka), tidak bisa di-screenshot dari sisi Claude.

---

## 17. Optimasi Arsitektur & Performa (2026-07-15)

- Konfigurasi endpoint, token warna, status, navigasi, dan normalisasi proyek sudah dipisahkan ke modul `src/config`, `src/styles`, dan `src/data`.
- Halaman Highlight/Data/Detail sudah lazy-loaded melalui `src/app/AppRoutes.jsx`; bundle awal turun dari sekitar 655 KB menjadi sekitar 225 KB.
- Chart Recharts dipindahkan ke `src/components/dashboard/DashboardCharts.jsx` dan baru dimuat saat browser idle setelah konten utama tampil. Chunk halaman Highlight turun dari sekitar 396 KB menjadi sekitar 35 KB; library chart berada di chunk terpisah sekitar 363 KB. Skeleton menjaga tinggi area agar tidak terjadi layout shift.
- Daftar `ProjectDetailPage` dirender bertahap per 40 kartu. Batch berikutnya dimuat otomatis saat mendekati ujung daftar (serta punya tombol fallback); pencarian/filter tetap bekerja terhadap seluruh data, bukan hanya batch yang sedang ada di DOM.
- Forced repaint saat resize (`body display:none` + pembacaan `offsetHeight`) sudah dihapus dari `App.jsx`. Blur topbar/bottom-nav tidak lagi dianimasikan atau dinaikkan menjadi 24px saat scroll; mobile memakai blur 10px dan `prefers-reduced-transparency` menonaktifkannya.
- Lima count-up animation di Highlight memakai satu scheduler bersama maksimum 30fps. `prefers-reduced-motion` langsung menampilkan angka akhir.
- Section Highlight sudah diberi batas `memo`; tabel dipindahkan ke `src/components/dashboard/DashboardProjectTable.jsx` dengan state filter/pagination lokal, sehingga pagination tidak merender ulang hero, chart, status, dan prioritas.
- `useHariIni.js` meminta `route=calendar&date=YYYY-MM-DD`. Backend baru hanya membaca kolom A untuk mencari tanggal lalu satu baris A-H; tanpa parameter date tetap mengirim seluruh tahun untuk backward compatibility.
- Widget Hari Ini sekarang mulai fetch dari `App.jsx`, memakai cache `sessionStorage` per tanggal WIB, dan memiliki skeleton agar layout tidak bergeser.
- `apps-script/Code.gs`: pembacaan smart chip tetap aktif, tetapi Advanced Sheets API hanya meminta rentang kolom tautan. Hasil URL smart chip di-cache 60 detik; status/tahun/sektor/catatan tetap dibaca live.
- Karena `Code.gs` berubah, Apps Script **harus di-redeploy** sebelum optimasi backend aktif.

*Update terakhir: 2026-07-15 | Refactor fondasi, lazy loading halaman+chart, staged rendering Detail Proyek, memoized Highlight sections, shared count-up scheduler, resize/blur optimization, kalender per tanggal, dan smart-chip cache. `dist/` sudah di-build ulang.*

## 18. Update UI Terbaru (2026-07-20)

### Chart dokumentasi pertahun
- Ditambahkan chart bar ringan berbasis CSS/HTML di `CoverageDashboard.jsx` dengan data seluruh proyek (`allRows`), dikelompokkan berdasarkan field `year`.
- Chart ditempatkan berdampingan dengan Coverage Area pada desktop melalui `.coverage-insights-grid`; otomatis menjadi satu kolom pada viewport ≤900px.
- Hover chart memiliki micro-interaction: bar lebih terang dan sedikit membesar, label tahun/angka berubah teal, serta tooltip jumlah proyek.
- Tidak menambah dependency chart baru; tetap menjaga bundle ringan.

### Coverage map fullscreen
- `CoverageAreaMap.jsx` sekarang memiliki tombol fullscreen di pojok kanan atas.
- Mode fullscreen memakai overlay fixed dengan tombol minimize/unfullscreen dan close.
- Tombol `Esc` menutup fullscreen, scroll halaman dikunci saat overlay aktif, lalu dikembalikan saat ditutup.
- Map memicu resize event setelah masuk fullscreen agar Leaflet menghitung ulang ukuran tile/container.

### Penyamaan tinggi chart dan map
- Kolom chart/map dibuat flex-stretch agar tinggi map mengikuti tinggi card chart.
- Map mengisi sisa tinggi kolom secara otomatis; pada desktop tidak lagi lebih pendek dari chart.

### Container responsive
- `.main-inner` di `App.jsx` menggunakan `max-width: 1180px` (sebelumnya 1170px).
- Header tetap full-width; seluruh konten utama tetap centered dan responsif.

### Verifikasi
- `npm run lint` lulus setelah seluruh perubahan.
- `npm test` lulus (8 test).
- `npm run build` lulus dan `dist/` sudah diperbarui.

*Update terakhir: 2026-07-20 | Chart dokumentasi pertahun + hover, fullscreen Coverage Area, penyamaan tinggi map/chart, dan max-width konten 1180px.*
