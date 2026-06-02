import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, Download, Pencil, CheckCircle2, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useFetch } from '@/hooks/useApi';
import { formatDate, label, DOCUMENT_TYPES } from '@/lib/utils';
import { api } from '@/lib/api';
import type { RegistrationDocument, Manufacturer } from '@/types';

const ALL = '__all__';

function HardcopyBadge({ has, date }: { has: boolean; date?: string | null }) {
  if (has) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600" title={date ? `Received: ${formatDate(date)}` : 'Has copy'}>
        <CheckCircle2 className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-slate-300" title="Not yet received">
      <Clock className="h-4 w-4" />
    </span>
  );
}

interface EditForm {
  documentNumber: string;
  issuedDate: string;
  expiryDate: string;
  status: string;
  notes: string;
  hasHardcopy: boolean;
  hardcopyReceivedDate: string;
  hasOriginal: boolean;
  originalReceivedDate: string;
  hardcopyNotes: string;
}

function EditDocumentPanel({
  doc,
  onClose,
  onSaved,
}: {
  doc: RegistrationDocument;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditForm>({
    documentNumber: doc.documentNumber ?? '',
    issuedDate: doc.issuedDate ? doc.issuedDate.slice(0, 10) : '',
    expiryDate: doc.expiryDate ? doc.expiryDate.slice(0, 10) : '',
    status: doc.status ?? 'COLLECTED',
    notes: doc.notes ?? '',
    hasHardcopy: doc.hasHardcopy ?? false,
    hardcopyReceivedDate: doc.hardcopyReceivedDate ? doc.hardcopyReceivedDate.slice(0, 10) : '',
    hasOriginal: doc.hasOriginal ?? false,
    originalReceivedDate: doc.originalReceivedDate ? doc.originalReceivedDate.slice(0, 10) : '',
    hardcopyNotes: doc.hardcopyNotes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof EditForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const source = doc._source ?? 'task';
      await api.put(`/documents/${doc.id}?source=${source}`, {
        documentNumber: form.documentNumber || null,
        issuedDate: form.issuedDate || null,
        expiryDate: form.expiryDate || null,
        status: form.status,
        notes: form.notes || null,
        hasHardcopy: form.hasHardcopy,
        hardcopyReceivedDate: form.hardcopyReceivedDate || null,
        hasOriginal: form.hasOriginal,
        originalReceivedDate: form.originalReceivedDate || null,
        hardcopyNotes: form.hardcopyNotes || null,
      });
      toast.success('Document updated');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-white shadow-xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Edit Document</h2>
            <p className="text-xs text-slate-500 mt-0.5">{label(doc.documentType)}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Basic info */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Document Number</Label>
              <Input
                className="mt-1"
                placeholder="e.g. CFS-2024-001"
                value={form.documentNumber}
                onChange={(e) => set('documentNumber', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700">Issued Date</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.issuedDate}
                  onChange={(e) => set('issuedDate', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Expiry Date</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.expiryDate}
                  onChange={(e) => set('expiryDate', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['MISSING', 'COLLECTED', 'ACCEPTED', 'NEED_UPDATE', 'EXPIRED'].map((s) => (
                    <SelectItem key={s} value={s}>{label(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Notes</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Optional notes..."
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Hardcopy / Original tracking */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-4">
            <p className="text-sm font-semibold text-slate-700">📁 Bản gốc / Hardcopy</p>
            <p className="text-xs text-slate-500">Theo dõi tình trạng thu hồi chứng từ gốc từ hãng, phục vụ thanh tra, hậu kiểm.</p>

            {/* Hardcopy */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasHardcopy"
                  checked={form.hasHardcopy}
                  onCheckedChange={(c) => set('hasHardcopy', !!c)}
                />
                <label htmlFor="hasHardcopy" className="text-sm text-slate-700 cursor-pointer">
                  Đã có Bản hardcopy
                </label>
              </div>
              {form.hasHardcopy && (
                <div className="ml-6">
                  <Label className="text-xs text-slate-500">Ngày nhận hardcopy</Label>
                  <Input
                    type="date"
                    className="mt-1 h-8 text-sm"
                    value={form.hardcopyReceivedDate}
                    onChange={(e) => set('hardcopyReceivedDate', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Original */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasOriginal"
                  checked={form.hasOriginal}
                  onCheckedChange={(c) => set('hasOriginal', !!c)}
                />
                <label htmlFor="hasOriginal" className="text-sm text-slate-700 cursor-pointer">
                  Đã có Bản original (bản gốc)
                </label>
              </div>
              {form.hasOriginal && (
                <div className="ml-6">
                  <Label className="text-xs text-slate-500">Ngày nhận bản gốc</Label>
                  <Input
                    type="date"
                    className="mt-1 h-8 text-sm"
                    value={form.originalReceivedDate}
                    onChange={(e) => set('originalReceivedDate', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Notes for hardcopy tracking */}
            <div>
              <Label className="text-xs text-slate-500">Ghi chú thu hồi chứng từ</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Ghi chú về tình trạng thu hồi bản gốc..."
                value={form.hardcopyNotes}
                onChange={(e) => set('hardcopyNotes', e.target.value)}
              />
            </div>
          </div>

          {/* File info (read-only) */}
          {doc.fileName && (
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500 mb-1">File đính kèm</p>
              <p className="text-sm text-slate-700 font-mono truncate">{doc.fileName}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
        </div>
      </div>
    </div>
  );
}

export function DocumentsPage() {
  const location = useLocation();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [editDoc, setEditDoc] = useState<RegistrationDocument | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle navigation from Dashboard with pre-applied expiry filter
  useEffect(() => {
    const state = location.state as { expiryRange?: string } | null;
    if (state?.expiryRange) {
      setFilters((f) => ({ ...f, expiryRange: state.expiryRange! }));
      // Clear state so navigating away and back doesn't re-apply
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const { data, loading } = useFetch<RegistrationDocument[]>(
    '/documents',
    { ...filters, ...(search ? { search } : {}), _refresh: refreshKey },
  );
  const { data: mfgs } = useFetch<Manufacturer[]>('/manufacturers');

  const setF = (k: string, v: string) =>
    setFilters((f) => {
      const n = { ...f };
      if (v === ALL || !v) delete n[k];
      else n[k] = v;
      return n;
    });

  const handlePreview = (doc: RegistrationDocument) => {
    const source = doc._source ?? 'task';
    const url = `/api/v1/files/preview/${doc.id}?source=${source}`;
    window.open(url, '_blank');
  };

  const handleDownload = (doc: RegistrationDocument) => {
    const source = doc._source ?? 'task';
    window.location.href = `/api/v1/files/download/${doc.id}?source=${source}`;
  };

  // Active expiry range banner
  const expiryBanner = filters.expiryRange
    ? filters.expiryRange === '0-30'
      ? { label: 'Expiring in 0–30 days', color: 'bg-red-50 border-red-200 text-red-700' }
      : filters.expiryRange === '31-60'
      ? { label: 'Expiring in 31–60 days', color: 'bg-amber-50 border-amber-200 text-amber-700' }
      : { label: 'Expiring in 61–90 days', color: 'bg-slate-50 border-slate-200 text-slate-700' }
    : null;

  return (
    <div className="p-6">
      <PageHeader title="Documents" description="Unified document view from all sources" />

      {/* Expiry range banner (from Dashboard navigation) */}
      {expiryBanner && (
        <div className={`mb-4 flex items-center justify-between rounded-md border px-4 py-2 text-sm font-medium ${expiryBanner.color}`}>
          <span>🔍 Filter active: {expiryBanner.label}</span>
          <button
            className="text-xs underline opacity-70 hover:opacity-100"
            onClick={() => { setF('expiryRange', ''); }}
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Search document number, notes..."
          className="w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select onValueChange={(v) => setF('documentType', v)}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Types</SelectItem>
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setF('status', v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Statuses</SelectItem>
            {['MISSING', 'COLLECTED', 'ACCEPTED', 'NEED_UPDATE', 'EXPIRED'].map((s) => (
              <SelectItem key={s} value={s}>{label(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setF('source', v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Sources</SelectItem>
            <SelectItem value="task">Task Documents</SelectItem>
            <SelectItem value="registration">Certificates</SelectItem>
            <SelectItem value="classification">Classifications</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setF('hardcopyStatus', v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Hardcopy" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any Hardcopy</SelectItem>
            <SelectItem value="has">Has Hardcopy</SelectItem>
            <SelectItem value="missing">No Hardcopy</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setF('originalStatus', v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Original" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any Original</SelectItem>
            <SelectItem value="has">Has Original</SelectItem>
            <SelectItem value="missing">No Original</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setF('versionFilter', v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Version" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Versions</SelectItem>
            <SelectItem value="current">Current Only</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setF('manufacturerId', v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Manufacturers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Manufacturers</SelectItem>
            {mfgs?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Document No.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Hardcopy Available</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Version</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (data ?? []).length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                  No documents found.
                </td>
              </tr>
            ) : (
              (data ?? []).map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-slate-600">{label(doc.documentType)}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{doc.documentNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                      doc._source === 'task'
                        ? 'bg-slate-100 text-slate-600'
                        : doc._source === 'registration'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-purple-100 text-purple-600'
                    }`}>
                      {doc._source === 'registration'
                        ? 'Certificate'
                        : doc._source === 'classification'
                          ? 'Classification'
                          : `Task: ${doc.task?.taskCode ?? '?'}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {doc.expiryDate ? formatDate(doc.expiryDate) : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                  <td className="px-4 py-3 text-center">
                    <HardcopyBadge has={doc.hasHardcopy || doc.hasOriginal} date={doc.hardcopyReceivedDate ?? doc.originalReceivedDate} />
                  </td>
                  <td className="px-4 py-3">
                    {doc._version ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        doc._version === 'Current'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {doc._version}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {doc.fileName && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Preview"
                            onClick={() => handlePreview(doc)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Download"
                            onClick={() => handleDownload(doc)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit"
                        onClick={() => setEditDoc(doc)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit slide-in panel */}
      {editDoc && (
        <EditDocumentPanel
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
