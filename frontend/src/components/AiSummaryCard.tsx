import { useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { Bot, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface AiSummaryCardProps {
  type: 'PROJECT' | 'MANAGER' | 'EMPLOYEE';
  entityId?: string;
  startDate?: string;
  endDate?: string;
}

export function AiSummaryCard({ type, entityId, startDate, endDate }: AiSummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      if (type === 'PROJECT') {
        endpoint = `/ai/project/${entityId}`;
      } else if (type === 'MANAGER') {
        endpoint = `/ai/team?startDate=${startDate}&endDate=${endDate}`;
      } else if (type === 'EMPLOYEE') {
        endpoint = `/ai/me?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const res = await apiClient(endpoint);
      setSummary(res.summary);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI summary');
    } finally {
      setLoading(false);
    }
  };

  const titleMap = {
    PROJECT: 'AI Project Summary',
    MANAGER: 'AI Team Summary',
    EMPLOYEE: 'My Work Summary',
  };

  return (
    <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-950 font-display flex items-center gap-1.5">
              {titleMap[type]}
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </h4>
            <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 font-mono mt-0.5">Assistive Intelligence</p>
          </div>
        </div>
        {!summary && !loading && (
          <button
            onClick={loadSummary}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            Generate
          </button>
        )}
      </div>

      {loading && (
        <div className="py-6 flex flex-col items-center justify-center text-indigo-400 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-xs font-medium">Analyzing factual data...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50/80 rounded-xl border border-red-100 flex items-start gap-3 mt-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {summary && !loading && !error && (
        <div className="mt-4 p-4 bg-white/60 border border-white/80 rounded-xl shadow-xs">
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}
