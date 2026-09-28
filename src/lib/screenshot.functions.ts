import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { screenshotApiUrl } from "@/lib/screenshot";

// Cadangan kalau browser tidak boleh fetch langsung ke thum.io (CORS): server yang mengambilkan.
export const captureScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        url: z
          .string()
          .trim()
          .url("URL tidak valid")
          .refine((u) => /^https?:\/\//i.test(u), "URL harus diawali http:// atau https://"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40_000);
    try {
      const res = await fetch(screenshotApiUrl(data.url), { signal: controller.signal });
      if (!res.ok) throw new Error(`Layanan screenshot gagal (HTTP ${res.status}).`);
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) throw new Error("Layanan screenshot tidak mengembalikan gambar.");

      const bytes = new Uint8Array(await res.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return { contentType, base64: btoa(binary) };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("Screenshot terlalu lama. Coba lagi sebentar.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  });
