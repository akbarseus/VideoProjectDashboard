import { FolderOpen, LayoutDashboard, CalendarDays } from "lucide-react";

// Nav utama: 3 halaman internal. Halaman "Data" lama (tabel) sudah dihapus —
// label "Data" sekarang milik halaman Detail Proyek. "Kalender" sekarang
// halaman internal (CalendarPage.jsx) — sebelumnya redirect ke PDF Drive,
// link itu masih ada sbg tautan sekunder "Full PDF" di dalam halaman.
export function getNavigation(t) {
  return [
    {
      id: "highlight",
      label: t("Dashboard", "Dashboard"),
      desc: t("Ringkasan Produksi", "Production Summary"),
      icon: LayoutDashboard,
    },
    {
      id: "detail",
      label: t("Data", "Data"),
      desc: t("Detail & Info Proyek", "Project Details"),
      icon: FolderOpen,
    },
    {
      id: "calendar",
      label: t("Kalender", "Calendar"),
      desc: t("Jadwal Produksi", "Production Calendar"),
      icon: CalendarDays,
    },
  ];
}
