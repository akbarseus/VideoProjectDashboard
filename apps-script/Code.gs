/**
 * SUN Energy Video Production Dashboard — Apps Script backend
 * ─────────────────────────────────────────────────────────────
 * Sumber data: tab "video_projects_new_v1" (route=projects) dan
 * tab "Kalender 2026" (route=calendar, widget "Hari Ini" di Highlight page)
 *
 * CARA PASANG (Extensions > Apps Script di Google Sheets kamu):
 *  1. Buka spreadsheet -> Extensions -> Apps Script
 *  2. Hapus isi Code.gs yang lama, paste seluruh isi file ini
 *  3. WAJIB (baru): di kiri editor, klik "Services" (ikon +) -> cari
 *     "Google Sheets API" -> Add. Ini dipakai untuk baca URL asli di balik
 *     smart chip (chip file Drive dari '@' mention) — tanpa ini, chip tetap
 *     kebaca sebagai teks judul biasa (bukan URL), sama seperti sebelumnya.
 *  4. Klik Deploy -> Manage deployments -> pencil icon (edit) pada deployment aktif
 *  5. Version: "New version" -> Deploy
 *  6. URL /exec tetap sama, tidak perlu ganti BASE_URL di React
 *
 * Kenapa pakai nama kolom (bukan urutan huruf kolom)?
 * Supaya kalau suatu saat kolom digeser / ditambah / diganti urutannya di
 * Sheets, dashboard TIDAK error — asal nama header-nya masih sama atau
 * mirip salah satu alias di bawah.
 */

const SHEET_NAME = "video_projects_new_v2";

/* ── KALENDER "HARI INI" — tab terpisah, kolom A-H, data mulai baris 9 ──── */
const CALENDAR_SHEET_NAME      = "Kalender 2026";
const CALENDAR_DATA_START_ROW  = 9; // baris 8 = header, baris 9 = data pertama
const CALENDAR_LAST_COL        = 8; // kolom A..H
const CALENDAR_MONTHS_EN       = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/* ── ALIAS HEADER — tambahkan variasi nama di sini kalau header berubah ── */
const FIELD_ALIASES = {
  id:              ["id"],
  year:            ["tahun project", "tahun", "year"],
  name:            ["nama", "nama project", "project", "proyek", "name"],
  industry:        ["jenis industri", "industri", "sektor", "industry"],
  // Kolom E di video_projects_new_v2 — kode level (LX/L0-L5), sudah dihitung
  // OTOMATIS oleh formula di sheet berdasarkan dropdown "Status Video" (kolom
  // F). Backend cuma meneruskan mentah, TIDAK ada mapping ulang di sini.
  statusLevel:     ["l status", "level", "status level"],
  statusVideo:     ["status video output", "status video", "video status"],
  statusDoc:       ["status dokumentasi", "status documentation"],
  linkDokDrive:    ["link drive dokumentasi", "link dokumentasi"],
  linkVideoDrive:  ["link drive video output", "link video output"],
  linkPeresmian:   ["link video peresmian", "link peresmian"],
  linkYoutube:     ["link youtube", "youtube"],
  linkLinkedin:    ["link linkedin", "linkedin"],
  linkInstagram:   ["link instagram", "instagram", "link ig"],
  tanggalTayang:   ["tanggal tayang social media", "tanggal tayang", "publish date"],
  // Catatan status bebas teks — dipakai di kartu Detail Proyek untuk kategori
  // "Dalam Produksi" (kolom O, header asli "Catatan Status Produksi") dan
  // "On Schedule" (kolom N, header asli "Catatan Status Dokumentasi" — nama
  // headernya memang agak menyesatkan tapi itu yang dipakai untuk catatan
  // On Schedule). Kalau header berubah nama, ada fallback ke posisi kolom
  // N/O langsung di readProjects supaya tetap kebaca.
  catatanProduksi: ["catatan status produksi", "keterangan produksi", "catatan produksi", "status produksi"],
  catatanSchedule: ["catatan status dokumentasi", "keterangan schedule", "catatan schedule", "keterangan jadwal", "status schedule"],
  // Kolom P — koordinat lokasi site (peta "Coverage Area" di Highlight page).
  // Diteruskan mentah ke frontend; parsing format desimal/DMS dilakukan di
  // React (lihat src/utils/coordinates.js), bukan di Apps Script.
  koordinat:       ["koordinat", "coordinate", "coordinates", "lat long", "lat/long", "latitude longitude"],
  // Kolom I — URL Frame.io, diisi manual oleh user. Muncul sebagai tombol
  // "Link preview" khusus di proyek berstatus L3 (Editing/Internal Review/
  // Client Review), lihat src/LinkTiles.jsx (isPreviewEligible).
  linkPreview:     ["link preview", "frame.io", "frame io", "preview link"],
  // Kolom D — dropdown "Portofolio" / "Others". Others tidak dihitung di KPI
  // "Video Progress Overall" (khusus Portofolio), tapi tetap dihitung di
  // "Video Production Pipeline". Lihat specs/dashboard-tipe-kpi-and-list-revisions.md.
  tipe:            ["tipe", "type"],
  // Kolom H — dipakai card "On Documentation Schedule" di Dashboard.
  tanggalDokumentasi: ["tanggal dokumentasi"],
};

