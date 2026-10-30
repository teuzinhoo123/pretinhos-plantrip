/* Pretinhos Eurotrip | store.js
   Fonte única de dados e regras financeiras. Carregue em todas as páginas:
   <script src="store.js"></script> (antes do script da página, se a página usar Store). */
(function () {
    const KEY = 'euro_data_master_v4';
    const num = v => Number(v) || 0;
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
    const DEF = {
        config: { orcamentoTotal: 25000, cambio: 6.10, tema: 'light', dataPartida: '', dataRetorno: '', saldoWise: 0, modoCambio: 'auto', pessoas: ['Pessoa 1', 'Pessoa 2'] },
        roteiro: [], transportes: [], hospedagem: [], gastos: [], checklist: [], passeios: [], aportes: []
    };

    // Carrega e migra (sem gravar até o primeiro save)
    const raw = read();
    const data = Object.assign({}, DEF, raw, { config: Object.assign({}, DEF.config, raw.config || {}) });
    if (!Array.isArray(data.config.pessoas) || data.config.pessoas.length < 2) data.config.pessoas = DEF.config.pessoas.slice();
    if (!Array.isArray(raw.aportes)) {
        data.aportes = num(data.config.saldoWise) > 0
            ? [{ id: 1, pessoa: 'Ambos', valor: num(data.config.saldoWise), data: '', nota: 'Saldo inicial do Wise' }] : [];
    }

    // Grava apenas as chaves informadas (evita sobrescrever o que outra aba alterou)
    function save(...keys) {
        data.config.saldoWise = data.aportes.reduce((a, p) => a + num(p.valor), 0);
        const cur = read();
        [...new Set([...keys, 'config'])].forEach(k => { cur[k] = data[k]; });
        localStorage.setItem(KEY, JSON.stringify(cur));
    }

    // Todos os valores da viagem numa lista só. Gastos criados automaticamente por
    // transporte/passeio (campo "origem") são ignorados: a fonte original é quem manda.
    function itens(d = data) {
        const L = [];
        (d.transportes || []).forEach(t => L.push({ id: 't' + t.id, fonte: 'Transporte', desc: `${t.origemTxt || ''} → ${t.destinoTxt || ''}${t.companhia ? ' (' + t.companhia + ')' : ''}`, brl: num(t.valorBrl), eur: num(t.valorEur), pago: t.status === 'Confirmado', link: 'transporte.html' }));
        (d.hospedagem || []).forEach(h => L.push({ id: 'h' + h.id, fonte: 'Hospedagem', desc: `${h.nome || 'Hospedagem'}${h.destino ? ' em ' + h.destino : ''}`, brl: num(h.valorBrl), eur: num(h.valorEur), pago: h.status === 'Confirmado', link: 'hospedagem.html' }));
        (d.passeios || []).forEach(p => L.push({ id: 'p' + p.id, fonte: 'Passeio', desc: `${p.atracao || 'Passeio'}${p.destino ? ' em ' + p.destino : ''}`, brl: num(p.valorBrl), eur: num(p.valorEur), pago: !!p.ingressoComprado, link: 'roteiro.html' }));
        (d.gastos || []).filter(g => !g.origem).forEach(g => L.push({ id: 'g' + g.id, fonte: g.categoria || 'Outros', desc: g.descricao, brl: num(g.valorBrl), eur: num(g.valorEur), pago: g.status === 'Pago', manual: true, ref: g }));
        return L;
    }

    // Resumo financeiro: meta, quanto juntamos, gastamos, temos e a divisão entre os dois
    function fin(d = data) {
        const L = itens(d), soma = a => a.reduce((x, i) => x + i.brl, 0);
        const meta = num(d.config.orcamentoTotal), ap = d.aportes || [];
        const juntado = ap.reduce((a, p) => a + num(p.valor), 0);
        const pago = soma(L.filter(i => i.pago)), aPagar = soma(L.filter(i => !i.pago)), comp = pago + aPagar;
        const cota = meta / 2;
        const pessoas = [0, 1].map(i => {
            const aportado = ap.reduce((s, p) => s + (p.pessoa === i ? num(p.valor) : p.pessoa === 'Ambos' ? num(p.valor) / 2 : 0), 0);
            return { nome: d.config.pessoas[i], aportado, cota, falta: Math.max(0, cota - aportado), pct: cota ? Math.min(100, Math.round(aportado / cota * 100)) : 0 };
        });
        return {
            meta, juntado, pago, aPagar, comp, pessoas,
            disponivel: juntado - pago,
            faltaMeta: Math.max(0, meta - juntado),
            pctMeta: meta ? Math.min(100, Math.round(juntado / meta * 100)) : 0,
            folgaMeta: meta - comp,
            descoberto: Math.max(0, aPagar - (juntado - pago))
        };
    }

    const brl = n => num(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const eur = n => num(n).toLocaleString('pt-BR', { style: 'currency', currency: 'EUR' });

    // Câmbio atualizado em qualquer página (cache de 6 horas)
    async function cambio() {
        const c = data.config;
        if (c.modoCambio === 'manual' || Date.now() - num(c.cambioEm) < 216e5) return;
        try {
            const j = await (await fetch('https://economia.awesomeapi.com.br/json/last/EUR-BRL')).json();
            if (j.EURBRL) { c.cambio = +parseFloat(j.EURBRL.bid).toFixed(2); c.cambioEm = Date.now(); save('config'); }
        } catch (e) { /* offline: mantém o último valor */ }
    }

    // Recursos presentes em todas as páginas: tema escuro, contagem regressiva e backup
    function shell() {
        const st = document.createElement('style');
        st.textContent = `
            body.dark-mode{background:#0f172a!important;color:#f1f5f9!important}
            .dark-mode .bento-card{background:#1e293b!important;border-color:#334155!important;color:#f1f5f9!important}
            .dark-mode .bg-white,.dark-mode .bg-slate-50,.dark-mode .bg-slate-100{background-color:#334155!important}
            .dark-mode .text-slate-800,.dark-mode .text-slate-600{color:#f1f5f9!important}
            .dark-mode .text-slate-400,.dark-mode .text-slate-500{color:#94a3b8!important}
            .dark-mode .input-bento{background:#0f172a!important;color:#f1f5f9!important}
            .et-fab{position:fixed;right:16px;bottom:16px;z-index:40;display:flex;gap:6px;align-items:center;background:#0f172a;color:#fff;padding:6px;border-radius:100px;box-shadow:0 10px 30px -8px rgba(0,0,0,.4);font:700 10px Inter,sans-serif;text-transform:uppercase;letter-spacing:.05em}
            .et-fab span{padding:0 10px}.et-fab button{background:rgba(255,255,255,.12);color:#fff;border:0;border-radius:100px;padding:8px 12px;font:inherit;cursor:pointer}
            .et-fab button:hover{background:#4f46e5}`;
        document.head.appendChild(st);
        const aplicar = () => document.body.classList.toggle('dark-mode', data.config.tema === 'dark');
        aplicar();
        const dias = data.config.dataPartida ? Math.ceil((new Date(data.config.dataPartida + 'T00:00') - new Date()) / 864e5) : 0;
        const box = document.createElement('div');
        box.className = 'et-fab';
        box.innerHTML = `${dias > 0 ? `<span>Faltam ${dias} dias</span>` : ''}<button data-a="tema">Tema</button><button data-a="exp">Backup</button><button data-a="imp">Restaurar</button><input type="file" accept=".json" hidden>`;
        const file = box.querySelector('input');
        box.addEventListener('click', e => {
            const a = e.target.dataset && e.target.dataset.a;
            if (a === 'tema') { data.config.tema = data.config.tema === 'dark' ? 'light' : 'dark'; save('config'); aplicar(); }
            if (a === 'exp') {
                const url = URL.createObjectURL(new Blob([JSON.stringify(read(), null, 2)], { type: 'application/json' }));
                Object.assign(document.createElement('a'), { href: url, download: `eurotrip-backup-${new Date().toISOString().slice(0, 10)}.json` }).click();
                URL.revokeObjectURL(url);
            }
            if (a === 'imp') file.click();
        });
        file.addEventListener('change', () => {
            const f = file.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                try {
                    const o = JSON.parse(r.result);
                    if (typeof o !== 'object' || Array.isArray(o) || !o) throw 0;
                    if (confirm('Substituir todos os dados deste navegador pelo backup?')) { localStorage.setItem(KEY, JSON.stringify(o)); location.reload(); }
                } catch (e) { alert('Arquivo de backup inválido.'); }
            };
            r.readAsText(f);
        });
        document.body.appendChild(box);
    }

    window.Store = { data, save, itens, fin, brl, eur, num, id: () => Date.now() + Math.floor(Math.random() * 1000) };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', shell); else shell();
    cambio();
})();
