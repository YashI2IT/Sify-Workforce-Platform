import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { useCreateProjectActivityMutation, useUpdateProjectActivityMutation } from '../../../store/apiSlice';

interface Activity {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

const actSchema = z.object({
  name: z.string().min(1, 'Activity name is required'),
  description: z.string().optional(),
  isActive: z.boolean(),
});

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  editingAct: Activity | null;
}

export const ActivityFormModal = ({
  isOpen,
  onClose,
  projectId,
  editingAct
}: ActivityFormModalProps) => {
  const { showToast } = useToast();
  const [createActM] = useCreateProjectActivityMutation();
  const [updateActM] = useUpdateProjectActivityMutation();

  const [form, setForm] = useState({
    name: '',
    description: '',
    isActive: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingAct) {
      setForm({
        name: editingAct.name,
        description: editingAct.description || '',
        isActive: editingAct.isActive ?? true,
      });
    } else {
      setForm({ name: '', description: '', isActive: true });
    }
    setError('');
  }, [editingAct, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      actSchema.parse(form);
      setSubmitting(true);
      setError('');
      
      if (editingAct) {
        await updateActM({
          projectId,
          actId: editingAct.id,
          data: form
        }).unwrap();
        showToast('Activity updated successfully', 'success');
      } else {
        await createActM({
          projectId,
          data: form
        }).unwrap();
        showToast('Activity created successfully', 'success');
      }
      onClose();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0].message);
      } else {
        setError(err.message || 'Failed to save activity');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingAct ? 'Edit Activity' : 'Create Activity'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-sans font-medium">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 tracking-tight font-sans">
            Activity Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Client Training & Enablement"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white shadow-2xs transition-all font-sans text-slate-900 placeholder:text-slate-400 font-medium"
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 tracking-tight font-sans">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Briefly describe what work falls under this activity..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white shadow-2xs transition-all font-sans text-slate-900 placeholder:text-slate-400 font-medium resize-none"
          />
        </div>

        <label htmlFor="actIsActive" className="group flex items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-400 hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)] transition-all duration-300 cursor-pointer select-none">
          <div className="space-y-1">
            <span className="text-[13px] font-bold text-slate-900 font-sans block group-hover:text-blue-700 transition-colors">Active Activity</span>
            <span className="text-[11px] text-slate-500 font-sans block">Allow workforce members to log time entries to this activity</span>
          </div>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              id="actIsActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="peer sr-only"
            />
            <div className={`w-10 h-5 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${form.isActive ? 'bg-[#12161F]' : 'bg-slate-200'}`}>
              <div
                className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </div>
          </div>
        </label>
        
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
            {submitting ? 'Saving...' : 'Save Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
