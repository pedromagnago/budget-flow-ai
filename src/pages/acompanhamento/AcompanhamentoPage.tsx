import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AvancoFisicoTab } from '@/components/planejamento/AvancoFisicoTab';
import { MedicoesTab } from '@/components/planejamento/MedicoesTab';
import { AprovacoesTab } from '@/components/acompanhamento/AprovacoesTab';
import { ControleServicosTab } from '@/components/acompanhamento/ControleServicosTab';

export default function AcompanhamentoPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tighter">Acompanhamento da Obra</h1>
        <p className="text-sm text-muted-foreground">Avanço físico, medições, aprovações e controle de serviços.</p>
      </div>

      <Tabs defaultValue="aprovacoes" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
          <TabsTrigger value="avanco">Avanço Físico</TabsTrigger>
          <TabsTrigger value="medicoes">Medições</TabsTrigger>
          <TabsTrigger value="controle">Controle de Serviços</TabsTrigger>
        </TabsList>

        <TabsContent value="aprovacoes"><AprovacoesTab /></TabsContent>
        <TabsContent value="avanco"><AvancoFisicoTab /></TabsContent>
        <TabsContent value="medicoes"><MedicoesTab /></TabsContent>
        <TabsContent value="controle"><ControleServicosTab /></TabsContent>
      </Tabs>
    </div>
  );
}
