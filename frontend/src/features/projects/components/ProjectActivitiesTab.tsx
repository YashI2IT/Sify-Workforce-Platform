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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-display">Project Activities</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Project-specific activity categories for time tracking.</p>
        </div>
        {isAdmin && projectIsActive && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create Activity
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="py-16 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <Edit2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-800 font-display">No activities created yet</p>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin ? 'Click "Create Activity" to add activities.' : 'No activities configured for this project.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs bg-white">
          {activities.map((a) => (
            <div key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-xs sm:text-sm text-slate-900 font-display">{a.name}</p>
                  {!a.isActive && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-500">
                      Inactive
                    </span>
                  )}
                </div>
                {a.description && (
                  <p className="text-xs text-slate-500">{a.description}</p>
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
