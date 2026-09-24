import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { DatePicker } from '../../../components/ui/DatePicker';

interface ReportLayoutProps {
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  loading: boolean;
  error: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onRefresh: () => void;
  children: ReactNode;
  extraFilters?: ReactNode;
}

export function ReportLayout({
  title,
  description,
  icon: Icon,
  loading,
  error,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  children,
  extraFilters,
}: ReportLayoutProps) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white shadow-xs border border-slate-800 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                  {title}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                  Analytics
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Modern Filter Toolbar */}
      <div className="relative z-20 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-end gap-3.5 sm:gap-4">
        <div className="space-y-1.5 min-w-[160px]">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Start Date
          </label>
          <DatePicker 
            value={startDate} 
            onChange={onStartDateChange} 
            className="w-full" 
          />
        </div>

        <div className="space-y-1.5 min-w-[160px]">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            End Date
          </label>
          <DatePicker 
            value={endDate} 
            onChange={onEndDateChange} 
            className="w-full" 
          />
        </div>

        {extraFilters}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-800 text-sm shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Main Content Ledger */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden min-h-[320px] relative">
        {loading && !error && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-10 flex flex-col items-center justify-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-xs font-mono text-slate-500">Compiling analytics dataset...</p>
          </div>
        )}

        {!loading && !error && children}
      </div>
    </div>
  );
}

export function ReportEmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 px-4 text-center">
      {/* Handcrafted Architectural Vector SVG Empty State */}
      <svg className="w-20 h-20 mx-auto text-slate-300 mb-3" viewBox="0 0 120 120" fill="none">
        <rect x="24" y="28" width="72" height="64" rx="10" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" />
        <path d="M40 76V56M60 76V44M80 76V62" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
        <circle cx="88" cy="34" r="10" fill="#0F172A" />
        <path d="M84 34H92M88 30V38" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="text-sm sm:text-base font-bold text-slate-800 font-display">No Analytics Found</p>
      <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">{message}</p>
    </div>
  );
}
