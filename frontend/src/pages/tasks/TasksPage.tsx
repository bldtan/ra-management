import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFetch } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDate, label } from '@/lib/utils';
import type { RegistrationTask } from '@/types';

const ALL = '__all__';

export function TasksPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, string>>(
    sp.get('status') ? { status: sp.get('status') as string } : {},
  );
  const { data, loading, refetch } = useFetch<RegistrationTask[]>('/tasks', filters);
  const { data: users } = useFetch<{ id: string; fullName: string }[]>('/users/selectable');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    taskType: 'NEW_REGISTRATION',
    title: '',
    priority: 'NORMAL',
    responsibleId: '',
    supervisorId: '',
    targetDeadline: '',
  });

  const setF = (k: string, v: string) =>
    setFilters((f) => {
      const n = { ...f };
      if (v === ALL || !v) delete n[k];
      else n[k] = v;
      return n;
    });

  const create = async () => {
    if (!form.title.trim()) return toast.error('Title is required', { duration: Infinity });
    setSaving(true);
    try {
      const { data } = await api.post('/tasks', {
        ...form,
        responsibleId: form.responsibleId || undefined,
        supervisorId: form.supervisorId || undefined,
        targetDeadline: form.targetDeadline || null,
      });
      toast.success(`Task ${data.taskCode} created`);
      setOpen(false);
      navigate(`/tasks/${data.id}`);
    } catch {
      /* */
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<RegistrationTask, unknown>[] = [
    {
      accessorKey: 'taskCode',
      header: 'Code',
      cell: ({ row }) => (
        <button
          className="font-medium text-blue-600 hover:underline"
          onClick={() => navigate(`/tasks/${row.original.id}`)}
        >
          {row.original.taskCode}
        </button>
      ),
    },
    { accessorKey: 'title', header: 'Title' },
    { id: 'type', header: 'Type', cell: ({ row }) => label(row.original.taskType) },
    {
      id: 'resp',
      header: 'Responsible',
      cell: ({ row }) => row.original.responsible?.fullName ?? '—',
    },
    {
      id: 'mfg',
      header: 'Manufacturer',
      cell: ({ row }) => row.original.productRegistration?.product?.manufacturer?.name ?? '—',
    },
    {
      id: 'licenseHolder',
      header: 'License Holder',
      cell: ({ row }) => row.original.productRegistration?.licenseHolder?.name ?? '—',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'priority',
      header: 'Priority',
      cell: ({ row }) => <StatusBadge status={row.original.priority} />,
    },
    {
      id: 'deadline',
      header: 'Deadline',
      cell: ({ row }) => formatDate(row.original.targetDeadline),
    },
    { accessorKey: 'reworkCount', header: 'Rework' },
  ];

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Registration tasks and workflow"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Task
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          value={filters.status ?? ALL}
          onValueChange={(v) => setF('status', v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {[
              'NEW',
              'DOC_COLLECTION',
              'DOSSIER_PREP',
              'SUBMITTED',
              'REWORK_REQUIRED',
              'RESUBMITTED',
              'COMPLETED',
              'CANCELLED',
            ].map((s) => (
              <SelectItem key={s} value={s}>
                {label(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setF('priority', v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {['HIGH', 'NORMAL', 'LOW'].map((s) => (
              <SelectItem key={s} value={s}>
                {label(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        loading={loading}
        searchPlaceholder="Search by code, title, staff..."
        emptyIcon={ClipboardList}
        emptyTitle="No tasks found"
        emptyActionLabel="New Task"
        onEmptyAction={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label required>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Task Type</Label>
                <Select
                  value={form.taskType}
                  onValueChange={(v) => setForm({ ...form, taskType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['NEW_REGISTRATION', 'RENEWAL', 'CHANGE_NOTIFICATION', 'REVOCATION'].map((t) => (
                      <SelectItem key={t} value={t}>
                        {label(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['HIGH', 'NORMAL', 'LOW'].map((t) => (
                      <SelectItem key={t} value={t}>
                        {label(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Responsible</Label>
                <Select
                  value={form.responsibleId}
                  onValueChange={(v) => setForm({ ...form, responsibleId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(users ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Supervisor</Label>
                <Select
                  value={form.supervisorId}
                  onValueChange={(v) => setForm({ ...form, supervisorId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(users ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Target Deadline</Label>
              <Input
                type="date"
                value={form.targetDeadline}
                onChange={(e) => setForm({ ...form, targetDeadline: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
