import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, MessageSquare, Briefcase, AlertCircle, Check, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetMyNotificationsQuery, useMarkNotificationAsReadMutation, useMarkAllNotificationsAsReadMutation } from '../../store/apiSlice';
import { authStorage } from '../../lib/authUtils';

export const NotificationsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const token = authStorage.getAccessToken();
  const { data: notifications = [] } = useGetMyNotificationsQuery(undefined, { 
    pollingInterval: 30000,
    skip: !token
  });
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsAsReadMutation();

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

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMarkingAll || unreadCount === 0) return;
    try {
      await markAllRead().unwrap();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id).unwrap();
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    setIsOpen(false);
    
    // Navigate based on type/related entity
    if (notification.relatedEntityType === 'TASK' || notification.type === 'TASK_ASSIGNED' || notification.type === 'COMMENT_ADDED' || notification.type === 'COMMENT_MENTION') {
      const parts = notification.relatedEntityId?.split(':') || [];
      if (parts.length === 2) {
        navigate(`/projects/${parts[0]}?taskId=${parts[1]}`);
      } else {
        navigate(`/projects`);
      }
    } else if (notification.relatedEntityType === 'TIMESHEET' || notification.type.includes('TIMESHEET')) {
      navigate(`/timesheets`);
    }
  };

  const getIcon = (type: string) => {
    if (type === 'TASK_ASSIGNED') return <Briefcase className="w-4 h-4 text-indigo-500" />;
    if (type === 'COMMENT_ADDED') return <MessageSquare className="w-4 h-4 text-emerald-500" />;
    if (type === 'COMMENT_MENTION') return <MessageSquare className="w-4 h-4 text-indigo-600" />;
    if (type === 'TIMESHEET_APPROVED') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (type === 'TIMESHEET_REJECTED') return <AlertCircle className="w-4 h-4 text-rose-500" />;
    if (type === 'TIMESHEET_RESUBMITTED') return <Clock className="w-4 h-4 text-amber-500" />;
    return <Bell className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center w-[36px] h-[36px] sm:w-[38px] sm:h-[38px] bg-white hover:bg-slate-50 border border-[#e2e8f0] rounded-full transition-colors cursor-pointer focus:outline-none ${isOpen ? 'ring-2 ring-[#12161F]/10' : ''}`}
        aria-label="Notifications"
      >
        <Bell className={`w-[18px] h-[18px] sm:w-[19px] sm:h-[19px] text-[#12161F]`} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-[7px] right-[8px] w-[8px] h-[8px] bg-[#fb3b67] rounded-full ring-2 ring-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-dropdown">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono bg-rose-50 text-rose-600 border border-rose-200/80">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                id="mark-all-read-btn"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/80 px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 select-none active:scale-[0.96]"
                title="Mark all notifications as read"
              >
                {isMarkingAll ? (
                  <>
                    <span className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Marking...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3 shrink-0" />
                    <span>Mark all read</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-[11px] font-medium text-slate-400">All caught up</span>
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
                      <div className="flex justify-between items-start mb-0.5 gap-2">
                        <p className={`text-sm truncate pr-2 ${!n.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600" title="Unread" />
                          )}
                          <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
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
