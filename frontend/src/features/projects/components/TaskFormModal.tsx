import { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { useCreateProjectTaskMutation, useUpdateProjectTaskMutation, useCreateTaskTemplateMutation, useGetProjectDetailsQuery, useUpdateProjectMutation } from '../../../store/apiSlice';
import { Select } from '../../../components/ui/Select';
import { DatePicker } from '../../../components/ui/DatePicker';
import {
  computeNextOccurrencePreview,
  formatRecurrenceSummary,
  validateRecurrenceConfig,
  type RecurrenceConfigUI,
  type RecurrenceFrequency,
} from '../utils/recurrenceHelper';


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
  isConfigMode?: boolean;
  onSuccess?: (task?: any) => void;
  onSaveConfig?: (config?: any) => void;
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
  isConfigMode = false,
  onSuccess,
  onSaveConfig,
}: TaskFormModalProps) => {
  const { showToast } = useToast();
  const [createTaskM] = useCreateProjectTaskMutation();
  const [updateTaskM] = useUpdateProjectTaskMutation();
  const [createTemplateM] = useCreateTaskTemplateMutation();
  const [updateProjectM] = useUpdateProjectMutation();

  const { data: project } = useGetProjectDetailsQuery(projectId, { skip: !isOpen || !projectId });

  const [customFields, setCustomFields] = useState<Record<string, any>>({});

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

  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfigUI>({
    frequency: 'DAILY',
    interval: 1,
    weekdays: [1],
    dayOfMonth: 1,
    scheduleStart: new Date().toISOString().split('T')[0],
    endType: 'NEVER',
    endDate: null,
    maxOccurrences: null,
    timezone: 'Asia/Kolkata',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const previewNextDate = useMemo(() => {
    if (!form.recurrence) return null;
    return computeNextOccurrencePreview({
      ...recurrenceConfig,
      frequency: form.recurrence as RecurrenceFrequency,
    });
  }, [form.recurrence, recurrenceConfig]);

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
      const meta = (editingTask as any)?.metadata || {};
      setCustomFields(meta);

      if (meta.recurrenceConfig) {
        setRecurrenceConfig({
          frequency: meta.recurrenceConfig.frequency || (editingTask.recurrence as any) || 'DAILY',
          interval: meta.recurrenceConfig.interval || 1,
          weekdays: meta.recurrenceConfig.weekdays || [1],
          dayOfMonth: meta.recurrenceConfig.dayOfMonth || 1,
          scheduleStart: meta.recurrenceConfig.scheduleStart || (editingTask.startDate ? new Date(editingTask.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          endType: meta.recurrenceConfig.endType || 'NEVER',
          endDate: meta.recurrenceConfig.endDate || null,
          maxOccurrences: meta.recurrenceConfig.maxOccurrences || null,
          timezone: meta.recurrenceConfig.timezone || 'Asia/Kolkata',
        });
      } else if (editingTask.recurrence) {
        setRecurrenceConfig({
          frequency: editingTask.recurrence as any,
          interval: 1,
          weekdays: [1],
          dayOfMonth: 1,
          scheduleStart: editingTask.startDate ? new Date(editingTask.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          endType: 'NEVER',
          endDate: null,
          maxOccurrences: null,
          timezone: 'Asia/Kolkata',
        });
      }
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
      const meta = (initialData as any)?.metadata || {};
      setCustomFields(meta);
      if (meta.recurrenceConfig) {
        setRecurrenceConfig({
          frequency: meta.recurrenceConfig.frequency || (initialData.recurrence as any) || 'DAILY',
          interval: meta.recurrenceConfig.interval || 1,
          weekdays: meta.recurrenceConfig.weekdays || [1],
          dayOfMonth: meta.recurrenceConfig.dayOfMonth || 1,
          scheduleStart: meta.recurrenceConfig.scheduleStart || new Date().toISOString().split('T')[0],
          endType: meta.recurrenceConfig.endType || 'NEVER',
          endDate: meta.recurrenceConfig.endDate || null,
          maxOccurrences: meta.recurrenceConfig.maxOccurrences || null,
          timezone: meta.recurrenceConfig.timezone || 'Asia/Kolkata',
        });
      }
    } else {
      const defaults = project?.settings?.taskDefaults || {};
      setForm({
        name: defaults.name || '',
        description: defaults.description || '',
        status: defaults.status || 'TODO',
        isActive: defaults.isActive ?? true,
        priority: defaults.priority || 'MEDIUM',
        assigneeId: defaults.assigneeId || '',
        startDate: defaults.startDate || '',
        dueDate: defaults.dueDate || '',
        estimatedHours: defaults.estimatedHours ?? '',
        parentTaskId: defaults.parentTaskId || '',
        recurrence: defaults.recurrence || '',
        templateName: defaults.templateName || '',
      });
      setCustomFields({});
      setRecurrenceConfig({
        frequency: 'DAILY',
        interval: 1,
        weekdays: [1],
        dayOfMonth: 1,
        scheduleStart: new Date().toISOString().split('T')[0],
        endType: 'NEVER',
        endDate: null,
        maxOccurrences: null,
        timezone: 'Asia/Kolkata',
      });
    }
    setErrors({});
  }, [editingTask, isOpen, initialData, project?.settings]);

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleRecurrenceChange = (val: string) => {
    set('recurrence', val);
    if (val) {
      setRecurrenceConfig(prev => ({
        ...prev,
        frequency: val as RecurrenceFrequency,
        scheduleStart: prev.scheduleStart || form.startDate || new Date().toISOString().split('T')[0],
        dayOfMonth: prev.dayOfMonth || (form.startDate ? new Date(form.startDate).getDate() : new Date().getDate()),
        weekdays: prev.weekdays && prev.weekdays.length > 0 ? prev.weekdays : [form.startDate ? new Date(form.startDate).getDay() : new Date().getDay() || 1],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrors({});

      if (isConfigMode) {
        const taskDefaults = {
          name: form.name || '',
          description: form.description || '',
          status: form.status || 'TODO',
          isActive: form.isActive ?? true,
          priority: form.priority || 'MEDIUM',
          assigneeId: form.assigneeId || null,
          estimatedHours: form.estimatedHours !== '' ? Number(form.estimatedHours) : null,
          recurrence: form.recurrence || null,
        };

        const configPayload = {
          settings: {
            customFields: project?.settings?.customFields || [],
            taskDefaults,
          }
        };

        await updateProjectM({ id: projectId, data: configPayload }).unwrap();
        showToast('Task configuration saved successfully', 'success');
        onSaveConfig?.(configPayload.settings);
        onSuccess?.(configPayload.settings);
        onClose();
        return;
      }

      const enrichedMetadata: Record<string, any> = { ...customFields };
      (project?.settings?.customFields || []).forEach((f: any) => {
        const v = enrichedMetadata[f.name] ?? (f.id ? enrichedMetadata[f.id] : undefined);
        if (v !== undefined) {
          enrichedMetadata[f.name] = v;
          if (f.id) enrichedMetadata[f.id] = v;
        }
      });

      if (form.recurrence) {
        const validationError = validateRecurrenceConfig({
          ...recurrenceConfig,
          frequency: form.recurrence as RecurrenceFrequency,
        });
        if (validationError) {
          setErrors({ recurrence: validationError });
          return;
        }

        const calculatedPreview = computeNextOccurrencePreview({
          ...recurrenceConfig,
          frequency: form.recurrence as RecurrenceFrequency,
        });

        enrichedMetadata.recurrenceConfig = {
          frequency: form.recurrence,
          interval: Math.max(1, recurrenceConfig.interval || 1),
          weekdays: form.recurrence === 'WEEKLY' ? (recurrenceConfig.weekdays && recurrenceConfig.weekdays.length > 0 ? recurrenceConfig.weekdays : [1]) : undefined,
          dayOfMonth: form.recurrence === 'MONTHLY' ? (recurrenceConfig.dayOfMonth || 1) : undefined,
          scheduleStart: recurrenceConfig.scheduleStart || form.startDate || new Date().toISOString().split('T')[0],
          nextScheduledAt: calculatedPreview ? calculatedPreview.toISOString() : undefined,
          endType: recurrenceConfig.endType,
          endDate: recurrenceConfig.endType === 'ON_DATE' ? recurrenceConfig.endDate : null,
          maxOccurrences: recurrenceConfig.endType === 'AFTER_COUNT' ? Number(recurrenceConfig.maxOccurrences) : null,
          timezone: recurrenceConfig.timezone || 'Asia/Kolkata',
        };
      } else {
        delete enrichedMetadata.recurrenceConfig;
      }

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
        metadata: enrichedMetadata,
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
        const updated = await updateTaskM({ projectId, taskId: editingTask.id, data: payload }).unwrap();
        showToast('Task updated successfully', 'success');
        onSuccess?.(updated);
      } else {
        const created = await createTaskM({ projectId, data: payload }).unwrap();
        showToast('Task created successfully', 'success');
        onSuccess?.(created);
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
      title={isConfigMode ? 'Configure Task Form & Defaults' : isTemplateMode ? 'Create Task Template' : (editingTask ? `Edit Task (${editingTask.ticketId})` : 'Create Task')}
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
                {isConfigMode ? 'Default Task Name (Optional)' : isTemplateMode ? 'Task Name *' : <>Name <span className="text-rose-500">*</span></>}
              </label>
              <input
                id="task-name-input"
                type="text"
                required={!isConfigMode}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder={isConfigMode ? "Default task name (optional)..." : "e.g. Implement login flow"}
                className={FIELD_CLS + (errors.name ? ' border-rose-400 ring-rose-100' : '')}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-600 font-medium font-sans">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>
                {isConfigMode ? 'Default Description (Optional)' : <>Description <span className="text-rose-500">*</span></>}
              </label>
              <textarea
                rows={3}
                required={!isConfigMode}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder={isConfigMode ? "Default task description (optional)..." : "Description of the task..."}
                className={FIELD_CLS + ' resize-none' + (errors.description ? ' border-rose-400 ring-rose-100' : '')}
              />
              {errors.description && <p className="mt-1 text-xs text-rose-600 font-medium font-sans">{errors.description}</p>}
            </div>

            {/* ── CONFIGURED PROJECT TASK FIELDS ── */}
            {project?.settings?.customFields && project.settings.customFields.length > 0 && (
              project.settings.customFields.map((field: any) => {
                const fieldType = field.type || 'SHORT_TEXT';
                const isRequired = !!field.required;
                const val = (customFields as Record<string, any>)[field.name]
                  ?? (field.id && (customFields as Record<string, any>)[field.id] !== undefined ? (customFields as Record<string, any>)[field.id] : undefined)
                  ?? (field.previousNames?.map((pn: string) => (customFields as Record<string, any>)[pn]).find((v: any) => v !== undefined))
                  ?? '';

                const handleChange = (newVal: any) => {
                  setCustomFields(prev => {
                    const next: Record<string, any> = { ...prev, [field.name]: newVal };
                    if (field.id) next[field.id] = newVal;
                    return next;
                  });
                };

                return (
                  <div key={field.id || field.name} className="space-y-1.5">
                    <label className={LABEL_CLS}>
                      {field.name} {isRequired && <span className="text-rose-500">*</span>}
                    </label>

                    {fieldType === 'LONG_TEXT' || fieldType === 'TEXT_AREA' ? (
                      <textarea
                        rows={3}
                        required={isRequired}
                        value={val}
                        onChange={e => handleChange(e.target.value)}
                        placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}...`}
                        className={FIELD_CLS + ' resize-none'}
                      />
                    ) : fieldType === 'DROPDOWN' ? (
                      <select
                        required={isRequired}
                        value={val}
                        onChange={e => handleChange(e.target.value)}
                        className={FIELD_CLS}
                        aria-label={field.name}
                      >
                        <option value="">{field.placeholder || `Select ${field.name.toLowerCase()}...`}</option>
                        {(field.options || []).map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : fieldType === 'NUMBER' ? (
                      <input
                        type="number"
                        required={isRequired}
                        value={val}
                        onChange={e => handleChange(e.target.value)}
                        placeholder={field.placeholder || '0'}
                        className={FIELD_CLS}
                        aria-label={field.name}
                      />
                    ) : fieldType === 'DATE' ? (
                      <input
                        type="date"
                        required={isRequired}
                        value={val}
                        onChange={e => handleChange(e.target.value)}
                        placeholder={field.placeholder}
                        className={FIELD_CLS}
                        aria-label={field.name}
                      />
                    ) : fieldType === 'CHECKBOX' ? (
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={val === 'true' || (val as any) === true}
                          onChange={e => handleChange(e.target.checked ? 'true' : 'false')}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-xs text-slate-700 font-medium">{field.placeholder || `Enable ${field.name}`}</span>
                      </label>
                    ) : (
                      // SHORT_TEXT (Default)
                      <input
                        type="text"
                        required={isRequired}
                        value={val}
                        onChange={e => handleChange(e.target.value)}
                        placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}...`}
                        className={FIELD_CLS}
                        aria-label={field.name}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
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
                onChange={handleRecurrenceChange}
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

          {/* ── RECURRENCE CONFIGURATION PANEL ── */}
          {form.recurrence && (
            <div className="mt-3.5 p-4 rounded-xl border border-slate-200/90 bg-slate-50/80 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Recurrence Schedule ({form.recurrence})
                </span>
                <span className="text-[11px] font-medium text-slate-500 font-sans">Timezone: Asia/Kolkata</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className={LABEL_CLS}>
                    Repeat every {form.recurrence === 'DAILY' ? 'day(s)' : form.recurrence === 'WEEKLY' ? 'week(s)' : 'month(s)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={recurrenceConfig.interval}
                    onChange={e => setRecurrenceConfig(prev => ({ ...prev, interval: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className={FIELD_CLS}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={LABEL_CLS}>Schedule Start Date</label>
                  <DatePicker
                    value={recurrenceConfig.scheduleStart}
                    onChange={val => setRecurrenceConfig(prev => ({ ...prev, scheduleStart: val }))}
                    className="w-full"
                  />
                </div>
              </div>

              {form.recurrence === 'WEEKLY' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={LABEL_CLS}>Applicable Weekdays</label>
                    <div className="flex gap-2 text-[11px] font-medium text-slate-500 font-sans">
                      <button
                        type="button"
                        onClick={() => setRecurrenceConfig(prev => ({ ...prev, weekdays: [1, 2, 3, 4, 5] }))}
                        className="hover:text-slate-900 underline"
                      >
                        Weekdays
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setRecurrenceConfig(prev => ({ ...prev, weekdays: [1, 2, 3, 4, 5, 6, 0] }))}
                        className="hover:text-slate-900 underline"
                      >
                        All
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { day: 1, label: 'Mon' },
                      { day: 2, label: 'Tue' },
                      { day: 3, label: 'Wed' },
                      { day: 4, label: 'Thu' },
                      { day: 5, label: 'Fri' },
                      { day: 6, label: 'Sat' },
                      { day: 0, label: 'Sun' },
                    ].map(({ day, label }) => {
                      const isSelected = (recurrenceConfig.weekdays || []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setRecurrenceConfig(prev => {
                              const current = prev.weekdays || [];
                              if (current.includes(day)) {
                                if (current.length === 1) return prev;
                                return { ...prev, weekdays: current.filter(d => d !== day) };
                              } else {
                                return { ...prev, weekdays: [...current, day].sort((a, b) => a - b) };
                              }
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.recurrence === 'MONTHLY' && (
                <div className="space-y-1.5">
                  <label className={LABEL_CLS}>Day of Month (1 - 31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={recurrenceConfig.dayOfMonth || 1}
                    onChange={e => setRecurrenceConfig(prev => ({ ...prev, dayOfMonth: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) }))}
                    className={FIELD_CLS}
                  />
                  <p className="text-[11px] text-slate-500 font-medium font-sans">
                    If a month has fewer days, the last day of that month will be used.
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-200/70">
                <label className={LABEL_CLS}>End Condition</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer hover:border-slate-300">
                    <input
                      type="radio"
                      name="recurrenceEndType"
                      checked={recurrenceConfig.endType === 'NEVER'}
                      onChange={() => setRecurrenceConfig(prev => ({ ...prev, endType: 'NEVER' }))}
                      className="text-slate-900 focus:ring-slate-900"
                    />
                    <span>Never</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer hover:border-slate-300">
                    <input
                      type="radio"
                      name="recurrenceEndType"
                      checked={recurrenceConfig.endType === 'ON_DATE'}
                      onChange={() => setRecurrenceConfig(prev => ({ ...prev, endType: 'ON_DATE' }))}
                      className="text-slate-900 focus:ring-slate-900"
                    />
                    <span>On date</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer hover:border-slate-300">
                    <input
                      type="radio"
                      name="recurrenceEndType"
                      checked={recurrenceConfig.endType === 'AFTER_COUNT'}
                      onChange={() => setRecurrenceConfig(prev => ({ ...prev, endType: 'AFTER_COUNT' }))}
                      className="text-slate-900 focus:ring-slate-900"
                    />
                    <span>After count</span>
                  </label>
                </div>

                {recurrenceConfig.endType === 'ON_DATE' && (
                  <div className="pt-1.5 space-y-1">
                    <label className={LABEL_CLS}>End Date</label>
                    <DatePicker
                      value={recurrenceConfig.endDate || ''}
                      onChange={val => setRecurrenceConfig(prev => ({ ...prev, endDate: val }))}
                      className="w-full"
                    />
                  </div>
                )}

                {recurrenceConfig.endType === 'AFTER_COUNT' && (
                  <div className="pt-1.5 space-y-1">
                    <label className={LABEL_CLS}>Maximum Occurrences</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={recurrenceConfig.maxOccurrences ?? ''}
                      onChange={e => setRecurrenceConfig(prev => ({ ...prev, maxOccurrences: Math.max(1, parseInt(e.target.value) || 1) }))}
                      placeholder="e.g. 10"
                      className={FIELD_CLS}
                    />
                  </div>
                )}
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5 font-sans">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="text-slate-500">Schedule:</span>
                  <span>{formatRecurrenceSummary({ ...recurrenceConfig, frequency: form.recurrence as RecurrenceFrequency })}</span>
                </div>
                {previewNextDate ? (
                  <div className="text-slate-600 flex items-center gap-1.5">
                    <span className="text-slate-500">Next occurrence:</span>
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {previewNextDate.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ) : (
                  <div className="text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-medium">
                    No further occurrences will be generated under current end conditions.
                  </div>
                )}
                {errors.recurrence && (
                  <p className="text-rose-600 font-semibold text-xs mt-1">{errors.recurrence}</p>
                )}
              </div>
            </div>
          )}
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
            {submitting ? 'Saving...' : isConfigMode ? 'Save Task Configuration' : isTemplateMode ? 'Save Template' : editingTask ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
