import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Ringkasan", exact: true },
  { to: "/admin/siswa", label: "Siswa" },
  { to: "/admin/blog", label: "Blog" },
  { to: "/admin/organisasi", label: "Organisasi" },
];

function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard Admin</h1>
      <p className="mt-2 text-muted-foreground">Kelola data siswa, artikel blog, dan struktur organisasi.</p>

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-border pb-2">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeOptions={{ exact: tab.exact ?? false }}
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
