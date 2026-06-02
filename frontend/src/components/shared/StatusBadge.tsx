import { Badge } from '@/components/ui/badge';
import { label } from '@/lib/utils';

const GREEN = 'bg-green-100 text-green-700 border-green-200';
const SLATE = 'bg-slate-100 text-slate-600 border-slate-200';
const RED = 'bg-red-100 text-red-700 border-red-200';
const AMBER = 'bg-amber-100 text-amber-700 border-amber-200';
const CYAN = 'bg-cyan-100 text-cyan-700 border-cyan-200';
const BLUE = 'bg-blue-100 text-blue-700 border-blue-200';

const MAP: Record<string, string> = {
  ACTIVE: GREEN,
  COMPLETED: GREEN,
  ACCEPTED: GREEN,
  REGISTERED: GREEN,
  CANCELLED: SLATE,
  INACTIVE: SLATE,
  INACTIVE_LICENSE_PENDING: SLATE,
  INACTIVE_LICENSE_REVOKED: RED,
  VMED_OWNED: BLUE,
  MONITORED: AMBER,
  NOT_STARTED: SLATE,
  MISSING: SLATE,
  OVERDUE: RED,
  EXPIRED: RED,
  REWORK_REQUIRED: AMBER,
  NEED_UPDATE: AMBER,
  HIGH: RED,
  LOW: SLATE,
  NORMAL: SLATE,
  SUBMITTED: CYAN,
  RESUBMITTED: CYAN,
  COLLECTED: CYAN,
  NEW: BLUE,
  IN_PROGRESS: BLUE,
  DOC_COLLECTION: BLUE,
  DOSSIER_PREP: BLUE,
};

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-slate-400">—</span>;
  return <Badge className={MAP[status] ?? SLATE}>{label(status)}</Badge>;
}
