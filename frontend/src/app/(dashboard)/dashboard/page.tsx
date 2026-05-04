'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DashboardStats, MyTask, ActivityItem } from '@/types';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import {
  FileText, CheckCircle, Clock, XCircle,
  Plus, ChevronRight, Activity, AlertCircle, BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

const CHART_COLORS = ['#0d9488', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#a8a29e'];

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'создал документ',
  UPDATED: 'обновил документ',
  STATUS_CHANGED: 'изменил статус',
};

const ACTION_DOT: Record<string, string> = {
  CREATED: 'bg-teal-400',
  UPDATED: 'bg-stone-300',
  STATUS_CHANGED: 'bg-amber-400',
};

function getToday(): string {
  return new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-stone-100 rounded-xl animate-pulse', className)} />;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);

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

  const reviewCount = stats?.byStatus?.REVIEW ?? 0;
  const signedCount = stats?.byStatus?.SIGNED ?? 0;
  const rejectedCount = stats?.byStatus?.REJECTED ?? 0;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1100px]">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid xl:grid-cols-[1fr_300px] gap-5">
          <div className="space-y-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1100px]">

      {/* ══════════════════════════════════════════════════
          1. HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            {user ? `Приветствую, ${user.firstName}` : 'Добро пожаловать'}
          </h1>
          <p className="text-sm text-stone-400 mt-1 capitalize">{getToday()}</p>
        </div>
        {!!user && (
          <Button onClick={() => setCreateOpen(true)} className="flex-shrink-0 gap-2 shadow-sm shadow-teal-200/50">
            <Plus className="w-4 h-4" />
            Создать документ
          </Button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          2. ACTION CARDS — семантические цвета, не просто числа
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Всего */}
        <Link href="/documents" className="group animate-fade-up" style={{ animationDelay: '0ms' }}>
          <div className="bg-white border border-[#e8e5e0] rounded-2xl p-5 hover:shadow-lg hover:shadow-stone-100 hover:-translate-y-0.5 transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-stone-500" />
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-400 mt-1 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-stone-900 tabular-nums">{stats?.totalDocuments ?? 0}</p>
            <p className="text-sm text-stone-500 mt-1">Всего документов</p>
          </div>
        </Link>

        {/* На рассмотрении */}
        <Link href="/documents?status=REVIEW" className="group animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className={cn(
            'border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full',
            reviewCount > 0
              ? 'bg-amber-50 border-amber-200 hover:shadow-amber-100'
              : 'bg-white border-[#e8e5e0] hover:shadow-stone-100',
          )}>
            <div className="flex items-start justify-between mb-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', reviewCount > 0 ? 'bg-amber-100' : 'bg-stone-100')}>
                <Clock className={cn('w-5 h-5', reviewCount > 0 ? 'text-amber-600' : 'text-stone-400')} />
              </div>
              {reviewCount > 0 && (
                <span className="attention-pulse w-2 h-2 rounded-full bg-amber-400 mt-1.5" />
              )}
            </div>
            <p className={cn('text-3xl font-bold tabular-nums', reviewCount > 0 ? 'text-amber-700' : 'text-stone-400')}>
              {reviewCount}
            </p>
            <p className={cn('text-sm mt-1', reviewCount > 0 ? 'text-amber-600 font-medium' : 'text-stone-400')}>
              {reviewCount > 0 ? 'Ожидают решения' : 'На рассмотрении'}
            </p>
          </div>
        </Link>

        {/* Подписано */}
        <Link href="/documents?status=SIGNED" className="group animate-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="bg-white border border-[#e8e5e0] rounded-2xl p-5 hover:shadow-lg hover:shadow-stone-100 hover:-translate-y-0.5 transition-all duration-200 h-full">
            <div className="flex items-start justify-between mb-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', signedCount > 0 ? 'bg-emerald-100' : 'bg-stone-100')}>
                <CheckCircle className={cn('w-5 h-5', signedCount > 0 ? 'text-emerald-600' : 'text-stone-400')} />
              </div>
            </div>
            <p className={cn('text-3xl font-bold tabular-nums', signedCount > 0 ? 'text-emerald-700' : 'text-stone-400')}>
              {signedCount}
            </p>
            <p className="text-sm text-stone-500 mt-1">Подписано</p>
          </div>
        </Link>

        {/* Отклонено */}
        <Link href="/documents?status=REJECTED" className="group animate-fade-up" style={{ animationDelay: '180ms' }}>
          <div className={cn(
            'border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full',
            rejectedCount > 0
              ? 'bg-red-50 border-red-200 hover:shadow-red-100'
              : 'bg-white border-[#e8e5e0] hover:shadow-stone-100',
          )}>
            <div className="flex items-start justify-between mb-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', rejectedCount > 0 ? 'bg-red-100' : 'bg-stone-100')}>
                <XCircle className={cn('w-5 h-5', rejectedCount > 0 ? 'text-red-500' : 'text-stone-400')} />
              </div>
            </div>
            <p className={cn('text-3xl font-bold tabular-nums', rejectedCount > 0 ? 'text-red-700' : 'text-stone-400')}>
              {rejectedCount}
            </p>
            <p className={cn('text-sm mt-1', rejectedCount > 0 ? 'text-red-500 font-medium' : 'text-stone-400')}>
              {rejectedCount > 0 ? 'Требует доработки' : 'Отклонено'}
            </p>
          </div>
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════
          3. ТРЕБУЕТ ВНИМАНИЯ
      ══════════════════════════════════════════════════ */}
      {taskCount > 0 && (
        <section id="attention">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-stone-900">Требует вашего внимания</h2>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
              {taskCount}
            </span>
          </div>

          <div className="space-y-2.5">
            {tasks.slice(0, 3).map((task) => {
              const approvedCount = task.document.approvalSteps.filter(
                (s) => s.status === 'APPROVED' && s.order > 0,
              ).length;
              const totalRequired = task.document.approvalSteps.filter(
                (s) => s.order > 0,
              ).length;
              const currentStep = approvedCount + 1;

              return (
                <div
                  key={task.id}
                  className="bg-white border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-4 hover:shadow-md hover:shadow-amber-50 hover:border-amber-300 transition-all duration-200"
                >
                  <div className="w-11 h-11 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 truncate text-base leading-snug">
                      {task.document.title}
                    </p>
                    <p className="text-sm text-stone-500 mt-0.5">
                      {DOCUMENT_TYPE_LABELS[task.document.type] || task.document.type}
                      {' · '}{task.document.number}
                      {' · '}шаг {currentStep} из {totalRequired}
                    </p>
                  </div>
                  <Link href={`/documents/${task.document.id}`} className="flex-shrink-0">
                    <Button size="sm" className="gap-1.5">
                      Открыть
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              );
            })}

            {taskCount > 3 && (
              <Link
                href="/documents?status=REVIEW"
                className="block text-center text-sm text-teal-600 hover:text-teal-700 font-semibold py-2 transition-colors"
              >
                Ещё {taskCount - 3} документов ожидают →
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════
          4. ОСНОВНОЙ КОНТЕНТ — документы + активность
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">

        {/* ЛЕВАЯ: последние документы как карточки */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-stone-900">Последние документы</h2>
            <Link
              href="/documents"
              className="text-sm text-teal-600 hover:text-teal-700 font-semibold transition-colors"
            >
              Все документы →
            </Link>
          </div>

          {!stats?.recentDocuments?.length ? (
            <div className="bg-white border border-[#e8e5e0] rounded-2xl flex flex-col items-center gap-3 py-16">
              <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-stone-300" />
              </div>
              <p className="text-stone-400 font-medium">Документов пока нет</p>
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                Создать первый документ
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.recentDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center gap-4 bg-white border border-[#e8e5e0] rounded-2xl px-5 py-4 hover:shadow-md hover:shadow-stone-100 hover:border-stone-300 hover:-translate-y-px transition-all duration-200 group"
                >
                  {/* File icon */}
                  <div className="w-10 h-10 bg-stone-50 border border-[#e8e5e0] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-stone-100 transition-colors">
                    <FileText className="w-4.5 h-4.5 text-stone-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 truncate leading-snug">{doc.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {doc.number}
                      {' · '}{DOCUMENT_TYPE_LABELS[doc.type]}
                      {' · '}{getFullName(doc.createdBy)}
                    </p>
                  </div>

                  {/* Status + date */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap',
                      DOCUMENT_STATUS_COLORS[doc.status],
                    )}>
                      {DOCUMENT_STATUS_LABELS[doc.status]}
                    </span>
                    <span className="text-xs text-stone-400 tabular-nums hidden md:block">
                      {formatDate(doc.createdAt)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ПРАВАЯ: лента активности */}
        <div>
          <h2 className="text-base font-bold text-stone-900 mb-3">Активность</h2>
          <div className="bg-white border border-[#e8e5e0] rounded-2xl overflow-hidden">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12">
                <Activity className="w-7 h-7 text-stone-200" />
                <p className="text-sm text-stone-400">Событий пока нет</p>
              </div>
            ) : (
              <div className="divide-y divide-[#f0ede8]">
                {activities.map((item) => {
                  const isStatusChange = item.action === 'STATUS_CHANGED';
                  const toStatus = item.details?.to as string | undefined;
                  const statusColor = toStatus ? DOCUMENT_STATUS_COLORS[toStatus] : '';
                  const dot = ACTION_DOT[item.action] ?? 'bg-stone-300';
                  return (
                    <Link
                      key={item.id}
                      href={`/documents/${item.document.id}`}
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#f8f7f4] transition-colors"
                    >
                      <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-700 truncate leading-snug">
                          {item.document.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-stone-400">{getFullName(item.user)}</span>
                          {isStatusChange && toStatus ? (
                            <span className={cn('text-[10px] px-1.5 py-px rounded-full font-semibold', statusColor)}>
                              {DOCUMENT_STATUS_LABELS[toStatus] || toStatus}
                            </span>
                          ) : (
                            <span className="text-xs text-stone-400">
                              {ACTION_LABELS[item.action] || item.action}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-300 mt-0.5 tabular-nums">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          5. АНАЛИТИКА (вторично, внизу)
      ══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <BarChart2 className="w-4 h-4 text-stone-300" />
          <span className="text-xs font-bold text-stone-300 uppercase tracking-[0.15em]">Аналитика</span>
          <div className="flex-1 h-px bg-[#ede9e4]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-[#e8e5e0] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e8e5e0]">
              <p className="text-sm font-semibold text-stone-700">По статусам</p>
            </div>
            <div className="px-5 pb-5 pt-4">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={statusData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#a8a29e', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#a8a29e', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8e5e0', borderRadius: '10px', fontSize: 12, fontFamily: 'Plus Jakarta Sans', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                    formatter={(v) => [v, 'Документов']}
                    cursor={{ fill: 'rgba(13,148,136,0.04)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, i) => (
                      <Cell key={entry.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-[#e8e5e0] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e8e5e0]">
              <p className="text-sm font-semibold text-stone-700">По типам</p>
            </div>
            <div className="px-5 pb-5 pt-4">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 70 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#a8a29e', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#a8a29e', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8e5e0', borderRadius: '10px', fontSize: 12, fontFamily: 'Plus Jakarta Sans', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                    formatter={(v) => [v, 'Документов']}
                    cursor={{ fill: 'rgba(13,148,136,0.04)' }}
                  />
                  <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <CreateDocumentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => setCreateOpen(false)}
      />
    </div>
  );
}
