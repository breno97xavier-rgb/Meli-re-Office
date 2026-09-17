import { useEffect } from 'react';
import { AuthProvider } from '@/src/context/AuthContext';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from '@/src/hooks/useRouter';
import { OfficeLayout } from '@/src/layouts/OfficeLayout';
import { DashboardPage } from '@/src/pages/DashboardPage';
import { LeadsPage } from '@/src/pages/LeadsPage';
import { OpportunitiesPage } from '@/src/pages/OpportunitiesPage';
import { ProposalsPage } from '@/src/pages/ProposalsPage';
import { ContractsPage } from '@/src/pages/ContractsPage';
import { ClientsPage } from '@/src/pages/ClientsPage';
import { ClientProfilePage } from '@/src/pages/ClientProfilePage';
import { ContentsPage } from '@/src/pages/ContentsPage';
import { PlanningPage } from '@/src/pages/PlanningPage';
import { PresentationsPage } from '@/src/pages/PresentationsPage';
import { PresentationEditorPage } from '@/src/pages/PresentationEditorPage';
import { PresentationViewerPage } from '@/src/pages/PresentationViewerPage';
import { PlaceholderModulePage } from '@/src/pages/PlaceholderModulePage';
import { LoginPage } from '@/src/pages/LoginPage';
import { LoadingGate } from '@/src/components/auth/LoadingGate';
import { AccessDenied } from '@/src/components/auth/AccessDenied';
import { PublicPresentationPage } from '@/src/pages/PublicPresentationPage';

function AppContent() {
  const { user, profile, isLoading, isUnauthorized, signOut } = useAuth();
  const { currentPath, navigate } = useRouter();

  // 0. PUBLIC ROUTES: Public Presentation (/apresentacao/:token)
  // Accessible anonymously without authentication, without OfficeLayout, without admin guards
  if (currentPath.startsWith('/apresentacao/') || currentPath === '/apresentacao') {
    const rawToken = currentPath.replace(/^\/apresentacao\/?/, '').split('/')[0]?.split('?')[0];
    const token = rawToken ? decodeURIComponent(rawToken) : '';
    return <PublicPresentationPage token={token} />;
  }

  // Redirect to /dashboard if already authenticated and accessing /login
  useEffect(() => {
    if (!isLoading && user && profile && !isUnauthorized && currentPath === '/login') {
      navigate('/dashboard');
    }
  }, [isLoading, user, profile, isUnauthorized, currentPath, navigate]);

  // 1. Initial loading gate while resolving Supabase session and fetching profile
  if (isLoading) {
    return <LoadingGate />;
  }

  // 2. Authenticated in Supabase Auth, but no valid profile found in public.profiles
  if (user && isUnauthorized) {
    return <AccessDenied email={user.email} onSignOut={signOut} />;
  }

  // 3. Unauthenticated state: render executive Login page outside OfficeLayout
  if (!user || !profile) {
    return <LoginPage />;
  }

  // 4. Authenticated presentation mode: render fullscreen presentation outside OfficeLayout
  if (currentPath.startsWith('/apresentacoes/') && currentPath.endsWith('/apresentar')) {
    const presentationId = currentPath.replace('/apresentacoes/', '').split('/')[0];
    if (presentationId) {
      return <PresentationViewerPage presentationId={presentationId} />;
    }
  }

  // 5. Authenticated + Valid Profile: Render inside OfficeLayout
  const renderContent = () => {
    switch (currentPath) {
      case '/':
      case '/dashboard':
      case '/login':
        return <DashboardPage />;
      case '/comercial':
      case '/comercial/leads':
        return <LeadsPage />;
      case '/comercial/oportunidades':
        return <OpportunitiesPage />;
      case '/comercial/propostas':
        return <ProposalsPage />;
      case '/comercial/contratos':
        return <ContractsPage />;
      case '/clientes':
        return <ClientsPage onNavigate={navigate} />;
      case '/planejamento':
        return <PlanningPage />;
      case '/conteudos':
        return <ContentsPage />;
      case '/apresentacoes':
        return <PresentationsPage />;
      default:
        if (currentPath.startsWith('/apresentacoes/')) {
          const presentationId = currentPath.replace('/apresentacoes/', '').split('/')[0];
          if (presentationId) {
            return <PresentationEditorPage presentationId={presentationId} />;
          }
        }
        if (currentPath.startsWith('/clientes/')) {
          const clientId = currentPath.replace('/clientes/', '').split('/')[0];
          if (clientId) {
            return <ClientProfilePage clientId={clientId} onNavigate={navigate} />;
          }
        }
        return <PlaceholderModulePage path={currentPath} />;
    }
  };

  return (
    <OfficeLayout currentPath={currentPath === '/login' ? '/dashboard' : currentPath} onNavigate={navigate}>
      {renderContent()}
    </OfficeLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
