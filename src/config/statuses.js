import { AlertCircle, CalendarClock, CheckCircle2, Clock } from "lucide-react";

export const STATUS_ORDER = ["published", "onprogress", "onschedule", "na"];

export function normalizeStatus(raw) {
  const value = String(raw || "").toLowerCase().trim();
  if (value.includes("publish")) return "published";
  if (value.includes("on progress") || value.includes("progress")) return "onprogress";
  if (value.includes("on schedule") || value.includes("schedule")) return "onschedule";
  return "na";
}

export function getStatusMeta(t, colors) {
  return {
    published: {
      key: "published",
      color: colors.green,
      bg: colors.greenBg ?? colors.greenLight,
      light: colors.greenLight ?? colors.greenBg,
      mid: colors.greenMid,
      icon: CheckCircle2,
      short: t("Tayang", "Published"),
      long: t("Sudah Tayang", "Published"),
      detail: t("Sudah Tayang", "Published"),
      data: t("Sudah Tayang", "Published"),
      sub: t("Sudah live — bisa ditonton publik sekarang", "Live now — publicly viewable"),
    },
    onprogress: {
      key: "onprogress",
      color: colors.amber,
      bg: colors.amberBg ?? colors.amberLight,
      light: colors.amberLight ?? colors.amberBg,
      mid: colors.amberMid,
      icon: Clock,
      short: t("Produksi", "In Progress"),
      long: t("Dalam Produksi", "In Production"),
      detail: t("Dalam Produksi", "In Production"),
      data: t("Dalam Produksi", "In Progress"),
      sub: t("Tim sedang mengerjakan — akan segera rilis", "Team is working on it — releasing soon"),
    },
    onschedule: {
      key: "onschedule",
      color: colors.blueSch,
      bg: colors.blueSchBg ?? colors.blueSchLight,
      light: colors.blueSchLight ?? colors.blueSchBg,
      mid: colors.blueSchMid,
      icon: CalendarClock,
      short: t("Terjadwal", "Scheduled"),
      long: t("On Schedule", "On Schedule"),
      detail: t("On Schedule", "On Schedule"),
      data: t("On Schedule", "On Schedule"),
      sub: t("Sudah dijadwalkan — menunggu giliran produksi", "Scheduled — waiting for its production slot"),
    },
    na: {
      key: "na",
      color: colors.red,
      bg: colors.redBg ?? colors.redLight,
      light: colors.redLight ?? colors.redBg,
      mid: colors.redMid,
      icon: AlertCircle,
      short: t("Belum Ada", "No Video"),
      long: t("Belum Ada Konten", "No Content Yet"),
      detail: t("Belum Ada Konten", "No Content Yet"),
      data: t("Belum Ada", "No Video"),
      sub: t("Belum ada video — jadwalkan produksi sekarang", "No video yet — schedule production now"),
    },
  };
}

export function getStatusStages(t, colors) {
  const meta = getStatusMeta(t, colors);
  return STATUS_ORDER.map((key) => ({
    ...meta[key],
    label: meta[key].data,
  }));
}

