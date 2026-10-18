"use client";

import { useEffect, useState } from "react";
import { resolveTheme, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "light", label: "Tema claro", icon: "☀" },
  { value: "dark", label: "Tema oscuro", icon: "☾" },
  { value: "system", label: "Tema del sistema", icon: "◐" },
];

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export default function ThemeToggle() {
  // null hasta montar en el navegador: el servidor no conoce la preferencia
  const [preference, setPreference] = useState<ThemePreference | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo existe en el navegador
    setPreference(readPreference());
  }, []);

  useEffect(() => {
    if (!preference) return;
    const apply = () => document.documentElement.setAttribute("data-theme", resolveTheme(preference));
    apply();
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  function choose(value: ThemePreference) {
    setPreference(value);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Sin almacenamiento: el tema se aplica igualmente en esta visita
    }
  }

  return (
    <div role="radiogroup" aria-label="Tema" className="flex rounded-md border border-border-strong p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={preference === o.value}
          title={o.label}
          aria-label={o.label}
          onClick={() => choose(o.value)}
          className={`h-6 w-7 rounded text-sm leading-none ${
            preference === o.value ? "bg-surface-muted text-fg" : "text-fg-subtle hover:text-fg"
          }`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
