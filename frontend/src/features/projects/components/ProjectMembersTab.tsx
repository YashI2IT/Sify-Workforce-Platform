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
  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200/80';
      case 'MANAGER':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200/80';
    }
  };

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight">Assigned Employees</h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Workforce members assigned to this project via EmployeeProject.</p>
        </div>
        {isAdmin && projectIsActive && (
          <button
            onClick={onAssign}
            className="inline-flex items-center gap-2 bg-[#12161F] hover:bg-slate-800 text-white px-5 py-2 rounded-full font-bold text-xs shadow-xs transition-all duration-200 active:scale-[0.97] cursor-pointer font-sans"
          >
            <UserPlus className="w-4 h-4" /> Assign Employee
          </button>
        )}
      </div>

      {assignedEmployees.length === 0 ? (
        <div className="py-12 text-center text-slate-500 border border-dashed border-slate-200/80 rounded-[14px] bg-slate-50/50">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-800 font-sans">No employees assigned to project</p>
          <p className="text-xs text-slate-400 font-sans mt-1">
            {isAdmin ? 'Click "Assign Employee" to add team members.' : 'No employees assigned.'}
          </p>
        </div>
      ) : (
        <div className="border border-slate-200/80 rounded-[14px] overflow-hidden shadow-2xs bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">
              <tr>
                <th scope="col" className="px-5 py-3">Employee</th>
                <th scope="col" className="px-5 py-3 hidden sm:table-cell">Code</th>
                <th scope="col" className="px-5 py-3 hidden md:table-cell">Email</th>
                <th scope="col" className="px-5 py-3">Role</th>
                {isAdmin && projectIsActive && <th scope="col" className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignedEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs font-sans">
                        {emp.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-900 text-sm font-sans">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                      {emp.employeeCode}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600 font-sans hidden md:table-cell">{emp.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold font-sans border ${getRoleBadge(emp.role)}`}>
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
