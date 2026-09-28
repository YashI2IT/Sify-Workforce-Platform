import { createApi } from '@reduxjs/toolkit/query/react';
import { apiClient } from '../lib/apiClient';

const customBaseQuery = async (args: any) => {
  try {
    const url = typeof args === 'string' ? args : args.url;
    const method = args.method || 'GET';
    const body = args.body ? JSON.stringify(args.body) : undefined;
    const headers = args.headers || {};
    
    // Some components might pass options like `params` which we need to convert to query string
    let finalUrl = url;
    if (args.params) {
      const qs = new URLSearchParams();
      Object.entries(args.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          qs.append(key, String(value));
        }
      });
      const qsString = qs.toString();
      if (qsString) {
        finalUrl += (url.includes('?') ? '&' : '?') + qsString;
      }
    }

    const result = await apiClient(finalUrl, {
      method,
      body,
      headers,
    });
    return { data: result };
  } catch (error: any) {
    return {
      error: {
        status: error.status || 500,
        data: error.message || 'Unknown error',
      },
    };
  }
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: customBaseQuery,
  tagTypes: ['Organization', 'OrganizationSettings', 'Employee', 'Team', 'Project', 'Task', 'TaskComment', 'TaskTemplate', 'Activity', 'Requirement', 'ProjectEmployee', 'TimeEntry', 'Timesheet', 'Report', 'Milestone', 'TaskDependency', 'ProjectDependency', 'WorkingTime', 'PublicHoliday', 'UserPreference', 'AuditLog', 'Notification'],
  endpoints: (builder) => ({
    // ==========================================
    // EMPLOYEES
    // ==========================================
    getEmployees: builder.query<any, { limit?: number }>({
      query: (params) => ({ url: '/employees', params }),
      providesTags: ['Employee'],
    }),
    createEmployee: builder.mutation<any, any>({
      query: (body) => ({ url: '/employees', method: 'POST', body }),
      invalidatesTags: ['Employee'],
    }),
    updateEmployee: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/employees/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['Employee'],
    }),
    deleteEmployee: builder.mutation<any, string>({
      query: (id) => ({ url: `/employees/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Employee'],
    }),

    // ==========================================
    // EMPLOYEE INVITATIONS
    // ==========================================
    getEmployeeInvitations: builder.query<any, void>({
      query: () => '/employee-invitations',
      providesTags: ['Employee'],
    }),
    createEmployeeInvitation: builder.mutation<any, any>({
      query: (body) => ({ url: '/employee-invitations', method: 'POST', body }),
      invalidatesTags: ['Employee'],
    }),

    // ==========================================
    // ORGANIZATIONS & ONBOARDING
    // ==========================================
    getCurrentOrganization: builder.query<any, void>({
      query: () => '/organizations/current',
      providesTags: ['Organization'],
    }),
    updateCurrentOrganization: builder.mutation<any, { name?: string; organizationType?: string; description?: string }>({
      query: (body) => ({ url: '/organizations/current', method: 'PATCH', body }),
      invalidatesTags: ['Organization'],
    }),
    getOrganizationSetupStatus: builder.query<any, void>({
      query: () => '/organizations/current/setup-status',
      providesTags: ['Organization'],
    }),
    completeOrganizationSetup: builder.mutation<any, void>({
      query: () => ({ url: '/organizations/current/setup/complete', method: 'PATCH' }),
      invalidatesTags: ['Organization'],
    }),
    getOrganizationSettings: builder.query<any, void>({
      query: () => '/organizations/current/settings',
      providesTags: ['OrganizationSettings'],
    }),
    updateOrganizationSettings: builder.mutation<any, any>({
      query: (body) => ({ url: '/organizations/current/settings', method: 'PATCH', body }),
      invalidatesTags: ['OrganizationSettings'],
    }),

    // ==========================================
    // SYSTEM & AUDIT LOGS
    // ==========================================
    getAuditLogs: builder.query<any, { limit?: number; page?: number; type?: string; actorId?: string }>({
      query: (params) => ({ url: '/audit-logs', params }),
      providesTags: ['AuditLog'],
    }),
    createOrganization: builder.mutation<any, { name: string; organizationType: string; description?: string }>({
      query: (body) => ({ url: '/organizations', method: 'POST', body }),
      invalidatesTags: ['Organization', 'Employee'],
    }),
    getMyInvitations: builder.query<any[], void>({
      query: () => '/employee-invitations/my-invitations',
      providesTags: ['Employee'],
    }),
    acceptInvitation: builder.mutation<any, string>({
      query: (id) => ({ url: `/employee-invitations/${id}/accept-invite`, method: 'POST' }),
      invalidatesTags: ['Organization', 'Employee'],
    }),
    declineInvitation: builder.mutation<any, string>({
      query: (id) => ({ url: `/employee-invitations/${id}/decline-invite`, method: 'POST' }),
      invalidatesTags: ['Employee'],
    }),
    cancelEmployeeInvitation: builder.mutation<any, string>({
      query: (id) => ({ url: `/employee-invitations/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Employee'],
    }),
    resendEmployeeInvitation: builder.mutation<any, string>({
      query: (id) => ({ url: `/employee-invitations/${id}/resend`, method: 'POST' }),
    }),

    // ==========================================
    // TEAMS
    // ==========================================
    getTeams: builder.query<any, { limit?: number }>({
      query: (params) => ({ url: '/teams', params }),
      providesTags: ['Team'],
    }),
    createTeam: builder.mutation<any, any>({
      query: (body) => ({ url: '/teams', method: 'POST', body }),
      invalidatesTags: ['Team'],
    }),
    updateTeam: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/teams/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['Team'],
    }),
    deleteTeam: builder.mutation<any, string>({
      query: (id) => ({ url: `/teams/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Team'],
    }),

    // ==========================================
    // PROJECTS
    // ==========================================
    getProjects: builder.query<any, void>({
      query: () => '/projects',
      providesTags: ['Project'],
    }),
    getProjectDetails: builder.query<any, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),
    getProjectHealth: builder.query<any, string>({
      query: (id) => `/projects/${id}/health`,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }, { type: 'Task', id }, { type: 'TimeEntry', id }],
    }),
    createProject: builder.mutation<any, any>({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/projects/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_result, _error, { id }) => ['Project', { type: 'Project', id }],
    }),

    // ==========================================
    // PROJECT TASKS
    // ==========================================
    getProjectTasks: builder.query<any, string>({
      query: (projectId) => `/projects/${projectId}/tasks`,
      providesTags: (_result, _error, projectId) => [{ type: 'Task', id: projectId }],
    }),
    getTaskById: builder.query<any, string>({
      query: (taskId) => `/tasks/${taskId}`,
      providesTags: (_result, _error, taskId) => [{ type: 'Task', id: taskId }],
    }),
    createProjectTask: builder.mutation<any, { projectId: string; data: any }>({
      query: ({ projectId, data }) => ({ url: `/projects/${projectId}/tasks`, method: 'POST', body: data }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Task', id: projectId }],
    }),
    getProjectTaskTemplates: builder.query<any, string>({
      query: (projectId) => `/projects/${projectId}/task-templates`,
      providesTags: (_result, _error, projectId) => [{ type: 'TaskTemplate', id: projectId }],
    }),
    createTaskTemplate: builder.mutation<any, { projectId: string; data: any }>({
      query: ({ projectId, data }) => ({
        url: `/projects/${projectId}/task-templates`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'TaskTemplate', id: projectId }],
    }),
    deleteTaskTemplate: builder.mutation<any, { projectId: string; templateId: string }>({
      query: ({ projectId, templateId }) => ({
        url: `/projects/${projectId}/task-templates/${templateId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'TaskTemplate', id: projectId }],
    }),
    updateProjectTask: builder.mutation<any, { projectId: string; taskId: string; data: any }>({
      // Backend exposes PATCH /tasks/:id (not nested under project)
      query: ({ taskId, data }) => ({ url: `/tasks/${taskId}`, method: 'PATCH', body: data }),
      async onQueryStarted({ projectId, taskId, data }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData('getProjectTasks', projectId, (draft) => {
            const task = draft.find((t: any) => t.id === taskId);
            if (task) {
              Object.assign(task, data);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, { projectId, taskId }) => [
        { type: 'Task', id: projectId },
        { type: 'Task', id: taskId },
      ],
    }),
    getTaskDependencies: builder.query<any, string>({
      query: (taskId) => `/tasks/${taskId}/dependencies`,
      providesTags: (_result, _error, taskId) => [{ type: 'TaskDependency', id: taskId }],
    }),
    getProjectDependencies: builder.query<any, string>({
      query: (projectId) => `/projects/${projectId}/dependencies`,
      providesTags: (_result, _error, projectId) => [{ type: 'ProjectDependency', id: projectId }],
    }),
    createTaskDependency: builder.mutation<any, { taskId: string; successorId: string; type: string; projectId: string }>({
      query: ({ taskId, successorId, type }) => ({ url: `/tasks/${taskId}/dependencies`, method: 'POST', body: { successorId, type } }),
      invalidatesTags: (_result, _error, { taskId, projectId }) => [
        { type: 'TaskDependency', id: taskId },
        { type: 'ProjectDependency', id: projectId },
        { type: 'Task', id: projectId },
      ],
    }),
    deleteTaskDependency: builder.mutation<any, { taskId: string; successorId: string; projectId: string }>({
      query: ({ taskId, successorId }) => ({ url: `/tasks/${taskId}/dependencies/${successorId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { taskId, projectId }) => [
        { type: 'TaskDependency', id: taskId },
        { type: 'ProjectDependency', id: projectId },
        { type: 'Task', id: projectId },
      ],
    }),

    // --- Task Comments ---
    getTaskComments: builder.query<any, { projectId: string; taskId: string }>({
      query: ({ projectId, taskId }) => `/projects/${projectId}/tasks/${taskId}/comments`,
      providesTags: (_result, _error, { taskId }) => [{ type: 'TaskComment', id: taskId }],
    }),
    createTaskComment: builder.mutation<any, { projectId: string; taskId: string; comment: string }>({
      query: ({ projectId, taskId, comment }) => ({
        url: `/projects/${projectId}/tasks/${taskId}/comments`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [{ type: 'TaskComment', id: taskId }],
    }),
    updateTaskComment: builder.mutation<any, { projectId: string; taskId: string; commentId: string; comment: string }>({
      query: ({ projectId, taskId, commentId, comment }) => ({
        url: `/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
        method: 'PATCH',
        body: { comment },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [{ type: 'TaskComment', id: taskId }],
    }),
    deleteTaskComment: builder.mutation<any, { projectId: string; taskId: string; commentId: string }>({
      query: ({ projectId, taskId, commentId }) => ({
        url: `/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { taskId }) => [{ type: 'TaskComment', id: taskId }],
    }),

    // ==========================================
    // PROJECT ACTIVITIES
    // ==========================================
    getProjectActivities: builder.query<any, string>({
      query: (projectId) => `/projects/${projectId}/activities`,
      providesTags: (_result, _error, projectId) => [{ type: 'Activity', id: projectId }],
    }),
    createProjectActivity: builder.mutation<any, { projectId: string; data: any }>({
      query: ({ projectId, data }) => ({ url: `/projects/${projectId}/activities`, method: 'POST', body: data }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Activity', id: `List-${projectId}` }],
    }),
    updateProjectActivity: builder.mutation<any, { projectId: string; actId: string; data: any }>({
      query: ({ projectId, actId, data }) => ({ url: `/projects/${projectId}/activities/${actId}`, method: 'PATCH', body: data }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Activity', id: `List-${projectId}` }],
    }),

    // ==========================================
    // PROJECT REQUIREMENTS
    // ==========================================
    getProjectRequirements: builder.query<any, string>({
      query: (projectId) => `/projects/${projectId}/requirements`,
      providesTags: (_result, _error, projectId) => [{ type: 'Requirement', id: `List-${projectId}` }],
    }),
    createProjectRequirement: builder.mutation<any, { projectId: string; data: any }>({
      query: ({ projectId, data }) => ({ url: `/projects/${projectId}/requirements`, method: 'POST', body: data }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Requirement', id: `List-${projectId}` }],
    }),
    updateProjectRequirement: builder.mutation<any, { projectId: string; reqId: string; data: any }>({
      query: ({ projectId, reqId, data }) => ({ url: `/projects/${projectId}/requirements/${reqId}`, method: 'PATCH', body: data }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Requirement', id: `List-${projectId}` }],
    }),

    // ==========================================
    // PROJECT MILESTONES
    // ==========================================
    getProjectMilestones: builder.query<any, string>({
      query: (projectId) => `/projects/${projectId}/milestones`,
      providesTags: (_result, _error, projectId) => [{ type: 'Milestone', id: `List-${projectId}` }],
    }),
    createProjectMilestone: builder.mutation<any, { projectId: string; data: any }>({
      query: ({ projectId, data }) => ({ url: `/projects/${projectId}/milestones`, method: 'POST', body: data }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Milestone', id: `List-${projectId}` }],
    }),
    updateProjectMilestone: builder.mutation<any, { projectId: string; milestoneId: string; data: any }>({
      query: ({ projectId, milestoneId, data }) => ({ url: `/projects/${projectId}/milestones/${milestoneId}`, method: 'PATCH', body: data }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Milestone', id: `List-${projectId}` }],
    }),
    deleteProjectMilestone: builder.mutation<any, { projectId: string; milestoneId: string }>({
      query: ({ projectId, milestoneId }) => ({ url: `/projects/${projectId}/milestones/${milestoneId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Milestone', id: `List-${projectId}` }],
    }),

    // ==========================================
    // PROJECT EMPLOYEES
    // ==========================================
    getProjectEmployees: builder.query<any, string>({
      query: (projectId) => `/projects/${projectId}/employees`,
      providesTags: (_result, _error, projectId) => [{ type: 'ProjectEmployee', id: `List-${projectId}` }],
    }),
    getProjectUnassignedEmployees: builder.query<any, string>({
      query: (projectId) => `/projects/${projectId}/unassigned-employees`,
      providesTags: (_result, _error, projectId) => [{ type: 'ProjectEmployee', id: `Unassigned-${projectId}` }],
    }),
    assignProjectEmployee: builder.mutation<any, { projectId: string; employeeId: string }>({
      query: ({ projectId, employeeId }) => ({ url: `/projects/${projectId}/employees/${employeeId}`, method: 'POST' }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'ProjectEmployee', id: `List-${projectId}` },
        { type: 'ProjectEmployee', id: `Unassigned-${projectId}` }
      ],
    }),
    removeProjectEmployee: builder.mutation<any, { projectId: string; employeeId: string }>({
      query: ({ projectId, employeeId }) => ({ url: `/projects/${projectId}/employees/${employeeId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'ProjectEmployee', id: `List-${projectId}` },
        { type: 'ProjectEmployee', id: `Unassigned-${projectId}` }
      ],
    }),

    // ==========================================
    // TIME ENTRIES
    // ==========================================
    getMyTimeEntries: builder.query<any, { startDate?: string; endDate?: string; limit?: number }>({
      query: (params) => ({ url: '/time-entries/my-entries', params }),
      providesTags: ['TimeEntry'],
    }),
    getEmployeeTimeEntries: builder.query<any, { employeeId: string; limit?: number }>({
      query: ({ employeeId, ...params }) => ({ url: `/employees/${employeeId}/time-entries`, params }),
      providesTags: ['TimeEntry'],
    }),
    getEmployeeProjects: builder.query<any, string>({
      query: (employeeId) => `/employees/${employeeId}/projects`,
      providesTags: ['Project'],
    }),
    getTimeEntry: builder.query<any, string>({
      query: (id) => `/time-entries/${id}`,
    }),
    createTimeEntry: builder.mutation<any, any>({
      query: (body) => ({ url: '/time-entries', method: 'POST', body }),
      invalidatesTags: ['TimeEntry', 'Timesheet'],
    }),
    updateTimeEntry: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/time-entries/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['TimeEntry', 'Timesheet'],
    }),
    deleteTimeEntry: builder.mutation<any, string>({
      query: (id) => ({ url: `/time-entries/${id}`, method: 'DELETE' }),
      invalidatesTags: ['TimeEntry', 'Timesheet'],
    }),

    // ==========================================
    // TIMESHEETS & APPROVALS
    // ==========================================
    getMyTimesheets: builder.query<any, { limit?: number }>({
      query: (params) => ({ url: '/timesheets/my-timesheets', params }),
      providesTags: ['Timesheet'],
    }),
    getPendingApprovals: builder.query<any, void>({
      query: () => ({ url: '/timesheets/approvals' }),
      providesTags: ['Timesheet'],
    }),
    getTimesheetDetails: builder.query<any, string>({
      query: (id) => `/timesheets/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Timesheet', id }, 'TimeEntry'],
    }),
    getTimesheetHistory: builder.query<any, string>({
      query: (id) => `/timesheets/${id}/history`,
      providesTags: (_result, _error, id) => [{ type: 'Timesheet', id }],
    }),
    submitTimesheet: builder.mutation<any, string>({
      query: (id) => ({ url: `/timesheets/${id}/submit`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => ['Timesheet', { type: 'Timesheet', id }, 'TimeEntry'],
    }),
    approveTimesheet: builder.mutation<any, string>({
      query: (id) => ({ url: `/timesheets/${id}/approve`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => ['Timesheet', { type: 'Timesheet', id }, 'TimeEntry'],
    }),
    rejectTimesheet: builder.mutation<any, { id: string; comment: string }>({
      query: ({ id, comment }) => ({ url: `/timesheets/${id}/reject`, method: 'PATCH', body: { comment } }),
      invalidatesTags: (_result, _error, { id }) => ['Timesheet', { type: 'Timesheet', id }, 'TimeEntry'],
    }),

    // ==========================================
    // REPORTS
    // ==========================================
    getEmployeeSummaryReport: builder.query<any, { startDate: string; endDate: string; targetEmployeeId?: string }>({
      query: (params) => ({ url: '/reports/employee-summary', params }),
      providesTags: ['Report'],
    }),
    getManagerDashboardReport: builder.query<any, { startDate: string; endDate: string }>({
      query: (params) => ({ url: '/reports/manager-dashboard', params }),
      providesTags: ['Report'],
    }),
    getResourceAllocationReport: builder.query<any, { startDate: string; endDate: string }>({
      query: (params) => ({ url: '/reports/resource-allocation', params }),
      providesTags: ['Report', 'WorkingTime', 'Task'],
    }),
    getTeamUtilizationReport: builder.query<any, { startDate: string; endDate: string; teamId?: string }>({
      query: (params) => ({ url: '/reports/team-utilization', params }),
      providesTags: ['Report'],
    }),
    getProjectHoursReport: builder.query<any, { startDate: string; endDate: string; projectId?: string }>({
      query: (params) => ({ url: '/reports/project-hours', params }),
      providesTags: ['Report'],
    }),
    getProjectAnalysisReport: builder.query<any, { projectId: string; startDate: string; endDate: string; interval: string }>({
      query: ({ projectId, ...params }) => ({ url: `/reports/project-analysis/${projectId}`, params }),
      providesTags: ['Report'],
    }),
    getAdvancedAnalyticsReport: builder.query<any, { startDate: string; endDate: string; interval: string }>({
      query: (params) => ({ url: '/reports/advanced-analytics', params }),
      providesTags: ['Report'],
    }),


    // ==========================================
    // WORKING TIMES
    // ==========================================
    getOrgWorkingTime: builder.query<any, void>({
      query: () => '/working-times',
      providesTags: ['WorkingTime'],
    }),
    updateOrgWorkingTime: builder.mutation<any, any>({
      query: (body) => ({ url: '/working-times', method: 'PUT', body }),
      invalidatesTags: ['WorkingTime'],
    }),
    getWorkingTimeOverrides: builder.query<any, void>({
      query: () => '/working-times/overrides',
      providesTags: ['WorkingTime'],
    }),
    getEmployeeWorkingTime: builder.query<any, string>({
      query: (employeeId) => `/working-times/overrides/${employeeId}`,
      providesTags: (_result, _error, id) => [{ type: 'WorkingTime', id }],
    }),
    upsertEmployeeWorkingTime: builder.mutation<any, { employeeId: string; data: any }>({
      query: ({ employeeId, data }) => ({ url: `/working-times/overrides/${employeeId}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { employeeId }) => ['WorkingTime', { type: 'WorkingTime', id: employeeId }],
    }),
    deleteEmployeeWorkingTime: builder.mutation<any, string>({
      query: (employeeId) => ({ url: `/working-times/overrides/${employeeId}`, method: 'DELETE' }),
      invalidatesTags: ['WorkingTime'],
    }),
    getExpectedHours: builder.query<any, { employeeId: string, startDate: string, endDate: string }>({
      query: (params) => ({ url: '/working-times/expected', params }),
      providesTags: ['WorkingTime'],
    }),

    // ==========================================
    // PUBLIC HOLIDAYS
    // ==========================================
    getPublicHolidays: builder.query<any, { year?: number } | void>({
      query: (params) => ({ url: '/public-holidays', params: params || {} }),
      providesTags: ['PublicHoliday'],
    }),
    createPublicHoliday: builder.mutation<any, { name: string; date: string; isActive?: boolean }>({
      query: (body) => ({ url: '/public-holidays', method: 'POST', body }),
      invalidatesTags: ['PublicHoliday'],
    }),
    updatePublicHoliday: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/public-holidays/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['PublicHoliday'],
    }),
    deletePublicHoliday: builder.mutation<any, string>({
      query: (id) => ({ url: `/public-holidays/${id}`, method: 'DELETE' }),
      invalidatesTags: ['PublicHoliday'],
    }),

    // ==========================================
    // USER PREFERENCES
    // ==========================================
    getMyPreferences: builder.query<any, void>({
      query: () => '/preferences',
      providesTags: ['UserPreference'],
    }),
    updateMyPreferences: builder.mutation<any, { timezone?: string; language?: string; theme?: string; defaultView?: string }>({
      query: (body) => ({ url: '/preferences', method: 'PUT', body }),
      invalidatesTags: ['UserPreference'],
    }),
    getUserPreferences: builder.query<any, void>({
      query: () => '/user-preferences',
      providesTags: ['UserPreference'],
    }),
    updateUserPreferences: builder.mutation<any, any>({
      query: (data) => ({ url: '/user-preferences', method: 'PUT', body: data }),
      invalidatesTags: ['UserPreference'],
    }),

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    getMyNotifications: builder.query<any[], void>({
      query: () => '/notifications',
      providesTags: ['Notification'],
    }),
    markNotificationAsRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsAsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/mark-all-read',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,

  useGetEmployeeInvitationsQuery,
  useCreateEmployeeInvitationMutation,
  useCancelEmployeeInvitationMutation,
  useResendEmployeeInvitationMutation,
  
  useGetTeamsQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,

  useGetProjectsQuery,
  useGetProjectDetailsQuery,
  useGetProjectHealthQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,

  useGetProjectRequirementsQuery,
  useCreateProjectRequirementMutation,
  useUpdateProjectRequirementMutation,

  useGetProjectTasksQuery,
  useGetTaskByIdQuery,
  useCreateProjectTaskMutation,
  useGetProjectTaskTemplatesQuery,
  useCreateTaskTemplateMutation,
  useDeleteTaskTemplateMutation,
  useUpdateProjectTaskMutation,
  useGetTaskDependenciesQuery,
  useGetProjectDependenciesQuery,
  useCreateTaskDependencyMutation,
  useDeleteTaskDependencyMutation,

  // Task Comments
  useGetTaskCommentsQuery,
  useCreateTaskCommentMutation,
  useUpdateTaskCommentMutation,
  useDeleteTaskCommentMutation,

  useGetProjectActivitiesQuery,
  useCreateProjectActivityMutation,
  useUpdateProjectActivityMutation,

  useGetProjectMilestonesQuery,
  useCreateProjectMilestoneMutation,
  useUpdateProjectMilestoneMutation,
  useDeleteProjectMilestoneMutation,

  useGetProjectEmployeesQuery,
  useGetProjectUnassignedEmployeesQuery,
  useAssignProjectEmployeeMutation,
  useRemoveProjectEmployeeMutation,

  useGetMyTimeEntriesQuery,
  useGetEmployeeTimeEntriesQuery,
  useGetEmployeeProjectsQuery,
  useGetTimeEntryQuery,
  useCreateTimeEntryMutation,
  useUpdateTimeEntryMutation,
  useDeleteTimeEntryMutation,

  // Timesheets
  useGetMyTimesheetsQuery,
  useGetTimesheetDetailsQuery,
  useGetTimesheetHistoryQuery,
  useSubmitTimesheetMutation,
  useGetPendingApprovalsQuery,
  useApproveTimesheetMutation,
  useRejectTimesheetMutation,

  // Reports
  useGetEmployeeSummaryReportQuery,
  useGetManagerDashboardReportQuery,
  useGetResourceAllocationReportQuery,
  useGetTeamUtilizationReportQuery,
  useGetProjectHoursReportQuery,
  useGetProjectAnalysisReportQuery,
  useGetAdvancedAnalyticsReportQuery,

  // Working Times
  useGetOrgWorkingTimeQuery,
  useUpdateOrgWorkingTimeMutation,
  useGetWorkingTimeOverridesQuery,
  useGetEmployeeWorkingTimeQuery,
  useUpsertEmployeeWorkingTimeMutation,
  useDeleteEmployeeWorkingTimeMutation,
  useGetExpectedHoursQuery,

  // Public Holidays
  useGetPublicHolidaysQuery,
  useCreatePublicHolidayMutation,
  useUpdatePublicHolidayMutation,
  useDeletePublicHolidayMutation,

  useGetMyPreferencesQuery,
  useUpdateMyPreferencesMutation,
  useGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,

  // Organizations & Onboarding
  useGetCurrentOrganizationQuery,
  useUpdateCurrentOrganizationMutation,
  useGetOrganizationSetupStatusQuery,
  useCompleteOrganizationSetupMutation,
  useCreateOrganizationMutation,
  useGetMyInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useGetOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
  useGetAuditLogsQuery,

  // Notifications
  useGetMyNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} = apiSlice;
