import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { PwaInstallButton } from "@/components/pwa-install";
import { OfflineBanner } from "@/components/offline-banner";
import { AiChat } from "@/components/ai-chat";
import { registerServiceWorker } from "@/lib/register-sw";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { ChangePasswordButton } from "@/components/change-password-button";
import { UserMenu } from "@/components/user-menu";
import { ArrowRight, Menu, Settings, X } from "lucide-react";
import { useState } from "react";

// Halaman-halaman publik, dipakai bersama oleh navigasi, footer, dan halaman 404.
const PUBLIC_LINKS = [
  { to: "/", label: "Beranda" },
  { to: "/jadwal", label: "Jadwal" },
  { to: "/profil", label: "Profil" },
  { to: "/siswa", label: "Siswa" },
  { to: "/acak", label: "Acak" },
  { to: "/blog", label: "Blog" },
  { to: "/organisasi", label: "Organisasi" },
  { to: "/portofolio", label: "Portofolio" },
];

function NotFoundComponent() {
  // Sudah di dalam header + footer, jadi tinggi minimumnya bukan 100vh (itu bikin selalu ada scroll).
  const suggestions = [
    { to: "/", file: "beranda.tsx" },
    { to: "/jadwal", file: "jadwal.tsx" },
    { to: "/siswa", file: "siswa.tsx" },
    { to: "/blog", file: "blog.tsx" },
  ];
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
      <p className="font-mono text-sm text-muted-foreground">// error 404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Halaman tidak ditemukan</h1>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">
        Alamat ini tidak ada atau sudah dipindahkan. Coba salah satu halaman di bawah.
      </p>
      <ul className="mt-8 max-w-sm divide-y divide-border border-y border-border font-mono text-sm">
        {suggestions.map((s) => (
          <li key={s.to}>
            <Link to={s.to} className="group flex items-center justify-between py-3 hover:text-primary">
              <span>{s.file}</span>
              <ArrowRight
                className="h-4 w-4 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
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
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
      <p className="font-mono text-sm text-muted-foreground">// terjadi kesalahan</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Halaman ini tidak bisa dimuat
      </h1>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">
        Ada gangguan di server. Coba muat ulang, atau kembali ke beranda dan buka halamannya lagi.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Coba lagi
        </Button>
        <Button asChild variant="outline">
          <a href="/">Kembali ke beranda</a>
        </Button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "X PPLG 3 | SMKN 1 Leuwimunding" },
      { name: "description", content: "Website resmi kelas X PPLG 3 SMKN 1 Leuwimunding: jadwal, daftar siswa, blog, dan struktur organisasi." },
      { name: "author", content: "X PPLG 3" },
      { property: "og:title", content: "X PPLG 3 | SMKN 1 Leuwimunding" },
      { property: "og:description", content: "Website resmi kelas X PPLG 3 SMKN 1 Leuwimunding: jadwal, daftar siswa, blog, dan struktur organisasi." },
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
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Kunci "xpplg3-theme" harus sama dengan hooks/use-theme.tsx, dan "xpplg3-prefs" dengan lib/preferences.ts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('xpplg3-theme');var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(d)r.classList.add('dark');}catch(e){}try{var p=JSON.parse(localStorage.getItem('xpplg3-prefs')||'{}');if([90,112,125].indexOf(p.fontScale)>-1)document.documentElement.style.fontSize=p.fontScale+'%';if(p.reduceMotion===true)document.documentElement.classList.add('reduce-motion');if(['brutal','glass','neu','cyber','retro'].indexOf(p.uiStyle)>-1)document.documentElement.setAttribute('data-style',p.uiStyle);}catch(e){}})();`,
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
            {/* Pengguna keyboard dan pembaca layar bisa melewati 8 tautan navigasi di setiap halaman */}
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
            >
              Lewati ke konten
            </a>
            <OfflineBanner />
            <Header />
            <main id="main" tabIndex={-1} className="flex-1">
              <Outlet />
            </main>
            <Footer />
          </div>
          <Toaster />
          <PwaInstallButton />
          <AiChat />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function MenuLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mb-2 font-mono text-xs text-muted-foreground ${className}`}>{children}</p>;
}

