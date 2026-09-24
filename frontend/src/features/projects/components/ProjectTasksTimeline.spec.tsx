import { render, screen, fireEvent } from '../../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectTasksTimeline } from './ProjectTasksTimeline';
import { Task, Milestone } from './ProjectTasksTab';



const mockEmployees = [
  { id: 'emp-1', name: 'Alice Smith' },
];

const mockMilestones: Milestone[] = [
  { id: 'm-1', projectId: 'p-1', title: 'Beta Release', targetDate: new Date().toISOString(), status: 'PENDING' },
];

const todayStr = new Date().toISOString();
const mockTasks: Task[] = [
  { id: 't-1', name: 'Root Task', status: 'IN_PROGRESS', isActive: true, startDate: todayStr, dueDate: todayStr },
  { id: 't-2', name: 'Subtask 1', status: 'TODO', isActive: true, parentTaskId: 't-1' },
];

describe('ProjectTasksTimeline', () => {
  const onViewDetail = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    tasks: mockTasks,
    milestones: mockMilestones,
    employees: mockEmployees,
    onViewDetail,
  };

  it('renders the dual pane layout and toolbar', () => {
    render(<ProjectTasksTimeline {...defaultProps} />);
    expect(screen.getByText('Project Timeline')).toBeDefined();
    expect(screen.getByText('Milestones')).toBeDefined();
    expect(screen.getAllByText('Root Task').length).toBeGreaterThan(0);
  });

  it('renders task hierarchy and supports collapsing', () => {
    render(<ProjectTasksTimeline {...defaultProps} />);
    // By default, children are visible
    expect(screen.getAllByText('Subtask 1').length).toBeGreaterThan(0);
    
    // Find the chevron to collapse
    const collapseButton = screen.getAllByText('Root Task')[0].parentElement?.parentElement?.querySelector('svg');
    if (collapseButton) {
      fireEvent.click(collapseButton);
      // Wait for re-render, Subtask 1 should be gone
      expect(screen.queryByText('Subtask 1')).toBeNull();
    }
  });

  it('calls onViewDetail when a task row or bar is clicked', () => {
    render(<ProjectTasksTimeline {...defaultProps} />);
    const rootTaskText = screen.getAllByText('Root Task')[0];
    // Click the row (parent container)
    fireEvent.click(rootTaskText);
    expect(onViewDetail).toHaveBeenCalledWith(expect.objectContaining(mockTasks[0]));
  });
});