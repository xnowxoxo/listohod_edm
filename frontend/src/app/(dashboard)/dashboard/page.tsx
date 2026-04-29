'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DashboardStats, MyTask, ActivityItem } from '@/types';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, Users, CheckCircle, Clock,
  Plus, ChevronRight, Activity, Inbox,
} from 'lucide-react';
import { formatDate, getFullName } from '@/lib/utils';
import {
  DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS,
} from '@/lib/constants';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { CreateDocumentDialog } from '@/components/documents/create-document-dialog';
import { buttonVariants } from '@/components/ui/button';

const CHART_COLORS = ['#3b5fc0', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#6b7280'];

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'создал документ',
  UPDATED: 'обновил документ',
  STATUS_CHANGED: 'изменил статус',
};


export default function DashboardPage() {
  const { user } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = !!user;

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard/stats')).data,
  });

  const { data: tasksData } = useQuery<{ items: MyTask[]; total: number }>({
    queryKey: ['my-tasks'],
    queryFn: async () => (await api.get('/dashboard/my-tasks')).data,
    enabled: !!user,
  });

  const { data: activityData } = useQuery<{ items: ActivityItem[] }>({
    queryKey: ['dashboard-activity'],
    queryFn: async () => (await api.get('/dashboard/activity')).data,
    enabled: !!user,
  });

  const tasks = tasksData?.items ?? [];
  const taskCount = tasksData?.total ?? 0;
  const activities = activityData?.items ?? [];

  const statusData = Object.entries(stats?.byStatus || {}).map(([k, v]) => ({
    name: DOCUMENT_STATUS_LABELS[k] || k,
    value: v,
    key: k,
  }));

  const typeData = Object.entries(stats?.byType || {}).map(([k, v]) => ({
    name: DOCUMENT_TYPE_LABELS[k] || k,
    value: v,
  }));

  const statCards = [
    {
      label: 'Документов',
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
      color: 'text-blue-600',
      accent: 'border-l-blue-500',
      href: '/documents',
    },
    {
      label: 'На согласовании',
      value: stats?.byStatus?.REVIEW ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      accent: 'border-l-amber-500',
      href: '/documents?status=REVIEW',
    },
    {
      label: 'Подписано',
      value: stats?.byStatus?.SIGNED ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
      accent: 'border-l-emerald-500',
      href: '/documents?status=SIGNED',
    },
    {
      label: 'Пользователей',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'text-purple-600',
      accent: 'border-l-purple-500',
      href: '/users',
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-5 max-w-7xl animate-pulse">
        <div className="h-6 bg-muted rounded-sm w-40" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-sm" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Дашборд</h1>
          <p className="text-muted-foreground text-sm">
            {user ? `${user.firstName}, добро пожаловать` : 'Обзор системы'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Новый документ
            </Button>
          )}
          <Link href="/documents" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <FileText className="w-3.5 h-3.5" />
            Документы
          </Link>
          {(stats?.byStatus?.REVIEW ?? 0) > 0 && (
            <Link href="/documents?status=REVIEW" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Clock className="w-3.5 h-3.5" />
              На согласовании
              <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-sm font-semibold border border-amber-200">
                {stats?.byStatus?.REVIEW}
              </span>
            </Link>
          )}
          {taskCount > 0 && (
            <Link href="#my-tasks" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Inbox className="w-3.5 h-3.5" />
              Мои задачи
              <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-sm font-semibold border border-blue-200">
                {taskCount}
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href} className="block group">
            <div className={`bg-card border border-l-[3px] ${card.accent} rounded-sm p-4 transition-colors hover:bg-muted/40 cursor-pointer`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* My Tasks + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* My Tasks */}
        <Card id="my-tasks">
          <CardHeader className="pb-2 px-5 pt-4 flex-row items-center justify-between border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5 text-muted-foreground" />
              Мои задачи
              {taskCount > 0 && (
                <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-sm font-semibold border border-blue-200">
                  {taskCount}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <CheckCircle className="w-7 h-7 opacity-20" />
                <p className="text-sm">Нет ожидающих задач</p>
              </div>
            ) : (
              <div className="divide-y">
                {tasks.map((task) => {
                  const approvedCount = task.document.approvalSteps.filter(
                    (s) => s.status === 'APPROVED' && s.order > 0,
                  ).length;
                  const totalRequired = task.document.approvalSteps.filter(
                    (s) => s.order > 0,
                  ).length;
                  return (
                    <Link
                      key={task.id}
                      href={`/documents/${task.document.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{task.document.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {task.document.number} · {DOCUMENT_TYPE_LABELS[task.document.type] || task.document.type}
                          {' · '}{approvedCount}/{totalRequired}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Ожидает
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2 px-5 pt-4 flex-row items-center border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              Последние события
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Activity className="w-7 h-7 opacity-20" />
                <p className="text-sm">Нет недавних событий</p>
              </div>
            ) : (
              <div className="divide-y">
                {activities.map((item) => {
                  const isStatusChange = item.action === 'STATUS_CHANGED';
                  const toStatus = item.details?.to as string | undefined;
                  const statusColor = toStatus ? DOCUMENT_STATUS_COLORS[toStatus] : '';
                  return (
                    <Link
                      key={item.id}
                      href={`/documents/${item.document.id}`}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.document.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-muted-foreground">{getFullName(item.user)}</p>
                          {isStatusChange && toStatus ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${statusColor}`}>
                              {DOCUMENT_STATUS_LABELS[toStatus] || toStatus}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {ACTION_LABELS[item.action] || item.action}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                        {formatDate(item.createdAt)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 px-5 pt-4 border-b">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">По статусам</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-5 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statusData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'Документов']} />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={entry.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-5 pt-4 border-b">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">По типам</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-5 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 60 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={(v) => [v, 'Документов']} />
                <Bar dataKey="value" fill="#3b5fc0" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader className="pb-2 px-5 pt-4 flex-row items-center justify-between border-b">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Последние документы</CardTitle>
          <Link href="/documents" className="text-xs text-primary hover:underline font-medium">Все →</Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {stats?.recentDocuments?.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.number} · {getFullName(doc.createdBy)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${DOCUMENT_STATUS_COLORS[doc.status]}`}>
                    {DOCUMENT_STATUS_LABELS[doc.status]}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatDate(doc.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <CreateDocumentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => setCreateOpen(false)}
      />
    </div>
  );
}
