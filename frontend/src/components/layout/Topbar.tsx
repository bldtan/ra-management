import { useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { label } from '@/lib/utils';
import { NotificationBell } from './NotificationBell';

const TITLES: Record<string, string> = {
  '': 'Dashboard',
  manufacturers: 'Manufacturers',
  plants: 'Manufacturing Plants',
  products: 'Products',
  tasks: 'Tasks',
  documents: 'Documents',
  import: 'Import Excel',
  performance: 'RA Performance',
  settings: 'Settings',
  notifications: 'Notifications',
};

export function Topbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const seg = pathname.split('/')[1] ?? '';
  const crumb = TITLES[seg] ?? 'Dashboard';

  return (
    <header className="fixed left-60 right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">
        <span className="text-slate-400">RA Management</span>
        <span className="mx-2">/</span>
        <span className="font-medium text-slate-700">{crumb}</span>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800">{user?.fullName}</p>
            <p className="text-xs text-slate-500">{label(user?.role)}</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
