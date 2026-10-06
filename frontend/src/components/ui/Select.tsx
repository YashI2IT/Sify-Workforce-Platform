import { useState, useRef, useEffect, useLayoutEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MenuPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'top' | 'bottom';
}

interface SelectProps {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md';
  placement?: 'auto' | 'top' | 'bottom';
  disabled?: boolean;
  id?: string;
  name?: string;
  ariaLabel?: string;
}

const MENU_MARGIN = 6;      // px gap between trigger and menu
const VIEWPORT_PADDING = 8; // px clearance from viewport edges
const MIN_MENU_HEIGHT = 80; // px minimum menu height to be useful

function calcPosition(
  trigger: HTMLButtonElement,
  preferredPlacement: 'auto' | 'top' | 'bottom',
  optionsCount: number = 5,
  size: 'sm' | 'md' = 'sm'
): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spaceBelow = vh - rect.bottom - MENU_MARGIN - VIEWPORT_PADDING;
  const spaceAbove = rect.top - MENU_MARGIN - VIEWPORT_PADDING;

  const estimatedMenuHeight = Math.min(260, optionsCount * (size === 'md' ? 44 : 34) + 16);

  let resolved: 'top' | 'bottom';
  if (preferredPlacement === 'bottom') {
    resolved = 'bottom';
  } else if (preferredPlacement === 'top') {
    resolved = spaceAbove >= MIN_MENU_HEIGHT ? 'top' : 'bottom';
  } else {
    // auto: if space below can fit the menu comfortably, prefer bottom.
    // Otherwise, if space above has more room, flip to top!
    if (spaceBelow >= estimatedMenuHeight) {
      resolved = 'bottom';
    } else if (spaceAbove > spaceBelow) {
      resolved = 'top';
    } else {
      resolved = 'bottom';
    }
  }

  const availableSpace = resolved === 'bottom' ? spaceBelow : spaceAbove;
  const maxHeight = Math.max(MIN_MENU_HEIGHT, Math.min(260, availableSpace));

  // Horizontal: align left edge of menu to trigger, clamp to viewport
  let left = rect.left;
  const menuWidth = rect.width;
  if (left + menuWidth > vw - VIEWPORT_PADDING) {
    left = vw - menuWidth - VIEWPORT_PADDING;
  }
  left = Math.max(VIEWPORT_PADDING, left);

  if (resolved === 'bottom') {
    const top = rect.bottom + MENU_MARGIN;
    return { top, left, width: rect.width, maxHeight, placement: 'bottom' };
  } else {
    const bottom = vh - rect.top + MENU_MARGIN;
    return { bottom, left, width: rect.width, maxHeight, placement: 'top' };
  }
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  triggerClassName = '',
  size = 'sm',
  placement = 'auto',
  disabled = false,
  id,
  name,
  ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const selectedOption = options.find(o => o.value === value);

  // ── Position calculation ──────────────────────────────────────
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      setMenuPos(calcPosition(triggerRef.current, placement, options.length, size));
    }
  }, [placement, options.length, size]);

  // Re-calculate on open via useLayoutEffect (before paint)
  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  // Keep in sync during scroll / resize
  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, { capture: true });
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updatePosition]);

  // ── Click outside ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = triggerRef.current?.contains(target);
      const inMenu = menuRef.current?.contains(target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // ── Escape key ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const animClass = menuPos?.placement === 'top'
    ? 'animate-selectDropdownUp'
    : 'animate-selectDropdownDown';

  const menuStyle: React.CSSProperties = menuPos
    ? menuPos.placement === 'bottom'
      ? { position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 9999 }
      : { position: 'fixed', bottom: menuPos.bottom, left: menuPos.left, width: menuPos.width, zIndex: 9999 }
    : { display: 'none' };

  const defaultTriggerClasses = size === 'md'
    ? `w-full h-11 flex items-center justify-between text-sm px-3.5 border rounded-xl bg-white text-slate-900 transition-all shadow-2xs font-medium cursor-pointer ${
        open
          ? 'border-slate-900 ring-2 ring-slate-950/15'
          : 'border-slate-200/90 hover:border-slate-300'
      }`
    : `w-full flex items-center justify-between text-xs px-3 py-2 border rounded-xl bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer ${
        open
          ? 'border-slate-900 ring-2 ring-slate-950 focus:ring-2 focus:ring-slate-950'
          : 'border-slate-200 focus:ring-2 focus:ring-slate-950 focus:border-transparent'
      }`;

  return (
    <div className={`relative ${className}`}>
      {/* Hidden native select for form accessibility and automated test compatibility */}
      {(id || name || ariaLabel) && (
        <select
          id={id}
          name={name}
          aria-label={ariaLabel}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          tabIndex={-1}
          className="sr-only"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        id={`${menuId}-trigger`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => !disabled && setOpen(prev => !prev)}
        className={triggerClassName ? `${defaultTriggerClasses} ${triggerClassName}` : defaultTriggerClasses}
      >
        <span className="truncate font-medium">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          className={`${
            size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'
          } text-slate-400 ml-2 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-slate-700' : 'rotate-0'
          }`}
        />
      </button>

      {/* Portaled Menu */}
      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="listbox"
          aria-label="Options"
          style={menuStyle}
          className={`bg-white border border-slate-200/90 rounded-xl shadow-xl shadow-slate-900/10 overflow-hidden py-1 ${animClass}`}
        >
          <div style={{ maxHeight: menuPos.maxHeight }} className="overflow-y-auto space-y-0.5">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={value === opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`mx-1 w-[calc(100%-8px)] text-left rounded-lg transition-colors cursor-pointer flex items-center justify-between focus:outline-none ${
                  size === 'md' ? 'px-3.5 py-2.5 text-sm font-medium' : 'px-3 py-2 text-xs font-medium'
                } ${
                  value === opt.value
                    ? 'bg-slate-100 font-bold text-slate-950'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && (
                  <Check className={`${size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-slate-900 shrink-0 ml-2`} />
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
