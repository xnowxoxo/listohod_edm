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
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center mb-4">
            <FileText className="w-5 h-5 text-teal-400" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">StemAcademia</h1>
          <p className="text-sm text-stone-500 mt-1">Электронный документооборот</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#e8e5e0] rounded-xl shadow-card p-7">
          <h2 className="text-base font-semibold text-stone-900 mb-5">Вход в систему</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-stone-700" htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@stemacademia.ru"
                className="border-[#d6d3d1] bg-white text-stone-900 placeholder:text-stone-400 focus-visible:border-teal-500 focus-visible:ring-1 focus-visible:ring-teal-500"
                {...register('email')}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-stone-700" htmlFor="password">Пароль</Label>
                <Link href="/forgot-password" className="text-xs text-stone-400 hover:text-teal-600 transition-colors">
                  Забыли пароль?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="border-[#d6d3d1] bg-white text-stone-900 placeholder:text-stone-400 focus-visible:border-teal-500 focus-visible:ring-1 focus-visible:ring-teal-500"
                {...register('password')}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full mt-1 bg-teal-600 hover:bg-teal-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Войти
            </Button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-5">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
              Зарегистрироваться
            </Link>
          </p>
        </div>

        {/* Admin account hint */}
        <div className="mt-5 px-1">
          <p className="text-xs text-stone-400 text-center mb-2">Аккаунт администратора</p>
          <div className="grid grid-cols-2 gap-x-4 text-xs text-stone-400">
            <span className="text-stone-500 font-medium">admin@stemacademia.com</span><span>admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
