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
import { PlaceholderModulePage } from '@/src/pages/PlaceholderModulePage';
import { LoginPage } from '@/src/pages/LoginPage';
import { LoadingGate } from '@/src/components/auth/LoadingGate';
import { AccessDenied } from '@/src/components/auth/AccessDenied';

function AppContent() {
  const { user, profile, isLoading, isUnauthorized, signOut } = useAuth();
  const { currentPath, navigate } = useRouter();

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

  // 4. Authenticated + Valid Profile: Render inside OfficeLayout
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
      default:
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
