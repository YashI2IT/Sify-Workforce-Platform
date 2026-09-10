import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

export const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const [projectData, tasksData, activitiesData] = await Promise.all([
          apiClient(`/projects/${projectId}`),
          apiClient(`/projects/${projectId}/tasks`),
          apiClient(`/projects/${projectId}/activities`)
        ]);
        setProject(projectData);
        setTasks(tasksData);
        setActivities(activitiesData);
      } catch (err: any) {
        setError(err.message || 'Failed to load project details');
      } finally {
        setLoading(false);
      }
    };
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  if (loading) return <div className="p-6">Loading project details...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!project) return <div className="p-6">Project not found</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <Link to="/projects" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          &larr; Back to Projects
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
        <p className="text-gray-500">Code: {project.code}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No tasks available.</p>
          ) : (
            <ul className="space-y-3">
              {tasks.map((t: any) => (
                <li key={t.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">{t.name}</span>
                  <span className="text-gray-500">{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Activities</h2>
          {activities.length === 0 ? (
            <p className="text-gray-500 text-sm">No activities configured.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a: any) => (
                <li key={a.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">{a.name}</span>
                  <span className="text-gray-500">{a.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
