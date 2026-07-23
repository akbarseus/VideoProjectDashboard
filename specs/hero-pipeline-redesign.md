# Hero KPI Split + Liquid Glass Pipeline Redesign

## Objective
Pisahkan hero Dashboard menjadi dua panel dengan semantik berbeda: **"Video Progress Overall"** (3 KPI card, terikat filter tahun) dan **"Video Production Pipeline"** (4 card, selalu all-time/real-time, tidak pernah terpengaruh filter). Setiap card menampilkan keterangan "dari total berapa" secara eksplisit (bukan angka polos tanpa konteks), dan bisa di-hover untuk expand menampilkan daftar project ringkas. Pipeline card menggunakan gaya visual liquid glass ala iOS (blur, saturate, translucent) yang berbeda dari KPI card putih solid, dieksekusi lewat `/frontend-design` dan `/ui-ux-pro-max` saat build.

## Requirements

### Struktur data & filter
1. "Video Progress Overall" — 3 KPI card, seluruhnya dihitung dari data **yang sudah difilter tahun** (`filterByYear` dengan tahun terpilih di dropdown, default "Semua Waktu"/all-time seperti sekarang).
2. "Video Production Pipeline" — 4 card, seluruhnya dihitung dari **allRows tanpa filter tahun sama sekali** (selalu all-time), tidak peduli tahun apa yang dipilih di dropdown "Video Progress Overall". Kedua dropdown tahun terpisah sepenuhnya — dropdown Progress Overall TIDAK mempengaruhi Pipeline.
3. KPI card 1 — "Published Project Portfolio Video": numerator = `count(statusLevel === "L5")` dari data terfilter tahun. Denominator = `count(DOCUMENTED_LEVELS)` (L2-L5) dari **data terfilter tahun yang sama**. Tampilkan sebagai contoh: "50 dari 200 project terdokumentasi".
4. KPI card 2 — "Projects Documented": numerator = `count(DOCUMENTED_LEVELS)` dari data terfilter tahun. Denominator = `total rows` (semua statusLevel) dari **data terfilter tahun yang sama**. Tampilkan sebagai contoh: "200 dari 250 total project".
5. KPI card 3 — "Documented Video of Total Project" (persentase): `documented / total * 100`, dari data terfilter tahun yang sama persis dengan card 1 dan 2 (numerator & denominator satu sumber data yang konsisten, tidak boleh campur all-time dengan data terfilter). Tampilkan keterangan pecahan di bawah persen, contoh: "200 dari 250".
6. Pipeline 4 card (On Documentation Schedule/L1, Editing Process/L3+Editing, On Review/L3+Review, Scheduled to Publish/L4) tetap pakai filter/kategori yang sudah ada di `getCategories()` — TIDAK berubah logic-nya, hanya sumber datanya dipastikan selalu `allRows` (bukan `filterByYear(allRows, year)`).
7. Tidak ada penambahan metrik conversion-rate tambahan di card manapun — 3 KPI dan 4 Pipeline tetap berdiri independen seperti draft awal.

### Microcopy pembeda scope
8. Card Pipeline (atau header section-nya) menyertakan teks singkat yang menjelaskan bahwa panel ini SELALU real-time dan tidak terpengaruh filter tahun di atasnya (contoh: "Selalu real-time — tidak terpengaruh filter tahun"), supaya tidak disalahartikan sebagai bug saat user mengganti filter dan pipeline tidak berubah.

### Expand-on-hover
9. KPI card 1 (Published) dan card 2 (Documented) — saat di-hover (desktop) expand secara animasi untuk menampilkan mini-list "Recent Publication"/"Recent Documentation": 3 item ter-terbaru (pakai sorting yang sudah ada — `byTanggalTayang` untuk published, `byYearName` untuk documented), tiap item tampilkan nama project + info ringkas (tanggal tayang / tahun-industri), plus link "See all" yang membuka `CategoryDrawer` kategori terkait (`published`/`documentedPct`).
10. KPI card 3 (persentase) TIDAK expand — tetap statis, tanpa hover-list (sesuai draft screenshot awal).
11. Keempat Pipeline card, saat di-hover, expand menampilkan mini-list max 3-4 item project di kategori itu (pakai filter+sort yang sudah ada di `getCategories()`), tiap item menampilkan nama project + status chip (untuk onReview: badge Internal/Client Review) atau tanggal terjadwal (untuk onDocSched/scheduled), plus link "See all" yang membuka `CategoryDrawer`.
12. Animasi expand/collapse pakai easing profesional (`cubic-bezier`, bukan linear/`ease` default bawaan CSS), durasi disarankan 250-400ms, hormati `prefers-reduced-motion` (langsung tampil final state tanpa animasi jika aktif).
13. Klik pada card (bukan hover) tetap membuka `CategoryDrawer` seperti perilaku existing — hover HANYA untuk preview cepat, klik untuk lihat semua.
14. Karena ini fitur hover, di mobile/touch (tidak ada hover state native) card TIDAK expand — klik langsung buka drawer seperti sekarang, tidak ada perubahan perilaku mobile.

