import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Amount = z.number().int().min(1, "Nominal minimal Rp 1").max(100_000_000);
const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid");

const DueSchema = z.object({
  title: z.string().trim().min(1).max(100),
  amount: Amount,
  due_date: DateStr.nullable().optional(),
});

const ExpenseSchema = z.object({
  spent_on: DateStr,
  description: z.string().trim().min(1).max(200),
  amount: Amount,
});

const IdSchema = z.object({ id: z.string().uuid() });

const SettingsSchema = z.object({ daily_amount: Amount });

// Untuk siswa: saldo total, status iuran MILIKMU SENDIRI, dan daftar pengeluaran.
// Siapa yang sudah/belum bayar tidak pernah dikirim ke siswa lain.
export const getMyCash = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;

    // Pastikan tagihan kas harian hari ini sudah ada (auto-generate, aman dipanggil berkali-kali).
    const { error: ensureError } = await supabase.rpc("ensure_daily_kas");
    if (ensureError) throw new Error(ensureError.message);

    const { data: studentId, error: idError } = await supabase.rpc("current_student_id");
    if (idError) throw new Error(idError.message);

    const { data: summaryRows, error: summaryError } = await supabase.rpc("cash_summary");
    if (summaryError) throw new Error(summaryError.message);
    const summary = summaryRows?.[0];

    const { data: dues, error: duesError } = await supabase
      .from("cash_dues")
      .select("*")
      .order("created_at", { ascending: false });
    if (duesError) throw new Error(duesError.message);

    let paidByDue = new Map<string, string>();
    if (studentId) {
      const { data: payments, error: paymentsError } = await supabase
        .from("cash_payments")
        .select("due_id, paid_at")
        .eq("student_id", studentId);
      if (paymentsError) throw new Error(paymentsError.message);
      paidByDue = new Map((payments ?? []).map((p) => [p.due_id, p.paid_at]));
    }

    const { data: expenses, error: expensesError } = await supabase
      .from("cash_expenses")
      .select("*")
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (expensesError) throw new Error(expensesError.message);

    const totalIn = Number(summary?.total_in ?? 0);
    const totalOut = Number(summary?.total_out ?? 0);

    return {
      is_student: !!studentId,
      total_in: totalIn,
      total_out: totalOut,
      balance: totalIn - totalOut,
      dues: (dues ?? []).map((due) => ({
        ...due,
        paid: paidByDue.has(due.id),
        paid_at: paidByDue.get(due.id) ?? null,
      })),
      expenses: expenses ?? [],
    };
  });

// ---------- Admin ----------

export const listCashDuesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Pastikan tagihan kas harian hari ini sudah ada (auto-generate, aman dipanggil berkali-kali).
    const { error: ensureError } = await context.supabase.rpc("ensure_daily_kas");
    if (ensureError) throw new Error(ensureError.message);

    const { data, error } = await context.supabase
      .from("cash_dues")
      .select("*, cash_payments(count)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((due) => ({
      id: due.id,
      title: due.title,
      amount: due.amount,
      due_date: due.due_date,
      is_daily: due.is_daily,
      paid_count: due.cash_payments?.[0]?.count ?? 0,
    }));
  });

// ---------- Pengaturan harga kas harian (admin & bendahara) ----------

export const getKasSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("kas_settings")
      .select("daily_amount")
      .eq("id", 1)
      .single();
    if (error) throw new Error(error.message);
    return { daily_amount: data.daily_amount };
  });

export const updateKasSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("kas_settings")
      .update({ daily_amount: data.daily_amount })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const createCashDue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => DueSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cash_dues")
      .insert({ title: data.title, amount: data.amount, due_date: data.due_date || null });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateCashDue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => DueSchema.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cash_dues")
      .update({ title: data.title, amount: data.amount, due_date: data.due_date || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteCashDue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => IdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cash_dues").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const listDuePayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ due_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cash_payments")
      .select("student_id")
      .eq("due_id", data.due_id);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => r.student_id);
  });

export const setCashPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ due_id: z.string().uuid(), student_id: z.string().uuid(), paid: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.paid) {
      const { error } = await context.supabase
        .from("cash_payments")
        .upsert({ due_id: data.due_id, student_id: data.student_id }, { onConflict: "due_id,student_id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("cash_payments")
        .delete()
        .eq("due_id", data.due_id)
        .eq("student_id", data.student_id);
      if (error) throw new Error(error.message);
    }
    return { success: true };
  });

export const createCashExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ExpenseSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cash_expenses").insert(data);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateCashExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ExpenseSchema.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const { error } = await context.supabase.from("cash_expenses").update(values).eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteCashExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => IdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cash_expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
