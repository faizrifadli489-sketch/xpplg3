import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearOfflineData } from "@/lib/register-sw";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  /** true kalau user login punya role admin */
  isAdmin: boolean;
  /** id siswa kalau akun ini akun siswa, selain itu null */
  studentId: string | null;
  /** true selama role/akun siswa masih dicek setelah login */
  roleLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAdmin: false,
  studentId: null,
  roleLoading: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [roleFor, setRoleFor] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      let current = error ? null : data.user;
      // Offline: tetap anggap login memakai sesi yang tersimpan di perangkat.
      if (!current && typeof navigator !== "undefined" && !navigator.onLine) {
        const { data: local } = await supabase.auth.getSession();
        current = local.session?.user ?? null;
      }
      if (mounted) {
        setUser(current);
        setIsLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") void clearOfflineData();
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setUser(session?.user ?? null);
        router.invalidate();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  // Cek role admin / akun siswa setiap kali user berganti.
  // roleLoading diturunkan (bukan state terpisah) supaya tidak ada jeda salah baca
  // di render pertama setelah login.
  const userId = user?.id ?? null;
  const roleLoading = userId !== null && roleFor !== userId;

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      setStudentId(null);
      setRoleFor(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const [roleResult, accountResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
        supabase.from("student_accounts").select("student_id").eq("user_id", userId).maybeSingle(),
      ]);

      if (cancelled) return;
      setIsAdmin(!!roleResult.data);
      setStudentId(accountResult.data?.student_id ?? null);
      setRoleFor(userId);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.invalidate();
    router.navigate({ to: "/auth" });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, studentId, roleLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
