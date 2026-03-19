import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VisaoGeralTab } from '@/components/planejamento/VisaoGeralTab';
import { ServicosTab } from '@/components/planejamento/ServicosTab';
import { MedicoesTab } from '@/components/planejamento/MedicoesTab';
import { AvancoFisicoTab } from '@/components/planejamento/AvancoFisicoTab';
import { ImpactoFinanceiroTab } from '@/components/planejamento/ImpactoFinanceiroTab';
import { QuickActionBar } from '@/components/planejamento/QuickActionBar';

export default function PlanejamentoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tighter">Obra</h1>

      <QuickActionBar />

      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
          <TabsTrigger value="medicoes">Medições</TabsTrigger>
          <TabsTrigger value="avanco">Avanço Físico</TabsTrigger>
          <TabsTrigger value="impacto">Impacto Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral"><VisaoGeralTab /></TabsContent>
        <TabsContent value="servicos"><ServicosTab /></TabsContent>
        <TabsContent value="medicoes"><MedicoesTab /></TabsContent>
        <TabsContent value="avanco"><AvancoFisicoTab /></TabsContent>
        <TabsContent value="impacto"><ImpactoFinanceiroTab /></TabsContent>
      </Tabs>
    </div>
  );
}
