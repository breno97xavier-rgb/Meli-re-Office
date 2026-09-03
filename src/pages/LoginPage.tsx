import { useState, FormEvent } from 'react';
import { BrandAsset } from '@/src/components/brand/BrandAsset';
import { useAuth } from '@/src/hooks/useAuth';
import { ArrowRight, AlertCircle, Lock, Mail, Loader2, RotateCw, LogOut } from 'lucide-react';

export function LoginPage() {
  const { user, signIn, signOut, refreshProfile, authError, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn(email, password);
      if (!result.success && result.error) {
        setLocalError(result.error);
      }
    } catch {
      setLocalError('Não foi possível conectar ao servidor. Tente novamente em alguns instantes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refreshProfile();
    } finally {
      setIsRetrying(false);
    }
  };

  const activeError = localError || authError;

  return (
    <div className="flex min-h-screen w-full flex-col justify-between bg-[#F7F7F8] px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header info */}
      <header className="flex w-full items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <BrandAsset
            type="logo-light"
            alt="Melière Marketing"
            className="h-6 w-auto object-contain"
          />
          <span className="rounded bg-[#1D1D1D] px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-white uppercase">
            Office
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#9E9EA0]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F15A3C]" />
          <span>Acesso Privado</span>
        </div>
      </header>

      {/* Center Form Card */}
      <main className="flex w-full flex-1 items-center justify-center my-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[#E8E9EA] bg-white p-8 sm:p-10 shadow-sm">
            
            {/* Card Header */}
            <div className="mb-8">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF1EE] text-[#F15A3C] mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1D]">
                Acessar central
              </h1>
              <p className="mt-1.5 text-xs text-[#666668] leading-relaxed">
                Informe suas credenciais corporativas para gerenciar a operação da Melière.
              </p>
            </div>

            {/* Config Warning in Dev if Supabase credentials are missing */}
            {!isConfigured && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="font-medium">Ambiente em Configuração</div>
                <div className="mt-0.5 text-[11px] text-amber-700">
                  Configure <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> nas variáveis de ambiente para autenticação em produção.
                </div>
              </div>
            )}

            {/* Error Banner */}
            {activeError && (
              <div
                className="mb-6 rounded-lg border border-[#FBC3B8] bg-[#FDF1EE] p-3.5 text-xs text-[#DE4B2E]"
                role="alert"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="leading-relaxed font-medium block">{activeError}</span>
                    {user && !localError && (
                      <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[#FBC3B8]/60">
                        <button
                          type="button"
                          onClick={handleRetry}
                          disabled={isRetrying}
                          className="inline-flex items-center gap-1.5 rounded-md bg-[#DE4B2E] px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          <RotateCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
                          <span>{isRetrying ? 'Carregando...' : 'Tentar novamente'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => signOut()}
                          className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-[#666668] border border-[#E8E9EA] hover:bg-[#F7F7F8]"
                        >
                          <LogOut className="h-3 w-3" />
                          <span>Sair</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-medium text-[#1D1D1D] mb-1.5"
                >
                  E-mail corporativo
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9E9EA0]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="nome@melieremarketing.com.br"
                    className="block w-full rounded-lg border border-[#E8E9EA] bg-[#F9F9FA] pl-9 pr-3 py-2.5 text-xs text-[#1D1D1D] placeholder-[#9E9EA0] transition-colors focus:border-[#F15A3C] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#F15A3C] disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-[#1D1D1D] mb-1.5"
                >
                  Senha de acesso
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9E9EA0]">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="••••••••"
                    className="block w-full rounded-lg border border-[#E8E9EA] bg-[#F9F9FA] pl-9 pr-3 py-2.5 text-xs text-[#1D1D1D] placeholder-[#9E9EA0] transition-colors focus:border-[#F15A3C] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#F15A3C] disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D1D1D] px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#F15A3C] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar no Office</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-[#F2F3F3] text-center">
              <span className="text-[11px] text-[#9E9EA0]">
                Melière Marketing • Sistema Operacional Privado
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-[#9E9EA0] max-w-5xl mx-auto">
        <span>© {new Date().getFullYear()} Melière Marketing. Todos os direitos reservados.</span>
      </footer>
    </div>
  );
}
