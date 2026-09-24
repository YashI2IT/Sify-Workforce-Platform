import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday 
} from 'date-fns';

interface DatePickerProps {
  value: string | null | undefined;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  isOverdue?: boolean;
}

export function DatePicker({ value, onChange, placeholder = 'mm/dd/yyyy', className = '', isOverdue = false }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
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

  const selectedDate = value ? new Date(value) : null;

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => {
          if (!open && value) setCurrentMonth(new Date(value));
          setOpen(!open);
        }}
        className={`w-full flex items-center justify-between text-xs px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-950 focus:border-transparent transition-colors shadow-2xs ${
          isOverdue ? 'border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
        }`}
      >
        <span className={selectedDate ? (isOverdue ? 'font-bold' : 'font-medium text-slate-900') : 'text-slate-400 font-medium'}>
          {selectedDate ? format(selectedDate, 'MMM d, yyyy') : placeholder}
        </span>
        <CalendarIcon className={`w-3.5 h-3.5 shrink-0 ml-2 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 w-[260px] left-auto right-0">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-900 tracking-tight">{format(currentMonth, 'MMMM yyyy')}</span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map(d => (
              <div key={d} className="text-[10px] font-bold text-slate-400 text-center py-1">
                {d}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              
              return (
                <button
                  key={day.toString()}
                  type="button"
                  onClick={() => {
                    const yyyy = day.getFullYear();
                    const mm = String(day.getMonth() + 1).padStart(2, '0');
                    const dd = String(day.getDate()).padStart(2, '0');
                    onChange(`${yyyy}-${mm}-${dd}`);
                    setOpen(false);
                  }}
                  className={`
                    w-7 h-7 mx-auto rounded-lg text-[11px] flex items-center justify-center transition-all
                    ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                    ${isSelected ? 'bg-slate-950 text-white font-bold shadow-xs' : 'hover:bg-slate-100'}
                    ${today && !isSelected ? 'border border-slate-200 font-bold text-blue-600 bg-blue-50' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
