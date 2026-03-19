import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TriggerResult } from '@/hooks/usePlanejamento';
import { formatCurrency } from '@/lib/formatters';

interface Props {
  result: TriggerResult;
  onNavigateImpacto?: () => void;
  onRequestEarlyMeasurement?: () => void;
  onDismiss: () => void;
}

export function ImpactBanner({ result, onNavigateImpacto, onRequestEarlyMeasurement, onDismiss }: Props) {
  if (result.type === 'none') return null;

  if (result.type === 'delay_detected') {
    return (
      <div className="bg-module-dashboard/10 border border-module-dashboard/30 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
        <AlertTriangle className="h-5 w-5 text-module-dashboard shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-module-dashboard">
            ⚠️ Desvio detectado em {result.servicoNome}: {result.desvioPercent}% abaixo da meta.
          </p>
          <p className="text-xs text-muted-foreground">
            Estimativa de {result.diasDesvio} dias de atraso.
            {result.lancamentosAfetados ? ` ${result.lancamentosAfetados} lançamentos podem ser afetados.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onNavigateImpacto && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onNavigateImpacto}>
              Ver impacto financeiro →
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  if (result.type === 'early_completion') {
    return (
      <div className="bg-consumido/10 border border-consumido/30 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
        <CheckCircle className="h-5 w-5 text-consumido shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-consumido">
            ✅ {result.servicoNome} concluído {result.diasAdiantamento} dias antes do prazo!
          </p>
          <p className="text-xs text-muted-foreground">
            Deseja antecipar a solicitação de medição?
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onRequestEarlyMeasurement && (
            <Button size="sm" variant="outline" className="h-7 text-xs border-consumido/50 text-consumido hover:bg-consumido/10" onClick={onRequestEarlyMeasurement}>
              Solicitar medição antecipada
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  if (result.type === 'partial_measurement') {
    return (
      <div className="bg-module-schedule/10 border border-module-schedule/30 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
        <Info className="h-5 w-5 text-module-schedule shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-module-schedule">
            Medição liberada com {formatCurrency(result.diferenca ?? 0)} abaixo do planejado.
          </p>
          <p className="text-xs text-muted-foreground">
            O lançamento de receita foi criado com o valor real. A diferença ficará como previsão na próxima medição.
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return null;
}