### Visual — liquid glass Pipeline card
15. Keempat Pipeline card memakai gaya "liquid glass" ala iOS: translucent background dengan `backdrop-filter: blur() saturate()`, border tipis semi-transparan, sedikit inner highlight/gradient untuk kesan kaca — dieksekusi detailnya lewat skill `/frontend-design` dan `/anthropic-skills:ui-ux-pro-max` saat build (bukan didikte persis di spec ini), TAPI harus tetap kontras cukup untuk teks angka besar tetap terbaca jelas (WCAG-aware, bukan cuma estetik).
16. KPI card (Progress Overall) TETAP putih solid seperti desain sebelumnya — tidak ikut jadi glass. Hanya Pipeline yang dapat treatment ini, mempertahankan pembeda visual antara "ringkasan" (solid) vs "pipeline aktif" (glass, dinamis).
17. `prefers-reduced-transparency` — Pipeline card fallback ke background solid buram (mengikuti pola `.ui-glass` yang sudah ada di `index.css`) kalau preferensi ini aktif.

## Edge Cases
- Tahun terfilter menghasilkan 0 project sama sekali → KPI card tampil "0 dari 0", bukan `NaN%` atau error (guard division by zero, pola yang sama seperti `docPct` existing).
- Kategori Pipeline kosong (0 project) → card tetap tampil dengan angka "0", hover-nya tidak menampilkan list (state kosong: tampilkan teks singkat "Belum ada project" bukan area kosong blank).
- Hover terjadi tapi mouse keluar sebelum animasi expand selesai → collapse harus tetap mulus mengikuti posisi transisi saat itu (tidak "lompat" ke collapsed langsung), memakai transition CSS yang sama arah bolak-balik.
- User scroll/resize saat card sedang dalam kondisi expanded (hover) → tidak boleh menyebabkan layout shift ke card/section lain di sekitarnya (gunakan `position:absolute` overlay untuk expand, bukan mendorong tata letak flow).
- Device dengan hover simulasi (misal stylus/hybrid touch-mouse laptop) → tetap ikuti CSS `:hover` standar, tidak perlu deteksi device khusus di luar `prefers-reduced-motion`/media query touch yang sudah ada di codebase.

## Definition of Done
- [ ] Filter tahun di "Video Progress Overall" mengubah ketiga KPI card (numerator & denominator ikut berubah bersamaan, konsisten).
- [ ] Mengganti filter tahun TIDAK mengubah angka di keempat Pipeline card sama sekali (diverifikasi dengan 2 tahun berbeda menghasilkan Pipeline count yang identik).
- [ ] Ketiga KPI card menampilkan pecahan "X dari Y" yang benar sesuai requirement 3-5.
- [ ] Hover di card Published/Documented (bukan card persen) menampilkan mini-list 3 item dengan animasi ease-in-out yang mulus, tanpa layout shift ke elemen lain.
- [ ] Hover di keempat Pipeline card menampilkan mini-list sesuai kategori masing-masing.
- [ ] Klik card (di luar hover) tetap membuka drawer seperti sebelumnya.
- [ ] Pipeline card memiliki tampilan liquid glass yang jelas berbeda dari KPI card solid putih, teks tetap terbaca kontras cukup.
- [ ] Microcopy "selalu real-time" muncul di area Pipeline.
- [ ] Mobile: tidak ada perilaku hover-expand sama sekali, klik langsung ke drawer seperti sekarang.
- [ ] `prefers-reduced-motion` dan `prefers-reduced-transparency` dihormati.
- [ ] `npm run lint` dan `npm run build` lulus.
