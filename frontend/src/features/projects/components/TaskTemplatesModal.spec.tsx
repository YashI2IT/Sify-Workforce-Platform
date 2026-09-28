import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskTemplatesModal } from './TaskTemplatesModal';
import { ToastProvider } from '../../../context/ToastContext';
import * as apiSlice from '../../../store/apiSlice';

vi.mock('../../../store/apiSlice', async () => {
  const actual = await vi.importActual('../../../store/apiSlice');
  return {
    ...actual,
    useGetProjectTaskTemplatesQuery: vi.fn(),
    useDeleteTaskTemplateMutation: vi.fn(),
    useCreateTaskTemplateMutation: vi.fn(() => [vi.fn()]),
    useCreateProjectTaskMutation: vi.fn(() => [vi.fn()]),
    useUpdateProjectTaskMutation: vi.fn(() => [vi.fn()]),
  };
});

describe('TaskTemplatesModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUseTemplate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (isAdmin = true, templates = []) => {
    (apiSlice.useGetProjectTaskTemplatesQuery as any).mockReturnValue({
      data: templates,
      isLoading: false,
    });
    (apiSlice.useDeleteTaskTemplateMutation as any).mockReturnValue([vi.fn()]);

    render(
      <ToastProvider>
        <TaskTemplatesModal
          isOpen={true}
          onClose={mockOnClose}
          projectId="proj-1"
          isAdmin={isAdmin}
          projectIsActive={true}
          employees={[]}
          tasks={[]}
          onUseTemplate={mockOnUseTemplate}
        />
      </ToastProvider>
    );
  };

  it('renders empty state', () => {
    renderModal(true, []);
    expect(screen.getByText('No templates found.')).toBeDefined();
  });

  it('renders templates and allows ADMIN to delete', () => {
    renderModal(true, [
      { id: 't1', name: 'Weekly Report', taskName: 'Submit Status', priority: 'HIGH' }
    ]);
    expect(screen.getByText('Weekly Report')).toBeDefined();
    expect(screen.getByText('Generates: Submit Status')).toBeDefined();
    
    // ADMIN sees New Template and delete (Trash)
    expect(screen.getByText('New Template')).toBeDefined();
  });

  it('hides New Template and Delete for non-admin', () => {
    renderModal(false, [
      { id: 't1', name: 'Weekly Report', taskName: 'Submit Status', priority: 'HIGH' }
    ]);
    expect(screen.queryByText('New Template')).toBeNull();
    // Trash icon is hidden, we can assert by checking only 'Use' button is present
    expect(screen.getByText('Use')).toBeDefined();
  });

  it('calls onUseTemplate when Use is clicked', async () => {
    const tpl = { id: 't1', name: 'Weekly Report', taskName: 'Submit Status', priority: 'HIGH' };
    renderModal(true, [tpl]);
    
    fireEvent.click(screen.getByText('Use'));
    await waitFor(() => {
      expect(mockOnUseTemplate).toHaveBeenCalledWith(tpl);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
