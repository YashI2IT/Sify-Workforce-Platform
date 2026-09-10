import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Briefcase, FileText, CheckCircle } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { getCurrentEmployeeId } from '../../lib/authUtils';

export const Dashboard = () => {
  const [projectCount, setProjectCount] = useState(0);
  const [recentEntriesCount, setRecentEntriesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const employeeId = getCurrentEmployeeId();
        const [projects, timeEntries] = await Promise.all([
          apiClient(`/employees/${employeeId}/projects`).catch(() => []),
          apiClient(`/employees/${employeeId}/time-entries`).catch(() => [])
        ]);
        
        setProjectCount(projects.length || 0);
        setRecentEntriesCount(timeEntries.length || 0);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link 
          to="/time-entries" 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium text-sm transition-colors flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          Log Time
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Projects</p>
              <h3 className="text-2xl font-bold text-gray-900">{loading ? '-' : projectCount}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-full">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Recent Entries</p>
              <h3 className="text-2xl font-bold text-gray-900">{loading ? '-' : recentEntriesCount}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Current Timesheet</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">Draft</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-8 text-center mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Welcome to Sify Workforce</h2>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Manage your assigned projects and log your daily work activities. Check your timesheet status at the end of the week.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/projects" className="text-blue-600 font-medium hover:underline px-4 py-2 border rounded-md hover:bg-blue-50 transition-colors">
            View My Projects
          </Link>
        </div>
      </div>
    </div>
  );
};
