'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@stemacademia.com', password: 'admin123' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch {
      toast.error('Неверный email или пароль');
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
            <CardTitle className="text-white text-center">Вход в систему</CardTitle>
            <CardDescription className="text-center text-slate-400">
              Введите учётные данные для доступа
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
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-blue-400 transition-colors">
                  Забыли пароль?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Войти
              </Button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-sm text-slate-400">Нет аккаунта? </span>
              <Link href="/register" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Зарегистрироваться
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center mb-2">Тестовые аккаунты:</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-500">
                <span>admin@stemacademia.com</span><span>admin123</span>
                <span>manager@stemacademia.ru</span><span>user123</span>
                <span>accountant@stemacademia.ru</span><span>user123</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
