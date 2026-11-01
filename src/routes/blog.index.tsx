import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublishedPosts } from "@/lib/posts.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state-notice";
import { ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Reveal } from "@/components/reveal";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog Kelas | X PPLG 3" },
      { name: "description", content: "Blog, pengumuman, dan dokumentasi kegiatan kelas X PPLG 3." },
      { property: "og:title", content: "Blog Kelas | X PPLG 3" },
      { property: "og:description", content: "Blog, pengumuman, dan dokumentasi kegiatan kelas X PPLG 3." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogPage,
});

type PostRow = {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
  created_at: string | null;
};

function PostDate({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <time dateTime={value} className="font-mono text-xs text-muted-foreground">
      {format(new Date(value), "dd MMM yyyy", { locale: id })}
    </time>
  );
}

// Seluruh kartu bisa diklik (bukan hanya judulnya): tautan judul diperluas lewat ::after.
// Cincin fokus dipasang di pembungkus supaya terlihat melingkupi seluruh artikel.
const ARTICLE_FOCUS = "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ring";

function FeaturedPost({ post }: { post: PostRow }) {
  return (
    <article className={`group relative grid gap-6 rounded-sm md:grid-cols-5 md:items-center md:gap-10 ${ARTICLE_FOCUS}`}>
      {post.cover_image_url && (
        <div className="aspect-video w-full overflow-hidden rounded-md bg-muted md:col-span-3">
          <img
            src={post.cover_image_url}
            alt=""
            width={960}
            height={540}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className={post.cover_image_url ? "md:col-span-2" : "md:col-span-5"}>
        <p className="font-mono text-xs text-muted-foreground">// terbaru</p>
        <div className="mt-2">
          <PostDate value={post.created_at} />
        </div>
        <h2 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          <Link to="/blog/$slug" params={{ slug: post.slug }} className="after:absolute after:inset-0 group-hover:text-primary focus-visible:outline-none">
            {post.title}
          </Link>
        </h2>
        <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          Baca artikel <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </p>
      </div>
    </article>
  );
}

function PostRowItem({ post }: { post: PostRow }) {
  return (
    <article className={`group relative flex items-start gap-4 rounded-sm border-b border-border py-5 ${ARTICLE_FOCUS}`}>
      {/* Slot gambar selalu ada supaya judul sejajar, ada atau tidak ada sampulnya */}
      <div
        className="flex h-[4.5rem] w-32 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted font-mono text-sm text-muted-foreground"
        aria-hidden="true"
      >
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt=""
            width={256}
            height={144}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          "//"
        )}
      </div>
      <div className="min-w-0">
        <PostDate value={post.created_at} />
        <h3 className="mt-1 font-display text-lg font-semibold leading-snug">
          <Link to="/blog/$slug" params={{ slug: post.slug }} className="after:absolute after:inset-0 group-hover:text-primary focus-visible:outline-none">
            {post.title}
          </Link>
        </h3>
      </div>
    </article>
  );
}

function BlogPage() {
  const fetchPosts = useServerFn(listPublishedPosts);
  const {
    data: posts,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["published-posts"],
    queryFn: () => fetchPosts(),
  });

  const [featured, ...rest] = (posts ?? []) as PostRow[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <Reveal className="mb-12 max-w-2xl">
        <p className="mb-3 font-mono text-sm text-muted-foreground">// dokumentasi kelas</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Blog Kelas</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Pengumuman, cerita, dan dokumentasi dari kelas X PPLG 3.
        </p>
      </Reveal>

      {isLoading ? (
        <div role="status" aria-label="Memuat artikel" className="space-y-6">
          <Skeleton className="aspect-[2/1] w-full rounded-md" />
          <Skeleton className="h-20 rounded-md" />
          <Skeleton className="h-20 rounded-md" />
        </div>
      ) : isError ? (
        <ErrorState title="Artikel belum bisa dimuat" retrying={isFetching} onRetry={() => void refetch()} />
      ) : featured ? (
        <Reveal>
          <FeaturedPost post={featured} />
          {rest.length > 0 && (
            <div className="mt-12 border-t border-border pt-2">
              <p className="mb-1 mt-4 font-mono text-xs text-muted-foreground">// sebelumnya</p>
              <div className="grid gap-x-10 md:grid-cols-2">
                {rest.map((post) => (
                  <PostRowItem key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}
        </Reveal>
      ) : (
        <EmptyState title="Belum ada artikel yang dipublikasikan">
          Pengumuman dan dokumentasi kegiatan kelas akan muncul di sini.
        </EmptyState>
      )}
    </div>
  );
}
