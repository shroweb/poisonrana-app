import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User } from "@/lib/types";

interface AuthStore {
  token: string | null;
  user: User | null;
  isHydrated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  token: null,
  user: null,
  isHydrated: false,

  login: async (token, user) => {
    await SecureStore.setItemAsync("token", token);
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("token");
    set({ token: null, user: null });
  },

  setUser: (user) => set({ user }),

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        const res = await fetch("https://www.poisonrana.com/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          set({ token, user: json.data?.user ?? json.data ?? json.user ?? null });
        } else {
          await SecureStore.deleteItemAsync("token");
        }
      }
    } finally {
      set({ isHydrated: true });
    }
  },
}));
