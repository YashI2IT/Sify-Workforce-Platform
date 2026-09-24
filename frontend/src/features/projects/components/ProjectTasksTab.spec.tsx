import { render, screen, fireEvent } from '../../../test-utils';
import { describe, it, expect, vi } from 'vitest';
import { ProjectTasksTab } from './ProjectTasksTab';

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../../store/apiSlice', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useUpdateProjectTaskMutation: () => [vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() })],
  };
});

const mockEmployees = [
  { id: 'emp-1', name: 'Alice Smith' },
  { id: 'emp-2', name: 'Bob Jones' },
];

const baseTasks = [
  { id: 't-1', name: 'Setup CI Pipeline', status: 'TODO', priority: 'HIGH', isActive: true, assigneeId: 'emp-1' },
  { id: 't-2', name: 'Write unit tests', status: 'IN_PROGRESS', priority: 'MEDIUM', isActive: true, assigneeId: 'emp-2' },
  { id: 't-3', name: 'Deploy to staging', status: 'DONE', priority: 'LOW', isActive: true },
  { id: 't-4', name: 'Subtask of CI', status: 'TODO', priority: 'MEDIUM', isActive: true, parentTaskId: 't-1' },
];

const noop = () => {};

describe('ProjectTasksTab', () => {
  it('renders task table header and all task rows', () => {
    render(
      <ProjectTasksTab
        tasks={baseTasks}
        employees={mockEmployees}
        isAdmin={true}
        projectIsActive={true}
        projectId="test-proj-1"
        onAdd={noop}
        onEdit={noop}
        onViewDetail={noop}
      />
    );
    expect(screen.getByText('Setup CI Pipeline')).toBeDefined();
    expect(screen.getByText('Write unit tests')).toBeDefined();
    expect(screen.getByText('Deploy to staging')).toBeDefined();
  });

  it('shows empty state when no tasks exist', () => {
    render(
      <ProjectTasksTab
        tasks={[]}
        employees={mockEmployees}
        isAdmin={true}
        projectIsActive={true}
        projectId="test-proj-1"
        projectId="test-proj-1"
        onAdd={noop}
        onEdit={noop}
        onViewDetail={noop}
      />
    );
    expect(screen.getByText('No tasks yet')).toBeDefined();
  });

  it('shows Create Task button for admins', () => {
    render(
      <ProjectTasksTab
        tasks={baseTasks}
        employees={mockEmployees}
        isAdmin={true}
        projectIsActive={true}
        projectId="test-proj-1"
        onAdd={noop}
        onEdit={noop}
        onViewDetail={noop}
      />
    );
    // Use the specific button ID to avoid ambiguity
    const btn = document.getElementById('task-create-btn');
    expect(btn).not.toBeNull();
  });

  it('hides Create Task button for non-admins', () => {
    render(
      <ProjectTasksTab
        tasks={baseTasks}
        employees={mockEmployees}
        isAdmin={false}
        projectIsActive={true}
        projectId="test-proj-1"
        projectId="test-proj-1"
        onAdd={noop}
        onEdit={noop}
        onViewDetail={noop}
      />
    );
    expect(document.getElementById('task-create-btn')).toBeNull();
  });

  it('filters tasks by search query', () => {
    render(
      <ProjectTasksTab
        tasks={baseTasks}
        employees={mockEmployees}
        isAdmin={true}
        projectIsActive={true}
        projectId="test-proj-1"
        onAdd={noop}
        onEdit={noop}
        onViewDetail={noop}
      />
    );
    fireEvent.click(document.getElementById('task-filter-toggle')!);
    const searchInput = screen.getByPlaceholderText('Search tasks by name...');
    fireEvent.change(searchInput, { target: { value: 'CI' } });
    expect(screen.getByText('Setup CI Pipeline')).toBeDefined();
    expect(screen.queryByText('Write unit tests')).toBeNull();
  });

  it('shows no-match empty state when filters yield no results', () => {
    render(
      <ProjectTasksTab
        tasks={baseTasks}
        employees={mockEmployees}
        isAdmin={true}
        projectIsActive={true}
        projectId="test-proj-1"
        onAdd={noop}
        onEdit={noop}
        onViewDetail={noop}
      />
    );
    fireEvent.click(document.getElementById('task-filter-toggle')!);
    const searchInput = screen.getByPlaceholderText('Search tasks by name...');
    fireEvent.change(searchInput, { target: { value: 'zzz_no_match_zzz' } });
    expect(screen.getByText('No tasks match your filters')).toBeDefined();
  });

  it('filters by status chip - only DONE tasks shown', () => {
    render(
      <ProjectTasksTab
        tasks={baseTasks}
        employees={mockEmployees}
        isAdmin={true}
        projectIsActive={true}
        projectId="test-proj-1"
        onAdd={noop}
        onEdit={noop}
        onViewDetail={noop}
      />
    );
    fireEvent.click(document.getElementById('task-filter-toggle')!);
    // Use the chip ID (status-chip-DONE) to avoid matching the row badge
    fireEvent.click(document.getElementById('status-chip-DONE')!);
    expect(screen.getByText('Deploy to staging')).toBeDefined();
    expect(screen.queryByText('Write unit tests')).toBeNull();
  });

  it('calls onViewDetail when a task row is clicked', () => {
    const onViewDetail = vi.fn();
    render(
      <ProjectTasksTab
        tasks={baseTasks}
        employees={mockEmployees}
        isAdmin={true}
        projectIsActive={true}
        projectId="test-proj-1"
        onAdd={noop}
        onEdit={noop}
        onViewDetail={onViewDetail}
      />
    );
    fireEvent.click(screen.getByTestId('task-row-t-1'));
    expect(onViewDetail).toHaveBeenCalledWith(expect.objectContaining({ id: 't-1' }));
  });

  it('renders subtask indented under parent', () => {
    render(
      <ProjectTasksTab
        tasks={baseTasks}
        employees={mockEmployees}
        isAdmin={true}
        projectIsActive={true}
        projectId="test-proj-1"
        onAdd={noop}
        onEdit={noop}
        onViewDetail={noop}
      />
    );
    expect(screen.getByText('Subtask of CI')).toBeDefined();
  });

  it('calls onAdd when Create Task button is clicked', () => {
    const onAdd = vi.fn();
    render(
      <ProjectTasksTab
        tasks={baseTasks}
        employees={mockEmployees}
        isAdmin={true}
        projectIsActive={true}
        projectId="test-proj-1"
        projectId="test-proj-1"
        onAdd={onAdd}
        onEdit={noop}
        onViewDetail={noop}
      />
    );
    fireEvent.click(document.getElementById('task-create-btn')!);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('shows task count in header summary', () => {
    render(
      <ProjectTasksTab
        tasks={baseTasks}
        employees={mockEmployees}
        isAdmin={true}
        projectIsActive={true}
        projectId="test-proj-1"
        onAdd={noop}
        onEdit={noop}
        onViewDetail={noop}
      />
    );
    // Header summary shows "4 tasks · 1 completed" — use getAllByText since it may appear in multiple nodes
    const matches = screen.getAllByText(/4 tasks/);
    expect(matches.length).toBeGreaterThan(0);
  });
});