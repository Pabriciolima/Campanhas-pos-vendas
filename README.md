# MVP – Campanha de Oficina

## Como executar
1. Abra a pasta no VS Code.
2. Instale a extensão **Live Server**.
3. Clique com o botão direito no `index.html` e escolha **Open with Live Server**.

Também é possível abrir o `index.html` diretamente no navegador.

## O que já funciona
- Cadastro, edição e exclusão de funcionários por filial e cargo.
- Lançamentos para Mecânico Produtivo, Chefe de Oficina, Mecânico Líder e Controlador de Produtividade.
- Cálculos automáticos de produtividade, eficiência, bônus e penalidades.
- Apuração consolidada com filtros.
- Exportação da apuração em CSV e backup em JSON.
- Persistência usando LocalStorage.

## Regra interpretada no MVP
A política do Controlador informa “90% a 99,99% = R$ 300” e também “acima de 90% = R$ 500”, o que é conflitante. Para evitar sobreposição, o MVP usa:
- Eficiência 80–89,99% = R$ 100
- Eficiência 90–99,99% = R$ 300
- Eficiência a partir de 100% = R$ 500

Para Chefe/Líder, mecânicos acima de R$ 60 mil recebem a faixa de R$ 500, sem acumular também os R$ 300.
