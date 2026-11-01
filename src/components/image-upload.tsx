import { useRef, useState } from "react";
import { Crop, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { AspectKey } from "@/lib/image-crop";

const BUCKET = "photos";
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_DIMENSION = 1024;

// Perkecil + kompres di browser supaya foto HP (3-8 MB) jadi ~100-300 KB.
export async function resizeToJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal memproses gambar."))),
      "image/jpeg",
      0.85,
    );
  });
}

/**
 * Unggah gambar ke bucket "photos" dan kembalikan URL publik.
 * `processed` = gambar sudah JPEG hasil editor potong, jadi tidak perlu dikompres ulang.
 */
export async function uploadImageBlob(file: Blob, folder: string, processed = false): Promise<string> {
  const blob = processed ? file : await resizeToJpeg(file);
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

type ImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label?: string;
  onUploadingChange?: (uploading: boolean) => void;
  /** Pilihan rasio di editor potong. Bawaan: 1:1 dikunci (cocok untuk foto profil). */
  cropAspects?: AspectKey[];
  cropDefault?: AspectKey;
  /** Sisi terpanjang hasil potong (px). */
  cropMaxSize?: number;
};

export function ImageUpload({
  value,
  onChange,
  folder,
  label = "Foto",
  onUploadingChange,
  cropAspects = ["1:1"],
  cropDefault,
  cropMaxSize = 800,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [source, setSource] = useState<Blob | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const setBusy = (busy: boolean) => {
    setUploading(busy);
    onUploadingChange?.(busy);
  };

  const handleFile = (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast.error("Ukuran file maksimal 15 MB.");
      return;
    }
    setSource(file); // buka editor potong dulu, baru diunggah
  };

  // Potong ulang foto yang sudah ada.
  const editExisting = async () => {
    if (!value) return;
    setLoadingExisting(true);
    try {
      const res = await fetch(value);
      if (!res.ok) throw new Error("fetch gagal");
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error("bukan gambar");
      setSource(blob);
    } catch {
      toast.error("Foto ini tidak bisa dibuka untuk diedit. Pilih foto baru saja.");
    } finally {
      setLoadingExisting(false);
    }
  };

  const confirmCrop = async (blob: Blob) => {
    setBusy(true);
    try {
      onChange(await uploadImageBlob(blob, folder, true));
      toast.success("Foto berhasil diunggah.");
      setSource(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
          {value ? (
            <img src={value} alt="Pratinjau foto" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-1 h-4 w-4" />
            )}
            {uploading ? "Mengunggah..." : value ? "Ganti foto" : "Pilih foto"}
          </Button>
          {value && !uploading && (
            <Button type="button" variant="outline" size="sm" disabled={loadingExisting} onClick={() => void editExisting()}>
              {loadingExisting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Crop className="mr-1 h-4 w-4" />}
              Potong
            </Button>
          )}
          {value && !uploading && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <Trash2 className="mr-1 h-4 w-4 text-destructive" />
              Hapus
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">
        JPG, PNG, atau WebP. Kamu bisa memotong dan memutar foto sebelum diunggah.
      </p>

      <ImageCropDialog
        file={source}
        title={label}
        aspects={cropAspects}
        defaultAspect={cropDefault}
        maxSize={cropMaxSize}
        onCancel={() => setSource(null)}
        onConfirm={confirmCrop}
      />
    </div>
  );
}
