import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/src/lib/supabase';
import type { Profile, UserRole } from '@/src/types';

const VALID_ROLES: UserRole[] = ['admin', 'team', 'client'];

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isUnauthorized: boolean;
  authError: string | null;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

type FetchProfileResult =
  | { status: 'success'; profile: Profile }
  | { status: 'unauthorized'; message: string }
  | { status: 'error'; message: string };

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Helper to fetch and validate the user profile from public.profiles
  const fetchProfile = useCallback(async (userId: string): Promise<FetchProfileResult> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Melière Office] Falha ao carregar perfil:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return {
          status: 'error',
          message: 'Não foi possível carregar seu perfil no momento.',
        };
      }

      if (!data) {
        return {
          status: 'unauthorized',
          message: 'Seu usuário foi autenticado, mas ainda não possui acesso ao Melière Office.',
        };
      }

      // Check if role is valid
      if (!VALID_ROLES.includes(data.role as UserRole)) {
        console.warn('[Melière Office] Role inválido encontrado no perfil:', data.role);
        return {
          status: 'unauthorized',
          message: 'Seu usuário foi autenticado, mas ainda não possui acesso ao Melière Office.',
        };
      }

      return {
        status: 'success',
        profile: data as Profile,
      };
    } catch (err) {
      console.error('[Melière Office] Falha inesperada ao consultar perfil:', err);
      return {
        status: 'error',
        message: 'Não foi possível carregar seu perfil no momento.',
      };
    }
  }, []);

  // Helper to apply the outcome of fetchProfile to context states
  const applyProfileResult = useCallback((result: FetchProfileResult) => {
    if (result.status === 'success') {
      setProfile(result.profile);
      setIsUnauthorized(false);
      setAuthError(null);
    } else if (result.status === 'unauthorized') {
      setProfile(null);
      setIsUnauthorized(true);
      setAuthError(result.message);
    } else {
      // status === 'error' (technical error: do not flag as unauthorized)
      setProfile(null);
      setIsUnauthorized(false);
      setAuthError(result.message);
    }
  }, []);

  // Refresh profile handler
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsUnauthorized(false);
      setAuthError(null);
      return;
    }

    const result = await fetchProfile(user.id);
    applyProfileResult(result);
  }, [user, fetchProfile, applyProfileResult]);

  // Initial session check and auth state listener
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        if (!isSupabaseConfigured) {
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('[Melière Office] Erro ao obter sessão inicial:', error.message);
        }

        if (isMounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);

            const result = await fetchProfile(initialSession.user.id);
            if (isMounted) {
              applyProfileResult(result);
            }
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsUnauthorized(false);
            setAuthError(null);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[Melière Office] Falha na inicialização da autenticação:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsUnauthorized(false);
          setAuthError(null);
          setIsLoading(false);
          return;
        }

        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);

          const result = await fetchProfile(newSession.user.id);
          if (isMounted) {
            applyProfileResult(result);
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, applyProfileResult]);

  // Sign In function with email and password
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setAuthError(null);

      if (!isSupabaseConfigured) {
        const errorMsg =
          'Configuração do Supabase ausente. Defina VITE_SUPABASE_ANON_KEY no arquivo .env.';
        setAuthError(errorMsg);
        return { success: false, error: errorMsg };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          let friendlyError = 'Não foi possível conectar ao servidor. Tente novamente em alguns instantes.';

          if (
            error.message.includes('Invalid login credentials') ||
            error.message.includes('invalid_credentials') ||
            error.message.includes('Email not confirmed')
          ) {
            friendlyError = 'E-mail ou senha incorretos. Verifique suas credenciais.';
          } else if (error.message.includes('rate limit') || error.status === 429) {
            friendlyError = 'Muitas tentativas consecutivas. Aguarde alguns instantes antes de tentar novamente.';
          }

          setAuthError(friendlyError);
          return { success: false, error: friendlyError };
        }

        if (!data.user) {
          const errorMsg = 'E-mail ou senha incorretos. Verifique suas credenciais.';
          setAuthError(errorMsg);
          return { success: false, error: errorMsg };
        }

        // Authentication succeeded. The onAuthStateChange listener handles
        // setting session/user and loading/validating the profile.
        return { success: true };
      } catch (err: unknown) {
        console.error('[Melière Office] Erro no signIn:', err);
        const connectionError =
          'Não foi possível conectar ao servidor. Tente novamente em alguns instantes.';
        setAuthError(connectionError);
        return { success: false, error: connectionError };
      }
    },
    []
  );

  // Sign Out function
  const signOut = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[Melière Office] Aviso no signOut:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsUnauthorized(false);
      setAuthError(null);
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isUnauthorized,
    authError,
    isConfigured: isSupabaseConfigured,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
