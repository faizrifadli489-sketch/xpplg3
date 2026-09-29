import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  addAiKey,
  deleteAiKey,
  getAiAdminConfig,
  setAiKeyActive,
  updateAiSettings,
} from "@/lib/ai.functions";
import { formatDateTimeId } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/ai")({
  component: AdminAi,
});

type Form = {
  base_url: string;
  model: string;
  system_prompt: string;
  knowledge: string;
  include_schedule: boolean;
  include_piket: boolean;
  include_events: boolean;
  include_kas: boolean;
  daily_limit: string;
};

const errMsg = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

function AdminAi() {
  const queryClient = useQueryClient();
  const fetchConfig = useServerFn(getAiAdminConfig);
  const saveSettings = useServerFn(updateAiSettings);
  const addKey = useServerFn(addAiKey);
  const removeKey = useServerFn(deleteAiKey);
  const toggleKey = useServerFn(setAiKeyActive);

  const config = useQuery({ queryKey: ["ai-admin-config"], queryFn: () => fetchConfig() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["ai-admin-config"] });

  const [form, setForm] = useState<Form | null>(null);
  useEffect(() => {
    const s = config.data?.settings;
    if (s && !form) {
      setForm({
        base_url: s.base_url,
        model: s.model,
        system_prompt: s.system_prompt,
        knowledge: s.knowledge,
        include_schedule: s.include_schedule,
        include_piket: s.include_piket,
        include_events: s.include_events,
        include_kas: s.include_kas,
        daily_limit: String(s.daily_limit),
      });
    }
  }, [config.data, form]);

  const enabledMutation = useMutation({
    mutationFn: (enabled: boolean) => saveSettings({ data: { enabled } }),
    onSuccess: async (_r, enabled) => {
      await refresh();
      toast.success(enabled ? "Asisten AI dinyalakan." : "Asisten AI dimatikan.");
    },
    onError: (err) => toast.error(errMsg(err, "Gagal mengubah status AI.")),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      saveSettings({
        data: {
          ...form!,
          daily_limit: Number(form!.daily_limit),
        },
      }),
    onSuccess: async () => {
      await refresh();
      toast.success("Pengaturan AI disimpan.");
    },
    onError: (err) => toast.error(errMsg(err, "Gagal menyimpan pengaturan.")),
  });

  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const addMutation = useMutation({
    mutationFn: () => addKey({ data: { label, api_key: apiKey } }),
    onSuccess: async () => {
      setLabel("");
      setApiKey("");
      await refresh();
      toast.success("API key ditambahkan.");
    },
    onError: (err) => toast.error(errMsg(err, "Gagal menambah API key.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeKey({ data: { id } }),
    onSuccess: async () => {
      await refresh();
      toast.success("API key dihapus.");
    },
    onError: (err) => toast.error(errMsg(err, "Gagal menghapus API key.")),
  });

  const activeMutation = useMutation({
    mutationFn: (vars: { id: string; is_active: boolean }) => toggleKey({ data: vars }),
    onSuccess: () => refresh(),
    onError: (err) => toast.error(errMsg(err, "Gagal mengubah key.")),
  });

  if (config.isLoading || !form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }
  if (config.error) return <p className="text-sm text-destructive">{errMsg(config.error, "Gagal memuat.")}</p>;

  const enabled = config.data!.settings.enabled;
  const keys = config.data!.keys;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">Asisten AI (CS kelas)</p>
              <p className="text-sm text-muted-foreground">
                {enabled ? "Aktif: siswa yang login bisa bertanya." : "Mati: tombol chat disembunyikan dari siswa."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {enabledMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              checked={enabled}
              disabled={enabledMutation.isPending}
              onCheckedChange={(v) => enabledMutation.mutate(v)}
              aria-label="Nyalakan atau matikan asisten AI"
            />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-4 w-4" /> API key
        </h3>
        <p className="text-sm text-muted-foreground">
          Bisa lebih dari satu. Tiap pertanyaan memakai key secara bergiliran, dan kalau satu key gagal (limit/error)
          otomatis pindah ke key berikutnya. Key disimpan di server dan tidak pernah dikirim ke browser siswa.
        </p>

        <div className="space-y-2">
          {keys.length === 0 && <p className="text-sm text-muted-foreground">Belum ada API key.</p>}
          {keys.map((k) => {
            const busyDelete = deleteMutation.isPending && deleteMutation.variables === k.id;
            const busyToggle = activeMutation.isPending && activeMutation.variables?.id === k.id;
            return (
              <Card key={k.id}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {k.label}{" "}
                      <span className="font-mono text-xs font-normal text-muted-foreground">{k.masked_key}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {k.last_used_at ? `Terakhir dipakai ${formatDateTimeId(k.last_used_at)}` : "Belum pernah dipakai"}
                      {k.fail_count > 0 && k.last_error ? ` · gagal ${k.fail_count}x (${k.last_error})` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {busyToggle && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={k.is_active}
                      disabled={busyToggle || busyDelete}
                      onCheckedChange={(v) => activeMutation.mutate({ id: k.id, is_active: v })}
                      aria-label="Aktifkan key"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={busyDelete}
                      onClick={() => {
                        if (confirm(`Hapus API key "${k.label}"?`)) deleteMutation.mutate(k.id);
                      }}
                      aria-label="Hapus key"
                    >
                      {busyDelete ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="key-label">Label</Label>
            <Input id="key-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Key 1" className="w-36" />
          </div>
          <div className="min-w-[14rem] flex-1 space-y-1.5">
            <Label htmlFor="key-value">API key</Label>
            <Input
              id="key-value"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <Button type="button" disabled={addMutation.isPending || !label.trim() || !apiKey.trim()} onClick={() => addMutation.mutate()}>
            {addMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            Tambah key
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-semibold">Pengaturan AI</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ai-base">Base URL (OpenAI-compatible)</Label>
            <Input id="ai-base" value={form.base_url} onChange={(e) => set("base_url", e.target.value)} placeholder="https://.../v1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-model">Model</Label>
            <Input id="ai-model" value={form.model} onChange={(e) => set("model", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-limit">Batas pertanyaan per siswa / hari</Label>
            <Input
              id="ai-limit"
              type="number"
              min={1}
              max={500}
              value={form.daily_limit}
              onChange={(e) => set("daily_limit", e.target.value)}
              className="w-32"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-prompt">System prompt</Label>
          <Textarea id="ai-prompt" rows={7} value={form.system_prompt} onChange={(e) => set("system_prompt", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-knowledge">Data / info tambahan</Label>
          <Textarea
            id="ai-knowledge"
            rows={6}
            value={form.knowledge}
            onChange={(e) => set("knowledge", e.target.value)}
            placeholder="Contoh: Wali kelas Bu Rina. Kas dibayar tiap hari ke bendahara. Seragam batik hari Kamis."
          />
        </div>

        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Data otomatis yang boleh dibaca AI</p>
          <p className="text-xs text-muted-foreground">
            Diambil langsung dari tab Jadwal, Acara, dan Kas, jadi tidak perlu diketik ulang. Ubah datanya di tab tersebut.
          </p>
          {(
            [
              ["include_schedule", "Jadwal pelajaran"],
              ["include_piket", "Jadwal piket"],
              ["include_events", "Acara mendatang"],
              ["include_kas", "Status kas siswa yang bertanya (hanya miliknya sendiri)"],
            ] as const
          ).map(([key, text]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm">{text}</span>
              <Switch checked={form[key]} onCheckedChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>

        <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saveMutation.isPending ? "Menyimpan..." : "Simpan pengaturan"}
        </Button>
      </section>
    </div>
  );
}
