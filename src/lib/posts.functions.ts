import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ImageListSchema = z.array(z.string().url()).max(12, "Maksimal 12 foto galeri").optional();

const PostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
  cover_image_url: z.string().url().optional(),
  published: z.boolean().default(false),
  images: ImageListSchema,
});

const PostUpdateSchema = PostSchema.partial().extend({
  id: z.string().uuid(),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const listPublishedPosts = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerPublicClient } = await import("@/lib/supabase-public.server");
  const supabasePublic = createServerPublicClient();

  const { data, error } = await supabasePublic
    .from("posts")
    .select("id, title, slug, cover_image_url, published, created_at, updated_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
});

export const getPublishedPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { createServerPublicClient } = await import("@/lib/supabase-public.server");
    const supabasePublic = createServerPublicClient();

    const { data: post, error } = await supabasePublic
      .from("posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return post;
  });

export const listPostImages = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ post_id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { createServerPublicClient } = await import("@/lib/supabase-public.server");
    const supabasePublic = createServerPublicClient();

    const { data: images, error } = await supabasePublic
      .from("post_images")
      .select("id, image_url")
      .eq("post_id", data.post_id)
      .order("order_index", { ascending: true });

    if (error) throw new Error(error.message);
    return images ?? [];
  });

export const listAllPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  });

export const getPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: post, error } = await context.supabase.from("posts").select("*").eq("id", data.id).single();

    if (error) {
      throw new Error(error.message);
    }

    return post;
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => PostSchema.parse(data))
  .handler(async ({ data, context }) => {
    const slug = data.slug ? slugify(data.slug) : slugify(data.title);
    const { data: post, error } = await context.supabase
      .from("posts")
      .insert({
        title: data.title,
        slug,
        content: data.content,
        cover_image_url: data.cover_image_url ?? null,
        published: data.published,
        author_id: context.userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (data.images && data.images.length > 0) {
      const { error: imagesError } = await context.supabase
        .from("post_images")
        .insert(data.images.map((image_url, order_index) => ({ post_id: post.id, image_url, order_index })));
      if (imagesError) throw new Error(imagesError.message);
    }

    return post;
  });

export const updatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => PostUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const updateData: {
      title?: string;
      slug?: string;
      content?: string;
      cover_image_url?: string | null;
      published?: boolean;
    } = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.cover_image_url !== undefined) updateData.cover_image_url = data.cover_image_url || null;
    if (data.published !== undefined) updateData.published = data.published;
    if (data.slug !== undefined) updateData.slug = slugify(data.slug);

    const { data: post, error } = await context.supabase
      .from("posts")
      .update(updateData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Kalau field images dikirim, ganti seluruh isi galeri (hapus lama, pasang yang baru).
    if (data.images !== undefined) {
      const { error: deleteError } = await context.supabase.from("post_images").delete().eq("post_id", data.id);
      if (deleteError) throw new Error(deleteError.message);

      if (data.images.length > 0) {
        const { error: imagesError } = await context.supabase
          .from("post_images")
          .insert(data.images.map((image_url, order_index) => ({ post_id: data.id, image_url, order_index })));
        if (imagesError) throw new Error(imagesError.message);
      }
    }

    return post;
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("posts").delete().eq("id", data.id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  });
