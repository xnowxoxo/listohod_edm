'use client';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Attachment } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Paperclip, Upload, Trash2, Loader2,
  FileText, FileImage, FileSpreadsheet, File,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.zip';
const MAX_MB = 10;

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
}

export function AttachmentsPanel({ documentId, attachments }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      if (inputRef.current) inputRef.current.value = '';
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Ошибка загрузки файла');
      if (inputRef.current) inputRef.current.value = '';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Файл слишком большой. Максимум ${MAX_MB} МБ`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFileChange}
          disabled={uploadMutation.isPending}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={uploadMutation.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
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
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group"
            >
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
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                title="Удалить"
                disabled={deletingId === att.id}
                onClick={() => handleDelete(att.id)}
              >
                {deletingId === att.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
