import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee';
import {
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useGetProjectDetailsQuery,
  useGetProjectTasksQuery,
  useGetProjectEmployeesQuery,
} from '../../../store/apiSlice';
import { Modal } from '../../../components/ui/Modal';
import { ProjectForm, type ProjectFormData } from '../components/ProjectForm';
import { TaskFormModal } from '../components/TaskFormModal';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Plus,
  Briefcase,
  CheckSquare,
  AlertCircle,
  ShieldAlert,
  Edit2,
  ExternalLink,
  Sliders,
} from 'lucide-react';

interface ProjectOnboardingProps {
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: (projectId: string) => void;
}

import {
  VersatileFieldBuilder,
  validateCustomFields,
  type VersatileCustomField,
  type VersatileFieldType,
} from '../components/VersatileFieldBuilder';

export type { VersatileFieldType, VersatileCustomField };

export interface PersistedProject {
  id: string;
  name: string;
  code: string;
  status: string;
  isActive: boolean;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  organizationId?: string;
  createdAt?: string;
  settings?: any;
}

export const ProjectOnboarding: React.FC<ProjectOnboardingProps> = ({
  isModal = false,
  isOpen = true,
  onClose,
  onComplete,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { employee } = useCurrentEmployee();

  // Role validation: Admins and Managers can create and configure projects
  // When employee profile is loaded, restrict if neither ADMIN nor MANAGER
  const isUnauthorized = Boolean(
    employee &&
    !employee.roles?.includes('ADMIN') &&
    employee.role !== 'ADMIN' &&
    !employee.roles?.includes('MANAGER') &&
    employee.role !== 'MANAGER'
  );

  // Workflow steps: 1 = Info, 2 = Configure, 3 = Tasks, 4 = Review, 5 = Finish
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Persisted project record from API
  const [persistedProject, setPersistedProject] = useState<PersistedProject | null>(null);

  // Local form state for step 1 & 2
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    code: '',
    status: 'ACTIVE',
    isActive: true,
    description: '',
    startDate: '',
    endDate: '',
  });

  // API Mutations
  const [createProjectM, { isLoading: isCreatingProject }] = useCreateProjectMutation();
  const [updateProjectM, { isLoading: isUpdatingProject }] = useUpdateProjectMutation();

  const [stepError, setStepError] = useState('');

  // Step 3 Task Creation & Configuration Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  // Fetch live tasks for the persisted project
  const {
    data: tasksData,
    refetch: refetchTasks,
    isLoading: isLoadingTasks,
  } = useGetProjectTasksQuery(persistedProject?.id || '', {
    skip: !persistedProject?.id,
  });
  const projectTasks = Array.isArray(tasksData) ? tasksData : [];

  // Fetch project employees for task assignment
  const { data: employeesData } = useGetProjectEmployeesQuery(persistedProject?.id || '', {
    skip: !persistedProject?.id,
  });
  const projectEmployees = Array.isArray(employeesData) ? employeesData : [];

  // Fetch fresh project details for review and task configuration
  const { data: freshProjectDetails, refetch: refetchProjectDetails } = useGetProjectDetailsQuery(persistedProject?.id || '', {
    skip: !persistedProject?.id,
  });
  const displayProject = freshProjectDetails || persistedProject;

  // Step 3 Versatile Task Fields State
  const [customFields, setCustomFields] = useState<VersatileCustomField[]>([]);
  const [fieldErrors, setFieldErrors] = useState<string | null>(null);
  const [isSavingFields, setIsSavingFields] = useState(false);

  // Sync customFields from persisted project settings
  React.useEffect(() => {
    if (displayProject?.settings?.customFields && Array.isArray(displayProject.settings.customFields)) {
      setCustomFields(displayProject.settings.customFields.map((f: any, idx: number) => ({
        id: f.id || `fld-${idx}-${Date.now()}`,
        name: f.name || '',
        type: f.type || 'SHORT_TEXT',
        required: !!f.required,
        placeholder: f.placeholder || '',
        options: Array.isArray(f.options) ? f.options : [],
      })));
    }
  }, [displayProject?.settings?.customFields]);



  const handleSaveFieldConfiguration = async (fieldsToSave = customFields) => {
    if (!persistedProject) return false;

    const validationError = validateCustomFields(fieldsToSave);
    if (validationError) {
      setFieldErrors(validationError);
      showToast(validationError, 'error');
      return false;
    }

    setFieldErrors(null);
    setIsSavingFields(true);
    try {
      const cleanedFields = fieldsToSave.map(f => ({
        id: f.id,
        name: f.name.trim(),
        type: f.type,
        required: f.required,
        placeholder: f.placeholder?.trim() || undefined,
        options: f.type === 'DROPDOWN' ? (f.options || []).map(o => o.trim()).filter(Boolean) : undefined,
      }));

      const existingSettings = displayProject?.settings || {};
      const updatedSettings = {
        ...existingSettings,
        customFields: cleanedFields,
      };

      await updateProjectM({
        id: persistedProject.id,
        data: {
          settings: updatedSettings,
        },
      }).unwrap();

      setPersistedProject((prev: any) => ({
        ...prev,
        settings: updatedSettings,
      }));

      showToast('Task field configuration saved successfully', 'success');
      refetchProjectDetails();
      return true;
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Failed to save field configuration';
      setFieldErrors(msg);
      showToast(msg, 'error');
      return false;
    } finally {
      setIsSavingFields(false);
    }
  };

  // ── Step 1: Submit Project Information ─────────────────────────
  const handleProjectInfoSubmit = async (data: ProjectFormData) => {
    setStepError('');
    try {
      if (!persistedProject) {
        // First creation
        const payload: any = {
          name: data.name,
          code: data.code,
          status: data.status,
          isActive: data.isActive,
        };
        if (data.description?.trim()) payload.description = data.description.trim();

        const created = await createProjectM(payload).unwrap();
        setPersistedProject(created);
        setFormData(prev => ({ ...prev, ...data }));
        showToast('Project created successfully', 'success');
        setCurrentStep(2);
      } else {
        // Navigated backward: Update existing project instead of creating duplicate
        const payload: any = {
          name: data.name,
          code: data.code,
          status: data.status,
          isActive: data.isActive,
        };
        if (data.description !== undefined) payload.description = data.description.trim() || null;

        const updated = await updateProjectM({
          id: persistedProject.id,
          data: payload,
        }).unwrap();
        setPersistedProject(prev => ({ ...prev, ...updated }));
        setFormData(prev => ({ ...prev, ...data }));
        showToast('Project updated successfully', 'success');
        setCurrentStep(2);
      }
    } catch (err: any) {
      const msg = typeof err?.data === 'string' ? err.data : (err?.data?.message || err?.message || 'Failed to save project information');
      setStepError(Array.isArray(msg) ? msg.join(', ') : typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  // ── Step 2: Configure Project Details ─────────────────────────
  const handleConfigureProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!persistedProject) return;
    setStepError('');

    try {
      const payload: any = {
        name: formData.name,
        code: formData.code,
        status: formData.status,
        isActive: formData.isActive,
        description: formData.description?.trim() || null,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };

      const updated = await updateProjectM({
        id: persistedProject.id,
        data: payload,
      }).unwrap();

      setPersistedProject(prev => ({ ...prev, ...updated }));
      showToast('Project configuration saved', 'success');
      setCurrentStep(3);
    } catch (err: any) {
      const msg = typeof err?.data === 'string' ? err.data : (err?.data?.message || err?.message || 'Failed to configure project');
      setStepError(Array.isArray(msg) ? msg.join(', ') : typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  // ── Step 5: Finish Onboarding ──────────────────────────────────
  const handleFinish = () => {
    if (!persistedProject) return;
    showToast('Project onboarding completed successfully!', 'success');
    if (onComplete) {
      onComplete(persistedProject.id);
    } else if (onClose && isModal) {
      onClose();
      navigate(`/projects/${persistedProject.id}`);
    } else {
      navigate(`/projects/${persistedProject.id}`);
    }
  };

  if (isUnauthorized) {
    const errorBody = (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 font-sans">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Restricted</h2>
        <p className="text-sm text-slate-500">
          Only Administrators and Managers are authorized to onboard new projects and configure initial tasks.
        </p>
        {isModal ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        ) : (
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to My Projects
          </Link>
        )}
      </div>
    );

    if (isModal) {
      return (
        <Modal isOpen={isOpen} onClose={onClose || (() => { })} title="Access Restricted" maxWidth="md">
          {errorBody}
        </Modal>
      );
    }
    return errorBody;
  }

  // Step Indicator Navigation
  const steps = [
    { num: 1, label: 'Project Info' },
    { num: 2, label: 'Configure' },
    { num: 3, label: 'Tasks' },
    { num: 4, label: 'Review' },
    { num: 5, label: 'Finish' },
  ];

  const content = (
    <div className="font-sans space-y-6">
      {/* ── Workflow Progress Bar ───────────────────────────────── */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-900 tracking-tight uppercase">
            Step {currentStep} of 5: {steps[currentStep - 1].label}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Project Onboarding Workflow
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {steps.map(s => {
            const isCompleted = s.num < currentStep;
            const isCurrent = s.num === currentStep;
            return (
              <div
                key={s.num}
                className="flex-1 flex flex-col gap-1.5"
              >
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${isCompleted
                    ? 'bg-emerald-500'
                    : isCurrent
                      ? 'bg-slate-900'
                      : 'bg-slate-100'
                    }`}
                />
                <span
                  className={`text-[10px] hidden sm:block font-bold tracking-tight truncate ${isCompleted
                    ? 'text-emerald-700'
                    : isCurrent
                      ? 'text-slate-900'
                      : 'text-slate-400'
                    }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Error Banner (for steps 2+) ─────────────────────── */}
      {stepError && currentStep !== 1 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{stepError}</span>
        </div>
      )}

      {/* ── STEP 1: Project Information ─────────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {persistedProject ? 'Edit Project Details' : 'Enter Project Information'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {persistedProject
                ? 'Update basic information for this persisted project. No duplicates will be created.'
                : 'Define the project name, unique tracking code, and operational state to initialize onboarding.'}
            </p>
          </div>

          <ProjectForm
            initialData={formData}
            onSubmit={handleProjectInfoSubmit}
            onCancel={onClose}
            submitting={isCreatingProject || isUpdatingProject}
            error={stepError}
            submitButtonText={persistedProject ? 'Update & Continue' : 'Create & Continue'}
            isEdit={!!persistedProject}
            showCancelButton={Boolean(onClose)}
          />
        </div>
      )}

      {/* ── STEP 2: Configure Project ───────────────────────────── */}
      {currentStep === 2 && persistedProject && (
        <form onSubmit={handleConfigureProjectSubmit} className="space-y-5">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Configure Project</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review persisted attributes and configure schedule dates and description.
            </p>
          </div>

          {/* Persisted ID & Overview Banner */}
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-slate-900 bg-white border border-slate-200 shadow-2xs font-mono">
                  {persistedProject.code}
                </span>
                <span className="text-sm font-bold text-slate-900">{persistedProject.name}</span>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                ID: {persistedProject.id.slice(0, 8)}...
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Status: <strong className="text-slate-800">{persistedProject.status}</strong></span>
              <span>•</span>
              <span>State: <strong className="text-slate-800">{persistedProject.isActive ? 'Active' : 'Archived'}</strong></span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 font-sans mb-1.5">
              Project Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Outline project objectives, milestones, or team deliverables..."
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans"
            />
          </div>

          {/* Schedule Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 font-sans mb-1.5">
                Planned Start Date (Optional)
              </label>
              <input
                type="date"
                value={formData.startDate || ''}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 font-sans mb-1.5">
                Target End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.endDate || ''}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans"
              />
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setStepError(''); setCurrentStep(1); }}
              className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Project Info
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setStepError(''); setCurrentStep(3); }}
                className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
              >
                Skip to Tasks
              </button>
              <button
                type="submit"
                disabled={isUpdatingProject}
                className="inline-flex items-center gap-1.5 px-6 py-2 bg-[#12161F] hover:bg-slate-800 text-white font-bold rounded-full text-xs transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
              >
                {isUpdatingProject ? 'Saving...' : 'Save & Configure Tasks'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── STEP 3: Configure Tasks ─────────────────────────────── */}
      {currentStep === 3 && persistedProject && (
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Configure Tasks</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set default values, add custom fields, and create initial tasks for this project.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                Task Defaults
              </button>
              <button
                type="button"
                onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
                className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 py-1.5 bg-[#12161F] hover:bg-slate-800 text-white rounded-[10px] text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                Add Task
              </button>
            </div>
          </div>

          {/* Task Defaults Summary Card */}
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                Task Defaults
              </span>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline inline-flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Edit Defaults
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Default Priority</span>
                <span className="font-bold text-slate-800 mt-0.5 inline-block">
                  {displayProject.settings?.taskDefaults?.priority || 'MEDIUM'}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Default Recurrence</span>
                <span className="font-bold text-slate-800 mt-0.5 inline-block">
                  {displayProject.settings?.taskDefaults?.recurrence || 'None'}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Default Est. Hours</span>
                <span className="font-bold text-slate-800 mt-0.5 inline-block">
                  {displayProject.settings?.taskDefaults?.estimatedHours ? `${displayProject.settings.taskDefaults.estimatedHours} hrs` : 'Unspecified'}
                </span>
              </div>
            </div>
          </div>

          {/* ── Versatile Task Fields Dynamic Builder ── */}
          <VersatileFieldBuilder
            fields={customFields}
            onChange={setCustomFields}
            error={fieldErrors}
            existingTasks={projectTasks}
            onSave={() => { void handleSaveFieldConfiguration(); }}
            isSaving={isSavingFields}
            showSaveButton={true}
          />

          {/* Current Tasks List */}
          {isLoadingTasks ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Loading project tasks...
            </div>
          ) : projectTasks.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">No tasks created yet</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click &quot;Add Task&quot; to configure tasks for {persistedProject.name}. You can add multiple tasks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Task
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  Tasks Created ({projectTasks.length})
                </span>
                <span>Attached to: <strong>{persistedProject.code}</strong></span>
              </div>
              <div className="border border-slate-200/90 rounded-xl overflow-hidden divide-y divide-slate-100">
                {projectTasks.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-white hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[11px] border border-slate-200/80 shrink-0">
                        {t.ticketId || t.name.slice(0, 6)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{t.name}</p>
                        {t.description && (
                          <p className="text-slate-400 text-[11px] truncate">{t.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {t.status || 'TODO'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
                        {t.priority || 'MEDIUM'}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setEditingTask(t); setIsTaskModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setStepError(''); setCurrentStep(2); }}
              className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Project Config
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (customFields.length > 0) {
                    const ok = await handleSaveFieldConfiguration();
                    if (!ok) return;
                  }
                  handleFinish();
                }}
                className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
              >
                <span>Save & Go to Workspace</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (customFields.length > 0) {
                    const ok = await handleSaveFieldConfiguration();
                    if (!ok) return;
                  }
                  setStepError('');
                  setCurrentStep(4);
                }}
                className="inline-flex items-center gap-1.5 px-6 py-2 bg-[#12161F] hover:bg-slate-800 text-white font-bold rounded-full text-xs transition-all shadow-xs active:scale-[0.98]"
              >
                Continue to Review ({projectTasks.length} {projectTasks.length === 1 ? 'task' : 'tasks'})
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>


          {/* ── Reused Exact Task Form Modal for Task Creation ── */}
          <TaskFormModal
            isOpen={isTaskModalOpen}
            onClose={() => {
              setIsTaskModalOpen(false);
              setEditingTask(null);
            }}
            projectId={persistedProject.id}
            editingTask={editingTask}
            employees={projectEmployees}
            tasks={projectTasks}
            onSuccess={() => {
              refetchTasks();
              setIsTaskModalOpen(false);
              setEditingTask(null);
            }}
          />

          {/* ── Reused Exact Task Form Modal for Task Configuration ── */}
          <TaskFormModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            projectId={persistedProject.id}
            isConfigMode={true}
            employees={projectEmployees}
            tasks={projectTasks}
            onSuccess={() => {
              refetchProjectDetails();
              setIsConfigModalOpen(false);
            }}
          />
        </div>
      )}

      {/* ── STEP 4: Review Project Configuration ────────────────── */}
      {currentStep === 4 && persistedProject && (
        <div className="space-y-5">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Review Project Configuration</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify the persisted project configuration and tasks before completing onboarding.
            </p>
          </div>

          {/* Persisted Project Review Card */}
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Persisted Project Record
              </span>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline inline-flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Edit Info
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Project Name</span>
                <strong className="text-slate-900 font-bold">{displayProject.name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Project Code</span>
                <span className="font-mono font-bold text-slate-900">{displayProject.code}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Lifecycle Status</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  {displayProject.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Operational State</span>
                <span className="font-bold text-slate-800">
                  {displayProject.isActive ? 'Active initiative' : 'Archived initiative'}
                </span>
              </div>
              {displayProject.description && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">Description</span>
                  <p className="text-slate-700 mt-0.5">{displayProject.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Persisted Task Configuration Summary */}
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Saved Task Configuration
              </span>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline inline-flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Edit Config
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Default Priority</span>
                <span className="font-bold text-slate-900">{displayProject.settings?.taskDefaults?.priority || 'MEDIUM'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Default Recurrence</span>
                <span className="font-bold text-slate-900">{displayProject.settings?.taskDefaults?.recurrence || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Custom Fields</span>
                <span className="font-bold text-slate-900">
                  {displayProject.settings?.customFields?.length ? `${displayProject.settings.customFields.length} configured` : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Persisted Tasks Summary */}
          <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Configured Tasks ({projectTasks.length})
              </span>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Manage Tasks
              </button>
            </div>
            {projectTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No tasks added to this project.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {projectTasks.map((t: any) => (
                  <div key={t.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-700">{t.ticketId || 'TASK'}</span>
                      <span className="text-slate-900 font-medium">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {t.status}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
                        {t.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Tasks
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="inline-flex items-center gap-1.5 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs transition-all shadow-xs active:scale-[0.98]"
            >
              <Check className="w-3.5 h-3.5" /> Finish Onboarding
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Finish / Ready ──────────────────────────────── */}
      {currentStep === 5 && persistedProject && (
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
            <Check className="w-6 h-6" strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Project Onboarding Complete!
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              <strong>{displayProject.name}</strong> ({displayProject.code}) is now ready with {projectTasks.length} {projectTasks.length === 1 ? 'task' : 'tasks'} configured.
            </p>
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl text-left max-w-md mx-auto text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Project Code:</span>
              <span className="font-mono font-bold text-slate-900">{displayProject.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-700">{displayProject.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Tasks:</span>
              <span className="font-bold text-slate-900">{projectTasks.length}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            {onClose && isModal && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
              >
                Close
              </button>
            )}
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#12161F] hover:bg-slate-800 text-white font-bold rounded-full text-xs sm:text-sm transition-all shadow-xs active:scale-[0.98]"
            >
              <span>Go to Project Workspace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose || (() => { })}
        title="Create New Project"
        maxWidth="lg"
      >
        {content}
      </Modal>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-slate-900" />
            Project Onboarding
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Guide authorized administrators and managers through initiative creation and initial task setup.
          </p>
        </div>
        <Link
          to="/admin/projects"
          className="inline-flex items-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-xs transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancel Onboarding
        </Link>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-[14px] p-6 shadow-xs">
        {content}
      </div>
    </div>
  );
};