function normalizeHeader(h) {
  return String(h || "").toLowerCase().trim().replace(/\s+/g, " ");
}

/** Cari index kolom untuk tiap field berdasarkan alias header */
function buildColumnMap(headerRow) {
  const normalized = headerRow.map(normalizeHeader);
  const map = {};
  Object.keys(FIELD_ALIASES).forEach(field => {
    const aliases = FIELD_ALIASES[field];
    let idx = -1;
    for (const alias of aliases) {
      idx = normalized.indexOf(alias);
      if (idx !== -1) break;
    }
    if (idx === -1) {
      // fallback: partial match (contains)
      idx = normalized.findIndex(h => aliases.some(a => h.includes(a)));
    }
    map[field] = idx; // -1 kalau benar-benar tidak ketemu
  });
  return map;
}

/** Ambil URL dari sebuah RichTextValue (smart chip / hyperlink), fallback ke null */
function linkFromRich(rich) {
  if (!rich) return "";
  const runLink = rich.getLinkUrl();
  if (runLink) return runLink;
  const runs = rich.getRuns ? rich.getRuns() : [];
  for (const run of runs) {
    const u = run.getLinkUrl && run.getLinkUrl();
    if (u) return u;
  }
  return "";
}

/** Ambil URL dari formula =HYPERLINK("url", "label") — pola umum lain selain smart chip */
function linkFromFormula(formula) {
  if (!formula) return "";
  const m = /HYPERLINK\(\s*"([^"]+)"/i.exec(formula);
  return m ? m[1] : "";
}

