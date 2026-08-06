/**
 * Controle PJ - Backend (Google Apps Script)
 * ------------------------------------------
 * Usa a planilha do Google como banco de dados.
 * Publique como App da Web (Executar como: Eu / Acesso: Qualquer pessoa)
 * e cole a URL gerada na tela de Configuracao do site.
 */

/**
 * ID da planilha usada como banco de dados.
 * Este e o ID de:
 * https://docs.google.com/spreadsheets/d/1pUzuNXD9gnxVDP_fkfKpoJwq5-Mc1zqEycHdtd0fN1k/edit
 *
 * Se um dia trocar de planilha, basta trocar o ID abaixo.
 * Deixe em branco ('') para usar a planilha em que o script esta anexado.
 */
var PLANILHA_ID = '1pUzuNXD9gnxVDP_fkfKpoJwq5-Mc1zqEycHdtd0fN1k';

var SH_COLAB = 'Colaboradores';
var SH_REG   = 'Registros';
var SH_FER   = 'Feriados';
var SH_CFG   = 'Config';

var COLS_COLAB = ['id', 'nome', 'galpao', 'documento', 'ativo', 'criado_em'];
var COLS_REG   = ['id', 'data', 'colaborador_id', 'status', 'entrada', 'saida', 'intervalo_min', 'obs', 'atualizado_em'];
var COLS_FER   = ['id', 'data', 'descricao', 'escopo'];
var COLS_CFG   = ['chave', 'valor'];

var CFG_PADRAO = {
  g64_nome: 'Galpao 64',
  g64_entrada: '08:00',
  g64_saida: '16:30',
  g64_intervalo: '60',
  g64_dias: '1,2,3,4,5',
  g68_nome: 'Galpao 68',
  g68_entrada: '08:30',
  g68_saida: '17:30',
  g68_intervalo: '60',
  g68_dias: '1,2,3,4,5,6'
};

/* ============================ SETUP ============================ */

/**
 * Rode esta funcao UMA VEZ no editor do Apps Script.
 * Ela cria todas as abas com os cabecalhos corretos.
 */
function setup() {
  var ss = ss_();
  criarAba_(ss, SH_COLAB, COLS_COLAB);
  criarAba_(ss, SH_REG, COLS_REG);
  criarAba_(ss, SH_FER, COLS_FER);
  var cfg = criarAba_(ss, SH_CFG, COLS_CFG);

  if (cfg.getLastRow() < 2) {
    var linhas = [];
    for (var k in CFG_PADRAO) linhas.push([k, CFG_PADRAO[k]]);
    cfg.getRange(2, 1, linhas.length, 2).setValues(linhas);
  }

  // Remove a aba padrao vazia, se existir
  var p = ss.getSheetByName('Pagina1') || ss.getSheetByName('Sheet1') ||
          ss.getSheetByName('Página1') || ss.getSheetByName('Folha1');
  if (p && ss.getSheets().length > 1) ss.deleteSheet(p);

  var msg = 'Controle PJ: abas criadas com sucesso em "' + ss.getName() + '".';
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* script avulso: sem interface */ }
  Logger.log(msg);
  return msg;
}

function criarAba_(ss, nome, cols) {
  var sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() !== cols[0]) {
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
  }
  sh.getRange(1, 1, 1, cols.length)
    .setFontWeight('bold')
    .setBackground('#1f2937')
    .setFontColor('#ffffff');
  sh.setFrozenRows(1);
  // Datas e horas como texto puro, para nao sofrer com fuso horario
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), cols.length).setNumberFormat('@');
  return sh;
}

/* ============================ ROTEADOR ============================ */

function doGet(e) {
  return rotear_(e, (e && e.parameter) ? e.parameter : {});
}

function doPost(e) {
  var corpo = {};
  try {
    if (e && e.postData && e.postData.contents) corpo = JSON.parse(e.postData.contents);
  } catch (err) {
    corpo = (e && e.parameter) ? e.parameter : {};
  }
  return rotear_(e, corpo);
}

/**
 * Quando a chamada chega por GET (JSONP), os objetos vem como texto JSON.
 * Aqui eles voltam a ser objetos de verdade.
 */
function normalizar_(req) {
  var chaves = ['registros', 'colaborador', 'feriado', 'config'];
  for (var i = 0; i < chaves.length; i++) {
    var k = chaves[i];
    if (typeof req[k] === 'string' && req[k]) {
      try { req[k] = JSON.parse(req[k]); } catch (err) { /* deixa como esta */ }
    }
  }
  return req;
}

