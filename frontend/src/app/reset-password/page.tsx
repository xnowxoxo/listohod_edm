'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { FileText, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const schema = z.object({
  password: z.string().min(6, 'Минимум 6 символов'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error('Токен не найден. Перейдите по ссылке из письма.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setDone(true);
      toast.success('Пароль изменён!');
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ошибка сброса пароля';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

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
            <CardTitle className="text-white text-center">Новый пароль</CardTitle>
            <CardDescription className="text-center text-slate-400">
              {done ? 'Пароль успешно изменён' : 'Придумайте новый пароль для вашего аккаунта'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle className="w-12 h-12 text-emerald-400" />
                <p className="text-slate-300 text-center">
                  Пароль успешно изменён. Перенаправляем на страницу входа...
                </p>
                <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300">
                  Войти сейчас
                </Link>
              </div>
            ) : (
              <>
                {!token && (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                    <p className="text-red-400 text-sm">
                      Токен не найден. Перейдите по ссылке из письма или запросите новую.
                    </p>
                  </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300" htmlFor="password">Новый пароль</Label>
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
                  <Button type="submit" className="w-full" disabled={loading || !token}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Сохранить пароль
                  </Button>
                </form>
                <div className="mt-4 pt-4 border-t border-slate-700 text-center">
                  <Link href="/forgot-password" className="text-sm text-slate-400 hover:text-white transition-colors">
                    Запросить новую ссылку
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
