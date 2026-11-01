import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/components/change-password-button";
import { useAuth } from "@/hooks/useAuth";

// Menu akun di header (layar lebar). Satu tombol untuk semua yang login: siswa dapat tautan
// pribadinya, admin hanya ganti password dan logout. Dulu ada 3 tombol terpisah (Menu saya,
// Ganti password, Logout) yang berebut tempat dengan 8 tautan navigasi.
export function UserMenu({ isStudent }: { isStudent: boolean }) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { signOut } = useAuth();

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Menu akun">
            Akun <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {isStudent && (
            <>
              <DropdownMenuItem asChild>
                <Link to="/profil-saya">Profil saya</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/saran">Kotak saran</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/voting">Voting kelas</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/kas">Kas kelas</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>Ganti password</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              void signOut();
            }}
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
