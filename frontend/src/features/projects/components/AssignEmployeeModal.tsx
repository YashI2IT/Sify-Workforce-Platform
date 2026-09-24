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
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-mono">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Select Employee</label>
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
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || unassignedEmployees.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-950 border border-transparent rounded-xl hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
          >
            {submitting ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
