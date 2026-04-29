'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Document, ApprovalStep } from '@/types';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, FileText, User, Calendar, Building2,
  MessageSquare, Paperclip, Activity, Loader2,
  CheckCircle, XCircle, RotateCcw, Download,
  Clock, AlertCircle, ChevronRight, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import {
  formatDate, formatDateTime, formatAmount, getFullName,
} from '@/lib/utils';
import {
  DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS, ROLE_LABELS, STATUS_TRANSITIONS,
} from '@/lib/constants';
import { AttachmentsPanel } from '@/components/documents/attachments-panel';
import { SubmitForReviewDialog } from '@/components/documents/submit-for-review-dialog';

const ACTION_ICONS: Record<string, React.ElementType> = {
  CREATED: FileText,
  UPDATED: RotateCcw,
  STATUS_CHANGED: Activity,
};

const STEP_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  PENDING: { label: 'Ожидает', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  APPROVED: { label: 'Согласован', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  REJECTED: { label: 'Отклонён', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
  NEEDS_REVISION: { label: 'На доработке', icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
};

const FINAL_STATUSES = ['APPROVED', 'SIGNED', 'ARCHIVED'];

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [comment, setComment] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [pendingStatus, setPendingStatus] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [decisionComment, setDecisionComment] = useState('');
  const [pendingDecision, setPendingDecision] = useState<'APPROVED' | 'REJECTED' | 'NEEDS_REVISION' | null>(null);
  const [downloadingFinal, setDownloadingFinal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: doc, isLoading } = useQuery<Document>({
    queryKey: ['document', id],
    queryFn: async () => (await api.get(`/documents/${id}`)).data,
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => api.post(`/documents/${id}/comments`, { text }),
    onSuccess: () => {
      toast.success('Комментарий добавлен');
      setComment('');
      qc.invalidateQueries({ queryKey: ['document', id] });
    },
    onError: () => toast.error('Ошибка'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, comment }: { status: string; comment?: string }) =>
      api.patch(`/documents/${id}/status`, { status, comment }),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'ARCHIVED' ? 'Документ архивирован' : vars.status === 'DRAFT' ? 'Документ разархивирован' : 'Статус обновлён');
      setStatusComment('');
      setPendingStatus('');
      qc.invalidateQueries({ queryKey: ['document', id] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['archive'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Ошибка'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/documents/${id}`),
    onSuccess: () => {
      toast.success('Документ удалён');
      router.push('/documents');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Ошибка удаления'),
  });

  const decideMutation = useMutation({
    mutationFn: ({ decision, comment }: { decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION'; comment?: string }) =>
      api.post(`/documents/${id}/decide`, { decision, comment }),
    onSuccess: () => {
      toast.success('Решение зафиксировано');
      setDecisionComment('');
      setPendingDecision(null);
      qc.invalidateQueries({ queryKey: ['document', id] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Ошибка'),
  });

  const handleDownloadFinal = async () => {
    if (!doc) return;
    setDownloadingFinal(true);
    try {
      const token = localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token
        : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/documents/${doc.id}/final`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Ошибка формирования документа' }));
        toast.error(err.message || 'Ошибка формирования документа');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.number}-согласован.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Ошибка при скачивании итогового документа');
    } finally {
      setDownloadingFinal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl animate-pulse">
        <div className="h-6 bg-muted rounded w-48" />
        <div className="h-40 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!doc) return <div className="p-6">Документ не найден</div>;

  const transitions = STATUS_TRANSITIONS[doc.status] || [];
  const isAdmin = currentUser?.role === 'ADMIN';
  const isCreator = currentUser?.id === doc.createdBy.id;
  const canDelete = (isAdmin || isCreator) && doc.status !== 'SIGNED';

  // Approval chain analysis (parallel model)
  const steps: ApprovalStep[] = doc.approvalSteps || [];
  const approverSteps = steps.filter((s) => s.order > 0); // exclude initiator (order 0)
  const myPendingStep = steps.find((s) => s.approver.id === currentUser?.id && s.status === 'PENDING');
  const isCurrentApprover = !!myPendingStep;
  const hasApprovalChain = steps.length > 0;

  return (
    <div className="p-6 max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold leading-tight">{doc.title}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${DOCUMENT_STATUS_COLORS[doc.status]}`}>
              {DOCUMENT_STATUS_LABELS[doc.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {doc.number} · {DOCUMENT_TYPE_LABELS[doc.type]}
          </p>
        </div>
        {canDelete && (
          <div className="flex-shrink-0">
            {!confirmDelete ? (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-4 h-4" />
                Удалить
              </Button>
            ) : (
              <div className="flex items-center gap-2 border border-destructive/40 rounded-md px-3 py-1.5 bg-destructive/5">
                <span className="text-xs text-destructive font-medium">Удалить документ?</span>
                <Button size="sm" variant="destructive" className="h-6 text-xs px-2" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                  {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Да'}
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setConfirmDelete(false)}>
                  Нет
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Details card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Сведения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {doc.description && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Описание</p>
                  <p>{doc.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Контрагент
                  </p>
                  <p className="font-medium">{doc.counterparty || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Сумма</p>
                  <p className="font-medium">{doc.amount ? formatAmount(doc.amount, doc.currency) : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Автор
                  </p>
                  <p className="font-medium">{getFullName(doc.createdBy)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Ответственный</p>
                  <p className="font-medium">{getFullName(doc.assignedTo) || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Создан
                  </p>
                  <p>{formatDateTime(doc.createdAt)}</p>
                </div>
                {doc.dueDate && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Срок исполнения</p>
                    <p>{formatDate(doc.dueDate)}</p>
                  </div>
                )}
                {doc.signedAt && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Подписан</p>
                    <p>{formatDate(doc.signedAt)}</p>
                  </div>
                )}
              </div>
              {doc.tags && doc.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-secondary px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Approval chain ── (shown when steps exist or doc is in REVIEW) */}
          {(hasApprovalChain || doc.status === 'REVIEW') && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Маршрут согласования
                  {approverSteps.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({approverSteps.filter((s) => s.status === 'APPROVED').length} из {approverSteps.length} согласовано)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!hasApprovalChain && doc.status === 'REVIEW' && (
                  <p className="text-sm text-muted-foreground">
                    Маршрут согласования не настроен для этого документа.
                  </p>
                )}

                {/* Step list */}
                {steps.map((step, idx) => {
                  const isInitiator = step.order === 0;
                  const cfg = STEP_STATUS_CONFIG[step.status] || STEP_STATUS_CONFIG.PENDING;
                  const Icon = cfg.icon;
                  // In parallel model all non-initiator PENDING steps are simultaneously active
                  const isActive = !isInitiator && step.status === 'PENDING';
                  const isMyStep = step.approver.id === currentUser?.id;

                  return (
                    <div key={step.id} className={`flex gap-3 p-3 rounded-md border ${isActive && isMyStep ? 'border-blue-300 bg-blue-50/60' : isActive ? 'border-amber-200 bg-amber-50/40' : 'border-transparent bg-muted/30'}`}>
                      {/* Step indicator */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isInitiator ? 'bg-emerald-100 text-emerald-700' : step.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : step.status === 'REJECTED' ? 'bg-red-100 text-red-600' : isMyStep ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isInitiator
                            ? <CheckCircle className="w-4 h-4" />
                            : step.status === 'APPROVED'
                              ? <CheckCircle className="w-4 h-4" />
                              : step.status === 'REJECTED'
                                ? <XCircle className="w-4 h-4" />
                                : step.order}
                        </div>
                        {idx < steps.length - 1 && (
                          <div className="w-px flex-1 min-h-2 bg-border" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {getFullName(step.approver)}
                              {isInitiator && (
                                <span className="ml-2 text-xs text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full font-normal">
                                  Инициатор
                                </span>
                              )}
                              {isActive && isMyStep && (
                                <span className="ml-2 text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full font-normal">
                                  Ожидает вашего решения
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ROLE_LABELS[step.approver.role] || step.approver.role}
                              {step.approver.position ? ` · ${step.approver.position}` : ''}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 font-medium ${isInitiator ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : `${cfg.bg} ${cfg.color}`}`}>
                            {isInitiator ? 'Подтверждён' : cfg.label}
                          </span>
                        </div>
                        {step.decidedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDateTime(step.decidedAt)}
                          </p>
                        )}
                        {step.comment && !isInitiator && (
                          <p className="text-xs mt-1 text-muted-foreground italic">«{step.comment}»</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* ── Decision panel for any designated approver whose step is PENDING ── */}
                {isCurrentApprover && !pendingDecision && (
                  <div className="mt-2 p-3 rounded-md bg-blue-50 border border-blue-200 space-y-2">
                    <p className="text-sm font-medium text-blue-800 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      Требуется ваше решение
                    </p>
                    <p className="text-xs text-blue-700">
                      Вы назначены согласующим. Вы можете принять решение независимо от других участников.
                    </p>
                    <div className="flex gap-2 pt-1 flex-wrap">
                      <Button size="sm" onClick={() => setPendingDecision('APPROVED')}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Согласовать
                      </Button>
                      <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => setPendingDecision('NEEDS_REVISION')}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        На доработку
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setPendingDecision('REJECTED')}>
                        <XCircle className="w-3.5 h-3.5" />
                        Отклонить
                      </Button>
                    </div>
                  </div>
                )}

                {pendingDecision && (
                  <div className="mt-2 p-3 rounded-md border bg-muted/30 space-y-2">
                    <p className="text-sm font-medium">
                      {pendingDecision === 'APPROVED' && '✓ Согласование'}
                      {pendingDecision === 'REJECTED' && '✗ Отклонение'}
                      {pendingDecision === 'NEEDS_REVISION' && '↩ Возврат на доработку'}
                    </p>
                    {pendingDecision === 'NEEDS_REVISION' && (
                      <p className="text-xs text-muted-foreground">Укажите причину — инициатор увидит её перед повторной отправкой.</p>
                    )}
                    <Textarea
                      placeholder={pendingDecision === 'NEEDS_REVISION' ? 'Причина возврата (обязательно)...' : 'Комментарий (необязательно)...'}
                      rows={2}
                      value={decisionComment}
                      onChange={(e) => setDecisionComment(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={pendingDecision === 'REJECTED' ? 'destructive' : 'default'}
                        disabled={decideMutation.isPending || (pendingDecision === 'NEEDS_REVISION' && !decisionComment.trim())}
                        onClick={() => decideMutation.mutate({ decision: pendingDecision, comment: decisionComment || undefined })}
                      >
                        {decideMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Подтвердить
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setPendingDecision(null); setDecisionComment(''); }}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Status actions ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Banner for initiator when document returned for revision */}
              {doc.status === 'NEEDS_REVISION' && isCreator && (() => {
                const revisionEntry = [...(doc.approvals || [])].reverse().find((a) => a.decision === 'NEEDS_REVISION');
                return (
                  <div className="p-3 rounded-md bg-orange-50 border border-orange-200 space-y-1">
                    <p className="text-sm font-medium text-orange-800 flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4" />
                      Документ возвращён на доработку
                    </p>
                    {revisionEntry?.comment && (
                      <p className="text-xs text-orange-700">«{revisionEntry.comment}»</p>
                    )}
                    {revisionEntry && (
                      <p className="text-xs text-orange-600">{getFullName(revisionEntry.user)} · {formatDate(revisionEntry.createdAt)}</p>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2 flex-wrap">
                {/* Special button: send to review (DRAFT or NEEDS_REVISION: creator or admin) */}
                {(doc.status === 'DRAFT' || doc.status === 'NEEDS_REVISION') && (isCreator || isAdmin) && (
                  <Button size="sm" onClick={() => setShowReviewDialog(true)}>
                    <ChevronRight className="w-3.5 h-3.5" />
                    {doc.status === 'NEEDS_REVISION' ? 'Повторно отправить на согласование' : 'Отправить на согласование'}
                  </Button>
                )}

                {/* Generic transitions */}
                {transitions.map((t) => (
                  <Button
                    key={t.value}
                    size="sm"
                    variant={t.value === 'REJECTED' ? 'destructive' : t.value === 'SIGNED' ? 'default' : 'outline'}
                    onClick={() => setPendingStatus(t.value)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>

              {/* No actions available */}
              {transitions.length === 0 && !(['DRAFT', 'NEEDS_REVISION'].includes(doc.status) && (isCreator || isAdmin)) && (
                <p className="text-xs text-muted-foreground">Нет доступных действий</p>
              )}

              {/* Confirm panel for generic transition */}
              {pendingStatus && (
                <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                  <p className="text-sm font-medium">
                    {transitions.find((t) => t.value === pendingStatus)?.label}
                  </p>
                  <Textarea
                    placeholder="Комментарий (необязательно)"
                    rows={2}
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => statusMutation.mutate({ status: pendingStatus, comment: statusComment || undefined })}
                      disabled={statusMutation.isPending}
                    >
                      {statusMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                      Подтвердить
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setPendingStatus(''); setStatusComment(''); }}>
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Комментарии ({doc.comments?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {doc.comments?.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {c.author.lastName?.charAt(0)}{c.author.firstName?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{getFullName(c.author)}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</p>
                    </div>
                    <p className="text-sm mt-1">{c.text}</p>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex gap-3">
                <Textarea
                  placeholder="Написать комментарий..."
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button
                  size="sm"
                  className="self-end"
                  disabled={!comment.trim() || commentMutation.isPending}
                  onClick={() => commentMutation.mutate(comment)}
                >
                  {commentMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Отправить
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">
          {/* Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Вложения ({doc.attachments?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentsPanel
                documentId={doc.id}
                attachments={doc.attachments ?? []}
              />
            </CardContent>
          </Card>

          {/* Final document */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="w-4 h-4" />
                Итоговый документ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!FINAL_STATUSES.includes(doc.status) ? (
                <p className="text-xs text-muted-foreground">
                  Документ должен быть согласован или подписан.
                </p>
              ) : !(doc.attachments ?? []).some((a) => a.mimeType === 'application/pdf') ? (
                <p className="text-xs text-muted-foreground">
                  Прикрепите PDF-файл для формирования итогового документа.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Исходный PDF с листом согласования в конце.
                  </p>
                  <Button size="sm" className="w-full" onClick={handleDownloadFinal} disabled={downloadingFinal}>
                    {downloadingFinal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {downloadingFinal ? 'Формирование...' : 'Скачать итоговый документ'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Approvals history (legacy / final decisions) */}
          {doc.approvals && doc.approvals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">История решений</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {doc.approvals.map((a) => (
                  <div key={a.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      {['APPROVED', 'SIGNED'].includes(a.decision) ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      ) : a.decision === 'NEEDS_REVISION' ? (
                        <RotateCcw className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      )}
                      <span className="font-medium">{getFullName(a.user)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-5">
                      {DOCUMENT_STATUS_LABELS[a.decision] || a.decision} · {formatDate(a.createdAt)}
                    </p>
                    {a.comment && <p className="text-xs ml-5 mt-1 text-muted-foreground italic">«{a.comment}»</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                История действий
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {doc.activities?.map((a) => {
                const Icon = ACTION_ICONS[a.action] || Activity;
                return (
                  <div key={a.id} className="flex items-start gap-2 text-sm">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs">
                        <span className="font-medium">{getFullName(a.user)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit for review dialog */}
      <SubmitForReviewDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        documentId={doc.id}
        documentTitle={doc.title}
      />
    </div>
  );
}
