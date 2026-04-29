'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { FileText, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email('Некорректный email'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: data.email });
      setDone(true);
      if (res.data.devResetToken) {
        setDevToken(res.data.devResetToken);
      }
    } catch {
      toast.error('Произошла ошибка. Попробуйте позже.');
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
                <div className="text-4xl">{devToken ? '🛠️' : '📬'}</div>
                <p className="text-white font-semibold text-lg">{devToken ? 'Dev-режим' : 'Проверьте почту'}</p>
                <p className="text-slate-400 text-sm">
                  {devToken
                    ? 'SMTP не настроен — токен показан ниже. В production письмо придёт на почту.'
                    : 'Если указанный email зарегистрирован, вы получите письмо со ссылкой для сброса пароля. Проверьте папку «Входящие» и «Спам».'}
                </p>
              </div>
              {devToken && (
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 space-y-2">
                  <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide">Dev mode — SMTP не настроен</p>
                  <p className="text-slate-300 text-xs break-all font-mono">{devToken}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-700/50 text-amber-400 hover:bg-amber-900/30"
                    onClick={() => router.push(`/reset-password?token=${devToken}`)}
                  >
                    Сбросить пароль сейчас
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
            <CardTitle className="text-white text-center">Забыли пароль?</CardTitle>
            <CardDescription className="text-center text-slate-400">
              Введите email — мы отправим ссылку для сброса пароля
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Отправить ссылку
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-700 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Вернуться к входу
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
