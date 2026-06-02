import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useFetch } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';

interface Metrics {
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  reworkCount: number;
  avgCompletionDays: number;
  reworkRate: number;
  onTimeRate: number;
  firstPassRate: number;
}
interface Movement {
  month: string;
  completed: number;
  created: number;
}

function MetricGrid({ m }: { m: Metrics }) {
  const items = [
    ['Active Tasks', m.activeTasks],
    ['Completed Tasks', m.completedTasks],
    ['Overdue Tasks', m.overdueTasks],
    ['Rework Count', m.reworkCount],
    ['Avg Completion Days', m.avgCompletionDays],
    ['Rework Rate', `${m.reworkRate}%`],
    ['On-time Rate', `${m.onTimeRate}%`],
    ['First-pass Rate', `${m.firstPassRate}%`],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map(([k, v]) => (
        <Card key={k} className="p-4">
          <p className="text-sm text-slate-500">{k}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{v}</p>
        </Card>
      ))}
    </div>
  );
}

function PersonalView() {
  const [range, setRange] = useState({ from: '', to: '' });
  const { data, loading } = useFetch<{ metrics: Metrics; movement: Movement[] }>(
    '/kpi/personal',
    range.from || range.to ? range : undefined,
  );
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="space-y-1">
          <Label>From</Label>
          <Input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </div>
      </div>
      {loading || !data ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <MetricGrid m={data.metrics} />
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Monthly Movement</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.movement}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="created" fill="#60a5fa" name="Created" />
                <Bar dataKey="completed" fill="#16a34a" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}

function TeamView() {
  const { data, loading } =
    useFetch<{ userId: string; fullName: string; metrics: Metrics }[]>('/kpi/team');
  if (loading || !data) return <Skeleton className="h-40" />;
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {['Staff', 'Active', 'Completed', 'Overdue', 'Rework', 'Avg Days', 'On-time %', 'First-pass %'].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((u) => (
            <tr key={u.userId} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium">{u.fullName}</td>
              <td className="px-4 py-3">{u.metrics.activeTasks}</td>
              <td className="px-4 py-3">{u.metrics.completedTasks}</td>
              <td className="px-4 py-3">{u.metrics.overdueTasks}</td>
              <td className="px-4 py-3">{u.metrics.reworkCount}</td>
              <td className="px-4 py-3">{u.metrics.avgCompletionDays}</td>
              <td className="px-4 py-3">{u.metrics.onTimeRate}%</td>
              <td className="px-4 py-3">{u.metrics.firstPassRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PerformancePage() {
  const { user } = useAuth();
  const isHead = user?.role === 'LEGAL_HEAD';
  return (
    <>
      <PageHeader title="RA Performance" description="KPI metrics and trends" />
      {isHead ? (
        <Card className="p-6">
          <Tabs defaultValue="personal">
            <TabsList>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
            <TabsContent value="personal">
              <PersonalView />
            </TabsContent>
            <TabsContent value="team">
              <TeamView />
            </TabsContent>
          </Tabs>
        </Card>
      ) : (
        <Card className="p-6">
          <PersonalView />
        </Card>
      )}
    </>
  );
}
