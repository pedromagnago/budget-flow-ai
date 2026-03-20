import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EtapasOrcamentoTab } from '@/components/planejamento/EtapasOrcamentoTab';
import { VisaoGeralTab } from '@/components/planejamento/VisaoGeralTab';
import { ServicosTab } from '@/components/planejamento/ServicosTab';
import { QuickActionBar } from '@/components/planejamento/QuickActionBar';

export default function PlanejamentoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tighter">Planejamento da Obra</h1>

      <QuickActionBar />

      <Tabs defaultValue="etapas" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="etapas">Etapas e Orçamento</TabsTrigger>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="etapas"><EtapasOrcamentoTab /></TabsContent>
        <TabsContent value="servicos"><ServicosTab /></TabsContent>
        <TabsContent value="visao-geral"><VisaoGeralTab /></TabsContent>
      </Tabs>
    </div>
  );
}