function rotear_(e, req) {
  var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
  var saida;
  try {
    req = normalizar_(req || {});
    var acao = req.action || 'bootstrap';
    var dados;

    switch (acao) {
      case 'bootstrap':        dados = acBootstrap_(req); break;
      case 'listRegistros':    dados = acListRegistros_(req); break;
      case 'saveRegistros':    dados = acSaveRegistros_(req); break;
      case 'saveColaborador':  dados = acSaveColaborador_(req); break;
      case 'deleteColaborador':dados = acDeleteColaborador_(req); break;
      case 'saveFeriado':      dados = acSaveFeriado_(req); break;
      case 'deleteFeriado':    dados = acDeleteFeriado_(req); break;
      case 'saveConfig':       dados = acSaveConfig_(req); break;
      case 'ping':             dados = { pong: true, versao: '1.0' }; break;
      default: throw new Error('Acao desconhecida: ' + acao);
    }
    saida = { ok: true, data: dados };
  } catch (err) {
    saida = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return responder_(saida, callback);
}

function responder_(obj, callback) {
  var txt = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + txt + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(txt)
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================ HELPERS ============================ */

function ss_() {
  if (PLANILHA_ID) {
    try { return SpreadsheetApp.openById(PLANILHA_ID); } catch (e) { /* cai para a ativa */ }
  }
  var ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (!ativa) throw new Error('Nao encontrei a planilha. Confira o PLANILHA_ID no topo do script.');
  return ativa;
}

function aba_(nome, cols) {
  var sh = ss_().getSheetByName(nome);
  if (!sh) sh = criarAba_(ss_(), nome, cols);
  return sh;
}

/** Le a aba inteira como array de objetos. */
function lerTudo_(nome, cols) {
  var sh = aba_(nome, cols);
  var ultima = sh.getLastRow();
  if (ultima < 2) return [];
  var vals = sh.getRange(2, 1, ultima - 1, cols.length).getDisplayValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    if (!String(vals[i][0]).trim()) continue;
    var o = { _linha: i + 2 };
    for (var c = 0; c < cols.length; c++) o[cols[c]] = vals[i][c];
    out.push(o);
  }
  return out;
}

function novoId_() {
  return Utilities.getUuid().substring(0, 8);
}

function agora_() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm:ss');
}

function paraLinha_(obj, cols) {
  var l = [];
  for (var i = 0; i < cols.length; i++) {
    var v = obj[cols[i]];
    l.push(v === undefined || v === null ? '' : String(v));
  }
  return l;
}

/* ============================ ACOES ============================ */

function acBootstrap_() {
  var cfgLinhas = lerTudo_(SH_CFG, COLS_CFG);
  var cfg = {};
  for (var k in CFG_PADRAO) cfg[k] = CFG_PADRAO[k];
  for (var i = 0; i < cfgLinhas.length; i++) {
    if (cfgLinhas[i].chave) cfg[cfgLinhas[i].chave] = cfgLinhas[i].valor;
  }
  return {
    colaboradores: lerTudo_(SH_COLAB, COLS_COLAB),
    feriados: lerTudo_(SH_FER, COLS_FER),
    config: cfg
  };
}

function acListRegistros_(req) {
  var de = req.de || '0000-01-01';
  var ate = req.ate || '9999-12-31';
  var todos = lerTudo_(SH_REG, COLS_REG);
  var out = [];
  for (var i = 0; i < todos.length; i++) {
    var d = todos[i].data;
    if (d >= de && d <= ate) out.push(todos[i]);
  }
  return { registros: out };
}

/**
 * Grava varios registros de uma vez.
 * Chave de unicidade: data + colaborador_id.
 * Se o status vier vazio, o registro existente e apagado.
 */
function acSaveRegistros_(req) {
  var lista = req.registros || [];
  if (!lista.length) return { salvos: 0 };

  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sh = aba_(SH_REG, COLS_REG);
    var existentes = lerTudo_(SH_REG, COLS_REG);
    var indice = {};
    for (var i = 0; i < existentes.length; i++) {
      indice[existentes[i].data + '|' + existentes[i].colaborador_id] = existentes[i];
    }

    var novos = [];
    var apagar = [];
    var salvos = 0;

    for (var j = 0; j < lista.length; j++) {
      var r = lista[j];
      if (!r.data || !r.colaborador_id) continue;
      var chave = r.data + '|' + r.colaborador_id;
      var atual = indice[chave];

      if (!r.status) {
        if (atual) apagar.push(atual._linha);
        continue;
      }

      var obj = {
        id: atual ? atual.id : novoId_(),
        data: r.data,
        colaborador_id: String(r.colaborador_id),
        status: r.status,
        entrada: r.entrada || '',
        saida: r.saida || '',
        intervalo_min: (r.intervalo_min === 0 || r.intervalo_min) ? String(r.intervalo_min) : '',
        obs: r.obs || '',
        atualizado_em: agora_()
      };

      if (atual) {
        sh.getRange(atual._linha, 1, 1, COLS_REG.length).setValues([paraLinha_(obj, COLS_REG)]);
      } else {
        novos.push(paraLinha_(obj, COLS_REG));
      }
      salvos++;
    }

    if (novos.length) {
      sh.getRange(sh.getLastRow() + 1, 1, novos.length, COLS_REG.length).setValues(novos);
    }
    // Apaga de baixo para cima para nao baguncar os indices
    apagar.sort(function (a, b) { return b - a; });
    for (var k = 0; k < apagar.length; k++) sh.deleteRow(apagar[k]);

    return { salvos: salvos, apagados: apagar.length };
  } finally {
    lock.releaseLock();
  }
}

