import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useFetch } from '@/hooks/useApi';
import type { Manufacturer, ManufacturingPlant, Product, RiskClass, ProductType, CommercialStatus } from '@/types';

export interface ProductDraft {
  manufacturerProductCode: string;
  productNameEn: string;
  productNameVn: string;
  manufacturerId: string;
  riskClass?: RiskClass | null;
  productType?: ProductType | null;
  commercialStatus?: CommercialStatus | null;
  erpProductCode?: string | null;
  plantIds?: string[];
  countries?: string[];
  licenseHolderIds?: string[];
}

const blank: ProductDraft = {
  manufacturerProductCode: '',
  productNameEn: '',
  productNameVn: '',
  manufacturerId: '',
  riskClass: null,
  productType: null,
  commercialStatus: null,
  erpProductCode: '',
  plantIds: [],
  countries: [],
  licenseHolderIds: [],
};

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'MEDICAL_DEVICE', label: 'Medical Device' },
  { value: 'BIOCIDE', label: 'Biocide' },
  { value: 'COSMETIC', label: 'Cosmetic' },
  { value: 'SPARE_PARTS_ACCESSORIES', label: 'Spare Parts & Accessories' },
  { value: 'GENERAL_GOODS', label: 'General Goods' },
];

const COMMERCIAL_STATUSES: { value: CommercialStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE_LICENSE_PENDING', label: 'Inactive (License Pending)' },
  { value: 'INACTIVE_LICENSE_REVOKED', label: 'Inactive (License Revoked)' },
];

// Common ISO country codes with names
const COUNTRIES = [
  { code: 'CN', name: 'China' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'US', name: 'United States' },
  { code: 'VN', name: 'Vietnam' },
];

function MultiSelect({
  label: labelText,
  options,
  selected,
  onChange,
  placeholder,
  displayKey,
  valueKey,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  displayKey?: string;
  valueKey?: string;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  };

  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .join(', ');

  return (
    <div>
      <Label>{labelText}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between mt-1 h-auto min-h-[36px] font-normal"
          >
            {selected.length > 0 ? (
              <div className="flex flex-wrap gap-1 text-left">
                {selected.map((v) => {
                  const opt = options.find((o) => o.value === v);
                  return (
                    <span
                      key={v}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {opt?.label ?? v}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); toggle(v); }}
                      />
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup className="max-h-48 overflow-auto">
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => toggle(opt.value)}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', selected.includes(opt.value) ? 'opacity-100' : 'opacity-0')}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product?: Product | null;
  initialData?: Partial<ProductDraft> | null;
  onSaved: () => void;
}

export function ProductFormDialog({ open, onOpenChange, product, initialData, onSaved }: Props) {
  const { data: mfgs } = useFetch<Manufacturer[]>('/manufacturers');
  const { data: allPlants } = useFetch<ManufacturingPlant[]>('/plants');
  const [form, setForm] = useState<ProductDraft>(blank);
  const [saving, setSaving] = useState(false);

  const isEditing = !!product;

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        manufacturerProductCode: product.manufacturerProductCode,
        productNameEn: product.productNameEn,
        productNameVn: product.productNameVn,
        manufacturerId: product.manufacturerId,
        riskClass: product.riskClass ?? null,
        productType: product.productType ?? null,
        commercialStatus: product.commercialStatus ?? null,
        erpProductCode: product.erpProductCode ?? '',
        plantIds: (product.plants ?? []).map((pp) => pp.plant.id),
        countries: (product.countries ?? []).map((c) => c.country),
        licenseHolderIds: (product.licenseHolders ?? []).map((lh) => lh.licenseHolder.id),
      });
    } else {
      setForm({ ...blank, ...initialData, plantIds: initialData?.plantIds ?? [], countries: initialData?.countries ?? [], licenseHolderIds: [] });
    }
  }, [open, product, initialData]);

  const plantOptions = (allPlants ?? [])
    .filter((p) => p.manufacturerId === form.manufacturerId)
    .map((p) => ({ value: p.id, label: p.plantName }));

  const countryOptions = COUNTRIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));

  const licenseHolderOptions = (mfgs ?? []).map((m) => ({ value: m.id, label: m.name }));

  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.manufacturerProductCode || !form.productNameEn || !form.productNameVn || !form.manufacturerId) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        manufacturerProductCode: form.manufacturerProductCode,
        productNameEn: form.productNameEn,
        productNameVn: form.productNameVn,
        manufacturerId: form.manufacturerId,
        riskClass: form.riskClass,
        productType: form.productType || null,
        commercialStatus: form.commercialStatus || null,
        erpProductCode: form.erpProductCode || null,
        plantIds: form.plantIds ?? [],
        countries: form.countries ?? [],
        licenseHolderIds: form.licenseHolderIds ?? [],
      };
      if (isEditing) {
        await api.put(`/products/${product.id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product created');
      }
      onSaved();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'New Product'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label>Manufacturer Product Code <span className="text-red-500">*</span></Label>
            <Input
              className="mt-1"
              value={form.manufacturerProductCode}
              onChange={(e) => set('manufacturerProductCode', e.target.value)}
              placeholder="e.g. ACM-1001"
            />
          </div>

          <div>
            <Label>Product Name EN <span className="text-red-500">*</span></Label>
            <Input
              className="mt-1"
              value={form.productNameEn}
              onChange={(e) => set('productNameEn', e.target.value)}
            />
          </div>

          <div>
            <Label>Product Name VN <span className="text-red-500">*</span></Label>
            <Input
              className="mt-1"
              value={form.productNameVn}
              onChange={(e) => set('productNameVn', e.target.value)}
            />
          </div>

          <div>
            <Label>Manufacturer <span className="text-red-500">*</span></Label>
            <Select
              value={form.manufacturerId}
              onValueChange={(v) => { set('manufacturerId', v); set('plantIds', []); }}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select manufacturer" /></SelectTrigger>
              <SelectContent>
                {mfgs?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Risk Class <span className="text-red-500">*</span></Label>
            <Select
              value={form.riskClass ?? ''}
              onValueChange={(v) => set('riskClass', v as RiskClass)}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select risk class" /></SelectTrigger>
              <SelectContent>
                {(['A', 'B', 'C', 'D', 'NA', 'PENDING'] as const).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <MultiSelect
              label="Manufacturing Plants"
              options={plantOptions}
              selected={form.plantIds ?? []}
              onChange={(v) => set('plantIds', v)}
              placeholder="Select plants (multi)"
            />
          </div>

          <div className="col-span-2">
            <MultiSelect
              label="Country of Origin"
              options={countryOptions}
              selected={form.countries ?? []}
              onChange={(v) => set('countries', v)}
              placeholder="Select countries (multi)"
            />
          </div>

          <div className="col-span-2">
            <MultiSelect
              label="License Holder"
              options={licenseHolderOptions}
              selected={form.licenseHolderIds ?? []}
              onChange={(v) => set('licenseHolderIds', v)}
              placeholder="Select license holders (multi)"
            />
          </div>

          <div>
            <Label>Product Type</Label>
            <Select
              value={form.productType ?? ''}
              onValueChange={(v) => set('productType', v ? (v as ProductType) : null)}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select product type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {PRODUCT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Commercial Status</Label>
            <Select
              value={form.commercialStatus ?? ''}
              onValueChange={(v) => set('commercialStatus', v ? (v as CommercialStatus) : null)}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {COMMERCIAL_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>ERP Product Code</Label>
            <Input
              className="mt-1"
              value={form.erpProductCode ?? ''}
              onChange={(e) => set('erpProductCode', e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
