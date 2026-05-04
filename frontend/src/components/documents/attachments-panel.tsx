'use client';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Attachment } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Upload, Trash2, Loader2,
  FileText, FileImage, FileSpreadsheet, File, RefreshCw, AlertTriangle, Eye,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PdfPreviewDialog } from './pdf-preview-dialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.zip';
const MAX_MB = 10;

const RESET_STATUSES = ['REVIEW', 'APPROVED'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <FileImage className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />;
  if (mime.includes('spreadsheet') || mime.includes('excel')) return <FileSpreadsheet className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />;
  if (mime === 'application/pdf') return <FileText className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />;
  return <File className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />;
}

interface Props {
  documentId: string;
  attachments: Attachment[];
  canReplace?: boolean;
  docStatus?: string;
}

export function AttachmentsPanel({ documentId, attachments, canReplace = false, docStatus = '' }: Props) {
  const qc = useQueryClient();
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replacingAtt, setReplacingAtt] = useState<Attachment | null>(null);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null);

  const willResetApprovals = RESET_STATUSES.includes(docStatus);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post(`/documents/${documentId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Файл прикреплён');
      qc.invalidateQueries({ queryKey: ['document', documentId] });
      if (uploadRef.current) uploadRef.current.value = '';
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Ошибка загрузки файла');
      if (uploadRef.current) uploadRef.current.value = '';
    },
  });

  const replaceMutation = useMutation({
    mutationFn: ({ attId, file }: { attId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return api.patch(`/documents/${documentId}/attachments/${attId}/replace`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      const msg = willResetApprovals
        ? 'Файл заменён. Документ переведён в черновик — согласование сброшено.'
        : 'Файл заменён';
      toast.success(msg);
      setReplacingAtt(null);
      qc.invalidateQueries({ queryKey: ['document', documentId] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      if (replaceRef.current) replaceRef.current.value = '';
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Ошибка замены файла');
      setReplacingAtt(null);
      if (replaceRef.current) replaceRef.current.value = '';
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${documentId}/attachments/${id}`),
    onSuccess: () => {
      toast.success('Файл удалён');
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ['document', documentId] });
    },
    onError: () => {
      toast.error('Ошибка удаления');
      setDeletingId(null);
    },
  });

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Файл слишком большой. Максимум ${MAX_MB} МБ`);
      if (uploadRef.current) uploadRef.current.value = '';
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleReplaceClick = (att: Attachment) => {
    setReplacingAtt(att);
    if (willResetApprovals) {
      setShowResetWarning(true);
    } else {
      replaceRef.current?.click();
    }
  };

  const handleConfirmReplace = () => {
    setShowResetWarning(false);
    replaceRef.current?.click();
  };

  const handleCancelReplace = () => {
    setShowResetWarning(false);
    setReplacingAtt(null);
  };

  const handleReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingAtt) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Файл слишком большой. Максимум ${MAX_MB} МБ`);
      if (replaceRef.current) replaceRef.current.value = '';
      return;
    }
    replaceMutation.mutate({ attId: replacingAtt.id, file });
  };

  return (
    <>
      <input ref={uploadRef} type="file" accept={ACCEPT} className="hidden"
        onChange={handleUploadChange} disabled={uploadMutation.isPending} />
      <input ref={replaceRef} type="file" accept={ACCEPT} className="hidden"
        onChange={handleReplaceFileChange} disabled={replaceMutation.isPending} />

      <div className="space-y-3">
        {/* Upload */}
        <div>
          <Button variant="outline" size="sm" className="w-full"
            disabled={uploadMutation.isPending} onClick={() => uploadRef.current?.click()}>
            {uploadMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Upload className="w-3.5 h-3.5" />}
            {uploadMutation.isPending ? 'Загрузка...' : 'Прикрепить файл'}
          </Button>
          <p className="text-[10px] text-muted-foreground mt-1 text-center">
            PDF, Word, Excel, изображения · до {MAX_MB} МБ
          </p>
        </div>

        {/* List */}
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Нет вложений</p>
        ) : (
          <div className="space-y-1">
            {attachments.map((att) => {
              const isPdf = att.mimeType === 'application/pdf';
              const isBeingReplaced = replacingAtt?.id === att.id && replaceMutation.isPending;
              const isBeingDeleted = deletingId === att.id;

              return (
                <div key={att.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group">
                  <FileIcon mime={att.mimeType} />
                  <div className="flex-1 min-w-0">
                    <a
                      href={`${API_URL}/api/documents/${documentId}/attachments/${att.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-primary hover:underline truncate block"
                      title={att.originalName}
                    >
                      {att.originalName}
                    </a>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(att.size)}</p>
                  </div>

                  {/* Preview — only for PDFs */}
                  {isPdf && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Просмотреть PDF"
                      onClick={() => setPreviewAtt(att)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Replace */}
                  {canReplace && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
                      title="Заменить файл"
                      disabled={isBeingReplaced || isBeingDeleted || replaceMutation.isPending}
                      onClick={() => handleReplaceClick(att)}
                    >
                      {isBeingReplaced
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RefreshCw className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    title="Удалить"
                    disabled={isBeingDeleted || isBeingReplaced}
                    onClick={() => { setDeletingId(att.id); deleteMutation.mutate(att.id); }}
                  >
                    {isBeingDeleted
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PDF Preview Dialog */}
      {previewAtt && (
        <PdfPreviewDialog
          open={!!previewAtt}
          onOpenChange={(open) => { if (!open) setPreviewAtt(null); }}
          documentId={documentId}
          attachmentId={previewAtt.id}
          filename={previewAtt.originalName}
        />
      )}

      {/* Reset warning dialog */}
      <Dialog open={showResetWarning} onOpenChange={(open) => { if (!open) handleCancelReplace(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              Замена файла сбросит согласование
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              Документ находится в статусе{' '}
              <span className="font-medium text-foreground">
                {docStatus === 'REVIEW' ? '«На рассмотрении»' : '«Согласован»'}
              </span>.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Текущее согласование будет сброшено</li>
              <li>Документ перейдёт в статус <span className="font-medium text-foreground">«Черновик»</span></li>
              <li>Потребуется заново отправить на согласование</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Заменить файл{replacingAtt ? ` «${replacingAtt.originalName}»` : ''}?
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleCancelReplace}>
              Отмена
            </Button>
            <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={handleConfirmReplace}>
              Заменить файл
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
