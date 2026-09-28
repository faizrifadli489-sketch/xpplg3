import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return { user: data.user };

    // Offline: getUser() gagal karena tidak bisa menghubungi server. Pakai sesi yang tersimpan
    // di perangkat supaya halaman yang sudah pernah dibuka tetap bisa dilihat.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const { data: local } = await supabase.auth.getSession();
      if (local.session?.user) return { user: local.session.user };
    }
    throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
