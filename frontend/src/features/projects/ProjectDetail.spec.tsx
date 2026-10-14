import { render, screen, waitFor, fireEvent, cleanup } from '../../test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProjectDetail } from './ProjectDetail';

const mockApiClient = vi.fn();
vi.mock('../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({
    employee: { id: 'admin-1', name: 'Admin User', roles: ['ADMIN'] },
    isLoading: false,
  }),
}));

const mockProject = {
  id: 'proj-1',
  name: 'Enterprise Core Platform',
  code: 'ECP-001',
  status: 'ACTIVE',
  isActive: true,
  organizationId: 'org-1',
};

describe('ProjectDetail Component', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockImplementation((url: string) => {
      if (url === '/projects/proj-1') {
        return Promise.resolve(mockProject);
      }
      if (url === '/projects/proj-1/tasks') {
        return Promise.resolve([{ id: 'task-1', name: 'Database Migration', status: 'IN_PROGRESS', isActive: true }]);
      }
      if (url === '/projects/proj-1/activities') {
        return Promise.resolve([{ id: 'act-1', name: 'Backend Engineering', isActive: true }]);
      }
      if (url === '/projects/proj-1/requirements') {
        return Promise.resolve([{ id: 'req-1', title: 'Data Isolation', isMandatory: true, status: 'ACTIVE' }]);
      }
      if (url === '/projects/proj-1/employees') {
        return Promise.resolve([{ id: 'emp-1', name: 'Alice Developer', employeeCode: 'EMP-01', email: 'alice@example.com', role: 'EMPLOYEE', isActive: true }]);
      }
      return Promise.resolve([]);
    });
  });

  it('renders project workspace overview, metrics, and navigation tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/proj-1']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Enterprise Core Platform')).toBeDefined();
    });

    expect(screen.getByText('ECP-001')).toBeDefined();
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
    expect(screen.getByText('Project Information & Metrics')).toBeDefined();
    expect(screen.getByText('Back to Projects')).toBeDefined();
  });

  it('allows switching between animated workspace tabs and displays dynamic counts', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/proj-1']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Enterprise Core Platform')).toBeDefined();
    });

    // Overview should be visible by default
    expect(screen.getByText('Project Information & Metrics')).toBeDefined();

    // Click Tasks tab
    const tasksTab = screen.getByRole('button', { name: /Tasks/i });
    expect(tasksTab).toBeDefined();
    fireEvent.click(tasksTab);

    // Verify task view renders
    await waitFor(() => {
      expect(screen.getByText('Database Migration')).toBeDefined();
    });

    // Click Activities tab
    const activitiesTab = screen.getByRole('button', { name: /Activities/i });
    fireEvent.click(activitiesTab);

    await waitFor(() => {
      expect(screen.getByText('Project Activities')).toBeDefined();
      expect(screen.getByText('Backend Engineering')).toBeDefined();
    });

    // Click Members tab
    const membersTab = screen.getByRole('button', { name: /Members/i });
    fireEvent.click(membersTab);

    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeDefined();
    });
  });

  it('opens the same configured TaskFormModal with saved project defaults and custom fields, creates task, and opens detail view', async () => {
    const configuredProject = {
      ...mockProject,
      settings: {
        customFields: [{ name: 'Sprint Target', required: true }],
        taskDefaults: { priority: 'HIGH', estimatedHours: 12, recurrence: 'WEEKLY' },
      },
    };

    let createdTaskPayload: any = null;

    mockApiClient.mockImplementation((url: string, options?: any) => {
      if (url === '/projects/proj-1') {
        return Promise.resolve(configuredProject);
      }
      if (url === '/projects/proj-1/tasks' && options?.method === 'POST') {
        createdTaskPayload = JSON.parse(options.body);
        return Promise.resolve({
          id: 'task-new-1',
          ticketId: 'ECP-001-2',
          projectId: 'proj-1',
          ...createdTaskPayload,
        });
      }
      if (url === '/projects/proj-1/tasks') {
        return Promise.resolve([
          { id: 'task-1', ticketId: 'ECP-001-1', name: 'Database Migration', status: 'IN_PROGRESS', priority: 'HIGH', isActive: true },
        ]);
      }
      if (url === '/projects/proj-1/activities') {
        return Promise.resolve([]);
      }
      if (url === '/projects/proj-1/employees') {
        return Promise.resolve([{ id: 'emp-1', name: 'Alice Developer' }]);
      }
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter initialEntries={['/projects/proj-1']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Enterprise Core Platform')).toBeDefined();
    });

    // Switch to Tasks tab
    fireEvent.click(screen.getByRole('button', { name: /Tasks/i }));

    await waitFor(() => {
      expect(screen.getByText('Database Migration')).toBeDefined();
    });

    // Click "Create Task" button in Tasks tab
    const createTaskBtn = screen.getByRole('button', { name: /Create Task/i });
    fireEvent.click(createTaskBtn);

    // Verify the SAME TaskFormModal opens with configured custom fields and defaults pre-loaded
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText(/Sprint Target/i)).toBeDefined();
    });

    const estHoursInput = screen.getByPlaceholderText('e.g. 8') as HTMLInputElement;
    expect(estHoursInput.value).toBe('12');

    // Fill in task name and description
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Implement login flow/i), {
      target: { value: 'Frontend Performance Audit' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Description of the task/i), {
      target: { value: 'Audit render bottlenecks in table' },
    });

    // Fill in configured custom field
    const customFieldInput = screen.getByPlaceholderText(/enter sprint target/i);
    fireEvent.change(customFieldInput, {
      target: { value: 'Sprint 24' },
    });

    // Submit task form
    const modalDialog = screen.getByRole('dialog');
    const submitBtn = modalDialog.querySelector('button[type="submit"]') as HTMLElement;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createdTaskPayload).not.toBeNull();
      expect(createdTaskPayload.name).toBe('Frontend Performance Audit');
      expect(createdTaskPayload.priority).toBe('HIGH');
      expect(createdTaskPayload.estimatedHours).toBe(12);
      expect(createdTaskPayload.metadata).toEqual({ 'Sprint Target': 'Sprint 24' });
    });

    // Verify task row click opens existing TaskDetailPanel
    const existingTaskRow = screen.getByText('Database Migration');
    fireEvent.click(existingTaskRow);

    await waitFor(() => {
      expect(document.getElementById('task-detail-title')).toBeDefined();
      expect(document.getElementById('detail-panel-close')).toBeDefined();
    });
  });

  it('automatically displays versatile fields (Short Text, Dropdown, Text Area), suppresses field builder, and isolates projects', async () => {
    const projectWithVersatileFields = {
      id: 'proj-versatile-1',
      name: 'Cloud Logistics Platform',
      code: 'PRJ-LOG',
      status: 'ACTIVE',
      isActive: true,
      settings: {
        customFields: [
          { name: 'Ticket Number', type: 'SHORT_TEXT', required: true, placeholder: 'e.g. TCK-999' },
          { name: 'Customer', type: 'DROPDOWN', required: true, options: ['Acme Corp', 'Globex', 'Initech'] },
          { name: 'Implementation Notes', type: 'TEXT_AREA', required: false, placeholder: 'Enter notes...' },
        ],
      },
    };

    const projectIsolated = {
      id: 'proj-isolated-2',
      name: 'Internal HR System',
      code: 'PRJ-HR',
      status: 'ACTIVE',
      isActive: true,
      settings: {
        customFields: [
          { name: 'Employee Badge ID', type: 'SHORT_TEXT', required: true },
        ],
      },
    };

    let createdTasks: any[] = [];
    mockApiClient.mockImplementation((endpoint: string, options?: any) => {
      if (endpoint === '/projects/proj-versatile-1') {
        return Promise.resolve(projectWithVersatileFields);
      }
      if (endpoint === '/projects/proj-isolated-2') {
        return Promise.resolve(projectIsolated);
      }
      if (endpoint === '/projects/proj-versatile-1/tasks' && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        createdTasks.push(body);
        return Promise.resolve({ id: `task-${createdTasks.length}`, ticketId: `LOG-${createdTasks.length}`, ...body });
      }
      if (endpoint === '/projects/proj-versatile-1/tasks') {
        return Promise.resolve([]);
      }
      if (endpoint === '/projects/proj-isolated-2/tasks') {
        return Promise.resolve([]);
      }
      if (endpoint.includes('/employees')) {
        return Promise.resolve([{ id: 'emp-1', name: 'Alice Developer' }]);
      }
      return Promise.resolve([]);
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/projects/proj-versatile-1']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cloud Logistics Platform')).toBeDefined();
    });

    // Switch to Tasks tab and click Create Task
    const tasksTab = screen.getByRole('button', { name: /Tasks/i });
    fireEvent.click(tasksTab);

    const createTaskBtn = await screen.findByRole('button', { name: /Create Task/i });
    fireEvent.click(createTaskBtn);

    // 1. Verify all three fields appear automatically
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText(/Ticket Number/i)).toBeDefined();
      expect(screen.getByLabelText('Customer')).toBeDefined();
      expect(screen.getByText(/Implementation Notes/i)).toBeDefined();
    });

    // 2. Verify that field builder controls do NOT appear in the modal
    expect(screen.queryByText(/add another field/i)).toBeNull();
    expect(screen.queryByText(/^custom fields$/i)).toBeNull();

    // 3. Create Task 1
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Implement login flow/i), {
      target: { value: 'First Delivery Task' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Description of the task/i), {
      target: { value: 'Initial delivery logistics' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. TCK-999'), {
      target: { value: 'TCK-101' },
    });
    fireEvent.change(screen.getByLabelText('Customer'), {
      target: { value: 'Acme Corp' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter notes...'), {
      target: { value: 'Notes for task 1' },
    });

    const modalDialog = screen.getByRole('dialog');
    fireEvent.click(modalDialog.querySelector('button[type="submit"]') as HTMLElement);

    await waitFor(() => {
      expect(createdTasks).toHaveLength(1);
      expect(createdTasks[0].name).toBe('First Delivery Task');
      expect(createdTasks[0].metadata).toEqual({
        'Ticket Number': 'TCK-101',
        'Customer': 'Acme Corp',
        'Implementation Notes': 'Notes for task 1',
      });
    });

    // 4. Create Task 2 with different values
    const createTaskBtn2 = await screen.findByRole('button', { name: /Create Task/i });
    fireEvent.click(createTaskBtn2);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeDefined());

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Implement login flow/i), {
      target: { value: 'Second Delivery Task' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Description of the task/i), {
      target: { value: 'Secondary freight delivery' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. TCK-999'), {
      target: { value: 'TCK-102' },
    });
    fireEvent.change(screen.getByLabelText('Customer'), {
      target: { value: 'Globex' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter notes...'), {
      target: { value: 'Notes for task 2' },
    });

    const modalDialog2 = screen.getByRole('dialog');
    fireEvent.click(modalDialog2.querySelector('button[type="submit"]') as HTMLElement);

    await waitFor(() => {
      expect(createdTasks).toHaveLength(2);
      expect(createdTasks[1].name).toBe('Second Delivery Task');
      expect(createdTasks[1].metadata).toEqual({
        'Ticket Number': 'TCK-102',
        'Customer': 'Globex',
        'Implementation Notes': 'Notes for task 2',
      });
    });

    unmount();

    // 5. Verify Project Isolation with a second project
    render(
      <MemoryRouter initialEntries={['/projects/proj-isolated-2']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Internal HR System')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Tasks/i }));
    const proj2CreateBtn = await screen.findByRole('button', { name: /Create Task/i });
    fireEvent.click(proj2CreateBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText(/Employee Badge ID/i)).toBeDefined();
      // Should NOT have project 1's fields
      expect(screen.queryByLabelText('Customer')).toBeNull();
      expect(screen.queryByText(/Implementation Notes/i)).toBeNull();
    });
  });

  it('allows managers and admins to open Edit Project modal and save updated configuration', async () => {
    let patchedProject: any = null;
    mockApiClient.mockImplementation((url: string, options?: any) => {
      if (url === '/projects/proj-1' && options?.method === 'PATCH') {
        patchedProject = JSON.parse(options.body);
        return Promise.resolve({
          ...mockProject,
          ...patchedProject,
        });
      }
      if (url === '/projects/proj-1') {
        return Promise.resolve(patchedProject || mockProject);
      }
      if (url === '/projects/proj-1/tasks') {
        return Promise.resolve([]);
      }
      if (url === '/projects/proj-1/activities') {
        return Promise.resolve([]);
      }
      if (url === '/projects/proj-1/employees') {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter initialEntries={['/projects/proj-1']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Enterprise Core Platform')).toBeDefined();
    });

    // Check Edit Project button is rendered for manager/admin
    const editProjectBtn = screen.getByRole('button', { name: /Edit Project/i });
    expect(editProjectBtn).toBeDefined();

    fireEvent.click(editProjectBtn);

    // Modal opens with all 4 sections
    await waitFor(() => {
      expect(screen.getByText('1. Project Information')).toBeDefined();
      expect(screen.getByText('2. Project Details')).toBeDefined();
      expect(screen.getByText('3. Task Defaults')).toBeDefined();
      expect(screen.getByText('4. Custom Task Fields')).toBeDefined();
    });

    // Edit Project Name
    const nameInput = screen.getByDisplayValue('Enterprise Core Platform');
    fireEvent.change(nameInput, { target: { value: 'Enterprise Modern Core' } });

    // Submit
    const saveChangesBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveChangesBtn);

    await waitFor(() => {
      expect(patchedProject).not.toBeNull();
      expect(patchedProject.name).toBe('Enterprise Modern Core');
    });
  });
});
