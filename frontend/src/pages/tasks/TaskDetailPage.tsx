import { useState, useRef, type RefObject } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Upload, Eye, Download, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useFetch } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, label, DOCUMENT_TYPES } from '@/lib/utils';
import type { RegistrationTask, Manufacturer, Product, RegistrationCertificateHistory, ClassificationResultHistory } from '@/types';
import { StatusStepper } from './StatusStepper';

export function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: task, loading, refetch } = useFetch<RegistrationTask>(`/tasks/${id}`);
  const { data: users } = useFetch<{ id: string; fullName: string }[]>('/users/selectable');
  const { data: mfgs } = useFetch<Manufacturer[]>('/manufacturers');
  const { data: products } = useFetch<Product[]>('/products');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading || !task) {
    return (
      <>
        <PageHeader title="Task" />
        <Skeleton className="h-96" />
      </>
    );
  }

  const confirmStatus = async () => {
    if (!pendingStatus) return;
    setBusy(true);
    try {
      await api.post(`/tasks/${id}/status`, { status: pendingStatus, note: statusNote || undefined });
      toast.success(`Status changed to ${label(pendingStatus)}`);
      setPendingStatus(null);
      setStatusNote('');
      refetch();
    } catch {
      /* */
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={task.taskCode}
        description={task.title}
        actions={
          <Button variant="secondary" onClick={() => navigate('/tasks')}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[35%_1fr]">
        {/* Left panel — sticky */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={task.status} />
              <StatusBadge status={task.priority} />
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Type</dt>
                <dd className="font-medium">{label(task.taskType)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Responsible</dt>
                <dd className="font-medium">{task.responsible?.fullName ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Supervisor</dt>
                <dd className="font-medium">{task.supervisor?.fullName ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Deadline</dt>
                <dd className="font-medium">{formatDate(task.targetDeadline)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Rework Count</dt>
                <dd className="font-medium">{task.reworkCount}</dd>
              </div>
            </dl>
          </Card>
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Workflow</h3>
            <StatusStepper current={task.status} onPick={(s) => setPendingStatus(s)} />
          </Card>
        </div>

        {/* Right panel — tabs */}
        <Card className="p-6">
          <Tabs defaultValue="general">
            <TabsList className="flex-wrap">
              <TabsTrigger value="general">General Info</TabsTrigger>
              <TabsTrigger value="products">Products &amp; Case</TabsTrigger>
              <TabsTrigger value="docs">Document Collection</TabsTrigger>
              <TabsTrigger value="submission">Submission &amp; Results</TabsTrigger>
              <TabsTrigger value="activity">Comments &amp; Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralTab task={task} users={users ?? []} onSaved={refetch} />
            </TabsContent>
            <TabsContent value="products">
              <ProductsCaseTab
                task={task}
                mfgs={mfgs ?? []}
                products={products ?? []}
                onSaved={refetch}
              />
            </TabsContent>
            <TabsContent value="docs">
              <DocsTab task={task} products={products ?? []} onSaved={refetch} />
            </TabsContent>
            <TabsContent value="submission">
              <SubmissionTab task={task} onSaved={refetch} />
            </TabsContent>
            <TabsContent value="activity">
              <ActivityTab task={task} userId={user!.id} onSaved={refetch} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <AlertDialog open={!!pendingStatus} onOpenChange={(o) => !o && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change status?</AlertDialogTitle>
            <AlertDialogDescription>
              Move task from <strong>{label(task.status)}</strong> to{' '}
              <strong>{label(pendingStatus ?? '')}</strong>. This may sync product commercial status
              and notify the supervisor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label>Note (optional)</Label>
            <Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatus(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatus} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SaveBtn({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <Button onClick={onClick} disabled={busy} className="mt-4">
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {busy ? 'Đang lưu...' : 'Save'}
    </Button>
  );
}

function GeneralTab({
  task,
  users,
  onSaved,
}: {
  task: RegistrationTask;
  users: { id: string; fullName: string }[];
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    taskType: task.taskType,
    title: task.title,
    priority: task.priority,
    responsibleId: task.responsibleId ?? '',
    supervisorId: task.supervisorId ?? '',
    targetDeadline: task.targetDeadline ? task.targetDeadline.slice(0, 10) : '',
    remarks: task.remarks ?? '',
    observerIds: task.observers?.map((o) => o.user.id) ?? [],
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/tasks/${task.id}/general`, {
        ...f,
        responsibleId: f.responsibleId || null,
        supervisorId: f.supervisorId || null,
        targetDeadline: f.targetDeadline || null,
      });
      toast.success('Task updated');
      onSaved();
    } catch {
      /* */
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 space-y-1">
        <Label required>Title</Label>
        <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Task Type</Label>
        <Select value={f.taskType} onValueChange={(v) => setF({ ...f, taskType: v as never })}>
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
        <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v as never })}>
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
        <Select value={f.responsibleId} onValueChange={(v) => setF({ ...f, responsibleId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Supervisor</Label>
        <Select value={f.supervisorId} onValueChange={(v) => setF({ ...f, supervisorId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Target Deadline</Label>
        <Input
          type="date"
          value={f.targetDeadline}
          onChange={(e) => setF({ ...f, targetDeadline: e.target.value })}
        />
      </div>
      <div className="col-span-2 space-y-1">
        <Label>Observers</Label>
        <div className="flex flex-wrap gap-3 rounded-md border border-slate-200 p-3">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={f.observerIds.includes(u.id)}
                onCheckedChange={(c) =>
                  setF({
                    ...f,
                    observerIds: c
                      ? [...f.observerIds, u.id]
                      : f.observerIds.filter((x) => x !== u.id),
                  })
                }
              />
              {u.fullName}
            </label>
          ))}
        </div>
      </div>
      <div className="col-span-2 space-y-1">
        <Label>Remarks</Label>
        <Textarea value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} />
      </div>
      <div className="col-span-2">
        <SaveBtn onClick={save} busy={busy} />
      </div>
    </div>
  );
}

function ProductsCaseTab({
  task,
  products,
  onSaved,
}: {
  task: RegistrationTask;
  mfgs: Manufacturer[];
  products: Product[];
  onSaved: () => void;
}) {
  const c = task.case;
  const reg = task.productRegistration;
  const linkedIds = (task.taskProducts ?? []).map((tp) => tp.product.id);
  const [selectedIds, setSelectedIds] = useState<string[]>(linkedIds);
  const [caseNotes, setCaseNotes] = useState(c?.caseNotes ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await Promise.all([
        api.put(`/tasks/${task.id}/products`, { productIds: selectedIds }),
        api.put(`/tasks/${task.id}/case`, { caseNotes }),
      ]);
      toast.success('Case updated');
      onSaved();
    } catch {
      /* */
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <div className="space-y-4">
      {/* Read-only: primary registration info */}
      {reg && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-2 text-sm">
          <div className="font-semibold text-blue-800 mb-2">Primary Registration</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">Product:</span>{' '}
              <span className="font-medium">{reg.product?.productNameEn}</span>
            </div>
            <div>
              <span className="text-slate-500">Code:</span>{' '}
              <span className="font-mono text-xs">{reg.product?.manufacturerProductCode}</span>
            </div>
            <div>
              <span className="text-slate-500">Manufacturer:</span>{' '}
              <span>{reg.product?.manufacturer?.name}</span>
            </div>
            <div>
              <span className="text-slate-500">License Holder:</span>{' '}
              <span>{reg.licenseHolder?.name}</span>
            </div>
            <div>
              <span className="text-slate-500">Ownership:</span>{' '}
              <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                reg.ownershipType === 'VMED_OWNED' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {reg.ownershipType === 'VMED_OWNED' ? 'VMED Owned' : 'Monitored'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Reg. No.:</span>{' '}
              <span>{reg.registrationNo ?? '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Products in this case */}
      <div className="space-y-1">
        <Label>Products in this case</Label>
        <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 p-2 space-y-1">
          {products.length === 0 ? (
            <p className="text-sm text-slate-400 px-1">No products available</p>
          ) : (
            products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm px-1 py-0.5 hover:bg-slate-50 rounded cursor-pointer">
                <Checkbox
                  checked={selectedIds.includes(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                />
                <span className="font-mono text-xs text-slate-500 w-28 shrink-0">{p.manufacturerProductCode}</span>
                <span className="truncate">{p.productNameEn}</span>
                <span className="text-slate-400 text-xs shrink-0">{p.manufacturer?.name}</span>
              </label>
            ))
          )}
        </div>
        {selectedIds.length > 0 && (
          <p className="text-xs text-slate-500">{selectedIds.length} product(s) selected</p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Case Notes</Label>
        <Textarea value={caseNotes} onChange={(e) => setCaseNotes(e.target.value)} />
      </div>
      <SaveBtn onClick={save} busy={busy} />
    </div>
  );
}

function DocsTab({
  task,
  products,
  onSaved,
}: {
  task: RegistrationTask;
  products: Product[];
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    documentType: 'APPLICATION_LETTER',
    documentNumber: '',
    appliesTo: 'ENTIRE_CASE',
    productIds: [] as string[],
    issuedDate: '',
    expiryDate: '',
    status: 'COLLECTED',
    hasHardcopy: false,
    notes: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const caseProducts = products;

  const upload = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('taskId', task.id);
      fd.append('documentType', f.documentType);
      if (f.documentNumber) fd.append('documentNumber', f.documentNumber);
      fd.append('appliesTo', f.appliesTo);
      fd.append('status', f.status);
      fd.append('hasHardcopy', String(f.hasHardcopy));
      if (f.issuedDate) fd.append('issuedDate', f.issuedDate);
      if (f.expiryDate) fd.append('expiryDate', f.expiryDate);
      if (f.notes) fd.append('notes', f.notes);
      if (f.appliesTo === 'SPECIFIC_PRODUCTS') fd.append('productIds', JSON.stringify(f.productIds));
      files.forEach((file) => fd.append('files', file));
      await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document(s) uploaded');
      setFiles([]);
      setF({ ...f, documentNumber: '', notes: '' });
      onSaved();
    } catch {
      /* */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Document Type</Label>
          <Select
            value={f.documentType}
            onValueChange={(v) => setF({ ...f, documentType: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Document Number</Label>
          <Input
            value={f.documentNumber}
            onChange={(e) => setF({ ...f, documentNumber: e.target.value })}
            placeholder="Optional reference number"
          />
        </div>
        <div className="space-y-1">
          <Label>Applies To</Label>
          <Select value={f.appliesTo} onValueChange={(v) => setF({ ...f, appliesTo: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ENTIRE_CASE">Entire Case</SelectItem>
              <SelectItem value="SPECIFIC_PRODUCTS">Specific Products</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['MISSING', 'COLLECTED', 'ACCEPTED', 'NEED_UPDATE', 'EXPIRED'].map((s) => (
                <SelectItem key={s} value={s}>
                  {label(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Issued Date</Label>
          <Input
            type="date"
            value={f.issuedDate}
            onChange={(e) => setF({ ...f, issuedDate: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Expiry Date</Label>
          <Input
            type="date"
            value={f.expiryDate}
            onChange={(e) => setF({ ...f, expiryDate: e.target.value })}
          />
        </div>
      </div>

      {f.appliesTo === 'SPECIFIC_PRODUCTS' && (
        <div className="space-y-1">
          <Label>Products</Label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
            {caseProducts.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={f.productIds.includes(p.id)}
                  onCheckedChange={(c) =>
                    setF({
                      ...f,
                      productIds: c
                        ? [...f.productIds, p.id]
                        : f.productIds.filter((x) => x !== p.id),
                    })
                  }
                />
                {p.manufacturerProductCode} — {p.productNameEn}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label>Files (max 100MB each)</Label>
        <div className="rounded-md border-2 border-dashed border-slate-300 p-6 text-center">
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="text-sm"
          />
          {files.length > 0 && (
            <ul className="mt-3 space-y-1 text-left text-xs text-slate-600">
              {files.map((file) => (
                <li key={file.name} className="flex justify-between">
                  <span>{file.name}</span>
                  <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={f.hasHardcopy}
          onCheckedChange={(c) => setF({ ...f, hasHardcopy: !!c })}
        />
        Hardcopy Available (Đã có bản cứng)
      </label>
      <SaveBtn onClick={upload} busy={busy} />

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Uploaded documents</h3>
        <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {(task.documents ?? []).length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">No documents yet</p>
          ) : (
            (task.documents ?? []).map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  {d.documentNumber ?? label(d.documentType)}{' '}
                  <span className="text-slate-400">({label(d.documentType)})</span>
                </span>
                <div className="flex items-center gap-3">
                  <StatusBadge status={d.status} />
                  {d.id && (
                    <a
                      className="text-xs text-blue-600 hover:underline"
                      href={`/api/v1/files/download/${d.id}?source=task`}
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- helpers ---- */
function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function CertHistorySection({
  title,
  current,
  history,
  onUpload,
  uploading,
  uploadRef,
}: {
  title: string;
  current: RegistrationCertificateHistory | ClassificationResultHistory | null;
  history: Array<RegistrationCertificateHistory | ClassificationResultHistory>;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
  uploadRef: RefObject<HTMLInputElement>;
}) {
  const [expanded, setExpanded] = useState(false);
  const past = history.filter((h) => !h.isCurrent);

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-slate-700">{title}</h4>
        <div className="flex items-center gap-2">
          <input
            ref={uploadRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {uploading ? 'Uploading...' : 'Upload New Version'}
          </Button>
        </div>
      </div>

      {current ? (
        <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500 shrink-0" />
              <div>
                <p className="font-medium text-slate-800">{current.fileName}</p>
                <p className="text-xs text-slate-500">
                  {fmt(current.fileSize)} · Uploaded {formatDate(current.createdAt)}
                  {current.uploadedBy ? ` by ${current.uploadedBy.fullName}` : ''}
                </p>
                {current.documentNumber && (
                  <p className="text-xs text-slate-500">Ref: {current.documentNumber}</p>
                )}
                {current.issuedDate && (
                  <p className="text-xs text-slate-500">Issued: {formatDate(current.issuedDate)}</p>
                )}
                {current.expiryDate && (
                  <p className="text-xs text-slate-500">Expires: {formatDate(current.expiryDate)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/api/v1/files/preview/${current.id}?source=registration`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <Eye className="h-3 w-3" /> Preview
              </a>
              <a
                href={`/api/v1/files/download/${current.id}?source=registration`}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <Download className="h-3 w-3" /> Download
              </a>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">No certificate uploaded yet.</p>
      )}

      {past.length > 0 && (
        <div className="mt-3">
          <button
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            History ({past.length} older version{past.length !== 1 ? 's' : ''})
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {past.map((h) => (
                <div key={h.id} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{h.fileName}</p>
                      <p className="text-slate-400">
                        {fmt(h.fileSize)} · {formatDate(h.createdAt)}
                        {h.uploadedBy ? ` by ${h.uploadedBy.fullName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`/api/v1/files/preview/${h.id}?source=registration`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Preview
                      </a>
                      <a
                        href={`/api/v1/files/download/${h.id}?source=registration`}
                        className="text-blue-600 hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionTab({ task, onSaved }: { task: RegistrationTask; onSaved: () => void }) {
  const c = task.case;
  const reg = task.productRegistration;
  const [f, setF] = useState({
    submissionDate: c?.submissionDate ? c.submissionDate.slice(0, 10) : '',
    applicationNo: c?.applicationNo ?? '',
    registrationNo: c?.registrationNo ?? '',
    registrationExpiry: c?.registrationExpiry ? c.registrationExpiry.slice(0, 10) : '',
    classificationNumber: c?.classificationNumber ?? '',
    approvalDate: c?.approvalDate ? c.approvalDate.slice(0, 10) : '',
    completionNotes: c?.completionNotes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [certHistory, setCertHistory] = useState<RegistrationCertificateHistory[]>(
    task.certificateUploads ?? [],
  );
  const [classHistory, setClassHistory] = useState<ClassificationResultHistory[]>(
    task.classificationUploads ?? [],
  );
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadingClass, setUploadingClass] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);
  const classInputRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/tasks/${task.id}/submission`, {
        ...f,
        submissionDate: f.submissionDate || null,
        registrationExpiry: f.registrationExpiry || null,
        approvalDate: f.approvalDate || null,
      });
      toast.success('Submission saved & products synced');
      onSaved();
    } catch {
      /* */
    } finally {
      setBusy(false);
    }
  };

  const uploadCert = async (file: File) => {
    if (!reg?.id) { toast.error('No linked registration. Link a product registration first.', { duration: Infinity }); return; }
    setUploadingCert(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('taskId', task.id);
      const { data } = await api.post(`/certificates/registration/${reg.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCertHistory((prev) => [data, ...prev.map((h) => ({ ...h, isCurrent: false }))]);
      toast.success('Registration certificate uploaded');
    } catch {
      /* */
    } finally {
      setUploadingCert(false);
    }
  };

  const uploadClass = async (file: File) => {
    const productId = reg?.product?.id ?? reg?.productId ?? task.taskProducts?.[0]?.product?.id;
    if (!productId) { toast.error('No linked product. Add products in the Products & Case tab first.', { duration: Infinity }); return; }
    setUploadingClass(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('taskId', task.id);
      const { data } = await api.post(`/certificates/classification/${productId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setClassHistory((prev) => [data, ...prev.map((h) => ({ ...h, isCurrent: false }))]);
      toast.success('Classification result uploaded');
    } catch {
      /* */
    } finally {
      setUploadingClass(false);
    }
  };

  const currentCert = certHistory.find((h) => h.isCurrent) ?? null;
  const currentClass = classHistory.find((h) => h.isCurrent) ?? null;

  return (
    <div className="space-y-6">
      {/* Submission fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Submission Date</Label>
          <Input
            type="date"
            value={f.submissionDate}
            onChange={(e) => setF({ ...f, submissionDate: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Application No.</Label>
          <Input
            value={f.applicationNo}
            onChange={(e) => setF({ ...f, applicationNo: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Số ĐKLH (Registration No.)</Label>
          <Input
            value={f.registrationNo}
            onChange={(e) => setF({ ...f, registrationNo: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Registration Expiry</Label>
          <Input
            type="date"
            value={f.registrationExpiry}
            onChange={(e) => setF({ ...f, registrationExpiry: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Classification Number</Label>
          <Input
            value={f.classificationNumber}
            onChange={(e) => setF({ ...f, classificationNumber: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Approval Date</Label>
          <Input
            type="date"
            value={f.approvalDate}
            onChange={(e) => setF({ ...f, approvalDate: e.target.value })}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Completion Notes</Label>
          <Textarea
            value={f.completionNotes}
            onChange={(e) => setF({ ...f, completionNotes: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <SaveBtn onClick={save} busy={busy} />
        </div>
      </div>

      {/* Certificate history sections */}
      <div className="border-t border-slate-200 pt-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Certificate Files</h3>
        <CertHistorySection
          title="Registration Certificate (Số ĐKLH)"
          current={currentCert}
          history={certHistory}
          onUpload={uploadCert}
          uploading={uploadingCert}
          uploadRef={certInputRef}
        />
        <CertHistorySection
          title="Classification Result"
          current={currentClass}
          history={classHistory}
          onUpload={uploadClass}
          uploading={uploadingClass}
          uploadRef={classInputRef}
        />
      </div>
    </div>
  );
}

function ActivityTab({
  task,
  userId,
  onSaved,
}: {
  task: RegistrationTask;
  userId: string;
  onSaved: () => void;
}) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await api.post(`/tasks/${task.id}/comments`, { content: comment });
      setComment('');
      onSaved();
    } catch {
      /* */
    } finally {
      setBusy(false);
    }
  };
  const del = async (cid: string) => {
    await api.delete(`/tasks/comments/${cid}`).catch(() => {});
    onSaved();
  };
  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Comments</h3>
        <div className="mb-3 space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
          />
          <Button size="sm" onClick={add} disabled={busy}>
            {busy ? 'Đang lưu...' : 'Post'}
          </Button>
        </div>
        <div className="space-y-3">
          {(task.comments ?? []).map((cm) => (
            <div key={cm.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">{cm.user.fullName}</span>
                <span>{formatDateTime(cm.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{cm.content}</p>
              {cm.user.id === userId && (
                <button
                  className="mt-1 text-xs text-red-600 hover:underline"
                  onClick={() => del(cm.id)}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
          {(task.comments ?? []).length === 0 && (
            <p className="text-sm text-slate-400">No comments yet</p>
          )}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Activity Log</h3>
        <div className="space-y-2">
          {(task.statusHistory ?? []).map((h) => (
            <div key={h.id} className="border-l-2 border-slate-200 pl-3 text-sm">
              <p className="text-slate-700">
                {h.fromStatus ? `${label(h.fromStatus)} → ` : ''}
                <span className="font-medium">{label(h.toStatus)}</span>
              </p>
              <p className="text-xs text-slate-400">
                {h.changedBy?.fullName ?? 'System'} · {formatDateTime(h.changedAt)}
                {h.note ? ` · ${h.note}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
