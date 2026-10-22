# Campanha de Garantia — métricas

Fonte: `GARANTIA METRICAS.xlsx`, aba Plan1, versão junho/2025. Plan2 e Plan3 estão vazias.

## Definições confirmadas pelo responsável em 22/10/2026

- Os R$200 da Central de AEG são adicionais aos R$500 dos três indicadores dos assistentes. Máximo fixo: R$700, mais Chamevolks individual.
- A penalidade de 30% passa a valer em índice de erros maior ou igual a 5%.

## Rastreabilidade

| Indicador | Assistente | Líder e supervisora | Referências Plan1 |
|---|---|---|---|
| Faturamento | 80/90/100% → R$150/170/200 | 80/90/100% → R$400/500/600 | A5:D7; A35:D37 |
| Recebimento | 80/90/100% → R$75/100/150 | 80/90/100% → R$400/500/600 | A9:D11; A39:D41 |
| Inserção | 75/80/100% → R$75/100/150 | 75/80/100% → R$400/500/600 | A13:D15; A43:D45 |
| Malote | Não se aplica | 75/80/100% → R$400/500/600 | A47:D49 |
| Central de AEG | Não conformidade <5% → R$200; D+2 | Não se aplica | A21:D21 |
| Chamevolks | R$25/processo faturado atribuído ao usuário | Não se aplica | A17:D17 |
| Extra | Não se aplica | R$150/bloco completo de 5 p.p. de recebimento acima de 100% | A51:D51 |
| Erros | ≥5%: desconto de 30% do subtotal completo | Mesma regra | A25:B25; A55:B55 e confirmação |

Faturamento: quantidade faturada / quantidade fechada no mês. Recebimento: valor recebido / faturado do respectivo mês. Usar totais gerais de todas as unidades. Não tirar média simples de percentuais de filiais. Cada indicador paga apenas a maior faixa alcançada; não há gatilho global novo. Liderança e supervisora recebem a premiação individualmente, sem divisão.

O valor médio de R$425 de Chamevolks em E18 é informativo. Não é mínimo nem parcela fixa. O índice AEG deve vir da avaliação D+2 na Central de AEG do Sismônaco; esta etapa não calcula atrasos de processos.

## Escopo desta etapa

Motor puro `garantia-core.js`, políticas, visão geral, perfis elegíveis e simulador em memória. Nenhuma tabela, migração, folha ou histórico é alterado. Falta de dados impede exibição de total definitivo; edições invalidam o resultado anterior. Valores e bases devem ser não negativos e bases de divisão devem ser positivas.

Cadastro nominal, evidências, dados oficiais por competência, persistência compartilhada e integração com pagamento são próximos passos. A versão documental de junho/2025 não autoriza recálculo retroativo. Definir a competência de início antes de ativar apurações oficiais.

## Validação

`node --test tests/garantia-core.test.mjs`

Cobertura: limites de faixas, índice de erros 4,99/5/5,01%, AEG, extras 104,99/105/109,99/110%, independência dos indicadores, perfis, dados inválidos e ausência de mutação de entradas. Navegação e responsividade verificadas em navegador em 1366, 768, 390 e 360 px.
