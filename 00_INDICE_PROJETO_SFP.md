# Projeto São Francisco de Paula — Controle Orçamentário Inteligente

> Sistema de controle Orçado × Realizado para o projeto de construção de 64 casas em São Francisco de Paula/RS.
> Integra Excel (orçamento-base), Omie ERP (realizado) e IA (classificação automática) numa plataforma web unificada.

---

## Documentos do Projeto

| # | Arquivo | Conteúdo | Quando usar |
|---|---|---|---|
| 00 | `00_INDICE_PROJETO_SFP.md` | Este índice — visão geral, glossário, princípios | Sempre |
| 01 | `01_PROJETO_CONTEXTO.md` | Contexto do projeto, stakeholders, problema, dados de referência | Sempre |
| 02 | `02_ARQUITETURA_SISTEMA.md` | 6 módulos, stack, jornadas, fluxos, segurança, roadmap | Sempre |
| 03 | `03_DATABASE_SCHEMA.md` | Schema completo Supabase — tabelas, views, triggers, RLS, Edge Functions | Desenvolvimento |
| 04 | `04_IA_CLASSIFICACAO.md` | Lógica da IA classificadora, prompts, consumo de orçamento, saldo remanescente | Desenvolvimento |
| 05 | `05_CONFIGURACOES_PLATAFORMA.md` | Tudo que é configurável via interface (sem código), parâmetros, limiares | Operação |

---

## Resumo Executivo

**O que é:** Plataforma web que automatiza o controle financeiro de obra, conectando o orçamento original (Excel) ao realizado (Omie ERP), com IA que processa documentos do cliente e mantém o fluxo de caixa futuro atualizado.

**Problema que resolve:** Hoje o controle depende de uma pessoa (Ana) que manualmente substitui previsões por dados reais no Omie, gerando gargalo, retrabalho e risco de erro. O gestor de obra (Sucopira) não consegue enxergar o projeto inteiro em tempo real para negociar com fornecedores.

**Diferencial:** O cliente (gestor de obra) faz upload de um documento → a IA classifica, cruza com o orçamento, calcula saldo remanescente → o time FullBPO audita e aprova → o Omie é atualizado automaticamente → o dashboard reflete a realidade em tempo real.

**Stack:** React + TypeScript + Supabase (Postgres + Edge Functions + Auth + Storage) + Claude API

**Regra de ouro do projeto:**
```
Orçado = Consumido (real) + Saldo futuro (previsão ajustada)
O total nunca muda — o que muda é a composição entre real e previsto.
```

---

## Números do Projeto

| Métrica | Valor |
|---|---|
| Casas | 64 |
| Localização | São Francisco de Paula — RS |
| Início de obras | 09/03/2026 |
| Horizonte | ~10 quinzenas (até jul/2026) |
| Orçamento total saídas | ~R$ 20,7 milhões |
| Entradas previstas (medições) | ~R$ 8,0 milhões |
| Grupos orçamentários | 29 (+ 3 especiais) |
| Itens na BASE_CAIXA | 644 lançamentos |
| Lançamentos no Omie | 685 (582 previsão + 103 reais) |
| Match categorias Excel↔Omie | 29/32 direto (90%) |

---

## Stakeholders

| Papel | Quem | O que faz no sistema |
|---|---|---|
| Cliente (gestor de obra) | Gestão Sucopira | Faz upload de docs, vê dashboard resumido, acompanha execução |
| Operador FullBPO | Ana Aquino | Audita classificações da IA, aprova/corrige/rejeita, monitora desvios |
| Supervisor FullBPO | Filipe / Pedro | Visão executiva, alertas de desvio, decisões estratégicas |
| Investidor | FM Soluções em Bebidas | Recebe relatórios periódicos (fase futura) |

---

## Princípios Não Negociáveis

1. **Orçado = Consumido + Saldo futuro** — o total orçamentário é imutável (salvo revisão formal)
2. **RLS em 100% das tabelas** — isolamento multi-tenant obrigatório
3. **Soft delete** — nunca deletar dados financeiros
4. **Audit log** — toda ação (IA, humano, automação) rastreada
5. **IA sempre auditada** — nenhuma classificação vira definitiva sem aprovação humana
6. **Omie é destino final** — o sistema propõe, o Omie consolida
7. **TypeScript strict** — nunca usar `any`
8. **Configurável sem código** — limiares, categorias, alertas ajustáveis via interface

---

## Glossário

| Termo | Significado |
|---|---|
| Orçado | Valor original do orçamento de composição (Excel). Linha de base fixa. |
| Previsto | Lançamento no Omie com fornecedor "PREVISÃO" — valor esperado futuro |
| Realizado | Lançamento no Omie com fornecedor real — compra/pagamento efetivo |
| Saldo remanescente | Orçado − Realizado = valor que continua como previsão futura |
| Consumo | Ato de substituir previsão por real. Pode ser parcial. |
| Departamento (Omie) | Equivale a "Apropriação" no Excel. Ex: "3.18 ELETRICA EFIAÇÃO + TOMADAS" |
| Categoria (Omie) | Equivale a "Tipo" no Excel. Ex: "Tubos e conexoes", "MAO DE OBRA" |
| Grupo (Excel) | Agrupamento macro. Ex: "RADIER - 44,38 M²", "GESTÃO LOCAL" |
| Quinzena | Período de controle do cronograma (Q1 a Q10) |
| Curva S | Gráfico de evolução acumulada orçado vs realizado ao longo do tempo |
| De-para | Tabela de mapeamento entre estruturas do Excel e do Omie |
| Score de confiança | Nota 0-1 da IA sobre sua certeza na classificação |
| Fila de auditoria | Lista de propostas da IA aguardando aprovação do time FullBPO |
