import React, { useState, useEffect } from 'react';
import { Select } from '../../../components/ui/Select';
import { AlertCircle } from 'lucide-react';

export const projectStatusFormOptions = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
];

export interface ProjectFormData {
  name: string;
  code: string;
  status: string;
  isActive: boolean;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>;
  onSubmit: (data: ProjectFormData) => Promise<void> | void;
  onCancel?: () => void;
  submitting?: boolean;
  error?: string;
  submitButtonText?: string;
  showCancelButton?: boolean;
  isEdit?: boolean;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitting = false,
  error = '',
  submitButtonText,
  showCancelButton = true,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: initialData?.name || '',
    code: initialData?.code || '',
    status: initialData?.status || 'ACTIVE',
    isActive: initialData?.isActive ?? true,
    description: initialData?.description || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
  });

  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (initialData && (initialData.name || initialData.code)) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData?.name, initialData?.code, initialData?.status, initialData?.isActive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const trimmedName = formData.name.trim();
    const trimmedCode = formData.code.trim().toUpperCase();

    if (!trimmedName) {
      setValidationError('Project name is required');
      return;
    }
    if (!trimmedCode) {
      setValidationError('Project code is required');
      return;
    }

    await onSubmit({
      ...formData,
      name: trimmedName,
      code: trimmedCode,
    });
  };

  const displayError = error || validationError;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans">
      {displayError && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-800 font-sans mb-1.5">
          Project Name *
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Workforce Analytics Engine"
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-800 font-sans mb-1.5">
          Project Code *
        </label>
        <input
          type="text"
          required
          placeholder="e.g. PRJ-ANALYTICS"
          value={formData.code}
          onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm uppercase bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans font-bold tracking-wider"
        />
        <p className="text-[11px] text-slate-400 mt-1 font-medium font-sans">
          Unique tracking identifier used across timesheets and audit logs.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-800 font-sans mb-1.5">
          Initial Status *
        </label>
        <Select
          value={formData.status}
          onChange={val => setFormData(prev => ({ ...prev, status: val }))}
          options={projectStatusFormOptions}
          size="md"
          className="w-full font-sans"
          triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900 !font-sans"
        />
      </div>

      <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors">
        <div>
          <label htmlFor="create-project-active" className="text-sm font-bold text-slate-800 font-sans block cursor-pointer">
            Active Project
          </label>
          <p className="text-xs text-slate-400 mt-0.5 font-medium font-sans">
            {formData.isActive
              ? 'Initiative is active and selectable on weekly employee timesheets.'
              : 'Initiative is archived and hidden from new timesheet entries.'}
          </p>
        </div>
        <label htmlFor="create-project-active" className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            id="create-project-active"
            checked={formData.isActive}
            onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="sr-only"
          />
          <div
            className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
              formData.isActive ? 'bg-slate-900' : 'bg-slate-200'
            }`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                formData.isActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        {showCancelButton && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-[#12161F] hover:bg-slate-800 text-white font-bold rounded-full text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-[0.98] disabled:opacity-50 font-sans"
        >
          {submitting
            ? isEdit
              ? 'Saving...'
              : 'Creating...'
            : submitButtonText || (isEdit ? 'Save Changes' : 'Create Project')}
        </button>
      </div>
    </form>
  );
};
