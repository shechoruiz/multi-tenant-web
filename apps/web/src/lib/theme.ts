import type { TenantThemeDTO } from "@shelf/shared";

/**
 * Convierte un color HEX (#rrggbb) a un triplet HSL con el formato que consume
 * Tailwind/shadcn: "h s% l%". Ej: "#2563eb" → "221.2 83.2% 53.3%".
 */
function hexToHslTriplet(hex: string): string | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;

  const r = parseInt(match[1].slice(0, 2), 16) / 255;
  const g = parseInt(match[1].slice(2, 4), 16) / 255;
  const b = parseInt(match[1].slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Contraste de texto sobre un color: oscuro para fondos claros, blanco para oscuros. */
function contrastText(hex: string): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return "0 0% 98%";

  const r = parseInt(match[1].slice(0, 2), 16) / 255;
  const g = parseInt(match[1].slice(2, 4), 16) / 255;
  const b = parseInt(match[1].slice(4, 6), 16) / 255;

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "0 0% 9%" : "0 0% 98%";
}

const THEME_VARS = [
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--accent",
  "--accent-foreground",
  "--ring",
] as const;

/**
 * Aplica el tema del tenant sobre las variables CSS que Tailwind/shadcn consume
 * (`--primary`, `--secondary`, `--accent`, `--ring`). Los colores del tenant se
 * guardan en HEX y se convierten a triplet HSL antes de inyectarlos.
 */
export function applyTheme(theme: Partial<TenantThemeDTO> | null) {
  const root = document.documentElement;
  if (!theme) return;

  if (theme.primaryColor) {
    const hsl = hexToHslTriplet(theme.primaryColor);
    if (hsl) {
      root.style.setProperty("--primary", hsl);
      root.style.setProperty("--primary-foreground", contrastText(theme.primaryColor));
      // El ring de foco sigue al color primario del tenant
      root.style.setProperty("--ring", hsl);
    }
  }
  if (theme.secondaryColor) {
    const hsl = hexToHslTriplet(theme.secondaryColor);
    if (hsl) {
      root.style.setProperty("--secondary", hsl);
      root.style.setProperty("--secondary-foreground", contrastText(theme.secondaryColor));
    }
  }
  if (theme.accentColor) {
    const hsl = hexToHslTriplet(theme.accentColor);
    if (hsl) {
      root.style.setProperty("--accent", hsl);
      root.style.setProperty("--accent-foreground", contrastText(theme.accentColor));
    }
  }
  if (theme.fontFamily) {
    document.body.style.fontFamily = theme.fontFamily;
  }
  if (theme.logoUrl) {
    root.style.setProperty("--tenant-logo-url", `url(${theme.logoUrl})`);
  }
  if (theme.faviconUrl) {
    const link =
      document.querySelector<HTMLLinkElement>("link[rel~='icon']") ??
      document.createElement("link");
    link.rel = "icon";
    link.href = theme.faviconUrl;
    document.head.appendChild(link);
  }
}

/** Revierte el tema del tenant dejando los valores por defecto de shadcn. */
export function resetTheme() {
  const root = document.documentElement;
  for (const variable of THEME_VARS) {
    root.style.removeProperty(variable);
  }
  root.style.removeProperty("--tenant-logo-url");
  document.body.style.fontFamily = "";
}
