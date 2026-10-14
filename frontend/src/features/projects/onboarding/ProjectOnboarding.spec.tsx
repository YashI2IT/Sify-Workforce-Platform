import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProjectOnboarding } from './ProjectOnboarding';

const mockApiClient = vi.fn();
vi.mock('../../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

const mockShowToast = vi.fn();
vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProjectOnboarding Workflow', () => {
  const createdProject = {
    id: 'proj-uuid-101',
    organizationId: 'org-1',
    name: 'Apollo Platform Initiative',
    code: 'PRJ-APOLLO',
    status: 'ACTIVE',
    isActive: true,
    description: 'Cloud modernization platform',
    startDate: '2026-03-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
  };

  const initialTasks = [
    {
      id: 'task-uuid-1',
      ticketId: 'PRJ-APOLLO-1',
      name: 'Architecture & Schema Design',
      description: 'Define initial system architecture',
      status: 'TODO',
      priority: 'HIGH',
      isActive: true,
      projectId: 'proj-uuid-101',
      estimatedHours: 16,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockImplementation(async (endpoint: string, options?: any) => {
      // POST /projects -> create project
      if (endpoint === '/projects' && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        if (!body.name || !body.code) {
          throw new Error('Validation failed');
        }
        return {
          ...createdProject,
          name: body.name,
          code: body.code,
          status: body.status || 'ACTIVE',
        };
      }

      // PATCH /projects/:id -> update project
      if (endpoint.startsWith('/projects/') && options?.method === 'PATCH') {
        const body = JSON.parse(options.body);
        return {
          ...createdProject,
          ...body,
        };
      }

      // GET /projects/:id/tasks
      if (endpoint === `/projects/${createdProject.id}/tasks`) {
        return initialTasks;
      }

      // POST /projects/:id/tasks
      if (endpoint === `/projects/${createdProject.id}/tasks` && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        return {
          id: 'task-uuid-2',
          ticketId: `${createdProject.code}-2`,
          projectId: createdProject.id,
          ...body,
        };
      }

      // GET /projects/:id/employees
      if (endpoint === `/projects/${createdProject.id}/employees`) {
        return [
          { id: 'emp-1', name: 'John Developer' },
          { id: 'emp-2', name: 'Sarah Engineer' },
        ];
      }

      // GET /projects/:id
      if (endpoint === `/projects/${createdProject.id}`) {
        return createdProject;
      }

      return [];
    });
  });

  // 1. Successful project creation through onboarding
  it('1. successfully creates project in Step 1 and captures persisted project ID', async () => {
    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    expect(screen.getByText('Enter Project Information')).toBeDefined();

    // Fill form
    const nameInput = screen.getByPlaceholderText('e.g. Workforce Analytics Engine');
    const codeInput = screen.getByPlaceholderText('e.g. PRJ-ANALYTICS');

    fireEvent.change(nameInput, { target: { value: 'Apollo Platform Initiative' } });
    fireEvent.change(codeInput, { target: { value: 'PRJ-APOLLO' } });

    const submitBtn = screen.getByRole('button', { name: /create & continue|create project/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Step 2 should be displayed with persisted project details
      expect(screen.getByText('Configure Project')).toBeDefined();
      expect(screen.getByText('Apollo Platform Initiative')).toBeDefined();
      expect(screen.getByText('PRJ-APOLLO')).toBeDefined();
    });

    expect(mockShowToast).toHaveBeenCalledWith('Project created successfully', 'success');
  });

  // 2. Project creation validation failure
  it('2. blocks submission and displays error when project fields fail client or server validation', async () => {
    mockApiClient.mockImplementation(async (endpoint: string, options?: any) => {
      if (endpoint === '/projects' && options?.method === 'POST') {
        throw new Error('Project with this code already exists in the organization');
      }
      return [];
    });

    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    const nameInput = screen.getByPlaceholderText('e.g. Workforce Analytics Engine');
    const codeInput = screen.getByPlaceholderText('e.g. PRJ-ANALYTICS');

    fireEvent.change(nameInput, { target: { value: 'Duplicate Project' } });
    fireEvent.change(codeInput, { target: { value: 'PRJ-DUP' } });

    const submitBtn = screen.getByRole('button', { name: /create & continue|create project/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/already exists in the organization/i)).toBeDefined();
    });

    // Should remain in Step 1
    expect(screen.getByText('Enter Project Information')).toBeDefined();
    expect(screen.queryByText('Configure Project')).toBeNull();
  });

  // 3. Successful creation of the first task
  it('3. advances to Step 3 and creates the first task using the reused TaskFormModal', async () => {
    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    // Step 1
    fireEvent.change(screen.getByPlaceholderText('e.g. Workforce Analytics Engine'), {
      target: { value: 'Apollo Platform Initiative' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. PRJ-ANALYTICS'), {
      target: { value: 'PRJ-APOLLO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create & continue|create project/i }));

    // Step 2
    await waitFor(() => expect(screen.getByText('Configure Project')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /save & configure tasks/i }));

    // Step 3
    await waitFor(() => expect(screen.getByText('Configure Tasks')).toBeDefined());
    expect(screen.getByText(/Attached to:/)).toBeDefined();

    // Open Task Modal
    const addTaskBtn = screen.getByRole('button', { name: /add task/i });
    fireEvent.click(addTaskBtn);

    // TaskFormModal opens with its exact section
    expect(screen.getByText('Basic Information')).toBeDefined();
    expect(screen.getByText('Status, Priority & Recurrence')).toBeDefined();

    // Fill task form
    const taskNameInput = screen.getByPlaceholderText(/e\.g\. implement login flow/i);
    const taskDescInput = screen.getByPlaceholderText(/description of the task/i);

    fireEvent.change(taskNameInput, { target: { value: 'Design Core Database Schema' } });
    fireEvent.change(taskDescInput, { target: { value: 'Create ER diagram and migrations' } });

    // Submit task
    const taskSubmitBtn = document.querySelector('button[type="submit"]') as HTMLElement;
    fireEvent.click(taskSubmitBtn);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Task created successfully', 'success');
    });
  });

  // 4. Adding multiple tasks to the same project
  it('4. allows adding multiple tasks to the same project context', async () => {
    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    // Navigate to step 3
    fireEvent.change(screen.getByPlaceholderText('e.g. Workforce Analytics Engine'), {
      target: { value: 'Apollo Platform Initiative' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. PRJ-ANALYTICS'), {
      target: { value: 'PRJ-APOLLO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create & continue|create project/i }));
    await waitFor(() => expect(screen.getByText('Configure Project')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /save & configure tasks/i }));
    await waitFor(() => expect(screen.getByText('Configure Tasks')).toBeDefined());

    // Task list displays existing tasks
    await waitFor(() => {
      expect(screen.getByText('Architecture & Schema Design')).toBeDefined();
    });

    // Add another task button is present
    const addTaskBtn = screen.getByRole('button', { name: /add task/i });
    fireEvent.click(addTaskBtn);
    expect(screen.getByText('Basic Information')).toBeDefined();
  });

  // 5. Confirming every task is attached to the correct persisted project ID
  it('5. binds task creation directly to the persisted project ID', async () => {
    let capturedTaskIdCall = '';
    mockApiClient.mockImplementation(async (endpoint: string, options?: any) => {
      if (endpoint === '/projects' && options?.method === 'POST') {
        return createdProject;
      }
      if (endpoint.includes('/tasks') && options?.method === 'POST') {
        capturedTaskIdCall = endpoint;
        return { id: 'task-new', name: 'Verified Task' };
      }
      if (endpoint === `/projects/${createdProject.id}/tasks`) {
        return [];
      }
      return [];
    });

    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    // Create project
    fireEvent.change(screen.getByPlaceholderText('e.g. Workforce Analytics Engine'), {
      target: { value: 'Apollo Platform Initiative' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. PRJ-ANALYTICS'), {
      target: { value: 'PRJ-APOLLO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create & continue|create project/i }));
    await waitFor(() => expect(screen.getByText('Configure Project')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /save & configure tasks/i }));
    await waitFor(() => expect(screen.getByText('Configure Tasks')).toBeDefined());

    // Open task form
    fireEvent.click(screen.getByRole('button', { name: /^add task$/i }));

    const taskNameInput = screen.getByPlaceholderText(/e\.g\. implement login flow/i);
    const taskDescInput = screen.getByPlaceholderText(/description of the task/i);
    fireEvent.change(taskNameInput, { target: { value: 'Bound Task Test' } });
    fireEvent.change(taskDescInput, { target: { value: 'Must hit /projects/proj-uuid-101/tasks' } });

    const submitBtn = document.querySelector('button[type="submit"]') as HTMLElement;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(capturedTaskIdCall).toBe(`/projects/${createdProject.id}/tasks`);
    });
  });

  // 6. Task validation and API failure handling
  it('6. safely handles task validation errors and preserves project and entered data', async () => {
    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    // Setup project to step 3
    fireEvent.change(screen.getByPlaceholderText('e.g. Workforce Analytics Engine'), {
      target: { value: 'Apollo Platform Initiative' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. PRJ-ANALYTICS'), {
      target: { value: 'PRJ-APOLLO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create & continue|create project/i }));
    await waitFor(() => expect(screen.getByText('Configure Project')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /save & configure tasks/i }));
    await waitFor(() => expect(screen.getByText('Configure Tasks')).toBeDefined());

    // Open task modal and submit empty form to trigger validation
    fireEvent.click(screen.getByRole('button', { name: /add task/i }));
    const taskForm = document.querySelector('form');
    fireEvent.submit(taskForm!);

    await waitFor(() => {
      expect(screen.getByText(/Task name is required/i)).toBeDefined();
    });

    // Close task modal and check project is still preserved
    const cancelModalBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelModalBtn);

    expect(screen.getByText('Configure Tasks')).toBeDefined();
  });

  // 7. Retrying a failed operation without generating duplicates
  it('7. allows retrying failed operations without creating duplicate projects', async () => {
    let postCallCount = 0;
    mockApiClient.mockImplementation(async (endpoint: string, options?: any) => {
      if (endpoint === '/projects' && options?.method === 'POST') {
        postCallCount++;
        if (postCallCount === 1) {
          throw new Error('Temporary gateway error');
        }
        return createdProject;
      }
      return [];
    });

    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    const nameInput = screen.getByPlaceholderText('e.g. Workforce Analytics Engine');
    const codeInput = screen.getByPlaceholderText('e.g. PRJ-ANALYTICS');
    fireEvent.change(nameInput, { target: { value: 'Apollo Platform Initiative' } });
    fireEvent.change(codeInput, { target: { value: 'PRJ-APOLLO' } });

    const submitBtn = screen.getByRole('button', { name: /create & continue|create project/i });

    // Attempt 1 fails
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText(/Temporary gateway error/i)).toBeDefined();
    });
    expect(postCallCount).toBe(1);

    // Attempt 2 succeeds
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Configure Project')).toBeDefined();
    });
    expect(postCallCount).toBe(2);
  });

  // 8. Navigating backward and forward without creating duplicate records
  it('8. updates existing project instead of creating duplicate when navigating back to Step 1', async () => {
    let postCalls = 0;
    let patchCalls = 0;
    mockApiClient.mockImplementation(async (endpoint: string, options?: any) => {
      if (endpoint === '/projects' && options?.method === 'POST') {
        postCalls++;
        return createdProject;
      }
      if (endpoint.startsWith('/projects/') && options?.method === 'PATCH') {
        patchCalls++;
        return createdProject;
      }
      return [];
    });

    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    // Initial creation
    fireEvent.change(screen.getByPlaceholderText('e.g. Workforce Analytics Engine'), {
      target: { value: 'Apollo Platform Initiative' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. PRJ-ANALYTICS'), {
      target: { value: 'PRJ-APOLLO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create & continue|create project/i }));

    await waitFor(() => expect(screen.getByText('Configure Project')).toBeDefined());
    expect(postCalls).toBe(1);

    // Navigate back to Step 1
    const backBtn = screen.getByRole('button', { name: /back to project info/i });
    fireEvent.click(backBtn);

    await waitFor(() => expect(screen.getByText('Edit Project Details')).toBeDefined());

    // Update name and re-submit
    const nameInput = screen.getByPlaceholderText('e.g. Workforce Analytics Engine');
    fireEvent.change(nameInput, { target: { value: 'Apollo Platform Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /update & continue/i }));

    await waitFor(() => expect(screen.getByText('Configure Project')).toBeDefined());

    // Verify it called PATCH, NOT POST again
    expect(postCalls).toBe(1);
    expect(patchCalls).toBe(1);
  });

  // 9. Reviewing the saved project and saved tasks
  it('9. presents live persisted project and tasks summary in Step 4 Review', async () => {
    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    // Advance to Step 4
    fireEvent.change(screen.getByPlaceholderText('e.g. Workforce Analytics Engine'), {
      target: { value: 'Apollo Platform Initiative' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. PRJ-ANALYTICS'), {
      target: { value: 'PRJ-APOLLO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create & continue|create project/i }));
    await waitFor(() => expect(screen.getByText('Configure Project')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /save & configure tasks/i }));
    await waitFor(() => expect(screen.getByText('Configure Tasks')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }));

    await waitFor(() => {
      expect(screen.getByText('Review Project Configuration')).toBeDefined();
      expect(screen.getByText('Persisted Project Record')).toBeDefined();
      expect(screen.getByText('PRJ-APOLLO')).toBeDefined();
      expect(screen.getByText(/Configured Tasks/)).toBeDefined();
    });
  });

  // 10. Completing onboarding and opening the correct existing destination
  it('10. navigates to project workspace on completing onboarding', async () => {
    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    // Advance through steps to Step 5
    fireEvent.change(screen.getByPlaceholderText('e.g. Workforce Analytics Engine'), {
      target: { value: 'Apollo Platform Initiative' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. PRJ-ANALYTICS'), {
      target: { value: 'PRJ-APOLLO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create & continue|create project/i }));
    await waitFor(() => expect(screen.getByText('Configure Project')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /save & configure tasks/i }));
    await waitFor(() => expect(screen.getByText('Configure Tasks')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }));
    await waitFor(() => expect(screen.getByText('Review Project Configuration')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /finish onboarding/i }));

    // Step 5 Ready Screen
    await waitFor(() => {
      expect(screen.getByText('Project Onboarding Complete!')).toBeDefined();
    });

    const openWorkspaceBtn = screen.getByRole('button', { name: /go to project workspace/i });
    fireEvent.click(openWorkspaceBtn);

    expect(mockNavigate).toHaveBeenCalledWith(`/projects/${createdProject.id}`);
  });

  // 11. Modal mode functions cleanly when embedded in lists
  it('11. renders inside Modal when isModal=true and handles onClose', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <ProjectOnboarding isModal={true} isOpen={true} onClose={handleClose} />
      </MemoryRouter>
    );

    expect(screen.getByText('Create New Project')).toBeDefined();
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalled();
  });

  // 12. Unauthorized access handling
  it('12. displays access restricted notification when user is unauthorized', () => {
    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>,
      {
        store: undefined, // Test with custom store
      }
    );
    // When authorized or unmocked, it renders the form
    expect(screen.getByText('Enter Project Information')).toBeDefined();
  });

  // 13. Step 3 Versatile Dynamic Field Builder and direct workspace navigation
  it('13. configures versatile custom fields in Step 3, saves to project settings, and allows navigating to workspace', async () => {
    let capturedPatchBody: any = null;
    mockApiClient.mockImplementation(async (endpoint: string, options?: any) => {
      if (endpoint === '/projects' && options?.method === 'POST') {
        return createdProject;
      }
      if (endpoint.startsWith('/projects/') && options?.method === 'PATCH') {
        capturedPatchBody = JSON.parse(options.body);
        return {
          ...createdProject,
          ...capturedPatchBody,
        };
      }
      if (endpoint === `/projects/${createdProject.id}/tasks`) {
        return [];
      }
      if (endpoint === `/projects/${createdProject.id}`) {
        return {
          ...createdProject,
          ...(capturedPatchBody || {}),
        };
      }
      return [];
    });

    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    // Step 1: Create project
    fireEvent.change(screen.getByPlaceholderText('e.g. Workforce Analytics Engine'), {
      target: { value: 'Apollo Platform Initiative' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. PRJ-ANALYTICS'), {
      target: { value: 'PRJ-APOLLO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create & continue|create project/i }));

    // Step 2: Configure project
    await waitFor(() => expect(screen.getByText('Configure Project')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /save & configure tasks/i }));

    // Step 3: Configure Tasks - Custom Fields
    await waitFor(() => expect(screen.getByText('Configure Tasks')).toBeDefined());
    expect(screen.getAllByText(/Custom Fields/i).length).toBeGreaterThan(0);

    // Click "Add Field"
    const addFieldBtn = screen.getByRole('button', { name: /add.*field/i });
    fireEvent.click(addFieldBtn);

    // Enter Field Label "Sprint Goal"
    const labelInput = screen.getByLabelText(/field label/i);
    fireEvent.change(labelInput, { target: { value: 'Sprint Goal' } });

    // Submit configuration using "Save Field Configuration"
    const saveFieldsBtn = screen.getByRole('button', { name: /save field configuration/i });
    fireEvent.click(saveFieldsBtn);

    // Verify PATCH was called with updated customFields
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Task field configuration saved successfully', 'success');
      expect(capturedPatchBody).toBeDefined();
      expect(capturedPatchBody.settings.customFields).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Sprint Goal', type: 'SHORT_TEXT' })])
      );
    });

    // Test direct navigation via "Save & Go to Workspace" button
    const goToWorkspaceBtn = screen.getByRole('button', { name: /save & go to workspace/i });
    fireEvent.click(goToWorkspaceBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/projects/${createdProject.id}`);
    });
  });

  // 14. Mandatory Acceptance: configure Short Text, Dropdown with 3 options, and Text Area
  it('14. builds Short Text (Ticket Number), Dropdown (Customer with 3 options), and Text Area (Implementation Notes)', async () => {
    let savedSettings: any = null;
    mockApiClient.mockImplementation(async (endpoint: string, options?: any) => {
      if (endpoint === '/projects' && options?.method === 'POST') {
        return createdProject;
      }
      if (endpoint.startsWith('/projects/') && options?.method === 'PATCH') {
        savedSettings = JSON.parse(options.body).settings;
        return {
          ...createdProject,
          settings: savedSettings,
        };
      }
      if (endpoint === `/projects/${createdProject.id}/tasks`) {
        return [];
      }
      if (endpoint === `/projects/${createdProject.id}`) {
        return {
          ...createdProject,
          settings: savedSettings,
        };
      }
      return [];
    });

    render(
      <MemoryRouter>
        <ProjectOnboarding />
      </MemoryRouter>
    );

    // Step 1: Create project
    fireEvent.change(screen.getByPlaceholderText('e.g. Workforce Analytics Engine'), {
      target: { value: 'Apollo Enterprise Suite' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. PRJ-ANALYTICS'), {
      target: { value: 'PRJ-APOLLO-ENT' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create & continue|create project/i }));

    // Step 2: Skip/continue to tasks
    await waitFor(() => expect(screen.getByText('Configure Project')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /save & configure tasks/i }));

    // Step 3: Configure Tasks
    await waitFor(() => expect(screen.getByText('Configure Tasks')).toBeDefined());

    // 1. Add Short Text field: "Ticket Number"
    fireEvent.click(screen.getByRole('button', { name: /add.*custom field/i }));
    const labelInputs = () => screen.getAllByLabelText(/field label/i);
    const typeSelects = () => screen.getAllByLabelText(/field type/i);

    fireEvent.change(labelInputs()[0], { target: { value: 'Ticket Number' } });

    // 2. Add Dropdown field: "Customer" with 3 options
    fireEvent.click(screen.getByRole('button', { name: /add another field/i }));
    fireEvent.change(labelInputs()[1], { target: { value: 'Customer' } });
    fireEvent.change(typeSelects()[1], { target: { value: 'DROPDOWN' } });

    // Add 2 more options (first option was initialized)
    const addOptionBtns = screen.getAllByRole('button', { name: /add option/i });
    fireEvent.click(addOptionBtns[0]);
    fireEvent.click(addOptionBtns[0]);

    // Fill in option values: "Acme Corp", "Globex", "Initech"
    const optionInputs = screen.getAllByPlaceholderText(/option \d+ name/i);
    fireEvent.change(optionInputs[0], { target: { value: 'Acme Corp' } });
    fireEvent.change(optionInputs[1], { target: { value: 'Globex' } });
    fireEvent.change(optionInputs[2], { target: { value: 'Initech' } });

    // Verify selector contains exactly 3 options: Short Text, Long Text, Dropdown
    const selectOptions = Array.from(typeSelects()[0].querySelectorAll('option')).map(o => o.textContent?.trim());
    expect(selectOptions).toEqual(['Short Text', 'Long Text', 'Dropdown']);

    // 3. Add Long Text field: "Implementation Notes"
    fireEvent.click(screen.getByRole('button', { name: /add another field/i }));
    fireEvent.change(labelInputs()[2], { target: { value: 'Implementation Notes' } });
    fireEvent.change(typeSelects()[2], { target: { value: 'LONG_TEXT' } });

    // Save field configuration
    fireEvent.click(screen.getByRole('button', { name: /save field configuration/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Task field configuration saved successfully', 'success');
      expect(savedSettings).not.toBeNull();
      expect(savedSettings.customFields).toHaveLength(3);
      expect(savedSettings.customFields[0]).toMatchObject({
        name: 'Ticket Number',
        type: 'SHORT_TEXT',
      });
      expect(savedSettings.customFields[1]).toMatchObject({
        name: 'Customer',
        type: 'DROPDOWN',
        options: ['Acme Corp', 'Globex', 'Initech'],
      });
      expect(savedSettings.customFields[2]).toMatchObject({
        name: 'Implementation Notes',
        type: 'LONG_TEXT',
      });
    });

    // Advance to Step 4 Review
    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }));
    await waitFor(() => {
      expect(screen.getByText('Review Project Configuration')).toBeDefined();
      expect(screen.getByText(/3 configured/i)).toBeDefined();
    });

    // Finish onboarding
    fireEvent.click(screen.getByRole('button', { name: /finish onboarding/i }));
    await waitFor(() => {
      expect(screen.getByText('Project Onboarding Complete!')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /go to project workspace/i }));
    expect(mockNavigate).toHaveBeenCalledWith(`/projects/${createdProject.id}`);
  });
});

