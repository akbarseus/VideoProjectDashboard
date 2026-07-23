# Coverage Area Map

## Objective
Menambahkan widget peta interaktif "Coverage Area" di halaman Highlight (khusus desktop, ≥769px) yang menampilkan lokasi setiap proyek video sebagai pin merah di peta Indonesia, berdasarkan kolom baru **"Koordinat"** (kolom P) di tab `video_projects_new_v1`. Widget ini **menggantikan total** section chart "Distribusi & tren" (Recharts) yang ada sekarang di `CoverageDashboard.jsx`. Tujuannya memberi gambaran visual persebaran geografis site SUN Energy, dan klik pin langsung membuka video YouTube site tersebut — mempercepat akses tanpa harus mencari manual lewat halaman Data/Detail Proyek.

## Requirements

### Backend (`apps-script/Code.gs`)
1. Route `route=projects` (fungsi pembaca `video_projects_new_v1`) membaca kolom baru **"Koordinat"** (dicari berdasarkan nama header via `FIELD_ALIASES`, bukan posisi kolom — konsisten dengan pola kolom lain), disimpan sebagai field internal `koordinat` (string mentah, apa adanya dari sel).
2. Field `koordinat` diteruskan mentah (raw string) ke frontend — parsing/validasi koordinat dilakukan di frontend, bukan di Apps Script.
3. Kalau header "Koordinat" tidak ditemukan di sheet (misal nama kolom berubah), field `koordinat` dikembalikan sebagai string kosong untuk semua baris — tidak error/crash.

### Parsing koordinat (frontend)
4. Buat fungsi parser (misal `parseKoordinat(raw)`) yang menerima string mentah dari kolom "Koordinat" dan mengembalikan `{ lat: number, lng: number }` atau `null` kalau gagal parse. Parsing manual via regex (pola sama seperti parsing tanggal manual di `useHariIni.js` — TIDAK pakai `new Date()`-style auto-detect yang locale-dependent).
5. Parser HARUS mendukung minimal 2 format yang terbukti muncul di data nyata:
   - **Desimal, dipisah koma**: `3.596856700702738, 98.68126230986603` → `{ lat: 3.596856700702738, lng: 98.68126230986603 }`
   - **DMS (derajat-menit-detik) dgn arah mata angin**: `6°49'12.9"S 110°48'35.4"E` atau `6°31'39.4"S 107°41'42.0"E` → dikonversi ke desimal (`S`/`W` jadi negatif, `N`/`E` jadi positif).
6. String kosong, whitespace-only, atau format yang tidak cocok kedua pola di atas → parser return `null` (bukan `NaN`, bukan lempar exception).

### Widget peta (frontend, `CoverageDashboard.jsx` / komponen baru terpisah misal `CoverageAreaMap.jsx`)
7. Widget menggantikan section "Distribusi & tren" (Recharts) di halaman Highlight — Recharts chart & importnya dihapus dari halaman ini kalau memang tidak dipakai section lain.
8. Widget render **hanya di desktop** (≥769px, breakpoint sama seperti widget "Hari Ini") — di mobile, section ini tidak tampil sama sekali (bukan cuma disembunyikan CSS, tapi tidak dirender/tidak ada dampak layout mobile).
9. Pakai **Leaflet** (npm package `leaflet` + `react-leaflet`) dengan tile layer **OpenStreetMap** — gratis, tanpa API key.
10. Peta menampilkan **1 pin merah** untuk setiap proyek yang punya `koordinat` valid (hasil parse ≠ `null`), pada posisi `{lat, lng}` hasil parse.
11. Proyek dengan `koordinat` kosong/gagal parse (`null`) **tidak muncul di peta sama sekali** — tidak ada placeholder, tidak ada error visual.
12. Pin **tidak difilter berdasarkan tahun** — peta selalu tampilkan seluruh proyek dari semua tahun yang punya koordinat valid, terlepas dari dropdown filter tahun di hero section.
13. **Hover** pada pin menampilkan tooltip berisi **nama proyek** (`name`).
14. **Klik** pin, kalau proyek punya `linkYoutube` yang valid (lolos `isValidUrl()` — pola sama seperti validasi link di tempat lain di app ini), membuka link tersebut di tab baru (`target="_blank"`, dengan `rel="noopener noreferrer"`).
15. Kalau proyek **tidak punya `linkYoutube` valid**, pin tetap tampil merah dan tetap bisa di-hover (tooltip nama proyek tetap muncul), tapi klik **tidak melakukan apa-apa** (tidak ada navigasi, tidak ada error).
16. Proyek dengan koordinat sama/berdekatan ditampilkan sebagai pin yang numpuk apa adanya (tanpa clustering/grouping) — user bisa zoom in manual di peta kalau perlu memisahkan.
17. Peta di-load dengan initial view/zoom yang menampilkan seluruh wilayah Indonesia (bounds tetap, tidak auto-fit ke pin yang ada — supaya konsisten kalau jumlah pin sedikit saat testing).
18. Tambah `leaflet` dan `react-leaflet` ke `package.json` sebagai dependency baru.
19. CSS Leaflet (`leaflet.css`) di-import supaya tile & marker tampil benar (bukan kotak-kotak/rusak).

