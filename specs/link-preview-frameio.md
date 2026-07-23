# Link Preview (Frame.io) Button

## Objective
Tambahkan kolom baru "Link preview" (kolom I di sheet, diisi manual oleh user dengan URL Frame.io) yang memunculkan sebuah tombol/icon pada tampilan project berstatus L3 (Editing, Internal Review, Client Review). Tombol ini membuka link Frame.io tersebut di tab baru. Tombol ini TIDAK muncul sama sekali untuk project berstatus L5 (atau status apa pun selain L3).

## Requirements

1. Backend (`apps-script/Code.gs`): tambahkan field baru `linkPreview` ke `FIELD_ALIASES`, dengan alias yang mencakup minimal `"link preview"`, `"frame.io"`, `"frame io"`. Kolom fisik di sheet adalah kolom I.
2. Backend: `readProjects()` menyertakan `linkPreview: getDisp(r, colMap.linkPreview)` pada setiap row object, mengikuti pola pembacaan link/teks yang sudah ada (bukan `getRange()` per sel).
3. Data layer (`src/data/projectModel.js`): `normalizeProject()` menyertakan `linkPreview: p.linkPreview || ""`.
4. Tombol/icon "Link Preview" dirender di setiap tempat yang menampilkan project dengan `statusLevel === "L3"` DAN `statusVideoRaw` termasuk salah satu dari `"Editing"`, `"Internal Review"`, `"Client Review"`. Ini mencakup semua lokasi berikut:
   - `ProjectRow` di Dashboard (list "On Process"/L3 activity list, `CoverageDashboard.jsx`)
   - `CategoryDrawer` (drawer "See all" untuk kategori editing/onReview)
   - Card project di halaman Data (`ProjectDetailPage.jsx`) — baik di list kiri maupun panel detail
5. Tombol/icon TIDAK dirender sama sekali (bukan disabled, benar-benar tidak ada di DOM) untuk project dengan `statusLevel` selain `"L3"` (termasuk L5, L4, L2, L1, L0, LX).
6. Kalau `statusLevel === "L3"` (dengan sub-status yang sesuai poin 4) TAPI `linkPreview` kosong/tidak diisi: tombol tetap dirender, tapi dalam state **disabled berwarna abu-abu** (tidak bisa diklik), mengikuti pola visual link lain yang sudah ada di app ini (lihat `isValidUrl()` pattern di `ProjectDetailPage.jsx`/`LinkTiles.jsx`).
7. Klik tombol (saat aktif) membuka `linkPreview` URL di tab baru (`target="_blank"`, `rel="noopener noreferrer"`).
8. Validasi URL menggunakan pola `isValidUrl()` yang sudah ada di codebase — kalau isi kolom bukan URL valid (`http://`/`https://`), tombol dianggap "kosong" (state abu-abu/disabled), bukan error.
9. Icon yang dipakai: ikon dari `lucide-react` yang merepresentasikan "preview/eksternal" (misal `ExternalLink` atau `PlayCircle` — pilih salah satu yang konsisten dengan style ikon lain di card), bukan custom SVG baru (kecuali tidak ada ikon lucide yang cocok).

## Edge Cases
- Project dengan `statusLevel === "L3"` tapi `statusVideoRaw` di luar 3 nilai yang disebut (data kotor/tidak dikenal) → tombol tidak muncul (treat seperti status lain).
- Kolom I di sheet belum pernah diisi sama sekali (semua baris kosong) → semua tombol L3 tampil abu-abu, tidak ada error di aplikasi.
- Header kolom I berubah nama di masa depan → tetap terbaca via `FIELD_ALIASES` (alias-based, bukan posisi kolom absolut), sesuai konvensi resilience yang sudah ada di seluruh `Code.gs`.
- User taruh teks bukan URL (misal nama file) di kolom Link preview → tombol tampil abu-abu/disabled (bukan crash atau link rusak yang bisa diklik).

## Definition of Done
- [ ] `Code.gs` mengembalikan field `linkPreview` untuk setiap project, terverifikasi lewat curl ke endpoint `route=projects`.
- [ ] Project dengan status L3 (Editing/Internal Review/Client Review) menampilkan tombol Link Preview di: Dashboard activity list, drawer "See all", dan halaman Data.
- [ ] Project dengan status selain L3 (contoh: L5/published) TIDAK menampilkan tombol ini sama sekali di ketiga lokasi tersebut.
- [ ] Kolom Link preview kosong → tombol tampil abu-abu/disabled, tidak bisa diklik.
- [ ] Kolom Link preview berisi URL valid → klik tombol membuka URL tersebut di tab baru.
- [ ] `npm run lint` dan `npm run build` lulus tanpa error.
