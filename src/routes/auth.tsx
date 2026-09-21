import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { loginIdentifierToEmail } from "@/lib/username";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login — X PPLG 3" },
      { name: "description", content: "Masuk ke website kelas X PPLG 3." },
      { property: "og:title", content: "Login — X PPLG 3" },
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !roleLoading) navigate({ to: isAdmin ? "/admin" : "/saran", replace: true });
  }, [user, isAdmin, roleLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginIdentifierToEmail(identifier),
      password,
    });
    setLoading(false);

    if (error) {
      toast.error("Gagal masuk: nama atau password salah.");
      return;
    }

    // Pengalihan halaman ditangani useEffect di atas setelah role selesai dicek.
    toast.success("Berhasil masuk.");
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Siswa masuk dengan nama lengkap dan password dari admin. Admin masuk dengan email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Belum punya akun? Minta ke admin kelas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
