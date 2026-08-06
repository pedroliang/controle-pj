/**
 * Gera apps-script/Index.html a partir do index.html do site.
 * Rode sempre que mexer no site, para o endereço do Google não ficar desatualizado.
 *   node tools/gerar-index-appsscript.js
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const origem = path.join(raiz, 'index.html');
const destino = path.join(raiz, 'apps-script', 'Index.html');

let html = fs.readFileSync(origem, 'utf8');

const aviso = `<!--
  ============================================================
  ARQUIVO GERADO AUTOMATICAMENTE - NAO EDITE AQUI.
  Edite index.html na raiz e rode: node tools/gerar-index-appsscript.js
  Depois cole este conteudo no arquivo Index.html do projeto Apps Script.
  ============================================================
-->
`;

fs.writeFileSync(destino, aviso + html, 'utf8');

console.log('Index.html do Apps Script gerado.');
console.log('  origem:  index.html          (' + (html.length / 1024).toFixed(1) + ' KB)');
console.log('  destino: apps-script/Index.html');
