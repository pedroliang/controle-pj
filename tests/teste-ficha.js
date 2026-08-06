/**
 * Testa a busca por nome e a Ficha do PJ.
 *   node tests/teste-ficha.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];

const noop = () => {};
const cache = {};
function fakeEl(id) {
  const alvo = {
    id, value: '', textContent: '', innerHTML: '', style: {}, dataset: {}, checked: false, disabled: false,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, appendChild: noop, removeChild: noop,
    querySelector: () => fakeEl(), querySelectorAll: () => [], closest: () => null,
    focus: noop, click: noop, setAttribute: noop, getAttribute: () => null
  };
  return new Proxy(alvo, { get: (t, p) => t[p], set: (t, p, v) => { t[p] = v; return true; } });
}
const documento = {
  getElementById: id => (cache[id] = cache[id] || fakeEl(id)),
  querySelector: () => fakeEl(), querySelectorAll: () => [], createElement: () => fakeEl(),
  addEventListener: noop, head: fakeEl(), body: fakeEl()
};
const ctx = {
  document: documento,
  window: { addEventListener: noop, scrollTo: noop },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  fetch: () => Promise.reject(new Error('sem rede')),
  setTimeout, clearTimeout, console, Promise, Blob: class {},
  URL: { createObjectURL: () => '', revokeObjectURL: noop },
  confirm: () => false, prompt: () => null, alert: noop
};
ctx.window.document = documento;
vm.createContext(ctx);
vm.runInContext(script, ctx);

let ok = 0, falhou = 0;
function checa(rotulo, cond) {
  if (cond) { ok++; console.log(`  ✓ ${rotulo}`); }
  else { falhou++; console.log(`  ✗ ${rotulo}`); }
}
const { S } = ctx;

S.config = {};
S.feriados = [];
S.pendentes = {};
S.colaboradores = [
  { id: 'a1', nome: 'ANDREIA OLINDINA DA SILVA', galpao: '68', ativo: true },
  { id: 'a2', nome: 'JOSÉ ANTÔNIO PEREIRA', galpao: '64', ativo: true },
  { id: 'a3', nome: 'MARCOS VINICIUS', galpao: '68', ativo: true },
  { id: 'a4', nome: 'ANDRÉ LUIZ SOUZA', galpao: '64', ativo: false }
];

/* ---------- Busca ---------- */
console.log('\nBusca por nome');
checa('acha "andreia" em minúsculas', ctx.colabsDoGalpao('68', 'andreia').length === 1);
checa('busca sem acento acha nome com acento', ctx.colabsDoGalpao('64', 'jose').length === 1);
checa('busca por pedaço do meio do nome', ctx.colabsDoGalpao('68', 'vinicius').length === 1);
checa('busca vazia traz todos do galpão', ctx.colabsDoGalpao('68', '').length === 2);
checa('busca respeita o galpão', ctx.colabsDoGalpao('64', 'andreia').length === 0);
checa('ignora inativos', ctx.colabsDoGalpao('64', 'andre').length === 0);
checa('nome inexistente não traz nada', ctx.colabsDoGalpao('', 'zzzzz').length === 0);
checa('chave() remove acento e caixa', ctx.chave('JOSÉ ANTÔNIO') === 'jose antonio');

/* ---------- Seletor da ficha ---------- */
console.log('\nSeletor da Ficha do PJ');
documento.getElementById('fiBusca').value = 'andre';
ctx.renderSelectFicha();
const opts = documento.getElementById('fiColab').innerHTML;
checa('busca "andre" acha Andreia e André', opts.includes('ANDREIA') && opts.includes('ANDRÉ'));
checa('mostra o galpão de cada um', opts.includes('Galpão 68') || opts.includes('Galpao 68'));
checa('marca quem está inativo', opts.includes('(inativo)'));

documento.getElementById('fiBusca').value = 'zzzz';
ctx.renderSelectFicha();
checa('sem resultado avisa', documento.getElementById('fiColab').innerHTML.includes('Ninguém com esse nome'));

/* ---------- Ficha ---------- */
console.log('\nFicha do PJ — extrato do período');
// Andreia (Galpão 68): trabalha seg-sáb, 8h/dia
S.registros = {
  '2026-08-03|a1': { data: '2026-08-03', colaborador_id: 'a1', status: 'PRESENTE' },
  '2026-08-04|a1': { data: '2026-08-04', colaborador_id: 'a1', status: 'PRESENTE', entrada: '08:30', saida: '19:30', intervalo_min: '60' },
  '2026-08-05|a1': { data: '2026-08-05', colaborador_id: 'a1', status: 'FALTA' },
  '2026-08-06|a1': { data: '2026-08-06', colaborador_id: 'a1', status: 'FALTA_JUSTIFICADA', obs: 'Consulta médica' }
};
S.ficha = { colab: S.colaboradores[0], periodo: { de: '2026-08-03', ate: '2026-08-08' } };
ctx.renderFicha();
const ficha = documento.getElementById('fiConteudo').innerHTML;

checa('mostra o nome da pessoa', ficha.includes('ANDREIA OLINDINA DA SILVA'));
checa('mostra o período escolhido', ficha.includes('03/08/2026') && ficha.includes('08/08/2026'));
checa('mostra a jornada do galpão', ficha.includes('08:30') && ficha.includes('17:30'));
checa('dia normal aparece como Presente', ficha.includes('Presente'));
checa('dia com hora extra mostra saída 19:30', ficha.includes('19:30'));
checa('falta aparece', ficha.includes('>Falta<'));
checa('falta justificada aparece', ficha.includes('Falta justificada'));
checa('observação aparece', ficha.includes('Consulta médica'));
checa('dia sem lançamento é sinalizado', ficha.includes('Sem lançamento'));
// 2 presenças: 8h + 10h = 18h. Previsto: 6 dias úteis x 8h = 48h. Saldo -30h
checa('total trabalhado = 18h', ficha.includes('>18h<'));
checa('total previsto = 48h', ficha.includes('>48h<'));
checa('saldo = -30h', ficha.includes('-30h'));
checa('conta 1 falta', /Faltas<\/div><div class="val">1</.test(ficha));
checa('tem botão de editar o dia', ficha.includes('data-ficha-dia'));
checa('tem rodapé de total do período', ficha.includes('Total do período'));

/* Feriado no meio do período reduz o previsto */
S.feriados = [{ id: 'f1', data: '2026-08-07', descricao: 'Feriado teste', escopo: 'TODOS' }];
ctx.renderFicha();
const ficha2 = documento.getElementById('fiConteudo').innerHTML;
checa('feriado aparece com a descrição', ficha2.includes('Feriado teste'));
checa('feriado derruba o previsto para 40h', ficha2.includes('>40h<'));
checa('saldo melhora para -22h', ficha2.includes('-22h'));

/* Domingo fica fora */
S.feriados = [];
S.ficha.periodo = { de: '2026-08-03', ate: '2026-08-09' };
ctx.renderFicha();
checa('domingo marcado como dia não útil', documento.getElementById('fiConteudo').innerHTML.includes('Dia não útil'));

console.log(`\n${'='.repeat(52)}\n${ok} passaram, ${falhou} falharam\n${'='.repeat(52)}`);
process.exit(falhou ? 1 : 0);
