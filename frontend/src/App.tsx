import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ManufacturersPage } from '@/pages/manufacturers/ManufacturersPage';
import { PlantsPage } from '@/pages/plants/PlantsPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { ProductDetailPage } from '@/pages/products/ProductDetailPage';
import { TasksPage } from '@/pages/tasks/TasksPage';
import { TaskDetailPage } from '@/pages/tasks/TaskDetailPage';
import { DocumentsPage } from '@/pages/documents/DocumentsPage';
import { ImportPage } from '@/pages/import/ImportPage';
import { PerformancePage } from '@/pages/performance/PerformancePage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import type { Role } from '@/types';

function FullPageLoader() {
  return (
    <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>
  );
}

function Protected({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <FullPageLoader /> : user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/manufacturers" element={<ManufacturersPage />} />
        <Route path="/plants" element={<PlantsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route
          path="/tasks"
          element={
            <Protected roles={['LEGAL_HEAD', 'RA_STAFF']}>
              <TasksPage />
            </Protected>
          }
        />
        <Route
          path="/tasks/:id"
          element={
            <Protected roles={['LEGAL_HEAD', 'RA_STAFF']}>
              <TaskDetailPage />
            </Protected>
          }
        />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route
          path="/import"
          element={
            <Protected roles={['LEGAL_HEAD', 'RA_STAFF']}>
              <ImportPage />
            </Protected>
          }
        />
        <Route path="/performance" element={<PerformancePage />} />
        <Route
          path="/settings"
          element={
            <Protected roles={['LEGAL_HEAD']}>
              <SettingsPage />
            </Protected>
          }
        />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
