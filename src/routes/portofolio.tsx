import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout untuk /portofolio, /portofolio/playground, dan /portofolio/$slug.
// Tanpa <Outlet />, halaman anak tidak pernah dirender.
export const Route = createFileRoute("/portofolio")({
  component: PortofolioLayout,
});

function PortofolioLayout() {
  return <Outlet />;
}
