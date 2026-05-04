'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { User } from '@/types';
import { ROLE_LABELS } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X, GripVertical, UserCheck, Plus } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentId: string;
  documentTitle: string;
}

export function SubmitForReviewDialog({ open, onOpenChange, documentId, documentTitle }: Props) {
  const qc = useQueryClient();
  const [approvers, setApprovers] = useState<User[]>([]);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (approverIds: string[]) =>
      api.post(`/documents/${documentId}/submit-for-review`, { approverIds }),
    onSuccess: () => {
      toast.success('Документ отправлен на согласование');
      setApprovers([]);
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ['document', documentId] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      qc.invalidateQueries({ queryKey: ['my-docs-created'] });
      qc.invalidateQueries({ queryKey: ['my-docs-revision'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Ошибка отправки'),
  });

  const availableUsers = users.filter(
    (u) => u.isActive && !approvers.find((a) => a.id === u.id),
  );

  const addApprover = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) setApprovers((prev) => [...prev, user]);
  };

  const removeApprover = (userId: string) => {
    setApprovers((prev) => prev.filter((a) => a.id !== userId));
  };

  const handleSubmit = () => {
    if (approvers.length === 0) {
      toast.error('Укажите хотя бы одного согласующего');
      return;
    }
    mutation.mutate(approvers.map((a) => a.id));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!mutation.isPending) { setApprovers([]); onOpenChange(v); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Отправить на согласование</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground truncate">
            Документ: <span className="font-medium text-foreground">{documentTitle}</span>
          </p>

          {/* Add approver */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Добавить согласующего</p>
            <div className="flex gap-2">
              <Select onValueChange={addApprover} value="">
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={availableUsers.length ? 'Выберите пользователя...' : 'Все пользователи добавлены'} />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex flex-col">
                        <span>{u.lastName} {u.firstName}</span>
                        <span className="text-xs text-muted-foreground">
                          {ROLE_LABELS[u.role] || u.role}{u.position ? ` · ${u.position}` : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ordered approver chain */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Обязательные согласующие</p>

            {approvers.length === 0 ? (
              <div className="border border-dashed rounded-md p-6 text-center text-sm text-muted-foreground">
                <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Выберите согласующих выше.<br />
                Все получат запрос одновременно.
              </div>
            ) : (
              <div className="space-y-1.5">
                {approvers.map((approver, idx) => (
                  <div
                    key={approver.id}
                    className="flex items-center gap-3 p-2.5 border rounded-md bg-muted/30"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {approver.lastName} {approver.firstName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[approver.role] || approver.role}
                        {approver.position ? ` · ${approver.position}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => removeApprover(approver.id)}
                      className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground bg-emerald-50 border border-emerald-100 rounded-md p-2.5">
            Вы как инициатор автоматически включаетесь в лист согласования как подтвердивший документ.
          </p>

          {approvers.length > 0 && (
            <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-md p-2.5">
              Все {approvers.length === 1 ? '1 согласующий получит' : `${approvers.length} согласующих получат`} запрос одновременно и могут принимать решение независимо.
              Документ будет согласован только после подтверждения всеми участниками.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setApprovers([]); onOpenChange(false); }}
              disabled={mutation.isPending}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={approvers.length === 0 || mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Отправить на согласование
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
