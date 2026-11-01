import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { loginIdentifierToEmail } from "@/lib/username";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login | X PPLG 3" },
      { name: "description", content: "Masuk ke website kelas X PPLG 3." },
      { property: "og:title", content: "Login | X PPLG 3" },
      { property: "og:description", content: "Masuk ke website kelas X PPLG 3." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, isAdmin, roleLoading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (user && !roleLoading) navigate({ to: isAdmin ? "/admin" : "/saran", replace: true });
  }, [user, isAdmin, roleLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFailed(false);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginIdentifierToEmail(identifier),
      password,
    });
    setLoading(false);

    if (error) {
      // Pesan tetap di layar (toast hilang sendiri sebelum selesai dibaca) dan kolom ditandai.
      setFailed(true);
      return;
    }

    // Pengalihan halaman ditangani useEffect di atas setelah role selesai dicek.
    toast.success("Berhasil masuk.");
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 sm:py-20">
      <p className="font-mono text-sm text-muted-foreground">// masuk</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Masuk ke kelas</h1>
      <p className="mt-3 text-muted-foreground">
        Siswa masuk dengan nama lengkap dan password dari admin. Admin masuk dengan email.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {failed && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-foreground">
            Nama atau password salah. Cek huruf besar dan kecilnya, lalu coba lagi.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="identifier">Nama lengkap atau email</Label>
          <Input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            autoCapitalize="none"
            aria-invalid={failed || undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              aria-invalid={failed || undefined}
              className="pr-11"
            />
            {/* Di HP, mengetik password tanpa bisa melihatnya adalah sumber salah-ketik terbesar */}
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
          {loading ? "Memeriksa..." : "Masuk"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Belum punya akun atau lupa password? Minta ke admin kelas.
      </p>
    </div>
  );
}
