import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { sanitizeReturnTo } from '../../lib/authUtils';
import { 
  Users, 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  CalendarCheck, 
  Building2, 
  UserCheck, 
  Check, 
  BarChart3, 
  SlidersHorizontal, 
  FolderGit2, 
  Shield, 
  RotateCcw, 
  PieChart, 
  Activity, 
  FileSpreadsheet,
  ChevronRight,
  Lock,
  Calendar,
  Menu,
  X
} from 'lucide-react';
import type { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function ScrollReveal({ 
  children, 
  className = '', 
  delay = 0,
  id,
}: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
  id?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -40px 0px' }
    );

    const current = domRef.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  return (
    <div
      id={id}
      ref={domRef}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: '700ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`transition-all will-change-transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
    >
      {children}
    </div>
  );
}

function ScrollCard({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );

    const current = domRef.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  return (
    <div
      ref={domRef}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: '650ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`transition-all will-change-transform ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-7 scale-[0.98]'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function LandingPage() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [scrollProgress, setScrollProgress] = useState(0);
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const rawReturnTo = searchParams.get('returnTo');
  const loginUrl = rawReturnTo 
    ? `/login?returnTo=${encodeURIComponent(sanitizeReturnTo(rawReturnTo))}` 
    : '/login';

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Calculate scroll progress over the first 280px of scroll
          const currentY = window.scrollY;
          const progress = Math.min(Math.max(currentY / 280, 0), 1);
          setScrollProgress(progress);
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const blurValue = (1 - scrollProgress) * 12;
  const scaleValue = 0.93 + 0.07 * scrollProgress;
  const rotateXValue = (1 - scrollProgress) * 14;
  const opacityValue = 0.7 + 0.3 * scrollProgress;

  type PreviewTabId = 'dashboard' | 'projects' | 'time-entries' | 'timesheets' | 'approvals';

  const previewTabs: { id: PreviewTabId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'time-entries', label: 'Time Entries', icon: Clock },
    { id: 'timesheets', label: 'Timesheets', icon: CalendarCheck },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle2, badge: '1' },
  ];

  const [activeTab, setActiveTab] = useState<PreviewTabId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const productAreas = [
    {
      title: 'Workforce',
      description: 'Manage employees, teams, roles and manager relationships.',
      benefit: 'Organizational Structure',
      icon: Users,
    },
    {
      title: 'Projects',
      description: 'Organize projects, requirements, tasks, activities and project assignments.',
      benefit: 'Scoped Deliverables',
      icon: Briefcase,
    },
    {
      title: 'Time Tracking',
      description: 'Record hours against the project, task and activity where work is performed.',
      benefit: 'Granular Attribution',
      icon: Clock,
    },
    {
      title: 'Timesheets',
      description: 'Review weekly hours, submit timesheets and track their approval status.',
      benefit: 'Structured Cycles',
      icon: CalendarCheck,
    },
    {
      title: 'Approvals',
      description: 'Managers can review submissions, approve completed work or reject them with a correction comment.',
      benefit: 'Supervisory Control',
      icon: CheckCircle2,
    },
    {
      title: 'Reports',
      description: 'View employee, team and project-level time information and utilization.',
      benefit: 'Operational Visibility',
      icon: BarChart3,
    },
  ];

  const workflowSteps = [
    { step: '01', title: 'Organization', summary: 'Establish tenant & company profile', icon: Building2 },
    { step: '02', title: 'Employee & Team', summary: 'Provision members & manager links', icon: Users },
    { step: '03', title: 'Project', summary: 'Create initiatives & assign staff', icon: Layers },
    { step: '04', title: 'Task & Activity', summary: 'Define deliverables & work types', icon: SlidersHorizontal },
    { step: '05', title: 'Time Entry', summary: 'Log daily hours with full attribution', icon: Clock },
    { step: '06', title: 'Weekly Timesheet', summary: 'Batch Mon–Sun entries for review', icon: CalendarCheck },
    { step: '07', title: 'Manager Approval', summary: 'Validate submissions or request fix', icon: UserCheck },
    { step: '08', title: 'Reporting', summary: 'Analyze team hours & utilization', icon: BarChart3 },
  ];

  const roles = [
    {
      role: 'Employee',
      description: 'Track daily work, manage time entries and submit weekly timesheets.',
      scope: 'Personal Workspace',
      capabilities: ['Daily time logging', 'Weekly timesheet submission', 'Correction re-submissions'],
      icon: Users,
      badgeColor: 'text-[#27F087] bg-[#0F2F24] border-[#1E4D3C]',
    },
    {
      role: 'Manager',
      description: 'Review team timesheets, approve submissions and request corrections when required.',
      scope: 'Team Management',
      capabilities: ['Team submission queue', 'One-click approvals', 'Correction comments & revisions'],
      icon: UserCheck,
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
    },
    {
      role: 'Admin',
      description: 'Manage the organization, employees, teams, projects and organization-level reporting.',
      scope: 'System Administration',
      capabilities: ['Organization configuration', 'Project & team assignments', 'Organization-level reporting'],
      icon: Shield,
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    },
  ];

  const reportsList = [
    { name: 'Employee Time Summary', desc: 'Detailed breakdown of logged hours across projects and tasks', metricType: 'Personal Breakdown', icon: PieChart },
    { name: 'Manager Dashboard', desc: 'Overview of team status, submission velocity, and pending approvals', metricType: 'Team Approvals', icon: BarChart3 },
    { name: 'Team Utilization', desc: 'Capacity, active days, and project hour distribution across teams', metricType: 'Capacity %', icon: Activity },
    { name: 'Project Hours', desc: 'Aggregated project hours and operational activity category breakdown', metricType: 'Project Category', icon: Clock },
    { name: 'Project Analysis', desc: 'Deep dive into project deliverables, tasks, and logging trends', metricType: 'Deliverables & Trends', icon: FileSpreadsheet },
  ];

  const crossGridPattern = `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M16 11V21M11 16H21' stroke='rgba(255,255,255,0.18)' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")`;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 flex flex-col antialiased selection:bg-[#27F087] selection:text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27F087] rounded-md group">
              <div className="w-8 h-8 rounded-lg bg-[#27F087] flex items-center justify-center text-slate-950 font-black text-sm shadow-xs transition-transform group-hover:scale-105">
                SW
              </div>
              <span className="text-xl font-bold text-slate-950 tracking-tight font-display">Sify Workforce</span>
            </Link>

            {/* Structured Navigation Links */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              <a href="#product" className="px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 rounded-full transition-colors">
                Product
              </a>
              <a href="#workflow" className="px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 rounded-full transition-colors">
                Workflow
              </a>
              <a href="#roles" className="px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 rounded-full transition-colors">
                Roles
              </a>
              <a href="#time-tracking" className="px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 rounded-full transition-colors">
                Time Logging
              </a>
              <a href="#reports" className="px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 rounded-full transition-colors">
                Analytics
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800 text-sm px-5 py-2 font-medium shadow-xs">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to={loginUrl}>
                  <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-950 text-sm font-medium rounded-full px-4">
                    Log In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800 text-sm px-5 py-2 font-medium shadow-xs hover:shadow-md transition-all active:scale-95">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors ml-1"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 space-y-2 shadow-lg animate-slideDown">
            <nav className="flex flex-col space-y-1">
              <a
                href="#product"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Product
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Workflow
              </a>
              <a
                href="#roles"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Roles
              </a>
              <a
                href="#time-tracking"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Time Logging
              </a>
              <a
                href="#reports"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Analytics
              </a>
            </nav>
            <div className="pt-2 border-t border-slate-200/80 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full rounded-xl bg-slate-950 text-white text-sm py-2 font-medium">
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to={loginUrl} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl text-slate-700 text-sm py-2 font-medium">
                      Log In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full rounded-xl bg-slate-950 text-white text-sm py-2 font-medium">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 space-y-16 sm:space-y-24">
        {/* 1. Hero Section */}
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#27F087]" />
                <span>Workforce Operations Platform</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-slate-950 leading-[1.08]">
                Manage People. Organize Work. Track Time.
              </h1>

              {/* Description */}
              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
                Sify Workforce brings employees, teams, projects, tasks, activities and timesheets together in one structured workspace.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-full bg-slate-950 text-white hover:bg-slate-800 text-base px-8 h-12 font-medium shadow-sm transition-transform active:scale-98">
                    Get Started
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full border-slate-300 text-slate-800 hover:bg-slate-100 text-base px-7 h-12 font-medium">
                    Log In
                  </Button>
                </Link>
              </div>

              {/* Small supporting line */}
              <p className="text-sm text-slate-500 font-medium pt-1">
                From daily time entries to weekly manager approval.
              </p>
            </div>

            {/* Hero Workspace Preview with Scroll-Driven Focus Animation & Apple Window Frame */}
            <div 
              className="mt-12 relative max-w-5xl mx-auto transition-all duration-300 ease-out will-change-transform"
              style={{
                perspective: '1200px',
                transform: scrollProgress >= 0.99 
                  ? 'none' 
                  : `perspective(1200px) rotateX(${rotateXValue}deg) scale(${scaleValue})`,
                filter: blurValue > 0.1 ? `blur(${blurValue}px)` : 'none',
                opacity: opacityValue,
                transformOrigin: 'top center',
              }}
            >
              {/* Apple macOS Window Container with Subtle Green Neon Border */}
              <div className="rounded-2xl bg-white border border-[#27F087]/25 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_0_18px_rgba(39,240,135,0.12)] ring-1 ring-slate-900/10 overflow-hidden flex flex-col transition-all">
                
                {/* Apple macOS Window Header Chrome */}
                <div className="h-11 px-4 bg-[#16181D] border-b border-white/[0.08] flex items-center justify-between text-xs select-none backdrop-blur-md">
                  {/* macOS Traffic Lights */}
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] cursor-pointer hover:opacity-90 active:scale-95 transition-all inline-block" title="Close" />
                    <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] cursor-pointer hover:opacity-90 active:scale-95 transition-all inline-block" title="Minimize" />
                    <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] cursor-pointer hover:opacity-90 active:scale-95 transition-all inline-block" title="Zoom" />
                  </div>

                  {/* Window Address / Page URL Capsule */}
                  <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono text-slate-300 shadow-2xs transition-colors cursor-default">
                    <Lock className="w-3 h-3 text-[#27F087]" />
                    <span className="hidden sm:inline text-slate-400 font-sans">app.sifyworkforce.internal /</span>
                    <span className="text-[#27F087] font-semibold capitalize">{activeTab.replace('-', ' ')}</span>
                  </div>

                  {/* Right Header Balance Spacer for Native macOS Window Centering */}
                  <div className="w-14" aria-hidden="true" />
                </div>

                {/* Window Content: Sidebar + Canvas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
                  {/* Mockup Sidebar */}
                  <div className="lg:col-span-3 bg-[#0F1318] text-slate-300 p-4 sm:p-5 flex flex-col justify-between border-r border-white/[0.08]">
                    <div className="space-y-6">
                      <div className="flex items-center gap-2.5 px-2">
                        <div className="w-6 h-6 rounded-md bg-[#27F087] flex items-center justify-center text-slate-950 font-bold text-xs shadow-xs">
                          SW
                        </div>
                        <span className="text-sm font-bold text-white tracking-tight">Sify Workforce</span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="px-2 text-[10px] font-semibold text-slate-400/80 uppercase tracking-wider mb-2">Workspace</p>
                        {previewTabs.map((tab) => {
                          const TabIcon = tab.icon;
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setActiveTab(tab.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-white/15 text-white font-medium shadow-xs border border-white/10'
                                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <TabIcon className={`w-4 h-4 ${isActive ? 'text-[#27F087]' : ''}`} />
                                <span>{tab.label}</span>
                              </div>
                              {tab.badge && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#27F087] text-slate-950">
                                  {tab.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] px-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Structured Workforce Operations</span>
                      <span className="inline-block w-2 h-2 rounded-full bg-[#27F087] animate-pulse" />
                    </div>
                  </div>

                    {/* Mockup Main Canvas */}
                    <div className="lg:col-span-9 p-5 sm:p-7 flex flex-col justify-between space-y-5 bg-white">
                      
                      {/* VIEW 1: Dashboard View */}
                      {activeTab === 'dashboard' && (
                        <div className="space-y-5 animate-fadeIn">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Operations Dashboard</p>
                              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-0.5 font-display">Workforce Time & Velocity</h2>
                              <p className="text-xs text-slate-500">Real-time team hours and project capacity</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold">
                                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                                Week 38 (Current)
                              </span>
                            </div>
                          </div>

                          {/* Metric Stat Cards */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                              <p className="text-[10px] font-semibold text-slate-500 uppercase">Weekly Hours</p>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-lg sm:text-xl font-extrabold text-slate-950 font-mono">38.5</span>
                                <span className="text-xs text-slate-400 font-mono">/ 40.0h</span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-[#27F087] h-full rounded-full" style={{ width: '96%' }} />
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                              <p className="text-[10px] font-semibold text-slate-500 uppercase">Active Projects</p>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-lg sm:text-xl font-extrabold text-slate-950 font-mono">2</span>
                                <span className="text-xs text-emerald-600 font-semibold font-mono">Active</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-2">12 Tasks Allocated</p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                              <p className="text-[10px] font-semibold text-slate-500 uppercase">Timesheet Status</p>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Ready</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-2">Mon–Sun Batch</p>
                            </div>
                          </div>

                          {/* Weekly Hours Bar Chart */}
                          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800">Weekly Hours Distribution</span>
                              <span className="text-[11px] font-mono text-slate-500">Mon–Fri: 8.0h avg • Weekend: 0h</span>
                            </div>

                            <div className="h-28 flex items-end justify-between gap-2 pt-2 px-2">
                              {[
                                { day: 'Mon', h: '8.0h', height: '100%', fill: 'bg-[#27F087]' },
                                { day: 'Tue', h: '8.0h', height: '100%', fill: 'bg-[#27F087]' },
                                { day: 'Wed', h: '7.5h', height: '94%', fill: 'bg-[#27F087]' },
                                { day: 'Thu', h: '8.0h', height: '100%', fill: 'bg-[#27F087]' },
                                { day: 'Fri', h: '7.0h', height: '88%', fill: 'bg-[#27F087]' },
                                { day: 'Sat', h: '—', height: '6%', fill: 'bg-slate-200' },
                                { day: 'Sun', h: '—', height: '6%', fill: 'bg-slate-200' },
                              ].map((bar) => (
                                <div key={bar.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                                  <span className="text-[10px] font-mono text-slate-500">{bar.h}</span>
                                  <div className="w-full max-w-[34px] bg-slate-200/80 rounded-t-md relative overflow-hidden h-[60px]">
                                    <div
                                      className={`w-full absolute bottom-0 rounded-t-md transition-all duration-500 ${bar.fill}`}
                                      style={{ height: bar.height }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-600 uppercase">{bar.day}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* VIEW 2: Projects View */}
                      {activeTab === 'projects' && (
                        <div className="space-y-4 animate-fadeIn">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Project Portfolio</p>
                              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-0.5 font-display">Active Projects & Deliverables</h2>
                              <p className="text-xs text-slate-500">Initiatives, requirements, and allocated team assignments</p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                              2 Active Projects
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-[#27F087]/20 border border-[#27F087]/40 flex items-center justify-center text-slate-900 font-bold text-xs">
                                    WF
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900">Project: Workforce Operations Platform</p>
                                    <p className="text-xs text-slate-500">Core timesheets, approvals and employee workflows</p>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700">In Progress</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                                <span>12 Tasks • 4 Activities • 6 Team Members</span>
                                <span className="font-mono font-semibold text-slate-800">32.0 hrs logged</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-[#27F087] h-full rounded-full" style={{ width: '80%' }} />
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                                    IM
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900">Project: Identity & Access Management (UMS)</p>
                                    <p className="text-xs text-slate-500">Authentication, RBAC roles and employee onboarding</p>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">Active</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                                <span>5 Tasks • 3 Activities • 4 Team Members</span>
                                <span className="font-mono font-semibold text-slate-800">8.0 hrs logged</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full" style={{ width: '65%' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* VIEW 3: Time Entries View */}
                      {activeTab === 'time-entries' && (
                        <div className="space-y-4 animate-fadeIn">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Daily Time Entries</p>
                              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-0.5 font-display">Daily Work Logging</h2>
                              <p className="text-xs text-slate-500">Record hours against project, task & activity</p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold">
                              <Clock className="w-3.5 h-3.5 text-slate-600" />
                              September 2026
                            </span>
                          </div>

                          {/* Mini Calendar / Week Strip Widget */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase px-1 mb-1.5">Interactive Week Calendar</p>
                            <div className="grid grid-cols-7 gap-1 text-center">
                              {[
                                { date: '15', day: 'Mon', h: '8.0h', status: 'logged' },
                                { date: '16', day: 'Tue', h: '8.0h', status: 'logged' },
                                { date: '17', day: 'Wed', h: '7.5h', status: 'logged' },
                                { date: '18', day: 'Thu', h: '8.0h', status: 'logged' },
                                { date: '19', day: 'Fri', h: '7.0h', status: 'today' },
                                { date: '20', day: 'Sat', h: '—', status: 'off' },
                                { date: '21', day: 'Sun', h: '—', status: 'off' },
                              ].map((d) => (
                                <div
                                  key={d.day}
                                  className={`py-1.5 rounded-lg border text-xs transition-all ${
                                    d.status === 'today'
                                      ? 'bg-slate-950 text-white border-slate-900 shadow-sm'
                                      : d.status === 'logged'
                                      ? 'bg-white border-slate-200 text-slate-800'
                                      : 'bg-transparent border-transparent text-slate-400'
                                  }`}
                                >
                                  <p className="text-[9px] uppercase font-bold opacity-75">{d.day} {d.date}</p>
                                  <p className="font-mono font-bold text-xs mt-0.5">{d.h}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-slate-900">Project: Workforce • Task: Timesheet & Daily Logging</p>
                                <p className="text-slate-500">Activity: Frontend Development • Implemented Apple window design</p>
                              </div>
                              <span className="font-mono font-bold text-slate-900 px-2 py-1 bg-slate-100 rounded-md">5.0h</span>
                            </div>

                            <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-slate-900">Project: Workforce • Task: Code Review & Quality</p>
                                <p className="text-slate-500">Activity: Testing • Verified test suite passes 100%</p>
                              </div>
                              <span className="font-mono font-bold text-slate-900 px-2 py-1 bg-slate-100 rounded-md">2.0h</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* VIEW 4: Timesheets View (Monday – Sunday Cycle) */}
                      {activeTab === 'timesheets' && (
                        <div className="space-y-4 animate-fadeIn">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Weekly Timesheet Cycle</p>
                              <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 mt-1 font-display">Monday – Sunday Timesheet</h2>
                              <p className="text-xs text-slate-500 mt-0.5">Organized by Project, Task & Activity</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Ready for Review
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-[#27F087]/20 border border-[#27F087]/40 flex items-center justify-center text-slate-900 font-bold text-xs">
                                  WF
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Project: Workforce</p>
                                  <p className="text-xs text-slate-500">Task: Timesheet & Daily Logging • Activity: Development</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium">Monday–Friday</span>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                  AP
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Manager Approvals</p>
                                  <p className="text-xs text-slate-500">Submissions review, approval & correction comment queue</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium">In Review</span>
                              </div>
                            </div>
                          </div>

                          {/* Authentic Weekly Day Distribution Bar */}
                          <div className="grid grid-cols-7 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                            {[
                              { day: 'Mon', hrs: '8.0h', active: true },
                              { day: 'Tue', hrs: '8.0h', active: true },
                              { day: 'Wed', hrs: '8.0h', active: true },
                              { day: 'Thu', hrs: '8.0h', active: true },
                              { day: 'Fri', hrs: '8.0h', active: true },
                              { day: 'Sat', hrs: '—', active: false },
                              { day: 'Sun', hrs: '—', active: false },
                            ].map((item) => (
                              <div key={item.day} className={`py-1.5 px-1 rounded-lg text-xs ${item.active ? 'bg-white shadow-2xs border border-slate-200/80' : 'text-slate-400'}`}>
                                <p className="text-[10px] font-semibold text-slate-500 uppercase">{item.day}</p>
                                <p className={`font-mono text-xs font-bold ${item.active ? 'text-slate-900' : 'text-slate-400'}`}>{item.hrs}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* VIEW 5: Approvals View */}
                      {activeTab === 'approvals' && (
                        <div className="space-y-4 animate-fadeIn">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Manager Review Queue</p>
                              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-0.5 font-display">Timesheet Approvals</h2>
                              <p className="text-xs text-slate-500">Submissions review, approval & correction comment queue</p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                              1 Pending Action
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-bold text-slate-900">Alex Rivera • Employee #SW-104</p>
                                  <p className="text-xs text-slate-500">Week 38 (Monday – Sunday) • 40.0 hrs logged across 2 projects</p>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 text-amber-700">Pending Review</span>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                <span className="text-slate-500">Workforce (32h) • IAM Service (8h)</span>
                                <div className="flex items-center gap-2">
                                  <button type="button" className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium">
                                    Request Fix
                                  </button>
                                  <button type="button" className="px-3 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-white font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3 text-[#27F087]" />
                                    Approve
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs opacity-75">
                              <div>
                                <p className="font-semibold text-slate-800">Sam Chen • Week 37</p>
                                <p className="text-slate-500">40.0 hrs • Approved by Manager</p>
                              </div>
                              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Approved
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Canvas Shared Bottom Audit Bar */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Weekly submission & audit trail</span>
                        <span className="font-semibold text-slate-800">Connected Project Attribution</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        {/* 2. Product Introduction (Connected Dark Container with 6 Product Areas) */}
        <ScrollReveal id="product" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
          <div className="rounded-3xl sm:rounded-[2.5rem] bg-[#12161F] border border-white/10 shadow-2xl overflow-hidden text-white">
            {/* Heading & Content */}
            <div className="p-8 sm:p-12 md:p-16 max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#27F087] border border-[#27F087]/20">
                <span>Integrated System</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-[1.15] font-display">
                Everything your team needs to manage work
              </h2>
              <p className="text-base sm:text-lg text-slate-400 font-normal leading-relaxed">
                Organize your workforce, manage project work, record time and move weekly timesheets through a structured approval workflow.
              </p>
            </div>

            {/* 6 Product Areas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-b border-white/10 divide-y md:divide-y-0 sm:divide-x divide-white/10">
              {productAreas.map((area, idx) => {
                const IconComp = area.icon;
                return (
                  <ScrollCard
                    key={area.title}
                    delay={idx * 75}
                    className="h-full"
                  >
                    <div className="p-8 space-y-6 flex flex-col justify-between hover:bg-white/[0.04] transition-all duration-300 group h-full cursor-default">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-[#0F2F24] border border-[#1E4D3C] flex items-center justify-center text-[#27F087] group-hover:scale-110 group-hover:bg-[#163F31] transition-all duration-300">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                          {area.benefit}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight font-display">
                          {area.title}
                        </h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          {area.description}
                        </p>
                      </div>
                    </div>
                  </ScrollCard>
                );
              })}
            </div>

            {/* Bottom Cross Grid Texture */}
            <div 
              className="h-20 w-full border-t border-white/10 relative overflow-hidden bg-[#0A0D12]"
              style={{
                backgroundImage: crossGridPattern,
                backgroundSize: '32px 32px',
              }}
            />
          </div>
        </ScrollReveal>

        {/* 3. The Connected Workflow Section */}
        <ScrollReveal id="workflow" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 scroll-mt-24">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold text-slate-800 bg-slate-200/70 border-0 rounded-full">
              System Architecture
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 font-display">
              A connected workflow from work to approval
            </h2>
            <p className="text-base text-slate-600">
              Sify Workforce connects the way work is organized with the way time is recorded and reviewed.
            </p>
          </div>

          {/* 8 Connected Steps Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {workflowSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <ScrollCard key={step.title} delay={idx * 60} className="h-full">
                  <Card className="h-full relative bg-white border-slate-200/90 rounded-2xl shadow-xs hover:border-[#27F087]/60 hover:shadow-md hover:-translate-y-1.5 transition-all duration-300 group">
                    <CardHeader className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#217046] tracking-wider font-mono">
                          STEP {step.step}
                        </span>
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-800 group-hover:bg-[#27F087] group-hover:text-slate-950 group-hover:scale-105 transition-all duration-300">
                          <StepIcon className="w-4 h-4" />
                        </div>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-950 pt-1 font-display">
                        {step.title}
                      </CardTitle>
                      <p className="text-xs text-slate-500 font-normal leading-relaxed">
                        {step.summary}
                      </p>
                    </CardHeader>
                  </Card>
                </ScrollCard>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <div className="inline-flex items-center p-2.5 px-4 rounded-xl bg-slate-100 border border-slate-200/80">
              <p className="text-xs font-mono text-slate-600 max-w-3xl mx-auto">
                Organization → Employee & Team → Project → Task & Activity → Time Entry → Weekly Timesheet → Manager Approval → Reporting
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* 4. Role-Based Content */}
        <ScrollReveal id="roles" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
          <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-8">
            <div className="max-w-3xl space-y-2">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border-0 rounded-full">
                Role Architecture
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-950 font-display">
                Designed around the responsibilities of each role
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Tailored interfaces and scoped permissions for every level of your organization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {roles.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <ScrollCard key={item.role} delay={idx * 110} className="h-full">
                    <div className="h-full p-6 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-5 flex flex-col justify-between hover:bg-white hover:border-slate-300 hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 group">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.badgeColor} group-hover:scale-105 transition-transform duration-300`}>
                            <ItemIcon className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                            {item.scope}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-950 font-display">{item.role}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-200/80 space-y-1.5 text-xs text-slate-700">
                        {item.capabilities.map((cap) => (
                          <div key={cap} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{cap}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollCard>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* 5. Time-Tracking Section (Project → Task → Activity Model) */}
        <ScrollReveal id="time-tracking" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
          <div className="rounded-3xl sm:rounded-[2.5rem] bg-[#12161F] border border-white/10 shadow-2xl overflow-hidden text-white p-8 sm:p-12 md:p-16 space-y-8">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#27F087] border border-[#27F087]/20">
                <span>Data Hierarchy</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight font-display">
                Track time against the work that matters
              </h2>
              <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
                Record time using the project, task and activity associated with the work performed, keeping time entries connected to actual project work.
              </p>
            </div>

            {/* Visual Model Display: Project → Task → Activity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <ScrollCard delay={0}>
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 hover:bg-white/[0.08] hover:border-[#27F087]/40 hover:-translate-y-1.5 transition-all duration-300">
                  <span className="text-xs font-semibold text-[#27F087] uppercase tracking-wider font-mono">Level 1</span>
                  <h4 className="text-lg font-bold text-white font-display">Project</h4>
                  <p className="text-xs text-slate-400">The overall initiative or client engagement (e.g. Workforce Platform).</p>
                </div>
              </ScrollCard>

              <ScrollCard delay={100}>
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 hover:bg-white/[0.08] hover:border-amber-400/40 hover:-translate-y-1.5 transition-all duration-300">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">Level 2</span>
                  <h4 className="text-lg font-bold text-white font-display">Task</h4>
                  <p className="text-xs text-slate-400">The specific feature or deliverable being built (e.g. Timesheet & Daily Logging).</p>
                </div>
              </ScrollCard>

              <ScrollCard delay={200}>
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 hover:bg-white/[0.08] hover:border-blue-400/40 hover:-translate-y-1.5 transition-all duration-300">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider font-mono">Level 3</span>
                  <h4 className="text-lg font-bold text-white font-display">Activity</h4>
                  <p className="text-xs text-slate-400">The operational nature of the time spent (e.g. Development, Testing, Code Review).</p>
                </div>
              </ScrollCard>
            </div>

            {/* Authentic Cascading Attribution Preview */}
            <ScrollCard delay={250}>
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-white/20 transition-all duration-300">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/10">
                  <span className="font-mono text-[11px] text-[#27F087] font-semibold uppercase">Structured Time Log Preview</span>
                  <span>Single Entry • Mon–Fri Allocation</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-white/10 text-white font-medium">Project: Sify Workforce</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="px-2.5 py-1 rounded-md bg-white/10 text-white font-medium">Task: Timesheet & Daily Logging</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="px-2.5 py-1 rounded-md bg-[#27F087]/20 text-[#27F087] font-semibold border border-[#27F087]/30">Activity: Development (8.0h)</span>
                </div>
              </div>
            </ScrollCard>
          </div>
        </ScrollReveal>

        {/* 6. Timesheet Section (Status Cycles) */}
        <ScrollReveal id="timesheets" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
          <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-8">
            <div className="max-w-3xl space-y-3">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border-0 rounded-full">
                Review Lifecycle
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-950 font-display">
                From daily entries to weekly approval
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Daily time entries are organized into Monday–Sunday timesheets that employees can submit for manager review. Submitted timesheets can be approved or returned for correction before final approval.
              </p>
            </div>

            {/* Visual Cycles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Approval Flow */}
              <ScrollCard delay={0}>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1.5 transition-all duration-300">
                  <h3 className="text-base font-bold text-slate-900 font-display">Standard Approval Cycle</h3>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-sm font-medium">
                    <span className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800">Draft</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800">Submitted</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-semibold">Approved</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Timesheets lock upon submission, ensuring manager review reflects frozen data.
                  </p>
                </div>
              </ScrollCard>

              {/* Revision Flow */}
              <ScrollCard delay={120}>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1.5 transition-all duration-300">
                  <h3 className="text-base font-bold text-slate-900 font-display">Correction & Resubmission Cycle</h3>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-sm font-medium">
                    <span className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800">Submitted</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800">Rejected</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 font-semibold flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Resubmit
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Rejection requires mandatory notes, allowing quick employee correction and resubmission.
                  </p>
                </div>
              </ScrollCard>
            </div>
          </div>
        </ScrollReveal>

        {/* 7. Reporting Section (5 Actual Reports) */}
        <ScrollReveal id="reports" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
          <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-8">
            <div className="max-w-3xl space-y-3">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border-0 rounded-full">
                Operational Intelligence
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-950 font-display">
                Visibility across employees, teams and projects
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Use structured time data to understand employee hours, team utilization, project hours and project activity across defined reporting periods.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {reportsList.map((rep, idx) => {
                const RepIcon = rep.icon;
                return (
                  <ScrollCard key={rep.name} delay={idx * 75} className="h-full">
                    <div className="h-full p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3 hover:bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1.5 transition-all duration-300 group">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-2xs group-hover:scale-105 transition-transform duration-300">
                          <RepIcon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200/90 text-slate-600">
                          {rep.metricType}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-950 font-display">{rep.name}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{rep.desc}</p>
                      </div>
                    </div>
                  </ScrollCard>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* 8. Governance / Access Section */}
        <ScrollReveal className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="rounded-3xl sm:rounded-[2.5rem] bg-[#12161F] border border-white/10 shadow-2xl overflow-hidden text-white p-8 sm:p-12 md:p-16 space-y-8">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#27F087] border border-[#27F087]/20">
                <span>Multi-Tenant Governance</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight font-display">
                Access aligned with responsibility
              </h2>
              <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
                Role-based access keeps administrative, managerial and employee workflows separated according to their responsibilities within the organization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <ScrollCard delay={0}>
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 hover:bg-white/[0.08] hover:border-amber-400/40 hover:-translate-y-1.5 transition-all duration-300">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">Tier 1</span>
                  <h4 className="text-xl font-bold text-white font-display">Admin</h4>
                  <p className="text-sm text-slate-300">Organization-wide management</p>
                  <div className="pt-2 border-t border-white/10 text-xs text-slate-400">
                    Global tenant settings, employee provisioning & organizational reports.
                  </div>
                </div>
              </ScrollCard>

              <ScrollCard delay={110}>
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 hover:bg-white/[0.08] hover:border-blue-400/40 hover:-translate-y-1.5 transition-all duration-300">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider font-mono">Tier 2</span>
                  <h4 className="text-xl font-bold text-white font-display">Manager</h4>
                  <p className="text-sm text-slate-300">Managed-team workflows</p>
                  <div className="pt-2 border-t border-white/10 text-xs text-slate-400">
                    Managed-team timesheet approvals, rejection feedback & capacity tracking.
                  </div>
                </div>
              </ScrollCard>

              <ScrollCard delay={220}>
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 hover:bg-white/[0.08] hover:border-[#27F087]/40 hover:-translate-y-1.5 transition-all duration-300">
                  <span className="text-xs font-semibold text-[#27F087] uppercase tracking-wider font-mono">Tier 3</span>
                  <h4 className="text-xl font-bold text-white font-display">Employee</h4>
                  <p className="text-sm text-slate-300">Personal work and timesheets</p>
                  <div className="pt-2 border-t border-white/10 text-xs text-slate-400">
                    Daily hours logging against assigned projects & weekly timesheet submission.
                  </div>
                </div>
              </ScrollCard>
            </div>
          </div>
        </ScrollReveal>

        {/* 9. Final CTA */}
        <ScrollReveal className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-8">
          <div className="relative overflow-hidden rounded-3xl p-8 sm:p-14 md:p-16 bg-gradient-to-br from-[#8EFDB9] via-[#78F9AC] to-[#6EF7A4] text-slate-950 shadow-[0_25px_60px_-15px_rgba(39,240,135,0.35)] border border-[#78F9AC] text-center space-y-6">
            {/* Subtle Specular Radial Sheen */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/35 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.12] font-display">
                Bring people, projects and time together.
              </h2>
              <p className="text-base sm:text-lg text-slate-800/90 font-medium max-w-xl mx-auto leading-relaxed">
                Manage workforce operations through one structured workflow for work, time tracking and timesheet approval.
              </p>
            </div>

            <div className="relative z-10 pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-full bg-slate-950 text-white hover:bg-slate-900 text-base px-8 h-12 font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full bg-white/95 border-slate-950/10 text-slate-950 hover:bg-white text-base px-8 h-12 font-semibold shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Log In
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/90 mt-16 sm:mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          {/* Main Footer Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-10">
            {/* Col 1 & 2: Brand Information */}
            <div className="col-span-2 space-y-4">
              <Link to="/" className="flex items-center gap-2.5 focus-visible:outline-none rounded-md group">
                <div className="w-8 h-8 rounded-lg bg-[#27F087] flex items-center justify-center text-slate-950 font-black text-sm shadow-xs transition-transform group-hover:scale-105">
                  SW
                </div>
                <span className="text-xl font-bold text-slate-950 tracking-tight font-display">Sify Workforce</span>
              </Link>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
                Enterprise workforce operations platform connecting people, projects, daily time tracking, and weekly timesheet approval lifecycles into one structured workspace.
              </p>
              
              {/* System Status Pill */}
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/90 text-xs text-slate-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium text-slate-900">All Systems Operational</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-mono text-[11px]">SOC 2 Ready</span>
              </div>
            </div>

            {/* Col 3: Platform */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-950 font-mono">Platform</h4>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li>
                  <a href="#product" className="hover:text-slate-950 transition-colors">Platform Overview</a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-slate-950 transition-colors">System Architecture</a>
                </li>
                <li>
                  <a href="#roles" className="hover:text-slate-950 transition-colors">Role Scopes</a>
                </li>
                <li>
                  <a href="#time-tracking" className="hover:text-slate-950 transition-colors">Time Logging</a>
                </li>
                <li>
                  <a href="#timesheets" className="hover:text-slate-950 transition-colors">Weekly Timesheets</a>
                </li>
                <li>
                  <a href="#reports" className="hover:text-slate-950 transition-colors">Operational Analytics</a>
                </li>
              </ul>
            </div>

            {/* Col 4: Workspaces */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-950 font-mono">Workspaces</h4>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li>
                  <Link to="/employee" className="hover:text-slate-950 transition-colors">Employee Portal</Link>
                </li>
                <li>
                  <Link to="/manager" className="hover:text-slate-950 transition-colors">Manager Approvals</Link>
                </li>
                <li>
                  <Link to="/admin" className="hover:text-slate-950 transition-colors">Admin Governance</Link>
                </li>
                <li>
                  <Link to="/timesheets" className="hover:text-slate-950 transition-colors">Timesheet Submissions</Link>
                </li>
                <li>
                  <Link to="/projects" className="hover:text-slate-950 transition-colors">Project Workspaces</Link>
                </li>
              </ul>
            </div>

            {/* Col 5: Intelligence */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-950 font-mono">Intelligence</h4>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li>
                  <a href="#reports" className="hover:text-slate-950 transition-colors">Employee Summary Breakdown</a>
                </li>
                <li>
                  <a href="#reports" className="hover:text-slate-950 transition-colors">Team Utilization Metrics</a>
                </li>
                <li>
                  <a href="#reports" className="hover:text-slate-950 transition-colors">Project Hours Allocation</a>
                </li>
                <li>
                  <a href="#reports" className="hover:text-slate-950 transition-colors">Project Trend Analysis</a>
                </li>
                <li>
                  <a href="#timesheets" className="hover:text-slate-950 transition-colors">Approval Audit Trail</a>
                </li>
              </ul>
            </div>

            {/* Col 6: Access */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-950 font-mono">Access</h4>
              <ul className="space-y-2.5 text-sm text-slate-600">
                {isAuthenticated ? (
                  <>
                    <li>
                      <Link to="/dashboard" className="font-medium text-slate-950 hover:text-emerald-600 transition-colors">Go to Dashboard</Link>
                    </li>
                    <li>
                      <Link to="/profile" className="hover:text-slate-950 transition-colors">Profile Settings</Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link to="/login" className="hover:text-slate-950 transition-colors">Sign In</Link>
                    </li>
                    <li>
                      <Link to="/register" className="hover:text-slate-950 transition-colors">Create Account</Link>
                    </li>
                  </>
                )}
                <li>
                  <Link to="/login" className="hover:text-slate-950 transition-colors">Manager Access</Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-slate-950 transition-colors">Admin Console</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright, Legal & Compliance */}
          <div className="border-t border-slate-200/80 pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              &copy; 2026 Sify Workforce. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <span className="hover:text-slate-800 transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-800 transition-colors cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-800 transition-colors cursor-pointer">Security & Compliance</span>
              <span className="font-mono text-slate-400">v2.4 Enterprise Edition</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
