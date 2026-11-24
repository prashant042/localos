'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Bell,
  LogOut,
  Building,
  User,
  CheckCircle2,
  Receipt,
  AlertCircle,
  Megaphone,
  ShieldCheck,
  Check,
  X,
  Clock,
} from 'lucide-react';
import { AuthUser } from '@localos/types';
import { formatDate } from '@localos/utils';

interface AppNavbarProps {
  user: AuthUser;
  unreadCount?: number;
  onLogout?: () => void;
}

export function AppNavbar({ user, unreadCount: initialUnreadCount = 0, onLogout }: AppNavbarProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch('/api/v1/notifications');
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/v1/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await fetch('/api/v1/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: notification.id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (e) {}
    }

    setShowNotifications(false);

    // Route depending on user role and notification type
    const isAdmin =
      user.role === 'SOCIETY_ADMIN' ||
      user.role === 'COMMITTEE_MEMBER' ||
      user.role === 'ACCOUNTANT';
    const type = notification.type || '';

    if (type.includes('INVOICE') || type.includes('PAYMENT')) {
      router.push(isAdmin ? '/society-admin/billing' : '/dues');
    } else if (type.includes('COMPLAINT')) {
      router.push(isAdmin ? '/society-admin/complaints' : '/complaints');
    } else if (type.includes('VISITOR')) {
      router.push(isAdmin ? '/society-admin/visitors' : '/visitors');
    } else if (type.includes('NOTICE')) {
      router.push(isAdmin ? '/society-admin/notices' : '/notices');
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('INVOICE') || type.includes('PAYMENT')) {
      return <Receipt className="w-4 h-4 text-emerald-600" />;
    }
    if (type.includes('COMPLAINT')) {
      return <AlertCircle className="w-4 h-4 text-rose-600" />;
    }
    if (type.includes('VISITOR')) {
      return <ShieldCheck className="w-4 h-4 text-brand-600" />;
    }
    if (type.includes('NOTICE')) {
      return <Megaphone className="w-4 h-4 text-amber-600" />;
    }
    return <Bell className="w-4 h-4 text-slate-500" />;
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
      if (onLogout) onLogout();
      router.push('/login');
    } catch (e) {
      router.push('/login');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SOCIETY_ADMIN':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'COMMITTEE_MEMBER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'GUARD':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'TENANT':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Society Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight text-slate-900 leading-none">
                  Local<span className="text-brand-600">OS</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  Society Operating System
                </span>
              </div>
            </Link>

            {user.societyName && (
              <div className="hidden md:flex items-center pl-4 border-l border-slate-200 text-sm font-semibold text-slate-700">
                <Building className="w-4 h-4 mr-1.5 text-brand-600" />
                <span>{user.societyName}</span>
                <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  {user.societyCode}
                </span>
              </div>
            )}
          </div>

          {/* Right Action Icons & User Dropdown */}
          <div className="flex items-center space-x-3">
            {/* Role Badge */}
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getRoleBadge(
                user.role
              )}`}
            >
              {user.role.replace('_', ' ')}
            </span>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleToggleNotifications}
                className={`p-2 rounded-full transition-colors relative ${
                  showNotifications
                    ? 'bg-brand-50 text-brand-600 ring-2 ring-brand-500/20'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popup Menu */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Header */}
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-bold rounded-full">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Body list */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {loadingNotifications ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">All caught up!</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          No new notifications at this time.
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                            !n.isRead ? 'bg-brand-50/30' : ''
                          }`}
                        >
                          <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                            {getNotificationIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4
                                className={`text-xs truncate ${
                                  !n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                                }`}
                              >
                                {n.title}
                              </h4>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                              {n.message}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(n.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex justify-center">
                    <span className="text-[11px] text-slate-400 font-medium">
                      LocalOS Real-Time Alert System
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center space-x-2 pl-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs">
                {user.fullName.charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">+91 {user.phone}</span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
