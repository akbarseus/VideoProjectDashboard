# Splash Loading Screen

## Objective
Menambahkan splash screen yang tampil sesaat sebelum konten app dirender, menampilkan animasi logogram SUN Energy (kelopak muncul satu-satu membentuk lingkaran, looping) berdampingan dengan wordmark "SUN" statis. Splash berakhir begitu data proyek (`useVideoProjects`) selesai di-resolve (berhasil ATAU fallback ke SAMPLE data), lalu splash geser ke atas (slide-up, gaya tirai terangkat) memperlihatkan halaman app di baliknya. Tujuannya: memberi kesan brand yang lebih premium & modern saat app pertama kali dimuat, sekaligus menyembunyikan "flash" konten kosong/loading state yang tidak rapi selama fetch awal berlangsung.

## Requirements
1. Splash screen dirender di level `App.jsx`, menutupi SELURUH viewport (di atas topbar, sidebar-area, konten, bottom nav — z-index lebih tinggi dari semua elemen fixed yang ada, termasuk `.tb`/`.mbn` yang z-index 300).
2. Latar splash: **putih/netral** (bukan solid teal) — konsisten dgn `bg` app (`#F8FAFC` atau `#FFFFFF`).
3. Isi splash: **logogram sunburst** (`sun-logogram.svg`, inline SVG, warna `#3EBDAC`) dengan animasi loop, ditemani **wordmark "SUN"** (`sun-logo.svg` atau elemen teks bermerek yang setara) yang tampil STATIS (tidak ikut animasi) — keduanya muncul BERSAMAAN sejak splash pertama render (bukan wordmark menyusul belakangan).
4. Animasi logogram: 6 kelopak logogram (path SVG yang sudah ada) muncul **satu per satu secara berurutan** mengelilingi pusat sampai membentuk lingkaran penuh, lalu (setelah jeda singkat dgn lingkaran penuh terlihat) mengulang dari awal — loop terus-menerus selama splash aktif, TANPA titik akhir tetap (durasi splash ditentukan oleh trigger data, bukan oleh selesainya 1 siklus animasi).
5. Splash **berakhir begitu `useVideoProjects` selesai resolve** — didefinisikan sebagai `loading === false` dari hook tsb (baik hasil fetch sukses maupun fallback ke `SAMPLE_PROJECTS` + error state). Status `useHariIni` (kalender "Hari Ini") TIDAK ditunggu — boleh masih loading di background setelah splash berakhir & app sudah tampil.
6. **Tidak ada durasi minimum** — begitu kondisi #5 terpenuhi, splash langsung mulai transisi keluar, walau itu terjadi dalam hitungan milidetik (misal karena `sessionStorage` cache bikin data sudah siap sejak render pertama). Tidak ada `setTimeout` artifisial yang memperlama splash supaya animasi "sempat kelihatan".
7. Transisi keluar: splash (SATU KESATUAN, logogram+wordmark+background sekaligus) **geser ke atas keluar layar** (`translateY(-100%)` atau setara), gaya tirai terangkat, memperlihatkan halaman app yang sudah ter-render di baliknya. Bukan fade-out di tempat, bukan konten app yang slide-up dari bawah.
8. Setelah transisi slide-up selesai (elemen splash sudah sepenuhnya di luar viewport), elemen splash di-unmount total dari DOM (tidak menyisakan elemen kosong/`display:none` yang tetap ikut termuat).
9. Splash tampil pada **setiap mount `App.jsx`** (setiap full page load/refresh) — tidak ada logic "hanya tampil sekali per sesi" atau di-skip berdasarkan riwayat kunjungan sebelumnya. Kalau kebetulan data sudah ter-cache dan resolve instan, splash secara alami cuma kelihatan sangat sebentar (bukan di-skip secara eksplisit) — konsisten dgn Requirement #6.
10. Selama splash aktif, konten app di baliknya boleh sudah mulai me-render (tidak perlu ditunda), tapi TIDAK terlihat/tidak bisa berinteraksi (splash menutupi & mem-block interaksi) sampai transisi slide-up dimulai.
11. **Kualitas motion**: SEMUA animasi di fitur ini (kelopak muncul, loop, transisi slide-up) WAJIB pakai easing custom bezier yang halus — bukan `linear` dan bukan default `ease` bawaan browser. Pakai kurva ease-in-out yang terasa "hidup"/organik (contoh acuan: `cubic-bezier(0.65, 0, 0.35, 1)` untuk gerakan masuk-keluar kelopak, `cubic-bezier(0.22, 1, 0.36, 1)` — gaya "ease-out-expo" — utk transisi slide-up supaya terasa cepat di awal lalu mendarat lembut, bukan gerakan seragam/kaku). Timing tiap kelopak muncul diberi jeda (stagger) yang konsisten, bukan sekadar `opacity` on/off tanpa transisi.
12. Animasi logogram menghormati `prefers-reduced-motion: reduce` — kalau preferensi ini aktif, logogram cukup ditampilkan statis (lingkaran penuh diam, tanpa animasi kelopak satu-satu/loop), splash tetap berakhir & bertransisi sesuai Requirement #5–7 (transisi slide-up boleh tetap ada karena itu perpindahan state, bukan animasi dekoratif berulang — tapi durasinya dipersingkat/dibuat instan kalau memungkinkan).

