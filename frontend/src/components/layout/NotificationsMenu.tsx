import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  MessageSquare, 
  Briefcase, 
  AlertCircle, 
  Check, 
  Clock 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  useGetMyNotificationsQuery, 
  useMarkNotificationAsReadMutation, 
  useMarkAllNotificationsAsReadMutation 
} from '../../store/apiSlice';
import { authStorage } from '../../lib/authUtils';

import { resolveNotificationDestination } from '../../utils/notificationNavigation';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  destination?: string;
}

/**
 * Format date to relative time (e.g., "Just now", "15m ago", "2h ago", "Yesterday")
 * or concise formatted date (e.g., "Oct 15").
 */
export const formatNotificationDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format notification message text, replacing any raw ISO datetime strings
 * with human-readable dates (e.g., "2026-10-12T00:00:00Z" -> "Oct 12, 2026").
 */
export const formatNotificationMessage = (message?: string): string => {
  if (!message) return '';
  return message.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/gi, (match) => {
    try {
      const d = new Date(match);
      if (isNaN(d.getTime())) return match;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return match;
    }
  });
};

export const NotificationsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { employee } = useCurrentEmployee();
  const userRole = employee?.role || employee?.roles?.[0];

  const token = authStorage.getAccessToken();
  const { 
    data: notifications = [], 
    isLoading, 
    isError 
  } = useGetMyNotificationsQuery(undefined, { 
    pollingInterval: 30000,
    skip: !token
  });

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsAsReadMutation();

  const unreadCount = notifications.filter((n: NotificationItem) => !n.isRead).length;

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

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (navigatingId === notification.id) return;
    setNavigatingId(notification.id);

    try {
      if (!notification.isRead) {
        await markAsRead(notification.id).unwrap();
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    } finally {
      closeDropdown();
      const destination = resolveNotificationDestination(notification, userRole);
      navigate(destination);
      setNavigatingId(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_STATUS_CHANGED':
      case 'DEPENDENCY_ADDED':
      case 'DEPENDENCY_REMOVED':
        return <Briefcase className="w-3.5 h-3.5 text-indigo-600" />;
      case 'COMMENT_ADDED':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case 'COMMENT_MENTION':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-600" />;
      case 'PROJECT_ASSIGNED':
      case 'PROJECT_UNASSIGNED':
      case 'PROJECT_UPDATE':
        return <Briefcase className="w-3.5 h-3.5 text-cyan-600" />;
      case 'TIMESHEET_APPROVED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'TIMESHEET_REJECTED':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'TIMESHEET_RESUBMITTED':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'TIMESHEET_SUBMITTED':
      case 'TIMESHEET_REMINDER':
        return <Clock className="w-3.5 h-3.5 text-blue-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className={`relative flex items-center justify-center w-8 h-8 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1738]/20 ${
          isOpen ? 'ring-2 ring-[#0B1738]/15 border-slate-300 bg-slate-50' : ''
        }`}
      >
        <Bell className="w-4 h-4 text-[#0B1738]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span 
            className="absolute top-1 right-1 w-2 h-2 bg-[#f43f5e] rounded-full ring-2 ring-white" 
            aria-hidden="true" 
          />
        )}
      </button>

      {/* Floating Notification Panel */}
      {isOpen && (
        <div 
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 mt-2 w-[320px] sm:w-[340px] max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-xl border border-slate-200/90 overflow-hidden z-50 animate-dropdown"
        >
          {/* Fixed Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-white/95 backdrop-blur-xs">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-[13px] text-[#0B1738] tracking-tight">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10.5px] font-bold font-sans bg-blue-50 text-blue-600 border border-blue-100 leading-none">
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
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 select-none active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                title="Mark all notifications as read"
              >
                {isMarkingAll ? (
                  <>
                    <span className="w-2.5 h-2.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Marking...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                    <span>Mark all read</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-[11px] font-medium text-slate-400">
                All caught up
              </span>
            )}
          </div>

          {/* Body Content */}
          <div className="max-h-[320px] sm:max-h-[350px] overflow-y-auto overscroll-contain">
            {/* Loading State */}
            {isLoading && (
              <div className="p-3 space-y-2" aria-busy="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-2.5 p-1.5 animate-pulse">
                    <div className="w-6 h-6 rounded-md bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-1.5 py-0.5">
                      <div className="h-3 bg-slate-100 rounded w-2/3" />
                      <div className="h-2.5 bg-slate-50 rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoading && isError && (
              <div className="px-4 py-8 text-center flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-2">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <p className="text-[12.5px] font-semibold text-[#0B1738] mb-0.5">
                  Failed to load notifications
                </p>
                <p className="text-[11px] text-slate-400 max-w-[220px]">
                  Please check your connection or try again later.
                </p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && notifications.length === 0 && (
              <div className="px-4 py-8 text-center flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-2 text-slate-300">
                  <Bell className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <p className="text-[12.5px] font-semibold text-[#0B1738] mb-0.5">
                  No notifications
                </p>
                <p className="text-[11px] text-slate-400">
                  You're all caught up for now!
                </p>
              </div>
            )}

            {/* Notifications List */}
            {!isLoading && !isError && notifications.length > 0 && (
              <div className="divide-y divide-slate-100/80">
                {notifications.map((n: NotificationItem) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-slate-50/80 transition-colors flex items-start gap-2.5 cursor-pointer focus:outline-none focus:bg-slate-50 group relative ${
                      !n.isRead ? 'bg-blue-50/20' : 'bg-white'
                    }`}
                  >
                    {/* Icon circular badge */}
                    <div 
                      className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                        !n.isRead 
                          ? 'bg-white border-slate-200/80 shadow-2xs' 
                          : 'bg-slate-50/80 border-slate-100'
                      }`}
                    >
                      {getIcon(n.type)}
                    </div>

                    {/* Content details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <p className={`text-[12px] truncate ${
                          !n.isRead ? 'font-bold text-[#0B1738]' : 'font-semibold text-slate-700'
                        }`}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!n.isRead && (
                            <span 
                              className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" 
                              title="Unread" 
                              aria-label="Unread"
                            />
                          )}
                          <span className="text-[10.5px] text-slate-400 font-sans whitespace-nowrap">
                            {formatNotificationDate(n.createdAt)}
                          </span>
                        </div>
                      </div>
                      <p className={`text-[11.5px] line-clamp-2 leading-relaxed font-sans ${
                        !n.isRead ? 'text-slate-600' : 'text-slate-500'
                      }`}>
                        {formatNotificationMessage(n.message)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
