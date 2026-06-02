import * as React from 'react';
import { cn } from '@/lib/utils';

// Lightweight Command component (no cmdk dependency)
interface CommandContextValue {
  search: string;
  setSearch: (v: string) => void;
}
const CommandContext = React.createContext<CommandContextValue>({ search: '', setSearch: () => {} });

export function Command({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [search, setSearch] = React.useState('');
  return (
    <CommandContext.Provider value={{ search, setSearch }}>
      <div
        className={cn('flex flex-col overflow-hidden rounded-md bg-white', className)}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

export function CommandInput({ placeholder, className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const { search, setSearch } = React.useContext(CommandContext);
  return (
    <div className="flex items-center border-b border-slate-200 px-3">
      <input
        className={cn(
          'flex h-9 w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400',
          className,
        )}
        placeholder={placeholder ?? 'Search...'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        {...props}
      />
    </div>
  );
}

export function CommandEmpty({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('py-6 text-center text-sm text-slate-500', className)}>
      {children}
    </div>
  );
}

export function CommandGroup({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('overflow-y-auto p-1', className)}>
      {children}
    </div>
  );
}

interface CommandItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  value?: string;
  onSelect?: (value: string) => void;
}

export function CommandItem({ children, className, value, onSelect, ...props }: CommandItemProps) {
  const { search } = React.useContext(CommandContext);
  const label = typeof children === 'string' ? children : (value ?? '');
  if (search && !label.toLowerCase().includes(search.toLowerCase())) return null;
  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'hover:bg-slate-100 aria-selected:bg-slate-100',
        className,
      )}
      onClick={() => onSelect?.(value ?? '')}
      {...props}
    >
      {children}
    </div>
  );
}
