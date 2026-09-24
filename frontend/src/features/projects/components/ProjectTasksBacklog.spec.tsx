import { render, screen, fireEvent } from '../../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectTasksBacklog } from './ProjectTasksBacklog';
import { Task } from './ProjectTasksTab';

// Mock dnd to avoid issues in jsdom
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  Droppable: ({ children }: any) => children({ innerRef: vi.fn(), droppableProps: {} }, { isDraggingOver: false }),
  Draggable: ({ children }: any) => children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}));

const mockEmployees = [
  { id: 'emp-1', name: 'Alice Smith' },
];

const mockTasks: Task[] = [
  { id: 't-1', name: 'Backlog Task 1', status: 'TODO', isActive: true, priority: 'HIGH', assigneeId: 'emp-1' },
  { id: 't-2', name: 'Backlog Task 2 (Urgent)', status: 'TODO', isActive: true, priority: 'URGENT' },
  { id: 't-3', name: 'Active Task', status: 'IN_PROGRESS', isActive: true },
  { id: 't-4', name: 'Completed Task', status: 'DONE', isActive: true },
];

describe('ProjectTasksBacklog', () => {
  const onStatusChange = vi.fn();
  const onViewDetail = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    tasks: mockTasks,
    allFilteredTasks: mockTasks,
    employees: mockEmployees,
    isAdmin: true,
    projectIsActive: true,
    onViewDetail,
    onStatusChange,
  };

  it('renders all three backlog sections', () => {
    render(<ProjectTasksBacklog {...defaultProps} />);
    expect(screen.getByText('Active Work')).toBeDefined();
    expect(screen.getByText('Backlog')).toBeDefined();
    expect(screen.getByText('Completed')).toBeDefined();
  });

  it('sorts backlog tasks by priority (Urgent before High)', () => {
    render(<ProjectTasksBacklog {...defaultProps} />);
    // Get all task names displayed
    const headings = screen.getAllByRole('heading', { level: 5 }).map(h => h.textContent?.trim());
    // Active comes first usually, then backlog. Let's find index of backlog tasks.
    const urgentIdx = headings.indexOf('Backlog Task 2 (Urgent)');
    const highIdx = headings.indexOf('Backlog Task 1');
    expect(urgentIdx).toBeLessThan(highIdx);
  });

  it('collapses Completed section by default', () => {
    render(<ProjectTasksBacklog {...defaultProps} />);
    // "Completed Task" should not be visible because it's collapsed
    expect(screen.queryByText('Completed Task')).toBeNull();
  });

  it('expands Completed section when clicked', () => {
    render(<ProjectTasksBacklog {...defaultProps} />);
    const completedHeader = screen.getByText('Completed');
    fireEvent.click(completedHeader); // expand
    expect(screen.getByText('Completed Task')).toBeDefined();
  });

  it('calls onViewDetail when clicking a task', () => {
    render(<ProjectTasksBacklog {...defaultProps} />);
    const taskTitle = screen.getByText('Active Task');
    const card = taskTitle.closest('div[role="button"]') || taskTitle.parentElement?.parentElement?.parentElement;
    if (card) {
      fireEvent.click(card);
      expect(onViewDetail).toHaveBeenCalled();
    }
  });
});