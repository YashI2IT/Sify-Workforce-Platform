import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../lib/apiClient';
import { getCurrentEmployeeId } from '../../lib/authUtils';
import { TimeEntryForm } from './TimeEntryForm';

export const MyTimeEntries = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const employeeId = getCurrentEmployeeId();
      const data = await apiClient(`/employees/${employeeId}/time-entries`);
      setEntries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Time Entries</h1>
      
      <TimeEntryForm onSuccess={fetchEntries} />

      <div className="bg-white border rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold p-4 border-b bg-gray-50">Recent Entries</h2>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading entries...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No time entries recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{entry.date}</td>
                    <td className="px-4 py-3 font-medium">{entry.hours}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
