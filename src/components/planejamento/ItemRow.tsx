import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useUpdateItemServico, useDeleteItemServico } from '@/hooks/usePlanejamentoHierarquico';
import { useFornecedores } from '@/hooks/useFornecedores';
import { useFormasPagamento } from '@/hooks/useFormasPagamento';
import type { ItemPlanejamento } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  item: ItemPlanejamento;
}

export function ItemRow({ item }: Props) {
  const { data: fornecedores } = useFornecedores();
  const { data: formasPgto } = useFormasPagamento();
  const updateItem = useUpdateItemServico();
  const deleteItem = useDeleteItemServico();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({
    item: item.item,
    quantidade_total: String(item.quantidade_total ?? ''),
    custo_unitario: String(item.custo_unitario ?? ''),
    fornecedor_id: item.fornecedor_id ?? '',
    forma_pagamento_id: item.forma_pagamento_id ?? '',
  });

  const qty = item.quantidade_total ?? 0;
  const unitPrice = item.custo_unitario ?? 0;
  const total = qty * unitPrice;

  const fornecedorNome = fornecedores?.find(f => f.id === item.fornecedor_id)?.razao_social;
  const formaPgtoNome = formasPgto?.find(fp => fp.id === item.forma_pagamento_id)?.nome;

  async function handleSave() {
    const newQty = parseFloat(values.quantidade_total) || 0;
    const newUnit = parseFloat(values.custo_unitario) || 0;
    await updateItem.mutateAsync({
      id: item.id,
      item: values.item,
      quantidade_total: newQty,
      custo_unitario: newUnit,
      fornecedor_id: values.fornecedor_id || null,
      forma_pagamento_id: values.forma_pagamento_id || null,
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="grid grid-cols-[1fr_80px_100px_120px_140px_140px_60px] gap-2 items-center py-2 px-3 bg-primary/5 rounded-md text-xs">
        <Input
          className="h-7 text-xs"
          value={values.item}
          onChange={e => setValues(v => ({ ...v, item: e.target.value }))}
          autoFocus
        />
        <Input
          className="h-7 text-xs text-right"
          type="number"
          value={values.quantidade_total}
          onChange={e => setValues(v => ({ ...v, quantidade_total: e.target.value }))}
        />
        <Input
          className="h-7 text-xs text-right"
          type="number"
          step="0.01"
          value={values.custo_unitario}
          onChange={e => setValues(v => ({ ...v, custo_unitario: e.target.value }))}
        />
        <span className="font-mono text-right text-xs font-medium">
          {formatCurrency((parseFloat(values.quantidade_total) || 0) * (parseFloat(values.custo_unitario) || 0))}
        </span>
        <Select value={values.fornecedor_id} onValueChange={v => setValues(f => ({ ...f, fornecedor_id: v }))}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {(fornecedores ?? []).map(f => (
              <SelectItem key={f.id} value={f.id} className="text-xs">{f.razao_social}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={values.forma_pagamento_id} onValueChange={v => setValues(f => ({ ...f, forma_pagamento_id: v }))}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {(formasPgto ?? []).map(fp => (
              <SelectItem key={fp.id} value={fp.id} className="text-xs">{fp.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave}>
            <span className="text-xs">✓</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(false)}>
            <span className="text-xs">✕</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_80px_100px_120px_140px_140px_60px] gap-2 items-center py-2 px-3 rounded-md hover:bg-muted/30 group text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <Package className="h-3 w-3 text-muted-foreground/40 shrink-0" />
        <span className="truncate">{item.item}</span>
        {item.unidade && <Badge variant="outline" className="text-[9px] h-4 shrink-0">{item.unidade}</Badge>}
      </div>
      <span className="font-mono text-right">{qty}</span>
      <span className="font-mono text-right">{formatCurrency(unitPrice)}</span>
      <span className={cn('font-mono text-right font-medium', total > 0 && 'text-foreground')}>
        {formatCurrency(total)}
      </span>
      <span className="truncate text-muted-foreground">{fornecedorNome ?? '—'}</span>
      <span className="truncate text-muted-foreground">{formaPgtoNome ?? '—'}</span>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
          setValues({
            item: item.item,
            quantidade_total: String(item.quantidade_total ?? ''),
            custo_unitario: String(item.custo_unitario ?? ''),
            fornecedor_id: item.fornecedor_id ?? '',
            forma_pagamento_id: item.forma_pagamento_id ?? '',
          });
          setEditing(true);
        }}>
          <Pencil className="h-2.5 w-2.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deleteItem.mutate(item.id)}>
          <Trash2 className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}
