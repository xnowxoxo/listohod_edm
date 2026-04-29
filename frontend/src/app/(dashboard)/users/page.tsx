'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { User } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, UserCheck, UserX, Plus, Loader2, Trash2 } from 'lucide-react';
import { formatDate, getInitials, getFullName } from '@/lib/utils';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';
import { useAuthStore } from '@/store/auth';

const createSchema = z.object({
  firstName: z.string().min(1, 'Введите имя'),
  lastName: z.string().min(1, 'Введите фамилию'),
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
  role: z.enum(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER']),
  position: z.string().optional(),
  department: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const isAdmin = currentUser?.role === 'ADMIN';
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
    enabled: isAdmin,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'VIEWER' },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['users'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => api.post('/users', data),
    onSuccess: () => {
      toast.success('Пользователь создан');
      invalidateAll();
      setCreateOpen(false);
      reset({ role: 'VIEWER' });
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg || 'Ошибка создания'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}`, { isActive }),
    onSuccess: () => {
      toast.success('Обновлено');
      invalidateAll();
    },
    onError: () => toast.error('Ошибка'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/users/${id}`, { role }),
    onSuccess: () => {
      toast.success('Роль изменена');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Ошибка изменения роли'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('Пользователь удалён');
      setConfirmDeleteId(null);
      invalidateAll();
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg || 'Ошибка удаления'));
      setConfirmDeleteId(null);
    },
  });

  if (!isAdmin) {
    return (
      <div className="p-6 flex flex-col items-center gap-4 text-muted-foreground">
        <Users className="w-12 h-12 opacity-20" />
        <p>Недостаточно прав для просмотра этого раздела</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Пользователи</h1>
          <p className="text-muted-foreground text-sm">{users?.length ?? 0} пользователей</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Создать пользователя
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex gap-4 items-center">
                  <div className="w-10 h-10 bg-muted rounded-sm" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-28" />
                  </div>
                </div>
              ))}
            </div>
          ) : !users?.length ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Users className="w-10 h-10 opacity-30" />
              <p>Пользователи не найдены</p>
            </div>
          ) : (
            <div className="divide-y">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isConfirmingDelete = confirmDeleteId === u.id;

                return (
                  <div key={u.id} className="flex items-center gap-4 px-6 py-4">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center text-sm font-bold flex-shrink-0 ${u.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {getInitials(u.firstName, u.lastName)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{getFullName(u)}</p>
                        {isSelf && (
                          <span className="text-xs px-2 py-0.5 rounded-sm bg-blue-100 text-blue-700 font-medium">Вы</span>
                        )}
                        {!u.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-sm bg-red-100 text-red-600 font-medium">Деактивирован</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {u.email}
                        {u.department ? ` · ${u.department}` : ''}
                        {u.position ? ` · ${u.position}` : ''}
                      </p>
                    </div>

                    {/* Role selector */}
                    <div className="flex-shrink-0 w-40">
                      {!isSelf ? (
                        <Select
                          value={u.role}
                          onValueChange={(role) => roleMutation.mutate({ id: u.id, role })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS).map(([val, label]) => (
                              <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-xs text-muted-foreground hidden lg:block">{formatDate(u.createdAt)}</p>

                      {!isSelf && (
                        <>
                          {/* Deactivate / Activate */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })}
                            className={u.isActive
                              ? 'text-amber-600 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:text-emerald-600 hover:bg-emerald-50'}
                          >
                            {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            <span className="hidden sm:inline">{u.isActive ? 'Деактивировать' : 'Активировать'}</span>
                          </Button>

                          {/* Delete — disabled if user has documents */}
                          {(() => {
                            const docCount = u._count?.createdDocuments ?? 0;
                            const canDelete = docCount === 0;

                            if (!canDelete) {
                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled
                                  className="text-muted-foreground opacity-40 cursor-not-allowed"
                                  title={`Нельзя удалить: пользователь создал ${docCount} документ(ов). Оставьте деактивированным.`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              );
                            }

                            if (isConfirmingDelete) {
                              return (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground hidden sm:inline">Удалить?</span>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => deleteMutation.mutate(u.id)}
                                  >
                                    {deleteMutation.isPending
                                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      : 'Да'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setConfirmDeleteId(null)}
                                  >
                                    Нет
                                  </Button>
                                </div>
                              );
                            }

                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDeleteId(u.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Удалить пользователя навсегда"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) reset({ role: 'VIEWER' }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Создать пользователя</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input id="lastName" placeholder="Иванов" {...register('lastName')} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Имя</Label>
                <Input id="firstName" placeholder="Иван" {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cu-email">Email</Label>
              <Input id="cu-email" type="email" placeholder="user@company.ru" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cu-password">Пароль</Label>
              <Input id="cu-password" type="password" placeholder="Минимум 6 символов" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Роль</Label>
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cu-department">Отдел</Label>
                <Input id="cu-department" placeholder="Например: Бухгалтерия" {...register('department')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cu-position">Должность</Label>
                <Input id="cu-position" placeholder="Например: Менеджер" {...register('position')} />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Пользователь, созданный администратором, может сразу войти в систему без подтверждения email.
            </p>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Создать
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
