import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

type Theme = "light" | "dark" | "system";

interface AppState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Global search
  searchQuery: string;
  searchOpen: boolean;
  setSearchQuery: (q: string) => void;
  setSearchOpen: (open: boolean) => void;

  // Notifications
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  incrementUnread: () => void;
  clearUnread: () => void;

  // Active module (for breadcrumbs / context)
  activeModule: string;
  setActiveModule: (module: string) => void;

  // Offline status
  isOffline: boolean;
  setOffline: (offline: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Sidebar — persisted
      sidebarOpen: true,
      sidebarCollapsed: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // Theme — persisted
      theme: "system",
      setTheme: (theme) => {
        set({ theme });
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        if (theme !== "system") {
          root.classList.add(theme);
        } else {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          root.classList.add(prefersDark ? "dark" : "light");
        }
      },

      // Search — not persisted (reset on load)
      searchQuery: "",
      searchOpen: false,
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),

      // Notifications — persisted
      unreadCount: 0,
      setUnreadCount: (unreadCount) => set({ unreadCount }),
      incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
      clearUnread: () => set({ unreadCount: 0 }),

      // Active module — not persisted
      activeModule: "",
      setActiveModule: (activeModule) => set({ activeModule }),

      // Offline — not persisted
      isOffline: false,
      setOffline: (isOffline) => set({ isOffline }),
    }),
    {
      name: "sitesyncos-app-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist these keys
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        unreadCount: state.unreadCount,
      }),
    }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectTheme = (s: AppState) => s.theme;
export const selectSidebarOpen = (s: AppState) => s.sidebarOpen;
export const selectSidebarCollapsed = (s: AppState) => s.sidebarCollapsed;
export const selectUnreadCount = (s: AppState) => s.unreadCount;
export const selectSearchOpen = (s: AppState) => s.searchOpen;
export const selectIsOffline = (s: AppState) => s.isOffline;
