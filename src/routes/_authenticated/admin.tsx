import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  // Akun siswa boleh login, tapi tidak boleh membuka dashboard admin.
  beforeLoad: async ({ context }) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Ringkasan", exact: true },
  { to: "/admin/siswa", label: "Siswa" },
  { to: "/admin/blog", label: "Blog" },
  { to: "/admin/organisasi", label: "Organisasi" },
  { to: "/admin/jadwal", label: "Jadwal" },
  { to: "/admin/acara", label: "Acara" },
  { to: "/admin/saran", label: "Saran" },
];

function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard Admin</h1>
      <p className="mt-2 text-muted-foreground">Kelola siswa dan akun, blog, organisasi, jadwal, acara, dan kotak saran.</p>

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
