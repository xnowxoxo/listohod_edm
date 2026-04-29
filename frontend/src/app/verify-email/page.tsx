'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const schema = z.object({
  token: z.string().min(1, 'Введите токен подтверждения'),
});
type FormData = z.infer<typeof schema>;

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Auto-fill token from URL and auto-verify
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setValue('token', token);
      verify(token);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async (token: string) => {
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { token });
      setStatus('success');
      toast.success('Email подтверждён!');
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ошибка подтверждения';
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (data: FormData) => verify(data.token);

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
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-center">Подтверждение email</CardTitle>
            <CardDescription className="text-center text-slate-400">
              {status === 'idle' && 'Вставьте токен из письма или перейдите по ссылке'}
              {status === 'success' && 'Аккаунт подтверждён'}
              {status === 'error' && 'Не удалось подтвердить'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'success' ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle className="w-12 h-12 text-emerald-400" />
                <p className="text-slate-300 text-center">
                  Email успешно подтверждён. Перенаправляем на страницу входа...
                </p>
                <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300">
                  Войти сейчас
                </Link>
              </div>
            ) : status === 'error' ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <XCircle className="w-12 h-12 text-red-400" />
                <p className="text-red-300 text-center text-sm">{errorMsg}</p>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                  onClick={() => setStatus('idle')}
                >
                  Попробовать снова
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300" htmlFor="token">Токен подтверждения</Label>
                  <Input
                    id="token"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 font-mono text-sm"
                    {...register('token')}
                  />
                  {errors.token && <p className="text-red-400 text-xs">{errors.token.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Подтвердить
                </Button>
              </form>
            )}

            {status === 'idle' && (
              <div className="mt-4 pt-4 border-t border-slate-700 text-center">
                <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Вернуться к входу
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
