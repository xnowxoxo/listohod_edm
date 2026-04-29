'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText, LayoutDashboard, Users,
  LogOut, Archive, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { getInitials, getFullName } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const navItems = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/documents', label: 'Документы', icon: FileText },
  { href: '/archive', label: 'Архив', icon: Archive },
  { href: '/notifications', label: 'Уведомления', icon: Bell },
  { href: '/users', label: 'Пользователи', icon: Users, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => (await api.get('/notifications/unread-count')).data,
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const unreadCount = unreadData?.count ?? 0;

  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      {/* Logo */}
      <div className="h-12 flex items-center gap-2.5 px-4 border-b border-slate-800 flex-shrink-0">
        <div className="w-5 h-5 bg-blue-500 flex items-center justify-center flex-shrink-0">
          <FileText className="w-3 h-3 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-white leading-tight tracking-tight truncate">StemAcademia</p>
          <p className="text-[10px] text-slate-500 leading-tight">Документооборот</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-px overflow-y-auto">
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== 'ADMIN') return null;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const isNotif = item.href === '/notifications';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors rounded-sm',
                active
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60',
              )}
            >
              <item.icon className={cn('w-4 h-4 flex-shrink-0', active && 'text-blue-400')} />
              <span className="flex-1 truncate">{item.label}</span>
              {isNotif && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-800 p-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-6 h-6 bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200 flex-shrink-0 rounded-sm">
            {getInitials(user?.firstName, user?.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate leading-tight">{getFullName(user)}</p>
            <p className="text-[10px] text-slate-500 truncate leading-tight">
              {user?.role ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium w-full text-slate-500 hover:text-red-400 hover:bg-slate-800/60 rounded-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
