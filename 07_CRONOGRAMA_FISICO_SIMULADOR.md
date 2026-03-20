# Projeto SFP — M7 Cronograma Físico + M8 Simulador de Cenários

> Este documento detalha os dois módulos adicionais que conectam o avanço físico da obra ao fluxo financeiro, e permitem simulação de negociações sem afetar o orçamento-base.

---

## M7 — Cronograma Físico da Obra

### Problema que resolve

As medições contratuais (receitas do projeto) são liberadas por **conclusão física de etapas**. Cada serviço tem uma meta: "50% do Radier concluído = libera R$ 584k na Medição 1". Se a obra atrasa, a medição não é liberada, e a receita empurra para frente — afetando diretamente o fluxo de caixa.

Hoje esse controle é manual e desconectado do financeiro. O resultado: o fluxo projeta recebimentos que podem não acontecer no prazo.

### Conceito central

```
Medição liberada = todos os serviços vinculados àquela medição atingiram a meta física
Meta física = % de casas com aquele serviço concluído
```

### Estrutura de dados (8 medições × 32 serviços)

Extraído do planejamento real:

| Serviço | Medição 1 | Medição 2 | Medição 3 | Medição 4 | Medição 5 | Medição 6 | Medição 7 | Medição 8 |
|---|---|---|---|---|---|---|---|---|
| Instalações/Canteiros | 100% | — | — | — | — | — | — | — |
| Fundação Radier | 50% | 50% | — | — | — | — | — | — |
| Hidrosanitário Radier | 50% | 50% | — | — | — | — | — | — |
| Administração obra | 12.5% | 12.5% | 12.5% | 12.5% | 12.5% | 12.5% | 12.5% | 12.5% |
| Paredes pré-moldadas | — | — | 31.25% | 31.25% | 37.5% | — | — | — |
| Estrutura telhado | — | — | 31.25% | 31.25% | 37.5% | — | — | — |
| Impermeabilização | — | — | 25% | 25% | 25% | 25% | — | — |
| Revestimentos | — | — | 25% | 25% | 25% | 25% | — | — |
| Portas internas | — | — | — | — | 50% | 50% | — | — |
| Elétrica | — | — | — | — | — | — | 50% | 50% |
| Pintura interna | — | — | — | — | — | — | 50% | 50% |
| Limpeza final | — | — | — | — | — | — | 50% | 50% |
| (demais 20 serviços) | ... | ... | ... | ... | ... | ... | ... | ... |

### Valor de cada medição (baseado no planejamento)

| Medição | Data planejada | Valor (R$) | Serviços vinculados |
|---|---|---|---|
| 1 | 31/03 → 15/04 | 855.078 | Canteiros, Radier (50%), Admin (12.5%) |
| 2 | 31/03 → 15/04 | 758.705 | Radier (50%), Locação, Ensaios, Admin |
| 3 | 31/03 → 15/04 | 1.110.680 | Paredes, Telhado, Barrilete, Impermeab., Azulejos, Admin |
| 4 | 31/03 → 15/04 | 1.219.494 | Paredes, Telhado, Energia, Caixas, Admin |
| 5 | 16/04 → 30/04 | 1.842.454 | Paredes, Portas, Janelas, Esquadrias, Admin |
| 6 | 01/05 → 15/05 | 838.687 | Louças, Metais, Calçada, Portas ext., Admin |
| 7 | 16/05 → 31/05 | 419.605 | Elétrica, Quadros, Pintura, Luminárias, Admin |
| 8 | 01/07 → 15/07 | 315.299 | Elétrica, Pintura, Limpeza, Admin |

### Tabelas no Supabase

