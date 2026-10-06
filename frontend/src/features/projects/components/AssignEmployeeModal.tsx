import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { useAssignProjectEmployeeMutation } from '../../../store/apiSlice';

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  role: string;
}

interface AssignEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  unassignedEmployees: Employee[];
}

export const AssignEmployeeModal = ({
  isOpen,
  onClose,
  projectId,
  unassignedEmployees
}: AssignEmployeeModalProps) => {
  const { showToast } = useToast();
  const [assignEmpM] = useAssignProjectEmployeeMutation();

  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      setError('Please select an employee to assign');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await assignEmpM({
        projectId,
        employeeId: selectedEmpId
      }).unwrap();
      showToast('Employee assigned to project successfully', 'success');
      onClose();
      setSelectedEmpId('');
    } catch (err: any) {
      setError(err.message || 'Failed to assign employee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Employee to Project"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-sans font-medium">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 tracking-tight font-sans">
            Select Employee <span className="text-rose-500">*</span>
          </label>
          <p className="text-xs text-slate-500 font-sans pb-1">
            Choose a workforce member to assign to this project workspace.
          </p>
          <Select
            value={selectedEmpId}
            onChange={setSelectedEmpId}
            options={[
              { value: '', label: '-- Select an employee --' },
              ...unassignedEmployees.map((emp) => ({
                value: emp.id,
                label: `${emp.name} (${emp.employeeCode}) - ${emp.role}`
              }))
            ]}
          />
        </div>
        
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
            disabled={submitting || unassignedEmployees.length === 0}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#12161F] hover:bg-slate-800 rounded-full disabled:opacity-50 cursor-pointer shadow-xs transition-all active:scale-[0.97] font-sans"
          >
            {submitting ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
