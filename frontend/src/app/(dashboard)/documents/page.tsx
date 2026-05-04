'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Document, PaginatedResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, ChevronLeft, ChevronRight, Archive, Clock } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { formatDate, formatAmount, getFullName } from '@/lib/utils';
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS, DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import { useAuthStore } from '@/store/auth';
import { CreateDocumentDialog } from '@/components/documents/create-document-dialog';

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse<Document>>({
    queryKey: ['documents', { search, status, type, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      params.set('page', String(page));
      params.set('limit', '15');
      return (await api.get(`/documents?${params}`)).data;
    },
  });

  const canCreate = !!user;

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Документы</h1>
          <p className="text-muted-foreground text-sm">
            {data?.total != null ? `${data.total} документов` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/archive" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Archive className="w-3.5 h-3.5" />
            Архив
          </Link>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Создать
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, номеру, контрагенту..."
            className="pl-9 h-8 text-sm"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v === 'ALL' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все статусы</SelectItem>
            {Object.entries(DOCUMENT_STATUS_LABELS)
              .filter(([v]) => v !== 'ARCHIVED')
              .map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => { setType(v === 'ALL' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Все типы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все типы</SelectItem>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="px-5 py-3 animate-pulse flex gap-4">
                  <div className="h-4 bg-muted rounded-sm flex-1" />
                  <div className="h-4 bg-muted rounded-sm w-24" />
                  <div className="h-4 bg-muted rounded-sm w-20" />
                </div>
              ))}
            </div>
          ) : !data?.items?.length ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <FileText className="w-8 h-8 opacity-20" />
              <p className="text-sm">Документы не найдены</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-5 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Документ</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Тип</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Статус</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Контрагент</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Сумма</th>
                    <th className="text-right px-5 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.items.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-muted/40 cursor-pointer transition-all duration-150"
                      onClick={() => router.push(`/documents/${doc.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium leading-tight">{doc.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {doc.number} · {getFullName(doc.createdBy)}
                            </p>
                            {doc.dueDate && (() => {
                              const overdue = isOverdue(doc.dueDate!) && !['SIGNED', 'ARCHIVED'].includes(doc.status);
                              return (
                                <p className={`text-xs mt-0.5 flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                                  <Clock className="w-3 h-3 flex-shrink-0" />
                                  до {formatDate(doc.dueDate!)}
                                  {overdue && <span className="font-normal">· просрочен</span>}
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {DOCUMENT_TYPE_LABELS[doc.type]}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${DOCUMENT_STATUS_COLORS[doc.status]}`}>
                          {DOCUMENT_STATUS_LABELS[doc.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">
                        {doc.counterparty || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">
                        {doc.amount ? formatAmount(doc.amount, doc.currency) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-muted-foreground tabular-nums">
                        {formatDate(doc.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {data.pages > 1 && (
                <div className="flex items-center justify-between px-5 py-2.5 border-t bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Стр. {data.page} / {data.pages}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateDocumentDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => setCreateOpen(false)} />
    </div>
  );
}
