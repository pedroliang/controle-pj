/**
 * Testes dos cálculos do Controle PJ.
 * Roda o <script> do index.html com um DOM falso e confere a matemática.
 *   node tests/testes.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];

/* ---------- DOM falso: qualquer coisa responde a qualquer coisa ---------- */
const noop = () => {};
function fakeEl() {
  const alvo = {
    value: '', textContent: '', innerHTML: '', style: {}, dataset: {}, checked: false, disabled: false,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, removeEventListener: noop, appendChild: noop, removeChild: noop,
    querySelector: () => fakeEl(), querySelectorAll: () => [], closest: () => null,
    focus: noop, click: noop, setAttribute: noop, getAttribute: () => null
  };
  return new Proxy(alvo, {
    get(t, p) { return p in t ? t[p] : undefined; },
    set(t, p, v) { t[p] = v; return true; }
  });
}
const documento = {
  getElementById: () => fakeEl(),
  querySelector: () => fakeEl(),
  querySelectorAll: () => [],
  createElement: () => fakeEl(),
  addEventListener: noop,
  head: fakeEl(), body: fakeEl()
};
const guardado = {};
const ctx = {
  document: documento,
  window: { addEventListener: noop, scrollTo: noop },
  localStorage: { getItem: k => guardado[k] || null, setItem: (k, v) => { guardado[k] = v; }, },
  fetch: () => Promise.reject(new Error('sem rede nos testes')),
  setTimeout, clearTimeout, console, Promise, Blob: class {}, URL: { createObjectURL: () => '', revokeObjectURL: noop },
  confirm: () => false, prompt: () => null, alert: noop
};
ctx.window.document = documento;
vm.createContext(ctx);
vm.runInContext(script, ctx);

/* ---------- Mini framework ---------- */
let ok = 0, falhou = 0;
function eq(rotulo, obtido, esperado) {
  const bate = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (bate) { ok++; console.log(`  ✓ ${rotulo}`); }
  else { falhou++; console.log(`  ✗ ${rotulo}\n      esperado: ${JSON.stringify(esperado)}\n      obtido:   ${JSON.stringify(obtido)}`); }
}
function grupo(n) { console.log(`\n${n}`); }

const {
  S, iso, deIso, addDias, segundaDe, diaSemana, brData, hm2min, min2hm, min2h,
  galpaoCfg, minutosPadrao, ehDiaUtil, feriadoDe, minutosTrabalhados, minutosPrevistos,
  statusEfetivo, consolidar, intervaloDatas, pascoa, feriadosNacionais
} = ctx;

/* ---------- Datas ---------- */
grupo('Datas');
eq('addDias vira o mês', addDias('2026-01-31', 1), '2026-02-01');
eq('addDias vira o ano', addDias('2025-12-31', 1), '2026-01-01');
eq('addDias em ano bissexto', addDias('2028-02-28', 1), '2028-02-29');
eq('segundaDe uma quinta', segundaDe('2026-08-06'), '2026-08-03');
eq('segundaDe um domingo pega a segunda anterior', segundaDe('2026-08-09'), '2026-08-03');
eq('segundaDe uma segunda e ela mesma', segundaDe('2026-08-03'), '2026-08-03');
eq('diaSemana sabado', diaSemana('2026-08-08'), 6);
eq('brData formata', brData('2026-08-06'), '06/08/2026');
eq('intervaloDatas de 7 dias', intervaloDatas('2026-08-03', '2026-08-09').length, 7);

/* ---------- Horas ---------- */
grupo('Conversão de horas');
eq('hm2min 08:30', hm2min('08:30'), 510);
eq('min2hm 450', min2hm(450), '07:30');
eq('min2hm negativo', min2hm(-90), '-01:30');
eq('min2h decimal', min2h(450), '7,50');

/* ---------- Jornada dos galpões ---------- */
grupo('Jornada padrão');
S.config = {};
const g64 = galpaoCfg('64');
const g68 = galpaoCfg('68');
eq('Galpão 64 = 07:30/dia (08:00-16:30 menos 1h)', min2hm(minutosPadrao(g64)), '07:30');
eq('Galpão 68 = 08:00/dia (08:30-17:30 menos 1h)', min2hm(minutosPadrao(g68)), '08:00');
eq('Galpão 64 trabalha 5 dias', g64.dias, [1, 2, 3, 4, 5]);
eq('Galpão 68 trabalha 6 dias', g68.dias, [1, 2, 3, 4, 5, 6]);
eq('Semana do Galpão 64 = 37:30', min2hm(minutosPadrao(g64) * g64.dias.length), '37:30');
eq('Semana do Galpão 68 = 48:00', min2hm(minutosPadrao(g68) * g68.dias.length), '48:00');
eq('Sábado não é útil no 64', ehDiaUtil(g64, '2026-08-08'), false);
eq('Sábado é útil no 68', ehDiaUtil(g68, '2026-08-08'), true);
eq('Domingo não é útil em nenhum', ehDiaUtil(g68, '2026-08-09'), false);