function acSaveColaborador_(req) {
  var c = req.colaborador || {};
  if (!c.nome) throw new Error('Informe o nome do colaborador.');
  var sh = aba_(SH_COLAB, COLS_COLAB);
  var existentes = lerTudo_(SH_COLAB, COLS_COLAB);

  var alvo = null;
  for (var i = 0; i < existentes.length; i++) {
    if (c.id && existentes[i].id === String(c.id)) { alvo = existentes[i]; break; }
  }

  var obj = {
    id: alvo ? alvo.id : novoId_(),
    nome: c.nome,
    galpao: c.galpao || '64',
    documento: c.documento || '',
    ativo: (c.ativo === false || c.ativo === 'false') ? 'false' : 'true',
    criado_em: alvo ? alvo.criado_em : agora_()
  };

  if (alvo) {
    sh.getRange(alvo._linha, 1, 1, COLS_COLAB.length).setValues([paraLinha_(obj, COLS_COLAB)]);
  } else {
    sh.appendRow(paraLinha_(obj, COLS_COLAB));
  }
  return { colaborador: obj };
}

function acDeleteColaborador_(req) {
  var id = String(req.id || '');
  var sh = aba_(SH_COLAB, COLS_COLAB);
  var existentes = lerTudo_(SH_COLAB, COLS_COLAB);
  for (var i = 0; i < existentes.length; i++) {
    if (existentes[i].id === id) { sh.deleteRow(existentes[i]._linha); return { removido: true }; }
  }
  return { removido: false };
}

function acSaveFeriado_(req) {
  var f = req.feriado || {};
  if (!f.data) throw new Error('Informe a data do feriado.');
  var sh = aba_(SH_FER, COLS_FER);
  var existentes = lerTudo_(SH_FER, COLS_FER);

  var alvo = null;
  for (var i = 0; i < existentes.length; i++) {
    if (f.id && existentes[i].id === String(f.id)) { alvo = existentes[i]; break; }
    if (!f.id && existentes[i].data === f.data && existentes[i].escopo === (f.escopo || 'TODOS')) {
      alvo = existentes[i]; break;
    }
  }

  var obj = {
    id: alvo ? alvo.id : novoId_(),
    data: f.data,
    descricao: f.descricao || 'Feriado',
    escopo: f.escopo || 'TODOS'
  };

  if (alvo) {
    sh.getRange(alvo._linha, 1, 1, COLS_FER.length).setValues([paraLinha_(obj, COLS_FER)]);
  } else {
    sh.appendRow(paraLinha_(obj, COLS_FER));
  }
  return { feriado: obj };
}

function acDeleteFeriado_(req) {
  var id = String(req.id || '');
  var sh = aba_(SH_FER, COLS_FER);
  var existentes = lerTudo_(SH_FER, COLS_FER);
  for (var i = 0; i < existentes.length; i++) {
    if (existentes[i].id === id) { sh.deleteRow(existentes[i]._linha); return { removido: true }; }
  }
  return { removido: false };
}

function acSaveConfig_(req) {
  var cfg = req.config || {};
  var sh = aba_(SH_CFG, COLS_CFG);
  var existentes = lerTudo_(SH_CFG, COLS_CFG);
  var mapa = {};
  for (var i = 0; i < existentes.length; i++) mapa[existentes[i].chave] = existentes[i];

  for (var k in cfg) {
    if (mapa[k]) {
      sh.getRange(mapa[k]._linha, 2).setValue(String(cfg[k]));
    } else {
      sh.appendRow([k, String(cfg[k])]);
    }
  }
  return acBootstrap_();
}

/* ============================ MENU ============================ */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Controle PJ')
      .addItem('Criar / conferir abas', 'setup')
      .addToUi();
  } catch (e) { /* script avulso: sem menu */ }
}
