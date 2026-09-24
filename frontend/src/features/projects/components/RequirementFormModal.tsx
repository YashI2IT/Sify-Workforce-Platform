import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { useCreateProjectRequirementMutation, useUpdateProjectRequirementMutation } from '../../../store/apiSlice';

interface Requirement {
  id: string;
  title: string;
  description?: string | null;
  isMandatory: boolean;
  status: string;
}

const reqSchema = z.object({
  title: z.string().min(1, 'Requirement title is required'),
  description: z.string().optional(),
  isMandatory: z.boolean(),
  status: z.string(),
});

interface RequirementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  editingReq: Requirement | null;
}

export const RequirementFormModal = ({
  isOpen,
  onClose,
  projectId,
  editingReq
}: RequirementFormModalProps) => {
  const { showToast } = useToast();
  const [createReqM] = useCreateProjectRequirementMutation();
  const [updateReqM] = useUpdateProjectRequirementMutation();

  const [form, setForm] = useState({
    title: '',
    description: '',
    isMandatory: false,
    status: 'ACTIVE'
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingReq) {
      setForm({
        title: editingReq.title,
        description: editingReq.description || '',
        isMandatory: editingReq.isMandatory,
        status: editingReq.status || 'ACTIVE',
      });
    } else {
      setForm({ title: '', description: '', isMandatory: false, status: 'ACTIVE' });
    }
    setError('');
  }, [editingReq, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      reqSchema.parse(form);
      setSubmitting(true);
      setError('');
      
      if (editingReq) {
        await updateReqM({
          projectId,
          reqId: editingReq.id,
          data: form
        }).unwrap();
        showToast('Requirement updated successfully', 'success');
      } else {
        await createReqM({
          projectId,
          data: form
        }).unwrap();
        showToast('Requirement added successfully', 'success');
      }
      onClose();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0].message);
      } else {
        setError(err.message || 'Failed to save requirement');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingReq ? 'Edit Requirement' : 'Add Project Requirement'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-mono">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm bg-white"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="reqIsMandatory"
            checked={form.isMandatory}
            onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-600"
          />
          <label htmlFor="reqIsMandatory" className="text-sm text-slate-700">
            Mandatory Requirement
          </label>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Saving...' : 'Save Requirement'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
