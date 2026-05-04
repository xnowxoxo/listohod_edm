'use client';
import { useState, useEffect } from 'react';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    return JSON.parse(raw).state?.token ?? null;
  } catch {
    return null;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentId: string;
  attachmentId: string;
  filename: string;
}

export function PdfPreviewDialog({ open, onOpenChange, documentId, attachmentId, filename }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // Revoke blob URL when dialog closes to free memory
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const token = getToken();
    fetch(
      `${API_URL}/api/documents/${documentId}/attachments/${attachmentId}/download`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error('Не удалось загрузить файл');
        const blob = await res.blob();
        // Ensure browser treats this as PDF regardless of response headers
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        setBlobUrl(URL.createObjectURL(pdfBlob));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId, attachmentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full" style={{ height: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <DialogHeader className="px-5 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="truncate">{filename}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm">Загрузка документа...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground text-center px-6">
                <AlertCircle className="w-8 h-8 text-destructive" />
                <p className="text-sm font-medium text-destructive">Ошибка загрузки</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

          {blobUrl && !loading && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={filename}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
