import type { TenantThemeDTO } from "@shelf/shared";

export function applyTheme(theme: Partial<TenantThemeDTO> | null) {
  const root = document.documentElement;

  if (!theme) return;

  if (theme.primaryColor) {
    root.style.setProperty("--tenant-primary", theme.primaryColor);
  }
  if (theme.secondaryColor) {
    root.style.setProperty("--tenant-secondary", theme.secondaryColor);
  }
  if (theme.accentColor) {
    root.style.setProperty("--tenant-accent", theme.accentColor);
  }
  if (theme.fontFamily) {
    root.style.setProperty("--tenant-font", theme.fontFamily);
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

export function resetTheme() {
  const root = document.documentElement;
  root.style.removeProperty("--tenant-primary");
  root.style.removeProperty("--tenant-secondary");
  root.style.removeProperty("--tenant-accent");
  root.style.removeProperty("--tenant-font");
  root.style.removeProperty("--tenant-logo-url");
}
