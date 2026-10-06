import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Select } from './Select';

// Mock createPortal to render inline (jsdom doesn't support real portals well)
vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

const OPTIONS = [
  { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
];

// Deterministic getBoundingClientRect for position tests
function mockTriggerRect(overrides: Partial<DOMRect> = {}) {
  const base: DOMRect = {
    top: 200, bottom: 230, left: 100, right: 400,
    width: 300, height: 30, x: 100, y: 200,
    toJSON: () => ({}),
    ...overrides,
  };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(base);
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  Object.defineProperty(window, 'innerWidth',  { value: 1200, configurable: true });
}

describe('Select', () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
    mockTriggerRect();
  });

  // 1. Trigger renders selected value
  it('renders the selected value in the trigger', () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} />);
    expect(screen.getByRole('button', { name: /UTC/i })).toBeInTheDocument();
  });

  // 2. Clicking trigger opens menu
  it('opens menu on trigger click', () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  // 3. aria-expanded becomes true
  it('sets aria-expanded=true when open', () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: /UTC/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  // 4. Menu has role=listbox
  it('menu has role=listbox', () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  // 5. Options have role=option
  it('options have role=option', () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
    const opts = screen.getAllByRole('option');
    expect(opts.length).toBe(OPTIONS.length);
  });

  // 6. Selected option has aria-selected=true
  it('selected option has aria-selected=true', () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
    const selectedOpt = screen.getAllByRole('option').find(
      o => o.getAttribute('aria-selected') === 'true'
    );
    expect(selectedOpt).toBeTruthy();
    expect(selectedOpt!.textContent).toContain('UTC');
  });

  // 7. Clicking an option calls onChange
  it('calls onChange when an option is clicked', () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
    fireEvent.click(screen.getByText('Asia/Kolkata'));
    expect(onChange).toHaveBeenCalledWith('Asia/Kolkata');
  });

  // 8. Menu closes after option selection
  it('closes menu after option selection', async () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
    fireEvent.click(screen.getByText('Asia/Kolkata'));
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  // 9. Clicking outside closes menu
  it('closes menu when clicking outside', async () => {
    render(
      <div>
        <Select options={OPTIONS} value="UTC" onChange={onChange} />
        <div data-testid="outside">Outside</div>
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  // 10. Escape closes menu
  it('closes menu on Escape key', async () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  // 11. Menu uses the open animation class
  it('applies an animation class when menu opens', () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
    const menu = screen.getByRole('listbox');
    const hasAnim =
      menu.classList.contains('animate-selectDropdownDown') ||
      menu.classList.contains('animate-selectDropdownUp');
    expect(hasAnim).toBe(true);
  });

  // 12. placement="top" — with enough space above, should produce upward animation
  it('uses upward animation when placement=top and space above exists', () => {
    // Trigger at y=400 → 400px space above
    mockTriggerRect({ top: 400, bottom: 430, left: 100, right: 400, width: 300, height: 30, x: 100, y: 400 });
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} placement="top" />);
    fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
    const listbox = screen.getByRole('listbox');
    expect(listbox.classList.contains('animate-selectDropdownUp')).toBe(true);
    expect(listbox.style.bottom).toBeTruthy();
  });

  // 13. placement="bottom" — should always produce downward animation
  it('uses downward animation when placement=bottom', () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} placement="bottom" />);
    fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
    expect(screen.getByRole('listbox').classList.contains('animate-selectDropdownDown')).toBe(true);
  });

  // 14. auto placement behaves safely (opens without error)
  it('auto placement opens menu without error', () => {
    expect(() => {
      render(<Select options={OPTIONS} value="UTC" onChange={onChange} placement="auto" />);
      fireEvent.click(screen.getByRole('button', { name: /UTC/i }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    }).not.toThrow();
  });

  // 15. Trigger regains focus after Escape
  it('restores focus to trigger after Escape', async () => {
    render(<Select options={OPTIONS} value="UTC" onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: /UTC/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});
