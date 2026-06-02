import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Factory,
  Building2,
  Package,
  ClipboardList,
  FileText,
  Upload,
  BarChart3,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; roles?: Role[] }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/manufacturers', label: 'Manufacturers', icon: Factory },
  { to: '/plants', label: 'Manufacturing Plants', icon: Building2 },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList, roles: ['LEGAL_HEAD', 'RA_STAFF'] },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/import', label: 'Import Excel', icon: Upload, roles: ['LEGAL_HEAD', 'RA_STAFF'] },
  { to: '/performance', label: 'RA Performance', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['LEGAL_HEAD'] },
];

export function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-60 flex-col bg-slate-800 text-slate-300">
      <div className="flex h-14 items-center gap-2 border-b border-slate-700 px-5">
        <ShieldCheck className="h-6 w-6 text-blue-400" />
        <span className="font-semibold text-white">RA Management</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role))).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 hover:text-white',
              )
            }
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-700 p-4 text-xs text-slate-500">
        RA Management System v1.0
      </div>
    </aside>
  );
}
