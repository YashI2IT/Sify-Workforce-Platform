import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { UsersRound, Plus, Edit2, Users, Search, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

interface Team {
  id: string;
  organizationId: string;
  name: string;
  managerId: string | null;
  createdAt?: string;
}

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  teamId: string | null;
  isActive: boolean;
}

export const TeamsList = () => {
  const { employee: currentAuthEmp } = useCurrentEmployee();
  const { showToast } = useToast();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewingMembersTeam, setViewingMembersTeam] = useState<Team | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
  const [teamName, setTeamName] = useState('');
  const [managerId, setManagerId] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [teamsRes, empsRes] = await Promise.all([
        apiClient('/teams?limit=100'),
        apiClient('/employees?limit=100').catch(() => ({ data: [] })),
      ]);

      const teamList = Array.isArray(teamsRes) ? teamsRes : (teamsRes?.data ?? []);
      const empList = Array.isArray(empsRes) ? empsRes : (empsRes?.data ?? []);

      setTeams(teamList);
      setEmployees(empList);
    } catch (err: any) {
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setTeamName('');
    setManagerId('');
    setFormError('');
    setIsCreateOpen(true);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setManagerId(team.managerId || '');
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
      await apiClient('/teams', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: orgId,
          name: teamName.trim(),
          managerId: managerId ? managerId : null,
        }),
      });

      setIsCreateOpen(false);
      showToast('Team created successfully', 'success');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create team');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setFormSubmitting(true);
    setFormError('');

    try {
      await apiClient(`/teams/${editingTeam.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: teamName.trim(),
          managerId: managerId ? managerId : null,
        }),
      });

      setEditingTeam(null);
      showToast('Team updated successfully', 'success');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update team');
    } finally {
      setFormSubmitting(false);
    }
  };

  const getManager = (mgrId: string | null) => {
    if (!mgrId) return null;
    return employees.find(e => e.id === mgrId) || null;
  };

  const getTeamMembers = (teamId: string) => {
    return employees.filter(e => e.teamId === teamId);
  };

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <UsersRound className="w-6 h-6 text-blue-600" />
            Teams
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage operational teams, assigned managers, and member rosters.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            title="Refresh teams"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Team
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search teams by name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Teams Grid / Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-gray-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading teams...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="font-semibold text-gray-800">Error loading teams</p>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 text-sm text-blue-600 hover:underline font-medium"
            >
              Try Again
            </button>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <UsersRound className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-base font-medium text-gray-700">No teams found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery ? 'Try another search term' : 'Get started by creating your first team'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/75 border-b text-gray-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Team Name</th>
                  <th className="px-5 py-3.5">Assigned Manager</th>
                  <th className="px-5 py-3.5">Members</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTeams.map(team => {
                  const manager = getManager(team.managerId);
                  const members = getTeamMembers(team.id);

                  return (
                    <tr key={team.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-semibold text-gray-900">{team.name}</span>
                      </td>
                      <td className="px-5 py-4">
                        {manager ? (
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-gray-900">{manager.name}</div>
                              <div className="text-xs text-gray-500">{manager.email}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No manager assigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setViewingMembersTeam(team)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(team)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit team"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      <Modal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        title="Create New Team"
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
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Team Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Infrastructure Team"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Manager Assignment</label>
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">No Manager (Optional)</option>
              {employees.filter(e => e.isActive).map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Managers can approve timesheets for members of this team.
            </p>
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
              {formSubmitting ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Team Modal */}
      <Modal 
        isOpen={!!editingTeam} 
        onClose={() => setEditingTeam(null)} 
        title="Edit Team"
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
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Team Name *</label>
            <input
              type="text"
              required
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Manager Assignment</label>
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">No Manager</option>
              {employees.filter(e => e.isActive).map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setEditingTeam(null)}
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

      {/* View Team Members Modal */}
      <Modal 
        isOpen={!!viewingMembersTeam} 
        onClose={() => setViewingMembersTeam(null)} 
        title={viewingMembersTeam ? `${viewingMembersTeam.name} Members` : 'Team Members'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500 pb-2 border-b">
            Manager: {viewingMembersTeam && getManager(viewingMembersTeam.managerId)?.name || 'Unassigned'}
          </p>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {viewingMembersTeam && getTeamMembers(viewingMembersTeam.id).length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                No employees are currently assigned to this team.
              </div>
            ) : (
              viewingMembersTeam && getTeamMembers(viewingMembersTeam.id).map(member => (
                <div key={member.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.email} • {member.employeeCode}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${member.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-3 border-t">
            <button
              type="button"
              onClick={() => setViewingMembersTeam(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
