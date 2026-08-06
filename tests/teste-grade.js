/**
 * Testa o HTML que a grade de lançamento gera.
 * Confere que a célula mostra ENTRADA e SAÍDA (e não o total de horas).
 *   node tests/teste-grade.js
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

/* Cenário: Andreia no Galpão 68, presente na quinta 06/08/2026 */
S.config = {};
S.feriados = [];
S.galpao = '68';
S.semana = '2026-08-03';
S.colaboradores = [
  { id: 'a1', nome: 'ANDREIA OLINDINA DA SILVA', galpao: '68', ativo: true },
  { id: 'a2', nome: 'DANIEL BRAGA', galpao: '68', ativo: true }
];
S.registros = {
  '2026-08-06|a1': { data: '2026-08-06', colaborador_id: 'a1', status: 'PRESENTE', entrada: '', saida: '', intervalo_min: '' },
  '2026-08-05|a1': { data: '2026-08-05', colaborador_id: 'a1', status: 'FALTA_JUSTIFICADA' },
  '2026-08-04|a2': { data: '2026-08-04', colaborador_id: 'a2', status: 'PRESENTE', entrada: '08:30', saida: '19:30', intervalo_min: '60' }
};
S.pendentes = {};

ctx.renderPonto();
const grade = documento.getElementById('gradePonto').innerHTML;

console.log('\nCélula de presença');
checa('mostra a entrada 08:30', grade.includes('hr-ent">08:30'));
checa('mostra a saída 17:30', grade.includes('hr-sai">17:30'));
checa('NÃO mostra o total de horas dentro da célula', !/class="hs">\s*8h/.test(grade));
checa('hora extra aparece com a saída real 19:30', grade.includes('hr-sai">19:30'));

console.log('\nOutros status');
checa('falta justificada mostra a sigla FJ', grade.includes('>FJ<'));
checa('falta justificada mostra o rótulo', grade.includes('Falta just.'));
checa('dia sem lançamento mostra o +', grade.includes('>+<'));
checa('domingo fica bloqueado', grade.includes('cel st-FOLGA bloq') || grade.includes('bloq'));

console.log('\nTotais');
checa('rodapé tem "Total do dia"', grade.includes('Total do dia'));
checa('total do dia da quinta é 8h', grade.includes('>8h<'));
checa('coluna de total da semana existe', grade.includes('na semana'));
checa('total de Daniel com 2h extras é 10h', grade.includes('10h'));

console.log('\nDica ao passar o mouse');
checa('dica traz as horas trabalhadas', grade.includes('trabalhadas'));

console.log('\nCabeçalho');
checa('mostra os dias da semana', grade.includes('SEG') || grade.includes('Seg'));
checa('mostra sábado (Galpão 68 trabalha)', grade.includes('Sáb'));

console.log(`\n${'='.repeat(52)}\n${ok} passaram, ${falhou} falharam\n${'='.repeat(52)}`);
process.exit(falhou ? 1 : 0);
