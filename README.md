# Controle PJ

Controle de ponto para prestadores PJ, com totais de horas por **dia, semana e mês**, marcação de **faltas**, **faltas justificadas** e **feriados**.

O site é estático (roda no GitHub Pages) e usa uma **planilha do Google Sheets como banco de dados**, através de um Google Apps Script publicado como App da Web. Todo mundo que abrir o site vê e grava nos mesmos dados, de qualquer computador.

---

## Os dois grupos

| | Galpão 64 | Galpão 68 |
|---|---|---|
| Dias | Segunda a sexta | Segunda a sábado |
| Horário | 08:00 às 16:30 | 08:30 às 17:30 |
| Intervalo | 1 hora | 1 hora |
| **Horas por dia** | **7h30** | **8h00** |
| **Horas por semana** | **37h30** | **48h00** |

Tudo isso é editável na aba **Configuração** do site, sem mexer no código.

---

## Instalação (uma vez só, ~5 minutos)

### 1. Preparar a planilha

A planilha usada como banco é esta:
**[Controle PJ — planilha](https://docs.google.com/spreadsheets/d/1pUzuNXD9gnxVDP_fkfKpoJwq5-Mc1zqEycHdtd0fN1k/edit)**

O ID dela já está fixado no topo do `Codigo.gs` (`PLANILHA_ID`). Para trocar de planilha um dia, basta substituir esse ID.

1. Abra a planilha acima.
2. Menu **Extensões → Apps Script**.
3. Apague o código de exemplo e cole **todo** o conteúdo de [`apps-script/Codigo.gs`](apps-script/Codigo.gs).
4. Salve (ícone de disquete).
5. No seletor de função no topo, escolha **`setup`** e clique em **Executar**.
   - O Google vai pedir autorização. Clique em *Revisar permissões* → sua conta → *Avançado* → *Acessar Controle PJ (não seguro)* → *Permitir*. Esse aviso é normal para scripts próprios.
   - Ao terminar, a planilha ganha as abas `Colaboradores`, `Registros`, `Feriados` e `Config`.

### 2. Publicar o Apps Script como API

1. No editor do Apps Script, clique em **Implantar → Nova implantação**.
2. No ícone de engrenagem, escolha o tipo **App da Web**.
3. Preencha:
   - **Executar como:** `Eu`
   - **Quem pode acessar:** `Qualquer pessoa`
4. Clique em **Implantar** e **copie a URL do app da Web** (termina em `/exec`).

> A opção "Qualquer pessoa" é obrigatória para o site conseguir falar com a planilha sem login do Google. Quem tiver a URL consegue ler e gravar, então não divulgue essa URL fora da equipe.

### 3. Ligar o site à planilha

A URL do App da Web **já vem embutida no site** (constante `EP_PADRAO` no topo do `<script>` em `index.html`). Quem for usar o sistema só precisa abrir o link — não configura nada.

Se um dia você reimplantar o Apps Script e a URL mudar, atualize o `EP_PADRAO` no `index.html` e dê push. Para um teste pontual em outra planilha, dá para colar outra URL em **Configuração**; ela vale só naquele navegador, e o botão *Voltar para a planilha padrão* desfaz.

### 4. Começar a usar

1. **Colaboradores** → cadastre os PJs e escolha o galpão de cada um.
2. **Feriados** → clique em *Importar feriados nacionais* e escolha o ano.
3. **Lançamento** → marque o ponto da semana.

---

## Como usar no dia a dia

### Lançamento

A tela mostra uma grade: cada linha é um colaborador, cada coluna é um dia da semana.

- **Clique numa célula** para escolher o status do dia.
- **Presente** já assume o horário padrão do galpão. Se precisar, digite entrada/saída diferentes na mesma janela — o sistema recalcula as horas e o saldo.
- **Marcar semana toda como presente** preenche de uma vez tudo o que ainda está em branco (não sobrescreve o que já foi lançado).
- As alterações ficam pendentes até você clicar em **Salvar na planilha** na barra que aparece embaixo.

| Status | Conta horas? | Conta como falta? |
|---|---|---|
| Presente | Sim | Não |
| Falta | Não | Sim |
| Falta justificada | Não | Sim, separada |
| Feriado | Não | Não |

Dias fora da jornada do galpão (sábado no 64, domingo nos dois) e feriados cadastrados aparecem **bloqueados** — não precisam de lançamento e não entram na conta. Se alguém trabalhar mesmo assim, dá para lançar: as horas viram saldo positivo.

A grade mostra **uma semana por vez**, mas não há limite de datas: use as setas ← → para andar para frente ou para trás, ou **Hoje** para voltar à semana atual (que é sempre a que abre por padrão). O campo **Buscar colaborador** filtra as linhas por nome, ignorando acentos e maiúsculas.

### Ficha do PJ

Para acompanhar uma pessoa específica: busque pelo nome, escolha o período (um mês ou datas livres) e veja o **extrato dia a dia** — status, entrada, saída, horas trabalhadas, previstas e saldo de cada dia, com o total do período no rodapé.

Dá para corrigir qualquer dia direto da ficha pelo botão **Editar**, e exportar o extrato da pessoa em CSV. No relatório geral, clicar no nome de alguém abre a ficha dela já no mesmo período.

### Relatórios

Escolha um mês (ou um intervalo de datas livre) e um galpão. O relatório traz, por colaborador:

- dias úteis, presenças, faltas, faltas justificadas e feriados;
- horas trabalhadas e horas previstas;
- **saldo** (positivo = hora extra, negativo = horas em falta).

O botão **Exportar CSV** gera um arquivo que abre direto no Excel, com as horas também em formato decimal (ex.: `7,50`) para facilitar cálculo de pagamento.

---

## Estrutura da planilha

| Aba | Para que serve |
|---|---|
| `Colaboradores` | Cadastro dos PJs: nome, galpão, documento, ativo |
| `Registros` | Um registro por dia lançado: data, colaborador, status, entrada, saída, intervalo, observação |
| `Feriados` | Datas de feriado e a qual galpão se aplicam |
| `Config` | Jornada de cada galpão |

Você pode olhar e filtrar a planilha normalmente. **Não renomeie as abas nem as colunas** — o site depende desses nomes.

---

## Perguntas comuns

**Duas pessoas podem lançar ao mesmo tempo?**
Podem. O script usa trava de escrita, então uma gravação espera a outra terminar. Como precaução, clique em **Atualizar** antes de começar a lançar uma semana que outra pessoa possa ter mexido.

**Alguém saiu da empresa. Excluo?**
Marque como **Inativo**. Ele some da grade de lançamento, mas o histórico continua nos relatórios.

**Mudou o horário de um galpão. E os lançamentos antigos?**
Lançamentos gravados com horário próprio (entrada/saída digitadas) não mudam. Os que usaram o horário padrão passam a ser calculados pelo novo horário. Se a mudança for permanente e você quiser preservar o passado, exporte o CSV do período antigo antes de alterar.

**Quem for usar precisa configurar alguma coisa?**
Não. A instalação acima é feita **uma única vez**. Depois disso, é só mandar o link do site — a pessoa abre e já está conectada à planilha.

**Quem tiver o link consegue mexer nos dados?**
Sim. O site é público e não tem senha, e a URL do Apps Script está no código da página. Como o link não é divulgado, funciona bem para uso interno — mas não é um cofre. Dá para fechar isso depois com uma senha na tela de entrada, se fizer sentido.

**O site está lento.**
Cada leitura ou gravação passa pelo Google Apps Script e leva cerca de 1 segundo. É o custo de usar a planilha como banco. Por isso os lançamentos são salvos em lote, e não um a um.

---

## Testes

```bash
node tests/testes.js
```

Confere os cálculos de horas por dia, semana e mês, o tratamento de faltas e feriados e o cálculo dos feriados móveis (Carnaval, Sexta-feira Santa, Corpus Christi).

---

## Arquivos

```
index.html            site inteiro (HTML + CSS + JS, sem dependências)
apps-script/Codigo.gs backend que roda no Google, ligado à planilha
tests/testes.js       testes dos cálculos
```
