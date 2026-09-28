import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { PwaInstallButton } from "@/components/pwa-install";
import { OfflineBanner } from "@/components/offline-banner";
import { registerServiceWorker } from "@/lib/register-sw";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { ChangePasswordButton } from "@/components/change-password-button";
import { UserMenu } from "@/components/user-menu";
import { Menu, X } from "lucide-react";
import { useState } from "react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Halaman ini tidak bisa dimuat
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Terjadi kesalahan di server. Kamu bisa mencoba refresh atau kembali ke beranda.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Coba lagi
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Kembali ke beranda
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "X PPLG 3 — SMKN 1 Leuwimunding" },
      { name: "description", content: "Website resmi kelas X PPLG 3 SMKN 1 Leuwimunding — daftar siswa, blog, dan struktur organisasi." },
      { name: "author", content: "X PPLG 3" },
      { property: "og:title", content: "X PPLG 3 — SMKN 1 Leuwimunding" },
      { property: "og:description", content: "Website resmi kelas X PPLG 3 SMKN 1 Leuwimunding — daftar siswa, blog, dan struktur organisasi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@xpplg3" },
      { name: "theme-color", content: "#12786b" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "X PPLG 3" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        {/* Kunci "xpplg3-theme" ini harus sama persis dengan hooks/use-theme.tsx */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("xpplg3-theme");var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <OfflineBanner />
            <Header />
            <main className="flex-1">
              <Outlet />
            </main>
            <Footer />
          </div>
          <Toaster />
          <PwaInstallButton />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function Header() {
  const { user, isAdmin, studentId } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: "Beranda" },
    { to: "/jadwal", label: "Jadwal" },
    { to: "/profil", label: "Profil" },
    { to: "/siswa", label: "Siswa" },
    { to: "/blog", label: "Blog" },
    { to: "/organisasi", label: "Organisasi" },
    { to: "/portofolio", label: "Portofolio" },
  ];

  const studentLinks = [
    { to: "/profil-saya", label: "Profil Saya" },
    { to: "/saran", label: "Kotak Saran" },
    { to: "/voting", label: "Voting Kelas" },
    { to: "/kas", label: "Kas Kelas" },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-spark" aria-hidden="true" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold tracking-tight text-foreground">
              X PPLG 3
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              SMKN 1 Leuwimunding
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="border-b-2 border-transparent py-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "border-primary text-foreground" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">Dashboard</Link>
                </Button>
              )}
              <UserMenu isStudent={!!studentId} />
              <LogoutButton />
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Login</Link>
            </Button>
          )}
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-md md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-2 md:hidden">
          <nav className="flex flex-col">
            <div className="border-l-2 border-transparent px-1 py-1">
              <ThemeToggle mobile />
            </div>
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="border-l-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                activeProps={{ className: "border-primary text-foreground" }}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="border-l-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                )}
                {studentId &&
                  studentLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className="border-l-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                <ChangePasswordButton mobile />
                <LogoutButton mobile />
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="border-l-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function LogoutButton({ mobile = false }: { mobile?: boolean }) {
  const { signOut } = useAuth();

  return (
    <Button variant="ghost" size="sm" onClick={signOut} className={mobile ? "justify-start px-3" : ""}>
      Logout
    </Button>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 font-mono text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} X PPLG 3 SMKN 1 Leuwimunding, dibuat oleh siswa kelas</p>
        <p>Program Keahlian PPLG</p>
      </div>
    </footer>
  );
}