```sql
-- Serviços do cronograma físico
CREATE TABLE cronograma_servicos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  nome            TEXT NOT NULL,                -- ex: "FUNDAÇAO RADIER"
  preco_unitario  NUMERIC(15,2),                -- preço por casa
  quantidade      INTEGER DEFAULT 64,           -- casas
  valor_total     NUMERIC(15,2) NOT NULL,       -- preço × quantidade
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Metas por medição (% de conclusão necessária)
CREATE TABLE medicoes_metas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  servico_id      UUID NOT NULL REFERENCES cronograma_servicos(id),
  medicao_numero  INTEGER NOT NULL CHECK (medicao_numero BETWEEN 1 AND 12),
  meta_percentual NUMERIC(5,4) NOT NULL,        -- ex: 0.5000 = 50%
  meta_casas      INTEGER,                      -- ex: 32 (calculado)
  valor_liberado  NUMERIC(15,2),                -- meta × valor_total
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, servico_id, medicao_numero)
);

-- Medições planejadas (datas e valores agregados)
CREATE TABLE medicoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  numero          INTEGER NOT NULL,
  data_inicio     DATE NOT NULL,
  data_fim        DATE NOT NULL,
  valor_planejado NUMERIC(15,2) NOT NULL,       -- soma dos valores_liberados dos serviços
  status          TEXT DEFAULT 'futura'
                  CHECK (status IN ('futura','em_andamento','liberada','parcial','atrasada')),
  valor_liberado  NUMERIC(15,2) DEFAULT 0,      -- quanto efetivamente foi liberado
  data_liberacao  DATE,                          -- quando foi liberada de fato
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, numero)
);

-- Avanço físico real (registro periódico)
CREATE TABLE avanco_fisico (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  servico_id      UUID NOT NULL REFERENCES cronograma_servicos(id),
  data_registro   DATE NOT NULL DEFAULT CURRENT_DATE,
  casas_concluidas INTEGER NOT NULL DEFAULT 0,   -- quantas casas têm esse serviço pronto
  percentual_real NUMERIC(5,4),                  -- casas_concluidas / total (GENERATED)
  registrado_por  UUID REFERENCES auth.users(id),
  observacoes     TEXT,
  fotos           TEXT[],                        -- paths no Storage
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, servico_id, data_registro)
);
```

### Lógica de impacto no fluxo de caixa

```typescript
// Para cada medição futura, verificar se metas físicas serão atingidas
function calcularMedicaoProjetada(medicao: Medicao, avancosAtuais: AvancoFisico[]): MedicaoProjetada {
  const metasDestaMedicao = getMetas(medicao.numero)
  
  let todosAtendem = true
  let percentualMedioAtingido = 0
  
  for (const meta of metasDestaMedicao) {
    const avancoAtual = avancosAtuais.find(a => a.servico_id === meta.servico_id)
    const percentualAtual = avancoAtual?.percentual_real || 0
    
    if (percentualAtual < meta.meta_percentual) {
      todosAtendem = false
    }
    percentualMedioAtingido += percentualAtual / meta.meta_percentual
  }
  
  percentualMedioAtingido /= metasDestaMedicao.length
  
  return {
    medicao_numero: medicao.numero,
    valor_planejado: medicao.valor_planejado,
    metas_atingidas: todosAtendem,
    percentual_medio: percentualMedioAtingido,
    // Se não atende, estimar quando vai atingir (baseado na velocidade de avanço)
    data_estimada_liberacao: todosAtendem 
      ? medicao.data_fim 
      : estimarDataConclusao(metasDestaMedicao, avancosAtuais),
    status: todosAtendem ? 'no_prazo' : 'em_risco'
  }
}
```

### Interface do módulo

**Tela principal:** `/schedule`

**Visão 1 — Grid de avanço:**
Tabela com serviços nas linhas, medições nas colunas. Cada célula mostra: meta (%) / real (%). Cor: verde (atingiu), amarelo (em andamento), vermelho (atrasado), cinza (futuro).

O cliente ou o operador pode atualizar o avanço: clicar na célula → informar quantas casas estão concluídas naquele serviço.

**Visão 2 — Timeline:**
Gráfico de Gantt simplificado: barras por serviço, mostrando planejado vs real. Medições como marcos verticais. Visualmente claro onde está o atraso.

**Visão 3 — Impacto no fluxo:**
Ao lado da timeline, o fluxo de caixa mostrando: receitas planejadas (linha tracejada) vs receitas projetadas pelo avanço real (linha sólida). Se um atraso empurra uma medição, a receita desloca no gráfico.

---

## M8 — Simulador de Cenários (What-If)

### Problema que resolve

O gestor de obra precisa testar negociações antes de fechar: "Se eu conseguir 30/60/90 com a concreteira em vez de à vista, o caixa aguenta?". Hoje ele faz isso mentalmente ou numa planilha paralela. Precisa ser direto no sistema, sem afetar o orçamento-base nem os dados reais.

