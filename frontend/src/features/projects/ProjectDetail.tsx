import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
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
  
  const isAdmin = Boolean(employee?.roles?.includes('ADMIN') || employee?.role === 'ADMIN' || employee?.roles?.includes('MANAGER') || employee?.role === 'MANAGER');

  const { data: projectData, isLoading: projectLoading, error: projectErr, refetch: refetchProject } = useGetProjectDetailsQuery(projectId || '', { skip: !projectId });
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useGetProjectTasksQuery(projectId || '', { skip: !projectId });
  const { data: activitiesData, isLoading: activitiesLoading, refetch: refetchActivities } = useGetProjectActivitiesQuery(projectId || '', { skip: !projectId });
  const { data: employeesData, isLoading: employeesLoading, refetch: refetchEmployees } = useGetProjectEmployeesQuery(projectId || '', { skip: !projectId });
  const { data: unassignedData, refetch: refetchUnassigned } = useGetProjectUnassignedEmployeesQuery(projectId || '', { skip: !projectId });
  
  const isManagerOrAdmin = Boolean(employee?.roles?.includes('MANAGER') || employee?.role === 'MANAGER' || isAdmin);
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

  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const updateIndicator = useCallback(() => {
    const activeBtn = tabRefs.current[activeTab];
    const nav = navRef.current;
    if (activeBtn && nav) {
      const navRect = nav.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      if (btnRect.width > 0) {
        setIndicatorStyle({
          left: btnRect.left - navRect.left + nav.scrollLeft,
          width: btnRect.width,
          opacity: 1,
        });
      }
    }
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
    const timer = setTimeout(updateIndicator, 40);
    window.addEventListener('resize', updateIndicator);
    const nav = navRef.current;
    if (nav) {
      nav.addEventListener('scroll', updateIndicator, { passive: true });
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateIndicator);
      if (nav) {
        nav.removeEventListener('scroll', updateIndicator);
      }
    };
  }, [updateIndicator, tasks.length, activities.length, assignedEmployees.length, isManagerOrAdmin]);

  // Modal States
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [initialTaskData, setInitialTaskData] = useState<any>(null);

  const [actModalOpen, setActModalOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<any>(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const [detailTask, setDetailTask] = useState<any>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');

  useEffect(() => {
    if (taskIdFromUrl && tasks.length > 0) {
      const task = tasks.find((t: any) => t.id === taskIdFromUrl);
      if (task) {
        setActiveTab('tasks');
        setDetailTask(task);
        setDetailPanelOpen(true);
        // Clear param so it doesn't reopen if they close it and refresh
        searchParams.delete('taskId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [taskIdFromUrl, tasks, searchParams, setSearchParams]);

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
        <AlertCircle className="w-12 h-9 text-red-500 mx-auto" />
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
    ...(isManagerOrAdmin ? [{ id: 'time', name: 'Deadlines', icon: CalendarDays, count: null }] : []),
    { id: 'employees', name: 'Members', icon: Users, count: assignedEmployees.length },
  ];

  const getInitials = (code: string, name: string) => {
    if (code) return code.slice(0, 3).toUpperCase();
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderProjectStatusBadge = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ACTIVE
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            IN_PROGRESS
          </span>
        );
      case 'PLANNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            PLANNING
          </span>
        );
      case 'ON_HOLD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            ON_HOLD
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-sans">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={isAdmin ? '/admin/projects' : '/projects'}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-all bg-white px-4 py-2 rounded-full border border-slate-200 shadow-xs font-sans cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
        <button
          onClick={fetchProjectData}
          disabled={loading}
          title="Refresh workspace"
          className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${loading ? 'animate-spin text-slate-900' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Project Card Header */}
      <div className="bg-white border border-slate-200/90 rounded-[14px] shadow-2xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-9 rounded-xl bg-[#12161F] text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs tracking-wider font-sans">
              {getInitials(project.code, project.name)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight font-sans">
                  {project.name}
                </h1>
                {renderProjectStatusBadge(project.status)}
                {!project.isActive && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 font-sans">
                    Inactive
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                  {project.code}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav
          ref={navRef}
          aria-label="Workspace tabs"
          className="relative -mb-px flex space-x-2 sm:space-x-5 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {/* Animated Sliding Underline Bar */}
          {indicatorStyle.width > 0 && (
            <span
              className="absolute bottom-0 h-[2.5px] bg-[#12161F] rounded-t-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none z-10"
              style={{
                transform: `translateX(${indicatorStyle.left}px)`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity,
              }}
            />
          )}

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el; }}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group relative whitespace-nowrap pb-3.5 pt-2 px-3 font-medium text-xs sm:text-sm flex items-center gap-2 transition-all duration-200 rounded-t-xl cursor-pointer font-sans select-none active:scale-[0.96] ${
                  isActive
                    ? `text-slate-950 font-bold ${indicatorStyle.width === 0 ? 'border-b-2 border-slate-950' : ''}`
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors duration-200 ease-out ${
                    isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                <span className="tracking-tight">{tab.name}</span>
                {tab.count !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold font-sans transition-colors duration-300 ${
                      isActive
                        ? 'bg-[#12161F] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200/90 group-hover:text-slate-900'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Contents Content */}
      <div
        key={activeTab}
        className="animate-tabFadeSlide bg-white border border-slate-200/90 rounded-[14px] shadow-2xs"
      >
        {activeTab === 'overview' && (
          <ProjectOverviewTab
            project={project}
            tasks={tasks}
            assignedEmployees={assignedEmployees}
            activities={activities}
            onNavigateTab={(tab: any) => setActiveTab(tab)}
            healthData={healthData}
          />
        )}
        {activeTab === 'tasks' && (
          <ProjectTasksTab
            tasks={tasks}
            milestones={project?.milestones || []}
            employees={assignedEmployees}
            isAdmin={isManagerOrAdmin}
            projectIsActive={project.isActive}
            projectId={projectId!}
            currentEmployeeId={employee?.id}
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
            isAdmin={isManagerOrAdmin}
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
