import { useState } from 'react';
import { toast } from 'sonner';
import { Upload, CheckCircle2, AlertTriangle, XCircle, Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api } from '@/lib/api';

interface PreviewRow {
  rowNo: number;
  data: Record<string, string>;
  status: 'OK' | 'WARNING' | 'ERROR';
  messages: string[];
  selected: boolean;
}

function TemplateDownloadBar({ importType }: { importType: 'NEW_PRODUCTS' | 'LEGACY_PRODUCTS' }) {
  const isNew = importType === 'NEW_PRODUCTS';
  const endpoint = isNew ? '/import/template/new-products' : '/import/template/legacy-products';
  const filename = isNew ? 'RA_Import_NewProducts.xlsx' : 'RA_Import_LegacyProducts.xlsx';
  const columns = isNew
    ? ['Manufacturer Product Code *', 'Product Name EN *', 'Product Name VN *', 'Manufacturer *',
       'Manufacturing Plant *', 'Country of Origin *', 'License Holder *', 'Risk Class * (A/B/C/D/NA/PENDING)', 'ERP Product Code']
    : ['Manufacturer Product Code *', 'Product Name EN *', 'Product Name VN *', 'Manufacturer *',
       'Manufacturing Plant *', 'Country of Origin *', 'License Holder *', 'Risk Class * (A/B/C/D)',
       'ERP Product Code', 'Số ĐKLH *', 'Classification Number *', 'Ownership Type * (VMED_OWNED/MONITORED)'];

  const handleDownload = async () => {
    try {
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
    } catch {
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-800 mb-1">
            📥 Download Template trước khi nhập dữ liệu
          </p>
          <p className="text-xs text-blue-600 mb-2">
            Template gồm {columns.length} cột. Dùng dấu <strong>;</strong> để phân cách nhiều Plants hoặc Countries.
          </p>
          <div className="flex flex-wrap gap-1">
            {columns.map((c, i) => (
              <span
                key={i}
                className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono ${
                  c.includes('*') ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
          onClick={handleDownload}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Download Template
        </Button>
      </div>
    </div>
  );
}

function ImportTab({ importType }: { importType: 'NEW_PRODUCTS' | 'LEGACY_PRODUCTS' }) {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: number; warning: number; skipped: number } | null>(null);

  const preview = async (file: File) => {
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('importType', importType);
      const { data } = await api.post('/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRows(data.rows);
      setFileName(data.fileName);
    } catch {
      toast.error('Failed to parse file. Please check the format.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/import/confirm', { importType, fileName, rows });
      setResult(data);
      toast.success(`Import complete: ${data.success} imported, ${data.warning} warnings, ${data.skipped} skipped`);
      setRows([]);
    } catch {
      toast.error('Import failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const selectedCount = rows.filter((r) => r.selected).length;
  const okCount = rows.filter((r) => r.status === 'OK').length;
  const warnCount = rows.filter((r) => r.status === 'WARNING').length;
  const errCount = rows.filter((r) => r.status === 'ERROR').length;

  const icon = (s: string) =>
    s === 'OK' ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : s === 'WARNING' ? (
      <AlertTriangle className="h-4 w-4 text-amber-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );

  return (
    <div className="space-y-4 pt-4">
      {/* Template download bar */}
      <TemplateDownloadBar importType={importType} />

      {/* Upload zone */}
      <div className="rounded-md border-2 border-dashed border-slate-300 p-8 text-center hover:border-blue-400 transition-colors">
        <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
        <p className="mb-1 text-sm font-medium text-slate-700">
          Kéo thả file hoặc chọn file Excel
        </p>
        <p className="mb-3 text-xs text-slate-400">.xlsx hoặc .xls — tối đa 25MB</p>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => e.target.files?.[0] && preview(e.target.files[0])}
          className="text-sm"
          disabled={busy}
        />
        {busy && <p className="mt-2 text-xs text-blue-600 animate-pulse">Đang xử lý...</p>}
      </div>

      {/* Result banner */}
      {result && (
        <Card className="bg-green-50 border-green-200 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Import hoàn tất — {result.success} thành công, {result.warning} cảnh báo, {result.skipped} bỏ qua.
            </span>
          </div>
        </Card>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-4 rounded-md bg-slate-50 px-4 py-2 text-sm">
            <span className="text-slate-600 font-medium">{rows.length} dòng</span>
            <span className="flex items-center gap-1 text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> {okCount} OK
            </span>
            <span className="flex items-center gap-1 text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" /> {warnCount} Warning
            </span>
            <span className="flex items-center gap-1 text-red-700">
              <XCircle className="h-3.5 w-3.5" /> {errCount} Error
            </span>
            <span className="ml-auto text-slate-500">{selectedCount} dòng được chọn</span>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <Checkbox
                      checked={rows.filter(r => r.status !== 'ERROR').every(r => r.selected)}
                      onCheckedChange={(c) =>
                        setRows((rs) => rs.map((x) => x.status === 'ERROR' ? x : { ...x, selected: !!c }))
                      }
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-slate-500 uppercase tracking-wider">Row</th>
                  <th className="px-3 py-2 text-left text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-slate-500 uppercase tracking-wider">Product Code</th>
                  <th className="px-3 py-2 text-left text-slate-500 uppercase tracking-wider">Name EN</th>
                  <th className="px-3 py-2 text-left text-slate-500 uppercase tracking-wider">Manufacturer</th>
                  <th className="px-3 py-2 text-left text-slate-500 uppercase tracking-wider">Messages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr
                    key={r.rowNo}
                    className={
                      r.status === 'ERROR'
                        ? 'bg-red-50'
                        : r.status === 'WARNING'
                        ? 'bg-amber-50'
                        : 'hover:bg-slate-50'
                    }
                  >
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={r.selected}
                        disabled={r.status === 'ERROR'}
                        onCheckedChange={(c) =>
                          setRows((rs) => rs.map((x, j) => (j === i ? { ...x, selected: !!c } : x)))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-500">{r.rowNo}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1 font-medium">
                        {icon(r.status)} {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700">
                      {r.data['Manufacturer Product Code'] ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.data['Product Name EN'] ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {r.data['Manufacturer'] ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-500 max-w-xs">
                      {r.messages.join('; ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={confirm} disabled={busy || selectedCount === 0}>
              {busy ? 'Đang import...' : `Confirm Import (${selectedCount} dòng)`}
            </Button>
            <Button variant="outline" onClick={() => setRows([])}>
              Huỷ
            </Button>
            {selectedCount === 0 && rows.length > 0 && (
              <span className="text-xs text-amber-600">Chọn ít nhất 1 dòng để import</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import Excel"
        description="Bulk import products from Excel template"
      />
      <Card className="p-6">
        <Tabs defaultValue="new">
          <TabsList className="mb-2">
            <TabsTrigger value="new">📋 New Products</TabsTrigger>
            <TabsTrigger value="legacy">📦 Legacy Products (Đã ĐK)</TabsTrigger>
          </TabsList>
          <TabsContent value="new">
            <ImportTab importType="NEW_PRODUCTS" />
          </TabsContent>
          <TabsContent value="legacy">
            <ImportTab importType="LEGACY_PRODUCTS" />
          </TabsContent>
        </Tabs>
      </Card>
    </>
  );
}
