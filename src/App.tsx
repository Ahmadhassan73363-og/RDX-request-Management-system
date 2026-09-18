import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { SystemProvider } from './context/SystemContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { RequestsListPage } from './pages/requests/RequestsListPage';
import { ApprovalsQueuePage } from './pages/approvals/ApprovalsQueuePage';
import { ShipmentTrackingPage } from './pages/shipments/ShipmentTrackingPage';
import { TeamsListPage } from './pages/teams/TeamsListPage';
import { CompaniesPage } from './pages/companies/CompaniesPage';
import { WarehousesPage } from './pages/warehouses/WarehousesPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { BudgetsOverviewPage } from './pages/budgets/BudgetsOverviewPage';
import { FormsListPage } from './pages/forms/FormsListPage';
import { FormAssignmentPage } from './pages/forms/FormAssignmentPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import { UsersListPage } from './pages/users/UsersListPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { NewRequestModal } from './pages/requests/NewRequestModal';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>('/dashboard');
  const [targetRequestId, setTargetRequestId] = useState<string | undefined>(undefined);
  const [isGlobalNewRequestModalOpen, setIsGlobalNewRequestModalOpen] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleSync = () => setTick(t => t + 1);
    window.addEventListener('storage-synced', handleSync);
    return () => window.removeEventListener('storage-synced', handleSync);
  }, []);

  // Parse any initial query params (e.g. from command palette navigation)
  const handleNavigate = (path: string) => {
    if (path.includes('?id=')) {
      const [basePath, query] = path.split('?id=');
      setTargetRequestId(query);
      setCurrentPath(basePath);
    } else {
      setTargetRequestId(undefined);
      setCurrentPath(path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setCurrentPath('/dashboard')} />;
  }

  return (
    <Layout currentPath={currentPath} onNavigate={handleNavigate}>
      {currentPath === '/dashboard' && (
        <DashboardPage
          onNavigate={handleNavigate}
          onOpenNewRequest={() => setIsGlobalNewRequestModalOpen(true)}
        />
      )}

      {currentPath === '/requests' && (
        <RequestsListPage
          initialRequestId={targetRequestId}
          onClearInitialId={() => setTargetRequestId(undefined)}
        />
      )}

      {currentPath === '/approvals' && (
        <ApprovalsQueuePage
          onNavigateToRequest={(id) => handleNavigate(`/requests?id=${id}`)}
        />
      )}

      {currentPath === '/shipments' && (
        <ShipmentTrackingPage
          onNavigateToRequest={(id) => handleNavigate(`/requests?id=${id}`)}
        />
      )}

      {currentPath === '/teams' && (
        <TeamsListPage
          onNavigateToBudgets={() => handleNavigate('/budgets')}
        />
      )}

      {currentPath === '/budgets' && (
        <BudgetsOverviewPage />
      )}

      {currentPath === '/companies' && (
        <CompaniesPage />
      )}

      {currentPath === '/warehouses' && (
        <WarehousesPage />
      )}

      {currentPath === '/customers' && (
        <CustomersPage />
      )}

      {currentPath === '/forms' && (
        <FormsListPage
          onNavigateToAssignments={() => handleNavigate('/form-assignments')}
        />
      )}

      {currentPath === '/form-assignments' && (
        <FormAssignmentPage />
      )}

      {currentPath === '/reports' && (
        <ReportsPage />
      )}

      {currentPath === '/audit' && (
        <AuditLogsPage />
      )}

      {currentPath === '/users' && (
        <UsersListPage />
      )}

      {currentPath === '/settings' && (
        <SettingsPage />
      )}

      {/* Global New Request Modal */}
      <NewRequestModal
        isOpen={isGlobalNewRequestModalOpen}
        onClose={() => setIsGlobalNewRequestModalOpen(false)}
        onSuccess={(id) => {
          handleNavigate(`/requests?id=${id}`);
        }}
      />
    </Layout>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SystemProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </SystemProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
