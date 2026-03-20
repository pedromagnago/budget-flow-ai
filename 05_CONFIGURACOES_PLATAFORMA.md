# Projeto SFP — Configurações da Plataforma (Sem Código)

> Tudo que é ajustável via interface de administração, sem necessidade de alterar código.
> O objetivo é que o time FullBPO e até o cliente possam otimizar o sistema no dia a dia.

---

## 1. Configurações Gerais do Projeto

**Tela:** `/settings/project`  
**Acesso:** super_admin, supervisor

| Configuração | Tipo | Default | Descrição |
|---|---|---|---|
| Nome do projeto | texto | "São Francisco de Paula - 64 Casas" | Exibido no header e relatórios |
| Município | texto | "São Francisco de Paula" | Localização do projeto |
| Quantidade de casas | número | 64 | Referência para cálculos unitários |
| Data início obras | data | 09/03/2026 | Marco zero do cronograma |
| Quinzena atual | select | Q1 | Pode ser manual ou calculado pela data |
| Status do projeto | select | ativo | ativo / suspenso / concluído |

---

## 2. Configurações de Integração Omie

**Tela:** `/settings/omie`  
**Acesso:** super_admin

| Configuração | Tipo | Default | Descrição |
|---|---|---|---|
| App Key | texto (mascarado) | — | Chave de API do Omie (armazenada no Vault) |
| App Secret | texto (mascarado) | — | Secret de API do Omie (armazenada no Vault) |
| Frequência de sync | select | Diário (06:00) | Diário / 2x ao dia / Manual |
| Último sync | read-only | — | Data/hora do último sync bem-sucedido |
| Status do sync | read-only | — | OK / Erro (com detalhe) |
| **Botão: Sync agora** | ação | — | Dispara sync manual imediato |
| **Botão: Testar conexão** | ação | — | Verifica se as credenciais funcionam |

**Mapeamento de contas correntes:**

| Conta Omie | Conta Supabase | Ativo |
|---|---|---|
| Caixinha | ✅ mapeada | Sim |
| Caixa Econômica Federal | ✅ mapeada | Sim |
| BRB - Banco de Brasília | ✅ mapeada | Sim |
| Cartão Marcelo - Comp 11 Venc 17 | ✅ mapeada | Sim |

---

## 3. Mapeamento de Categorias (De-Para)

**Tela:** `/settings/categories`  
**Acesso:** super_admin, supervisor

Tabela editável com as correspondências entre Excel e Omie:

| Apropriação (Excel) | Departamento (Omie) | Tipo (Excel) | Categoria (Omie) | Auto? | Ativo |
|---|---|---|---|---|---|
| RADIER | 3.2 RADIER | MAO DE OBRA | MAO DE OBRA | ✅ | ✅ |
| RADIER | 3.2 RADIER | MADEIRA | MADEIRA | ✅ | ✅ |
| RADIER | 3.2 RADIER | FERRAGEM | FERRAGEM | ✅ | ✅ |
| PAREDES COM CONCRETO | 3.3 PAREDES COM CONCRETO | FABRICA | FABRICA | ✅ | ✅ |
| CAPITAL DE GIRO | 1. Adminstrativo | — | Pagamento de Empréstimos | ❌ manual | ✅ |
| RECEITAS | — | — | Receitas | ❌ manual | ✅ |
| ... | ... | ... | ... | ... | ... |

**Ações disponíveis:**
- Adicionar novo mapeamento
- Editar mapeamento existente
- Desativar mapeamento (soft delete)
- Importar mapeamento de CSV
- Botão "Auto-detectar" — roda lógica de match e sugere novos mapeamentos

---

## 4. Limiares da IA

**Tela:** `/settings/ai`  
**Acesso:** super_admin, supervisor

