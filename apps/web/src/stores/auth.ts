import { create } from "zustand";
import type { AuthUserDTO } from "@shelf/shared";
import { api, setAccessToken } from "../lib/api";

interface AuthState {
  user: AuthUserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (slug: string, email: string, password: string) => Promise<void>;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: AuthUserDTO | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (slug: string, email: string, password: string) => {
    const data = await api<{ accessToken: string; user: AuthUserDTO }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, email, password }),
      skipAuth: true,
    });

    setAccessToken(data.accessToken);
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  refresh: async () => {
    try {
      const data = await api<{ accessToken: string }>("/auth/refresh", {
        method: "POST",
        skipAuth: true,
      });
      setAccessToken(data.accessToken);

      // Fetch current user info
      // TODO: add /auth/me endpoint or decode from JWT
      set({ isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await api("/auth/logout", { method: "POST", skipAuth: true });
    } catch {
      // ignore
    }
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false });

    // Clear local cart
    localStorage.removeItem("shelf-cart");
  },

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
}));
