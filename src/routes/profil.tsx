import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil Kelas — X PPLG 3" },
      { name: "description", content: "Profil, visi, misi, dan motto kelas X PPLG 3." },
      { property: "og:title", content: "Profil Kelas — X PPLG 3" },
      { property: "og:description", content: "Profil, visi, misi, dan motto kelas X PPLG 3." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Profil Kelas</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Mengenal lebih dekat X PPLG 3, kelas PPLG yang penuh semangat berkarya.
        </p>
      </div>

      <div className="grid gap-x-8 gap-y-10 md:grid-cols-3">
        <div className="border-t-2 border-primary pt-4">
          <h2 className="font-display text-lg font-semibold">Visi</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Menjadi kelas yang unggul dalam bidang pengembangan perangkat lunak dan gim,
            serta membentuk siswa yang kreatif, inovatif, dan berakhlak mulia.
          </p>
        </div>

        <div className="border-t-2 border-primary pt-4">
          <h2 className="font-display text-lg font-semibold">Misi</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Menciptakan lingkungan belajar yang kolaboratif.</li>
            <li>Mengasah keterampilan coding dan desain.</li>
            <li>Menumbuhkan sikap profesional dan tanggung jawab.</li>
          </ul>
        </div>

        <div className="border-t-2 border-spark pt-4">
          <h2 className="font-display text-lg font-semibold">Motto</h2>
          <p className="mt-2 text-base font-medium text-foreground">"Code with Passion, Create with Purpose"</p>
          <p className="mt-2 text-sm text-muted-foreground">Kode dengan semangat, ciptakan dengan tujuan.</p>
        </div>
      </div>
    </div>
  );
}
