import '@testing-library/jest-dom';
import { render, screen, waitFor } from '../../test-utils';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { Invite } from './Invite';
import { apiClient } from '../../lib/apiClient';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    route = '/invite/test-token',
  } = {}
) => {
  const store = configureStore({
    reducer: {
      auth: (state = { isAuthenticated: false, umsUserEmail: null }, action) => state,
    },
    preloadedState: { auth: preloadedState } as any,
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/invite/:token" element={ui} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('Invite Component', () => {
  const mockDetails = {
    data: {
      email: 'test@sify.com',
      name: 'Test User',
      role: 'EMPLOYEE',
      status: 'PENDING',
      expiresAt: '2027-01-01T00:00:00Z',
      organizationName: 'Sify',
      inviterName: 'Admin Admin',
      teamName: 'Dev Team'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    (apiClient as any).mockImplementation(() => new Promise(() => {})); // pending promise
    renderWithProviders(<Invite />);
    expect(screen.getByText(/Loading invitation details/i)).toBeInTheDocument();
  });

  it('shows unauthenticated state with details (State A)', async () => {
    (apiClient as any).mockResolvedValue(mockDetails);
    
    renderWithProviders(<Invite />);
    
    await waitFor(() => {
      expect(screen.getByText('Organization Invitation')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getAllByText(/Sify/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Please log in or register with/i)).toBeInTheDocument();
    expect(screen.getByText('Login with UMS')).toBeInTheDocument();
    expect(screen.getByText('Register with UMS')).toBeInTheDocument();
  });

  it('shows authenticated with matching email state (State B)', async () => {
    (apiClient as any).mockResolvedValue(mockDetails);
    
    renderWithProviders(<Invite />, {
      preloadedState: { isAuthenticated: true, umsUserEmail: 'test@sify.com' }
    });
    
    await waitFor(() => {
      expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
    });
    expect(screen.getByText(/You will be joined using your current account/i)).toBeInTheDocument();
  });

  it('shows authenticated with mismatched email state (State C)', async () => {
    (apiClient as any).mockResolvedValue(mockDetails);
    
    renderWithProviders(<Invite />, {
      preloadedState: { isAuthenticated: true, umsUserEmail: 'wrong@sify.com' }
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Email Mismatch/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Accept Invitation')).not.toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('shows expired state (State D)', async () => {
    (apiClient as any).mockResolvedValue({
      data: { ...mockDetails.data, status: 'EXPIRED' }
    });
    
    renderWithProviders(<Invite />);
    
    await waitFor(() => {
      expect(screen.getByText('Invitation Expired')).toBeInTheDocument();
    });
  });

  it('shows cancelled state (State F)', async () => {
    (apiClient as any).mockResolvedValue({
      data: { ...mockDetails.data, status: 'CANCELLED' }
    });
    
    renderWithProviders(<Invite />);
    
    await waitFor(() => {
      expect(screen.getByText('Invitation Cancelled')).toBeInTheDocument();
    });
  });

  it('shows accepted state (State E)', async () => {
    (apiClient as any).mockResolvedValue({
      data: { ...mockDetails.data, status: 'ACCEPTED' }
    });
    
    renderWithProviders(<Invite />);
    
    await waitFor(() => {
      expect(screen.getByText('Already Accepted')).toBeInTheDocument();
    });
  });

  it('shows error on invalid token (State G)', async () => {
    (apiClient as any).mockRejectedValue(new Error('Invitation not found'));
    
    renderWithProviders(<Invite />);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid Invitation')).toBeInTheDocument();
    });
    expect(screen.getByText(/Invitation not found/i)).toBeInTheDocument();
  });
});
