import { memo, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LinkChips } from "../../LinkTiles";
import { getStatusMeta } from "../../config/statuses";
import { DASHBOARD_COLORS as C } from "../../styles/theme";

const PAGE_SIZE = 5;
const FILTER_KEYS = ["all", "published", "onprogress", "onschedule", "na"];

function Badge({ status, lang }) {
  const t = (id, en) => lang === "id" ? id : en;
  const meta = getStatusMeta(t, C)[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px",
      borderRadius: 20, background: meta.light, fontSize: 12, fontWeight: 600, color: meta.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color }} />
      {meta.short}
    </span>
  );
}

function filterLabel(key, metrics, total, t) {
  if (key === "all") return t(`Semua (${total})`, `All (${total})`);
  if (key === "published") return t(`Tayang (${metrics.published})`, `Published (${metrics.published})`);
  if (key === "onprogress") return t(`Produksi (${metrics.onprogress})`, `In Production (${metrics.onprogress})`);
  if (key === "onschedule") return t(`Terjadwal (${metrics.onschedule})`, `Scheduled (${metrics.onschedule})`);
  return t(`Belum Ada (${metrics.na})`, `No Video (${metrics.na})`);
}

const DashboardProjectTable = memo(function DashboardProjectTable({ data, metrics, lang }) {
  const t = (id, en) => lang === "id" ? id : en;
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);

  const tableRows = useMemo(
    () => filter === "all" ? data : data.filter(row => row.statusVideo === filter),
    [data, filter]
  );
  const totalPages = Math.ceil(tableRows.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));
  const pageRows = useMemo(
    () => tableRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [tableRows, safePage]
  );

  const changeFilter = key => {
    setFilter(key);
    setPage(0);
  };

  return (
    <section aria-labelledby="all-projects-heading">
      <div className="sec-head" style={{ marginBottom: 10 }}>
        <div className="sec-title" id="all-projects-heading">{t("Semua proyek", "All projects")}</div>
        <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.4, marginTop: 2 }}>
          {t(
            "Telusuri dan filter semua proyek berdasarkan status konten",
            "Browse and filter all projects by content status"
          )}
        </div>
      </div>

      <div className="chip-row">
        {FILTER_KEYS.map(key => (
          <button
            key={key}
            className={`chip ${filter === key ? "on" : ""}`}
            onClick={() => changeFilter(key)}
          >
            {filterLabel(key, metrics, data.length, t)}
          </button>
        ))}
      </div>

      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
        overflow: "hidden", boxShadow: C.sh1,
      }}>
        <div className="tbl-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                {[t("Proyek", "Project"), t("Sektor", "Sector"), t("Tahun", "Year"), t("Status", "Status"), t("Tautan", "Links")].map((heading, index) => (
                  <th key={heading} style={{
                    padding: `11px ${index === 0 ? "16px" : "14px"}`,
                    textAlign: "left", width: ["32%", "18%", "12%", "20%", "18%"][index],
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.02em", color: C.textSec,
                  }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 28, textAlign: "center", color: C.textSec, fontSize: 13 }}>
                    {t("Tidak ada proyek di kategori ini — coba pilih filter lain.", "No projects in this category — try a different filter.")}
                  </td>
                </tr>
              ) : pageRows.map((row, index) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: index < pageRows.length - 1 ? `1px solid ${C.borderSoft}` : "none", transition: "background .1s" }}
                  onMouseEnter={event => { event.currentTarget.style.background = C.greenLight; }}
                  onMouseLeave={event => { event.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textH, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.name}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: C.textSec }}>{row.industry}</td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: C.textSec, fontVariantNumeric: "tabular-nums" }}>{row.year || "—"}</td>
                  <td style={{ padding: "12px 16px" }}><Badge status={row.statusVideo} lang={lang} /></td>
                  <td style={{ padding: "12px 14px" }}><LinkChips row={row} lang={lang} size={12} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="tbl-cards">
          {pageRows.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: C.textSec, fontSize: 13 }}>
              {t("Tidak ada proyek di kategori ini — coba pilih filter lain.", "No projects in this category — try a different filter.")}
            </div>
          ) : pageRows.map((row, index) => (
            <div key={row.id} style={{
              padding: "14px 16px",
              borderBottom: index < pageRows.length - 1 ? `1px solid ${C.borderSoft}` : "none",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textH, lineHeight: 1.35, flex: 1 }} title={row.name}>
                  {row.name}
                </div>
                <Badge status={row.statusVideo} lang={lang} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: C.textSec }}>
                <span>{row.industry}</span><span>·</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{row.year || "—"}</span>
              </div>
              <LinkChips row={row} lang={lang} size={12} />
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pag">
            <span className="pag-info">
              <strong style={{ color: C.text }}>
                {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, tableRows.length)}
              </strong>{" "}{t("dari", "of")}{" "}
              <strong style={{ color: C.text }}>{tableRows.length}</strong>{" "}{t("proyek", "projects")}
            </span>
            <div className="pag-btns">
              <button className="pag-btn" disabled={safePage === 0} onClick={() => setPage(current => Math.max(0, current - 1))}>
                <ChevronLeft size={13} /> {t("Sebelumnya", "Previous")}
              </button>
              <button className="pag-btn" disabled={safePage >= totalPages - 1} onClick={() => setPage(current => Math.min(totalPages - 1, current + 1))}>
                {t("Berikutnya", "Next")} <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});

export default DashboardProjectTable;
