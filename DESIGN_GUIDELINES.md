# Design Guidelines — SUN Energy Coverage Dashboard

## Default design skill

Gunakan skill berikut sebagai default untuk semua pekerjaan yang mengubah tampilan, layout, interaksi, animasi, warna, tipografi, chart, atau UX:

`C:\Users\sarap\coverage-dashboard\.agents\skills\frontend-design\SKILL.md`

Skill tersebut wajib dibaca sebelum mengerjakan perubahan visual baru.

## Prinsip visual project

- Pertahankan identitas SUN Energy: teal `#3EBDAC`, permukaan putih, teks navy gelap, dan aksen glass yang terkontrol.
- Gunakan satu signature visual utama per layar; hindari dekorasi yang tidak membantu hierarki informasi.
- Prioritaskan keterbacaan, alignment, whitespace, dan konsistensi antar desktop/mobile.
- Animasi harus memiliki tujuan, halus, dan menghormati `prefers-reduced-motion`.
- Hover hanya untuk pointer-capable devices; jangan mengandalkan hover pada mobile.
- Gunakan ikon SVG/Lucide/Phosphor yang konsisten, bukan emoji sebagai ikon UI.
- Semua layout baru harus responsif tanpa horizontal overflow.
- Efek blur/transparansi harus dibatasi agar tidak membebani performa mobile.

## Workflow sebelum implementasi visual

1. Baca `frontend-design/SKILL.md`.
2. Identifikasi konteks layar, target pengguna, dan tujuan utama komponen.
3. Tetapkan keputusan warna, spacing, typography, dan motion sebelum coding.
4. Implementasikan dengan selector yang spesifik dan token project yang sudah ada.
5. Verifikasi desktop, mobile, reduced-motion, lint, dan build.

## Catatan perubahan

Jika keputusan visual baru mengubah pola global, dokumentasikan di file ini dan tambahkan ringkasannya ke `HANDOFF.md`.

