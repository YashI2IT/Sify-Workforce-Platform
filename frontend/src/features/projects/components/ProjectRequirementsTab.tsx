import { Plus, Edit2, ListTodo } from 'lucide-react';

interface Requirement {
  id: string;
  title: string;
  description?: string | null;
  isMandatory: boolean;
  status: string;
}

interface ProjectRequirementsTabProps {
  requirements: Requirement[];
  isAdmin: boolean;
  projectIsActive: boolean;
  onAdd: () => void;
  onEdit: (req: Requirement) => void;
}

export const ProjectRequirementsTab = ({
  requirements,
  isAdmin,
  projectIsActive,
  onAdd,
  onEdit
}: ProjectRequirementsTabProps) => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-display">Project Requirements</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Functional and operational scope definitions.</p>
        </div>
        {isAdmin && projectIsActive && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Requirement
          </button>
        )}
      </div>

      {requirements.length === 0 ? (
        <div className="py-16 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <ListTodo className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-800 font-display">No requirements defined yet</p>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin ? 'Click "Add Requirement" to specify project scope.' : 'No requirements configured for this project.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requirements.map((req) => (
            <div key={req.id} className="p-4 border border-slate-200/80 rounded-2xl hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4 shadow-2xs bg-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 font-display">{req.title}</h4>
                  {req.isMandatory && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200/80">
                      Mandatory
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80">
                    {req.status}
                  </span>
                </div>
                {req.description && (
                  <p className="text-xs sm:text-sm text-slate-600">{req.description}</p>
                )}
              </div>
              {isAdmin && projectIsActive && (
                <button
                  onClick={() => onEdit(req)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Edit Requirement"
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