## Edge Cases
- Fetch data proyek gagal total (network error, semua retry habis) → `useVideoProjects` tetap mengembalikan `loading:false` (fallback ke SAMPLE + error state, sudah ada di logic saat ini) → splash tetap berakhir normal, app tampil dengan data SAMPLE + banner error seperti biasa (TIDAK splash nunggu tanpa batas waktu).
- User refresh halaman saat cache `sessionStorage` sudah ada → `loading` bisa `false` sejak render pertama → splash langsung transisi keluar tanpa sempat terlihat animasi loop-nya sama sekali (ini perilaku yang DIINGINKAN, bukan bug — sesuai Requirement #6).
- `prefers-reduced-motion: reduce` aktif → logogram statis (lingkaran penuh, diam), bukan blank/hilang total.
- Resize window / rotate device selagi splash masih tampil → splash tetap menutupi penuh viewport baru (responsive), tidak meninggalkan celah menampilkan konten app di pinggir.
- Splash TIDAK boleh menyebabkan layout shift atau flash of unstyled content saat pertama kali muncul (harus sudah full-cover sejak render pertama React, bukan menyusul beberapa frame kemudian).

## Definition of Done
- [ ] Splash screen muncul full-viewport setiap kali app di-load/refresh, menutupi topbar/konten/bottom-nav sepenuhnya.
- [ ] Logogram (inline SVG, path dari `sun-logogram.svg`) + wordmark "SUN" statis tampil bersamaan sejak splash pertama muncul.
- [ ] Kelopak logogram terlihat muncul satu-per-satu membentuk lingkaran penuh, lalu berulang (loop) — diverifikasi visual di browser.
- [ ] Splash berakhir tepat saat `useVideoProjects().loading` menjadi `false` (diverifikasi dgn cache kosong → splash sempat terlihat beberapa saat; dgn cache terisi → splash langsung/nyaris langsung hilang).
- [ ] Status `useHariIni` tidak mempengaruhi durasi splash sama sekali.
- [ ] Transisi keluar berupa slide-up satu kesatuan (bukan fade, bukan konten yang slide-up dari bawah) — diverifikasi visual.
- [ ] Setelah transisi selesai, elemen splash tidak lagi ada di DOM (dicek via devtools/inspect).
- [ ] Dengan `prefers-reduced-motion: reduce` aktif di browser, logogram tampil statis (lingkaran penuh diam) tanpa animasi loop kelopak.
- [ ] Semua transisi (kelopak, loop, slide-up) pakai custom cubic-bezier easing (bukan `linear`/`ease` default) — dicek dari kode CSS, dan secara visual terasa smooth/halus, bukan kaku/patah-patah.
- [ ] Fallback ke SAMPLE data (simulasi network gagal) tetap membuat splash berakhir normal, tidak menggantung selamanya.
- [ ] `npm run build` dan `npm run test` lolos tanpa error.
