import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkNeedsSetup, setupFirstAdmin } from "@/lib/setup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Setup Admin — X PPLG 3" },
      { name: "description", content: "Buat akun admin pertama untuk website kelas X PPLG 3." },
      { property: "og:title", content: "Setup Admin — X PPLG 3" },
      { property: "og:description", content: "Buat akun admin pertama untuk website kelas X PPLG 3." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const check = useServerFn(checkNeedsSetup);
  const createAdmin = useServerFn(setupFirstAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["needs-setup"],
    queryFn: () => check(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createAdmin({ data: { email, password } });
      toast.success("Akun admin dibuat. Silakan masuk.");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat akun admin.");
      refetch();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Setup Akun Admin</CardTitle>
          <CardDescription>Buat satu akun admin pertama untuk mengelola website kelas.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : data?.needsSetup ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email admin</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (min. 6 karakter)</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Membuat akun..." : "Buat akun admin"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>Akun admin sudah ada. Silakan masuk menggunakan halaman login.</p>
              <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
                Ke halaman login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
