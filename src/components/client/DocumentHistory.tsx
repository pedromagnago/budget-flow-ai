import { useState } from 'react';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useDocuments, useDocumentClassification, type Documento } from '@/hooks/useDocuments';

export function DocumentHistory() {
  const { data: docs, isLoading } = useDocuments();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        Histórico de Envios
      </p>
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4"><SkeletonTable rows={4} cols={4} /></div>
        ) : (docs ?? []).length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">Nenhum documento enviado</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="w-8" />
                <th className="text-left py-2 px-3">Arquivo</th>
                <th className="text-left py-2 px-3">Data</th>
                <th className="text-right py-2 px-3">Tamanho</th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(docs ?? []).map(doc => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  expanded={expandedId === doc.id}
                  onToggle={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DocRow({ doc, expanded, onToggle }: { doc: Documento; expanded: boolean; onToggle: () => void }) {
  const sizeKb = doc.tamanho_bytes ? (doc.tamanho_bytes / 1024).toFixed(0) + ' KB' : '—';

  return (
    <>
      <tr
        className="border-t hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="py-2 px-2 text-center">
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </td>
        <td className="py-2 px-3 font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">{doc.nome_arquivo}</span>
        </td>
        <td className="py-2 px-3 text-muted-foreground">{formatDate(doc.created_at)}</td>
        <td className="py-2 px-3 text-right font-mono text-xs">{sizeKb}</td>
        <td className="py-2 px-3 text-center"><StatusBadge status={doc.status} /></td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={5} className="px-6 py-3">
            <ExpandedDetail documentId={doc.id} erro={doc.erro_detalhe} />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedDetail({ documentId, erro }: { documentId: string; erro: string | null }) {
  const { data: classification, isLoading } = useDocumentClassification(documentId);

  if (isLoading) return <p className="text-xs text-muted-foreground">Carregando classificação...</p>;

  if (!classification) {
    return (
      <div className="text-xs text-muted-foreground space-y-1">
        <p>Nenhuma classificação da IA encontrada para este documento.</p>
        {erro && <p className="text-destructive">Erro: {erro}</p>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 text-xs">
      <div>
        <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Fornecedor</p>
        <p>{classification.fornecedor_extraido ?? '—'}</p>
      </div>
      <div>
        <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Departamento</p>
        <p>{classification.departamento_proposto ?? '—'}</p>
      </div>
      <div>
        <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Categoria</p>
        <p>{classification.categoria_proposta ?? '—'}</p>
      </div>
      <div>
        <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Valor</p>
        <p className="font-mono">{classification.valor_extraido ? formatCurrency(classification.valor_extraido) : '—'}</p>
      </div>
      <div>
        <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Score IA</p>
        <ScoreBadge score={classification.score_confianca ?? 0} />
      </div>
      <div>
        <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Status Auditoria</p>
        <StatusBadge status={classification.status_auditoria} />
      </div>
      {classification.motivo_rejeicao && (
        <div className="col-span-3">
          <p className="text-destructive uppercase tracking-wider text-[10px] mb-1">Motivo da Rejeição</p>
          <p className="text-destructive/80">{classification.motivo_rejeicao}</p>
        </div>
      )}
    </div>
  );
}
