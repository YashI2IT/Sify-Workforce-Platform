import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, AlertCircle, RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  isActive: boolean;
}

export const MyProjects = () => {
  const { employee, isLoading: empLoading } = useCurrentEmployee();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProjects = useCallback(async () => {
    if (!employee) return;
    try {
      setLoading(true);
      setError('');
      const data = await apiClient(`/employees/${employee.id}/projects`);
      setProjects(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    if (!empLoading) {
      fetchProjects();
    }
  }, [fetchProjects, empLoading]);

  const activeProjects = projects.filter((p) => p.isActive);
  const inactiveProjects = projects.filter((p) => !p.isActive);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-blue-600" />
            My Projects
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Projects you are currently assigned to. Click a project to manage tasks and activities.
          </p>
        </div>
        <button
          onClick={fetchProjects}
          className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors self-start sm:self-auto"
          title="Refresh projects"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500 space-y-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Loading your projects...</p>
        </div>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
          <p className="font-semibold text-gray-800">Error loading projects</p>
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={fetchProjects} className="mt-2 text-sm text-blue-600 hover:underline font-medium">
            Try Again
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center text-gray-500">
          <Briefcase className="w-10 h-10 mx-auto text-gray-200 mb-3" />
          <p className="text-base font-medium text-gray-700">No projects assigned yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Contact your administrator to be assigned to a project.
          </p>
        </div>
      ) : (
        <>
          {activeProjects.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                Active Projects ({activeProjects.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeProjects.map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`} className="block group">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          {p.status || 'ACTIVE'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">Code: {p.code}</p>
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">Project</span>
                        <span className="text-xs text-blue-600 font-medium flex items-center gap-1 group-hover:underline">
                          View details <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {inactiveProjects.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                Inactive Projects ({inactiveProjects.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveProjects.map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`} className="block group opacity-60 hover:opacity-80 transition-opacity">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="p-2 bg-gray-100 text-gray-400 rounded-lg">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-xs font-semibold">
                          {p.status || 'INACTIVE'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-600">{p.name}</h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">Code: {p.code}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
