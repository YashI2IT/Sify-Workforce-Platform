import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { useCreateProjectTaskMutation, useUpdateProjectTaskMutation, useCreateTaskTemplateMutation, useGetProjectDetailsQuery } from '../../../store/apiSlice';
import { Select } from '../../../components/ui/Select';
import { Plus, X as XIcon } from 'lucide-react';
import { DatePicker } from '../../../components/ui/DatePicker';

interface Task {
  id: string;
  ticketId: string;
  name: string;
  description?: string | null;
  status: string;
  isActive: boolean;
  priority?: string;
  assigneeId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  parentTaskId?: string | null;
  requirementId?: string | null;
  milestoneId?: string | null;
  recurrence?: string | null;
}

interface Employee {
  id: string;
  name: string;
}

const taskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  description: z.string().min(1, 'Description is required'),
  status: z.string(),
  isActive: z.boolean(),
  priority: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimatedHours: z.number().nonnegative('Estimated hours must be positive').optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  recurrence: z.string().optional().nullable(),
}).refine(data => {
  if (data.startDate && data.dueDate) {
    return new Date(data.startDate) <= new Date(data.dueDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to due date',
  path: ['dueDate'],
});

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  editingTask?: Task | null;
  initialData?: any;
  employees?: Employee[];
  tasks?: Task[];
  isTemplateMode?: boolean;
}

const FIELD_CLS = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-xs sm:text-sm font-sans text-slate-900 placeholder:text-slate-400 font-medium bg-white shadow-2xs transition-all outline-none';
const LABEL_CLS = 'block text-xs font-bold text-slate-700 tracking-tight font-sans mb-1.5';

export const TaskFormModal = ({
  isOpen,
  onClose,
  projectId,
  editingTask,
  initialData,
  employees = [],
  tasks = [],
  isTemplateMode = false,
}: TaskFormModalProps) => {
  const { showToast } = useToast();
  const [createTaskM] = useCreateProjectTaskMutation();
  const [updateTaskM] = useUpdateProjectTaskMutation();
  const [createTemplateM] = useCreateTaskTemplateMutation();

  const { data: project } = useGetProjectDetailsQuery(projectId, { skip: !isOpen || !projectId });

  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [dynamicFields, setDynamicFields] = useState<{key: string, value: string}[]>([]);

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'TODO',
    isActive: true,
    priority: 'MEDIUM',
    assigneeId: '',
    startDate: '',
    dueDate: '',
    estimatedHours: '' as number | string,
    parentTaskId: '',
    recurrence: '',
    templateName: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingTask) {
      setForm({
        name: editingTask.name,
        description: editingTask.description || '',
        status: editingTask.status || 'TODO',
        isActive: editingTask.isActive ?? true,
        priority: editingTask.priority || 'MEDIUM',
        assigneeId: editingTask.assigneeId || '',
        startDate: editingTask.startDate ? new Date(editingTask.startDate).toISOString().split('T')[0] : '',
        dueDate: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: editingTask.estimatedHours ?? '',
        parentTaskId: editingTask.parentTaskId || '',
        recurrence: editingTask.recurrence || '',
        templateName: '',
      });
    } else if (initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
        status: 'TODO',
        isActive: true,
        priority: initialData.priority || 'MEDIUM',
        assigneeId: initialData.assigneeId || '',
        startDate: '',
        dueDate: '',
        estimatedHours: initialData.estimatedHours ?? '',
        parentTaskId: '',
        recurrence: initialData.recurrence || '',
        templateName: '',
      });
    } else {
      setForm({
        name: '',
        description: '',
        status: 'TODO',
        isActive: true,
        priority: 'MEDIUM',
        assigneeId: '',
        startDate: '',
        dueDate: '',
        estimatedHours: '',
        parentTaskId: '',
        recurrence: '',
        templateName: '',
      });
    }
    setErrors({});
    setCustomFields({});
    setDynamicFields([]);
  }, [editingTask, isOpen]);

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrors({});

      const payload = {
        name: form.name,
        description: form.description,
        status: form.status,
        isActive: form.isActive,
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        estimatedHours: form.estimatedHours !== '' ? Number(form.estimatedHours) : null,
        parentTaskId: form.parentTaskId || null,
        recurrence: form.recurrence || null,
        metadata: {
          ...customFields,
          ...Object.fromEntries(dynamicFields.filter(f => f.key.trim()).map(f => [f.key.trim(), f.value.trim()]))
        }
      };

      taskSchema.parse(payload);

      if (isTemplateMode) {
        if (!form.templateName) throw new Error("Template name is required");
        await createTemplateM({
          projectId,
          data: {
            name: form.templateName,
            taskName: form.name,
            description: form.description || undefined,
            priority: form.priority,
            assigneeId: form.assigneeId || null,
            estimatedHours: form.estimatedHours !== '' ? Number(form.estimatedHours) : null,
            recurrence: form.recurrence || null,
          }
        }).unwrap();
        showToast('Template created successfully', 'success');
      } else if (editingTask) {
        await updateTaskM({ projectId, taskId: editingTask.id, data: payload }).unwrap();
        showToast('Task updated successfully', 'success');
      } else {
        await createTaskM({ projectId, data: payload }).unwrap();
        showToast('Task created successfully', 'success');
      }
      onClose();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach(issue => {
          const key = issue.path[0]?.toString() ?? 'general';
          fieldErrors[key] = issue.message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: err.message || 'Failed to save task' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Eligible parent tasks: exclude self and any task that already has this task as ancestor
  const eligibleParents = tasks.filter(t => t.id !== editingTask?.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isTemplateMode ? 'Create Task Template' : (editingTask ? `Edit Task (${editingTask.ticketId})` : 'Create Task')}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.general && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-sans font-medium flex items-center gap-2">
            <span>{errors.general}</span>
          </div>
        )}

        {/* ── BASIC INFORMATION ── */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight font-sans">Basic Information</h3>
          </div>
          <div className="space-y-3.5">
            {isTemplateMode && (
              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Template Name *</label>
                <input
                  type="text"
                  required
                  value={form.templateName}
                  onChange={e => set('templateName', e.target.value)}
                  placeholder="e.g. Weekly Report Template"
                  className={FIELD_CLS}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>
                {isTemplateMode ? 'Task Name *' : <>Name <span className="text-rose-500">*</span></>}
              </label>
              <input
                id="task-name-input"
                type="text"
                required
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Implement login flow"
                className={FIELD_CLS + (errors.name ? ' border-rose-400 ring-rose-100' : '')}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-600 font-medium font-sans">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Description of the task..."
                className={FIELD_CLS + ' resize-none' + (errors.description ? ' border-rose-400 ring-rose-100' : '')}
              />
              {errors.description && <p className="mt-1 text-xs text-rose-600 font-medium font-sans">{errors.description}</p>}
            </div>
          </div>
        </div>

        {/* ── PROJECT CUSTOM FIELDS ── */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight font-sans">Project Custom Fields</h3>
            {dynamicFields.length > 0 && (
              <button 
                type="button" 
                onClick={() => setDynamicFields(prev => [...prev, {key: '', value: ''}])}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 font-sans inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Field
              </button>
            )}
          </div>
          {(!project?.settings?.customFields?.length && dynamicFields.length === 0) ? (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium font-sans">No additional project fields configured.</span>
              <button 
                type="button" 
                onClick={() => setDynamicFields([{key: '', value: ''}])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs transition-all cursor-pointer font-sans"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                Add Field
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {project?.settings?.customFields?.map((field: any) => (
                <div key={field.name} className="space-y-1.5">
                  <label className={LABEL_CLS}>
                    {field.name} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={field.required}
                    value={customFields[field.name] || ''}
                    onChange={e => setCustomFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                    className={FIELD_CLS}
                    placeholder={`Enter ${field.name.toLowerCase()}...`}
                  />
                </div>
              ))}
              
              {dynamicFields.map((df, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      placeholder="Field Name" 
                      value={df.key} 
                      onChange={e => {
                        const newFields = [...dynamicFields];
                        newFields[idx].key = e.target.value;
                        setDynamicFields(newFields);
                      }}
                      className={FIELD_CLS} 
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      placeholder="Value" 
                      value={df.value} 
                      onChange={e => {
                        const newFields = [...dynamicFields];
                        newFields[idx].value = e.target.value;
                        setDynamicFields(newFields);
                      }}
                      className={FIELD_CLS} 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setDynamicFields(prev => prev.filter((_, i) => i !== idx))} 
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    title="Remove field"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button 
                type="button"
                onClick={() => setDynamicFields(prev => [...prev, {key: '', value: ''}])}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 mt-1 inline-flex items-center gap-1.5 font-sans cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add another field
              </button>
            </div>
          )}
        </div>

        {/* ── STATUS, PRIORITY & RECURRENCE ── */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight font-sans">
              {isTemplateMode ? 'Priority & Recurrence' : 'Status, Priority & Recurrence'}
            </h3>
          </div>
          <div className={`grid gap-3.5 ${isTemplateMode ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {!isTemplateMode && (
              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Status</label>
                <Select
                  value={form.status}
                  onChange={val => set('status', val)}
                  className="w-full"
                  options={[
                    { value: 'TODO', label: 'TODO' },
                    { value: 'IN_PROGRESS', label: 'IN PROGRESS' },
                    { value: 'REVIEW', label: 'REVIEW' },
                    { value: 'DONE', label: 'DONE' }
                  ]}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Priority</label>
              <Select
                value={form.priority}
                onChange={val => set('priority', val)}
                className="w-full"
                options={[
                  { value: 'LOW', label: 'LOW' },
                  { value: 'MEDIUM', label: 'MEDIUM' },
                  { value: 'HIGH', label: 'HIGH' },
                  { value: 'URGENT', label: 'URGENT' }
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Recurrence</label>
              <Select
                value={form.recurrence}
                onChange={val => set('recurrence', val)}
                className="w-full"
                options={[
                  { value: '', label: 'None' },
                  { value: 'DAILY', label: 'Daily' },
                  { value: 'WEEKLY', label: 'Weekly' },
                  { value: 'MONTHLY', label: 'Monthly' }
                ]}
              />
            </div>
          </div>
        </div>

        {/* ── ASSIGNMENT ── */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight font-sans">Assignment</h3>
          </div>
          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Assignee</label>
            <Select
              value={form.assigneeId}
              onChange={val => set('assigneeId', val)}
              className="w-full"
              options={[
                { value: '', label: 'Unassigned' },
                ...employees.map(emp => ({ value: emp.id, label: emp.name }))
              ]}
            />
          </div>
        </div>

        {/* ── PLANNING ── */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight font-sans">Planning</h3>
          </div>
          <div className={`grid gap-3.5 ${isTemplateMode ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {!isTemplateMode && (
              <>
                <div className="space-y-1.5">
                  <label className={LABEL_CLS}>Start Date</label>
                  <DatePicker
                    value={form.startDate}
                    onChange={val => set('startDate', val)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={LABEL_CLS}>Due Date</label>
                  <DatePicker
                    value={form.dueDate}
                    onChange={val => set('dueDate', val)}
                    className="w-full"
                    isOverdue={!!errors.dueDate}
                  />
                  {errors.dueDate && <p className="mt-1 text-xs text-rose-600 font-medium font-sans">{errors.dueDate}</p>}
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Est. Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.estimatedHours}
                onChange={e => set('estimatedHours', e.target.value)}
                placeholder="e.g. 8"
                className={FIELD_CLS + (errors.estimatedHours ? ' border-rose-400 ring-rose-100' : '')}
              />
              {errors.estimatedHours && <p className="mt-1 text-xs text-rose-600 font-medium font-sans">{errors.estimatedHours}</p>}
            </div>
          </div>
        </div>

        {/* ── HIERARCHY ── */}
        {!isTemplateMode && (
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight font-sans">Hierarchy</h3>
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Parent Task</label>
              <Select
                value={form.parentTaskId}
                onChange={val => set('parentTaskId', val)}
                className="w-full"
                options={[
                  { value: '', label: 'None (Top Level)' },
                  ...eligibleParents.map(t => ({ value: t.id, label: t.ticketId ? `[${t.ticketId}] ${t.name}` : t.name }))
                ]}
              />
            </div>
          </div>
        )}


        {/* ── ACTIVE STATUS ── */}
        <label htmlFor="taskIsActive" className="group flex items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-400 hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)] transition-all duration-300 cursor-pointer select-none mb-3">
          <div className="space-y-1">
            <span className="text-[13px] font-bold text-slate-900 font-sans block group-hover:text-blue-700 transition-colors">
              {isTemplateMode ? 'Active Template' : 'Active Task'}
            </span>
            <span className="text-[11px] text-slate-500 font-sans block">
              Visible to assigned team members across project views
            </span>
          </div>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              id="taskIsActive"
              checked={form.isActive}
              onChange={e => set('isActive', e.target.checked)}
              className="peer sr-only"
            />
            <div className={`w-10 h-5 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${form.isActive ? 'bg-[#12161F]' : 'bg-slate-200'}`}>
              <div
                className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </div>
          </div>
        </label>

        {/* ── ACTIONS ── */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 cursor-pointer shadow-xs transition-all active:scale-[0.97] font-sans"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#12161F] hover:bg-slate-800 rounded-full disabled:opacity-50 cursor-pointer shadow-xs transition-all active:scale-[0.97] font-sans"
          >
            {submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
