import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, MessageSquare, Briefcase, AlertCircle, Check, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetMyNotificationsQuery, useMarkNotificationAsReadMutation, useMarkAllNotificationsAsReadMutation } from '../../store/apiSlice';

export const NotificationsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const { data: notifications = [] } = useGetMyNotificationsQuery(undefined, { pollingInterval: 30000 });
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllRead] = useMarkAllNotificationsAsReadMutation();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification.id).unwrap();
    }
    setIsOpen(false);
    
    // Navigate based on type/related entity
    if (notification.relatedEntityType === 'TASK' || notification.type === 'TASK_ASSIGNED' || notification.type === 'COMMENT_ADDED') {
      navigate(`/projects`);
    } else if (notification.relatedEntityType === 'TIMESHEET' || notification.type.includes('TIMESHEET')) {
      navigate(`/timesheets`);
    }
  };

  const getIcon = (type: string) => {
    if (type === 'TASK_ASSIGNED') return <Briefcase className="w-4 h-4 text-indigo-500" />;
    if (type === 'COMMENT_ADDED') return <MessageSquare className="w-4 h-4 text-emerald-500" />;
    if (type === 'TIMESHEET_APPROVED') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (type === 'TIMESHEET_REJECTED') return <AlertCircle className="w-4 h-4 text-rose-500" />;
    if (type === 'TIMESHEET_RESUBMITTED') return <Clock className="w-4 h-4 text-amber-500" />;
    return <Bell className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200/60 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead().unwrap()}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center flex flex-col items-center">
                <Bell className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500 font-medium">No notifications</p>
                <p className="text-xs text-slate-400">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 ${!n.isRead ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-white shadow-sm ring-1 ring-slate-200/60' : 'bg-slate-100'}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className={`text-sm truncate pr-2 ${!n.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap shrink-0 mt-0.5">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-xs line-clamp-2 ${!n.isRead ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                        {n.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
