import { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        className={`relative flex max-h-[90vh] w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} flex-col overflow-hidden rounded-xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'];

export function Avatar({ user, size = 'h-7 w-7 text-xs' }) {
  if (!user) return null;
  const initial = (user.name || '?').charAt(0).toUpperCase();
  const color = AVATAR_COLORS[(user.name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <div
      title={user.name}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${size}`}
    >
      {initial}
    </div>
  );
}

export const STATUS_STYLES = {
  Pending: 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-sky-100 text-sky-700',
  Review: 'bg-amber-100 text-amber-700',
  Done: 'bg-emerald-100 text-emerald-700',
};

export const PRIORITY_STYLES = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-rose-100 text-rose-700',
};

export function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

export function Button({ children, className = '', variant = 'primary', ...props }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', ...props }) {
  return (
    <select
      className={`w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500 ${className}`}
      {...props}
    />
  );
}
