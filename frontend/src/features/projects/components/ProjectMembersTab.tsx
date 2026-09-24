import { UserPlus, Trash2, Users } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  role: string;
}

interface ProjectMembersTabProps {
  assignedEmployees: Employee[];
  isAdmin: boolean;
  projectIsActive: boolean;
  onAssign: () => void;
  onRemove: (emp: Employee) => void;
}

export const ProjectMembersTab = ({
  assignedEmployees,
  isAdmin,
  projectIsActive,
  onAssign,
  onRemove
}: ProjectMembersTabProps) => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-display">Assigned Employees</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Workforce members assigned to this project via EmployeeProject.</p>
        </div>
        {isAdmin && projectIsActive && (
          <button
            onClick={onAssign}
            className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Assign Employee
          </button>
        )}
      </div>

      {assignedEmployees.length === 0 ? (
        <div className="py-16 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-800 font-display">No employees assigned to project</p>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin ? 'Click "Assign Employee" to add team members.' : 'No employees assigned.'}
          </p>
        </div>
      ) : (
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              <tr>
                <th scope="col" className="px-5 py-3.5">Employee</th>
                <th scope="col" className="px-5 py-3.5 hidden sm:table-cell">Code</th>
                <th scope="col" className="px-5 py-3.5 hidden md:table-cell">Email</th>
                <th scope="col" className="px-5 py-3.5">Role</th>
                {isAdmin && projectIsActive && <th scope="col" className="px-5 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignedEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900 text-xs sm:text-sm font-display">{emp.name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 font-mono hidden sm:table-cell">{emp.employeeCode}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600 font-mono hidden md:table-cell">{emp.email}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80">
                      {emp.role}
                    </span>
                  </td>
                  {isAdmin && projectIsActive && (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => onRemove(emp)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
