import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreatePollSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
  description: z.string().trim().max(500).nullable().optional(),
  closes_at: z.string().datetime({ offset: true }).nullable().optional(),
  options: z.array(z.string().trim().min(1).max(100)).min(2, "Minimal 2 pilihan").max(10),
});

// Semua voting + pilihan + suara milikmu sendiri + hasil (hasil hanya muncul kalau kamu sudah memilih,
// voting sudah ditutup, atau kamu admin; aturan ini dijaga di database).
export const listPolls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: polls, error } = await context.supabase
      .from("polls")
      .select("id, title, description, is_open, closes_at, created_at, poll_options(id, label, order_index)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: myVotes } = await context.supabase.from("poll_votes").select("poll_id, option_id");
    const myVoteByPoll = new Map((myVotes ?? []).map((v) => [v.poll_id, v.option_id]));
    const now = Date.now();

    return Promise.all(
      (polls ?? []).map(async (poll) => {
        const { data: rows } = await context.supabase.rpc("poll_results", { _poll_id: poll.id });
        const results =
          rows && rows.length > 0
            ? (Object.fromEntries(rows.map((r) => [r.option_id, Number(r.votes)])) as Record<string, number>)
            : null;

        return {
          id: poll.id,
          title: poll.title,
          description: poll.description,
          is_open: poll.is_open,
          closes_at: poll.closes_at,
          created_at: poll.created_at,
          closed: !poll.is_open || (poll.closes_at !== null && Date.parse(poll.closes_at) <= now),
          options: [...poll.poll_options].sort((a, b) => a.order_index - b.order_index),
          my_option_id: myVoteByPoll.get(poll.id) ?? null,
          results,
        };
      }),
    );
  });

export const castVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ poll_id: z.string().uuid(), option_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: studentId, error: idError } = await context.supabase.rpc("current_student_id");
    if (idError) throw new Error(idError.message);
    if (!studentId) throw new Error("Hanya siswa yang punya akun kelas yang bisa memberi suara.");

    const { error } = await context.supabase
      .from("poll_votes")
      .insert({ poll_id: data.poll_id, option_id: data.option_id, student_id: studentId });

    if (error) {
      if (error.code === "23505") throw new Error("Kamu sudah memberikan suara di voting ini.");
      throw new Error(error.message);
    }
    return { success: true };
  });

export const createPoll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreatePollSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: poll, error } = await context.supabase
      .from("polls")
      .insert({
        title: data.title,
        description: data.description || null,
        closes_at: data.closes_at || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: optionsError } = await context.supabase
      .from("poll_options")
      .insert(data.options.map((label, index) => ({ poll_id: poll.id, label, order_index: index })));

    if (optionsError) {
      await context.supabase.from("polls").delete().eq("id", poll.id);
      throw new Error(optionsError.message);
    }
    return { id: poll.id };
  });

export const setPollOpen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), is_open: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("polls").update({ is_open: data.is_open }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deletePoll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("polls").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
