import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublishedPostBySlug } from "@/lib/posts.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export const Route = createFileRoute("/blog/$slug")({
  head: () => {
    const title = "Artikel — X PPLG 3";
    const description = "Baca artikel dari kelas X PPLG 3.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: async ({ params, context }) => {
    const data = await context.queryClient.fetchQuery({
      queryKey: ["post", params.slug],
      queryFn: async () => {
        const fn = (await import("@/lib/posts.functions")).getPublishedPostBySlug;
        return fn({ data: { slug: params.slug } });
      },
    });
    if (!data) throw notFound();
    return data;
  },
  component: BlogDetailPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Artikel tidak ditemukan</h1>
      <p className="mt-2 text-muted-foreground">Artikel yang kamu cari tidak tersedia.</p>
      <Button asChild className="mt-6">
        <Link to="/blog">Kembali ke blog</Link>
      </Button>
    </div>
  ),
});

function BlogDetailPage() {
  const { slug } = Route.useParams();
  const fetchPost = useServerFn(getPublishedPostBySlug);
  const { data: post, isLoading } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => fetchPost({ data: { slug } }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-8 w-3/4 rounded-md" />
        <Skeleton className="mb-8 h-4 w-1/3 rounded-md" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link to="/blog">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke blog
        </Link>
      </Button>

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{post.title}</h1>
      <p className="mt-4 font-mono text-xs text-muted-foreground">
        {post.created_at && format(new Date(post.created_at), "dd MMMM yyyy", { locale: id })}
      </p>

      {post.cover_image_url && (
        <div className="mt-8 overflow-hidden rounded-xl">
          <img src={post.cover_image_url} alt={post.title} className="w-full object-cover" />
        </div>
      )}

      <div
        className="prose prose-slate mt-8 max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
