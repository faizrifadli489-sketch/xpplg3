import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login Admin — X PPLG 3" },
      { name: "description", content: "Masuk ke dashboard admin kelas X PPLG 3." },
      { property: "og:title", content: "Login Admin — X PPLG 3" },
      { property: "og:description", content: "Masuk ke dashboard admin kelas X PPLG 3." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/admin", replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error("Gagal masuk: " + error.message);
      return;
    }

    toast.success("Berhasil masuk.");
    navigate({ to: "/admin", replace: true });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Login Admin</CardTitle>
          <CardDescription>Masuk untuk mengelola konten kelas X PPLG 3.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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
            Belum punya akun admin?{" "}
            <Link to="/setup" className="font-medium text-primary hover:underline">
              Buat akun admin pertama
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
