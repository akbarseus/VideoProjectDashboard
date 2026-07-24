import { normalizeStatus } from "../config/statuses.js";

export const SAMPLE_PROJECTS = [
  { id:"P01", year:"2022", name:"The Zora", industry:"Others", statusLevel:"LX", statusVideo:"n/a", statusDoc:false, linkDokumentasi:"", linkVideoOutput:"", linkPeresmian:"", linkYoutube:"", linkLinkedin:"", linkInstagram:"", tanggalTayang:"" },
  { id:"P02", year:"2022", name:"Univ HKBP Pematang Siantar", industry:"Education", statusLevel:"L5", statusVideo:"Published", statusDoc:true, linkDokumentasi:"https://drive.google.com/drive/xx", linkVideoOutput:"https://drive.google.com/drive/xx", linkPeresmian:"", linkYoutube:"https://youtube.com/xx", linkLinkedin:"", linkInstagram:"", tanggalTayang:"2023-01" },
  { id:"P03", year:"2022", name:"Univ HKBP Medan", industry:"Education", statusLevel:"L2", statusVideo:"Documented", statusDoc:true, linkDokumentasi:"https://drive.google.com/drive/xx", linkVideoOutput:"", linkPeresmian:"", linkYoutube:"", linkLinkedin:"", linkInstagram:"", tanggalTayang:"2023-02" },
  { id:"P04", year:"2022", name:"Global Dairy Alami", industry:"FMCG", statusLevel:"LX", statusVideo:"n/a", statusDoc:false, linkDokumentasi:"", linkVideoOutput:"", linkPeresmian:"", linkYoutube:"", linkLinkedin:"", linkInstagram:"", tanggalTayang:"" },
  { id:"P06", year:"2022", name:"Djarum Workshop", industry:"Cigarette", statusLevel:"L3", statusVideo:"Editing", statusDoc:true, linkDokumentasi:"", linkVideoOutput:"", linkPeresmian:"", linkYoutube:"", linkLinkedin:"", linkInstagram:"", tanggalTayang:"" },
  { id:"P20", year:"2023", name:"Oasis Pilot Project", industry:"Cigarette", statusLevel:"L1", statusVideo:"On Schedule Shooting", statusDoc:false, linkDokumentasi:"", linkVideoOutput:"", linkPeresmian:"", linkYoutube:"", linkLinkedin:"", linkInstagram:"", tanggalTayang:"" },
  { id:"P42", year:"2023", name:"Desa Cancar - PATS", industry:"Others", statusLevel:"LX", statusVideo:"n/a", statusDoc:false, linkDokumentasi:"", linkVideoOutput:"", linkPeresmian:"", linkYoutube:"", linkLinkedin:"", linkInstagram:"", tanggalTayang:"" },
];

export function normalizeProject(p = {}, index = 0) {
  return {
    id: p.id ?? `row-${index}`,
    year: String(p.year ?? "").trim(),
    name: p.name ?? p.nama ?? p.project ?? p.proyek ?? "—",
    industry: p.industry ?? p.sektor ?? "Lainnya",
    statusLevel: p.statusLevel || "",
    // Teks dropdown "Status Video" apa adanya dari sheet ("Documented",
    // "Editing", "Internal Review", ...) — dipakai logic Dashboard baru.
    // statusVideo (ternormalisasi 4-kategori lama) masih dipakai halaman lain.
    statusVideoRaw: String(p.statusVideo ?? p.status ?? "").trim(),
    statusVideo: normalizeStatus(p.statusVideo ?? p.status),
    statusDoc: p.statusDoc === true || p.statusDoc === "TRUE" || p.statusDoc === "true",
    linkDokumentasi: p.linkDokumentasi || "",
    linkVideoOutput: p.linkVideoOutput || "",
    linkPeresmian: p.linkPeresmian || "",
    linkYoutube: p.linkYoutube || "",
    linkLinkedin: p.linkLinkedin || "",
    linkInstagram: p.linkInstagram || "",
    tanggalTayang: p.tanggalTayang || "",
    catatanProduksi: p.catatanProduksi || "",
    catatanSchedule: p.catatanSchedule || "",
    koordinat: p.koordinat || "",
    linkPreview: p.linkPreview || "",
    tipe: p.tipe || "Portofolio",
    tanggalDokumentasi: p.tanggalDokumentasi || "",
  };
}

export function normalizeProjects(rows) {
  return rows.map(normalizeProject);
}
