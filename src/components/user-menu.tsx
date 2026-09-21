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
import { ChangePasswordButton, ChangePasswordDialog } from "@/components/change-password-button";

// Menu akun di header (layar lebar). Siswa dapat dropdown; admin cukup tombol ganti password.
export function UserMenu({ isStudent }: { isStudent: boolean }) {
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (!isStudent) return <ChangePasswordButton />;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Menu saya <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
          <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>Ganti password</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