/* ---------- Cálculo do dia ---------- */
grupo('Horas do dia');
eq('Presente com horário padrão (64)', min2hm(minutosTrabalhados({ status: 'PRESENTE' }, g64)), '07:30');
eq('Presente com hora extra até 18:00 (64)', min2hm(minutosTrabalhados({ status: 'PRESENTE', entrada: '08:00', saida: '18:00', intervalo_min: 60 }, g64)), '09:00');
eq('Presente com saída antecipada', min2hm(minutosTrabalhados({ status: 'PRESENTE', entrada: '08:00', saida: '12:00', intervalo_min: 0 }, g64)), '04:00');
eq('Presente sem intervalo', min2hm(minutosTrabalhados({ status: 'PRESENTE', entrada: '08:00', saida: '16:30', intervalo_min: 0 }, g64)), '08:30');
eq('Turno que vira a meia-noite', min2hm(minutosTrabalhados({ status: 'PRESENTE', entrada: '22:00', saida: '06:00', intervalo_min: 60 }, g64)), '07:00');
eq('Falta não conta hora', minutosTrabalhados({ status: 'FALTA' }, g64), 0);
eq('Falta justificada não conta hora', minutosTrabalhados({ status: 'FALTA_JUSTIFICADA' }, g64), 0);
eq('Feriado não conta hora', minutosTrabalhados({ status: 'FERIADO' }, g64), 0);
eq('intervalo_min vazio usa o padrão do galpão', min2hm(minutosTrabalhados({ status: 'PRESENTE', entrada: '08:00', saida: '16:30', intervalo_min: '' }, g64)), '07:30');

/* ---------- Previsto e feriados ---------- */
grupo('Horas previstas e feriados');
S.feriados = [
  { id: 'f1', data: '2026-09-07', descricao: 'Independência', escopo: 'TODOS' },
  { id: 'f2', data: '2026-08-08', descricao: 'Sábado parado', escopo: '68' }
];
eq('Dia útil comum prevê 07:30 no 64', min2hm(minutosPrevistos(g64, '2026-08-06')), '07:30');
eq('Sábado não prevê nada no 64', minutosPrevistos(g64, '2026-08-08'), 0);
eq('Sábado prevê 08:00 no 68', min2hm(minutosPrevistos(g68, '2026-08-07')), '08:00');
eq('Feriado geral zera o previsto', minutosPrevistos(g64, '2026-09-07'), 0);
eq('Feriado só do 68 não afeta o 64', feriadoDe('2026-08-08', '64'), null);
eq('Feriado só do 68 zera o sábado do 68', minutosPrevistos(g68, '2026-08-08'), 0);

/* ---------- Status efetivo ---------- */
grupo('Status efetivo na grade');
const pj64 = { id: 'c1', nome: 'Teste 64', galpao: '64', ativo: true };
const pj68 = { id: 'c2', nome: 'Teste 68', galpao: '68', ativo: true };
S.registros = {}; S.pendentes = {};
eq('Dia sem lançamento fica vazio', statusEfetivo('2026-08-06', pj64, g64).status, '');
eq('Sábado no 64 vira FOLGA bloqueada', statusEfetivo('2026-08-08', pj64, g64).bloq, true);
eq('Feriado aparece sozinho na célula', statusEfetivo('2026-09-07', pj64, g64).status, 'FERIADO');
S.registros['2026-09-07|c1'] = { data: '2026-09-07', colaborador_id: 'c1', status: 'PRESENTE' };
eq('Lançamento manual vence o feriado', statusEfetivo('2026-09-07', pj64, g64).status, 'PRESENTE');
S.pendentes['2026-08-06|c1'] = { data: '2026-08-06', colaborador_id: 'c1', status: 'FALTA' };
eq('Alteração pendente vence o que está gravado', statusEfetivo('2026-08-06', pj64, g64).status, 'FALTA');

/* ---------- Consolidação semanal ---------- */
grupo('Totais da semana');
S.registros = {}; S.pendentes = {}; S.feriados = [];
const semana = intervaloDatas('2026-08-03', '2026-08-09'); // seg 03 a dom 09

// Semana cheia no Galpão 64
['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'].forEach(d => {
  S.registros[d + '|c1'] = { data: d, colaborador_id: 'c1', status: 'PRESENTE' };
});
let r = consolidar(pj64, semana);
eq('64 semana cheia: trabalhado 37:30', min2hm(r.trabalhado), '37:30');
eq('64 semana cheia: previsto 37:30', min2hm(r.previsto), '37:30');
eq('64 semana cheia: saldo zero', min2hm(r.saldo), '00:00');
eq('64 semana cheia: 5 presenças', r.presencas, 5);
eq('64 semana cheia: 5 dias úteis', r.diasUteis, 5);

