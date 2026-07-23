import { lazy, Suspense, useEffect } from "react";
import ErrorBoundary from "../ErrorBoundary";
import { APP_COLORS } from "../styles/theme";

const CoverageDashboard = lazy(() => import("../CoverageDashboard"));
const ProjectDetailPage = lazy(() => import("../ProjectDetailPage"));
const CalendarPage = lazy(() => import("../CalendarPage"));

export default function AppRoutes({
  page,
  lang,
  videoData,
  detailId,
  onOpenDetail,
  onMobileDetailChange,
}) {
  // Prefetch chunk halaman lain saat idle — pindah tab pertama kali jadi
  // instan (tanpa nunggu network), tidak mengganggu render awal.
  useEffect(() => {
    const preload = () => {
      import("../ProjectDetailPage");
      import("../CoverageAreaMap");
      import("../CalendarPage");
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(preload, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(preload, 1200);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <ErrorBoundary key={page}>
      <Suspense fallback={<div style={{ minHeight:"100vh", background:APP_COLORS.bg }} />}>
        {page === "highlight" && (
          <CoverageDashboard
            lang={lang}
            data={videoData}
            onOpenDetail={onOpenDetail}
          />
        )}
        {page === "detail" && (
          <ProjectDetailPage
            lang={lang}
            data={videoData}
            initialId={detailId}
            onMobileDetailChange={onMobileDetailChange}
          />
        )}
        {page === "calendar" && <CalendarPage />}
      </Suspense>
    </ErrorBoundary>
  );
}
