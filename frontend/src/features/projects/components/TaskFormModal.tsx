import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { useCreateProjectTaskMutation, useUpdateProjectTaskMutation, useCreateTaskTemplateMutation } from '../../../store/apiSlice';
import { Select } from '../../../components/ui/Select';
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
  description: z.string().optional(),
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

const FIELD_CLS = 'w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950 focus:border-transparent text-sm bg-white';
const LABEL_CLS = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1';
const SECTION_TITLE = 'text-xs font-bold text-slate-700 uppercase tracking-wider font-mono pb-2 border-b border-slate-100 mb-3';

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
  }, [editingTask, isOpen]);

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrors({});

      const payload = {
        name: form.name,
        description: form.description || undefined,
        status: form.status,
        isActive: form.isActive,
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        estimatedHours: form.estimatedHours !== '' ? Number(form.estimatedHours) : null,
        parentTaskId: form.parentTaskId || null,
        recurrence: form.recurrence || null,
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
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.general && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-mono">
            {errors.general}
          </div>
        )}

        {/* ── BASIC INFORMATION ── */}
        <div>
          <p className={SECTION_TITLE}>Basic Information</p>
          <div className="space-y-3">
            {isTemplateMode && (
              <div>
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
            <div>
              <label className={LABEL_CLS}>{isTemplateMode ? 'Task Name *' : 'Name *'}</label>
              <input
                id="task-name-input"
                type="text"
                required
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Implement login flow"
                className={FIELD_CLS + (errors.name ? ' border-rose-400' : '')}
              />
              {errors.name && <p className="mt-1 text-[11px] text-rose-600">{errors.name}</p>}
            </div>
            <div>
              <label className={LABEL_CLS}>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Optional description..."
                className={FIELD_CLS + ' resize-none'}
              />
            </div>
          </div>
        </div>

        {/* ── STATUS, PRIORITY & RECURRENCE ── */}
        <div>
          <p className={SECTION_TITLE}>{isTemplateMode ? 'Priority & Recurrence' : 'Status, Priority & Recurrence'}</p>
          <div className={`grid gap-3 ${isTemplateMode ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {!isTemplateMode && (
              <div>
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
            <div>
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
            <div>
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
          <p className={SECTION_TITLE}>Assignment</p>
          <div>
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
          <p className={SECTION_TITLE}>Planning</p>
          <div className={`grid gap-3 ${isTemplateMode ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {!isTemplateMode && (
              <>
                <div>
                  <label className={LABEL_CLS}>Start Date</label>
              <DatePicker
                value={form.startDate}
                onChange={val => set('startDate', val)}
                className="w-full"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Due Date</label>
              <DatePicker
                value={form.dueDate}
                onChange={val => set('dueDate', val)}
                className="w-full"
                isOverdue={!!errors.dueDate}
              />
                {errors.dueDate && <p className="mt-1 text-[11px] text-rose-600">{errors.dueDate}</p>}
              </div>
            </>
            )}
            <div>
              <label className={LABEL_CLS}>Est. Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.estimatedHours}
                onChange={e => set('estimatedHours', e.target.value)}
                placeholder="e.g. 8"
                className={FIELD_CLS + (errors.estimatedHours ? ' border-rose-400' : '')}
              />
              {errors.estimatedHours && <p className="mt-1 text-[11px] text-rose-600">{errors.estimatedHours}</p>}
            </div>
          </div>
        </div>

        {/* ── HIERARCHY ── */}
        {!isTemplateMode && (
          <div>
            <p className={SECTION_TITLE}>Hierarchy</p>
            <div className="mt-3">
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
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="taskIsActive"
            checked={form.isActive}
            onChange={e => set('isActive', e.target.checked)}
            className="w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950"
          />
          <label htmlFor="taskIsActive" className="text-sm text-slate-700 font-medium">
            {isTemplateMode ? 'Active Template' : 'Active Task'}
          </label>
        </div>

        {/* ── ACTIONS ── */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium text-white bg-slate-950 border border-transparent rounded-xl hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};