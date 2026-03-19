import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CreditCard, HandCoins, TrendingUp, ArrowLeftRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LancamentosTable } from '@/components/financeiro/LancamentosTable';
import { PlanejamentoTab } from '@/components/financeiro/PlanejamentoTab';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function FinanceiroPage() {
  const [tab, setTab] = useState('pagar');
  const navigate = useNavigate();

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Gestão completa de contas a pagar, a receber e planejamento.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pagar">A Pagar</TabsTrigger>
          <TabsTrigger value="receber">A Receber</TabsTrigger>
          <TabsTrigger value="planejamento">Planejamento</TabsTrigger>
        </TabsList>

        <TabsContent value="pagar">
          <LancamentosTable tipo="despesa" />
        </TabsContent>

        <TabsContent value="receber">
          <LancamentosTable tipo="receita" />
        </TabsContent>

        <TabsContent value="planejamento">
          <PlanejamentoTab />
        </TabsContent>
      </Tabs>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
              <Plus className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            <DropdownMenuItem onClick={() => { setTab('pagar'); }}>
              <CreditCard className="h-4 w-4 mr-2" /> Registrar pagamento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setTab('receber'); }}>
              <HandCoins className="h-4 w-4 mr-2" /> Registrar recebimento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setTab('planejamento'); }}>
              <TrendingUp className="h-4 w-4 mr-2" /> Nova previsão
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/banking')}>
              <ArrowLeftRight className="h-4 w-4 mr-2" /> Nova transferência
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
