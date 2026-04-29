'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Notification, PaginatedResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Bell, CheckCheck, CheckCircle, XCircle, RotateCcw,
  FileText, Pen, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';

const NOTIF_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  APPROVAL_REQUIRED:     { label: 'Требуется согласование', icon: Bell,         color: 'text-blue-600' },
  DOCUMENT_APPROVED:     { label: 'Документ согласован',    icon: CheckCircle,   color: 'text-emerald-600' },
  DOCUMENT_REJECTED:     { label: 'Документ отклонён',      icon: XCircle,       color: 'text-red-500' },
  DOCUMENT_NEEDS_REVISION:{ label: 'Возврат на доработку',  icon: RotateCcw,     color: 'text-orange-500' },
  DOCUMENT_RESUBMITTED:  { label: 'Повторно отправлен',     icon: RefreshCw,     color: 'text-blue-500' },
  DOCUMENT_SIGNED:       { label: 'Документ подписан',      icon: Pen,           color: 'text-emerald-700' },
};

const DEFAULT_CONFIG = { label: 'Уведомление', icon: FileText, color: 'text-muted-foreground' };

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Notification>>({
    queryKey: ['notifications', page],
    queryFn: async () => (await api.get(`/notifications?page=${page}&limit=20`)).data,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const handleClick = (notif: Notification) => {
    if (!notif.isRead) markReadMutation.mutate(notif.id);
    if (notif.document) router.push(`/documents/${notif.document.id}`);
  };

  const unreadCount = data?.items.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-muted-foreground" />
            Уведомления
          </h1>
          <p className="text-muted-foreground text-sm">
            {data?.total != null ? `${data.total} уведомлений` : ''}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="w-4 h-4" />
            Прочитать все
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-4 animate-pulse flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-56" />
                    <div className="h-3 bg-muted rounded w-36" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data?.items.length ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Bell className="w-10 h-10 opacity-30" />
              <p>Нет уведомлений</p>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {data.items.map((notif) => {
                  const cfg = NOTIF_CONFIG[notif.type] ?? DEFAULT_CONFIG;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className={cn(
                        'flex items-start gap-3 px-5 py-4 transition-colors',
                        notif.document ? 'cursor-pointer hover:bg-muted/40' : '',
                        !notif.isRead ? 'bg-blue-50/50' : '',
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                        !notif.isRead ? 'bg-white shadow-sm' : 'bg-muted/50',
                      )}>
                        <Icon className={cn('w-4 h-4', cfg.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn('text-sm', !notif.isRead ? 'font-semibold' : 'font-medium')}>
                              {notif.title}
                            </p>
                            {notif.body && (
                              <p className="text-sm text-muted-foreground truncate mt-0.5">
                                {notif.body}
                              </p>
                            )}
                            {notif.document && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {notif.document.number} · {DOCUMENT_TYPE_LABELS[notif.document.type] ?? notif.document.type}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-2 mt-0.5">
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateTime(notif.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {data.pages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Страница {data.page} из {data.pages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