function Header() {
  const { user, canAccessDashboard, studentId } = useAuth();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  // Menu mobile menutup sendiri saat pindah halaman (termasuk tombol back) dan saat menekan Esc.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const studentLinks = [
    { to: "/profil-saya", label: "Profil Saya" },
    { to: "/saran", label: "Kotak Saran" },
    { to: "/voting", label: "Voting Kelas" },
    { to: "/kas", label: "Kas Kelas" },
  ] as const;

  const close = () => setOpen(false);
  const mobileLinkClass =
    "flex h-12 items-center border-b border-border text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-3 rounded-md"
          aria-label="X PPLG 3, SMKN 1 Leuwimunding. Ke beranda"
        >
          {/* Monogram yang sama dengan ikon aplikasi (navy + teal), jadi header dan ikon di layar utama satu identitas */}
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-md bg-[#141824] font-mono text-[13px] font-medium tracking-tight text-[#2fb6a3] ring-1 ring-inset ring-white/10"
          >
            X3
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold tracking-tight text-foreground">X PPLG 3</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              SMKN 1 Leuwimunding
            </span>
          </span>
        </Link>

        {/* Muncul dari lebar 1024px (sebelumnya 1280px, jadi tablet dan laptop kecil dapat menu hamburger tanpa perlu) */}
        <nav aria-label="Menu utama" className="hidden h-full items-stretch gap-4 lg:flex xl:gap-6">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              className="inline-flex items-center border-b-2 border-transparent text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "border-primary text-foreground" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 lg:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon" title="Pengaturan">
            <Link to="/pengaturan" aria-label="Pengaturan">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          {user ? (
            <>
              {canAccessDashboard && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">Dashboard</Link>
                </Button>
              )}
              <UserMenu isStudent={!!studentId} />
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Login</Link>
            </Button>
          )}
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        // Bisa digulir: dulu daftar 17 tautan tidak muat di HP pendek dan tombol Logout tidak bisa dijangkau.
        <div
          id="mobile-menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-border px-4 pb-8 pt-5 lg:hidden"
        >
          <MenuLabel>// halaman</MenuLabel>
          <nav aria-label="Menu utama" className="grid grid-cols-2 gap-x-6 border-t border-border">
            {PUBLIC_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={close}
                activeOptions={{ exact: link.to === "/" }}
                className={mobileLinkClass}
                activeProps={{ className: "font-semibold text-primary" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <MenuLabel className="mt-6">// tampilan</MenuLabel>
          <div className="grid grid-cols-2 gap-3">
            <ThemeToggle mobile />
            <Button asChild variant="outline" className="justify-start px-3">
              <Link to="/pengaturan" onClick={close}>
                <Settings className="h-4 w-4" />
                Pengaturan
              </Link>
            </Button>
          </div>

          <MenuLabel className="mt-6">// akun</MenuLabel>
          {user ? (
            <div className="space-y-4">
              {canAccessDashboard && (
                <Button asChild className="w-full justify-start px-3">
                  <Link to="/admin" onClick={close}>
                    Dashboard admin
                  </Link>
                </Button>
              )}
              {studentId && (
                <nav aria-label="Menu siswa" className="grid grid-cols-2 gap-x-6 border-t border-border">
                  {studentLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={close}
                      className={mobileLinkClass}
                      activeProps={{ className: "font-semibold text-primary" }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              )}
              <div className="grid grid-cols-2 gap-3">
                <ChangePasswordButton mobile />
                <LogoutButton onDone={close} />
              </div>
            </div>
          ) : (
            <Button asChild className="w-full">
              <Link to="/auth" onClick={close}>
                Login
              </Link>
            </Button>
          )}
        </div>
      )}
    </header>
  );
}

function LogoutButton({ onDone }: { onDone?: () => void }) {
  const { signOut } = useAuth();

  return (
    <Button
      variant="outline"
      className="justify-start px-3"
      onClick={() => {
        onDone?.();
        void signOut();
      }}
    >
      Logout
    </Button>
  );
}

function Footer() {
  const footerLinks = [
    { to: "/jadwal", label: "jadwal" },
    { to: "/blog", label: "blog" },
    { to: "/portofolio", label: "portofolio" },
    { to: "/pengaturan", label: "pengaturan" },
  ];
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-display text-sm font-semibold tracking-tight">X PPLG 3</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            SMKN 1 Leuwimunding. Program Keahlian Pengembangan Perangkat Lunak dan Gim.
          </p>
        </div>
        <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs">
          {footerLinks.map((link) => (
            <Link key={link.to} to={link.to} className="text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-4 font-mono text-xs text-muted-foreground sm:px-6 lg:px-8">
          © {new Date().getFullYear()} X PPLG 3. Dibuat oleh siswa kelas.
        </p>
      </div>
    </footer>
  );
}
