export const statusColors: Record<string, string> = {
  TODO:        'bg-slate-100 text-slate-600 border-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  REVIEW:      'bg-amber-50 text-amber-700 border-amber-200',
  DONE:        'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const priorityColors: Record<string, string> = {
  LOW:    'bg-slate-100 text-slate-500',
  MEDIUM: 'bg-sky-50 text-sky-700',
  HIGH:   'bg-orange-50 text-orange-700',
  URGENT: 'bg-rose-50 text-rose-700',
};

export const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '--';

export const isOverdue = (d?: string | null, status?: string) => {
  if (!d || status === 'DONE') return false;
  return new Date(d) < new Date();
};