import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Building2 } from 'lucide-react';
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
import { formatDate } from '@/lib/utils';
import type { ManufacturingPlant, Manufacturer } from '@/types';

const empty = {
  manufacturerId: '',
  plantName: '',
  country: '',
  address: '',
  iso13485CertNo: '',
  iso13485Expiry: '',
  status: 'ACTIVE',
};

export function PlantsPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'LEGAL_HEAD' || user?.role === 'RA_STAFF';
  const { data, loading, refetch } = useFetch<ManufacturingPlant[]>('/plants');
  const { data: mfgs } = useFetch<Manufacturer[]>('/manufacturers');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManufacturingPlant | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (p: ManufacturingPlant) => {
    setEditing(p);
    setForm({
      manufacturerId: p.manufacturerId,
      plantName: p.plantName,
      country: p.country ?? '',
      address: p.address ?? '',
      iso13485CertNo: p.iso13485CertNo ?? '',
      iso13485Expiry: p.iso13485Expiry ? p.iso13485Expiry.slice(0, 10) : '',
      status: p.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.manufacturerId || !form.plantName.trim())
      return toast.error('Manufacturer and Plant Name are required', { duration: Infinity });
    setSaving(true);
    try {
      const payload = { ...form, iso13485Expiry: form.iso13485Expiry || null };
      if (editing) await api.put(`/plants/${editing.id}`, payload);
      else await api.post('/plants', payload);
      toast.success(editing ? 'Plant updated' : 'Plant created');
      setOpen(false);
      refetch();
    } catch {
      /* */
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<ManufacturingPlant, unknown>[] = [
    { accessorKey: 'plantName', header: 'Plant Name' },
    {
      id: 'mfg',
      header: 'Manufacturer',
      cell: ({ row }) => row.original.manufacturer?.name ?? '—',
    },
    { accessorKey: 'country', header: 'Country', cell: (c) => c.getValue() || '—' },
    { accessorKey: 'iso13485CertNo', header: 'ISO 13485 No', cell: (c) => c.getValue() || '—' },
    {
      id: 'expiry',
      header: 'ISO Expiry',
      cell: ({ row }) => formatDate(row.original.iso13485Expiry),
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
        title="Manufacturing Plants"
        description="Production sites linked to manufacturers"
        actions={
          canWrite && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Plant
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={data ?? []}
        loading={loading}
        searchPlaceholder="Search plants..."
        emptyIcon={Building2}
        emptyTitle="No plants yet"
        emptyActionLabel={canWrite ? 'New Plant' : undefined}
        onEmptyAction={canWrite ? openCreate : undefined}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Plant' : 'New Plant'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label required>Manufacturer</Label>
              <Select
                value={form.manufacturerId}
                onValueChange={(v) => setForm({ ...form, manufacturerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {(mfgs ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label required>Plant Name</Label>
              <Input
                value={form.plantName}
                onChange={(e) => setForm({ ...form, plantName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Country</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>ISO 13485 Cert No</Label>
                <Input
                  value={form.iso13485CertNo}
                  onChange={(e) => setForm({ ...form, iso13485CertNo: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ISO 13485 Expiry</Label>
                <Input
                  type="date"
                  value={form.iso13485Expiry}
                  onChange={(e) => setForm({ ...form, iso13485Expiry: e.target.value })}
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
            <div className="space-y-1">
              <Label>Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
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