function columnToLetter(col) {
  let letter = "";
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

/**
 * Ambil URL di balik SMART CHIP (mis. chip file Drive dari '@' mention di Sheets).
 * Ini BEDA dari hyperlink teks biasa (yang sudah kebaca lewat getRichTextValues()
 * di linkFromRich) — smart chip cuma bisa diakses lewat Advanced Sheets API
 * (Sheets API v4, field "chipRuns"), tidak lewat SpreadsheetApp biasa.
 *
 * Kalau Advanced Sheets Service belum di-enable di project ini (Services -> +
 * -> Google Sheets API), fungsi ini otomatis di-skip lewat try/catch — link
 * lain tetap kebaca seperti biasa, cuma smart chip yang tidak ke-resolve.
 *
 * Return: map "row_col" (0-based, sejajar dengan array display/raw/rich) -> URL
 */
const SMART_CHIP_CACHE_SECONDS = 60;

function getChipLinkMap(sheetName, lastRow, linkColumns) {
  const map = {};
  const columns = [...new Set(linkColumns.filter(col => col >= 0))].sort((a, b) => a - b);
  if (!columns.length) return map;
  try {
    const ssId  = SpreadsheetApp.getActiveSpreadsheet().getId();
    const firstCol = columns[0];
    const lastCol = columns[columns.length - 1];
    const cache = CacheService.getScriptCache();
    const cacheKey = `smartchips:v2:${ssId}:${sheetName}:${lastRow}:${columns.join(",")}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { /* cache rusak, baca ulang */ }
    }

    const range = `'${sheetName}'!${columnToLetter(firstCol + 1)}1:${columnToLetter(lastCol + 1)}${lastRow}`;
    const resp  = Sheets.Spreadsheets.get(ssId, {
      ranges: [range],
      fields: "sheets.data.rowData.values.chipRuns",
    });
    const rowData = (resp.sheets && resp.sheets[0] && resp.sheets[0].data && resp.sheets[0].data[0] && resp.sheets[0].data[0].rowData) || [];
    const linkColumnSet = new Set(columns);
    rowData.forEach((row, r) => {
      (row.values || []).forEach((cell, offset) => {
        const absoluteCol = firstCol + offset;
        if (!linkColumnSet.has(absoluteCol)) return;
        const chip = cell && cell.chipRuns && cell.chipRuns[0] && cell.chipRuns[0].chip;
        const uri  = chip && chip.richLinkProperties && chip.richLinkProperties.uri;
        if (uri) map[`${r}_${absoluteCol}`] = uri;
      });
    });
    try {
      cache.put(cacheKey, JSON.stringify(map), SMART_CHIP_CACHE_SECONDS);
    } catch (e) {
      // Kegagalan cache tidak boleh memutus response smart chip yang sudah terbaca.
    }
  } catch (e) {
    // Advanced Sheets Service belum di-enable, atau API error sesaat — abaikan,
    // link non-chip (hyperlink/formula/teks) tetap jalan normal.
  }
  return map;
}

function toBool(v) {
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase().trim();
  return s === "true" || s === "yes" || s === "1" || s === "checked";
}

/**
 * PENTING (performa): seluruh sheet dibaca secara batch untuk semua baris.
 * Advanced Sheets API khusus smart chip hanya membaca kolom tautan,
 * bukan getRange() per sel per baris. Versi lama bisa melakukan ratusan/ribuan
 * panggilan API untuk sheet besar — itulah penyebab utama loading lambat.
 */
function readProjects() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return { error: `Sheet "${SHEET_NAME}" tidak ditemukan`, rows: [] };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return { rows: [] };

  const fullRange = sheet.getRange(1, 1, lastRow, lastCol);
  const display    = fullRange.getDisplayValues(); // string tampilan (aman utk semua tipe)
  const raw        = fullRange.getValues();        // untuk boolean asli
  const rich       = fullRange.getRichTextValues(); // untuk hyperlink teks biasa
  const formulas   = fullRange.getFormulas();       // untuk sel =HYPERLINK("url","label")

  const colMap = buildColumnMap(display[0]);
  // Fallback posisi kolom kalau alias header di atas tidak ketemu: N = index 13, O = index 14 (0-based).
  if (colMap.catatanSchedule === -1 && lastCol > 13) colMap.catatanSchedule = 13; // kolom N
  if (colMap.catatanProduksi === -1 && lastCol > 14) colMap.catatanProduksi = 14; // kolom O

  const linkColumns = [
    colMap.linkDokDrive,
    colMap.linkVideoDrive,
    colMap.linkPeresmian,
    colMap.linkYoutube,
    colMap.linkLinkedin,
    colMap.linkInstagram,
  ];
  const chipMap = getChipLinkMap(SHEET_NAME, lastRow, linkColumns);

  const getDisp = (r, col) => col === -1 ? "" : String(display[r][col] || "").trim();
  const getBool = (r, col) => col === -1 ? false : toBool(raw[r][col]);
  // Urutan coba: smart chip -> hyperlink rich-text -> formula HYPERLINK() -> teks polos.
  // Ini supaya link yang di-Sheets ditampilkan sebagai "chip" (baik smart chip Drive
  // maupun hyperlink/rumus biasa) tetap kebaca sebagai URL asli, bukan cuma teks judulnya.
  const getLink = (r, col) => {
    if (col === -1) return "";
    return chipMap[`${r}_${col}`] || linkFromRich(rich[r][col]) || linkFromFormula(formulas[r][col]) || getDisp(r, col);
  };

  const rows = [];
  for (let r = 1; r < display.length; r++) { // mulai dari 1 = lewati header
    const name = getDisp(r, colMap.name);
    if (!name) continue; // skip baris kosong

    rows.push({
      id:              getDisp(r, colMap.id) || `row-${r + 1}`,
      year:            getDisp(r, colMap.year),
      name:            name,
      industry:        getDisp(r, colMap.industry) || "Lainnya",
      statusLevel:     getDisp(r, colMap.statusLevel), // kolom E — LX/L0-L5 mentah, "" kalau kosong/header tak ketemu
      statusVideo:     getDisp(r, colMap.statusVideo) || "n/a",
      statusDoc:       getBool(r, colMap.statusDoc),
      linkDokumentasi: getLink(r, colMap.linkDokDrive),
      linkVideoOutput: getLink(r, colMap.linkVideoDrive),
      linkPeresmian:   getLink(r, colMap.linkPeresmian),
      linkYoutube:     getLink(r, colMap.linkYoutube),
      linkLinkedin:    getLink(r, colMap.linkLinkedin),
      linkInstagram:   getLink(r, colMap.linkInstagram),
      tanggalTayang:   getDisp(r, colMap.tanggalTayang),
      catatanProduksi: getDisp(r, colMap.catatanProduksi), // kolom O — teks status utk kartu "Dalam Produksi"
      catatanSchedule: getDisp(r, colMap.catatanSchedule), // kolom N — teks status utk kartu "On Schedule"
      koordinat:       getDisp(r, colMap.koordinat),       // kolom P — koordinat lokasi site, mentah
      linkPreview:     getLink(r, colMap.linkPreview),     // kolom I — URL Frame.io, manual
      tipe:            getDisp(r, colMap.tipe) || "Portofolio", // kolom D — Portofolio/Others
      tanggalDokumentasi: getDisp(r, colMap.tanggalDokumentasi), // kolom H
    });
  }

  return {
    rows,
    _meta: {
      columnsFound: colMap,
      totalRows: rows.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Baca tab "Kalender 2026" (widget "Hari Ini" di Highlight page) — kolom
 * A-H, data mulai baris 9 (baris 8 = header). Jika query `date=YYYY-MM-DD`
 * diberikan, backend hanya membaca kolom tanggal untuk mencari posisi baris,
 * lalu membaca satu baris A-H yang cocok. Tanpa query date, seluruh tahun tetap
 * dikirim untuk kompatibilitas dengan frontend/deployment lama.
 */
function calendarDateKey(value) {
  const match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(String(value || "").trim());
  if (!match) return "";

  const month = CALENDAR_MONTHS_EN.indexOf(match[2].toLowerCase());
  if (month < 0) return "";

  return `${match[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
}

function calendarRowToObject(row) {
  return {
    tanggal:      String(row[0] || "").trim(), // A — "01 January 2026"
    hari:         String(row[1] || "").trim(), // B — "Kamis"
    tahun:        String(row[2] || "").trim(), // C — "2026"
    bulan:        String(row[3] || "").trim(), // D — "Januari"
    status:       String(row[4] || "").trim(), // E — "UNLUCKY DAY" / "MIXED ACTIVITIES"
    favourable:   String(row[5] || "").trim(), // F
    unfavourable: String(row[6] || "").trim(), // G
    deskripsi:    String(row[7] || "").trim(), // H — "Deskripsi Asli"
  };
}

function readCalendar(dateKey) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CALENDAR_SHEET_NAME);
  if (!sheet) return { error: `Sheet "${CALENDAR_SHEET_NAME}" tidak ditemukan`, rows: [] };

  const lastRow = sheet.getLastRow();
  if (lastRow < CALENDAR_DATA_START_ROW) return { rows: [] };

  const numRows = lastRow - CALENDAR_DATA_START_ROW + 1;
  const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || "")) ? String(dateKey) : "";
  let display;

  if (requestedDate) {
    const dates = sheet.getRange(CALENDAR_DATA_START_ROW, 1, numRows, 1).getDisplayValues();
    let matchingOffset = -1;
    for (let i = 0; i < dates.length; i++) {
      if (calendarDateKey(dates[i][0]) === requestedDate) {
        matchingOffset = i;
        break;
      }
    }

    display = matchingOffset < 0
      ? []
      : sheet.getRange(CALENDAR_DATA_START_ROW + matchingOffset, 1, 1, CALENDAR_LAST_COL).getDisplayValues();
  } else {
    display = sheet.getRange(CALENDAR_DATA_START_ROW, 1, numRows, CALENDAR_LAST_COL).getDisplayValues();
  }

  const rows = [];
  for (let i = 0; i < display.length; i++) {
    const row = display[i];
    const tanggal = String(row[0] || "").trim();
    if (!tanggal) continue; // skip baris kosong
    rows.push(calendarRowToObject(row));
  }

  return {
    rows,
    _meta: {
      totalRows: rows.length,
      requestedDate: requestedDate || null,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Data proyek tidak di-cache: perubahan status, tahun, sektor, dan catatan
 * tetap terbaca langsung. Cache 60 detik hanya dipakai untuk URL hasil
 * resolusi smart chip yang mahal melalui Advanced Sheets API.
 */
function doGet(e) {
  const route = (e.parameter.route || "").toLowerCase();
  let payload;

  if (route === "projects" || route === "coverage") {
    payload = readProjects();
  } else if (route === "calendar") {
    payload = readCalendar(e.parameter.date || "");
  } else {
    payload = { error: "Unknown route", rows: [] };
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
