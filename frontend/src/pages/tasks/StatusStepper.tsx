import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { label } from '@/lib/utils';

const STEPS = [
  'NEW',
  'DOC_COLLECTION',
  'DOSSIER_PREP',
  'SUBMITTED',
  'REWORK_REQUIRED',
  'RESUBMITTED',
  'COMPLETED',
  'CANCELLED',
] as const;

export function StatusStepper({
  current,
  onPick,
}: {
  current: string;
  onPick: (s: string) => void;
}) {
  const curIdx = STEPS.indexOf(current as (typeof STEPS)[number]);

  return (
    <div className="space-y-2">
      {STEPS.map((s, i) => {
        const past = i < curIdx;
        const isCurrent = i === curIdx;
        return (
          <div key={s} className="flex items-center gap-3">
            <div className="relative flex flex-col items-center">
              <button
                type="button"
                onClick={() => !isCurrent && onPick(s)}
                disabled={isCurrent}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                  past && 'border-green-600 bg-green-600 text-white',
                  isCurrent && 'pulse-node border-blue-600 bg-blue-600 text-white',
                  !past && !isCurrent && 'border-slate-300 bg-white text-slate-400 hover:border-blue-400',
                )}
              >
                {past ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    'absolute top-7 h-7 w-0.5',
                    past ? 'bg-green-600' : 'border-l-2 border-dashed border-slate-300',
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                'py-1 text-sm',
                isCurrent ? 'font-semibold text-blue-600' : past ? 'text-slate-700' : 'text-slate-400',
              )}
            >
              {label(s)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
