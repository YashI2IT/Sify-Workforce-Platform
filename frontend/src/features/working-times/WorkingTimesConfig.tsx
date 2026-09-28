import React, { useState } from 'react';
import {
  useGetOrgWorkingTimeQuery,
  useUpdateOrgWorkingTimeMutation,
  useGetWorkingTimeOverridesQuery,
  useUpsertEmployeeWorkingTimeMutation,
  useDeleteEmployeeWorkingTimeMutation,
  useGetEmployeesQuery,
} from '../../store/apiSlice';
import { Clock, Plus, Pencil, Trash2 } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type DayKey = typeof DAYS[number];

const DEFAULT_SCHEDULE: Record<DayKey, number> = {
  monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0,
};

const totalHours = (schedule: Record<DayKey, number>) =>
  DAYS.reduce((sum, d) => sum + (Number(schedule[d]) || 0), 0);

// ─────────────────────────────────────────────────────────────────────────────
// Org Default Card
// ─────────────────────────────────────────────────────────────────────────────
const OrgDefaultCard: React.FC = () => {
  const { data: orgWT, isLoading } = useGetOrgWorkingTimeQuery();
  const [updateOrg] = useUpdateOrgWorkingTimeMutation();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<DayKey, number>>(DEFAULT_SCHEDULE);

  const openEdit = () => {
    setForm({
      monday: Number(orgWT?.monday ?? 8),
      tuesday: Number(orgWT?.tuesday ?? 8),
      wednesday: Number(orgWT?.wednesday ?? 8),
      thursday: Number(orgWT?.thursday ?? 8),
      friday: Number(orgWT?.friday ?? 8),
      saturday: Number(orgWT?.saturday ?? 0),
      sunday: Number(orgWT?.sunday ?? 0),
    });
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateOrg(form).unwrap();
      setEditing(false);
    } catch {
      alert('Failed to update organization schedule');
    }
  };

  if (isLoading) return <div className="text-slate-500 text-sm py-4">Loading…</div>;

  const current: Record<DayKey, number> = orgWT ?? DEFAULT_SCHEDULE;

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Organization Default Schedule</h2>
          <p className="text-xs text-slate-500 mt-0.5">Applied to all employees unless overridden</p>
        </div>
        <button
          onClick={openEdit}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-4">
                <label className="w-24 text-sm font-semibold text-slate-700 capitalize">{day}</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={form[day]}
                  onChange={(e) => setForm({ ...form, [day]: Number(e.target.value) })}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-sm font-semibold text-slate-700">
              Total: <span className="text-indigo-700 font-black">{totalHours(form)}h / week</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-6">
          <table className="w-full text-left">
            <thead>
              <tr>
                {DAYS.map((d) => (
                  <th key={d} className="pb-2 text-xs font-bold text-slate-500 uppercase tracking-wider capitalize text-center">{d.slice(0, 3)}</th>
                ))}
                <th className="pb-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {DAYS.map((d) => (
                  <td key={d} className="text-center text-sm font-mono text-slate-800">
                    {Number(current[d]) > 0 ? `${current[d]}h` : <span className="text-slate-300">-</span>}
                  </td>
                ))}
                <td className="text-center text-sm font-black text-indigo-600">{totalHours(current)}h</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Employee Overrides Table
// ─────────────────────────────────────────────────────────────────────────────
const OverridesTable: React.FC = () => {
  const { data: overrides = [], isLoading } = useGetWorkingTimeOverridesQuery();
  const { data: employeesData } = useGetEmployeesQuery({});
  const [upsertOverride] = useUpsertEmployeeWorkingTimeMutation();
  const [deleteOverride] = useDeleteEmployeeWorkingTimeMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState<string>('');
  const [form, setForm] = useState<Record<DayKey, number>>(DEFAULT_SCHEDULE);

  const employees = employeesData?.items ?? [];

  const getEmployeeName = (empId: string) => {
    const emp = employees.find((e: any) => e.id === empId);
    return emp ? `${emp.firstName} ${emp.lastName}` : empId;
  };

  const openNew = () => {
    setEditEmployeeId('');
    setForm({ ...DEFAULT_SCHEDULE });
    setIsModalOpen(true);
  };

  const openEdit = (override: any) => {
    setEditEmployeeId(override.employeeId);
    setForm({
      monday: Number(override.monday),
      tuesday: Number(override.tuesday),
      wednesday: Number(override.wednesday),
      thursday: Number(override.thursday),
      friday: Number(override.friday),
      saturday: Number(override.saturday),
      sunday: Number(override.sunday),
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployeeId) { alert('Please select an employee'); return; }
    try {
      await upsertOverride({ employeeId: editEmployeeId, data: form }).unwrap();
      setIsModalOpen(false);
    } catch {
      alert('Failed to save override');
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (window.confirm('Remove this employee override?')) {
      await deleteOverride(employeeId);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Employee Overrides</h2>
          <p className="text-xs text-slate-500 mt-0.5">Per-employee schedules that override the organization default</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Override
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading…</div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200/80">
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Employee</th>
              {DAYS.map((d) => (
                <th key={d} className="px-3 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">{d.slice(0, 3)}</th>
              ))}
              <th className="px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Total</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(overrides as any[]).map((ov) => (
              <tr key={ov.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">{getEmployeeName(ov.employeeId)}</td>
                {DAYS.map((d) => (
                  <td key={d} className="px-3 py-4 text-sm font-mono text-center text-slate-700">
                    {Number(ov[d]) > 0 ? `${ov[d]}h` : <span className="text-slate-300">-</span>}
                  </td>
                ))}
                <td className="px-4 py-4 text-sm font-black text-center text-indigo-600">{totalHours(ov)}h</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(ov)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(ov.employeeId)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {overrides.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-slate-500 text-sm">
                  No employee overrides configured. All employees use the organization default.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200/60 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                {editEmployeeId ? 'Edit Employee Override' : 'Add Employee Override'}
              </h2>
            </div>
            <div className="overflow-y-auto p-6">
              <form id="overrideForm" onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employee</label>
                  <select
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                    disabled={!!editEmployeeId}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none disabled:opacity-60"
                  >
                    <option value="">Select an employee…</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.email})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Expected Hours / Day</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {DAYS.map((day) => (
                      <div key={day} className="flex items-center gap-3">
                        <label className="w-24 text-sm font-semibold text-slate-700 capitalize">{day}</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={form[day]}
                          onChange={(e) => setForm({ ...form, [day]: Number(e.target.value) })}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Total / Week:</span>
                  <span className="text-lg font-black text-indigo-700">{totalHours(form)}h</span>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="submit" form="overrideForm" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors">
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────────────────
export const WorkingTimesConfig: React.FC = () => {
  return (
    <div className="flex-1 p-8 min-h-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-500" />
            Working Times Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Define expected daily hours for the organization and set per-employee overrides.
          </p>
        </div>

        <OrgDefaultCard />
        <OverridesTable />
      </div>
    </div>
  );
};

