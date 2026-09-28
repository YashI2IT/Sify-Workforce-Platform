import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, AlertCircle, FileText, CheckSquare,
  Users, Edit2, RefreshCw, CalendarDays
} from 'lucide-react';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import {
  useGetProjectDetailsQuery,
  useGetProjectTasksQuery,
  useGetProjectActivitiesQuery,
  useGetProjectEmployeesQuery,
  useGetProjectUnassignedEmployeesQuery,
  useRemoveProjectEmployeeMutation,
  useGetProjectHealthQuery
} from '../../store/apiSlice';

// Components
import { ProjectOverviewTab } from './components/ProjectOverviewTab';
import { ProjectTasksTab } from './components/ProjectTasksTab';
import { ProjectActivitiesTab } from './components/ProjectActivitiesTab';
import { ProjectTimeTab } from './components/ProjectTimeTab';
import { ProjectMembersTab } from './components/ProjectMembersTab';

// Modals
import { TaskFormModal } from './components/TaskFormModal';
import { ActivityFormModal } from './components/ActivityFormModal';
import { AssignEmployeeModal } from './components/AssignEmployeeModal';
import { TaskDetailPanel } from './components/TaskDetailPanel';

export const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { employee } = useCurrentEmployee();
  const { showToast } = useToast();
  
  const isAdmin = employee?.roles?.includes('ADMIN') || false;

  const { data: projectData, isLoading: projectLoading, error: projectErr, refetch: refetchProject } = useGetProjectDetailsQuery(projectId || '', { skip: !projectId });
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useGetProjectTasksQuery(projectId || '', { skip: !projectId });
  const { data: activitiesData, isLoading: activitiesLoading, refetch: refetchActivities } = useGetProjectActivitiesQuery(projectId || '', { skip: !projectId });
  const { data: employeesData, isLoading: employeesLoading, refetch: refetchEmployees } = useGetProjectEmployeesQuery(projectId || '', { skip: !projectId });
  const { data: unassignedData, refetch: refetchUnassigned } = useGetProjectUnassignedEmployeesQuery(projectId || '', { skip: !projectId });
  
  const isManagerOrAdmin = employee?.roles?.includes('MANAGER') || isAdmin;
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useGetProjectHealthQuery(projectId || '', { skip: !projectId || !isManagerOrAdmin });
  
  const [removeEmpM] = useRemoveProjectEmployeeMutation();

  const loading = projectLoading || tasksLoading || activitiesLoading || employeesLoading || healthLoading;
  const error = projectErr ? 'Failed to load project details' : '';

  const project = projectData || null;
  const tasks = Array.isArray(tasksData) ? tasksData : [];
  const activities = Array.isArray(activitiesData) ? activitiesData : [];
  const assignedEmployees = Array.isArray(employeesData) ? employeesData : [];
  const unassignedEmployees = Array.isArray(unassignedData) ? unassignedData : [];

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'activities' | 'time' | 'employees'>('overview');

  // Modal States
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [initialTaskData, setInitialTaskData] = useState<any>(null);

  const [actModalOpen, setActModalOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<any>(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const [detailTask, setDetailTask] = useState<any>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const fetchProjectData = () => {
    refetchProject();
    refetchTasks();
    refetchActivities();
    refetchEmployees();
    refetchUnassigned();
    if (isManagerOrAdmin) refetchHealth();
  };

  const handleRemoveEmployee = async (emp: any) => {
    try {
      await removeEmpM({
        projectId: projectId as string,
        employeeId: emp.id
      }).unwrap();
      showToast('Employee removed from project successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove employee', 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-500 space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium">Loading project workspace...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Failed to Load Project</h2>
        <p className="text-sm text-red-600">{error || 'Project not found.'}</p>
        <Link
          to={isAdmin ? '/admin/projects' : '/projects'}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: FileText, count: null },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare, count: tasks.length },
    { id: 'activities', name: 'Activities', icon: Edit2, count: activities.length },
    { id: 'time', name: 'Deadlines', icon: CalendarDays, count: null },
    { id: 'employees', name: 'Members', icon: Users, count: assignedEmployees.length },
  ];

  const getInitials = (code: string, name: string) => {
    if (code) return code.slice(0, 3).toUpperCase();
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to={isAdmin ? '/admin/projects' : '/projects'}
          className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-slate-600 hover:text-slate-950 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Projects
        </Link>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchProjectData}
          title="Refresh workspace"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Project Card Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0 border border-slate-800 shadow-2xs">
              {getInitials(project.code, project.name)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 font-display tracking-tight">{project.name}</h1>
                <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'} className="font-mono">
                  {project.status}
                </Badge>
                {!project.isActive && (
                  <Badge variant="outline" className="font-mono">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="mt-1.5">
                <span className="inline-block font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                  {project.code}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-slate-950 text-slate-950 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                {tab.name}
                {tab.count !== null && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${
                    isActive ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Contents Content */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs min-h-[400px]">
        {activeTab === 'overview' && (
          <ProjectOverviewTab
            project={project}
            tasks={tasks}
            assignedEmployees={assignedEmployees}
            healthData={healthData}
          />
        )}
        {activeTab === 'tasks' && (
          <ProjectTasksTab
            tasks={tasks}
            employees={assignedEmployees}
            isAdmin={isAdmin}
            projectIsActive={project.isActive}
            projectId={projectId!}
            onAdd={(initialData?: any) => { 
              setEditingTask(null); 
              setInitialTaskData(initialData || null);
              setTaskModalOpen(true); 
            }}
            onEdit={(t) => { setEditingTask(t); setTaskModalOpen(true); }}
            onViewDetail={(t) => { setDetailTask(t); setDetailPanelOpen(true); }}
          />
        )}
        {activeTab === 'activities' && (
          <ProjectActivitiesTab
            activities={activities}
            isAdmin={isAdmin}
            projectIsActive={project.isActive}
            onAdd={() => { setEditingAct(null); setActModalOpen(true); }}
            onEdit={(a) => { setEditingAct(a); setActModalOpen(true); }}
          />
        )}
        {activeTab === 'time' && (
          <ProjectTimeTab projectId={projectId as string} tasks={tasks} employees={assignedEmployees} />
        )}
        {activeTab === 'employees' && (
          <ProjectMembersTab
            assignedEmployees={assignedEmployees}
            isAdmin={isAdmin}
            projectIsActive={project.isActive}
            onAssign={() => setAssignModalOpen(true)}
            onRemove={handleRemoveEmployee}
          />
        )}
      </div>

      {projectId && (
        <>
          <TaskFormModal
            isOpen={taskModalOpen}
            onClose={() => { setTaskModalOpen(false); setInitialTaskData(null); }}
            projectId={projectId}
            editingTask={editingTask}
            initialData={initialTaskData}
            employees={assignedEmployees}
            tasks={tasks}
          />
          <ActivityFormModal
            isOpen={actModalOpen}
            onClose={() => setActModalOpen(false)}
            projectId={projectId}
            editingAct={editingAct}
          />
          <AssignEmployeeModal
            isOpen={assignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            projectId={projectId}
            unassignedEmployees={unassignedEmployees}
          />
          <TaskDetailPanel
            task={detailTask}
            isOpen={detailPanelOpen}
            onClose={() => setDetailPanelOpen(false)}
            tasks={tasks}
            employees={assignedEmployees}
            isAdmin={isAdmin}
            projectIsActive={project.isActive}
            projectId={projectId}
            onEdit={(t) => { setEditingTask(t); setTaskModalOpen(true); }}
          />
        </>
      )}
    </div>
  );
};
