export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  REVIEW: 'На рассмотрении',
  APPROVED: 'Согласован',
  SIGNED: 'Подписан',
  REJECTED: 'Отклонён',
  NEEDS_REVISION: 'На доработке',
  ARCHIVED: 'Архив',
};

export const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-stone-50 text-stone-500 border border-stone-200',
  REVIEW: 'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED: 'bg-teal-50 text-teal-700 border border-teal-200',
  SIGNED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  REJECTED: 'bg-red-50 text-red-600 border border-red-200',
  NEEDS_REVISION: 'bg-orange-50 text-orange-700 border border-orange-200',
  ARCHIVED: 'bg-stone-50 text-stone-400 border border-stone-200',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CONTRACT: 'Договор',
  INVOICE: 'Счёт-фактура',
  ACT: 'Акт',
  SPECIFICATION: 'Спецификация',
  LETTER: 'Письмо',
  ORDER: 'Приказ',
  OTHER: 'Прочее',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  ACCOUNTANT: 'Бухгалтер',
  VIEWER: 'Наблюдатель',
};

export const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-teal-50 text-teal-700 border border-teal-200',
  MANAGER: 'bg-amber-50 text-amber-700 border border-amber-200',
  ACCOUNTANT: 'bg-orange-50 text-orange-700 border border-orange-200',
  VIEWER: 'bg-stone-50 text-stone-500 border border-stone-200',
};

// Generic status transitions available via PATCH /documents/:id/status.
// DRAFT→REVIEW and NEEDS_REVISION→REVIEW: uses POST /documents/:id/submit-for-review (separate dialog).
// REVIEW→APPROVED/REJECTED/NEEDS_REVISION: uses POST /documents/:id/decide (approval chain).
export const STATUS_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  DRAFT: [
    { value: 'ARCHIVED', label: 'Архивировать' },
  ],
  REVIEW: [
    { value: 'DRAFT', label: 'Отозвать' },
  ],
  APPROVED: [
    { value: 'SIGNED', label: 'Подписать' },
    { value: 'REJECTED', label: 'Отклонить' },
  ],
  SIGNED: [
    { value: 'ARCHIVED', label: 'Архивировать' },
  ],
  REJECTED: [
    { value: 'DRAFT', label: 'Вернуть в черновик' },
    { value: 'ARCHIVED', label: 'Архивировать' },
  ],
  NEEDS_REVISION: [
    { value: 'DRAFT', label: 'Вернуть в черновик' },
  ],
  ARCHIVED: [
    { value: 'DRAFT', label: 'Разархивировать' },
  ],
};
