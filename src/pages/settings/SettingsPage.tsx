import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tighter">Configurações</h1>

      <Tabs defaultValue="project" className="space-y-4">
        <TabsList className="bg-muted/50 h-9">
          <TabsTrigger value="project" className="text-xs">Projeto</TabsTrigger>
          <TabsTrigger value="omie" className="text-xs">Omie</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs">Categorias</TabsTrigger>
          <TabsTrigger value="ia" className="text-xs">IA</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs">Alertas</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs">Orçamento</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Usuários</TabsTrigger>
          <TabsTrigger value="portal" className="text-xs">Portal</TabsTrigger>
          <TabsTrigger value="widgets" className="text-xs">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-card space-y-4 max-w-2xl">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Dados do Projeto</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Nome do Projeto</Label>
                <Input defaultValue="São Francisco de Paula - 64 Casas" className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Município</Label>
                <Input defaultValue="São Francisco de Paula" className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Quantidade de Casas</Label>
                <Input type="number" defaultValue={64} className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Data Início</Label>
                <Input type="date" defaultValue="2026-03-09" className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Quinzena Atual</Label>
                <Select defaultValue="Q1">
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i} value={`Q${i + 1}`}>Q{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select defaultValue="ativo">
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm">Salvar Alterações</Button>
          </div>
        </TabsContent>

        <TabsContent value="ia" className="space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-card space-y-6 max-w-2xl">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Limiares da IA</p>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs">Score Mínimo para Fila</Label>
                <Slider defaultValue={[40]} max={100} step={5} className="w-full" />
                <p className="text-xs text-muted-foreground font-mono">0.40</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Score Alta Confiança</Label>
                <Slider defaultValue={[85]} max={100} step={5} className="w-full" />
                <p className="text-xs text-muted-foreground font-mono">0.85</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Score Auto-Aprovação</Label>
                <Slider defaultValue={[95]} max={100} step={5} className="w-full" />
                <p className="text-xs text-muted-foreground font-mono">0.95</p>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Auto-aprovação ativa?</Label>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Incluir exemplos de correção no prompt?</Label>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Other tabs with placeholder content */}
        {['omie', 'categories', 'alerts', 'budget', 'users', 'portal', 'widgets'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <div className="bg-card border rounded-xl p-6 shadow-card max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Configurações de {tab.charAt(0).toUpperCase() + tab.slice(1)} — em desenvolvimento (Etapa 8)
              </p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
