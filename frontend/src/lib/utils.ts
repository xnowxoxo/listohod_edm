import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'd MMM yyyy', { locale: ru });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'd MMM yyyy, HH:mm', { locale: ru });
}

export function formatAmount(amount: number | string | null | undefined, currency = 'RUB'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function getInitials(firstName?: string, lastName?: string): string {
  return `${lastName?.charAt(0) || ''}${firstName?.charAt(0) || ''}`.toUpperCase();
}

export function getFullName(user?: { firstName?: string; lastName?: string; middleName?: string } | null): string {
  if (!user) return '—';
  return [user.lastName, user.firstName, user.middleName].filter(Boolean).join(' ');
}
