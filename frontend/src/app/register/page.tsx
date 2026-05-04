'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const schema = z.object({
  firstName: z.string().min(1, 'Введите имя'),
  lastName: z.string().min(1, 'Введите фамилию'),
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [emailFailed, setEmailFailed] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      setDone(true);
      if (res.data.devVerificationToken) {
        setDevToken(res.data.devVerificationToken);
        // Если сообщение говорит о проблеме с письмом — помечаем
        if (res.data.message?.includes('не удалось отправить')) {
          setEmailFailed(true);
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ошибка регистрации';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">StemAcademia</h1>
          </div>
          <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="text-4xl">{devToken ? '🛠️' : '✉️'}</div>
                <p className="text-white font-semibold text-lg">Подтвердите email</p>
                <p className="text-slate-400 text-sm">
                  {devToken
                    ? 'SMTP не настроен — используется dev-режим. Токен показан ниже.'
                    : 'Письмо с ссылкой для подтверждения отправлено на вашу почту. Проверьте папку «Входящие» и «Спам».'}
                </p>
              </div>
              {devToken && (
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 space-y-2">
                  <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide">
                    {emailFailed ? 'Письмо не отправлено — подтвердите по ссылке' : 'Dev mode — SMTP не настроен'}
                  </p>
                  <p className="text-slate-300 text-xs break-all font-mono">{devToken}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-700/50 text-amber-400 hover:bg-amber-900/30"
                    onClick={() => router.push(`/verify-email?token=${devToken}`)}
                  >
                    Подтвердить сейчас
                  </Button>
                </div>
              )}
              <Link
                href="/login"
                className="block text-center text-sm text-slate-400 hover:text-white transition-colors"
              >
                Вернуться к входу
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">StemAcademia</h1>
            <p className="text-slate-400 text-sm mt-1">Система электронного документооборота</p>
          </div>
        </div>

        <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-center">Регистрация</CardTitle>
            <CardDescription className="text-center text-slate-400">
              Создайте аккаунт для доступа к системе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300" htmlFor="lastName">Фамилия</Label>
                  <Input
                    id="lastName"
                    placeholder="Иванов"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                    {...register('lastName')}
                  />
                  {errors.lastName && <p className="text-red-400 text-xs">{errors.lastName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300" htmlFor="firstName">Имя</Label>
                  <Input
                    id="firstName"
                    placeholder="Иван"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                    {...register('firstName')}
                  />
                  {errors.firstName && <p className="text-red-400 text-xs">{errors.firstName.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300" htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@stemacademia.ru"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  {...register('email')}
                />
                {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300" htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  {...register('password')}
                />
                {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300" htmlFor="confirmPassword">Повторите пароль</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && <p className="text-red-400 text-xs">{errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Создать аккаунт
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-700 text-center">
              <span className="text-sm text-slate-400">Уже есть аккаунт? </span>
              <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Войти
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
