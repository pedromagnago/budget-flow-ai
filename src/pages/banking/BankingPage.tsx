import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ContasTab } from '@/components/banking/ContasTab';
import { MovimentacoesTab } from '@/components/banking/MovimentacoesTab';
import { TransferenciasTab } from '@/components/banking/TransferenciasTab';
import { ConciliacaoTab } from '@/components/banking/ConciliacaoTab';

export default function BankingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tighter">Bancário</h1>

      <Tabs defaultValue="contas" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          <TabsTrigger value="transferencias">Transferências</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação</TabsTrigger>
        </TabsList>

        <TabsContent value="contas"><ContasTab /></TabsContent>
        <TabsContent value="movimentacoes"><MovimentacoesTab /></TabsContent>
        <TabsContent value="transferencias"><TransferenciasTab /></TabsContent>
        <TabsContent value="conciliacao"><ConciliacaoTab /></TabsContent>
      </Tabs>
    </div>
  );
}
