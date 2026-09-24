import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { UserPreferences } from './UserPreferences';

const mockUseGetMyPreferencesQuery = vi.fn();
const mockUseUpdateMyPreferencesMutation = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../store/apiSlice', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    useGetMyPreferencesQuery: () => mockUseGetMyPreferencesQuery(),
    useUpdateMyPreferencesMutation: () => mockUseUpdateMyPreferencesMutation(),
  };
});

describe('UserPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetMyPreferencesQuery.mockReturnValue({
      data: {
        theme: 'light',
        timezone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
        emailNotifications: true,
      },
      isLoading: false,
    });
    mockUseUpdateMyPreferencesMutation.mockReturnValue([mockUpdate, { isLoading: false }]);
    mockUpdate.mockResolvedValue({ unwrap: () => Promise.resolve() });
  });

  it('renders preferences and defaults', async () => {
    render(<UserPreferences />);
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    
    // Check initial values rendered by custom Select
    expect(screen.getByText('UTC (Universal Coordinated Time)')).toBeInTheDocument();
  });

  it('updates timezone selection', async () => {
    render(<UserPreferences />);
    
    const tzButton = screen.getByText('UTC (Universal Coordinated Time)');
    fireEvent.click(tzButton);
    
    const kolkataOption = screen.getByText('Asia/Kolkata');
    fireEvent.click(kolkataOption);
    
    expect(screen.getByText('Asia/Kolkata')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).not.toBeDisabled();
  });

  it('saves correctly and handles cancel', async () => {
    render(<UserPreferences />);
    
    const dateButton = screen.getByText('DD/MM/YYYY (e.g. 31/12/2026)');
    fireEvent.click(dateButton);
    
    const isoOption = screen.getByText('YYYY-MM-DD (e.g. 2026-12-31)');
    fireEvent.click(isoOption);
    
    expect(screen.getByRole('button', { name: /Save Changes/i })).not.toBeDisabled();
    
    // Cancel
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
    
    // Save
    fireEvent.click(screen.getByText('DD/MM/YYYY (e.g. 31/12/2026)'));
    fireEvent.click(screen.getByText('YYYY-MM-DD (e.g. 2026-12-31)'));
    
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        dateFormat: 'YYYY-MM-DD',
      }));
    });
  });
});
