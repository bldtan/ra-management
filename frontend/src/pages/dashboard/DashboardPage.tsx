import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Send,
  RefreshCw,
  FileWarning,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useFetch } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';

interface Summary {
  totalProducts: number;
  newProductsThisMonth: number;
  activeTasks: number;
  myActiveTasks: number;
  overdueHigh: number;
  overdueNormal: number;
  completedThisMonth: number;
  completedPrevMonth: number;
  submittedTasks: number;
  reworkRequired: number;
  docsExpiring: { d30: number; d60: number; d90: number };
  dueSoon: { id: string; taskCode: string; title: string; targetDeadline: string; status: string }[];
}

function KpiCard({
  icon: Icon,
  title,
  value,
  sub,
  onClick,
  tone = 'slate',
}: {
  icon: typeof Package;
  title: string;
  value: ReactNode;
  sub?: string;
  onClick?: () => void;
  tone?: 'slate' | 'blue' | 'red' | 'green' | 'cyan' | 'amber';
}) {
  const tones: Record<string, string> = {
    slate: 'text-slate-500',
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    cyan: 'text-cyan-600',
    amber: 'text-amber-600',
  };
  return (
    <Card
      onClick={onClick}
      className={`p-5 ${onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <Icon className={`h-8 w-8 ${tones[tone]}`} />
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { data, loading } = useFetch<Summary>('/dashboard');
  const navigate = useNavigate();

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of registrations, tasks and documents" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Package}
          title="Total Products"
          value={data.totalProducts}
          sub={`+${data.newProductsThisMonth} this month`}
          tone="blue"
          onClick={() => navigate('/products')}
        />
        <KpiCard
          icon={ClipboardList}
          title="Active Tasks"
          value={data.activeTasks}
          sub={`${data.myActiveTasks} assigned to you`}
          tone="cyan"
          onClick={() => navigate('/tasks')}
        />
        <KpiCard
          icon={AlertTriangle}
          title="Overdue Tasks"
          value={data.overdueHigh + data.overdueNormal}
          sub={`${data.overdueHigh} high · ${data.overdueNormal} normal`}
          tone="red"
          onClick={() => navigate('/tasks?status=&overdue=1')}
        />
        <KpiCard
          icon={CheckCircle2}
          title="Completed This Month"
          value={data.completedThisMonth}
          sub={`vs ${data.completedPrevMonth} last month`}
          tone="green"
        />
        <KpiCard
          icon={Send}
          title="Submitted Tasks"
          value={data.submittedTasks}
          tone="cyan"
          onClick={() => navigate('/tasks?status=SUBMITTED')}
        />
        <KpiCard
          icon={RefreshCw}
          title="Rework Required"
          value={data.reworkRequired}
          tone="amber"
          onClick={() => navigate('/tasks?status=REWORK_REQUIRED')}
        />
        <Card className="p-5 sm:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-slate-500 mb-2">Docs Expiring Soon</p>
              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/documents', { state: { expiryRange: '0-30' } })}
                  className="flex flex-col items-start rounded-md px-3 py-2 hover:bg-red-50 transition-colors group"
                >
                  <p className="text-xl font-semibold text-red-600">{data.docsExpiring.d30}</p>
                  <p className="text-xs text-slate-500 group-hover:text-red-600">0–30 days →</p>
                </button>
                <button
                  onClick={() => navigate('/documents', { state: { expiryRange: '31-60' } })}
                  className="flex flex-col items-start rounded-md px-3 py-2 hover:bg-amber-50 transition-colors group"
                >
                  <p className="text-xl font-semibold text-amber-600">{data.docsExpiring.d60}</p>
                  <p className="text-xs text-slate-500 group-hover:text-amber-600">31–60 days →</p>
                </button>
                <button
                  onClick={() => navigate('/documents', { state: { expiryRange: '61-90' } })}
                  className="flex flex-col items-start rounded-md px-3 py-2 hover:bg-slate-100 transition-colors group"
                >
                  <p className="text-xl font-semibold text-slate-600">{data.docsExpiring.d90}</p>
                  <p className="text-xs text-slate-500 group-hover:text-slate-700">61–90 days →</p>
                </button>
              </div>
            </div>
            <FileWarning className="h-8 w-8 text-amber-600" />
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Tasks due in next 7 days</h2>
        </div>
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Task Code', 'Title', 'Deadline', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.dueSoon.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    Nothing due in the next 7 days
                  </td>
                </tr>
              ) : (
                data.dueSoon.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/tasks/${t.id}`)}
                  >
                    <td className="px-6 py-3 font-medium text-blue-600">{t.taskCode}</td>
                    <td className="px-6 py-3">{t.title}</td>
                    <td className="px-6 py-3">{formatDate(t.targetDeadline)}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
