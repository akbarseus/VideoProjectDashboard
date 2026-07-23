# Dashboard Level-Based Pipeline Redesign

## Objective
Redesain total halaman **Dashboard** (sebelumnya "Highlight") supaya mengikuti sistem status level baru (`statusLevel`: `LX`/`L0`–`L5`) dari backend v2 migration ([specs/backend-status-v2-migration.md](backend-status-v2-migration.md) — WAJIB sudah di-build & di-redeploy lebih dulu), menggantikan total hero "Total Coverage" + 4 kartu status lama + section "Prioritas produksi" + chart. Halaman baru berisi: 3 KPI rekap utama (dgn filter tahun), 4 kartu ringkas progress pipeline, dan 3 daftar aktivitas per kategori — semua elemen bisa diklik. Navigasi juga disederhanakan: halaman "Data" lama (tabel filter) dihapus, halaman "Detail Proyek" di-rename jadi "Data". Coverage Area map & halaman Kalender dipertahankan tanpa perubahan struktural. Tujuannya: tim produksi SUN Energy bisa langsung lihat di mana titik macet pipeline (dokumentasi/editing/review/publish) tanpa harus buka tabel mentah.

## Requirements

### Navigasi (KOREKSI: tidak ada sidebar — top-nav desktop, bottom-nav mobile)
1. Halaman/menu **"Data"** yang lama (`DataPage.jsx` — tabel dgn filter Tahun/Sektor/Status via `GlassSelect`) **dihapus total** — file `DataPage.jsx` dihapus dari project (tidak dipakai lagi).
2. **Sidebar desktop dihapus total** (termasuk tombol collapse/toggle-nya) — digantikan **top nav bar** persisten yang tampil di SEMUA halaman desktop, isinya: logo (lihat #Branding) + judul "Video Production Dashboard" di kiri, 3 pill menu di tengah/kiri-tengah (**Dashboard | Data | Kalender**), kontrol yang sudah ada (info "Diperbarui", toggle bahasa ID/EN) tetap di kanan — sesuai mockup yang diberikan user.
3. 3 pill menu di top-nav: **"Dashboard"** (sebelumnya "Highlight", komponen `CoverageDashboard.jsx` tidak perlu di-rename filenya), **"Data"** (komponen `ProjectDetailPage.jsx`, TIDAK diubah struktur internalnya di spec ini — cuma label nav yang berubah), **"Kalender"**. Pill utk halaman yang sedang aktif diberi highlight visual (background warna beda, mengikuti mockup).
4. **Mobile TETAP pakai bottom-nav** (bukan top-nav) — isinya disesuaikan jadi 3 tombol yang sama: **Dashboard | Data | Kalender** (sebelumnya Highlight/Data-lama/Detail Proyek — sekarang dikonsolidasi mengikuti poin #1-3).
5. Topbar mobile (logo + judul halaman) tetap ada seperti sekarang, cuma ikon logo-nya diganti (lihat #Branding).
6. Tombol **back-arrow "kembali ke Highlight"** yang ada di topbar desktop sekarang (lihat HANDOFF §4) **dihapus** — karena top-nav (#2-3) sudah selalu terlihat & bisa langsung klik ke halaman manapun, affordance back-arrow ini jadi redundant. (Ini TIDAK berkaitan dgn tombol back internal slide-in mobile di halaman Data/Detail Proyek — HANDOFF §15a — itu TIDAK berubah, tetap ada.)
7. Kalender (fitur di dalamnya) **tidak berubah sama sekali**, cuma posisi menu-nya sekarang jadi pill ke-3 di top-nav (desktop) / tombol ke-3 di bottom-nav (mobile) alih-alih di sidebar.

### Branding (baru — aset resmi sudah diunggah user)
8. Font **"DM Sans"** (di-load via Google Fonts link di `index.html`) diganti total dengan **Rethink Sans** — pakai file variable font yang sudah diunggah (`RethinkSans-VariableFont_wght.ttf`, `RethinkSans-Italic-VariableFont_wght.ttf`), **self-hosted** (taruh di `public/fonts/` atau `src/assets/fonts/`, load via `@font-face` di `index.css`) — BUKAN dari Google Fonts CDN, karena filenya sudah tersedia lokal. Berlaku untuk SELURUH app (semua halaman), bukan cuma Dashboard.
9. Fallback font-stack tetap disertakan (`system-ui, sans-serif` atau sejenis) supaya teks tetap terbaca kalau file font gagal ke-load.
10. Komponen logo inline SVG yang ada sekarang (`SunLogo`/`SunIcon` di `App.jsx`, per HANDOFF §13 — HARUS tetap inline SVG, bukan `<img src>`) diganti isinya pakai path dari **`sun-logogram.svg`** (ikon sunburst, warna `#3ebdac` — sudah cocok dgn token `C.teal` yang ada, tidak perlu ubah warna). Dipakai di: logo top-nav desktop (#2) dan logo topbar mobile (#5).
11. **`sun-logo.svg`** (wordmark lengkap "SUN" + ikon) **TIDAK dipakai di dalam app sama sekali** — cukup jadi referensi aset brand di luar app.
12. **Favicon** (`public/favicon.svg`) diganti isinya dengan path dari `sun-logogram.svg` (tetap format SVG, warna sama).

### Hapus elemen lama di halaman Dashboard
13. Hero **"Total Coverage"** (`CoverageHero`, persen + status bar 4 kategori) **dihapus total**.
14. 4 kartu status lama (**`StatusOverview`**: Sudah Tayang/Dalam Produksi/On Schedule/Belum Ada) **dihapus total**.
15. Section **"Prioritas produksi"** (`ProductionPriority`, daftar proyek "Belum Ada Konten") **dihapus total**.
16. Widget **"Hari Ini"** tetap ada (tidak disebut untuk dihapus, tidak ada perubahan) — kalau builder ragu penempatannya, taruh di atas section KPI baru (#17), posisi sejajar seperti sekarang.

### Section KPI utama (baru)
17. 3 kartu KPI utama menggantikan hero lama, dihitung dari data yang **difilter dropdown tahun** (lihat #20):
    - **"Portfolio Project Published"** — `count(statusLevel === "L5")`.
    - **"Documented Video of Total Project"** (%) — `count(statusLevel in {L2,L3,L4,L5}) / total × 100`, dibulatkan ke bilangan bulat terdekat. `total` = jumlah semua baris pada data yang sudah difilter tahun (termasuk yang `LX`/kosong).
    - **"Projects Documented"** — angka mentah `count(statusLevel in {L2,L3,L4,L5})` (pasangan/numerator dari poin di atas, angka SAMA persis, cuma disajikan sbg count bukan %).
18. Kalau `total` = 0 (tidak ada data sama sekali di tahun terpilih), % pada KPI kedua ditampilkan sebagai `0%` (bukan `NaN%`/`Infinity%`).

### Filter tahun
19. Dropdown filter tahun (pola & pilihan SAMA PERSIS seperti `YearDropdown` yang sudah ada: Tahun Ini di atas, tahun-tahun sebelumnya, "Semua Waktu" di bawah) ditaruh di section KPI ini (#17).
20. Dropdown ini mengontrol data untuk **KPI (#17), 4 kartu pipeline (#21), dan 3 list (#22)** — TIDAK memengaruhi Coverage Area map (map tetap selalu all-time, sesuai spec sebelumnya, tidak berubah).

### Kartu ringkas pipeline (baru)
21. 4 kartu ringkas, masing-masing `count(...)` dari data terfilter tahun (#20):
    - **"Scheduled to Publish"** — `statusLevel === "L4"`.
    - **"On Documentation Schedule"** — `statusLevel === "L1"`.
    - **"Editing Process"** — `statusLevel === "L3" AND statusVideo === "Editing"`.
    - **"On Review"** — `statusLevel === "L3" AND statusVideo in {"Internal Review", "Client Review"}`.

### 3 daftar aktivitas (baru)
22. 3 kolom list, masing-masing dari data terfilter tahun (#20), maksimal **5 baris** ditampilkan + link **"See all"**:
    - **"Latest Publication"** — proyek `statusLevel === "L5"`, diurutkan `tanggalTayang` terbaru dulu (fallback kalau `tanggalTayang` kosong/tidak valid: urutkan `year` descending lalu `name` ascending). Tiap baris tampil ikon/indikator YouTube (reuse pola ikon yang sudah ada di `LinkChips`/`socialIcons`).
    - **"On Process"** — proyek `statusLevel === "L3"`, diurutkan `year` descending lalu `name` ascending. Tiap baris tampil badge berisi nilai `statusVideo` APA ADANYA (`"Editing"`/`"Internal Review"`/`"Client Review"` — teks asli dari sheet, bukan label yang di-hardcode ulang).
    - **"Recent Documentation"** — proyek `statusLevel === "L2"` (PERSIS L2, bukan cumulative — beda dari KPI #17 "Projects Documented" yang cumulative L2-L5), diurutkan `year` descending lalu `name` ascending.

### Interaksi klik ("semuanya clickable")
23. Klik salah satu dari: 3 kartu KPI (#17), 4 kartu pipeline (#21), atau link "See all" di 3 list (#22) → membuka **drawer/panel slide-in** (reuse komponen `Drawer` yang sudah ada di `CoverageDashboard.jsx`, pola sama seperti klik kartu status lama) menampilkan **daftar LENGKAP** proyek di kategori yang diklik (tanpa limit 5 baris). TIDAK berpindah halaman.
24. Klik satu baris proyek — baik di 3 list (#22) MAUPUN di dalam drawer (#23) — menavigasi ke halaman **"Data"** (Detail Proyek yang sudah di-rename, #3), menampilkan detail proyek yang diklik. TIDAK langsung membuka YouTube atau link eksternal lain.
25. Membuka drawer kategori baru saat drawer lain masih terbuka → drawer berganti isi ke kategori baru (bukan menumpuk 2 drawer sekaligus) — pola sama seperti drawer status lama yang sudah ada (state tunggal `drawer`).

### Konsistensi visual
26. Badge/warna kategori level baru pakai token warna semantik yang SUDAH ADA di `styles/theme.js` semaksimal mungkin (`teal`/`green`/`amber`/`blueSch`/`red`) supaya konsisten dgn identitas SUN Energy yang sudah dibangun — TIDAK memperkenalkan warna baru acak. Untuk kategori yang belum ada warna cocok (mis. "Scheduled to Publish"/L4), tambah **1 token warna baru** ke `styles/theme.js` (bukan hardcode hex di komponen), dipilih supaya tetap harmonis dgn palet yang ada (bukan warna baru yang kontras drastis/asing).
27. `normalizeStatus()` (di `config/statuses.js`, mapping teks lama PUBLISHED/On Progress/dst) **TIDAK dipakai lagi** untuk logic KPI/pipeline/list baru di halaman Dashboard — seluruh logic baru langsung pakai field `statusLevel` (raw string `LX`/`L0`–`L5`) dan `statusVideo` (raw text) apa adanya, tanpa lapisan normalisasi lama. Kalau `normalizeStatus()` masih dipakai komponen lain (`ProjectDetailPage.jsx`, dll) di luar halaman Dashboard, itu di luar scope spec ini — dibiarkan.

### Coverage Area map
28. Coverage Area map (section yang sudah dibangun sebelumnya, [specs/coverage-area-map.md](coverage-area-map.md)) **tetap ada** di halaman Dashboard, posisinya **di bawah** section list (#22) — tidak ada perubahan pada kode/perilaku map itu sendiri.

### Ikon premium & hierarki visual angka
29. Tambah dependency baru **`@phosphor-icons/react`**, pakai varian **duotone** (bukan `regular`/`bold`/`fill`) untuk seluruh ikon di 3 KPI (#17) dan 4 kartu pipeline (#21) — menggantikan/menambah dari `lucide-react` yang sekarang cuma dipakai di tempat lain (link chips, dsb — TIDAK perlu diganti, `lucide-react` tetap dipertahankan di luar section ini).
30. Mapping ikon per kartu (bisa disesuaikan builder kalau ada opsi Phosphor yang lebih pas, tapi harus tetap mencerminkan makna kategori — bukan ikon acak):
    - "Portfolio Project Published" (L5) → `FilmSlate` atau `PlayCircle`
    - "Documented Video of Total Project" (%) → `ChartPieSlice`
    - "Projects Documented" (L2-L5) → `FolderNotchOpen` atau `Files`
    - "Scheduled to Publish" (L4) → `CalendarCheck`
    - "On Documentation Schedule" (L1) → `CalendarDots` atau `VideoCamera`
    - "Editing Process" (L3, Editing) → `Scissors` atau `FilmStrip`
    - "On Review" (L3, Internal/Client Review) → `ClipboardText` atau `Eye`
31. **Hierarki visual wajib: ANGKA harus jadi elemen paling stand-out di tiap kartu** (ukuran font besar, bold, warna kontras tinggi) — ikon jadi elemen SEKUNDER (lebih kecil, ditaruh sbg aksen/chip di pojok atau sebelah label, TIDAK boleh berukuran sama besar/lebih besar dari angka, TIDAK boleh bersaing secara visual dengan angka). Pola ini melanjutkan pola yang sudah ada di `StatusCard` lama (`status-count` besar-bold, ikon kecil dlm chip berwarna di pojok) — diterapkan konsisten ke semua kartu KPI & pipeline baru.
32. Proporsi ikon:angka harus terasa seimbang (bukan ikon mendominasi bikin kartu terkesan ramai/childish, bukan juga ikon terlalu kecil sampai tidak kebaca) — acuan ukuran: ikon sekitar 20-28px dalam chip berwarna (mengikuti pola ukuran chip `StatusCard` yang sudah ada), angka pakai ukuran sama/mengikuti skala `status-count`/`hero-pct` yang sudah didefinisikan di CSS halaman ini.

## Edge Cases
- Lebar desktop sempit (mis. 769–900px, sesaat setelah breakpoint mobile) → top-nav (logo + judul + 3 pill + kontrol kanan) tidak boleh tumpang-tindih/kepotong; boleh menyusut/wrap secara graceful (pola responsif yang sudah ada di app, bukan solusi baru).
- File font Rethink Sans gagal ke-load (jaringan lambat/error) → teks tetap terbaca via fallback font-stack (`system-ui, sans-serif`), tidak boleh jadi invisible text (FOIT) berkepanjangan.
- `statusLevel` kosong (`""`) untuk suatu baris → baris itu tidak masuk hitungan KPI/pipeline manapun dan tidak muncul di list manapun (bukan dianggap `LX`), tidak menyebabkan error.
- Semua data di tahun terpilih bernilai `LX`/kosong (belum ada progress sama sekali) → 3 KPI menampilkan 0/0%, 4 kartu pipeline menampilkan 0, 3 list kosong — masing-masing section tampilkan empty-state yang jelas (teks + ikon), bukan kosong blank tanpa keterangan.
- Filter tahun diganti ke tahun yang datanya kosong total → semua angka 0, list kosong, dropdown tetap berfungsi normal, tidak ada error console.
- Proyek `statusLevel === "L3"` tapi `statusVideo` isinya BUKAN salah satu dari `"Editing"`/`"Internal Review"`/`"Client Review"` (typo manual/data tidak konsisten di sheet) → tidak ikut terhitung di kartu pipeline 13c/13d manapun, TAPI tetap muncul di list "On Process" (#14) dengan badge menampilkan teks `statusVideo` apa adanya (tidak disembunyikan).
- `tanggalTayang` kosong/tidak valid pada proyek `statusLevel === "L5"` → proyek tetap masuk list "Latest Publication", posisi urut memakai fallback (`year` desc, `name` asc).
- Total proyek terfilter tahun < 5 untuk salah satu list → tampilkan apa adanya (misal cuma 2 baris), link "See all" tetap ada & tetap berfungsi (buka drawer isi yang sama, cuma tanpa limit — meski isinya sama saja kalau memang cuma ada 2).
- User klik row proyek yang TIDAK muncul lagi di data terbaru setelah refresh (misal datanya berubah di Sheet) sebelum sempat pindah halaman → cukup best-effort, ikuti pola error-handling yang sudah ada di app (tidak perlu penanganan khusus baru).

## Definition of Done
- [ ] Menu/halaman "Data" lama (`DataPage.jsx`) sudah tidak ada — tidak bisa diakses dengan cara apapun; file `DataPage.jsx` dihapus dari project.
- [ ] Tidak ada elemen sidebar sama sekali di desktop (termasuk tombol collapse/toggle-nya).
- [ ] Desktop menampilkan top-nav persisten berisi logo + judul + 3 pill (**Dashboard | Data | Kalender**) + kontrol kanan (Diperbarui, toggle ID/EN); pill halaman aktif ter-highlight benar.
- [ ] Mobile tetap menampilkan bottom-nav dengan 3 tombol yang sama: **Dashboard | Data | Kalender**.
- [ ] Tombol back-arrow "kembali ke Highlight" di topbar desktop sudah tidak ada; tombol back internal slide-in mobile (Data/Detail Proyek) tetap berfungsi seperti sebelumnya.
- [ ] Menu "Data" (komponen `ProjectDetailPage.jsx`) tampil dgn label "Data" di top-nav & bottom-nav, komponen internalnya tanpa perubahan struktural.
- [ ] Menu "Dashboard" (komponen `CoverageDashboard.jsx`) tampil dgn label "Dashboard".
- [ ] Seluruh teks di app menggunakan font **Rethink Sans** (dicek via computed style di devtools), bukan lagi DM Sans; font di-load dari file lokal, bukan Google Fonts CDN.
- [ ] Logo di top-nav (desktop) & topbar (mobile) menampilkan bentuk sunburst yang sama persis dgn `sun-logogram.svg`, sebagai inline SVG (bukan `<img>`).
- [ ] Favicon (tab browser) menampilkan logogram sunburst, bukan favicon lama.
- [ ] Hero "Total Coverage", 4 kartu status lama, dan section "Prioritas produksi" tidak lagi muncul di halaman Dashboard.
- [ ] 3 KPI utama menampilkan angka yang cocok dengan formula #17 (diverifikasi manual terhadap data live/backend v2).
- [ ] Dropdown filter tahun mempengaruhi KPI + 4 kartu pipeline + 3 list; Coverage Area map TIDAK berubah saat filter tahun diganti.
- [ ] 4 kartu pipeline menampilkan angka sesuai formula #21, diverifikasi terhadap data live.
- [ ] 3 list menampilkan proyek yang benar & urutan yang benar sesuai #22, masing-masing maksimal 5 baris, link "See all" berfungsi.
- [ ] Klik kartu KPI/pipeline/"See all" membuka drawer berisi daftar lengkap kategori itu, tanpa pindah halaman.
- [ ] Klik baris proyek manapun (list atau drawer) menavigasi ke halaman "Data" (Detail Proyek) menampilkan proyek yang benar.
- [ ] Coverage Area map tetap berfungsi normal di bagian bawah halaman Dashboard, tidak ada regresi.
- [ ] Halaman Kalender tidak ada perubahan.
- [ ] `@phosphor-icons/react` (varian duotone) terpasang & dipakai di 3 kartu KPI + 4 kartu pipeline, sesuai mapping ikon di #30.
- [ ] Secara visual, angka di tiap kartu KPI/pipeline jelas lebih dominan/stand-out dibanding ikonnya (ukuran & bobot font, bukan sekadar posisi) — dicek langsung di browser, bukan cuma dari kode.
- [ ] `npm run build` dan `npm run test` lolos tanpa error.
