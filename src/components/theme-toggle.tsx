import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle({ mobile = false }: { mobile?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size={mobile ? "sm" : "icon"}
      className={mobile ? "justify-start px-3" : ""}
      aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {mobile && <span className="ml-2">{isDark ? "Mode terang" : "Mode gelap"}</span>}
    </Button>
  );
}
