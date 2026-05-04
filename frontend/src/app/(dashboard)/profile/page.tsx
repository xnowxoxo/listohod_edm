'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, Shield, CheckCircle } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { getInitials, getFullName } from '@/lib/utils';

// ── Profile edit schema ──────────────────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(1, 'Введите имя'),
  lastName: z.string().min(1, 'Введите фамилию'),
  middleName: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

// ── Password change schema ───────────────────────────────────────────
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string().min(6, 'Минимум 6 символов'),
  confirmPassword: z.string().min(1, 'Подтвердите пароль'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});
type PasswordForm = z.infer<typeof passwordSchema>;

type Tab = 'profile' | 'security';

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profile');

  // ── Profile form ─────────────────────────────────────────────────
  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors, isDirty: profileDirty },
    reset: resetProfile,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      middleName: user?.middleName ?? '',
      position: user?.position ?? '',
      department: user?.department ?? '',
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.patch('/auth/me', data),
    onSuccess: async () => {
      await fetchMe();
      toast.success('Профиль обновлён');
      resetProfile();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Ошибка сохранения'),
  });

  // ── Password form ────────────────────────────────────────────────
  const {
    register: regPassword,
    handleSubmit: handlePassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) => api.patch('/auth/password', data),
    onSuccess: () => {
      toast.success('Пароль изменён');
      resetPassword();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Ошибка смены пароля'),
  });

  if (!user) return null;

  const initials = getInitials(user.firstName, user.lastName);

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-stone-900 tracking-tight">Профиль</h1>
        <p className="text-sm text-stone-400 mt-0.5">Управление личными данными и безопасностью</p>
      </div>

      {/* User card */}
      <div className="bg-white border border-[#e8e5e0] rounded-xl shadow-card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-teal-500/15 border-2 border-teal-400/30 flex items-center justify-center text-lg font-bold text-teal-600 flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-stone-900 leading-tight">{getFullName(user)}</p>
          <p className="text-sm text-stone-500 mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ROLE_COLORS[user.role] || 'bg-stone-50 text-stone-500'}`}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
            {user.isActive ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <CheckCircle className="w-3 h-3" /> Активен
              </span>
            ) : (
              <span className="text-[10px] text-red-500 font-medium">Деактивирован</span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-[10px] text-stone-400">Создан</p>
          <p className="text-xs text-stone-600 mt-0.5">{formatDate(user.createdAt)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e8e5e0]">
        {([
          { id: 'profile' as Tab, label: 'Основное', icon: User },
          { id: 'security' as Tab, label: 'Безопасность', icon: Shield },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-teal-500 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${tab === id ? 'text-teal-500' : 'text-stone-400'}`} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Profile ──────────────────────────────────────────── */}
      {tab === 'profile' && (
        <Card className="shadow-card">
          <CardHeader className="pb-4 border-b border-[#e8e5e0]">
            <CardTitle className="text-sm font-semibold text-stone-800">Личные данные</CardTitle>
            <p className="text-xs text-stone-400 mt-0.5">Имя, должность и контактная информация</p>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleProfile((d) => profileMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Фамилия</Label>
                  <Input id="lastName" placeholder="Иванов" {...regProfile('lastName')} />
                  {profileErrors.lastName && (
                    <p className="text-xs text-destructive">{profileErrors.lastName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Имя</Label>
                  <Input id="firstName" placeholder="Иван" {...regProfile('firstName')} />
                  {profileErrors.firstName && (
                    <p className="text-xs text-destructive">{profileErrors.firstName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="middleName">Отчество</Label>
                <Input id="middleName" placeholder="Иванович (необязательно)" {...regProfile('middleName')} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="department">Отдел</Label>
                  <Input id="department" placeholder="Например: Бухгалтерия" {...regProfile('department')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="position">Должность</Label>
                  <Input id="position" placeholder="Например: Менеджер" {...regProfile('position')} />
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <Button
                  type="submit"
                  disabled={profileMutation.isPending || !profileDirty}
                >
                  {profileMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Сохранить изменения
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Security ─────────────────────────────────────────── */}
      {tab === 'security' && (
        <Card className="shadow-card">
          <CardHeader className="pb-4 border-b border-[#e8e5e0]">
            <CardTitle className="text-sm font-semibold text-stone-800">Смена пароля</CardTitle>
            <p className="text-xs text-stone-400 mt-0.5">Минимум 6 символов. Рекомендуется использовать надёжный пароль.</p>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handlePassword((d) => passwordMutation.mutate(d))} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Текущий пароль</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Введите текущий пароль"
                  {...regPassword('currentPassword')}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Новый пароль</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Минимум 6 символов"
                  {...regPassword('newPassword')}
                />
                {passwordErrors.newPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Повторите новый пароль"
                  {...regPassword('confirmPassword')}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <div className="pt-1 flex justify-end">
                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Изменить пароль
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