// Uma falta e uma falta justificada
S.registros['2026-08-05|c1'].status = 'FALTA';
S.registros['2026-08-06|c1'].status = 'FALTA_JUSTIFICADA';
r = consolidar(pj64, semana);
eq('Com 1 falta e 1 justificada: trabalhado 22:30', min2hm(r.trabalhado), '22:30');
eq('Previsto continua 37:30', min2hm(r.previsto), '37:30');
eq('Saldo fica -15:00', min2hm(r.saldo), '-15:00');
eq('Conta 1 falta', r.faltas, 1);
eq('Conta 1 falta justificada', r.faltasJust, 1);

// Feriado no meio da semana reduz o previsto e não gera falta
S.registros = {};
S.feriados = [{ id: 'f9', data: '2026-08-05', descricao: 'Feriado teste', escopo: 'TODOS' }];
['2026-08-03', '2026-08-04', '2026-08-06', '2026-08-07'].forEach(d => {
  S.registros[d + '|c1'] = { data: d, colaborador_id: 'c1', status: 'PRESENTE' };
});
r = consolidar(pj64, semana);
eq('Com feriado: previsto cai para 30:00', min2hm(r.previsto), '30:00');
eq('Com feriado: trabalhado 30:00', min2hm(r.trabalhado), '30:00');
eq('Com feriado: saldo zero', min2hm(r.saldo), '00:00');
eq('Com feriado: nenhuma falta', r.faltas, 0);
eq('Com feriado: 1 feriado contado', r.feriados, 1);
eq('Com feriado: 4 dias úteis', r.diasUteis, 4);

// Galpão 68 semana cheia (segunda a sábado)
S.registros = {}; S.feriados = [];
['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08'].forEach(d => {
  S.registros[d + '|c2'] = { data: d, colaborador_id: 'c2', status: 'PRESENTE' };
});
r = consolidar(pj68, semana);
eq('68 semana cheia: trabalhado 48:00', min2hm(r.trabalhado), '48:00');
eq('68 semana cheia: previsto 48:00', min2hm(r.previsto), '48:00');
eq('68 semana cheia: 6 dias úteis', r.diasUteis, 6);

// Hora extra
S.registros['2026-08-03|c2'] = { data: '2026-08-03', colaborador_id: 'c2', status: 'PRESENTE', entrada: '08:30', saida: '19:30', intervalo_min: 60 };
r = consolidar(pj68, semana);
eq('Com 2h extras: trabalhado 50:00', min2hm(r.trabalhado), '50:00');
eq('Com 2h extras: saldo +02:00', min2hm(r.saldo), '02:00');

/* ---------- Mês ---------- */
grupo('Totais do mês');
S.registros = {}; S.feriados = [];
const agosto = intervaloDatas('2026-08-01', '2026-08-31');
agosto.forEach(d => {
  if (ehDiaUtil(g64, d)) S.registros[d + '|c1'] = { data: d, colaborador_id: 'c1', status: 'PRESENTE' };
});
r = consolidar(pj64, agosto);
eq('Agosto/2026 tem 21 dias úteis no 64', r.diasUteis, 21);
eq('Agosto/2026 mês cheio no 64 = 157:30', min2hm(r.trabalhado), '157:30');
eq('Agosto/2026 saldo zero', min2hm(r.saldo), '00:00');

/* ---------- Feriados nacionais ---------- */
grupo('Feriados nacionais');
eq('Páscoa de 2026', pascoa(2026), '2026-04-05');
eq('Páscoa de 2025', pascoa(2025), '2025-04-20');
eq('Páscoa de 2027', pascoa(2027), '2027-03-28');
const fn = feriadosNacionais(2026);
eq('Gera 13 feriados', fn.length, 13);
eq('Sexta-feira Santa de 2026', fn.find(f => f.descricao === 'Sexta-feira Santa').data, '2026-04-03');
eq('Carnaval de 2026 (terça)', fn.filter(f => f.descricao === 'Carnaval')[1].data, '2026-02-17');
eq('Corpus Christi de 2026', fn.find(f => f.descricao === 'Corpus Christi').data, '2026-06-04');
eq('Natal', fn.find(f => f.descricao === 'Natal').data, '2026-12-25');

/* ---------- Resultado ---------- */
console.log(`\n${'='.repeat(52)}`);
console.log(`${ok} passaram, ${falhou} falharam`);
console.log('='.repeat(52));
process.exit(falhou ? 1 : 0);
