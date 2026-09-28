import { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { useGetProjectTaskTemplatesQuery, useDeleteTaskTemplateMutation } from '../../../store/apiSlice';
import { Plus, Play, Trash2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { TaskFormModal } from './TaskFormModal';

interface TaskTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  isAdmin: boolean;
  projectIsActive: boolean;
  employees: any[];
  tasks: any[];
  onUseTemplate: (template: any) => void;
}

export const TaskTemplatesModal = ({
  isOpen,
  onClose,
  projectId,
  isAdmin,
  projectIsActive,
  employees,
  tasks,
  onUseTemplate,
}: TaskTemplatesModalProps) => {
  const { data: templates = [], isLoading } = useGetProjectTaskTemplatesQuery(projectId, { skip: !isOpen });
  const [deleteTemplate] = useDeleteTaskTemplateMutation();
  const { showToast } = useToast();
  
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteTemplate({ projectId, templateId }).unwrap();
      showToast('Template deleted successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete template', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Task Templates">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate-500">
            Create reusable task templates to quickly spawn common tasks.
          </p>
          {(isAdmin) && projectIsActive && (
            <button
              onClick={() => setIsTemplateFormOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Template</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <p className="text-slate-500 text-sm">No templates found.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {templates.map((tpl: any) => (
              <div key={tpl.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{tpl.name}</h4>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">Generates: {tpl.taskName}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {projectIsActive && (
                      <button
                        onClick={() => {
                          onUseTemplate(tpl);
                          onClose();
                        }}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Use</span>
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {tpl.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-2">{tpl.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-md">
                    {tpl.priority}
                  </span>
                  {tpl.estimatedHours && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-md">
                      {tpl.estimatedHours}h
                    </span>
                  )}
                  {tpl.recurrence && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase rounded-md">
                      {tpl.recurrence}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {isTemplateFormOpen && (
        <TaskFormModal
          isOpen={isTemplateFormOpen}
          onClose={() => setIsTemplateFormOpen(false)}
          projectId={projectId}
          employees={employees}
          tasks={tasks}
          isTemplateMode={true}
        />
      )}
    </>
  );
};
