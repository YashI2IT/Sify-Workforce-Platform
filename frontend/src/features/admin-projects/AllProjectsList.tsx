import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { Briefcase, Plus, Edit2, ExternalLink, Search, AlertCircle, RefreshCw } from 'lucide-react';

interface Project {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: string;
  isActive: boolean;
  createdAt?: string;
}

export const AllProjectsList = () => {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'ACTIVE',
    isActive: true,
  });

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient('/projects?limit=100');
      setProjects(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const openCreateModal = () => {
    setFormData({
      name: '',
      code: '',
      status: 'ACTIVE',
      isActive: true,
    });
    setFormError('');
    setIsCreateOpen(true);
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
    setFormData({
      name: proj.name,
      code: proj.code,
      status: proj.status || 'ACTIVE',
      isActive: proj.isActive,
    });
    setFormError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      await apiClient('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          status: formData.status,
          isActive: formData.isActive,
        }),
      });

      setIsCreateOpen(false);
      showToast('Project created successfully', 'success');
      loadProjects();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create project');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setFormSubmitting(true);
    setFormError('');

    try {
      await apiClient(`/projects/${editingProject.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          status: formData.status,
          isActive: formData.isActive,
        }),
      });

      setEditingProject(null);
      showToast('Project updated successfully', 'success');
      loadProjects();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update project');
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    const matchesActive =
      activeFilter === 'all' ? true :
      activeFilter === 'active' ? p.isActive : !p.isActive;

    return matchesSearch && matchesStatus && matchesActive;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PLANNING':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ON_HOLD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-blue-600" />
            Projects
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Overview of organization initiatives, work phases, and deliverables.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadProjects}
            className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            title="Refresh projects"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search projects by name or code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select
            value={activeFilter}
            onChange={e => setActiveFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All States</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-gray-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="font-semibold text-gray-800">Error loading projects</p>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadProjects}
              className="mt-2 text-sm text-blue-600 hover:underline font-medium"
            >
              Try Again
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Briefcase className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-base font-medium text-gray-700">No projects found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery || statusFilter || activeFilter !== 'all'
                ? 'Try adjusting your search criteria'
                : 'Get started by creating your first project'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/75 border-b text-gray-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Project Name</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Active State</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map(proj => (
                  <tr key={proj.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono font-semibold text-xs text-blue-600">
                      {proj.code}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/projects/${proj.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5"
                      >
                        {proj.name}
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          proj.status
                        )}`}
                      >
                        {proj.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          proj.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${proj.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {proj.isActive ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(proj)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit project"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/projects/${proj.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                        >
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        title="Create New Project"
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
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Project Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Workforce Analytics Engine"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Project Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. PRJ-ANALYTICS"
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Initial Status *</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="create-project-active"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="create-project-active" className="text-sm font-medium text-gray-700">
              Active Project
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
              {formSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal 
        isOpen={!!editingProject} 
        onClose={() => setEditingProject(null)} 
        title="Edit Project"
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
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Project Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Project Code *</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Project Status *</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-project-active"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="edit-project-active" className="text-sm font-medium text-gray-700">
              Active Project
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setEditingProject(null)}
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
