import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskDetailPanel } from './TaskDetailPanel';

const mockApiClient = vi.fn();
vi.mock('../../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockTasks = [
  { id: 't-1', name: 'Main Task', status: 'IN_PROGRESS', isActive: true, priority: 'HIGH' },
  { id: 't-2', name: 'Subtask One', status: 'TODO', isActive: true, parentTaskId: 't-1' },
  { id: 't-3', name: 'Other Task', status: 'TODO', isActive: true },
  { id: 't-4', name: 'Another Task', status: 'TODO', isActive: true },
];

const mockTask = mockTasks[0];

const defaultProps = {
  task: mockTask,
  isOpen: true,
  onClose: vi.fn(),
  tasks: mockTasks,
  employees: [{ id: 'emp-1', name: 'Alice Smith' }],
  requirements: [{ id: 'req-1', title: 'Auth Module' }],
  milestones: [{ id: 'ms-1', name: 'Q1 Release' }],
  isAdmin: true,
  projectIsActive: true,
  projectId: 'proj-1',
  onEdit: vi.fn(),
};

const mockDepsResponse = {
  predecessors: [{ id: 't-3', name: 'Other Task', status: 'TODO' }],
  successors: [],
};

describe('TaskDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/dependencies')) return Promise.resolve(mockDepsResponse);
      return Promise.resolve([]);
    });
  });

  it('renders task name and status badge', () => {
    render(<TaskDetailPanel {...defaultProps} />);
    expect(screen.getByText('Main Task')).toBeDefined();
    expect(screen.getByText('IN PROGRESS')).toBeDefined();
  });

  it('renders priority badge', () => {
    render(<TaskDetailPanel {...defaultProps} />);
    expect(screen.getByText('HIGH')).toBeDefined();
  });

  it('shows "Unassigned" when no assignee set', () => {
    render(<TaskDetailPanel {...defaultProps} />);
    expect(screen.getByText('Unassigned')).toBeDefined();
  });

  it('shows assignee name when assignee is set', () => {
    const taskWithAssignee = { ...mockTask, assigneeId: 'emp-1' };
    render(<TaskDetailPanel {...defaultProps} task={taskWithAssignee} />);
    expect(screen.getByText('Alice Smith')).toBeDefined();
  });

  it('lists subtasks under hierarchy section', () => {
    render(<TaskDetailPanel {...defaultProps} />);
    expect(screen.getByText('Subtask One')).toBeDefined();
  });

  it('renders Edit Task button for admin', () => {
    render(<TaskDetailPanel {...defaultProps} />);
    expect(document.getElementById('task-detail-edit-icon')).not.toBeNull();
  });

  it('hides Edit Task button for non-admin', () => {
    render(<TaskDetailPanel {...defaultProps} isAdmin={false} />);
    expect(document.getElementById('task-detail-edit-icon')).toBeNull();
  });

  it('calls onEdit when Edit Task button is clicked', () => {
    const onEdit = vi.fn();
    const onClose = vi.fn();
    render(<TaskDetailPanel {...defaultProps} onEdit={onEdit} onClose={onClose} />);
    fireEvent.click(document.getElementById('task-detail-edit-icon')!);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 't-1' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<TaskDetailPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(document.getElementById('detail-panel-close')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns null when isOpen is false', () => {
    render(<TaskDetailPanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Main Task')).toBeNull();
  });
});