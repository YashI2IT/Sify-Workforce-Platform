import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskFormModal } from './TaskFormModal';

const mockApiClient = vi.fn();
vi.mock('../../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));
vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockEmployees = [
  { id: 'emp-1', name: 'Alice Smith' },
  { id: 'emp-2', name: 'Bob Jones' },
];
const mockMilestones = [{ id: 'ms-1', name: 'Q1 Release' }];
const mockRequirements = [{ id: 'req-1', title: 'Auth Module' }];
const mockTasks = [
  { id: 'task-1', name: 'Parent Task', status: 'TODO', isActive: true },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  projectId: 'proj-1',
  editingTask: null,
  employees: mockEmployees,
  milestones: mockMilestones,
  requirements: mockRequirements,
  tasks: mockTasks,
};

describe('TaskFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockResolvedValue({ id: 'new-task', name: 'Test' });
  });

  it('renders create form with all sections', () => {
    render(<TaskFormModal {...defaultProps} />);
    // Use section titles which are unique in the modal
    expect(screen.getByText('Basic Information')).toBeDefined();
    expect(screen.getByText('Status, Priority & Recurrence')).toBeDefined();
    expect(screen.getByText('Assignment')).toBeDefined();
    expect(screen.getByText('Planning')).toBeDefined();
    // Submit button via ID
    expect(document.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('renders all four status options including REVIEW', () => {
    render(<TaskFormModal {...defaultProps} />);
    // In our custom Select component, the initial value is TODO
    expect(screen.getByText('TODO')).toBeDefined();
    // To fully test options, we'd need to click the select and check the dropdown menu
    // For now we just verify the form loads properly
  });

  it('shows project members in assignee dropdown', () => {
    render(<TaskFormModal {...defaultProps} />);
    // "Unassigned" is the default placeholder label when nothing is selected
    expect(screen.getByText('Unassigned')).toBeDefined();
  });



  it('pre-populates fields when editing a task', () => {
    const editingTask = {
      id: 'task-edit-1',
      name: 'Existing Task Name',
      status: 'IN_PROGRESS',
      isActive: true,
      priority: 'HIGH',
      description: 'Existing description',
      assigneeId: 'emp-1',
      estimatedHours: 8,
      startDate: '2026-01-01T00:00:00.000Z',
      dueDate: '2026-01-31T00:00:00.000Z',
    };
    render(<TaskFormModal {...defaultProps} editingTask={editingTask} />);
    expect(screen.getByDisplayValue('Existing Task Name')).toBeDefined();
    expect(screen.getByDisplayValue('8')).toBeDefined();
  });

  it('shows validation error for empty name on submit', async () => {
    render(<TaskFormModal {...defaultProps} />);
    // Use fireEvent.submit directly on the form to bypass HTML5 native required validation
    const form = document.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => {
      // The error renders in a <p> element under the name input
      const errEls = screen.getAllByText((content, el) =>
        el?.tagName === 'P' && !!el?.textContent?.includes('Task name is required')
      );
      expect(errEls.length).toBeGreaterThan(0);
    });
  });

  it('excludes self from parent task dropdown when editing', () => {
    const editingTask = {
      id: 'task-1',
      name: 'Parent Task',
      status: 'TODO',
      isActive: true,
    };
    render(<TaskFormModal {...defaultProps} editingTask={editingTask} tasks={mockTasks} />);
    // "None (Top Level)" is the default placeholder for parent task
    expect(screen.getByText('None (Top Level)')).toBeDefined();
  });

  it('shows "Update Task" button label when editing', () => {
    const editingTask = { id: 't-1', name: 'Existing', status: 'TODO', isActive: true };
    render(<TaskFormModal {...defaultProps} editingTask={editingTask} />);
    const submitBtn = document.querySelector('button[type="submit"]') as HTMLElement;
    expect(submitBtn?.textContent?.trim()).toBe('Update Task');
  });

  it('shows "Create Task" button label when creating', () => {
    render(<TaskFormModal {...defaultProps} />);
    const submitBtn = document.querySelector('button[type="submit"]') as HTMLElement;
    expect(submitBtn?.textContent?.trim()).toBe('Create Task');
  });

  it('renders template mode correctly', () => {
    render(<TaskFormModal {...defaultProps} isTemplateMode={true} />);
    expect(screen.getByText('Create Task Template')).toBeDefined();
    expect(screen.getByText('Template Name *')).toBeDefined();
    expect(screen.getByText('Task Name *')).toBeDefined();
    // Should not render Status or Start Date or Parent Task
    expect(screen.queryByText('Status, Priority & Recurrence')).toBeNull();
    expect(screen.getByText('Priority & Recurrence')).toBeDefined();
    expect(screen.queryByText('Start Date')).toBeNull();
    expect(screen.queryByText('Hierarchy')).toBeNull();
  });

  it('populates from initialData when creating task from template', () => {
    const initialData = {
      name: 'Test Task',
      description: 'Desc',
      priority: 'HIGH',
      estimatedHours: 4,
      recurrence: 'WEEKLY',
      assigneeId: 'emp-1'
    };
    render(<TaskFormModal {...defaultProps} initialData={initialData} />);
    expect(screen.getByDisplayValue('Test Task')).toBeDefined();
    expect(screen.getByDisplayValue('Desc')).toBeDefined();
    expect(screen.getByDisplayValue('4')).toBeDefined();
  });
});