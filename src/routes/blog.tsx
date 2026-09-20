import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublishedPosts } from "@/lib/posts.functions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog Kelas — X PPLG 3" },
      { name: "description", content: "Blog, pengumuman, dan dokumentasi kegiatan kelas X PPLG 3." },
      { property: "og:title", content: "Blog Kelas — X PPLG 3" },
      { property: "og:description", content: "Blog, pengumuman, dan dokumentasi kegiatan kelas X PPLG 3." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  const fetchPosts = useServerFn(listPublishedPosts);
  const { data: posts, isLoading } = useQuery({
    queryKey: ["published-posts"],
    queryFn: () => fetchPosts(),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Blog Kelas</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Pengumuman, cerita, dan dokumentasi dari kelas X PPLG 3.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <Card key={post.id} className="flex flex-col overflow-hidden rounded-lg shadow-none">
              {post.cover_image_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover" />
                </div>
              )}
              <CardHeader>
                <p className="font-mono text-xs text-muted-foreground">
                  {post.created_at && format(new Date(post.created_at), "dd MMM yyyy", { locale: id })}
                </p>
                <CardTitle className="font-display text-lg">
                  <Link to="/blog/$slug" params={{ slug: post.slug }} className="hover:text-primary">
                    {post.title}
                  </Link>
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Belum ada artikel yang dipublikasikan.</p>
      )}
    </div>
  );
}
