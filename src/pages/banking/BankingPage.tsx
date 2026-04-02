import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, PiggyBank, Wallet, CreditCard, TrendingUp } from 'lucide-react';
import { useContasSaldo } from '@/hooks/useBanking';
import { formatCurrency } from '@/lib/formatters';
import { ConciliacaoTab } from '@/components/banking/ConciliacaoTab';
import { MovimentacoesTab } from '@/components/banking/MovimentacoesTab';
import { cn } from '@/lib/utils';

const TIPO_ICONS: Record<string, React.ElementType> = {
  corrente: Building2,
  poupanca: PiggyBank,
  caixa: Wallet,
  cartao_credito: CreditCard,
  investimento: TrendingUp,
};

export default function BankingPage() {
  const { data: contas } = useContasSaldo();

  const saldoTotal = (contas ?? []).reduce((s, c) => s + c.saldo_atual, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tighter">Bancário</h1>
        <Badge variant="outline" className="font-mono text-sm px-3 py-1.5">
          Saldo Total: <span className={cn('ml-1.5 font-bold', saldoTotal >= 0 ? 'text-green-600' : 'text-destructive')}>{formatCurrency(saldoTotal)}</span>
        </Badge>
      </div>

      {/* Contas - barra horizontal compacta */}
      {(contas ?? []).length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {(contas ?? []).map(c => {
            const Icon = TIPO_ICONS[c.tipo] ?? Building2;
            const isNeg = c.saldo_atual < 0;
            return (
              <div key={c.id} className="flex items-center gap-3 min-w-[200px] bg-card border rounded-lg px-4 py-2.5 flex-shrink-0">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium truncate">{c.nome}</p>
                  <p className={cn('font-mono text-sm font-bold', isNeg ? 'text-destructive' : 'text-foreground')}>
                    {formatCurrency(c.saldo_atual)}
                  </p>
                </div>
                {c.pendentes_conciliacao > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
                    {c.pendentes_conciliacao}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Área principal */}
      <Tabs defaultValue="conciliacao" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conciliacao">Conciliação</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="conciliacao"><ConciliacaoTab /></TabsContent>
        <TabsContent value="movimentacoes"><MovimentacoesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