### Conceito central

```
Cenário = cópia editável das previsões futuras
Alterações no cenário NÃO afetam o orçamento-base nem o Omie
O cenário recalcula o fluxo de caixa em tempo real
Cenários podem ser comparados lado a lado
```

### Tabelas no Supabase

```sql
-- Cenários nomeados
CREATE TABLE cenarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  nome            TEXT NOT NULL,                 -- ex: "Negociação concreteira 30/60/90"
  descricao       TEXT,
  tipo            TEXT DEFAULT 'custom'
                  CHECK (tipo IN ('base','otimista','pessimista','custom')),
  ativo           BOOLEAN DEFAULT true,
  criado_por      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ajustes dentro de um cenário (cada ajuste é uma mudança vs base)
CREATE TABLE cenario_ajustes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  cenario_id      UUID NOT NULL REFERENCES cenarios(id),
  tipo_ajuste     TEXT NOT NULL CHECK (tipo_ajuste IN (
    'mudar_data_vencimento',        -- empurrar/antecipar pagamento
    'mudar_valor',                  -- desconto ou aumento negociado
    'parcelar',                     -- transformar à vista em parcelas
    'mudar_condicao_pagamento',     -- ex: boleto → cartão
    'adiar_medicao',                -- medição atrasa por avanço físico
    'adicionar_lancamento',         -- gasto não previsto
    'remover_lancamento'            -- cancelamento de compra
  )),
  -- Referência ao item afetado
  referencia_tipo TEXT CHECK (referencia_tipo IN ('orcamento_item','omie_lancamento','medicao')),
  referencia_id   UUID,
  -- Valores do ajuste
  campo_alterado  TEXT,                          -- ex: "data_vencimento", "valor"
  valor_original  TEXT,                          -- valor antes do ajuste
  valor_novo      TEXT,                          -- valor após ajuste
  -- Para parcelamento
  parcelas        JSONB,                         -- [{valor, data_vencimento}]
  -- Metadata
  justificativa   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Como funciona a simulação

**Passo 1:** Usuário cria um cenário (ou usa o "Base" gerado automaticamente).

**Passo 2:** Na tela do simulador, ele vê a lista de previsões futuras (vindas do orçamento + Omie). Cada linha é editável:
- Arrastar data de vencimento (calendário inline)
- Editar valor (input numérico)
- Botão "Parcelar" → abre modal pra definir parcelas
- Botão "Remover" → marca como cancelado neste cenário

**Passo 3:** A cada alteração, o sistema recalcula o fluxo de caixa do cenário em tempo real:

```typescript
function calcularFluxoCenario(
  cenarioId: string,
  orcamentoItems: OrcamentoItem[],
  omieLancamentos: OmieLancamento[],
  medicoes: MedicaoProjetada[],
  ajustes: CenarioAjuste[]
): FluxoCaixaDiario[] {
  
  // 1. Começar com o fluxo base (realizado + previsões)
  let lancamentos = [...getLancamentosRealizados(), ...getPrevisoesFuturas()]
  
  // 2. Aplicar ajustes do cenário
  for (const ajuste of ajustes) {
    switch (ajuste.tipo_ajuste) {
      case 'mudar_data_vencimento':
        // Move o lançamento para nova data
        const lanc = lancamentos.find(l => l.id === ajuste.referencia_id)
        if (lanc) lanc.data_vencimento = ajuste.valor_novo
        break
        
      case 'mudar_valor':
        // Altera o valor
        const lanc2 = lancamentos.find(l => l.id === ajuste.referencia_id)
        if (lanc2) lanc2.valor = parseFloat(ajuste.valor_novo)
        break
        
      case 'parcelar':
        // Remove original e adiciona parcelas
        lancamentos = lancamentos.filter(l => l.id !== ajuste.referencia_id)
        for (const parcela of ajuste.parcelas) {
          lancamentos.push({ ...parcela, cenario: true })
        }
        break
        
      case 'adiar_medicao':
        // Move receita da medição para nova data
        const med = lancamentos.find(l => 
          l.tipo === 'receber' && l.medicao_numero === ajuste.referencia_id
        )
        if (med) med.data_vencimento = ajuste.valor_novo
        break
    }
  }
  
  // 3. Incluir receitas projetadas (ajustadas pelo avanço físico)
  for (const medicao of medicoes) {
    const ajusteMedicao = ajustes.find(a => 
      a.tipo_ajuste === 'adiar_medicao' && a.referencia_id === medicao.id
    )
    lancamentos.push({
      tipo: 'receber',
      valor: medicao.valor_planejado,
      data_vencimento: ajusteMedicao?.valor_novo || medicao.data_estimada_liberacao,
      descricao: `Medição ${medicao.medicao_numero}`,
      cenario: true
    })
  }
  
  // 4. Calcular saldo acumulado dia a dia
  return calcularFluxoDiario(lancamentos, saldoInicial)
}
```

**Passo 4:** Comparação de cenários — tela com gráfico de linhas sobrepostas (fluxo de caixa de cada cenário):
- Linha base (tracejada cinza)
- Cenário A (sólida azul)
- Cenário B (sólida verde)
- Destaque em vermelho nos dias com saldo negativo

### Interface do módulo

**Tela principal:** `/simulator`

**Lado esquerdo:** Lista de previsões futuras (editáveis)
- Cada linha: fornecedor, valor, data, departamento
- Ações inline: editar data, editar valor, parcelar, remover
- Código de cores: azul = previsão original, verde = já alterado neste cenário

**Lado direito:** Gráfico de fluxo de caixa recalculado em tempo real
- Eixo X: dias/quinzenas
- Eixo Y: saldo acumulado
- Linha vermelha pontilhada: saldo zero (limiar de perigo)
- Cards resumo: saldo mínimo, data do pior dia, dias com saldo negativo

**Barra superior:** Selector de cenário (dropdown) + botão "Novo cenário" + botão "Comparar cenários"

---

## Configurações (sem código) — Adições ao documento 05

### Cronograma físico (`/settings/schedule`)

| Configuração | Tipo | Default | Descrição |
|---|---|---|---|
| Quem pode registrar avanço | select | operador + cliente | Roles que podem informar % conclusão |
| Frequência sugerida de atualização | select | Semanal | Lembrete para atualizar avanço |
| Alerta de atraso físico | slider (dias) | 7 | Após X dias sem avanço em serviço ativo → alerta |
| Impacto automático no fluxo | toggle | Ligado | Se ligado, atraso físico ajusta datas de medição automaticamente |
| Requer foto como evidência | toggle | Desligado | Se ligado, registro de avanço exige foto |

### Simulador de cenários (`/settings/simulator`)

| Configuração | Tipo | Default | Descrição |
|---|---|---|---|
| Cenários simultâneos máximos | número | 5 | Limite de cenários ativos por projeto |
| Cenário "Base" automático | toggle | Ligado | Gera cenário base a partir do fluxo atual |
| Quem pode criar cenários | select | supervisor + super_admin | Roles permitidos |
| Quem pode ver cenários | select | todos | Roles que enxergam a aba simulador |
| Saldo inicial para simulação | número | R$ 720.000 | Saldo de caixa no início do projeto |

---

## Impacto nos documentos anteriores

### Schema (03_DATABASE_SCHEMA.md) — adicionar:
- `cronograma_servicos` (32 serviços)
- `medicoes_metas` (32 × 8 = ~256 registros)
- `medicoes` (8 medições)
- `avanco_fisico` (registros periódicos)
- `cenarios` (cenários nomeados)
- `cenario_ajustes` (alterações por cenário)

### Arquitetura (02_ARQUITETURA_SISTEMA.md) — adicionar:
- M7 na sequência entre M3 e M6
- M8 como módulo independente ligado ao dashboard
- Jornada "Registrar avanço físico"
- Jornada "Simular negociação"

### Views materializadas — adicionar:
- `v_medicoes_projetadas` — cruza metas com avanço real e projeta datas de liberação
- `v_fluxo_caixa_cenario` — fluxo recalculado por cenário ativo

### Dashboard M6 — adicionar widgets:
- Avanço físico geral (% do projeto)
- Medições: status (liberada, em risco, futura)
- Saldo mínimo projetado (do cenário ativo)
- Comparativo de cenários (mini-gráfico)

### Configurações (05_CONFIGURACOES_PLATAFORMA.md) — adicionar:
- Seção "Cronograma Físico"
- Seção "Simulador de Cenários"
