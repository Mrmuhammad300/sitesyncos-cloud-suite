import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationPreferences {
  rfi_updates: boolean;
  draw_approvals: boolean;
  budget_alerts: boolean;
  daily_reminders: boolean;
  system_announcements: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  rfi_updates: true,
  draw_approvals: true,
  budget_alerts: true,
  daily_reminders: true,
  system_announcements: true,
};

interface Profile {
  display_name: string | null;
  role: string;
  avatar_url: string | null;
  preferences: { notifications?: NotificationPreferences } | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, "display_name" | "avatar_url">>) => Promise<{ error: Error | null }>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, role, avatar_url, preferences")
      .eq("user_id", userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Pick<Profile, "display_name" | "avatar_url">>) => {
    if (!user) return { error: new Error("Not authenticated") };
    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (!error) await fetchProfile(user.id);
    return { error: error as Error | null };
  };

  const updatePreferences = async (prefs: Partial<NotificationPreferences>) => {
    if (!user) return { error: new Error("Not authenticated") };
    const current = (profile?.preferences as { notifications?: NotificationPreferences } | null) ?? {};
    const merged = {
      ...current,
      notifications: { ...DEFAULT_NOTIFICATION_PREFS, ...current.notifications, ...prefs },
    };
    const { error } = await supabase
      .from("profiles")
      .update({ preferences: merged, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (!error) {
      setProfile(prev => prev ? { ...prev, preferences: merged } : prev);
    }
    return { error: error as Error | null };
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, updateProfile, updatePreferences, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
