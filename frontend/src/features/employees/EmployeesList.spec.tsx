/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { EmployeesList } from './EmployeesList';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { ToastProvider } from '../../context/ToastContext';

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: vi.fn(),
}));

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('EmployeesList RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient as any).mockImplementation((url: string) => {
      if (url.includes('/teams')) return Promise.resolve([]);
      if (url.includes('/employees')) return Promise.resolve([{
        id: 'emp1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        employeeCode: 'EMP001',
        isActive: true,
        role: 'MANAGER',
        teamId: null,
      }]);
      return Promise.resolve([]);
    });
  });

  describe('Admin Experience', () => {
    beforeEach(() => {
      (useCurrentEmployee as any).mockReturnValue({
        employee: {
          id: 'admin1',
          roles: ['ADMIN'],
          organizationId: 'org1',
        }
      });
    });

    it('displays Create button for Admin and Role selector defaults to EMPLOYEE', async () => {
      renderWithProviders(<EmployeesList />);
      const addButton = await screen.findByText('Invite Employee');
      expect(addButton).toBeDefined();
      
      fireEvent.click(addButton);
      
      const roleSelect = screen.getByLabelText('Role *') as HTMLSelectElement;
      expect(roleSelect).toBeDefined();
      expect(roleSelect.value).toBe('EMPLOYEE');
    });

    it('allows Admin to submit MANAGER role on create', async () => {
      renderWithProviders(<EmployeesList />);
      const addButton = await screen.findByText('Invite Employee');
      fireEvent.click(addButton);
      
      fireEvent.change(screen.getByPlaceholderText('e.g. John Doe'), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByPlaceholderText('e.g. john@sify.com'), { target: { value: 'test@sify.com' } });
      
      const roleSelect = screen.getByLabelText('Role *');
      fireEvent.change(roleSelect, { target: { value: 'MANAGER' } });
      
      const submitBtn = screen.getByRole('button', { name: 'Send Invitation' });
      fireEvent.click(submitBtn);
      
      await waitFor(() => {
        expect(apiClient).toHaveBeenCalledWith('/employee-invitations', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"role":"MANAGER"'),
        }));
      });
    });

    it('collects username, email, initial password, and auto-generates password', async () => {
      renderWithProviders(<EmployeesList />);
      const addButton = await screen.findByText('Invite Employee');
      fireEvent.click(addButton);

      // Verify direct UMS callout notice
      expect(screen.getByText(/Direct UMS Provisioning:/i)).toBeDefined();

      // Enter full name and custom credentials
      fireEvent.change(screen.getByPlaceholderText('e.g. John Doe'), { target: { value: 'Alice Smith' } });
      fireEvent.change(screen.getByPlaceholderText('e.g. johndoe'), { target: { value: 'alicesmith' } });
      fireEvent.change(screen.getByPlaceholderText('e.g. john@sify.com'), { target: { value: 'alice@sify.com' } });
      fireEvent.change(screen.getByPlaceholderText('Temporary initial password (min 6 chars)'), { target: { value: 'CustomPass789!' } });

      // Click auto-generate
      const generateBtn = screen.getByText('Auto-generate');
      fireEvent.click(generateBtn);
      const passwordInput = screen.getByPlaceholderText('Temporary initial password (min 6 chars)') as HTMLInputElement;
      expect(passwordInput.value.length).toBeGreaterThanOrEqual(8);

      // Submit
      const submitBtn = screen.getByRole('button', { name: 'Send Invitation' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(apiClient).toHaveBeenCalledWith('/employee-invitations', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"username":"alicesmith"'),
        }));
      });
    });

    it('loads existing employee role in Edit modal and prevents current user role change', async () => {
      renderWithProviders(<EmployeesList />);
      
      // Open edit for Jane Doe (emp1)
      const editButton = await screen.findByTitle('Edit employee');
      fireEvent.click(editButton);
      
      let roleSelect = screen.getByLabelText('Role *') as HTMLSelectElement;
      expect(roleSelect).toBeDefined();
      expect(roleSelect.value).toBe('MANAGER');
      expect(roleSelect.disabled).toBe(false);
      
      // Close modal
      fireEvent.click(screen.getByText('Cancel'));
      
      // Mock Jane Doe as current user
      (useCurrentEmployee as any).mockReturnValue({
        employee: {
          id: 'emp1',
          roles: ['ADMIN'],
          organizationId: 'org1',
        }
      });
      
      // Re-render
      renderWithProviders(<EmployeesList />);
      const editButtonAgain = await screen.findByTitle('Edit employee');
      fireEvent.click(editButtonAgain);
      
      roleSelect = screen.getByLabelText('Role *') as HTMLSelectElement;
      expect(roleSelect.disabled).toBe(true);
      expect(screen.getByText('You cannot change your own role.')).toBeDefined();
    });

    it('Employee table displays the role', async () => {
      renderWithProviders(<EmployeesList />);
      const roleBadge = await screen.findByText('MANAGER');
      expect(roleBadge).toBeDefined();
    });

    it('surfaces backend 403 errors', async () => {
      renderWithProviders(<EmployeesList />);
      
      const editButton = await screen.findByTitle('Edit employee');
      fireEvent.click(editButton);
      
      (apiClient as any).mockImplementation((url: string, options: any) => {
        console.log('MOCK CALLED WITH:', url, options?.method);
        if (options && options.method === 'PATCH') {
          console.log('REJECTING PATCH');
          const err = new Error('Insufficient permissions');
          (err as any).status = 403;
          return Promise.reject(err);
        }
        return Promise.resolve({
          data: [
            { id: '1', employeeCode: 'EMP-001', name: 'John Doe', role: 'EMPLOYEE', email: 'john@example.com' },
            { id: '2', employeeCode: 'EMP-002', name: 'Jane Admin', role: 'ADMIN', email: 'jane@example.com' }
          ],
          meta: { total: 2 }
        });
      });
      
      const saveButton = screen.getByRole('button', { name: 'Save Changes' });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Insufficient permissions|Failed to update/)).toBeDefined();
      }, { timeout: 2000 });
    });
  });

  describe('Manager Experience', () => {
    beforeEach(() => {
      (useCurrentEmployee as any).mockReturnValue({
        employee: {
          id: 'manager1',
          roles: ['MANAGER'],
          organizationId: 'org1',
        }
      });
    });

    it('hides employee mutation controls for Manager', async () => {
      renderWithProviders(<EmployeesList />);
      
      await screen.findByText('Employees');
      
      // Should not see Invite Employee
      expect(screen.queryByText('Invite Employee')).toBeNull();
      
      // Should not see Actions column header
      expect(screen.queryByText('Actions')).toBeNull();
      
      // Should not see Edit/Deactivate buttons
      expect(screen.queryByTitle('Edit employee')).toBeNull();
      expect(screen.queryByTitle('Deactivate employee')).toBeNull();
    });
  });

  describe('Manager Team Display Rules', () => {
    beforeEach(() => {
      (useCurrentEmployee as any).mockReturnValue({
        employee: {
          id: 'admin1',
          roles: ['ADMIN'],
          organizationId: 'org1',
        }
      });
    });

    it('shows team membership if teamId is present', async () => {
      (apiClient as any).mockImplementation((url: string) => {
        if (url.includes('/teams')) return Promise.resolve([{ id: 't1', name: 'Design' }]);
        if (url.includes('/employees')) return Promise.resolve([{
          id: 'emp1',
          name: 'Regular Emp',
          email: 'reg@example.com',
          isActive: true,
          role: 'EMPLOYEE',
          teamId: 't1',
        }]);
        return Promise.resolve([]);
      });

      renderWithProviders(<EmployeesList />);
      const elements = await screen.findAllByText(/Design/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('shows Manages: [Team] if manager has no teamId but manages one team', async () => {
      (apiClient as any).mockImplementation((url: string) => {
        if (url.includes('/teams')) return Promise.resolve([{ id: 't1', name: 'Frontend' }]);
        if (url.includes('/employees')) return Promise.resolve([{
          id: 'mgr1',
          name: 'Manager One',
          email: 'mgr@example.com',
          isActive: true,
          role: 'MANAGER',
          teamId: null,
          managedTeams: [{ id: 't1', name: 'Frontend' }]
        }]);
        return Promise.resolve([]);
      });

      renderWithProviders(<EmployeesList />);
      const elements = await screen.findAllByText(/Manages: Frontend/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('shows multiple managed teams', async () => {
      (apiClient as any).mockImplementation((url: string) => {
        if (url.includes('/teams')) return Promise.resolve([]);
        if (url.includes('/employees')) return Promise.resolve([{
          id: 'mgr2',
          name: 'Multi Manager',
          email: 'multi@example.com',
          isActive: true,
          role: 'MANAGER',
          teamId: null,
          managedTeams: [{ id: 't1', name: 'Frontend' }, { id: 't2', name: 'Backend' }]
        }]);
        return Promise.resolve([]);
      });

      renderWithProviders(<EmployeesList />);
      const elements = await screen.findAllByText(/Manages: Frontend, Backend/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
