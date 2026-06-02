import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFetch } from '@/hooks/useApi';
import { formatDate, label } from '@/lib/utils';
import type { Product, ProductRegistration } from '@/types';

function Field({ label: l, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-400">{l}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value ?? '—'}</p>
    </div>
  );
}

function OwnershipBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
      type === 'VMED_OWNED' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
    }`}>
      {type === 'VMED_OWNED' ? 'VMED Owned' : 'Monitored'}
    </span>
  );
}

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: p, loading } = useFetch<Product>(`/products/${id}`);

  if (loading || !p) {
    return (
      <>
        <PageHeader title="Product" />
        <Skeleton className="h-64" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={p.manufacturerProductCode}
        description={p.productNameEn}
        actions={
          <Button variant="secondary" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />
      <Card className="p-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-3 gap-5">
              <Field label="Code" value={p.manufacturerProductCode} />
              <Field label="ERP Code" value={p.erpProductCode} />
              <Field label="Risk Class" value={p.riskClass} />
              <Field label="Name EN" value={p.productNameEn} />
              <Field label="Name VN" value={p.productNameVn} />
              <Field label="Manufacturer" value={p.manufacturer?.name} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Manufacturing Plants</p>
                <div className="flex flex-wrap gap-2">
                  {(p.plants ?? []).length === 0 ? (
                    <span className="text-sm text-slate-400">None</span>
                  ) : (
                    (p.plants ?? []).map((pp) => (
                      <span key={pp.plant.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">
                        {pp.plant.plantName}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Countries of Origin</p>
                <div className="flex flex-wrap gap-2">
                  {(p.countries ?? []).length === 0 ? (
                    <span className="text-sm text-slate-400">None</span>
                  ) : (
                    (p.countries ?? []).map((c) => (
                      <span key={c.country} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-mono">
                        {c.country}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="registrations">
            {(p.registrations ?? []).length === 0 ? (
              <p className="py-6 text-center text-slate-400 text-sm">No registrations yet.</p>
            ) : (
              <div className="space-y-4">
                {(p.registrations ?? []).map((reg: ProductRegistration) => (
                  <div key={reg.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-800">{reg.licenseHolder?.name}</span>
                        <OwnershipBadge type={reg.ownershipType} />
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge status={reg.commercialStatus} />
                        <StatusBadge status={reg.workflowStatus} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <Field label="Registration No." value={reg.registrationNo} />
                      <Field label="Application No." value={reg.applicationNo} />
                      <Field label="Classification No." value={reg.classificationNumber} />
                      <Field label="Approval Date" value={formatDate(reg.approvalDate)} />
                      <Field label="Expiry" value={formatDate(reg.registrationExpiry)} />
                      <Field label="Notes" value={reg.notes} />
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Related Tasks</p>
                      <div className="flex flex-wrap gap-2">
                        {(reg.tasks ?? []).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => navigate(`/tasks/${t.id}`)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {t.taskCode} ({label(t.status)})
                          </button>
                        ))}
                        {(reg.tasks ?? []).length === 0 && <span className="text-xs text-slate-400">None</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents">
            <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {(p.classificationHistory ?? []).length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400">No classification history</p>
              ) : (
                (p.classificationHistory ?? []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm">
                      <span className="font-medium">Classification</span>{' '}
                      {c.classificationNumber && <span className="text-slate-500">({c.classificationNumber})</span>}
                      {c.isCurrent && (
                        <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">Current</span>
                      )}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {formatDate(c.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </>
  );
}
