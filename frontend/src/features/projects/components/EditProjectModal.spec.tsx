import { render, screen, fireEvent, waitFor, cleanup } from '../../../test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditProjectModal } from './EditProjectModal';

const mockApiClient = vi.fn();
vi.mock('../../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

const mockShowToast = vi.fn();
vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe('EditProjectModal Component — Complete Project & Task Configuration', () => {
  afterEach(() => {
    cleanup();
  });
  const existingProject = {
    id: 'proj-123',
    organizationId: 'org-abc',
    name: 'Apollo Platform Initiative',
    code: 'PRJ-APOLLO',
    status: 'ACTIVE',
    isActive: true,
    description: 'Enterprise cloud migration platform',
    startDate: '2026-03-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    settings: {
      taskDefaults: {
        priority: 'HIGH',
        recurrence: 'WEEKLY',
        estimatedHours: 16,
      },
      customFields: [
        {
          id: 'fld-1',
          name: 'Ticket Number',
          type: 'SHORT_TEXT',
          required: true,
          placeholder: 'e.g. JIRA-100',
        },
        {
          id: 'fld-2',
          name: 'Environment',
          type: 'DROPDOWN',
          required: false,
          options: ['Staging', 'Production', 'DR'],
        },
      ],
    },
  };

  const existingTasks = [
    {
      id: 'task-1',
      name: 'Initial Schema Migration',
      metadata: {
        'Ticket Number': 'JIRA-100',
        'fld-1': 'JIRA-100',
        Environment: 'Production',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockImplementation(async (endpoint: string) => {
      if (endpoint === `/projects/${existingProject.id}`) {
        return existingProject;
      }
      if (endpoint === `/projects/${existingProject.id}/tasks`) {
        return existingTasks;
      }
      return [];
    });
  });

  // 1 & 2: Loads Project Information & Details
  it('1. loads the current project name, code, status, active state, description, and dates', async () => {
    render(
      <EditProjectModal
        projectId={existingProject.id}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Apollo Platform Initiative')).toBeDefined();
    });

    expect(screen.getByDisplayValue('PRJ-APOLLO')).toBeDefined();
    expect(screen.getByDisplayValue('Enterprise cloud migration platform')).toBeDefined();
    expect(screen.getByDisplayValue('2026-03-01')).toBeDefined();
    expect(screen.getByDisplayValue('2026-12-31')).toBeDefined();
  });

  // 3: Reusable Task Defaults
  it('2. loads saved task defaults (priority, recurrence, estimated hours) and allows modifying them', async () => {
    render(
      <EditProjectModal
        projectId={existingProject.id}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('16')).toBeDefined();
    });

    // Check that Task Defaults section is visible
    expect(screen.getByText('3. Task Defaults')).toBeDefined();

    // Modify estimated hours
    const hoursInput = screen.getByDisplayValue('16');
    fireEvent.change(hoursInput, { target: { value: '24' } });
    expect(screen.getByDisplayValue('24')).toBeDefined();
  });

  // 4 & 5: Versatile Custom Fields & Dropdown Options
  it('3. displays configured custom fields, allows editing labels and dropdown options', async () => {
    render(
      <EditProjectModal
        projectId={existingProject.id}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ticket Number')).toBeDefined();
      expect(screen.getByDisplayValue('Environment')).toBeDefined();
    });

    // Check dropdown options loaded
    expect(screen.getByDisplayValue('Staging')).toBeDefined();
    expect(screen.getByDisplayValue('Production')).toBeDefined();
    expect(screen.getByDisplayValue('DR')).toBeDefined();

    // Add a new dropdown option
    const addOptionBtn = screen.getByRole('button', { name: /add option/i });
    fireEvent.click(addOptionBtn);

    const newOptionInput = screen.getByDisplayValue('Option 4');
    fireEvent.change(newOptionInput, { target: { value: 'Canary' } });
    expect(screen.getByDisplayValue('Canary')).toBeDefined();
  });

  // 6 & 7: Add new field, modify settings, and submit complete configuration
  it('4. allows adding new fields and persists complete configuration on submit', async () => {
    let capturedPatch: any = null;
    mockApiClient.mockImplementation(async (endpoint: string, options?: any) => {
      if (endpoint === `/projects/${existingProject.id}` && options?.method === 'PATCH') {
        capturedPatch = JSON.parse(options.body);
        return {
          ...existingProject,
          ...capturedPatch,
        };
      }
      if (endpoint === `/projects/${existingProject.id}`) {
        return existingProject;
      }
      if (endpoint === `/projects/${existingProject.id}/tasks`) {
        return existingTasks;
      }
      return [];
    });

    render(
      <EditProjectModal
        projectId={existingProject.id}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Apollo Platform Initiative')).toBeDefined();
    });

    // Modify Project Name and Description
    const nameInput = screen.getByDisplayValue('Apollo Platform Initiative');
    fireEvent.change(nameInput, { target: { value: 'Apollo Core Initiative' } });

    // Add a new Text Area field: "Release Notes"
    const addFieldBtn = screen.getByRole('button', { name: /add another field/i });
    fireEvent.click(addFieldBtn);

    const labelInputs = screen.getAllByLabelText(/field label/i);
    const lastLabelInput = labelInputs[labelInputs.length - 1];
    fireEvent.change(lastLabelInput, { target: { value: 'Release Notes' } });

    const typeSelects = screen.getAllByLabelText(/field type/i);
    const lastTypeSelect = typeSelects[typeSelects.length - 1];

    // Verify selector contains exactly 3 options: Short Text, Long Text, Dropdown
    const optionLabels = Array.from(lastTypeSelect.querySelectorAll('option')).map(o => o.textContent?.trim());
    expect(optionLabels).toEqual(['Short Text', 'Long Text', 'Dropdown']);

    fireEvent.change(lastTypeSelect, { target: { value: 'LONG_TEXT' } });

    // Save Changes
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(capturedPatch).not.toBeNull();
      expect(capturedPatch.name).toBe('Apollo Core Initiative');
      expect(capturedPatch.settings.customFields).toHaveLength(3);
      expect(capturedPatch.settings.customFields[2]).toMatchObject({
        name: 'Release Notes',
        type: 'LONG_TEXT',
      });
      expect(mockShowToast).toHaveBeenCalledWith('Project configuration saved successfully', 'success');
    });
  });

  // 8: Safe deletion dialog when existing tasks contain values for a field
  it('5. shows warning dialog when removing a field that has existing task values', async () => {
    render(
      <EditProjectModal
        projectId={existingProject.id}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ticket Number')).toBeDefined();
    });

    // Attempt to remove "Ticket Number" (which task-1 contains metadata for)
    const removeBtns = screen.getAllByRole('button', { name: /remove field/i });
    fireEvent.click(removeBtns[0]);

    // Warning confirmation alert should appear
    await waitFor(() => {
      expect(screen.getByText(/Existing task data warning/i)).toBeDefined();
      expect(screen.getByText(/existing task contains values for this field/i)).toBeDefined();
    });

    // Confirm removal
    const confirmBtn = screen.getByRole('button', { name: /confirm removal/i });
    fireEvent.click(confirmBtn);

    // "Ticket Number" should now be removed from the builder
    await waitFor(() => {
      expect(screen.queryByDisplayValue('Ticket Number')).toBeNull();
    });
  });

  // 9: Reordering fields
  it('6. supports reordering custom fields up and down', async () => {
    render(
      <EditProjectModal
        projectId={existingProject.id}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ticket Number')).toBeDefined();
    });

    // Move first field down
    const moveDownBtns = screen.getAllByRole('button', { name: /move field down/i });
    fireEvent.click(moveDownBtns[0]);

    const fieldLabels = screen.getAllByLabelText(/field label/i);
    expect((fieldLabels[0] as HTMLInputElement).value).toBe('Environment');
    expect((fieldLabels[1] as HTMLInputElement).value).toBe('Ticket Number');
  });

  // 10: Validation rejects duplicate field names
  it('7. validates and rejects duplicate field labels', async () => {
    render(
      <EditProjectModal
        projectId={existingProject.id}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ticket Number')).toBeDefined();
    });

    // Change "Environment" to "Ticket Number"
    const labelInputs = screen.getAllByLabelText(/field label/i);
    fireEvent.change(labelInputs[1], { target: { value: 'Ticket Number' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Duplicate field label "Ticket Number"/i)).toBeDefined();
    });
  });

  // 11: Delete Project option for authorized managers/admins
  it('8. provides delete project action for authorized users', async () => {
    const handleDelete = vi.fn();
    render(
      <EditProjectModal
        projectId={existingProject.id}
        isOpen={true}
        onClose={vi.fn()}
        canDelete={true}
        onDelete={handleDelete}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Apollo Platform Initiative')).toBeDefined();
    });

    const deleteBtn = screen.getByRole('button', { name: /delete project/i });
    expect(deleteBtn).toBeDefined();

    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith(existingProject.id, existingProject.name);
  });
});
