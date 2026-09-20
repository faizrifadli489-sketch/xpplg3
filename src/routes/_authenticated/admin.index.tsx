import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStudents } from "@/lib/students.functions";
import { listAllPosts } from "@/lib/posts.functions";
import { listOrgPositions } from "@/lib/org.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Network } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const fetchStudents = useServerFn(listStudents);
  const fetchPosts = useServerFn(listAllPosts);
  const fetchOrg = useServerFn(listOrgPositions);

  const students = useQuery({ queryKey: ["students"], queryFn: () => fetchStudents() });
  const posts = useQuery({ queryKey: ["admin-posts"], queryFn: () => fetchPosts() });
  const org = useQuery({ queryKey: ["org-positions"], queryFn: () => fetchOrg() });

  const cards = [
    { label: "Siswa", value: students.data?.length ?? 0, icon: Users, to: "/admin/siswa" },
    { label: "Artikel", value: posts.data?.length ?? 0, icon: FileText, to: "/admin/blog" },
    { label: "Jabatan Organisasi", value: org.data?.length ?? 0, icon: Network, to: "/admin/organisasi" },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.label} to={card.to}>
          <Card className="shadow-none transition-colors hover:border-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
