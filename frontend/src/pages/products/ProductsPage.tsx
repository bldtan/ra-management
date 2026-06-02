import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Copy, ChevronRight, ChevronDown, Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useFetch } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import type { Product, ProductRegistration, Manufacturer } from '@/types';
import { ProductFormDialog, ProductDraft } from './ProductFormDialog';

const ALL = '__all__';

function RegistrationSummaryBadges({ registrations }: { registrations: ProductRegistration[] }) {
  const active = registrations.filter((r) => r.commercialStatus === 'ACTIVE').length;
  const pending = registrations.filter((r) => r.commercialStatus === 'INACTIVE_LICENSE_PENDING').length;
  const revoked = registrations.filter((r) => r.commercialStatus === 'INACTIVE_LICENSE_REVOKED').length;

  if (registrations.length === 0) return <span className="text-slate-400 text-xs">None</span>;

  return (
    <div className="flex gap-1 flex-wrap">
      {active > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
          {active} Active
        </span>
      )}
      {pending > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
          {pending} Pending
        </span>
      )}
      {revoked > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
          {revoked} Revoked
        </span>
      )}
    </div>
  );
}

export function ProductsPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'LEGAL_HEAD' || user?.role === 'RA_STAFF';
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const { data: products, loading, refetch } = useFetch<Product[]>('/products', {
    ...filters,
    ...(search ? { search } : {}),
  });
  const { data: mfgs } = useFetch<Manufacturer[]>('/manufacturers');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [initial, setInitial] = useState<Partial<ProductDraft> | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const setF = (k: string, v: string) =>
    setFilters((f) => {
      const n = { ...f };
      if (v === ALL || !v) delete n[k];
      else n[k] = v;
      return n;
    });

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const duplicate = async (p: Product) => {
    const { data } = await api.get(`/products/${p.id}/duplicate-template`);
    setEditing(null);
    setInitial(data);
    setOpen(true);
  };

  const handleExport = async () => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/products/export?${params}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'products_export.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const ownershipLabel = (type: string) =>
    type === 'VMED_OWNED' ? 'VMED' : 'Monitored';

  return (
    <div className="p-6">
      <PageHeader
        title="Products"
        description="Manage product registrations"
        actions={
          <div className="flex gap-2">
            {canWrite && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" /> Export Excel
              </Button>
            )}
            {canWrite && (
              <Button size="sm" onClick={() => { setEditing(null); setInitial(null); setOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> New Product
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Search code, name..."
          className="w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select onValueChange={(v) => setF('manufacturerId', v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Manufacturers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Manufacturers</SelectItem>
            {mfgs?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setF('riskClass', v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Risk Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Classes</SelectItem>
            {['A', 'B', 'C', 'D', 'NA', 'PENDING'].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setF('licenseHolderId', v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All License Holders" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All License Holders</SelectItem>
            {mfgs?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-8 px-3 py-3"></th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name EN</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name VN</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Manufacturer</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Registrations</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Risk Class</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : products?.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  No products found. {canWrite && 'Click "New Product" to add one.'}
                </td>
              </tr>
            ) : (
              products?.map((product) => {
                const isExpanded = expandedRows.has(product.id);
                return (
                  <>
                    <tr
                      key={product.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggleRow(product.id)}
                    >
                      <td className="px-3 py-3 text-slate-400">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="font-medium text-blue-600 hover:underline"
                          onClick={(e) => { e.stopPropagation(); navigate(`/products/${product.id}`); }}
                        >
                          {product.manufacturerProductCode}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{product.productNameEn}</td>
                      <td className="px-4 py-3 text-slate-600">{product.productNameVn}</td>
                      <td className="px-4 py-3 text-slate-600">{product.manufacturer?.name}</td>
                      <td className="px-4 py-3">
                        <RegistrationSummaryBadges registrations={product.registrations ?? []} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                          {product.riskClass}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {canWrite && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => { setEditing(product); setInitial(null); setOpen(true); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => duplicate(product)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (product.registrations ?? []).length > 0 && (
                      <tr key={`${product.id}-expanded`}>
                        <td colSpan={8} className="p-0">
                          <div className="bg-blue-50/40 border-b border-slate-200">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-blue-50 text-slate-500">
                                  <th className="w-8"></th>
                                  <th className="px-4 py-2 text-left font-medium">License Holder</th>
                                  <th className="px-4 py-2 text-left font-medium">Ownership</th>
                                  <th className="px-4 py-2 text-left font-medium">Reg. No.</th>
                                  <th className="px-4 py-2 text-left font-medium">Expiry</th>
                                  <th className="px-4 py-2 text-left font-medium">Commercial Status</th>
                                  <th className="px-4 py-2 text-left font-medium">Workflow</th>
                                  <th className="px-4 py-2 text-left font-medium">Latest Task</th>
                                  <th className="px-4 py-2 text-left font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(product.registrations ?? []).map((reg) => (
                                  <tr
                                    key={reg.id}
                                    className="border-t border-blue-100 hover:bg-blue-50"
                                  >
                                    <td className="w-8"></td>
                                    <td className="px-4 py-2 font-medium text-slate-700">
                                      {reg.licenseHolder?.name}
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                        reg.ownershipType === 'VMED_OWNED'
                                          ? 'bg-purple-100 text-purple-700'
                                          : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {ownershipLabel(reg.ownershipType)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-slate-600">
                                      {reg.registrationNo ?? '—'}
                                    </td>
                                    <td className="px-4 py-2 text-slate-600">
                                      {reg.registrationExpiry ? formatDate(reg.registrationExpiry) : '—'}
                                    </td>
                                    <td className="px-4 py-2">
                                      <StatusBadge status={reg.commercialStatus} />
                                    </td>
                                    <td className="px-4 py-2">
                                      <StatusBadge status={reg.workflowStatus} />
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">
                                      {(reg.tasks ?? [])[0]?.taskCode ?? '—'}
                                    </td>
                                    <td className="px-4 py-2">
                                      {canWrite && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-6 text-xs px-2"
                                          onClick={() => navigate(`/tasks/new?registrationId=${reg.id}`)}
                                        >
                                          + Task
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    {isExpanded && (product.registrations ?? []).length === 0 && (
                      <tr key={`${product.id}-no-reg`}>
                        <td colSpan={8} className="px-12 py-3 text-xs text-slate-400 bg-slate-50 border-b border-slate-200">
                          No registrations yet.{' '}
                          {canWrite && (
                            <button
                              className="text-blue-600 hover:underline"
                              onClick={() => navigate(`/products/${product.id}`)}
                            >
                              Add from Product Detail
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ProductFormDialog
        open={open}
        onOpenChange={setOpen}
        product={editing}
        initialData={initial}
        onSaved={() => { refetch(); setOpen(false); }}
      />
    </div>
  );
}
