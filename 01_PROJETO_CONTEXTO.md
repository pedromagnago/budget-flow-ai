# Projeto SFP — Contexto, Dados de Referência e Problema

## O Projeto

Construção de **64 casas populares** em São Francisco de Paula/RS, vinculado ao programa SEHAB/RS — Eldorado do Sul. O projeto é gerido pela Gestão Sucopira com apoio financeiro da FullBPO e investimento da FM Soluções em Bebidas.

**Escopo:** Material de construção — casa de 44,33m²  
**Início de obras:** 09/03/2026  
**Horizonte de execução:** ~5 meses (10 quinzenas)  
**Modelo financeiro:** Aportes do investidor + medições contratuais SEHAB

---

## Problema Central

### Situação atual (pré-sistema)
1. O orçamento de composição vive em **Excel** (64_CASAS_COMPOSICAO).
2. As previsões e lançamentos reais vivem no **Omie ERP**.
3. A **Ana Aquino** é o funil por onde tudo passa: recebe NFs/pedidos da obra → lança no Omie → substitui previsões pelo real → atualiza planilha.
4. O **Gestão Sucopira** precisa enxergar o projeto inteiro para negociar com fornecedores (concreteira, etc.) mas fica travado esperando atualização da Ana.
5. O volume de dados é pesado (~644 itens), o processo é manual e suscetível a erros.
6. Não há visão consolidada de "quanto do orçamento já consumi" vs "quanto ainda falta como previsão futura".

### Consequências
- Fluxo de caixa projetado fica negativo em R$ 4,5M sem visibilidade de quando/como ajustar
- Decisões de negociação com fornecedores são tomadas com dados desatualizados
- Retrabalho diário intenso, conforme registrado na Memória de Reuniões

---

## Dados de Referência — Orçamento (Excel)

### Estrutura hierárquica do orçamento

```
Grupo (macro)
  └── Apropriação (departamento)
        └── Tipo (categoria)
              └── Item (material/serviço específico)
```

**Exemplo:**
```
RADIER - 44,38 M² (Grupo)
  └── RADIER (Apropriação)
        └── MAO DE OBRA (Tipo)
              └── Mao de obra Terceirizada Radier (Item) — R$ 2.000/casa × 64 = R$ 128.000
        └── MADEIRA (Tipo)
              └── ripas de 5cm x 2,7m de 25mm (Item) — R$ 6/pç × 704 = R$ 4.224
        └── FERRAGEM (Tipo)
              └── Aço Tela Q-138 (Item)
```

### Grupos orçamentários (29 principais)

| Grupo | Valor Previsto (R$) | Qtd Itens |
|---|---|---|
| RECEITAS | 8.079.999,92 | 9 |
| SERVIÇOS | 5.780.911,36 | 10 |
| PAREDES (102,5m² de área interna e externa) | 2.555.746,80 | 59 |
| CAPITAL DE GIRO | 902.845,61 | 26 |
| RADIER - 44,38 M² | 668.329,04 | 42 |
| COBERTURA | 378.887,36 | 14 |
| ELETRICA EFIAÇÃO + TOMADAS | 235.497,66 | 72 |
| ESQUADRIAS EM ALUMINIO | 184.435,20 | 25 |
| PORTAS EXTERNAS | 161.857,92 | 20 |
| GESTÃO LOCAL | 152.460,00 | 39 |
| PISO E RODAPÉ | 151.145,73 | 14 |
| PINTURA INTERNA | 122.099,20 | 8 |
| LOUÇAS E METAIS | 120.264,32 | 64 |
| DESPESAS ACESSÓRIAS | 120.000,00 | 6 |
| CAIXAS DE INSPEÇÃO E GORDURA | 119.812,10 | 20 |
| (demais 14 grupos) | ~1.942.375,27 | ~216 |
| **TOTAL** | **~R$ 20.676.668** | **644** |

### Distribuição por quinzena

| Quinzena | Período | Valor Previsto (R$) |
|---|---|---|
| Q1 | 09/03 → 20/03 | 1.528.479 |
| Q2 | 23/03 → 03/04 | 500.390 |
| Q3 | 06/04 → 17/04 | 2.092.330 |
| Q4 | 20/04 → 01/05 | 2.485.813 |
| Q5 | 04/05 → 15/05 | 3.305.420 |
| Q6 | 18/05 → 29/05 | 3.441.749 |
| Q7 | 01/06 → 12/06 | 4.063.862 |
| Q8 | 15/06 → 26/06 | 1.775.626 |
| Q9 | 29/06 → 10/07 | 667.268 |
| Q10 | 13/07 → 24/07 | 815.731 |

### Entradas previstas (medições contratuais)

| Medição | Data | Valor (R$) |
|---|---|---|
| 1 (aporte investidor) | 27/02/2026 | 720.000 |
| 2 | 17/04/2026 | 855.078 |
| 3 | 01/05/2026 | 758.705 |
| 4 | 15/05/2026 | 1.110.680 |
| 5 | 29/05/2026 | 1.219.494 |
| 6 | 12/06/2026 | 1.842.454 |
| 7 | 26/06/2026 | 838.687 |
| 8 | 10/07/2026 | 419.605 |
| 9 | 24/07/2026 | 315.299 |
| **Total** | | **~R$ 8.080.000** |

---

## Dados de Referência — Omie (Realizado)

### Estrutura de dados do Omie (106 colunas, campos-chave)

