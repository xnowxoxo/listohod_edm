'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle, XCircle, Clock, FileText, Building2,
  Calendar, RotateCcw, AlertCircle, Loader2,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  REVIEW: 'На рассмотрении',
  APPROVED: 'Согласован',
  SIGNED: 'Подписан',
  REJECTED: 'Отклонён',
  NEEDS_REVISION: 'На доработке',
  ARCHIVED: 'Архив',
};

const TYPE_LABELS: Record<string, string> = {
  CONTRACT: 'Договор',
  INVOICE: 'Счёт-фактура',
  ACT: 'Акт',
  SPECIFICATION: 'Спецификация',
  LETTER: 'Письмо',
  ORDER: 'Приказ',
  OTHER: 'Прочее',
};

const STEP_STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Согласован',
  REJECTED: 'Отклонён',
  NEEDS_REVISION: 'На доработке',
  PENDING: 'Ожидает',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      timeZone: 'Asia/Almaty',
    });
  } catch { return iso; }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Almaty',
    });
  } catch { return iso; }
}

interface VerifyData {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
  counterparty?: string;
  createdAt: string;
  signedAt?: string;
  createdBy: { firstName: string; lastName: string };
  approvalSteps: {
    order: number;
    status: string;
    decidedAt?: string;
    comment?: string;
    approver: { firstName: string; lastName: string };
  }[];
}

function StatusBanner({ status }: { status: string }) {
  const isVerified = status === 'SIGNED' || status === 'APPROVED';
  const isRejected = status === 'REJECTED';

  if (isVerified) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
        <CheckCircle className="w-7 h-7 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="font-bold text-emerald-800 text-base">Документ подлинный</p>
          <p className="text-sm text-emerald-600 mt-0.5">
            Документ прошёл согласование в системе StemAcademia EDM
          </p>
        </div>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
        <XCircle className="w-7 h-7 text-red-500 flex-shrink-0" />
        <div>
          <p className="font-bold text-red-700 text-base">Документ отклонён</p>
          <p className="text-sm text-red-500 mt-0.5">Документ был отклонён в процессе согласования</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
      <Clock className="w-7 h-7 text-amber-500 flex-shrink-0" />
      <div>
        <p className="font-bold text-amber-700 text-base">Документ в обработке</p>
        <p className="text-sm text-amber-600 mt-0.5">Текущий статус: {STATUS_LABELS[status] || status}</p>
      </div>
    </div>
  );
}

function StepIcon({ status, order }: { status: string; order: number }) {
  if (order === 0) return <CheckCircle className="w-4 h-4 text-emerald-600" />;
  if (status === 'APPROVED') return <CheckCircle className="w-4 h-4 text-emerald-600" />;
  if (status === 'REJECTED') return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === 'NEEDS_REVISION') return <RotateCcw className="w-4 h-4 text-orange-500" />;
  return <Clock className="w-4 h-4 text-amber-400" />;
}

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<VerifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/verify/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || 'Документ не найден');
        }
        return res.json();
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-xl space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <p className="font-bold text-sm text-stone-900 leading-tight">StemAcademia</p>
            <p className="text-[11px] text-stone-500">Проверка подлинности документа</p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white border border-[#e8e5e0] rounded-xl p-10 flex flex-col items-center gap-3 shadow-card">
            <Loader2 className="w-7 h-7 animate-spin text-stone-400" />
            <p className="text-sm text-stone-400">Загружаем данные документа...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-white border border-[#e8e5e0] rounded-xl p-8 flex flex-col items-center gap-3 shadow-card text-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="font-semibold text-stone-700">Документ не найден</p>
            <p className="text-sm text-stone-400">{error}</p>
          </div>
        )}

        {/* Document info */}
        {data && !loading && (
          <>
            {/* Status banner */}
            <StatusBanner status={data.status} />

            {/* Document details */}
            <div className="bg-white border border-[#e8e5e0] rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e8e5e0] bg-[#faf9f7]">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Сведения о документе</p>
              </div>
              <div className="divide-y divide-[#f0ede8]">
                <Row label="Номер" value={data.number} />
                <Row label="Название" value={data.title} />
                <Row label="Тип" value={TYPE_LABELS[data.type] || data.type} />
                <Row label="Статус" value={STATUS_LABELS[data.status] || data.status} />
                {data.counterparty && <Row label="Контрагент" value={data.counterparty} />}
                <Row
                  label="Создан"
                  value={formatDateTime(data.createdAt)}
                  icon={<Calendar className="w-3.5 h-3.5 text-stone-400" />}
                />
                {data.createdBy && (
                  <Row label="Автор" value={`${data.createdBy.lastName} ${data.createdBy.firstName}`} />
                )}
                {data.signedAt && (
                  <Row
                    label="Подписан"
                    value={formatDate(data.signedAt)}
                    icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                  />
                )}
              </div>
            </div>

            {/* Approval chain */}
            {data.approvalSteps.length > 0 && (
              <div className="bg-white border border-[#e8e5e0] rounded-xl shadow-card overflow-hidden">
                <div className="px-5 py-4 border-b border-[#e8e5e0] bg-[#faf9f7]">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Маршрут согласования</p>
                </div>
                <div className="divide-y divide-[#f0ede8]">
                  {data.approvalSteps.map((step) => {
                    const isInitiator = step.order === 0;
                    const name = `${step.approver.lastName} ${step.approver.firstName}`;
                    return (
                      <div key={step.order} className="px-5 py-3 flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          <StepIcon status={step.status} order={step.order} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-stone-800">{name}</p>
                            {isInitiator && (
                              <span className="text-[10px] px-1.5 py-px bg-stone-100 text-stone-500 rounded-full">инициатор</span>
                            )}
                            <span className="text-[10px] px-1.5 py-px rounded-full font-medium bg-stone-50 text-stone-500 border border-stone-200">
                              {isInitiator ? 'Отправил' : STEP_STATUS_LABELS[step.status] || step.status}
                            </span>
                          </div>
                          {step.decidedAt && (
                            <p className="text-xs text-stone-400 mt-0.5">{formatDateTime(step.decidedAt)}</p>
                          )}
                          {step.comment && (
                            <p className="text-xs text-stone-500 mt-0.5 italic">«{step.comment}»</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <p className="text-center text-xs text-stone-400 pb-4">
              Страница сформирована автоматически системой StemAcademia EDM
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  label, value, icon,
}: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      {icon && <span className="mt-0.5 flex-shrink-0">{icon}</span>}
      <p className="text-xs text-stone-400 w-28 flex-shrink-0 mt-0.5">{label}</p>
      <p className="text-sm text-stone-800 font-medium flex-1">{value}</p>
    </div>
  );
}
