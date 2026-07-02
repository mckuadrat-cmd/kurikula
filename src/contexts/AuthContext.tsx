import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'superadmin';
  school: string;
  schoolLevel: 'SD' | 'SMP' | 'SMA';
  phone: string;
  nip: string;
  schoolCode: string;
  avatar?: string;
  subjects?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, metadata?: Record<string, any>) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (metadata: Record<string, any>) => Promise<{ error: any }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = (currentUser: User) => {
    // Read avatar from localStorage as a reliable local cache
    let localAvatar = '';
    try {
      localAvatar = localStorage.getItem(`kurikula_avatar_${currentUser.id}`) || '';
    } catch (e) {
      console.error('Failed to read avatar from localStorage:', e);
    }

    const avatarVal = localAvatar || currentUser.user_metadata?.avatar || currentUser.user_metadata?.avatar_url || '';

    // Cache the avatar locally if found in metadata but not in localStorage
    if (!localAvatar && currentUser.user_metadata?.avatar) {
      try {
        localStorage.setItem(`kurikula_avatar_${currentUser.id}`, currentUser.user_metadata.avatar);
      } catch (e) {}
    }

    const realProfile: UserProfile = {
      id: currentUser.id,
      email: currentUser.email || '',
      name: currentUser.user_metadata?.name || currentUser.email || 'Nama Akun',
      role: currentUser.user_metadata?.role === 'superadmin' || currentUser.email?.toLowerCase() === 'mckuadratid@gmail.com' ? 'superadmin' : 'user',
      school: currentUser.user_metadata?.school || '',
      schoolLevel: currentUser.user_metadata?.schoolLevel || 'SMA',
      phone: currentUser.user_metadata?.whatsapp || currentUser.user_metadata?.phone || '',
      nip: currentUser.user_metadata?.nip || '',
      schoolCode: currentUser.user_metadata?.schoolCode || '',
      avatar: avatarVal,
      subjects: currentUser.user_metadata?.subjects || '[]',
    };
    setProfile(realProfile);

    // Sync subjects list to localStorage 'mata_pelajaran' for backwards compatibility
    if (currentUser.user_metadata?.subjects) {
      try {
        const parsed = JSON.parse(currentUser.user_metadata.subjects);
        if (Array.isArray(parsed)) {
          const names = parsed.map((item: any) => item.name).join(", ");
          localStorage.setItem("mata_pelajaran", names);
        }
      } catch (e) {
        console.error("Gagal mem-parsing subjects:", e);
      }
    }
  };

  const updateProfile = async (metadata: Record<string, any>) => {
    try {
      // If updating avatar, also cache it to localStorage
      if (metadata.avatar && user) {
        try {
          localStorage.setItem(`kurikula_avatar_${user.id}`, metadata.avatar);
        } catch (e) {}
      }

      const { data, error } = await supabase.auth.updateUser({
        data: metadata,
      });

      if (error) {
        console.error('Update profile error:', error);
        return { error };
      }

      if (data.user) {
        loadUserProfile(data.user);
      }

      return { error: null };
    } catch (error) {
      console.error('Update profile exception:', error);
      return { error };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Login error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Login exception:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('Google login error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Google login exception:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, name: string, metadata?: Record<string, any>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            ...metadata,
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Sign up exception:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error) {
      console.error('Reset password email exception:', error);
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error };
    } catch (error) {
      console.error('Update password exception:', error);
      return { error };
    }
  };

  const isSuperAdmin = user?.email?.toLowerCase() === 'mckuadratid@gmail.com' || user?.user_metadata?.role === 'superadmin';

  const value = {
    user,
    profile,
    session,
    loading,
    isSuperAdmin,
    signInWithEmail,
    signInWithGoogle,
    signUp,
    signOut,
    updateProfile,
    resetPasswordForEmail,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
