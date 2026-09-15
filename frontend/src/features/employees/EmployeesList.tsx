import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Users, UserPlus, Edit2, CheckCircle2, XCircle, Search, AlertCircle, RefreshCw } from 'lucide-react';

interface Employee {
  id: string;
  organizationId: string;
  employeeCode: string;
  name: string;
  email: string;
  teamId: string | null;
  isActive: boolean;
  createdAt?: string;
}

interface Team {
  id: string;
  name: string;
}

export const EmployeesList = () => {
  const { employee: currentAuthEmp } = useCurrentEmployee();
  const { showToast } = useToast();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [statusToggleEmployee, setStatusToggleEmployee] = useState<Employee | null>(null);
  const [isStatusToggling, setIsStatusToggling] = useState(false);
  
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    employeeCode: '',
    name: '',
    email: '',
    teamId: '',
    isActive: true,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [empRes, teamsRes] = await Promise.all([
        apiClient('/employees?limit=100'),
        apiClient('/teams?limit=100').catch(() => ({ data: [] })),
      ]);

      const empList = Array.isArray(empRes) ? empRes : (empRes?.data ?? []);
      const teamList = Array.isArray(teamsRes) ? teamsRes : (teamsRes?.data ?? []);

      setEmployees(empList);
      setTeams(teamList);
    } catch (err: any) {
      setError(err.message || 'Failed to load employee records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setFormData({
      employeeCode: '',
      name: '',
      email: '',
      teamId: '',
      isActive: true,
    });
    setFormError('');
    setIsCreateOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      employeeCode: emp.employeeCode,
      name: emp.name,
      email: emp.email,
      teamId: emp.teamId || '',
      isActive: emp.isActive,
    });
    setFormError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    const orgId = currentAuthEmp?.organizationId || sessionStorage.getItem('dev_org_id') || '';
    if (!orgId) {
      setFormError('No organization context available. Select a dev user first.');
      setFormSubmitting(false);
      return;
    }

    try {
      await apiClient('/employees', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: orgId,
          employeeCode: formData.employeeCode.trim(),
          name: formData.name.trim(),
          email: formData.email.trim(),
          teamId: formData.teamId ? formData.teamId : null,
          isActive: formData.isActive,
        }),
      });

      setIsCreateOpen(false);
      showToast('Employee created successfully', 'success');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create employee');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setFormSubmitting(true);
    setFormError('');

    try {
      await apiClient(`/employees/${editingEmployee.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          employeeCode: formData.employeeCode.trim(),
          name: formData.name.trim(),
          email: formData.email.trim(),
          teamId: formData.teamId ? formData.teamId : null,
          isActive: formData.isActive,
        }),
      });

      setEditingEmployee(null);
      showToast('Employee updated successfully', 'success');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update employee');
    } finally {
      setFormSubmitting(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!statusToggleEmployee) return;
    
    setIsStatusToggling(true);
    try {
      await apiClient(`/employees/${statusToggleEmployee.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !statusToggleEmployee.isActive,
        }),
      });
      showToast(`Employee ${statusToggleEmployee.name} is now ${!statusToggleEmployee.isActive ? 'Active' : 'Inactive'}`, 'success');
      setStatusToggleEmployee(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update employee status', 'error');
    } finally {
      setIsStatusToggling(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = teamFilter ? emp.teamId === teamFilter : true;
    const matchesStatus = 
      statusFilter === 'all' ? true : 
      statusFilter === 'active' ? emp.isActive : !emp.isActive;

    return matchesSearch && matchesTeam && matchesStatus;
  });

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'Unassigned';
    const found = teams.find(t => t.id === teamId);
    return found ? found.name : 'Unknown Team';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            Employees
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage organization members, assignments, and activation states.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            title="Refresh employees"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, code, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Teams</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-gray-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading employees...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="font-semibold text-gray-800">Error loading employees</p>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 text-sm text-blue-600 hover:underline font-medium"
            >
              Try Again
            </button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-base font-medium text-gray-700">No employees found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery || teamFilter || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first employee'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/75 border-b text-gray-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Team</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-xs text-gray-500">{emp.email}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-600">
                      {emp.employeeCode}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getTeamName(emp.teamId)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          emp.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit employee"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setStatusToggleEmployee(emp)}
                          className={`p-1.5 rounded-md transition-colors ${
                            emp.isActive
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={emp.isActive ? 'Deactivate employee' : 'Activate employee'}
                        >
                          {emp.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Toggle Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!statusToggleEmployee}
        onClose={() => setStatusToggleEmployee(null)}
        onConfirm={confirmToggleStatus}
        title={statusToggleEmployee?.isActive ? 'Deactivate Employee' : 'Activate Employee'}
        message={statusToggleEmployee?.isActive 
          ? `Are you sure you want to deactivate ${statusToggleEmployee.name}? They will no longer be able to log in or be assigned to projects.`
          : `Are you sure you want to activate ${statusToggleEmployee?.name}?`
        }
        confirmText={statusToggleEmployee?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={statusToggleEmployee?.isActive}
        isLoading={isStatusToggling}
      />

      {/* Create Employee Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Employee"
        maxWidth="md"
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Employee Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. EMP001"
              value={formData.employeeCode}
              onChange={e => setFormData({ ...formData, employeeCode: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email Address *</label>
            <input
              type="email"
              required
              placeholder="e.g. john@sify.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Team Assignment</label>
            <select
              value={formData.teamId}
              onChange={e => setFormData({ ...formData, teamId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">No Team Assigned</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="create-is-active"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="create-is-active" className="text-sm font-medium text-gray-700">
              Active Employee
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm disabled:opacity-50"
            >
              {formSubmitting ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        title="Edit Employee"
        maxWidth="md"
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Employee Code *</label>
            <input
              type="text"
              required
              value={formData.employeeCode}
              onChange={e => setFormData({ ...formData, employeeCode: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Team Assignment</label>
            <select
              value={formData.teamId}
              onChange={e => setFormData({ ...formData, teamId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">No Team Assigned</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-is-active"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="edit-is-active" className="text-sm font-medium text-gray-700">
              Active Employee
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setEditingEmployee(null)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
