import { useUpdateProjectTaskMutation } from '../../../store/apiSlice';
import { CalendarDays, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { Select } from '../../../components/ui/Select';
import { DatePicker } from '../../../components/ui/DatePicker';
import { statusColors } from './taskUtils';

interface Task {
  id: string;
  ticketId: string;
  name: string;
  status: string;
  assigneeId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
}

interface Employee {
  id: string;
  name: string;
}

interface ProjectTimeTabProps {
  projectId: string;
  tasks?: Task[];
  employees?: Employee[];
}

export const ProjectTimeTab = ({ projectId, tasks = [], employees = [] }: ProjectTimeTabProps) => {
  const [updateTask] = useUpdateProjectTaskMutation();
  const { showToast } = useToast();

  const handleDateChange = async (taskId: string, field: 'startDate' | 'dueDate', value: string) => {
    try {
      await updateTask({
        projectId,
        taskId,
        data: {
          [field]: value ? new Date(value).toISOString() : null
        }
      }).unwrap();
      showToast('Deadline updated', 'success');
    } catch (error: any) {
      showToast(error.data?.message || 'Failed to update deadline', 'error');
    }
  };

  const handleAssigneeChange = async (taskId: string, value: string) => {
    try {
      await updateTask({
        projectId,
        taskId,
        data: {
          assigneeId: value || null
        }
      }).unwrap();
      showToast('Assignee updated', 'success');
    } catch (error: any) {
      showToast(error.data?.message || 'Failed to update assignee', 'error');
    }
  };


  if (tasks.length === 0) {
    return (
      <div className="p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight">Task Deadlines</h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Assign start and due dates to project tasks.</p>
        </div>
        <div className="py-12 text-center text-slate-500 border border-dashed border-slate-200/80 rounded-[14px] bg-slate-50/50">
          <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-800 font-sans">No tasks found</p>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Create tasks first to assign deadlines.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight">Task Deadlines</h3>
        <p className="text-xs text-slate-500 font-sans mt-0.5">Assign start and due dates to project tasks. Changes save automatically.</p>
      </div>

      <div className="border border-slate-200/80 rounded-[14px] bg-white shadow-2xs overflow-visible">
        <div className="overflow-x-visible">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
            <thead className="bg-slate-50/80 border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3 font-sans font-bold text-[11px] uppercase tracking-wider text-slate-500">Task</th>
                <th className="px-5 py-3 font-sans font-bold text-[11px] uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3 font-sans font-bold text-[11px] uppercase tracking-wider text-slate-500">Assignee</th>
                <th className="px-5 py-3 font-sans font-bold text-[11px] uppercase tracking-wider text-slate-500">Start Date</th>
                <th className="px-5 py-3 font-sans font-bold text-[11px] uppercase tracking-wider text-slate-500">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map(task => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
                const statusCls = statusColors[task.status] ?? statusColors.TODO;
                return (
                  <tr key={task.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0 shadow-2xs">
                          {task.ticketId}
                        </span>
                        <span className="font-semibold text-slate-900 font-sans text-sm" title={task.name}>
                          {task.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold font-sans border ${statusCls}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 min-w-[170px]">
                      <Select
                        options={[
                          { value: '', label: 'Unassigned' },
                          ...employees.map(emp => ({ value: emp.id, label: emp.name }))
                        ]}
                        value={task.assigneeId || ''}
                        onChange={(value) => handleAssigneeChange(task.id, value)}
                        placeholder="Assignee..."
                      />
                    </td>
                    <td className="px-5 py-3.5 min-w-[150px]">
                      <DatePicker
                        value={task.startDate}
                        onChange={(value) => handleDateChange(task.id, 'startDate', value)}
                        placeholder="Start Date"
                      />
                    </td>
                    <td className="px-5 py-3.5 min-w-[190px]">
                      <div className="flex items-center gap-2">
                        <DatePicker
                          value={task.dueDate}
                          onChange={(value) => handleDateChange(task.id, 'dueDate', value)}
                          placeholder="Due Date"
                          isOverdue={!!isOverdue}
                        />
                        {isOverdue && (
                          <span title="Overdue"><AlertCircle className="w-5 h-5 text-rose-500 shrink-0 drop-shadow-xs" /></span>
                        )}
                        {task.status === 'DONE' && (
                          <span title="Completed"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 drop-shadow-xs" /></span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