| Configuração | Tipo | Default | Descrição |
|---|---|---|---|
| Score mínimo para fila | slider 0-1 | 0.40 | Abaixo disso → rejeição automática |
| Score "alta confiança" | slider 0-1 | 0.85 | Acima disso → destaque verde na fila |
| Score auto-aprovação | slider 0-1 | 0.95 | Acima disso → aprovação automática (sem auditoria) |
| Auto-aprovação ativa? | toggle | Desligado | Se ligado, score >= limiar = aprovação automática |
| Exemplos de correção no prompt | toggle | Ligado | Inclui histórico de correções como few-shot |
| Máximo de exemplos | número | 20 | Quantas correções anteriores incluir no prompt |

**Indicadores exibidos:**
- Taxa de acerto da IA (últimos 30 dias): X%
- Classificações sem correção: X%
- Média de score: X.XX
- Top 3 erros mais comuns: [lista]

---

## 5. Alertas e Notificações

**Tela:** `/settings/alerts`  
**Acesso:** super_admin, supervisor

### Alertas de desvio orçamentário

| Configuração | Tipo | Default | Descrição |
|---|---|---|---|
| Limiar de atenção (%) | slider | 80% | Quando consumo atinge X% do orçado → alerta amarelo |
| Limiar crítico (%) | slider | 100% | Quando consumo ultrapassa orçado → alerta vermelho |
| Grupos monitorados | multi-select | Todos | Quais grupos geram alerta |
| Notificar por email? | toggle | Ligado | Envia email ao supervisor |
| Notificar no dashboard? | toggle | Ligado | Badge no dashboard |

### Alertas de fila

| Configuração | Tipo | Default | Descrição |
|---|---|---|---|
| Tempo máximo na fila | número (horas) | 24h | Após X horas → alerta "pendente há muito tempo" |
| Alertar supervisor? | toggle | Ligado | Supervisor recebe notificação |

### Alertas de sync

| Configuração | Tipo | Default | Descrição |
|---|---|---|---|
| Falha de sync | toggle | Ligado | Alerta se sync falhou |
| Divergência de dados | toggle | Ligado | Alerta se Omie ≠ Supabase |

---

## 6. Gestão do Orçamento

**Tela:** `/settings/budget`  
**Acesso:** super_admin

### Revisão orçamentária

O orçamento-base é imutável no dia a dia. Mas existem situações que exigem revisão formal:

| Ação | Descrição | Quem autoriza |
|---|---|---|
| Reimportar orçamento | Nova carga do Excel (substitui tudo) | super_admin |
| Ajustar item individual | Alterar valor orçado de um item específico | super_admin (com justificativa) |
| Adicionar grupo | Novo grupo não previsto no orçamento original | super_admin |
| Desativar item | Item que não será mais executado | supervisor+ |

**Toda revisão gera:**
- Registro em `audit_logs` com `acao = 'UPDATE'` e `agente = 'humano'`
- Snapshot do orçamento antes da mudança
- Notificação para todos os stakeholders

### Configuração de quinzenas

| Quinzena | Início | Fim | Status |
|---|---|---|---|
| Q1 | 09/03/2026 | 20/03/2026 | Em andamento |
| Q2 | 23/03/2026 | 03/04/2026 | Futuro |
| Q3 | 06/04/2026 | 17/04/2026 | Futuro |
| ... | ... | ... | ... |
| Q10 | 13/07/2026 | 24/07/2026 | Futuro |

**Editável:** datas de início/fim (para ajustar calendário real da obra).

---

## 7. Gestão de Usuários e Acessos

**Tela:** `/settings/users`  
**Acesso:** super_admin

| Ação | Descrição |
|---|---|
| Convidar usuário | Email + role → Supabase Auth cria conta |
| Alterar role | Trocar de operador para supervisor (ou vice-versa) |
| Desativar acesso | `user_roles.active = false` |
| Ver log de ações | Link para audit_logs filtrado por usuário |

**Roles disponíveis:**
- `super_admin` — acesso total + configurações
- `supervisor` — auditoria + dashboard completo + alertas
- `operador` — auditoria + dashboard básico
- `cliente` — portal de upload + dashboard resumido

