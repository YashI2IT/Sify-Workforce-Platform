import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function Select({ options, value, onChange, placeholder = 'Select...', className = '' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950 focus:border-transparent bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
      >
        <span className="truncate font-medium">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-2 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 w-full min-w-[140px] mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1">
          <div className="max-h-60 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  value === opt.value ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-600 font-medium'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
