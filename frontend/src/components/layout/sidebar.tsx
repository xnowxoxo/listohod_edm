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

const mainNav = [
  { href: '/dashboard', label: 'Главная', icon: LayoutDashboard },
  { href: '/documents', label: 'Документы', icon: FileText },
  { href: '/archive', label: 'Архив', icon: Archive },
];

const secondaryNav = [
  { href: '/notifications', label: 'Уведомления', icon: Bell, isNotif: true },
];

const adminNav = [
  { href: '/users', label: 'Пользователи', icon: Users },
];

function NavItem({
  href, label, icon: Icon, active, badge,
}: { href: string; label: string; icon: React.ElementType; active: boolean; badge?: number }) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-lg',
        active
          ? 'bg-white/10 text-white'
          : 'text-stone-400 hover:text-stone-200 hover:bg-white/5',
      )}
    >
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-teal-400 rounded-r-full" />
      )}
      <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-teal-400' : 'text-stone-500')} />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0 min-w-[18px] text-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

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
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="w-56 flex-shrink-0 bg-stone-900 flex flex-col h-screen sticky top-0">

      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5 flex-shrink-0">
        <div className="w-8 h-8 bg-teal-500/20 border border-teal-400/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-teal-400" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-white leading-tight truncate">StemAcademia</p>
          <p className="text-[10px] text-stone-500 leading-tight">Документооборот</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNav.map((item) => (
          <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(item.href)} />
        ))}

        {/* Divider */}
        <div className="my-3 border-t border-white/5" />

        {secondaryNav.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
            badge={item.isNotif ? unreadCount : undefined}
          />
        ))}
        {user?.role === 'ADMIN' && adminNav.map((item) => (
          <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(item.href)} />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/5 p-3 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-[11px] font-bold text-teal-400 flex-shrink-0">
            {getInitials(user?.firstName, user?.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-200 truncate leading-tight">{getFullName(user)}</p>
            <p className="text-[10px] text-stone-500 truncate leading-tight">
              {user?.role ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 text-sm w-full text-stone-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
