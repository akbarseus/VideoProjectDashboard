# Backend Status v2 Migration

## Objective
Migrasikan sumber data backend (`apps-script/Code.gs`, route `route=projects`) dari tab `video_projects_new_v1` ke tab **`video_projects_new_v2`**, yang punya struktur status baru: kolom **"L Status"** (kode level `LX`/`L0`–`L5`, dihitung otomatis oleh formula di sheet berdasarkan pilihan dropdown di kolom **"Status Video"**) menggantikan total sistem status lama (4-kategori Status Video Output). Kolom **"Status Dokumentasi"** (checkbox) tetap dipertahankan apa adanya karena masih jadi dasar perhitungan Coverage %. Route `route=calendar` (tab "Kalender 2026") tidak terdampak sama sekali. Perubahan ini murni backend — penyesuaian frontend (kartu status, filter, dsb) menyusul di spec terpisah.

## Requirements
1. Konstanta `SHEET_NAME` di `apps-script/Code.gs` diubah dari `"video_projects_new_v1"` menjadi `"video_projects_new_v2"`.
2. Tambah field baru `statusLevel` yang membaca kolom dengan header **"L Status"** — dicari via `FIELD_ALIASES` berdasarkan nama header (bukan posisi kolom), dengan alias minimal: `["l status", "level", "status level"]`.
3. Field `statusLevel` diteruskan **mentah** ke frontend (string apa adanya dari sel: `"LX"`, `"L0"`, `"L1"`, `"L2"`, `"L3"`, `"L4"`, `"L5"`, atau `""` kalau sel kosong) — TIDAK ada mapping/transformasi tambahan di Apps Script, karena kode level sudah dihitung otomatis oleh formula di sheet itu sendiri.
4. Field `statusVideo` (alias header sudah ada: `"status video"`) sekarang otomatis terbaca dari kolom **"Status Video"** di `video_projects_new_v2` (dropdown teks: `n/a`, `Permit Process`, `On Schedule Shooting`, `Documented`, `Editing`, `Internal Review`, `Client Review`, `Ready to Publish`, `Published`) — tidak perlu perubahan kode karena alias yang ada (`"status video"`) sudah cocok dengan header baru ini.
5. Field `statusDoc` (checkbox, alias header sudah ada: `"status dokumentasi"`) **tidak berubah sama sekali** — tetap dibaca dari kolom "Status Dokumentasi" via `toBool()`, tetap jadi dasar hitung Coverage % di frontend, tanpa perubahan logic apapun.
6. Field `koordinat` (alias header sudah ada: `"koordinat"`) tetap dibaca berdasarkan nama header seperti sekarang — TIDAK perlu perubahan kode meskipun posisi fisiknya pindah dari kolom P (di v1) ke kolom Q (di v2), karena pencarian berbasis nama header, bukan posisi.
7. Semua field lain yang sudah ada (`id`, `year`, `name`, `industry`, `linkDokumentasi`, `linkVideoOutput`, `linkPeresmian`, `linkYoutube`, `linkLinkedin`, `linkInstagram`, `tanggalTayang`, `catatanProduksi`, `catatanSchedule`) tetap dibaca dengan cara & alias yang sama seperti sekarang — tidak ada perubahan kode untuk field-field ini, asalkan header-nya masih sama di `video_projects_new_v2`.
8. Route `route=calendar` (fungsi `readCalendar`, tab `"Kalender 2026"`) **tidak diubah sama sekali**.
9. `src/data/projectModel.js` (`normalizeProject`) ditambah field `statusLevel: p.statusLevel || ""` mengikuti pola field lain yang sudah ada, supaya field baru ini konsisten tersedia dengan default aman meskipun backend gagal mengirimkannya (mis. sedang fetch dari cache lama / SAMPLE data).

## Edge Cases
- Header **"L Status"** tidak ditemukan di sheet (misal nama kolom berubah) → `statusLevel` dikembalikan sebagai string kosong `""` untuk semua baris, TIDAK error/crash — konsisten dengan pola field lain yang dicari via alias.
- Sel kolom "L Status" kosong untuk baris tertentu (proyek yang statusnya benar-benar belum diisi apapun) → `statusLevel` untuk baris itu `""`, bukan `null`/`undefined`/error.
- Sel kolom "Status Video" berisi nilai dropdown yang TIDAK ada di daftar 9 opsi yang diketahui (misal user ketik manual teks lain di luar dropdown) → tetap diteruskan apa adanya sebagai string (backend tidak validasi/filter isi dropdown, sama seperti field teks lain).
- Tab `video_projects_new_v2` belum ada / salah nama saat kode ini di-deploy → `readProjects()` mengembalikan `{ error: 'Sheet "video_projects_new_v2" tidak ditemukan', rows: [] }`, sama seperti perilaku sekarang saat nama sheet salah (tidak ada perubahan pada penanganan error ini).
- Baris dengan kolom "Koordinat" kosong di `video_projects_new_v2` → tetap `koordinat: ""`, tidak error (perilaku sudah ada, tidak berubah).
- Cache sessionStorage frontend yang masih berisi data lama (skema v1, tanpa `statusLevel`) sebelum user refresh setelah redeploy → `normalizeProject` tetap aman karena `statusLevel` di-default ke `""` (lihat Requirement 9), tidak menyebabkan crash saat data lama masih terpakai sesaat.

## Definition of Done
- [ ] `apps-script/Code.gs`: `SHEET_NAME` bernilai `"video_projects_new_v2"`.
- [ ] `apps-script/Code.gs`: `FIELD_ALIASES` punya entri baru `statusLevel` dengan alias yang mencocokkan header "L Status".
- [ ] Response `route=projects` (setelah redeploy & fetch nyata) memuat field `statusLevel` berisi nilai `LX`/`L0`–`L5`/`""` sesuai isi kolom "L Status" di sheet, untuk tiap baris.
- [ ] Response `route=projects` field `statusVideo` berisi label teks dari kolom "Status Video" yang baru (`Published`, `Documented`, `Editing`, dst) — dikonfirmasi lewat fetch langsung ke endpoint live setelah redeploy.
- [ ] Response `route=projects` field `statusDoc` tetap boolean, terbaca benar dari kolom "Status Dokumentasi", tidak berubah perilakunya dibanding sebelum migrasi.
- [ ] Response `route=projects` field `koordinat` tetap terbaca benar meski kolom fisiknya di posisi Q (bukan P lagi).
- [ ] Route `route=calendar` masih berfungsi identik seperti sebelumnya (tidak ada regresi).
- [ ] `src/data/projectModel.js` — `normalizeProject` mengembalikan `statusLevel` dengan default `""` kalau tidak ada di input.
- [ ] `npm run test` tetap lolos semua (termasuk test `normalizeProject` yang sudah ada, ditambah kalau ada test baru untuk `statusLevel`).
- [ ] `npm run build` berhasil tanpa error setelah semua perubahan di atas.
