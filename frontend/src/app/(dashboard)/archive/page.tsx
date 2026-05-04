'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Document, PaginatedResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, ChevronLeft, ChevronRight, Archive, ArchiveX, Loader2 } from 'lucide-react';
import { formatDate, formatAmount, getFullName } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';

export default function ArchivePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Document>>({
    queryKey: ['archive', { search, type, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('status', 'ARCHIVED');
      if (search) params.set('search', search);
      if (type) params.set('type', type);
      params.set('page', String(page));
      params.set('limit', '15');
      return (await api.get(`/documents?${params}`)).data;
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/documents/${id}/status`, { status: 'DRAFT' }),
    onSuccess: () => {
      toast.success('Документ разархивирован и перемещён в черновики');
      setUnarchivingId(null);
      qc.invalidateQueries({ queryKey: ['archive'] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['my-docs-created'] });
      qc.invalidateQueries({ queryKey: ['my-docs-archived'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Ошибка разархивирования');
      setUnarchivingId(null);
    },
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Archive className="w-6 h-6 text-muted-foreground" />
            Архив
          </h1>
          <p className="text-muted-foreground text-sm">
            {data?.total != null ? `${data.total} документов в архиве` : 'Архивные документы'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, номеру, контрагенту..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={type} onValueChange={(v) => { setType(v === 'ALL' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44">
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
              {[...Array(6)].map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex gap-4">
                  <div className="h-4 bg-muted rounded flex-1" />
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-4 bg-muted rounded w-20" />
                </div>
              ))}
            </div>
          ) : !data?.items?.length ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Archive className="w-10 h-10 opacity-30" />
              <p>Архив пуст</p>
              <p className="text-xs">Документы попадают сюда при архивировании</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Документ</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Тип</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Контрагент</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Сумма</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Дата</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.items.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td
                        className="px-6 py-3 cursor-pointer"
                        onClick={() => router.push(`/documents/${doc.id}`)}
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0 opacity-60" />
                          <div>
                            <p className="font-medium leading-tight text-muted-foreground">{doc.title}</p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              {doc.number} · {getFullName(doc.createdBy)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {DOCUMENT_TYPE_LABELS[doc.type]}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">
                        {doc.counterparty || '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {doc.amount ? formatAmount(doc.amount, doc.currency) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {unarchivingId === doc.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-muted-foreground">Разархивировать?</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              disabled={unarchiveMutation.isPending}
                              onClick={() => unarchiveMutation.mutate(doc.id)}
                            >
                              {unarchiveMutation.isPending
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : 'Да'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => setUnarchivingId(null)}
                            >
                              Нет
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); setUnarchivingId(doc.id); }}
                          >
                            <ArchiveX className="w-3.5 h-3.5" />
                            Разархивировать
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {data.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
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
