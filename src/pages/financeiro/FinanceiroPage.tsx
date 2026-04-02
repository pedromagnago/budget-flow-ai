import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PipelineFinanceiro } from '@/components/financeiro/PipelineFinanceiro';
import { PlanejamentoTab } from '@/components/financeiro/PlanejamentoTab';
import { LancamentosTable } from '@/components/financeiro/LancamentosTable';

export default function FinanceiroPage() {
  const [tab, setTab] = useState('pipeline');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Pipeline, títulos a pagar/receber e previsões do planejamento.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="a-pagar">A Pagar</TabsTrigger>
          <TabsTrigger value="a-receber">A Receber</TabsTrigger>
          <TabsTrigger value="previsoes">Previsões</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <PipelineFinanceiro tipo="despesa" />
        </TabsContent>

        <TabsContent value="a-pagar">
          <LancamentosTable tipo="despesa" />
        </TabsContent>

        <TabsContent value="a-receber">
          <LancamentosTable tipo="receita" />
        </TabsContent>

        <TabsContent value="previsoes">
          <PlanejamentoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
