import { Plus, Edit2 } from 'lucide-react';

interface Activity {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

interface ProjectActivitiesTabProps {
  activities: Activity[];
  isAdmin: boolean;
  projectIsActive: boolean;
  onAdd: () => void;
  onEdit: (act: Activity) => void;
}

export const ProjectActivitiesTab = ({
  activities,
  isAdmin,
  projectIsActive,
  onAdd,
  onEdit
}: ProjectActivitiesTabProps) => {
  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight">Project Activities</h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Project-specific activity categories for time tracking.</p>
        </div>
        {isAdmin && projectIsActive && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 bg-[#12161F] hover:bg-slate-800 text-white px-5 py-2 rounded-full font-bold text-xs shadow-xs transition-all duration-200 active:scale-[0.97] cursor-pointer font-sans"
          >
            <Plus className="w-4 h-4" /> Create Activity
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="py-12 text-center text-slate-500 border border-dashed border-slate-200/80 rounded-[14px] bg-slate-50/50">
          <Edit2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-800 font-sans">No activities created yet</p>
          <p className="text-xs text-slate-400 font-sans mt-1">
            {isAdmin ? 'Click "Create Activity" to add activities.' : 'No activities configured for this project.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-[14px] overflow-hidden shadow-2xs bg-white">
          {activities.map((a, idx) => (
            <div key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                    ACT-{String(idx + 1).padStart(2, '0')}
                  </span>
                  <p className="font-semibold text-xs sm:text-sm text-slate-900 font-sans">{a.name}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold font-sans border ${
                    a.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {a.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                {a.description && (
                  <p className="text-xs text-slate-500 font-sans">{a.description}</p>
                )}
              </div>
              {isAdmin && projectIsActive && (
                <button
                  onClick={() => onEdit(a)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Edit Activity"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
