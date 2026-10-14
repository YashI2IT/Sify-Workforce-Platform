import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProjectOnboarding } from '../projects/onboarding/ProjectOnboarding';
import {
  useGetProjectsQuery,
  useDeleteProjectMutation,
} from '../../store/apiSlice';
import { EditProjectModal } from '../projects/components/EditProjectModal';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { 
  Plus, 
  Pencil,
  Trash2,
  ExternalLink, 
  Search, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2,
  Clock,
  ChevronDown, ChevronRight,
  Check,
  X,
  Filter,
  Layers,
  Briefcase
} from 'lucide-react';

interface Project {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: string;
  isActive: boolean;
  createdAt?: string;
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
];

const stateOptions = [
  { value: 'all', label: 'All States' },
  { value: 'active', label: 'Active Only' },
  { value: 'inactive', label: 'Archived Only' },
];



export const AllProjectsList = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const { data: projData, isLoading: loading, error: fetchError, refetch: loadProjects } = useGetProjectsQuery();
  const [deleteProjectM, { isLoading: isDeleting }] = useDeleteProjectMutation();
  const { employee } = useCurrentEmployee();

  const canDelete = Boolean(
    employee?.roles?.includes('ADMIN') ||
    employee?.role === 'ADMIN' ||
    employee?.roles?.includes('MANAGER') ||
    employee?.role === 'MANAGER'
  );

  const handleDeleteProject = async (projectId: string, projectName?: string) => {
    if (!canDelete) return;
    const confirmMsg = projectName
      ? `Are you sure you want to delete project "${projectName}"? This action cannot be undone.`
      : 'Are you sure you want to delete this project? This action cannot be undone.';

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteProjectM(projectId).unwrap();
      showToast('Project deleted successfully', 'success');
      if (editingProject?.id === projectId) {
        setEditingProject(null);
      }
      loadProjects();
    } catch (err: any) {
      showToast(err?.data?.message || err?.message || 'Failed to delete project', 'error');
    }
  };
  
  const error = fetchError ? 'Failed to load projects' : '';
  const projects: Project[] = Array.isArray(projData) ? projData : (projData?.data ?? []);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Custom Dropdowns states & refs
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const openCreateModal = () => {
    setIsCreateOpen(true);
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    const matchesActive =
      activeFilter === 'all' ? true :
      activeFilter === 'active' ? p.isActive : !p.isActive;

    return matchesSearch && matchesStatus && matchesActive;
  });

  // Executive Metric Calculations
  const activeCount = projects.filter(p => p.isActive).length;
  const archivedCount = projects.filter(p => !p.isActive).length;
  const activeRate = projects.length > 0 ? Math.round((activeCount / projects.length) * 100) : 0;

  const inProgressCount = projects.filter(p => p.status === 'IN_PROGRESS').length;
  const activeStatusCount = projects.filter(p => p.status === 'ACTIVE').length;
  const planningCount = projects.filter(p => p.status === 'PLANNING').length;
  const onHoldCount = projects.filter(p => p.status === 'ON_HOLD').length;
  const completedCount = projects.filter(p => p.status === 'COMPLETED').length;

  const executionCount = inProgressCount + activeStatusCount;
  const executionRate = projects.length > 0 ? Math.round((executionCount / projects.length) * 100) : 0;
  const completionRate = projects.length > 0 ? Math.round((completedCount / projects.length) * 100) : 0;

  const renderStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 w-[92px] h-7 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-sans whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ACTIVE
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 min-w-[92px] px-2.5 h-7 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 font-sans whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            IN_PROGRESS
          </span>
        );
      case 'PLANNING':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 w-[92px] h-7 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80 font-sans whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            PLANNING
          </span>
        );
      case 'ON_HOLD':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 w-[92px] h-7 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 font-sans whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            ON_HOLD
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 w-[92px] h-7 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 font-sans whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center gap-1.5 min-w-[92px] px-2.5 h-7 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 font-sans whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  const getProjectInitials = (code: string, name: string) => {
    if (code) return code.slice(0, 3).toUpperCase();
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* Header — Public Holidays / Teams / Employees Style */}
      <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Projects
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {projects.length} {projects.length === 1 ? 'initiative' : 'initiatives'}
            </span>
          </div>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
            Manage organization project initiatives, codes, lifecycle status, and operational states.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadProjects}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            title="Refresh projects"
          >
            <RefreshCw className={`w-4 h-4 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${loading ? 'animate-spin text-slate-900' : 'text-slate-500'}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Create Project
          </button>
        </div>
      </div>

      {/* Executive Telemetry Strip (4 Metric Cards) */}
      <div className="animate-slideUpFade-d1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Projects */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-sans">
              Total Projects
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : projects.length}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 font-sans">
                {activeRate}% active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
              {archivedCount > 0
                ? `${activeCount} active, ${archivedCount} archived in portfolio`
                : 'All projects currently active'}
            </p>
          </div>
        </div>

        {/* Card 2: Active Delivery */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-sans">
              Active Delivery
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : executionCount}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 font-sans">
                {executionRate}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
              {executionCount > 0
                ? `${inProgressCount} in progress, ${planningCount} in planning`
                : 'No projects currently in execution'}
            </p>
          </div>
        </div>

        {/* Card 3: Delivered Projects */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-sans">
              Delivered
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : completedCount}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 font-sans">
                {completionRate}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
              {completedCount > 0
                ? `${completedCount} ${completedCount === 1 ? 'project' : 'projects'} completed & delivered`
                : 'No projects completed yet'}
            </p>
          </div>
        </div>

        {/* Card 4: On Hold */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-sans">
              On Hold
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[28px] font-bold text-slate-900 tracking-tight">
              {loading ? '—' : onHoldCount}
            </span>
            <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
              {onHoldCount > 0
                ? `${onHoldCount} ${onHoldCount === 1 ? 'project' : 'projects'} paused or awaiting review`
                : 'No initiatives currently on hold'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Container / Filter Bar & Ledger */}
      <div className="space-y-4 animate-slideUpFade-d2">
        {/* Filter & Search Toolbar */}
        <div className="relative z-30 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-[14px] border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search projects by name or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50/70 border border-slate-200 rounded-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Custom Modern Dropdowns */}
            <div className="flex items-center gap-2.5">
              {/* Status Filter Popover */}
              <div className={`relative ${statusDropdownOpen ? 'z-50' : 'z-20'}`} ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setStatusDropdownOpen(!statusDropdownOpen);
                    setStateDropdownOpen(false);
                  }}
                  className={`h-10 rounded-full border bg-slate-50/70 hover:bg-white px-4 text-xs sm:text-sm text-slate-800 flex items-center justify-between gap-2.5 transition-all shadow-2xs cursor-pointer min-w-[140px] sm:min-w-[160px] font-sans ${
                    statusDropdownOpen
                      ? 'border-slate-900 ring-2 ring-slate-950/15 bg-white'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  aria-label="Filter by Status"
                >
                  <span className="font-medium truncate">
                    {statusOptions.find(o => o.value === statusFilter)?.label || 'All Statuses'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      statusDropdownOpen ? 'rotate-180 text-slate-800' : ''
                    }`}
                  />
                </button>

                {statusDropdownOpen && (
                  <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 z-50 min-w-[180px] max-h-72 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/15 p-1 space-y-0.5 animate-selectDropdownDown">
                    {statusOptions.map(opt => {
                      const isSelected = statusFilter === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => {
                            setStatusFilter(opt.value);
                            setStatusDropdownOpen(false);
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-100 text-slate-950 font-bold'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* State Filter Popover */}
              <div className={`relative ${stateDropdownOpen ? 'z-50' : 'z-20'}`} ref={stateDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setStateDropdownOpen(!stateDropdownOpen);
                    setStatusDropdownOpen(false);
                  }}
                  className={`h-10 rounded-full border bg-slate-50/70 hover:bg-white px-4 text-xs sm:text-sm text-slate-800 flex items-center justify-between gap-2.5 transition-all shadow-2xs cursor-pointer min-w-[130px] sm:min-w-[150px] font-sans ${
                    stateDropdownOpen
                      ? 'border-slate-900 ring-2 ring-slate-950/15 bg-white'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  aria-label="Filter by State"
                >
                  <span className="font-medium truncate">
                    {stateOptions.find(o => o.value === activeFilter)?.label || 'All States'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      stateDropdownOpen ? 'rotate-180 text-slate-800' : ''
                    }`}
                  />
                </button>

                {stateDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50 min-w-[170px] max-h-72 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/15 p-1 space-y-0.5 animate-selectDropdownDown">
                    {stateOptions.map(opt => {
                      const isSelected = activeFilter === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => {
                            setActiveFilter(opt.value);
                            setStateDropdownOpen(false);
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-100 text-slate-950 font-bold'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Filter Tag Bar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1.5 flex items-center gap-1.5 font-sans">
                <Filter className="w-3.5 h-3.5 text-slate-700" /> Filter:
              </span>
              <button
                onClick={() => {
                  setStatusFilter('');
                  setActiveFilter('all');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-sans transition-all cursor-pointer ${
                  statusFilter === '' && activeFilter === 'all'
                    ? 'bg-[#12161F] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All ({projects.length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('IN_PROGRESS');
                  setActiveFilter('active');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-sans transition-all cursor-pointer ${
                  statusFilter === 'IN_PROGRESS'
                    ? 'bg-[#12161F] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                In Progress ({inProgressCount})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('ACTIVE');
                  setActiveFilter('active');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-sans transition-all cursor-pointer ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-[#12161F] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Active ({activeStatusCount})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('COMPLETED');
                  setActiveFilter('all');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-sans transition-all cursor-pointer ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-[#12161F] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium font-sans">
              Showing <span className="font-bold text-slate-900">{filteredProjects.length}</span> of {projects.length} initiatives
            </div>
          </div>
        </div>

        {/* Enterprise Projects Ledger Table */}
        <div className="relative z-10 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[14px] overflow-hidden shadow-xs transition-shadow duration-300 hover:shadow-md">
          {loading ? (
            <div className="py-20 text-center text-slate-500 space-y-3">
              <LoadingSpinner size="md" />
              <p className="text-xs font-sans font-medium text-slate-500">Loading project initiatives...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="font-semibold text-slate-800">Error loading projects</p>
              <p className="text-sm text-rose-600">{error}</p>
              <button
                onClick={loadProjects}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-950 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Briefcase className="w-6 h-6 text-slate-900" />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-sans">No projects found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-sans font-medium">
                {searchQuery || statusFilter || activeFilter !== 'all'
                  ? 'No projects matched your search criteria. Try adjusting your filters.'
                  : 'Get started by creating your first organizational project initiative.'}
              </p>
              {(searchQuery || statusFilter || activeFilter !== 'all') ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('');
                    setActiveFilter('all');
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition-colors cursor-pointer active:scale-95 font-sans"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear All Filters
                </button>
              ) : (
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  Create First Project
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200/80">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Code</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Project Initiative</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Lifecycle Status</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Operational State</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map(proj => (
                    <tr key={proj.id} className="hover:bg-slate-50/60 transition-colors duration-150 group">
                      {/* Project Code */}
                      <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-sans tracking-wide text-slate-900 bg-slate-100 border border-slate-200/80 shadow-2xs">
                          {proj.code}
                        </span>
                      </td>

                      {/* Project Name */}
                      <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-slate-800 transition-transform duration-200 group-hover:scale-105">
                            {getProjectInitials(proj.code, proj.name)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/projects/${proj.id}`}
                              className="font-bold text-slate-900 text-sm hover:text-slate-950 transition-colors inline-flex items-center gap-1.5 group/link"
                            >
                              <span className="truncate group-hover/link:underline">{proj.name}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-slate-900 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-all duration-150" />
                            </Link>
                            <span className="text-xs text-slate-400 font-medium block">
                              Organizational Initiative
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                        {renderStatusBadge(proj.status)}
                      </td>

                      {/* Operational State */}
                      <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                        <span
                          className={`inline-flex items-center justify-center gap-1.5 w-[92px] h-7 rounded-full text-xs font-bold font-sans whitespace-nowrap ${
                            proj.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${proj.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {proj.isActive ? 'Active' : 'Archived'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(proj)}
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit project"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteProject(proj.id, proj.name)}
                              disabled={isDeleting}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete project"
                              aria-label={`Delete ${proj.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <Link
                            to={`/projects/${proj.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-[#12161F] hover:text-slate-600 transition-colors font-sans group rounded-md"
                          >
                            <span>Manage</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal / Onboarding Workflow */}
      {isCreateOpen && (
        <ProjectOnboarding
          isModal={true}
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            loadProjects();
          }}
          onComplete={(projectId) => {
            setIsCreateOpen(false);
            loadProjects();
            navigate(`/projects/${projectId}`);
          }}
        />
      )}

      {/* Complete Edit Project Modal */}
      {editingProject && (
        <EditProjectModal
          projectId={editingProject.id}
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          onSuccess={() => {
            setEditingProject(null);
            loadProjects();
          }}
          canDelete={canDelete}
          onDelete={handleDeleteProject}
        />
      )}
    </div>
  );
};