## Edge Cases
- Kolom "Koordinat" kosong untuk semua baris (misal sebelum user isi data) → peta tampil kosong (tanpa pin), tidak ada pesan error, tidak crash.
- Format koordinat di luar 2 pola yang didukung (misal cuma nama tempat teks, atau format aneh lainnya) → parser return `null`, proyek itu di-skip dari peta seperti kasus kosong.
- Koordinat dengan tanda derajat/menit/detik yang sedikit berbeda penulisan (misal tanpa spasi antara `S` dan `110°...`, atau pakai `′`/`″` alih-alih `'`/`"`) → boleh gagal parse ke `null` (di-skip), TIDAK wajib didukung, tapi tidak boleh membuat error/crash aplikasi.
- Proyek tanpa `linkYoutube` (field kosong atau bukan URL valid, termasuk isu data #3b di `HANDOFF.md` — kolom link yang kadang tertukar isinya) → pin tetap tampil, klik disabled sesuai requirement #15.
- Beberapa proyek dengan koordinat yang identik persis → semua pin tetap dirender (numpuk), tidak ada dedup otomatis.
- User resize window dari mobile ke desktop (atau sebaliknya) saat halaman Highlight terbuka → widget peta muncul/hilang sesuai breakpoint tanpa perlu reload halaman.
- Sandbox preview Claude tidak bisa fetch data Sheets asli (isu jaringan yang sudah diketahui, lihat `HANDOFF.md` #3a/#16d) — verifikasi visual final harus dilakukan di browser asli user, bukan di preview sandbox.

## Definition of Done
- [ ] Kolom "Koordinat" (kolom P, tab `video_projects_new_v1`) terbaca oleh Apps Script dan muncul sebagai field `koordinat` di response `route=projects`.
- [ ] Section "Distribusi & tren" (chart Recharts lama) sudah tidak ada lagi di halaman Highlight.
- [ ] Widget peta baru tampil di halaman Highlight, posisi menggantikan chart lama, **hanya saat viewport ≥769px**.
- [ ] Di viewport <769px (mobile), widget peta tidak dirender dan tidak ada perubahan layout mobile dibanding sebelumnya.
- [ ] Peta menampilkan tile OpenStreetMap yang ter-render dengan benar (bukan kotak abu-abu/broken tile).
- [ ] Proyek dengan koordinat format desimal (`3.596856700702738, 98.68126230986603`) muncul sebagai pin merah di posisi yang benar.
- [ ] Proyek dengan koordinat format DMS (`6°49'12.9"S 110°48'35.4"E`) muncul sebagai pin merah di posisi yang benar (dikonversi ke desimal dengan tanda yang sesuai arah mata angin).
- [ ] Proyek dengan kolom "Koordinat" kosong tidak muncul di peta, dan tidak memicu error di console.
- [ ] Hover pada pin manapun menampilkan tooltip nama proyek yang sesuai.
- [ ] Klik pin proyek yang punya link YouTube valid membuka link tersebut di tab baru.
- [ ] Klik pin proyek yang TIDAK punya link YouTube valid tidak melakukan apa-apa (tidak error, tidak navigasi).
- [ ] Pin yang tampil TIDAK berubah saat dropdown filter tahun di hero diganti-ganti (tetap semua proyek berkoordinat, semua tahun).
- [ ] `npm run build` berhasil tanpa error dengan dependency `leaflet`/`react-leaflet` baru ditambahkan.
