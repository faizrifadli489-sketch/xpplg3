import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "bendahara" | "sekretaris";

// Halaman admin yang boleh diakses role selain admin. Halaman lain (siswa, organisasi,
// portofolio, jadwal, saran, voting, profil, ringkasan) tetap khusus admin.
const ROUTE_ROLES: Record<string, AppRole[]> = {
  "/admin/kas": ["admin", "bendahara"],
  "/admin/blog": ["admin", "sekretaris"],
  "/admin/acara": ["admin", "sekretaris"],
};

function firstAllowedPath(roles: Set<AppRole>): string {
  if (roles.has("admin")) return "/admin";
  if (roles.has("sekretaris")) return "/admin/blog";
  if (roles.has("bendahara")) return "/admin/kas";
  return "/";
}

export const Route = createFileRoute("/_authenticated/admin")({
  // Akun siswa biasa tidak boleh membuka dashboard admin sama sekali.
  // Akun dengan role bendahara/sekretaris hanya boleh membuka halaman sesuai rolenya.
  beforeLoad: async ({ context, location }) => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (error) throw redirect({ to: "/" });

    const roles = new Set((data ?? []).map((r) => r.role as AppRole));
    if (roles.size === 0) throw redirect({ to: "/" });

    const allowed = ROUTE_ROLES[location.pathname] ?? ["admin"];
    const canAccess = allowed.some((role) => roles.has(role));
    if (!canAccess) throw redirect({ to: firstAllowedPath(roles) });

    return { roles };
  },
  component: AdminLayout,
});

const ALL_TABS: { to: string; label: string; exact?: boolean; roles: AppRole[] }[] = [
  { to: "/admin", label: "Ringkasan", exact: true, roles: ["admin"] },
  { to: "/admin/siswa", label: "Siswa", roles: ["admin"] },
  { to: "/admin/blog", label: "Blog", roles: ["admin", "sekretaris"] },
  { to: "/admin/organisasi", label: "Organisasi", roles: ["admin"] },
  { to: "/admin/portofolio", label: "Portofolio", roles: ["admin"] },
  { to: "/admin/jadwal", label: "Jadwal", roles: ["admin"] },
  { to: "/admin/acara", label: "Acara", roles: ["admin", "sekretaris"] },
  { to: "/admin/saran", label: "Saran", roles: ["admin"] },
  { to: "/admin/voting", label: "Voting", roles: ["admin"] },
  { to: "/admin/kas", label: "Kas", roles: ["admin", "bendahara"] },
  { to: "/admin/profil", label: "Profil Kelas", roles: ["admin"] },
];

function AdminLayout() {
  const { roles } = Route.useRouteContext();
  const tabs = ALL_TABS.filter((tab) => tab.roles.some((role) => roles.has(role)));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard Admin</h1>
      <p className="mt-2 text-muted-foreground">
        Kelola siswa dan akun, blog, organisasi, jadwal, acara, kotak saran, voting, kas, portofolio, dan profil
        kelas.
      </p>

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
