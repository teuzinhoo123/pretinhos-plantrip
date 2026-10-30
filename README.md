# pretinhos-plantrip

Planejador da Eurotrip em páginas estáticas (Vue 3 e Tailwind via CDN), com dados salvos no navegador.

## Estrutura

- `store.js`: fonte única de dados e regras financeiras. Todas as páginas o carregam.
- `index.html`: painel geral.
- `gastos.html`: meta, aportes por pessoa, disponível e divisão entre os dois.
- `roteiro.html`, `transporte.html`, `hospedagem.html`, `checklist.html`: cadastros.

## Regra financeira

Transportes, hospedagens e passeios contam como pagos quando estão confirmados ou com ingresso comprado. Gastos manuais contam como pagos quando marcados como Pago. Gastos gerados automaticamente por transporte e passeio são ignorados nos totais para não contar o mesmo valor duas vezes.

## Backup

O botão Backup (canto inferior direito) exporta todos os dados em JSON. Restaurar substitui os dados do navegador pelo arquivo.