| Campo Omie | Uso no sistema | Correspondência Excel |
|---|---|---|
| `Departamento` | Chave de cruzamento principal | `Apropriação` (sem prefixo numérico) |
| `Categoria` | Subclassificação | `Tipo` |
| `Tipo` (1. Contas a Receber / 2. Contas a Pagar) | Direção do fluxo | `Tipo_Fluxo` (Entrada/Saída) |
| `Valor da Conta` | Valor do lançamento | `Valor_Previsto` |
| `Situação` | Status do título | `Status` |
| `Cliente ou Fornecedor (Razão Social)` | Identifica previsão vs real | — |
| `Observação da Conta` | Descrição do item | `Item` |
| `Grupo` (Omie) | Classificação contábil | `Grupo` (Excel) |
| `Data de Vencimento` | Data esperada de pagamento | `Data_Prevista` |
| `Conciliado` | Status de conciliação | — |

### Mapeamento Departamento Omie ↔ Apropriação Excel

O Departamento no Omie tem prefixo numérico que deve ser removido para match:

```
Omie: "3.18 ELETRICA EFIAÇÃO + TOMADAS"  →  Excel: "ELETRICA EFIAÇÃO + TOMADAS"
Omie: "3.2 RADIER"                        →  Excel: "RADIER"
Omie: "3.3 PAREDES COM CONCRETO"          →  Excel: "PAREDES COM CONCRETO"
```

**29 de 32 categorias do Excel matcheiam direto.**

Categorias que precisam de mapeamento manual:

| Excel (sem match) | Mapeamento sugerido Omie |
|---|---|
| CAPITAL DE GIRO | 1. Adminstrativo (parcial) + Despesas Financeiras |
| RECEITAS | Receitas Diretas + Outras Entradas |
| SERVIÇOS | 3. Operação |

| Omie (sem match) | Mapeamento sugerido Excel |
|---|---|
| Adminstrativo | GESTÃO LOCAL (parcial) + DESPESAS ACESSÓRIAS (parcial) |
| Mobilização | GESTÃO LOCAL |
| Operação | SERVIÇOS |

### Padrão de identificação: Previsão vs Real

| Critério | Previsão | Real |
|---|---|---|
| Fornecedor (Razão Social) | `"PREVISAO"` | Nome real (ex: "PREVIBRAS", "JM FERRAGENS") |
| Quantidade no Omie | 582 linhas (85%) | 103 linhas (15%) |
| Valor total | R$ 2.028.625 | R$ 236.094 |
| Observação da Conta | Começa com "Conta a Pagar importada automaticamente..." | Texto livre ou extrato bancário |

### Exemplo concreto de consumo parcial

**PAREDES COM CONCRETO > FÁBRICA:**
```
Orçamento total (Excel):         R$ 2.048.000,34
Lançamentos reais (Previbras):   R$ 1.024.000,00 (4 títulos)
Previsões restantes no Omie:     R$ 1.024.000,35 (33 títulos)
                                 ─────────────────
Conferência: 1.024.000 + 1.024.000 ≈ 2.048.000 ✅
```

Essa é a lógica que o sistema precisa manter automaticamente.

---

## Fontes de Dados (Arquivos)

| Arquivo | Conteúdo | Tipo |
|---|---|---|
| `fluxo_caixa_diario_sao_francisco_v5_sem_tabelas.xlsx` | Fluxo de caixa operacional — BASE_CAIXA (644 itens), fluxo diário, saúde, conciliação | Orçamento + controle |
| `64_CASAS_COMPOSICAO_E_FLUXO_APORTES_X_RECEBIMENTOS_INVESTIDOR.xlsx` | Composição detalhada de custos, cronograma de pagamentos por quinzena, contratos específicos | Orçamento-base |
| `Base_-_Omie.xlsx` | Exportação completa do Omie — 685 lançamentos, 106 colunas | Realizado + previsões |
| `Memória_de_Reuniões.docx` | Transcrição de reunião (Ana Aquino + Gestão Sucopira) — detalhes de problemas operacionais | Contexto |

---

## Contas Bancárias (Omie)

| Conta | Uso | Lançamentos |
|---|---|---|
| Caixinha | Previsões e despesas operacionais | 599 |
| Caixa Econômica Federal | Operações bancárias principais | 47 |
| BRB - Banco de Brasília | Aportes e transações maiores | 23 |
| Cartão Marcelo - Comp 11 Venc 17 | Compras no cartão do gestor | 15 |

---

## Fornecedores Reais (já no Omie)

| Fornecedor | Departamento | Valor (R$) | Situação |
|---|---|---|---|
| PREVIBRAS SOLUCOES INDUSTRIAIS | Paredes com Concreto | -1.024.000 | 1 pago, 3 a vencer |
| JM FERRAGENS | Radier | -40.143 | A vencer |
| MARCELO DE ANGELO (cartão) | Radier | -4.290 | A vencer |
| REALIZE GESTAO DE ENGENHARIA | Gestão Local / Admin | -53.420 | Parcial pago |
| FULLBPO | Gestão Local | -10.000 | A vencer |
| IRMAOS SALVADOR | Radier | -8.102 | Pago |
| RODRIGO ZULIAN | Admin | -5.000 | Pago |
| OITO APOIO ADMINISTRATIVO | Mobilização | -3.825 | Pago |
| (outros 10 fornecedores) | Diversos | -37.313 | Diversos |
