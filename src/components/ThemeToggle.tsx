import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Cambiar tema">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = (theme ?? resolvedTheme) === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="hover-scale"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
