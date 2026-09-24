import { Plus, Edit2, MapPin } from 'lucide-react';

interface Milestone {
  id: string;
  name: string;
  description?: string | null;
  targetDate: string;
  status: string;
}

interface ProjectMilestonesTabProps {
  milestones: Milestone[];
  tasks?: any[]; // Passed in to show associated tasks
  isAdmin: boolean;
  projectIsActive: boolean;
  onAdd: () => void;
  onEdit: (m: Milestone) => void;
}

export const ProjectMilestonesTab = ({
  milestones,
  tasks = [],
  isAdmin,
  projectIsActive,
  onAdd,
  onEdit
}: ProjectMilestonesTabProps) => {

  const sortedMilestones = [...milestones].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-display">Project Milestones</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">High-level phase markers and target dates.</p>
        </div>
        {isAdmin && projectIsActive && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Milestone
          </button>
        )}
      </div>

      {sortedMilestones.length === 0 ? (
        <div className="py-16 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <MapPin className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-800 font-display">No milestones defined yet</p>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin ? 'Click "Add Milestone" to set up project phases.' : 'No milestones configured for this project.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 relative">
          {/* Vertical line for timeline effect */}
          <div className="absolute left-[27px] top-[24px] bottom-[24px] w-0.5 bg-slate-200/80 z-0 hidden sm:block"></div>
          
          {sortedMilestones.map((m) => (
            <div key={m.id} className="relative z-10 flex flex-col sm:flex-row items-start gap-4 p-4 sm:p-0 bg-white sm:bg-transparent border border-slate-200/80 sm:border-none rounded-2xl sm:rounded-none shadow-2xs sm:shadow-none">
              <div className="hidden sm:flex shrink-0 items-center justify-center w-[56px] h-[56px]">
                 <div className={`w-4 h-4 rounded-full border-2 ${
                    m.status === 'ACHIEVED' ? 'bg-emerald-500 border-emerald-200' :
                    m.status === 'IN_PROGRESS' ? 'bg-blue-500 border-blue-200' :
                    m.status === 'MISSED' ? 'bg-rose-500 border-rose-200' :
                    'bg-slate-300 border-slate-100'
                 }`}></div>
              </div>
              <div className="flex-1 bg-white sm:border border-slate-200/80 sm:rounded-2xl sm:shadow-2xs p-0 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 font-display">{m.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      m.status === 'ACHIEVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : m.status === 'IN_PROGRESS'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                        : m.status === 'MISSED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        : 'bg-slate-100 text-slate-700 border border-slate-200/80'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">
                      Target: {new Date(m.targetDate).toLocaleDateString()}
                    </span>
                  </div>
                  {m.description && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 mb-3">{m.description}</p>
                  )}
                  
                  {/* Tasks List */}
                  {(() => {
                    const mTasks = tasks.filter(t => t.milestoneId === m.id);
                    if (mTasks.length === 0) return null;
                    return (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 w-full">
                        <p className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">
                          Tasks ({mTasks.length})
                        </p>
                        <div className="space-y-1.5">
                          {mTasks.map(t => (
                            <div key={t.id} className="flex items-center gap-2 bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border shrink-0 ${
                                t.status === 'DONE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                t.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                t.status === 'REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {t.status.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-slate-700 font-medium truncate flex-1">{t.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {isAdmin && projectIsActive && (
                  <button
                    onClick={() => onEdit(m)}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Edit Milestone"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
