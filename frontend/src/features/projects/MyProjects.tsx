import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { getCurrentEmployeeId } from '../../lib/authUtils';

export const MyProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const employeeId = getCurrentEmployeeId();
        // The backend might not have this exact endpoint yet if it hasn't been built,
        // but the requirements say "Use GET /api/v1/employees/:employeeId/projects".
        // If not implemented on backend, this will 404, but the structure is correct.
        const data = await apiClient(`/employees/${employeeId}/projects`);
        setProjects(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) return <div className="p-6">Loading projects...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">My Assigned Projects</h1>
      
      {projects.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
          No projects assigned to you yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} className="block group">
              <div className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">{p.name}</h3>
                <p className="text-sm text-gray-500 mt-1">Code: {p.code}</p>
                <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {p.status || 'Active'}
                  </span>
                  <span className="text-blue-600 font-medium group-hover:underline">View details</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
