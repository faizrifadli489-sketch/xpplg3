import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout untuk /blog dan /blog/$slug. Tanpa <Outlet />, halaman artikel
// tidak pernah dirender karena route-nya anak dari /blog.
export const Route = createFileRoute("/blog")({
  component: BlogLayout,
});

function BlogLayout() {
  return <Outlet />;
}
