import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { useCreateProjectMilestoneMutation, useUpdateProjectMilestoneMutation, useDeleteProjectMilestoneMutation } from '../../../store/apiSlice';
import { Select } from '../../../components/ui/Select';
import { DatePicker } from '../../../components/ui/DatePicker';

interface Milestone {
  id: string;
  name: string;
  description?: string | null;
  targetDate: string;
  status: string;
}

const milestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required'),
  description: z.string().optional(),
  targetDate: z.string().min(1, 'Target date is required'),
  status: z.string(),
});

interface MilestoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  editingMilestone: Milestone | null;
}

export const MilestoneFormModal = ({
  isOpen,
  onClose,
  projectId,
  editingMilestone
}: MilestoneFormModalProps) => {
  const { showToast } = useToast();
  const [createMilestoneM] = useCreateProjectMilestoneMutation();
  const [updateMilestoneM] = useUpdateProjectMilestoneMutation();
  const [deleteMilestoneM] = useDeleteProjectMilestoneMutation();

  const [form, setForm] = useState({
    name: '',
    description: '',
    targetDate: '',
    status: 'PENDING'
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingMilestone) {
      setForm({
        name: editingMilestone.name,
        description: editingMilestone.description || '',
        targetDate: editingMilestone.targetDate ? new Date(editingMilestone.targetDate).toISOString().split('T')[0] : '',
        status: editingMilestone.status || 'PENDING',
      });
    } else {
      setForm({ name: '', description: '', targetDate: '', status: 'PENDING' });
    }
    setError('');
  }, [editingMilestone, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      milestoneSchema.parse(form);
      setSubmitting(true);
      setError('');
      
      const payload = {
        ...form,
        targetDate: new Date(form.targetDate).toISOString(),
      };

      if (editingMilestone) {
        await updateMilestoneM({
          projectId,
          milestoneId: editingMilestone.id,
          data: payload
        }).unwrap();
        showToast('Milestone updated successfully', 'success');
      } else {
        await createMilestoneM({
          projectId,
          data: payload
        }).unwrap();
        showToast('Milestone created successfully', 'success');
      }
      onClose();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0].message);
      } else {
        setError(err.message || 'Failed to save milestone');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingMilestone) return;
    if (!confirm('Are you sure you want to deactivate/delete this milestone?')) return;
    try {
      setSubmitting(true);
      setError('');
      await deleteMilestoneM({ projectId, milestoneId: editingMilestone.id }).unwrap();
      showToast('Milestone deleted', 'success');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete milestone');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingMilestone ? 'Edit Milestone' : 'Create Milestone'}
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
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Target Date *</label>
            <DatePicker
              value={form.targetDate}
              onChange={(val) => setForm({ ...form, targetDate: val })}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</label>
            <Select
              value={form.status}
              onChange={(val) => setForm({ ...form, status: val })}
              className="w-full"
              options={[
                { value: 'PENDING', label: 'PENDING' },
                { value: 'IN_PROGRESS', label: 'IN PROGRESS' },
                { value: 'ACHIEVED', label: 'ACHIEVED' },
                { value: 'MISSED', label: 'MISSED' }
              ]}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950 focus:border-transparent bg-white shadow-sm transition-all resize-none"
          />
        </div>
        
        <div className="flex justify-between gap-3 pt-4 border-t border-slate-100">
          <div>
            {editingMilestone && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
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
              {submitting ? 'Saving...' : 'Save Milestone'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