---

## 8. Configurações do Portal do Cliente

**Tela:** `/settings/client-portal`  
**Acesso:** super_admin, supervisor

| Configuração | Tipo | Default | Descrição |
|---|---|---|---|
| Tipos de arquivo aceitos | multi-select | PDF, JPG, PNG, XML | Formatos permitidos no upload |
| Tamanho máximo (MB) | número | 10 | Limite por arquivo |
| Notificar cliente no aprovado? | toggle | Ligado | Email quando doc é aprovado |
| Notificar cliente no rejeitado? | toggle | Ligado | Email quando doc é rejeitado (com motivo) |
| Mostrar orçamento detalhado? | toggle | Desligado | Se ligado, cliente vê breakdown por item |
| Mostrar saldo por grupo? | toggle | Ligado | Se ligado, cliente vê consumido vs saldo |

---

## 9. Dashboard — Widgets Configuráveis

**Tela:** `/settings/dashboard`  
**Acesso:** super_admin, supervisor

Cada widget pode ser ligado/desligado e reordenado:

| Widget | Default | Descrição |
|---|---|---|
| Resumo geral (cards) | ✅ Ligado | Total orçado, consumido, saldo, % execução |
| Orçado × Realizado (barras) | ✅ Ligado | Comparativo por grupo |
| Curva S (linha) | ✅ Ligado | Acumulado temporal orçado vs real |
| Top 5 desvios | ✅ Ligado | Grupos com maior desvio percentual |
| Fluxo de caixa projetado | ✅ Ligado | Real + saldo futuro por quinzena |
| Fila de auditoria (resumo) | ✅ Ligado | Pendentes, média de tempo, taxa de acerto IA |
| Últimos documentos | ✅ Ligado | 10 últimos uploads com status |
| Fornecedores (ranking) | ❌ Desligado | Top fornecedores por valor consumido |
| Quinzena atual (detalhe) | ❌ Desligado | Drill-down da quinzena ativa |

---

## 10. Exportações e Relatórios

**Tela:** `/settings/reports`  
**Acesso:** super_admin, supervisor

| Relatório | Formato | Frequência | Descrição |
|---|---|---|---|
| Orçado × Realizado | PDF / Excel | Sob demanda | Comparativo completo por grupo |
| Curva S | PDF | Sob demanda | Gráfico de evolução + tabela |
| Fluxo de caixa projetado | Excel | Semanal (automático) | Real + previsões futuras |
| Log de auditoria | CSV | Sob demanda | Histórico de ações |
| Relatório do investidor | PDF | Mensal | Resumo executivo para FM Soluções |
| Desvios acumulados | PDF | Sob demanda | Lista de grupos com desvio > limiar |

---

## Resumo: O que NÃO precisa de código

| Ação | Onde configurar | Quem |
|---|---|---|
| Ajustar limiares da IA | `/settings/ai` | supervisor+ |
| Mapear nova categoria | `/settings/categories` | supervisor+ |
| Alterar frequência de sync | `/settings/omie` | super_admin |
| Ativar auto-aprovação da IA | `/settings/ai` | super_admin |
| Ajustar alertas de desvio | `/settings/alerts` | supervisor+ |
| Revisar orçamento | `/settings/budget` | super_admin |
| Gerenciar usuários | `/settings/users` | super_admin |
| Configurar portal do cliente | `/settings/client-portal` | supervisor+ |
| Ligar/desligar widgets | `/settings/dashboard` | supervisor+ |
| Gerar relatórios | `/settings/reports` | supervisor+ |
| Forçar sync com Omie | `/settings/omie` → "Sync agora" | super_admin |
| Ver por que a IA errou | `/audit` → detalhe da classificação | operador+ |
| Corrigir classificação | `/audit` → "Corrigir" | operador+ |
| Ajustar datas de quinzena | `/settings/budget` | super_admin |
