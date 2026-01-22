import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, Users, Sun, Zap, FileText, TrendingUp, 
  Settings, DollarSign, BarChart3, MessageSquare, 
  ArrowLeft, Search, ChevronRight, HelpCircle, 
  CheckCircle, AlertCircle, Building2, Calendar,
  PieChart, Wallet, Bell, Target, FileStack
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SystemDocumentation() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('overview');

  const categories = [
    { id: 'overview', name: 'Visão Geral', icon: BookOpen },
    { id: 'customers', name: 'Gestão de Clientes', icon: Users },
    { id: 'plants', name: 'Gestão de Usinas', icon: Sun },
    { id: 'allocation', name: 'Rateio de Energia', icon: Zap },
    { id: 'contracts', name: 'Contratos', icon: FileText },
    { id: 'billing', name: 'Faturamento', icon: DollarSign },
    { id: 'analytics', name: 'Análises & Relatórios', icon: BarChart3 },
    { id: 'automation', name: 'Automações', icon: Settings },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare },
    { id: 'crm', name: 'CRM & Vendas', icon: Target },
    { id: 'documents', name: 'Documentos', icon: FileStack },
    { id: 'financial', name: 'Financeiro', icon: Wallet }
  ];

  const documentation = {
    overview: {
      title: 'Visão Geral do Sistema',
      description: 'O Target Sim é uma plataforma completa para gestão de energia solar compartilhada.',
      sections: [
        {
          title: 'O que é o Target Sim?',
          content: `O Target Sim é um sistema integrado para gestão de usinas de energia solar compartilhada, 
          permitindo o gerenciamento completo de clientes, alocação de energia, faturamento e análises. 
          O sistema foi desenvolvido para otimizar a operação de empresas que trabalham com geração distribuída (GD1 e GD2).`
        },
        {
          title: 'Principais Benefícios',
          items: [
            'Gestão completa de clientes e assinaturas',
            'Controle total sobre usinas e capacidade de geração',
            'Rateio automático de energia entre clientes',
            'Faturamento inteligente e personalizado',
            'Análises preditivas com IA',
            'Automações para processos repetitivos',
            'Integração WhatsApp para comunicação',
            'CRM integrado para gestão de vendas'
          ]
        },
        {
          title: 'Conceitos Fundamentais',
          items: [
            '**Usina Solar**: Fonte de geração de energia, pode operar em dois modos - Geração Mensal (energia nova) ou Crédito Acumulado (banco de créditos)',
            '**Assinatura**: Contrato de um cliente para consumo de energia solar',
            '**Unidade Consumidora**: Instalação do cliente com código específico da concessionária',
            '**Rateio**: Distribuição da energia gerada entre os clientes',
            '**GD1/GD2**: Tipos de geração distribuída (até 75kW ou acima de 75kW)',
            '**Grupo Tarifário A/B**: Classificação da concessionária para tipo de cliente'
          ]
        }
      ]
    },
    customers: {
      title: 'Gestão de Clientes',
      description: 'Cadastro, gerenciamento e acompanhamento completo de clientes.',
      sections: [
        {
          title: '📋 Como Cadastrar um Cliente',
          steps: [
            'Acesse **Admin Dashboard → Gerenciamento de Clientes**',
            'Clique em **"Novo Cliente"**',
            'Preencha os dados básicos: Nome, Email, Telefone, CPF/CNPJ',
            'Selecione o tipo: Residencial (PF) ou Comercial (PJ)',
            'Informe o endereço completo e valor médio da conta',
            'Adicione **Unidades Consumidoras** com:',
            '   • Código da Instalação (da concessionária)',
            '   • Código do Cliente (da concessionária)',
            '   • Consumo mensal estimado (kWh)',
            'Clique em **"Criar Cliente"**'
          ]
        },
        {
          title: '🔄 Importação em Massa',
          content: `Para importar múltiplos clientes de uma vez:
          1. Prepare um arquivo CSV com as colunas: Nome, Email, Telefone, CPF/CNPJ, Status, Cidade, UF, Valor Conta
          2. Clique em "Importar" no topo da página
          3. Selecione o arquivo CSV
          4. O sistema validará e importará os dados automaticamente`
        },
        {
          title: '📊 Status de Clientes',
          items: [
            '**Pendente**: Cliente cadastrado, aguardando análise',
            '**Em Análise**: Documentação em avaliação',
            '**Ativa**: Cliente aprovado e consumindo energia',
            '**Suspensa**: Assinatura temporariamente pausada',
            '**Cancelada**: Contrato encerrado'
          ]
        },
        {
          title: '✏️ Edição e Exclusão',
          content: `Para editar: Clique no ícone de lápis na linha do cliente.
          Para excluir: Clique no ícone de lixeira (requer confirmação dupla).
          Para ver detalhes: Clique no ícone de olho para visualizar histórico completo.`
        }
      ]
    },
    plants: {
      title: 'Gestão de Usinas',
      description: 'Controle completo de usinas solares, capacidade e status operacional.',
      sections: [
        {
          title: '🏭 Cadastrar Nova Usina',
          steps: [
            'Acesse **Admin Dashboard → Gerenciar Usinas**',
            'Clique em **"Nova Usina"**',
            'Preencha informações básicas:',
            '   • Nome da usina',
            '   • Grupo Tarifário (A ou B)',
            '   • Tipo GD (GD1 ou GD2)',
            '   • Capacidade instalada (kWp)',
            'Selecione o **Modo de Operação**:',
            '   • **Geração Mensal**: Energia nova gerada a cada mês',
            '   • **Crédito Acumulado**: Banco de créditos existente',
            'Configure valores de geração/créditos',
            'Adicione localização e data de início',
            'Para usinas operacionais: Informe o dia da leitura (1-31)',
            'Salve a usina'
          ]
        },
        {
          title: '🔧 Modos de Operação',
          content: `**Geração Mensal**: Ideal para usinas novas que geram energia mensalmente. 
          Configure a geração mensal (kWh/mês) que será distribuída aos clientes a cada ciclo.
          
          **Crédito Acumulado**: Para usinas com banco de créditos já existente. 
          Informe o total de kWh acumulados disponíveis para distribuição ao longo do tempo.`
        },
        {
          title: '🏗️ Usinas em Construção',
          content: `Usinas com status "Em Construção" podem ser cadastradas com fase (Fase 1 ou Fase 2).
          Estas usinas aparecem separadamente nos dashboards e NÃO são consideradas para:
          • Alocação de energia
          • Cálculos de capacidade
          • Rateio automático
          
          Quando a construção finalizar, altere o status para "Operacional".`
        },
        {
          title: '💰 Leasing de Usinas',
          content: `Configure contratos de leasing marcando "Esta usina está em Leasing" e preenchendo:
          • Nome e email do locatário
          • Valor mensal do aluguel
          • Valor patrimonial da usina
          • Período do contrato (início e fim)
          • Observações do contrato`
        },
        {
          title: '📊 Monitoramento de Capacidade',
          content: `Acesse **Gestão de Capacidade** para visualizar:
          • Capacidade total instalada
          • Energia alocada vs disponível
          • Taxa de utilização por usina
          • Alertas de sobrealocação
          
          Usinas sobrealocadas aparecem destacadas em vermelho.`
        }
      ]
    },
    allocation: {
      title: 'Rateio de Energia',
      description: 'Sistema inteligente de alocação e distribuição de energia entre clientes.',
      sections: [
        {
          title: '⚡ Como Funciona o Rateio',
          content: `O rateio distribui a energia gerada pelas usinas entre os clientes ativos.
          O sistema considera:
          • Capacidade disponível de cada usina
          • Consumo médio de cada cliente
          • Contratos e alocações existentes
          • Prioridades definidas`
        },
        {
          title: '🎯 Realizar Rateio Manual',
          steps: [
            'Acesse **Admin Dashboard → Rateio de Energia**',
            'Selecione a **usina** fonte',
            'Selecione os **clientes** que receberão energia',
            'Defina o método de alocação:',
            '   • **Proporcional ao Consumo**: Baseado na conta média',
            '   • **Igual para Todos**: Divide igualmente',
            '   • **Manual**: Você define quanto cada um recebe',
            'Visualize o resumo da distribuição',
            'Confirme e salve o rateio'
          ]
        },
        {
          title: '🏢 Grupos e Condomínios',
          content: `Para condomínios e grupos:
          1. Crie um **Grupo Consumidor** em Grupos e Condomínios
          2. Defina o método de rateio interno:
             • Por Área: Distribui proporcionalmente à área de cada unidade
             • Igual: Divide igualmente entre unidades
             • Por Consumo: Baseado no consumo histórico
             • Personalizado: Você define as proporções
          3. Configure percentual de área comum (ex: 10%)
          4. O sistema fará o rateio automático respeitando as regras`
        },
        {
          title: '📈 Simulador de Alocação',
          content: `Use o **Simulador de Alocação** para testar cenários antes de efetivar:
          • Simule diferentes combinações de clientes e usinas
          • Visualize projeções de economia
          • Identifique a melhor distribuição
          • Ajuste proporções em tempo real`
        },
        {
          title: '⚠️ Validações Automáticas',
          items: [
            'O sistema alerta se a alocação exceder a capacidade da usina',
            'Verifica conflitos de contratos',
            'Identifica clientes sem energia suficiente',
            'Sugere redistribuição em caso de déficit'
          ]
        }
      ]
    },
    contracts: {
      title: 'Gestão de Contratos',
      description: 'Controle de contratos com clientes e proprietários de usinas.',
      sections: [
        {
          title: '📝 Contratos com Clientes',
          content: `**PowerPlantContract** vincula clientes às usinas:
          • Define percentual de alocação do cliente
          • Registra consumo acumulado
          • Controla período de vigência
          • Armazena custo da energia paga ao dono da usina
          
          **Campo importante**: energy_cost_per_kwh - Custo que você paga ao proprietário por kWh,
          usado para análise de margem de lucro.`
        },
        {
          title: '🤝 Contratos com Proprietários',
          content: `**OwnerContract** define termos com donos de usinas:
          • Preço por kWh pago ao proprietário
          • Quantidade mínima mensal de compra
          • Prazo de pagamento (15, 30, 45, 60 dias)
          • Forma de pagamento (PIX, TED, Boleto)
          • Índice de reajuste (IPCA, IGPM)
          • Bônus por volume extra
          • Cláusulas e penalidades`
        },
        {
          title: '💰 Análise de Margem',
          content: `Com os custos cadastrados nos contratos, você pode:
          • Calcular lucro por cliente
          • Identificar contratos menos rentáveis
          • Simular reajustes de preço
          • Projetar receita vs custo mensal
          
          Fórmula: Lucro = (Preço Cobrado do Cliente) - (Custo Pago ao Dono) - (Impostos/Taxas)`
        },
        {
          title: '📊 Gestão de Contratos',
          steps: [
            'Acesse **Gestão de Contratos** no menu',
            'Visualize todos os contratos ativos/suspensos',
            'Filtre por cliente, usina ou proprietário',
            'Edite termos quando necessário',
            'Acompanhe vencimentos e renovações'
          ]
        }
      ]
    },
    billing: {
      title: 'Faturamento',
      description: 'Geração automática de faturas e gestão de cobranças.',
      sections: [
        {
          title: '💳 Faturamento Automático',
          steps: [
            'Acesse **Admin Dashboard → Faturamento**',
            'Selecione o **mês de referência**',
            'Escolha os **clientes** para faturar',
            'O sistema calculará automaticamente:',
            '   • Energia alocada no período',
            '   • Desconto sobre a conta de luz',
            '   • Valor a cobrar (15-20% de economia)',
            '   • Créditos de energia utilizados',
            'Revise os valores calculados',
            'Clique em **"Gerar Faturas"**',
            'As faturas são criadas e podem ser enviadas por email'
          ]
        },
        {
          title: '📧 Templates de Fatura',
          content: `Personalize o visual das suas faturas:
          1. Acesse **Editor de Templates**
          2. Crie um novo template ou edite existente
          3. Use variáveis dinâmicas:
             • {{customer_name}} - Nome do cliente
             • {{month_reference}} - Mês da fatura
             • {{kwh_allocated}} - Energia alocada
             • {{discount_value}} - Valor de desconto
             • {{invoice_total}} - Valor total
          4. Ative o template desejado
          5. Todas as próximas faturas usarão este modelo`
        },
        {
          title: '📊 Processamento de Contas de Luz',
          content: `O sistema pode extrair dados de contas de luz via OCR:
          1. Acesse **Processador de Contas**
          2. Faça upload do PDF da conta de luz
          3. O sistema extrai automaticamente:
             • Valor total e kWh consumidos
             • TUSD, TE e outros componentes
             • Dados da concessionária
             • Histórico de consumo
          4. Valide os dados extraídos
          5. Use para comparar economia e gerar relatórios`
        },
        {
          title: '💰 Configuração de Cobranças',
          content: `Defina quais itens da conta são descontáveis:
          • Energia (TUSD + TE): Geralmente descontável
          • COSIP: Não descontável
          • Bandeiras tarifárias: Variável
          • Multas e juros: Não descontável
          
          Configure em **Configurações de Cobranças** para cálculo preciso.`
        },
        {
          title: '🔄 Reconciliação Mensal',
          content: `Todo mês, faça a reconciliação:
          1. Acesse **Reconciliação Mensal**
          2. Compare geração real vs estimada
          3. Ajuste alocações se necessário
          4. Verifique divergências
          5. Aprove o fechamento do mês`
        }
      ]
    },
    analytics: {
      title: 'Análises e Relatórios',
      description: 'Dashboards interativos e relatórios detalhados para tomada de decisão.',
      sections: [
        {
          title: '📊 Dashboard Administrativo',
          content: `O Admin Dashboard oferece visão consolidada:
          • Total de assinaturas (ativas, pendentes, canceladas)
          • Receita mensal estimada
          • Performance das usinas
          • Indicadores de crescimento
          • Atividades recentes
          • Top clientes por consumo
          
          Personalize os widgets exibidos clicando no ícone de configuração.`
        },
        {
          title: '📈 Análises Avançadas',
          items: [
            '**Dashboard Financeiro**: Receita, despesas, fluxo de caixa, projeções',
            '**Performance de Usinas**: Geração vs estimada, disponibilidade, alertas',
            '**Analytics Clientes**: Segmentação, churn, LTV, satisfação (NPS)',
            '**Relatórios de Vendas**: Funil, conversão, performance por vendedor'
          ]
        },
        {
          title: '🤖 IA e Predições',
          content: `Acesse **IA Insights Dashboard** para análises preditivas:
          • **Previsão de Churn**: Identifica clientes em risco de cancelamento
          • **Manutenção Preditiva**: Alerta problemas antes que aconteçam
          • **Otimização de Portfólio**: Sugere melhor mix de usinas e clientes
          • **Previsão de Demanda**: Estima crescimento futuro
          • **Scoring de Leads**: Prioriza leads com maior chance de conversão`
        },
        {
          title: '📑 Relatórios Customizados',
          steps: [
            'Acesse **Relatórios Avançados**',
            'Escolha o tipo: Receita, Vendas, Churn, etc',
            'Selecione período e filtros',
            'Escolha formato: PDF, Excel, CSV',
            'Agende envio automático (opcional)',
            'Gere e baixe o relatório'
          ]
        },
        {
          title: '📉 Monitoramento de Créditos',
          content: `Acompanhe o saldo de créditos:
          • Créditos disponíveis por cliente
          • Créditos expirando (alerta automático)
          • Histórico de utilização
          • Déficit de energia por cliente
          • Projeção de necessidade futura`
        }
      ]
    },
    automation: {
      title: 'Automações',
      description: 'Configure processos automáticos para economizar tempo e reduzir erros.',
      sections: [
        {
          title: '🤖 Tipos de Automações',
          items: [
            '**Alertas Automáticos**: Avisa clientes sobre créditos, faturas, vencimentos',
            '**Follow-up de Leads**: Sequência automática de contatos com prospects',
            '**Faturamento Recorrente**: Gera faturas automaticamente todo mês',
            '**Reconciliação**: Compara geração real vs alocada automaticamente',
            '**Tarefas Automáticas**: Cria tarefas para equipe baseado em eventos'
          ]
        },
        {
          title: '⚡ Criar Automação Simples',
          steps: [
            'Acesse **Gestão de Automações**',
            'Clique em **"Nova Automação"**',
            'Escolha o gatilho (trigger):',
            '   • Fatura vencendo em X dias',
            '   • Lead sem contato há X dias',
            '   • Crédito expirando',
            '   • Nova assinatura criada',
            'Defina a ação:',
            '   • Enviar WhatsApp',
            '   • Enviar Email',
            '   • Criar tarefa',
            '   • Atualizar status',
            'Configure a mensagem/template',
            'Ative a automação'
          ]
        },
        {
          title: '📋 Regras de Tarefas',
          content: `Crie **Regras de Automação de Tarefas** para:
          • Criar tarefas automaticamente quando lead é criado
          • Atribuir responsável baseado em regras (round-robin, carga, região)
          • Definir prazo automaticamente
          • Enviar notificações
          
          Exemplo: "Quando novo lead PJ é criado, criar tarefa de follow-up 
          para vendedor com menos tarefas, prazo de 2 dias"`
        },
        {
          title: '🔄 Integrações CRM',
          content: `Sincronize automaticamente com CRMs externos:
          1. Configure integração em **CRM Integrações**
          2. Escolha o que sincronizar: Leads, Clientes, Tarefas
          3. Ative sincronização em tempo real
          4. Visualize logs de sincronização
          
          Suportado: Salesforce, HubSpot, Pipedrive, RD Station`
        }
      ]
    },
    whatsapp: {
      title: 'WhatsApp Business',
      description: 'Comunicação em massa e atendimento via WhatsApp integrado.',
      sections: [
        {
          title: '💬 Configuração Inicial',
          steps: [
            'Acesse **WhatsApp Evolution**',
            'Clique em **"Conectar WhatsApp"**',
            'Escaneie o QR Code com seu celular',
            'Aguarde confirmação de conexão',
            'Configure nome e foto do perfil business',
            'Pronto! Seu WhatsApp está conectado'
          ]
        },
        {
          title: '📢 Campanhas em Massa',
          content: `Envie mensagens para múltiplos contatos:
          1. Acesse **Campanhas WhatsApp**
          2. Crie nova campanha
          3. Selecione segmento alvo:
             • Todos clientes ativos
             • Clientes com crédito expirando
             • Leads inativos
             • Grupo personalizado
          4. Escreva a mensagem (pode usar variáveis)
          5. Agende ou envie imediatamente
          6. Acompanhe taxa de entrega e leitura`
        },
        {
          title: '🤖 Respostas Sugeridas com IA',
          content: `A IA sugere respostas para mensagens recebidas:
          • Analisa contexto da conversa
          • Sugere 3 opções de resposta
          • Você escolhe e personaliza se quiser
          • Aprende com suas edições
          • Melhora continuamente
          
          Ative em **Configurações WhatsApp → IA Respostas**`
        },
        {
          title: '📝 Templates de Mensagem',
          content: `Crie templates reutilizáveis:
          • Boas-vindas para novos clientes
          • Lembrete de fatura
          • Confirmação de pagamento
          • Alerta de crédito expirando
          
          Use variáveis: {nome}, {valor}, {data}, {kwh}`
        },
        {
          title: '📅 Agendamento',
          content: `Agende mensagens para envio futuro:
          • Escolha data e hora específica
          • Sistema envia automaticamente
          • Ideal para lembretes e follow-ups
          • Pode cancelar antes do envio`
        },
        {
          title: '📊 Métricas',
          items: [
            'Total de mensagens enviadas',
            'Taxa de entrega',
            'Taxa de leitura',
            'Taxa de resposta',
            'Horários de maior engajamento',
            'Campanhas mais efetivas'
          ]
        }
      ]
    },
    crm: {
      title: 'CRM e Gestão de Vendas',
      description: 'Funil de vendas completo desde prospecção até fechamento.',
      sections: [
        {
          title: '🎯 Pipeline de Vendas',
          content: `Gerencie todo o funil em **Funil de Vendas**:
          
          **Etapas do Funil:**
          1. **Novo** - Lead acabou de chegar
          2. **Contato Inicial** - Primeira interação realizada
          3. **Qualificado** - Lead validado e tem fit
          4. **Proposta Enviada** - Proposta comercial enviada
          5. **Negociação** - Negociando termos
          6. **Ganho** - Cliente fechado! 🎉
          7. **Perdido** - Não converteu (registre motivo)
          
          Arraste e solte cards entre as colunas para atualizar status.`
        },
        {
          title: '📝 Cadastrar Lead',
          steps: [
            'Acesse **Funil de Vendas** ou **CRM Dashboard**',
            'Clique em **"Novo Lead"**',
            'Preencha informações:',
            '   • Nome, email, telefone',
            '   • Empresa (se PJ)',
            '   • Valor médio da conta',
            '   • Cidade/Estado',
            '   • Origem (website, indicação, etc)',
            'Sistema calcula score automático (0-100)',
            'IA prevê probabilidade de conversão',
            'Lead entra no funil como "Novo"'
          ]
        },
        {
          title: '🤖 Score e IA Preditiva',
          content: `O sistema pontua leads automaticamente baseado em:
          • Valor da conta (quanto maior, melhor score)
          • Região (regiões atendidas têm score maior)
          • Origem do lead (indicações pontuam mais)
          • Engajamento (respostas rápidas aumentam score)
          • Fit com perfil ideal de cliente
          
          Leads com score 80+ são alta prioridade!`
        },
        {
          title: '📞 Follow-up Automático',
          content: `Configure follow-ups automáticos em **Lead Automation**:
          • Define intervalos de contato (ex: D+2, D+7, D+14)
          • Envia mensagens via WhatsApp ou Email
          • Cria tarefas para vendedores
          • Para automaticamente quando lead responde
          • Pode ter diferentes sequências por fonte/perfil`
        },
        {
          title: '📊 Dashboard CRM',
          content: `Visualize métricas de vendas:
          • Taxa de conversão por etapa
          • Tempo médio no funil
          • Valor médio de negócio
          • Performance por vendedor
          • Leads por fonte
          • Previsão de receita do pipeline`
        },
        {
          title: '🔗 Integrações Externas',
          content: `Integre com CRMs populares via **CRM Integrações**:
          • Salesforce
          • HubSpot
          • Pipedrive
          • RD Station
          • Zoho CRM
          
          Sincronização bidirecional em tempo real.`
        }
      ]
    },
    documents: {
      title: 'Gestão de Documentos',
      description: 'Armazenamento, organização e assinatura digital de documentos.',
      sections: [
        {
          title: '📁 Tipos de Documentos',
          items: [
            '**Contratos**: Contratos de adesão e termos',
            '**Faturas**: Notas fiscais e boletos',
            '**Documentos Pessoais**: RG, CPF, CNH, comprovantes',
            '**Contas de Luz**: Histórico de contas do cliente',
            '**Outros**: Documentos diversos'
          ]
        },
        {
          title: '📤 Upload de Documentos',
          steps: [
            'Acesse **Gestão de Documentos** ou perfil do cliente',
            'Clique em **"Enviar Documento"**',
            'Selecione o tipo de documento',
            'Escolha o arquivo (PDF, imagem)',
            'Associe a um cliente/assinatura',
            'Adicione observações (opcional)',
            'Faça o upload'
          ]
        },
        {
          title: '🤖 OCR Automático',
          content: `O sistema extrai dados automaticamente de:
          • **Contas de Luz**: kWh, valores, datas, distribuidora
          • **RG/CNH**: Nome, número, data nascimento
          • **Comprovantes**: Endereço completo
          
          Dados extraídos são validados e podem ser editados.`
        },
        {
          title: '✍️ Assinatura Digital',
          content: `Documentos podem ser assinados digitalmente:
          1. Marque documento como "Requer Assinatura"
          2. Envie link para cliente
          3. Cliente assina pelo celular/computador
          4. Assinatura é gravada com timestamp
          5. Documento fica disponível para ambas partes
          
          Assinaturas têm validade jurídica.`
        },
        {
          title: '🔍 Busca e Filtros',
          content: `Encontre documentos rapidamente:
          • Por cliente
          • Por tipo de documento
          • Por período
          • Por status (pendente, aprovado, rejeitado)
          • Por palavra-chave no conteúdo`
        },
        {
          title: '📊 Dashboard de Documentos',
          content: `Visualize em **Dashboard de Documentos**:
          • Total de documentos por tipo
          • Documentos pendentes de assinatura
          • Documentos rejeitados que precisam atenção
          • Taxa de aprovação
          • Tempo médio de processamento`
        }
      ]
    },
    financial: {
      title: 'Gestão Financeira',
      description: 'Controle completo de receitas, despesas e fluxo de caixa.',
      sections: [
        {
          title: '💰 Dashboard Financeiro',
          content: `Acesse **Dashboard Financeiro** para visão consolidada:
          • Receita mensal (faturamento de clientes)
          • Despesas mensais (pagamento a donos de usinas)
          • Lucro líquido
          • Fluxo de caixa projetado
          • Contas a receber
          • Contas a pagar
          • Margem de lucro por cliente`
        },
        {
          title: '📊 Contas a Receber',
          content: `Gerencie recebimentos em **Contas a Receber**:
          • Faturas pendentes por cliente
          • Faturas vencidas (com alertas)
          • Previsão de recebimentos futuros
          • Baixa manual ou automática
          • Integração com meios de pagamento
          • Relatório de inadimplência`
        },
        {
          title: '📉 Contas a Pagar',
          content: `Controle pagamentos em **Contas a Pagar**:
          • Pagamentos devidos a proprietários de usinas
          • Vencimentos por período
          • Histórico de pagamentos
          • Comprovantes anexados
          • Agendamento de pagamentos
          • Conciliação bancária`
        },
        {
          title: '💵 Transações',
          content: `Registre todas as movimentações:
          • Pagamentos recebidos de clientes
          • Pagamentos feitos a proprietários
          • Despesas operacionais
          • Investimentos em expansão
          • Categorização automática
          • Conciliação com extrato bancário`
        },
        {
          title: '📈 Projeções',
          content: `Use **Projeção de Fluxo de Caixa** para:
          • Prever receita dos próximos 3-12 meses
          • Antecipar despesas fixas
          • Identificar períodos de aperto
          • Planejar investimentos
          • Simular cenários (melhor caso, pior caso)
          • Definir metas financeiras`
        },
        {
          title: '📑 Relatórios Financeiros',
          items: [
            '**DRE**: Demonstrativo de Resultados',
            '**Fluxo de Caixa**: Entradas e saídas',
            '**Margem por Cliente**: Lucro individual',
            '**Inadimplência**: Clientes em atraso',
            '**Performance vs Budget**: Real vs planejado'
          ]
        }
      ]
    }
  };

  const currentDoc = documentation[selectedCategory];

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    documentation[cat.id]?.sections?.some(section => 
      section.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.content?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Documentação do Sistema</h1>
                  <p className="text-blue-100 text-sm">Guia completo de uso da plataforma</p>
                </div>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-0 text-base px-4 py-2">
              v2.0
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {filteredCategories.map((category) => {
                    const Icon = category.icon;
                    const isActive = selectedCategory === category.id;
                    return (
                      <Button
                        key={category.id}
                        variant={isActive ? "secondary" : "ghost"}
                        className={`w-full justify-start ${isActive ? 'bg-blue-100 text-blue-700' : ''}`}
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {category.name}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    {React.createElement(categories.find(c => c.id === selectedCategory)?.icon || BookOpen, {
                      className: "w-7 h-7 text-white"
                    })}
                  </div>
                  <div>
                    <CardTitle className="text-2xl mb-2">{currentDoc.title}</CardTitle>
                    <p className="text-slate-600">{currentDoc.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-8">
                  {currentDoc.sections?.map((section, idx) => (
                    <div key={idx} className="space-y-4">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        {section.title}
                      </h3>
                      
                      {section.content && (
                        <div className="prose prose-slate max-w-none">
                          <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                            {section.content}
                          </p>
                        </div>
                      )}

                      {section.steps && (
                        <div className="space-y-3">
                          {section.steps.map((step, stepIdx) => (
                            <div key={stepIdx} className="flex gap-3">
                              <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {stepIdx + 1}
                              </div>
                              <p className="text-slate-700 pt-1">{step}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {section.items && (
                        <div className="space-y-2">
                          {section.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex gap-3 items-start">
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <p className="text-slate-700">{item}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {idx < currentDoc.sections.length - 1 && (
                        <div className="border-t border-slate-200 my-6" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Navigation Footer */}
                <div className="mt-12 pt-6 border-t flex justify-between items-center">
                  <div className="text-sm text-slate-500">
                    {categories.findIndex(c => c.id === selectedCategory) + 1} de {categories.length} seções
                  </div>
                  <div className="flex gap-2">
                    {categories.findIndex(c => c.id === selectedCategory) > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const currentIdx = categories.findIndex(c => c.id === selectedCategory);
                          setSelectedCategory(categories[currentIdx - 1].id);
                          window.scrollTo(0, 0);
                        }}
                      >
                        Anterior
                      </Button>
                    )}
                    {categories.findIndex(c => c.id === selectedCategory) < categories.length - 1 && (
                      <Button
                        onClick={() => {
                          const currentIdx = categories.findIndex(c => c.id === selectedCategory);
                          setSelectedCategory(categories[currentIdx + 1].id);
                          window.scrollTo(0, 0);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Próximo
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="mt-6 border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">Precisa de ajuda?</h4>
                    <p className="text-blue-700 text-sm mb-3">
                      Não encontrou o que procurava? Entre em contato com o suporte.
                    </p>
                    <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                      Abrir Ticket de Suporte
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}