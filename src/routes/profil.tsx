import { createFileRoute } from "@tanstack/react-router";
import { getSiteContent } from "@/lib/site-content.functions";
import { Reveal } from "@/components/reveal";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil Kelas — X PPLG 3" },
      { name: "description", content: "Profil, visi, misi, dan motto kelas X PPLG 3 SMKN 1 Leuwimunding." },
      { property: "og:title", content: "Profil Kelas — X PPLG 3" },
      { property: "og:description", content: "Profil, visi, misi, dan motto kelas X PPLG 3 SMKN 1 Leuwimunding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Isi visi/misi/motto diambil dari database supaya bisa diedit admin (fallback ke teks bawaan).
  loader: async () => {
    try {
      return await getSiteContent();
    } catch {
      return {} as Record<string, string>;
    }
  },
  component: ProfilPage,
});

const DEFAULTS = {
  visi: "Menjadi kelas yang unggul dalam bidang pengembangan perangkat lunak dan gim, serta membentuk siswa yang kreatif, inovatif, dan berakhlak mulia.",
  misi: "Menciptakan lingkungan belajar yang kolaboratif.\nMengasah keterampilan coding dan desain.\nMenumbuhkan sikap profesional dan tanggung jawab.",
  motto: "Code with Passion, Create with Purpose",
  motto_arti: "Kode dengan semangat, ciptakan dengan tujuan.",
};

function ProfilPage() {
  const content = Route.useLoaderData();

  const visi = content["visi"] ?? DEFAULTS.visi;
  const misi = (content["misi"] ?? DEFAULTS.misi)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const motto = content["motto"] ?? DEFAULTS.motto;
  const mottoArti = content["motto_arti"] ?? DEFAULTS.motto_arti;

  return (
    <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="mb-16 max-w-2xl">
        <p className="mb-3 font-mono text-sm text-muted-foreground">// tentang kami</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Profil Kelas</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Mengenal lebih dekat X PPLG 3 SMKN 1 Leuwimunding, kelas PPLG yang penuh semangat berkarya.
        </p>
      </Reveal>

      <div className="grid gap-x-8 gap-y-10 md:grid-cols-3">
        <Reveal className="border-t-2 border-primary pt-4">
          <h2 className="font-display text-lg font-semibold">Visi</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{visi}</p>
        </Reveal>

        <Reveal delay={90} className="border-t-2 border-primary pt-4">
          <h2 className="font-display text-lg font-semibold">Misi</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {misi.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={180} className="border-t-2 border-spark pt-4">
          <h2 className="font-display text-lg font-semibold">Motto</h2>
          <p className="mt-2 text-base font-medium text-foreground">"{motto}"</p>
          {mottoArti && <p className="mt-2 text-sm text-muted-foreground">{mottoArti}</p>}
        </Reveal>
      </div>
    </div>
  );
}
