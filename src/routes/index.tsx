import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Network, ArrowRight } from "lucide-react";
import { TodayPanel } from "@/components/class-widgets";
import { Reveal } from "@/components/reveal";
import { TypewriterHeading } from "@/components/typewriter-heading";
import { listHeroTaglines } from "@/lib/hero-taglines.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beranda — X PPLG 3" },
      { name: "description", content: "Website resmi kelas X PPLG 3 SMKN 1 Leuwimunding. Lihat profil kelas, daftar siswa, blog, dan struktur organisasi." },
      { property: "og:title", content: "Beranda — X PPLG 3" },
      { property: "og:description", content: "Website resmi kelas X PPLG 3 SMKN 1 Leuwimunding. Lihat profil kelas, daftar siswa, blog, dan struktur organisasi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Kalimat judul hero diambil dari database supaya bisa diatur admin (fallback ke daftar kosong -> "Kelas X PPLG 3").
  loader: async () => {
    try {
      return await listHeroTaglines();
    } catch {
      return [];
    }
  },
  component: HomePage,
});

const routeFiles = [
  { to: "/profil", file: "profil.tsx" },
  { to: "/siswa", file: "siswa.tsx" },
  { to: "/blog", file: "blog.tsx" },
  { to: "/organisasi", file: "organisasi.tsx" },
] as const;

const sections = [
  {
    to: "/siswa",
    icon: Users,
    title: "Daftar Siswa",
    description: "Kenali anggota kelas X PPLG 3 dan biodata singkatnya.",
  },
  {
    to: "/blog",
    icon: BookOpen,
    title: "Blog Kelas",
    description: "Pengumuman, dokumentasi kegiatan, dan hasil karya kami.",
  },
  {
    to: "/organisasi",
    icon: Network,
    title: "Struktur Organisasi",
    description: "Susunan pengurus kelas dan pembagian tugasnya.",
  },
] as const;

function HomePage() {
  const taglines = Route.useLoaderData().map((t) => t.text);

  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="flex flex-col items-start gap-14 lg:flex-row lg:items-center lg:justify-between">
            <Reveal className="max-w-xl">
              <p className="mb-4 font-mono text-sm text-primary-foreground/55">// SMKN 1 Leuwimunding</p>
              <TypewriterHeading
                phrases={taglines}
                className="font-display text-5xl font-semibold tracking-tight sm:text-6xl"
              />
              <p className="mt-6 max-w-md text-base text-primary-foreground/80 sm:text-lg">
                Pengembangan Perangkat Lunak dan Gim. Belajar menulis kode, merancang gim, dan
                membangun proyek nyata bersama satu kelas.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-spark text-spark-foreground hover:bg-spark/90">
                  <Link to="/siswa">
                    Lihat Daftar Siswa <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Link to="/blog">Baca Blog</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal
              delay={150}
              className="hidden w-72 shrink-0 rounded-lg border border-primary-foreground/15 bg-primary-foreground/[0.06] p-4 lg:block"
            >
              <p className="mb-2 px-2 font-mono text-xs text-primary-foreground/45">src/routes</p>
              <div className="space-y-0.5">
                {routeFiles.map((route) => (
                  <Link
                    key={route.to}
                    to={route.to}
                    className="group flex items-center justify-between rounded-md px-2 py-2 font-mono text-sm text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  >
                    <span>{route.file}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6 lg:px-8">
        <Reveal>
          <TodayPanel />
        </Reveal>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="border-y border-border">
          {sections.map((section, index) => (
            <Reveal key={section.to} delay={index * 90} className="border-b border-border last:border-b-0">
              <Link
                to={section.to}
                className="group flex items-center gap-5 py-6 transition-colors hover:bg-muted/40"
              >
                <section.icon className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-semibold">{section.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
