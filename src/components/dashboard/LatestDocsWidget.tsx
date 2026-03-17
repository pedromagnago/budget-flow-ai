import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/formatters';

interface Doc {
  id: string;
  nome_arquivo: string;
  status: string;
  created_at: string;
}

interface Props {
  documents: Doc[];
}

export function LatestDocsWidget({ documents }: Props) {
  return (
    <div className="bg-card border rounded-xl p-5 shadow-card">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
        Últimos Documentos
      </p>
      {documents.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum documento enviado</p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
              <div className="min-w-0">
                <p className="text-xs truncate">{doc.nome_arquivo}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{formatDate(doc.created_at)}</p>
              </div>
              <StatusBadge status={doc.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
