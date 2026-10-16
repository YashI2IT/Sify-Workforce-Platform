import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../context/ToastContext';
import {
  useGetProjectDetailsQuery,
  useGetProjectTasksQuery,
  useUpdateProjectMutation,
} from '../../../store/apiSlice';
import { VersatileFieldBuilder } from './VersatileFieldBuilder';
import {
  validateCustomFields,
  type VersatileCustomField,
} from './versatileFieldUtils';
import {
  AlertCircle,
  Trash2,
  Calendar,
  FileText,
  Sliders,
  Layers,
  FolderKanban,
} from 'lucide-react';

const projectStatusFormOptions = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const recurrenceOptions = [
  { value: '', label: 'None' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

export interface EditProjectModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedProject: any) => void;
  canDelete?: boolean;
  onDelete?: (projectId: string, projectName?: string) => Promise<void> | void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onSuccess,
  canDelete = false,
  onDelete,
}) => {
  const { showToast } = useToast();
  const [updateProjectM, { isLoading: isUpdating }] = useUpdateProjectMutation();

  const { data: project, isLoading: isLoadingProject } = useGetProjectDetailsQuery(projectId, {
    skip: !isOpen || !projectId,
  });

  const { data: tasksData, isLoading: isLoadingTasks } = useGetProjectTasksQuery(projectId, {
    skip: !isOpen || !projectId,
  });
  const existingTasks = Array.isArray(tasksData) ? tasksData : [];

  // Section 1: Project Information
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [isActive, setIsActive] = useState(true);

  // Section 2: Project Details
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Section 3: Reusable Task Defaults
  const [defaultPriority, setDefaultPriority] = useState('MEDIUM');
  const [defaultRecurrence, setDefaultRecurrence] = useState('');
  const [defaultEstimatedHours, setDefaultEstimatedHours] = useState<number | string>('');

  // Section 4: Versatile Task Fields
  const [customFields, setCustomFields] = useState<VersatileCustomField[]>([]);

  const [formError, setFormError] = useState('');

  // Load project data whenever opened or project data arrives
  useEffect(() => {
    if (project && isOpen) {
      setName(project.name || '');
      setCode(project.code || '');
      setStatus(project.status || 'ACTIVE');
      setIsActive(project.isActive ?? true);

      setDescription(project.description || '');
      setStartDate(
        project.startDate
          ? new Date(project.startDate).toISOString().split('T')[0]
          : ''
      );
      setEndDate(
        project.endDate
          ? new Date(project.endDate).toISOString().split('T')[0]
          : ''
      );

      const defaults = project.settings?.taskDefaults || {};
      setDefaultPriority(defaults.priority || 'MEDIUM');
      setDefaultRecurrence(defaults.recurrence || '');
      setDefaultEstimatedHours(defaults.estimatedHours ?? '');

      if (project.settings?.customFields && Array.isArray(project.settings.customFields)) {
        setCustomFields(
          project.settings.customFields.map((f: any, idx: number) => ({
            id: f.id || `fld-${idx}-${Date.now()}`,
            name: f.name || '',
            type: f.type || 'SHORT_TEXT',
            required: !!f.required,
            placeholder: f.placeholder || '',
            options: Array.isArray(f.options) ? f.options : [],
            previousNames: Array.isArray(f.previousNames) ? f.previousNames : [],
          }))
        );
      } else {
        setCustomFields([]);
      }
      setFormError('');
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName) {
      setFormError('Project name is required');
      return;
    }
    if (!trimmedCode) {
      setFormError('Project code is required');
      return;
    }

    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        setFormError('Planned start date must be before or equal to target end date');
        return;
      }
    }

    const fieldValidationError = validateCustomFields(customFields);
    if (fieldValidationError) {
      setFormError(fieldValidationError);
      return;
    }

    try {
      const cleanedFields = customFields.map(f => ({
        id: f.id,
        name: f.name.trim(),
        type: f.type,
        required: f.required,
        placeholder: f.placeholder?.trim() || undefined,
        options: f.type === 'DROPDOWN' ? (f.options || []).map(o => o.trim()).filter(Boolean) : undefined,
        previousNames: f.previousNames || undefined,
      }));

      const existingSettings = project?.settings || {};
      const updatedSettings = {
        ...existingSettings,
        taskDefaults: {
          priority: defaultPriority,
          recurrence: defaultRecurrence || null,
          estimatedHours: defaultEstimatedHours !== '' && defaultEstimatedHours !== null ? Number(defaultEstimatedHours) : null,
        },
        customFields: cleanedFields,
      };

      const payload = {
        name: trimmedName,
        code: trimmedCode,
        status,
        isActive,
        description: description.trim() || null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        settings: updatedSettings,
      };

      const updated = await updateProjectM({ id: projectId, data: payload }).unwrap();
      showToast('Project configuration saved successfully', 'success');
      onSuccess?.(updated);
      onClose();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to update project configuration';
      setFormError(msg);
      showToast(msg, 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? `Edit Project: ${project.name}` : 'Edit Project'}
      maxWidth="3xl"
    >
      {(isLoadingProject && !project) || (isLoadingTasks && !tasksData) ? (
        <div className="py-12 text-center text-slate-400 text-xs font-sans">
          Loading saved project configuration...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 font-sans">
          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="max-h-[72vh] overflow-y-auto pr-1 space-y-6">
            {/* ── 1. PROJECT INFORMATION ────────────────────────────── */}
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <FolderKanban className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Project Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Enterprise Core Platform"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Project Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PRJ-ECP"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm uppercase bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-bold tracking-wider font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Project Status <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={status}
                    onChange={setStatus}
                    options={projectStatusFormOptions}
                    size="md"
                    className="w-full"
                    triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50">
                  <div>
                    <label htmlFor="edit-modal-active-toggle" className="text-xs font-bold text-slate-800 block cursor-pointer">
                      Active Project
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      {isActive ? 'Available for timesheet logging.' : 'Archived and hidden from timesheets.'}
                    </p>
                  </div>
                  <label htmlFor="edit-modal-active-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="edit-modal-active-toggle"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                        isActive ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* ── 2. PROJECT DETAILS ────────────────────────────────── */}
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <FileText className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Project Details
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Project Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Enter project description..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Planned Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Target End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. TASK DEFAULTS ─────────────────────────────────── */}
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <Sliders className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. Task Defaults
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Default values applied when creating new tasks.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Default Priority
                  </label>
                  <Select
                    value={defaultPriority}
                    onChange={setDefaultPriority}
                    options={priorityOptions}
                    size="md"
                    className="w-full"
                    triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Default Recurrence
                  </label>
                  <Select
                    value={defaultRecurrence}
                    onChange={setDefaultRecurrence}
                    options={recurrenceOptions}
                    size="md"
                    className="w-full"
                    triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Default Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={defaultEstimatedHours}
                    onChange={e => setDefaultEstimatedHours(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* ── 4. CUSTOM TASK FIELDS ─────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Layers className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  4. Custom Task Fields
                </h3>
              </div>

              <VersatileFieldBuilder
                fields={customFields}
                onChange={setCustomFields}
                existingTasks={existingTasks}
              />
            </div>
          </div>

          {/* ── FOOTER ACTIONS ─────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-3">
            {canDelete && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(projectId, project?.name)}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Project</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-6 py-2.5 bg-[#12161F] hover:bg-slate-800 text-white font-bold rounded-full text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                {isUpdating ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
