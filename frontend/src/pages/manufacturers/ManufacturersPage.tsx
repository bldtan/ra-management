import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Factory, AlertTriangle } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';
import type { Manufacturer } from '@/types';

interface DupMatch {
  id: string;
  name: string;
  distance: number;
}

export function ManufacturersPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'LEGAL_HEAD' || user?.role === 'RA_STAFF';
  const { data, loading, refetch } = useFetch<Manufacturer[]>('/manufacturers');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Manufacturer | null>(null);
  const [form, setForm] = useState({ name: '', shortName: '', country: '', address: '', status: 'ACTIVE' });
  const [dups, setDups] = useState<DupMatch[]>([]);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', shortName: '', country: '', address: '', status: 'ACTIVE' });
    setDups([]);
    setOpen(true);
  };
  const openEdit = (m: Manufacturer) => {
    setEditing(m);
    setForm({
      name: m.name,
      shortName: m.shortName ?? '',
      country: m.country ?? '',
      address: m.address ?? '',
      status: m.status,
    });
    setDups([]);
    setOpen(true);
  };

  const checkDup = async (name: string) => {
    if (name.trim().length < 3) return setDups([]);
    const { data } = await api.get('/manufacturers/duplicates', {
      params: { name, excludeId: editing?.id },
    });
    setDups(data);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Name is required', { duration: Infinity });
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/manufacturers/${editing.id}`, form);
        toast.success('Manufacturer updated');
      } else {
        await api.post('/manufacturers', form);
        toast.success('Manufacturer created');
      }
      setOpen(false);
      refetch();
    } catch {
      /* toast via interceptor */
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<Manufacturer, unknown>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'shortName', header: 'Short Name', cell: (c) => c.getValue() || '—' },
    { accessorKey: 'country', header: 'Country', cell: (c) => c.getValue() || '—' },
    {
      id: 'plants',
      header: 'Plants',
      cell: ({ row }) => row.original._count?.plants ?? 0,
    },
    {
      id: 'products',
      header: 'Products',
      cell: ({ row }) => row.original._count?.products ?? 0,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) =>
        canWrite && (
          <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Manufacturers"
        description="Manufacturers and license holders"
        actions={
          canWrite && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Manufacturer
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={data ?? []}
        loading={loading}
        searchPlaceholder="Search manufacturers..."
        emptyIcon={Factory}
        emptyTitle="No manufacturers yet"
        emptyDescription="Create your first manufacturer to get started."
        emptyActionLabel={canWrite ? 'New Manufacturer' : undefined}
        onEmptyAction={canWrite ? openCreate : undefined}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Manufacturer' : 'New Manufacturer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label required>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onBlur={(e) => checkDup(e.target.value)}
              />
              {dups.length > 0 && (
                <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                  <p className="flex items-center gap-1 font-medium">
                    <AlertTriangle className="h-3 w-3" /> Possible duplicate(s):
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {dups.map((d) => (
                      <li key={d.id}>
                        {d.name} (distance {d.distance})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Short Name</Label>
                <Input
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
