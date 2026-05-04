'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Document, PaginatedResponse, MyTask } from '@/types';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateDocumentDialog } from '@/components/documents/create-document-dialog';
import {
  FileText, Plus, ChevronRight, Clock, CheckCircle,
  RotateCcw, Archive, Inbox, ChevronLeft, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, getFullName } from '@/lib/utils';
import {
  DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS, DOCUMENT_TYPE_LABELS,
} from '@/lib/constants';

type Tab = 'created' | 'pending' | 'revision' | 'archived';

const TABS: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'created',
    label: 'Созданные мной',
    icon: FileText,
    description: 'Все документы, которые вы создали',
  },
  {
    id: 'pending',
    label: 'Ожидают действия',
    icon: Inbox,
    description: 'Документы, которые ждут вашего решения',
  },
  {
    id: 'revision',
    label: 'На доработке',
    icon: RotateCcw,
    description: 'Ваши документы, возвращённые на доработку',
  },
  {
    id: 'archived',
    label: 'Архивные',
    icon: Archive,
    description: 'Ваши архивные документы',
  },
];

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center border border-[#e8e5e0]">
        <Icon className="w-6 h-6 text-stone-300" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-stone-500">{title}</p>
        <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Tab: Created by me ─────────────────────────────────────────────────────
function CreatedTab({ userId }: { userId: string }) {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Document>>({
    queryKey: ['my-docs-created', userId, page],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set('createdBy', userId);
      p.set('page', String(page));
      p.set('limit', '15');
      return (await api.get(`/documents?${p}`)).data;
    },
    enabled: !!userId,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data?.items?.length) {
    return <EmptyState icon={FileText} title="Нет документов" subtitle="Вы пока не создавали документов" />;
  }

  return (
    <>
      <DocTable items={data.items} onRowClick={(id) => router.push(`/documents/${id}`)} />
      <Pagination data={data} page={page} setPage={setPage} />
    </>
  );
}

// ── Tab: Pending my decision ───────────────────────────────────────────────
function PendingTab() {
  const router = useRouter();

  const { data, isLoading } = useQuery<{ items: MyTask[]; total: number }>({
    queryKey: ['my-tasks'],
    queryFn: async () => (await api.get('/dashboard/my-tasks')).data,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data?.items?.length) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="Нет ожидающих задач"
        subtitle="Все документы обработаны — ничего не требует вашего решения"
      />
    );
  }

  return (
    <div className="divide-y divide-[#f0ede8]">
      {data.items.map((task) => {
        const approvedCount = task.document.approvalSteps.filter(
          (s) => s.status === 'APPROVED' && s.order > 0,
        ).length;
        const totalRequired = task.document.approvalSteps.filter((s) => s.order > 0).length;

        return (
          <Link
            key={task.id}
            href={`/documents/${task.document.id}`}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f8f7f4] transition-colors group"
          >
            <div className="w-8 h-8 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">{task.document.title}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {task.document.number}
                {' · '}{DOCUMENT_TYPE_LABELS[task.document.type] || task.document.type}
                {' · '}шаг {approvedCount + 1} из {totalRequired}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                Ожидает
              </span>
              <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── Tab: Returned for revision ─────────────────────────────────────────────
function RevisionTab({ userId }: { userId: string }) {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Document>>({
    queryKey: ['my-docs-revision', userId, page],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set('createdBy', userId);
      p.set('status', 'NEEDS_REVISION');
      p.set('page', String(page));
      p.set('limit', '15');
      return (await api.get(`/documents?${p}`)).data;
    },
    enabled: !!userId,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data?.items?.length) {
    return (
      <EmptyState
        icon={RotateCcw}
        title="Нет документов на доработке"
        subtitle="Все ваши документы в порядке — ничего не возвращено"
      />
    );
  }

  return (
    <>
      <DocTable items={data.items} onRowClick={(id) => router.push(`/documents/${id}`)} />
      <Pagination data={data} page={page} setPage={setPage} />
    </>
  );
}

// ── Tab: My archived docs ──────────────────────────────────────────────────
function ArchivedTab({ userId }: { userId: string }) {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Document>>({
    queryKey: ['my-docs-archived', userId, page],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set('createdBy', userId);
      p.set('status', 'ARCHIVED');
      p.set('page', String(page));
      p.set('limit', '15');
      return (await api.get(`/documents?${p}`)).data;
    },
    enabled: !!userId,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data?.items?.length) {
    return (
      <EmptyState
        icon={Archive}
        title="Нет архивных документов"
        subtitle="Ваши архивные документы появятся здесь"
      />
    );
  }

  return (
    <>
      <DocTable items={data.items} onRowClick={(id) => router.push(`/documents/${id}`)} />
      <Pagination data={data} page={page} setPage={setPage} />
    </>
  );
}

// ── Shared components ──────────────────────────────────────────────────────
function DocTable({ items, onRowClick }: { items: Document[]; onRowClick: (id: string) => void }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[#e8e5e0] bg-[#faf9f7]">
          <th className="text-left px-5 py-2.5 text-[11px] font-medium text-stone-400 uppercase tracking-wide">Документ</th>
          <th className="text-left px-4 py-2.5 text-[11px] font-medium text-stone-400 uppercase tracking-wide hidden sm:table-cell">Тип</th>
          <th className="text-left px-4 py-2.5 text-[11px] font-medium text-stone-400 uppercase tracking-wide">Статус</th>
          <th className="text-right px-5 py-2.5 text-[11px] font-medium text-stone-400 uppercase tracking-wide hidden md:table-cell">Дата</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#f0ede8]">
        {items.map((doc) => (
          <tr
            key={doc.id}
            className="hover:bg-[#f8f7f4] cursor-pointer transition-colors"
            onClick={() => onRowClick(doc.id)}
          >
            <td className="px-5 py-3">
              <p className="font-medium text-stone-800 truncate max-w-[280px]">{doc.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-stone-400">{doc.number}</p>
                {doc.dueDate && (() => {
                  const overdue = isOverdue(doc.dueDate!) && !['SIGNED', 'ARCHIVED'].includes(doc.status);
                  return (
                    <span className={`flex items-center gap-0.5 text-xs ${overdue ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
                      {overdue && <AlertCircle className="w-3 h-3" />}
                      до {formatDate(doc.dueDate!)}
                    </span>
                  );
                })()}
              </div>
            </td>
            <td className="px-4 py-3 text-xs text-stone-500 hidden sm:table-cell">
              {DOCUMENT_TYPE_LABELS[doc.type]}
            </td>
            <td className="px-4 py-3">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${DOCUMENT_STATUS_COLORS[doc.status]}`}>
                {DOCUMENT_STATUS_LABELS[doc.status]}
              </span>
            </td>
            <td className="px-5 py-3 text-right text-xs text-stone-400 tabular-nums hidden md:table-cell">
              {formatDate(doc.createdAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Pagination({
  data,
  page,
  setPage,
}: {
  data: PaginatedResponse<Document>;
  page: number;
  setPage: (fn: (p: number) => number) => void;
}) {
  if (data.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-t border-[#e8e5e0] bg-[#faf9f7]">
      <p className="text-xs text-stone-400">Стр. {data.page} / {data.pages}</p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="divide-y divide-[#f0ede8]">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-5 py-3 flex gap-4 animate-pulse">
          <div className="h-4 bg-stone-100 rounded flex-1" />
          <div className="h-4 bg-stone-100 rounded w-20" />
          <div className="h-4 bg-stone-100 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function MyDocumentsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('created');
  const [createOpen, setCreateOpen] = useState(false);

  // Prefetch pending count
  const { data: tasksData } = useQuery<{ items: MyTask[]; total: number }>({
    queryKey: ['my-tasks'],
    queryFn: async () => (await api.get('/dashboard/my-tasks')).data,
    enabled: !!user,
  });

  // Prefetch revision count for badge
  const { data: revisionData } = useQuery<PaginatedResponse<Document>>({
    queryKey: ['my-docs-revision', user?.id, 1],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set('createdBy', user!.id);
      p.set('status', 'NEEDS_REVISION');
      p.set('limit', '1');
      return (await api.get(`/documents?${p}`)).data;
    },
    enabled: !!user,
  });

  const pendingCount = tasksData?.total ?? 0;
  const revisionCount = revisionData?.total ?? 0;

  const badges: Partial<Record<Tab, number>> = {
    pending: pendingCount,
    revision: revisionCount,
  };

  if (!user) return null;

  const activeTabConfig = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="p-6 lg:p-8 space-y-5 max-w-[1100px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Мои документы</h1>
          <p className="text-sm text-stone-400 mt-0.5">{activeTabConfig.description}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="flex-shrink-0">
          <Plus className="w-3.5 h-3.5" />
          Новый документ
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#e8e5e0] pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const badge = badges[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${isActive
                  ? 'border-teal-500 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-200'
                }
              `}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-500' : 'text-stone-400'}`} />
              {tab.label}
              {badge != null && badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  tab.id === 'revision'
                    ? 'bg-orange-100 text-orange-600 border border-orange-200'
                    : 'bg-teal-600 text-white'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {activeTab === 'created' && <CreatedTab userId={user.id} />}
          {activeTab === 'pending' && <PendingTab />}
          {activeTab === 'revision' && <RevisionTab userId={user.id} />}
          {activeTab === 'archived' && <ArchivedTab userId={user.id} />}
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
