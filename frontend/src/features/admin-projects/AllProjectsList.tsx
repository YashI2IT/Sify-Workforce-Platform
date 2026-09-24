import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation
} from '../../store/apiSlice';
import { 
  Plus, 
  Edit2, 
  ExternalLink, 
  Search, 
  AlertCircle, 
  RefreshCw,
  CheckCircle2,
  Clock,
  ChevronDown,
  Check,
  X,
  Filter,
  Layers
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
  const { showToast } = useToast();
  
  const { data: projData, isLoading: loading, error: fetchError, refetch: loadProjects } = useGetProjectsQuery();
  const [createProject] = useCreateProjectMutation();
  const [updateProjectM] = useUpdateProjectMutation();
  
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
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'ACTIVE',
    isActive: true,
  });

  // Handle outside clicks for custom dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setStateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openCreateModal = () => {
    setFormData({
      name: '',
      code: '',
      status: 'ACTIVE',
      isActive: true,
    });
    setFormError('');
    setIsCreateOpen(true);
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
    setFormData({
      name: proj.name,
      code: proj.code,
      status: proj.status || 'ACTIVE',
      isActive: proj.isActive,
    });
    setFormError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      await createProject({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        status: formData.status,
        isActive: formData.isActive,
      }).unwrap();

      setIsCreateOpen(false);
      showToast('Project created successfully', 'success');
      loadProjects();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create project');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setFormSubmitting(true);
    setFormError('');

    try {
      await updateProjectM({
        id: editingProject.id,
        data: {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          status: formData.status,
          isActive: formData.isActive,
        }
      }).unwrap();

      setEditingProject(null);
      showToast('Project updated successfully', 'success');
      loadProjects();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update project');
    } finally {
      setFormSubmitting(false);
    }
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            ACTIVE
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            IN_PROGRESS
          </span>
        );
      case 'PLANNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            PLANNING
          </span>
        );
      case 'ON_HOLD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            ON_HOLD
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white shadow-xs border border-slate-800 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                  Projects
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                  {projects.length} {projects.length === 1 ? 'initiative' : 'initiatives'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Portfolio initiatives, resource assignment milestones, deliverables, and lifecycle tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={loadProjects}
            className="p-2.5 border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Refresh projects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      </div>

      {/* Executive Telemetry Strip (4 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Portfolio */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Portfolio Vitality
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                {loading ? '—' : activeCount}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">
                / {projects.length} active ({activeRate}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${activeRate}%` }} 
              />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Archived initiatives</span>
            <span className="font-mono text-slate-700">{archivedCount}</span>
          </div>
        </div>

        {/* Card 2: Execution Pacing */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Active Delivery
            </span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                {loading ? '—' : executionCount}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">
                in execution ({executionRate}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2 gap-0.5">
              <div 
                className="bg-blue-600 h-full transition-all" 
                style={{ width: `${projects.length > 0 ? (inProgressCount / projects.length) * 100 : 0}%` }} 
                title={`${inProgressCount} In Progress`}
              />
              <div 
                className="bg-emerald-500 h-full transition-all" 
                style={{ width: `${projects.length > 0 ? (activeStatusCount / projects.length) * 100 : 0}%` }} 
                title={`${activeStatusCount} Active`}
              />
              <div 
                className="bg-purple-400 h-full transition-all" 
                style={{ width: `${projects.length > 0 ? (planningCount / projects.length) * 100 : 0}%` }} 
                title={`${planningCount} Planning`}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>In progress · Planning</span>
            <span className="font-mono text-slate-700">{inProgressCount} · {planningCount}</span>
          </div>
        </div>

        {/* Card 3: Completion Rate */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Completion Rate
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                {loading ? '—' : `${completionRate}%`}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">
                ({completedCount} delivered)
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div 
                className="bg-slate-900 h-full rounded-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }} 
              />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>On hold / paused</span>
            <span className="font-mono text-slate-700">{onHoldCount}</span>
          </div>
        </div>

        {/* Card 4: Governance Pipeline */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Code Governance
            </span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                {loading ? '—' : projects.length}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">
                tracked codes
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Structured time allocation billing keys
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Active timesheet targets</span>
            <span className="font-mono text-slate-700">{activeCount}</span>
          </div>
        </div>
      </div>

      {/* Main Container / Filter Bar & Ledger */}
      <div className="space-y-4">
        {/* Filter & Search Toolbar */}
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search projects by name or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50/50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Custom Modern Dropdowns */}
            <div className="flex items-center gap-2">
              {/* Status Filter Popover */}
              <div className="relative" ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setStatusDropdownOpen(!statusDropdownOpen);
                    setStateDropdownOpen(false);
                  }}
                  className={`h-9 sm:h-10 rounded-xl border bg-slate-50/50 hover:bg-white px-3 text-xs sm:text-sm text-slate-800 flex items-center justify-between gap-2.5 transition-all shadow-2xs cursor-pointer min-w-[140px] sm:min-w-[160px] ${
                    statusDropdownOpen
                      ? 'border-slate-900 ring-2 ring-slate-950/15 bg-white'
                      : 'border-slate-200/90 hover:border-slate-300'
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
                  <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 z-30 min-w-[180px] rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 p-1 space-y-0.5 animate-fadeIn">
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
              <div className="relative" ref={stateDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setStateDropdownOpen(!stateDropdownOpen);
                    setStatusDropdownOpen(false);
                  }}
                  className={`h-9 sm:h-10 rounded-xl border bg-slate-50/50 hover:bg-white px-3 text-xs sm:text-sm text-slate-800 flex items-center justify-between gap-2.5 transition-all shadow-2xs cursor-pointer min-w-[130px] sm:min-w-[150px] ${
                    stateDropdownOpen
                      ? 'border-slate-900 ring-2 ring-slate-950/15 bg-white'
                      : 'border-slate-200/90 hover:border-slate-300'
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
                  <div className="absolute right-0 top-full mt-1.5 z-30 min-w-[170px] rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 p-1 space-y-0.5 animate-fadeIn">
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
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-medium text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Quick:
              </span>
              <button
                onClick={() => {
                  setStatusFilter('');
                  setActiveFilter('all');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  statusFilter === '' && activeFilter === 'all'
                    ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                All ({projects.length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('IN_PROGRESS');
                  setActiveFilter('active');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  statusFilter === 'IN_PROGRESS'
                    ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                In Progress ({inProgressCount})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('ACTIVE');
                  setActiveFilter('active');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                Active ({activeStatusCount})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('COMPLETED');
                  setActiveFilter('all');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500">
              Showing <span className="font-semibold text-slate-900">{filteredProjects.length}</span> of {projects.length} initiatives
            </div>
          </div>
        </div>

        {/* Enterprise Projects Ledger Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
          {loading ? (
            <div className="py-20 text-center text-slate-500 space-y-3">
              <LoadingSpinner size="md" />
              <p className="text-xs font-mono font-medium text-slate-500">Loading project initiatives...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="font-semibold text-slate-800">Error loading projects</p>
              <p className="text-sm text-rose-600">{error}</p>
              <button
                onClick={loadProjects}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-16 px-4 text-center">
              {/* Handcrafted Architectural Vector SVG Empty State */}
              <svg className="w-24 h-24 mx-auto text-slate-300 mb-3" viewBox="0 0 120 120" fill="none">
                <rect x="22" y="26" width="76" height="68" rx="12" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" />
                <rect x="36" y="44" width="48" height="8" rx="3" fill="#E2E8F0" />
                <rect x="36" y="58" width="32" height="6" rx="3" fill="#CBD5E1" />
                <rect x="36" y="70" width="24" height="6" rx="3" fill="#CBD5E1" />
                <circle cx="88" cy="36" r="10" fill="#0F172A" />
                <path d="M88 32V40M84 36H92" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-base font-bold text-slate-900 font-display">No projects found</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
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
                  className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear All Filters
                </button>
              ) : (
                <button
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create First Project
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  <tr>
                    <th scope="col" className="px-6 py-4">Code</th>
                    <th scope="col" className="px-5 py-4">Project Initiative</th>
                    <th scope="col" className="px-5 py-4">Lifecycle Status</th>
                    <th scope="col" className="px-5 py-4">Operational State</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map(proj => (
                    <tr key={proj.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                      {/* Project Code */}
                      <td className="px-6 py-4.5 font-mono text-xs">
                        <span className="inline-block font-mono text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 font-bold tracking-wide shadow-2xs">
                          {proj.code}
                        </span>
                      </td>

                      {/* Project Name */}
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-950 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-slate-800">
                            {getProjectInitials(proj.code, proj.name)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/projects/${proj.id}`}
                              className="font-semibold text-slate-900 text-sm hover:text-slate-950 transition-colors inline-flex items-center gap-1.5 group"
                            >
                              <span className="truncate group-hover:underline">{proj.name}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                            </Link>
                            <span className="text-[11px] font-mono text-slate-400 block">
                              Organizational Initiative
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4.5">
                        {renderStatusBadge(proj.status)}
                      </td>

                      {/* Operational State */}
                      <td className="px-5 py-4.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs ${
                            proj.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${proj.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {proj.isActive ? 'Active' : 'Archived'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(proj)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit project"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/projects/${proj.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs active:scale-[0.99]"
                          >
                            Manage →
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

      {/* Create Project Modal */}
      <Modal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        title="Create New Project"
        maxWidth="md"
      >
        {formError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Workforce Analytics Engine"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Project Code *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. PRJ-ANALYTICS"
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm uppercase focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-mono bg-white text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Initial Status *
            </label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="create-project-active"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 text-slate-950 focus:ring-slate-950 h-4 w-4"
            />
            <label htmlFor="create-project-active" className="text-sm font-medium text-slate-700">
              Active Project
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {formSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal 
        isOpen={!!editingProject} 
        onClose={() => setEditingProject(null)} 
        title="Edit Project"
        maxWidth="md"
      >
        {formError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Project Code *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm uppercase focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-mono bg-white text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Project Status *
            </label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-project-active"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 text-slate-950 focus:ring-slate-950 h-4 w-4"
            />
            <label htmlFor="edit-project-active" className="text-sm font-medium text-slate-700">
              Active Project
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingProject(null)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
