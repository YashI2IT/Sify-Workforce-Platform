import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { getCurrentEmployeeId } from '../../lib/authUtils';

export const TimeEntryForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [remarks, setRemarks] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load employee projects
    const employeeId = getCurrentEmployeeId();
    apiClient(`/employees/${employeeId}/projects`).then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      Promise.all([
        apiClient(`/projects/${selectedProject}/tasks`),
        apiClient(`/projects/${selectedProject}/activities`)
      ]).then(([tasksData, activitiesData]) => {
        setTasks(tasksData);
        setActivities(activitiesData);
      }).catch(console.error);
    } else {
      setTasks([]);
      setActivities([]);
    }
    setSelectedTask('');
    setSelectedActivity('');
  }, [selectedProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await apiClient('/time-entries', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: getCurrentEmployeeId(),
          projectId: selectedProject,
          taskId: selectedTask,
          activityId: selectedActivity,
          date,
          hours: parseFloat(hours),
          remarks: remarks || null,
        }),
      });
      
      // Reset form
      setSelectedProject('');
      setDate(new Date().toISOString().split('T')[0]);
      setHours('');
      setRemarks('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save time entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4 border-b pb-2">Log Time</h2>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-200">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
            <input type="number" step="0.5" min="0.5" required value={hours} onChange={e => setHours(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" placeholder="e.g. 8" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select required value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="">Select Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
            <select required disabled={!selectedProject} value={selectedTask} onChange={e => setSelectedTask(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Select Task</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
            <select required disabled={!selectedProject} value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
              <option value="">Select Activity</option>
              {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" placeholder="Notes..." />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">
            {loading ? 'Saving...' : 'Save Time Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};
