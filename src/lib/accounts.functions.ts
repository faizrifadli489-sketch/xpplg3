import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { slugifyName, usernameToEmail } from "@/lib/username";

// Semua fungsi di sini butuh SUPABASE_SERVICE_ROLE_KEY di server (Vercel env),
// karena membuat user Auth hanya bisa lewat admin API.

const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePassword(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join("");
}

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Hanya admin yang boleh mengelola akun siswa.");
}

async function getAdminClient() {
  if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum di-set di Vercel (Settings > Environment Variables). Isi dulu, lalu Redeploy.",
    );
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type AdminClient = Awaited<ReturnType<typeof getAdminClient>>;
type StudentRef = { id: string; full_name: string };
type Credentials = { student_id: string; full_name: string; username: string; password: string };

function pickUsername(fullName: string, taken: Set<string>): string {
  const base = slugifyName(fullName) || "siswa";
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

async function createAccountFor(admin: AdminClient, student: StudentRef, username: string, password: string) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { student_id: student.id, full_name: student.full_name },
  });

  if (error || !created.user) {
    throw new Error(`Gagal membuat akun ${student.full_name}: ${error?.message ?? "tidak diketahui"}`);
  }

  const { error: insertError } = await admin
    .from("student_accounts")
    .insert({ student_id: student.id, user_id: created.user.id, username });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(`Gagal menyimpan akun ${student.full_name}: ${insertError.message}`);
  }
}

export const listStudentAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data, error } = await context.supabase
      .from("student_accounts")
      .select("student_id, user_id, username");
    if (error) throw new Error(error.message);

    const userIds = (data ?? []).map((a) => a.user_id);
    const rolesByUser = new Map<string, ("bendahara" | "sekretaris")[]>();
    if (userIds.length > 0) {
      const { data: roleRows, error: roleError } = await context.supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds)
        .in("role", ["bendahara", "sekretaris"]);
      if (roleError) throw new Error(roleError.message);

      for (const r of roleRows ?? []) {
        const role = r.role as "bendahara" | "sekretaris";
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(role);
        rolesByUser.set(r.user_id, list);
      }
    }

    return (data ?? []).map((a) => ({ ...a, roles: rolesByUser.get(a.user_id) ?? [] }));
  });

const AssignableRole = z.enum(["bendahara", "sekretaris"]);

// Admin memberi/mencabut role bendahara atau sekretaris untuk sebuah akun siswa.
// Role "admin" sengaja tidak bisa diberikan lewat sini (hanya lewat setup awal).
export const setAccountRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ user_id: z.string().uuid(), role: AssignableRole, enabled: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    if (data.enabled) {
      const { error } = await context.supabase
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { success: true };
  });

export const createStudentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ student_id: z.string().uuid(), password: z.string().min(6).max(72).optional() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<Credentials> => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const { data: student, error: studentError } = await admin
      .from("students")
      .select("id, full_name")
      .eq("id", data.student_id)
      .single();
    if (studentError || !student) throw new Error("Siswa tidak ditemukan.");

    const { data: existing } = await admin
      .from("student_accounts")
      .select("student_id")
      .eq("student_id", student.id)
      .maybeSingle();
    if (existing) throw new Error("Siswa ini sudah punya akun.");

    const { data: rows } = await admin.from("student_accounts").select("username");
    const taken = new Set((rows ?? []).map((r) => r.username));

    const username = pickUsername(student.full_name, taken);
    const password = data.password ?? generatePassword();
    await createAccountFor(admin, student, username, password);

    return { student_id: student.id, full_name: student.full_name, username, password };
  });

export const createAllStudentAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const { data: students, error: studentsError } = await admin
      .from("students")
      .select("id, full_name")
      .order("full_name", { ascending: true });
    if (studentsError) throw new Error(studentsError.message);

    const { data: accounts } = await admin.from("student_accounts").select("student_id, username");
    const haveAccount = new Set((accounts ?? []).map((a) => a.student_id));
    const taken = new Set((accounts ?? []).map((a) => a.username));

    const plan = (students ?? [])
      .filter((s) => !haveAccount.has(s.id))
      .map((student) => {
        const username = pickUsername(student.full_name, taken);
        taken.add(username);
        return { student, username, password: generatePassword() };
      });

    const created: Credentials[] = [];
    const failed: { full_name: string; error: string }[] = [];

    for (let i = 0; i < plan.length; i += 5) {
      const chunk = plan.slice(i, i + 5);
      const results = await Promise.allSettled(
        chunk.map((p) => createAccountFor(admin, p.student, p.username, p.password)),
      );
      results.forEach((result, index) => {
        const item = chunk[index]!;
        if (result.status === "fulfilled") {
          created.push({
            student_id: item.student.id,
            full_name: item.student.full_name,
            username: item.username,
            password: item.password,
          });
        } else {
          failed.push({
            full_name: item.student.full_name,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      });
    }

    return { created, failed };
  });

export const resetStudentPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ student_id: z.string().uuid(), password: z.string().min(6).max(72).optional() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<Credentials> => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const { data: account } = await admin
      .from("student_accounts")
      .select("user_id, username, students(full_name)")
      .eq("student_id", data.student_id)
      .maybeSingle();
    if (!account) throw new Error("Siswa ini belum punya akun.");

    const password = data.password ?? generatePassword();
    const { error } = await admin.auth.admin.updateUserById(account.user_id, { password });
    if (error) throw new Error(error.message);

    return {
      student_id: data.student_id,
      full_name: account.students?.full_name ?? account.username,
      username: account.username,
      password,
    };
  });

export const deleteStudentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ student_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();

    const { data: account } = await admin
      .from("student_accounts")
      .select("user_id")
      .eq("student_id", data.student_id)
      .maybeSingle();
    if (!account) throw new Error("Siswa ini belum punya akun.");

    // Menghapus user Auth ikut menghapus baris student_accounts (ON DELETE CASCADE).
    const { error } = await admin.auth.admin.deleteUser(account.user_id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
