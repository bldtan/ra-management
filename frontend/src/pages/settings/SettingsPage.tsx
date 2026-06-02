import { useState } from 'react';
import { Plus, Pencil, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import { formatDateTime, label, DOCUMENT_TYPES } from '@/lib/utils';
import type { User, ViewerManufacturerPermission, ViewerDocumentTypePermission } from '@/types';

// Map of manufacturer ID → doc type permissions being edited
type DocTypePermsByMfg = Record<string, Array<{ documentType: string; canView: boolean }>>;

export function SettingsPage() {
  const { data: users, loading, refetch } = useFetch<User[]>('/users');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'RA_STAFF',
    isActive: true,
  });
  const [perms, setPerms] = useState<ViewerManufacturerPermission[] | null>(null);
  const [docTypePerms, setDocTypePerms] = useState<DocTypePermsByMfg>({});
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ email: '', password: '', fullName: '', role: 'RA_STAFF', isActive: true });
    setPerms(null);
    setDocTypePerms({});
    setOpen(true);
  };

  const openEdit = async (u: User) => {
    setEditing(u);
    setForm({ email: u.email, password: '', fullName: u.fullName, role: u.role, isActive: !!u.isActive });
    setPerms(null);
    setDocTypePerms({});
    if (u.role === 'VIEWER') {
      const { data } = await api.get<ViewerManufacturerPermission[]>(`/users/${u.id}/permissions`);
      setPerms(data);
      // Load doc type perms for manufacturers where canViewDocuments is true
      const byMfg: DocTypePermsByMfg = {};
      for (const p of data) {
        if (p.canViewDocuments) {
          try {
            const { data: dtPerms } = await api.get<ViewerDocumentTypePermission[]>(
              `/users/${u.id}/viewer-permissions/${p.manufacturerId}/doc-types`,
            );
            byMfg[p.manufacturerId] = DOCUMENT_TYPES.map((dt) => ({
              documentType: dt.value,
              canView: dtPerms.find((dp) => dp.documentType === dt.value)?.canView ?? false,
            }));
          } catch {
            byMfg[p.manufacturerId] = DOCUMENT_TYPES.map((dt) => ({ documentType: dt.value, canView: false }));
          }
        }
      }
      setDocTypePerms(byMfg);
    }
    setOpen(true);
  };

  const handleRoleChange = async (newRole: string) => {
    setForm({ ...form, role: newRole });
    if (newRole === 'VIEWER' && editing) {
      const { data } = await api.get<ViewerManufacturerPermission[]>(`/users/${editing.id}/permissions`);
      setPerms(data);
    } else if (newRole !== 'VIEWER') {
      setPerms(null);
      setDocTypePerms({});
    }
  };

  const handleViewDocChange = async (mfgId: string, manufacturerName: string, checked: boolean) => {
    setPerms((ps) =>
      ps!.map((p) => p.manufacturerId === mfgId ? { ...p, canViewDocuments: checked } : p),
    );
    // Initialize doc type perms for this manufacturer when enabling
    if (checked && !docTypePerms[mfgId]) {
      setDocTypePerms((prev) => ({
        ...prev,
        [mfgId]: DOCUMENT_TYPES.map((dt) => ({ documentType: dt.value, canView: false })),
      }));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      let userId = editing?.id;
      if (editing) {
        await api.put(`/users/${editing.id}`, {
          fullName: form.fullName,
          role: form.role,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        const { data } = await api.post('/users', form);
        userId = data.id;
      }
      if (perms && userId) {
        await api.put(`/users/${userId}/permissions`, perms);
        // Save doc type perms for manufacturers with view documents enabled
        for (const p of perms) {
          if (p.canViewDocuments && docTypePerms[p.manufacturerId]) {
            await api.put(
              `/users/${userId}/viewer-permissions/${p.manufacturerId}/doc-types`,
              docTypePerms[p.manufacturerId],
            );
          }
        }
      }
      toast.success(editing ? 'Account updated' : 'Account created');
      setOpen(false);
      refetch();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (u: User) => {
    await api.post(`/users/${u.id}/deactivate`).catch(() => {});
    toast.success('Account deactivated');
    refetch();
  };

  const canViewDocsMfgs = (perms ?? []).filter((p) => p.canViewDocuments);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Account management & viewer permissions"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Account
          </Button>
        }
      />
      <Card>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Name', 'Email', 'Role', 'Status', 'Last Login', ''].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading…</td>
              </tr>
            ) : (
              (users ?? []).map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium">{u.fullName}</td>
                  <td className="px-6 py-3">{u.email}</td>
                  <td className="px-6 py-3">{label(u.role)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td className="px-6 py-3">{formatDateTime(u.lastLoginAt)}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {u.isActive && (
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deactivate(u)}>
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Account' : 'New Account'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input value={form.email} disabled={!!editing} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{editing ? 'New Password (optional)' : 'Password *'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={handleRoleChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['LEGAL_HEAD', 'RA_STAFF', 'VIEWER'].map((r) => (
                    <SelectItem key={r} value={r}>{label(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <Checkbox checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: !!c })} />
                Active
              </label>
            )}
          </div>

          {form.role === 'VIEWER' && perms && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ShieldCheck className="h-4 w-4" /> Viewer Permissions — General
              </div>
              <div className="rounded-md border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Manufacturer</th>
                      <th className="px-2 py-2 text-center">Products</th>
                      <th className="px-2 py-2 text-center">Documents</th>
                      <th className="px-2 py-2 text-center">Download</th>
                      <th className="px-2 py-2 text-center">KPI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {perms.map((p, i) => (
                      <tr key={p.manufacturerId}>
                        <td className="px-3 py-2 font-medium">{p.manufacturerName}</td>
                        {([ 'canViewProducts', 'canViewDocuments', 'canDownloadDocuments', 'canViewKpi' ] as const).map((k) => (
                          <td key={k} className="px-2 py-2 text-center">
                            <Checkbox
                              checked={p[k]}
                              onCheckedChange={(c) => {
                                if (k === 'canViewDocuments') {
                                  handleViewDocChange(p.manufacturerId, p.manufacturerName, !!c);
                                } else {
                                  setPerms((ps) => ps!.map((x, j) => j === i ? { ...x, [k]: !!c } : x));
                                }
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Document Type Permissions — per manufacturer where canViewDocuments = true */}
              {canViewDocsMfgs.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-2">
                    Document Type Permissions
                  </div>
                  {canViewDocsMfgs.map((p) => {
                    const dtPerms = docTypePerms[p.manufacturerId] ?? [];
                    const allChecked = dtPerms.every((d) => d.canView);
                    return (
                      <div key={p.manufacturerId} className="mb-3">
                        <div className="text-xs font-medium text-slate-600 mb-1 px-1">{p.manufacturerName}</div>
                        <div className="rounded border border-slate-200 p-2 grid grid-cols-2 gap-1">
                          <label className="col-span-2 flex items-center gap-2 text-xs font-medium text-blue-600 cursor-pointer pb-1 border-b border-slate-100">
                            <Checkbox
                              checked={allChecked}
                              onCheckedChange={(c) => {
                                setDocTypePerms((prev) => ({
                                  ...prev,
                                  [p.manufacturerId]: DOCUMENT_TYPES.map((dt) => ({ documentType: dt.value, canView: !!c })),
                                }));
                              }}
                            />
                            {allChecked ? 'Clear All' : 'Select All'}
                          </label>
                          {DOCUMENT_TYPES.map((dt) => {
                            const checked = dtPerms.find((dp) => dp.documentType === dt.value)?.canView ?? false;
                            return (
                              <label key={dt.value} className="flex items-center gap-2 text-xs cursor-pointer">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(c) => {
                                    setDocTypePerms((prev) => ({
                                      ...prev,
                                      [p.manufacturerId]: (prev[p.manufacturerId] ?? DOCUMENT_TYPES.map((d) => ({ documentType: d.value, canView: false }))).map((dp) =>
                                        dp.documentType === dt.value ? { ...dp, canView: !!c } : dp,
                                      ),
                                    }));
                                  }}
                                />
                                {dt.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
