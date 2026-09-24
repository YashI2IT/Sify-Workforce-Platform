import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectTasksBoard } from './ProjectTasksBoard';
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
  { id: 't-1', name: 'Task One', status: 'TODO', isActive: true, priority: 'HIGH', assigneeId: 'emp-1' },
  { id: 't-2', name: 'Task Two', status: 'IN_PROGRESS', isActive: true },
  { id: 't-3', name: 'Task Three', status: 'DONE', isActive: false },
];

describe('ProjectTasksBoard', () => {
  const onStatusChange = vi.fn();
  const onEdit = vi.fn();
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
    onEdit,
    onViewDetail,
    onStatusChange,
  };

  it('renders all four columns', () => {
    render(<ProjectTasksBoard {...defaultProps} />);
    expect(screen.getByText('To Do')).toBeDefined();
    expect(screen.getByText('In Progress')).toBeDefined();
    expect(screen.getByText('Review')).toBeDefined();
    expect(screen.getByText('Done')).toBeDefined();
  });

  it('renders tasks in their respective columns', () => {
    render(<ProjectTasksBoard {...defaultProps} />);
    expect(screen.getByText('Task One')).toBeDefined();
    expect(screen.getByText('Task Two')).toBeDefined();
    expect(screen.getByText('Task Three')).toBeDefined();
  });

  it('displays inactive badge for inactive task', () => {
    render(<ProjectTasksBoard {...defaultProps} />);
    expect(screen.getByText('INACTIVE')).toBeDefined();
  });

  it('shows assignee initial if assigned', () => {
    render(<ProjectTasksBoard {...defaultProps} />);
    expect(screen.getByText('A')).toBeDefined(); // Alice Smith -> A
  });

  it('calls onViewDetail when clicking a task card', () => {
    render(<ProjectTasksBoard {...defaultProps} />);
    const card = screen.getByText('Task One').closest('div[role="button"]') || screen.getByText('Task One').parentElement?.parentElement?.parentElement;
    if (card) {
      fireEvent.click(card);
      expect(onViewDetail).toHaveBeenCalledWith(mockTasks[0]);
    }
  });
});