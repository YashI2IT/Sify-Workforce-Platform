import { useState, useRef, useEffect, useCallback } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';

export interface UserProfileMenuProps {
  employee?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    roles?: string[];
    employeeCode?: string;
  } | null;
  onOpenProfileModal: () => void;
  onLogout: () => void;
}

export const getInitials = (name?: string): string => {
  if (!name) return 'SW';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const UserProfileMenu = ({
  employee,
  onOpenProfileModal,
  onLogout,
}: UserProfileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDropdown();
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeDropdown]);

  const fullName = employee?.name || 'User';
  const roleName = employee?.role || employee?.roles?.[0] || 'EMPLOYEE';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Pill Button: clearly displays full name and avatar */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`User menu for ${fullName}`}
        className={`flex items-center gap-2 pl-1.5 pr-3 h-9 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1738]/20 shadow-2xs ${
          isOpen ? 'ring-2 ring-[#0B1738]/15 border-slate-300 bg-slate-50' : ''
        }`}
      >
        <div className="w-6.5 h-6.5 rounded-full bg-[#0B1738] text-white font-sans font-bold text-[10.5px] flex items-center justify-center tracking-wider shrink-0 select-none shadow-2xs">
          {getInitials(employee?.name)}
        </div>
        <span className="font-semibold text-[#0B1738] font-sans text-[13px] leading-normal select-none truncate max-w-[150px] sm:max-w-none py-0.5">
          {fullName}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
      </button>

      {/* Floating Profile Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label="User profile menu"
          className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] bg-white border border-slate-200/90 rounded-xl shadow-xl z-50 overflow-hidden animate-dropdown"
        >
          {/* Top Identity Section: Prominent, high-contrast user profile identity */}
          <div className="px-3.5 py-3 border-b border-slate-100 bg-[#F7F8FA]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0B1738] text-white font-sans font-bold text-xs flex items-center justify-center tracking-wider shrink-0 select-none shadow-2xs ring-2 ring-white">
                {getInitials(employee?.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-slate-900 truncate leading-snug">
                  {fullName}
                </p>
                {employee?.email && (
                  <p className="text-[11.5px] text-slate-500 truncate mt-0.5 leading-tight">
                    {employee.email}
                  </p>
                )}
              </div>
            </div>

            {/* Role badge and Employee Code */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 font-sans">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-wider bg-slate-200/80 text-slate-700">
                {roleName}
              </span>
              {employee?.employeeCode && (
                <span className="text-[11px] font-sans font-medium text-slate-500 truncate">
                  {employee.employeeCode}
                </span>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="py-1 font-sans">
            <button
              type="button"
              onClick={() => {
                closeDropdown();
                onOpenProfileModal();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12.5px] font-medium text-slate-700 hover:text-[#0B1738] hover:bg-slate-50 transition-colors cursor-pointer group focus:outline-none focus:bg-slate-50 font-sans"
            >
              <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0B1738] transition-colors shrink-0" />
              <span>Profile Settings</span>
            </button>
          </div>

          {/* Sign Out Action */}
          <div className="border-t border-slate-100 p-1 font-sans">
            <button
              type="button"
              onClick={() => {
                closeDropdown();
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 transition-colors cursor-pointer group focus:outline-none focus:bg-rose-50 font-sans"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500 group-hover:text-rose-600 transition-colors shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
