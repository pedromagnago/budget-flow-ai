import { useCallback, useState, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadDocument, validateFile } from '@/hooks/useUploadDocument';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function DocumentUploadZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMut = useUploadDocument();

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).forEach(file => {
      const err = validateFile(file);
      if (err) {
        toast.error(err);
        return;
      }
      uploadMut.mutate(file, {
        onSuccess: (r) => toast.success(`"${r.fileName}" enviado com sucesso`),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Erro no upload'),
      });
    });
  }, [uploadMut]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div
      className={cn(
        'bg-card border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer',
        isDragOver ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
      )}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.xml"
        multiple
        onChange={e => handleFiles(e.target.files)}
      />
      {uploadMut.isPending ? (
        <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-3" />
      ) : (
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
      )}
      <p className="text-sm font-medium">
        {uploadMut.isPending ? 'Enviando...' : 'Arraste documentos ou clique para selecionar'}
      </p>
      <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, XML — máximo 10MB</p>
      {!uploadMut.isPending && (
        <Button variant="outline" className="mt-4" size="sm" onClick={e => e.stopPropagation()}>
          <FileText className="h-4 w-4 mr-2" />
          Selecionar Arquivo
        </Button>
      )}
    </div>
  );
}
