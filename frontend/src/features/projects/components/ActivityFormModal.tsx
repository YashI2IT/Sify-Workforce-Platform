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
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-mono">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950 focus:border-transparent bg-white shadow-sm transition-all"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Description</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950 focus:border-transparent bg-white shadow-sm transition-all resize-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="actIsActive"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 text-slate-900 border-slate-200 rounded focus:ring-slate-950 transition-colors"
          />
          <label htmlFor="actIsActive" className="text-sm text-slate-700">
            Active Activity
          </label>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-950 border border-transparent rounded-xl hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
          >
            {submitting ? 'Saving...' : 'Save Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
