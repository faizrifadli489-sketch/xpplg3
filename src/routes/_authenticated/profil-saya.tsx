import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile, updateMyProfile, getMyQrText } from "@/lib/profile.functions";
import QRCode from "qrcode";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profil-saya")({
  head: () => ({
    meta: [{ title: "Profil Saya — X PPLG 3" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilSayaPage,
});

function MyQr() {
  const fetchQr = useServerFn(getMyQrText);
  const { data } = useQuery({ queryKey: ["my-qr"], queryFn: () => fetchQr() });
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!data?.text) return;
    // Pengaturan disamakan dengan QR asli: mode byte, koreksi Q, mask 7 (versi otomatis).
    QRCode.toDataURL([{ data: data.text, mode: "byte" }], {
      errorCorrectionLevel: "Q",
      maskPattern: 7,
      margin: 4,
      scale: 10,
    }).then(setSrc);
  }, [data?.text]);

  if (!data?.text) return null;
  return (
    <div className="mt-10 rounded-lg border border-border p-5 text-center">
      <h2 className="font-semibold">QR Saya</h2>
      <p className="mt-1 text-xs text-muted-foreground">Hanya kamu yang bisa melihat QR ini.</p>
      {src && <img src={src} alt="QR siswa" className="mx-auto mt-4 w-56 rounded-md bg-white" />}
      {src && (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <a href={src} download="qr-saya.png">Unduh</a>
        </Button>
      )}
    </div>
  );
}

function ProfilSayaPage() {
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const save = useServerFn(updateMyProfile);

  const { data: profile, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });

  const [nickname, setNickname] = useState("");
  const [photo, setPhoto] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Isi form sekali saat data profil pertama kali tiba.
  useEffect(() => {
    if (profile && loadedFor !== profile.id) {
      setNickname(profile.nickname ?? "");
      setPhoto(profile.photo_url ?? "");
      setLoadedFor(profile.id);
    }
  }, [profile, loadedFor]);

  const mutation = useMutation({
    mutationFn: () => save({ data: { nickname: nickname || null, photo_url: photo || null } }),
    onSuccess: () => {
      toast.success("Profil diperbarui.");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan profil."),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Profil Saya</h1>
        <p className="mt-4 text-muted-foreground">Halaman ini hanya untuk siswa yang punya akun kelas.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Profil Saya</h1>
      <p className="mt-3 text-muted-foreground">
        Ganti foto dan nama panggilanmu sendiri. Perubahan langsung tampil di halaman Siswa.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label>Nama lengkap</Label>
          <Input value={profile.full_name} disabled />
          <p className="text-xs text-muted-foreground">
            Nama lengkap hanya bisa diubah admin.
            {profile.username ? ` Login kamu: ${profile.username}` : ""}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nickname">Nama panggilan</Label>
          <Input
            id="nickname"
            maxLength={30}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <ImageUpload
          value={photo}
          onChange={setPhoto}
          onUploadingChange={setUploading}
          folder={`profiles/${profile.id}`}
          label="Foto profil"
        />

        <Button type="submit" disabled={mutation.isPending || uploading}>
          {mutation.isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </form>

      <MyQr />
    </div>
  );
}
