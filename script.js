// Configuração fixa do estudante (Turma e Chamada)
const CONFIG_ALUNO = {
  turma: "9B",
  numeroChamada: 32,
  apiUrl: "https://boletim-api.profbt.com.br"
};

// Sessão atual em memória
let pinSessao = "";
let modoEdicao = false;

// Instâncias dos Gráficos Chart.js
let graficoMedias = null;
let graficoEvolucao = null;
let graficoFaltas = null;

// Dados fictícios locais padronizados (fallback caso não haja dados na API)
const dadosFicticiosLocais = [
  { disciplina: "Língua Portuguesa", tri1: 78, tri2: "8,2", tri3: 8.6, faltas: [2, 2, 1] },
  { disciplina: "Matemática", tri1: 55, tri2: "5,4", tri3: null, faltas: [3, 2, 2] },
  { disciplina: "Ciências", tri1: 84, tri2: 7.9, tri3: "8,3", faltas: [1, 1, 1] },
  { disciplina: "História", tri1: "7,1", tri2: 82, tri3: null, faltas: [1, 2, 1] },
  { disciplina: "Geografia", tri1: 69, tri2: "7,5", tri3: 7.8, faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa", tri1: 88, tri2: 8.4, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Arte", tri1: "9,2", tri2: 87, tri3: 9.0, faltas: [1, 1, 0] },
  { disciplina: "Educação Física", tri1: 96, tri2: "9,3", tri3: null, faltas: [0, 1, 0] },
  { disciplina: "Educação Digital", tri1: 91, tri2: 8.9, tri3: "9,4", faltas: [1, 1, 0] },
  { disciplina: "Educação Financeira", tri1: 76, tri2: "7,2", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Rec. Aprend. Matemática", tri1: 58, tri2: "5,9", tri3: 6.2, faltas: [2, 2, 1] },
  { disciplina: "Leitura Rec. Aprend. Lingua Portuguesa", tri1: 72, tri2: "7,6", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico", tri1: 49, tri2: 5.5, tri3: "5,8", faltas: [2, 2, 2] },
  { disciplina: "Literatura Arte e Movimento", tri1: "8,0", tri2: 84, tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Práticas Experimentais", tri1: 64, tri2: "6,6", tri3: 7.0, faltas: [1, 1, 1] }
];

// Estado atual dos dados do boletim
let dadosAtuais = [];

// Função para normalizar notas antigas / vindas da estrutura base do projeto (0 a 100 ou strings com vírgula)
function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  let valorLimpo = valor;
  if (typeof valor === "string") {
    valorLimpo = valor.replace(",", ".");
  }

  let numero = Number(valorLimpo);

  if (isNaN(numero)) {
    return null;
  }

  if (numero > 10 && numero <= 100) {
    numero = numero / 10;
  }

  if (numero >= 0 && numero <= 10) {
    return numero;
  }

  return null;
}

// Validação estrita para notas digitadas no modo de edição (apenas 0 a 10, ponto/vírgula decimal ou vazio)
function validarNotaEditada(valorStr) {
  if (valorStr === null || valorStr === undefined || valorStr.trim() === "") {
    return { valido: true, valor: null };
  }

  const strLimpa = valorStr.trim().replace(",", ".");
  const numero = Number(strLimpa);

  if (isNaN(numero) || numero < 0 || numero > 10) {
    return { valido: false, valor: null };
  }

  return { valido: true, valor: numero };
}

// Validação estrita para faltas (apenas números inteiros maiores ou iguais a 0)
function validarFaltaEditada(valorStr) {
  if (valorStr === null || valorStr === undefined || valorStr.trim() === "") {
    return { valido: false, valor: null };
  }

  const strLimpa = valorStr.trim();
  const numero = Number(strLimpa);

  if (isNaN(numero) || !Number.isInteger(numero) || numero < 0) {
    return { valido: false, valor: null };
  }

  return { valido: true, valor: numero };
}

// Conectar à API com o PIN fornecido
async function fazerLogin() {
  const inputPin = document.getElementById("input-pin");
  const msgLogin = document.getElementById("msg-login");
  const pinDigitado = inputPin.value.trim();

  if (!pinDigitado) {
    msgLogin.textContent = "Por favor, digite o PIN.";
    msgLogin.className = "msg-status msg-erro";
    return;
  }

  msgLogin.textContent = "Conectando...";
  msgLogin.className = "msg-status msg-info";

  try {
    const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinDigitado
      })
    });

    if (resposta.status === 401) {
      msgLogin.textContent = "Turma, chamada ou PIN inválidos.";
      msgLogin.className = "msg-status msg-erro";
      return;
    }

    if (resposta.status === 429) {
      msgLogin.textContent = "Muitas tentativas. Aguarde um minuto e tente novamente.";
      msgLogin.className = "msg-status msg-erro";
      return;
    }

    if (!resposta.ok) {
      msgLogin.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
      msgLogin.className = "msg-status msg-erro";
      return;
    }

    const resultado = await resposta.json();

    // Guardar PIN em memória durante a sessão e limpar campo do input por segurança
    pinSessao = pinDigitado;
    inputPin.value = "";

    // Oculta login e mostra o boletim
    document.getElementById("secao-login").style.display = "none";
    document.getElementById("area-boletim").style.display = "block";

    // Regra DADOS DA API > DADOS LOCAIS
    if (resultado.dados && Array.isArray(resultado.dados.disciplinas) && resultado.dados.disciplinas.length > 0) {
      dadosAtuais = resultado.dados.disciplinas;
    } else {
      // Se dados for null (novo ou sem registro prévio), usa os dados locais
      dadosAtuais = JSON.parse(JSON.stringify(dadosFicticiosLocais));
    }

    renderizarBoletim();
  } catch (erro) {
    msgLogin.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
    msgLogin.className = "msg-status msg-erro";
  }
}

// Renderiza ou atualiza completamente o boletim (Cards + Tabela)
function renderizarBoletim() {
  const corpoTabela = document.getElementById("corpo-tabela");
  corpoTabela.textContent = "";

  document.getElementById("tag-count-materias").textContent = `${dadosAtuais.length} Matérias`;

  let somaMediasGerais = 0;
  let disciplinasComMedia = 0;
  let totalFaltasGeral = 0;
  let countBomDesempenho = 0;
  let countAtencao = 0;

  dadosAtuais.forEach((item, index) => {
    // Trata tanto array de faltas [f1, f2, f3] quanto valor total direto
    let faltasArray = [0, 0, 0];
    if (Array.isArray(item.faltas)) {
      faltasArray = item.faltas;
    } else if (typeof item.faltas === "number") {
      faltasArray = [item.faltas, 0, 0];
    }

    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    const totalFaltasDisc = faltasArray.reduce((acc, f) => acc + (Number(f) || 0), 0);
    totalFaltasGeral += totalFaltasDisc;

    const notasValidas = [n1, n2, n3].filter(n => n !== null);
    let mediaDisc = null;
    let situacao = "Nota ainda não disponível";
    let classeSituacao = "status-indisponivel";

    if (notasValidas.length > 0) {
      const somaNotas = notasValidas.reduce((acc, n) => acc + n, 0);
      mediaDisc = somaNotas / notasValidas.length;

      somaMediasGerais += mediaDisc;
      disciplinasComMedia++;

      if (mediaDisc >= 6.0) {
        situacao = "Bom desempenho";
        classeSituacao = "status-bom";
        countBomDesempenho++;
      } else {
        situacao = "Atenção";
        classeSituacao = "status-atencao";
        countAtencao++;
      }
    }

    const formatarExibicao = (nota) => nota !== null ? nota.toFixed(1).replace(".", ",") : "—";

    const tr = document.createElement("tr");

    // Coluna Nome da Disciplina (Segurança DOM com textContent)
    const tdNome = document.createElement("td");
    const strongNome = document.createElement("strong");
    strongNome.textContent = item.disciplina || "Sem nome";
    tdNome.appendChild(strongNome);
    tr.appendChild(tdNome);

    if (modoEdicao) {
      // Cria inputs para as notas e faltas no modo de edição
      const criarInput = (valor, tipo, iTri) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.className = "input-edicao";
        input.dataset.index = index;
        input.dataset.tipo = tipo;
        input.dataset.tri = iTri;

        if (tipo === "nota") {
          input.value = valor !== null && valor !== undefined ? valor : "";
        } else {
          input.value = faltasArray[iTri] !== undefined ? faltasArray[iTri] : 0;
        }

        td.appendChild(input);
        return td;
      };

      tr.appendChild(criarInput(item.tri1, "nota", 0));
      tr.appendChild(criarInput(item.tri2, "nota", 1));
      tr.appendChild(criarInput(item.tri3, "nota", 2));

      // Coluna Média
      const tdMedia = document.createElement("td");
      tdMedia.textContent = formatarExibicao(mediaDisc);
      tr.appendChild(tdMedia);

      // Três inputs para faltas por trimestre na edição
      const tdFaltas = document.createElement("td");
      tdFaltas.style.display = "flex";
      tdFaltas.style.gap = "4px";
      for (let fIdx = 0; fIdx < 3; fIdx++) {
        const inputF = document.createElement("input");
        inputF.type = "text";
        inputF.className = "input-edicao";
        inputF.style.width = "35px";
        inputF.dataset.index = index;
        inputF.dataset.tipo = "falta";
        inputF.dataset.tri = fIdx;
        inputF.value = faltasArray[fIdx] !== undefined ? faltasArray[fIdx] : 0;
        tdFaltas.appendChild(inputF);
      }
      tr.appendChild(tdFaltas);
    } else {
      // Modo Leitura Normal
      const tdTri1 = document.createElement("td");
      tdTri1.textContent = formatarExibicao(n1);
      tr.appendChild(tdTri1);

      const tdTri2 = document.createElement("td");
      tdTri2.textContent = formatarExibicao(n2);
      tr.appendChild(tdTri2);

      const tdTri3 = document.createElement("td");
      tdTri3.textContent = formatarExibicao(n3);
      tr.appendChild(tdTri3);

      const tdMedia = document.createElement("td");
      const strongMedia = document.createElement("strong");
      strongMedia.textContent = formatarExibicao(mediaDisc);
      tdMedia.appendChild(strongMedia);
      tr.appendChild(tdMedia);

      const tdFaltas = document.createElement("td");
      tdFaltas.textContent = totalFaltasDisc;
      tr.appendChild(tdFaltas);
    }

    // Coluna Situação
    const tdSituacao = document.createElement("td");
    tdSituacao.className = classeSituacao;
    tdSituacao.textContent = situacao;
    tr.appendChild(tdSituacao);

    corpoTabela.appendChild(tr);
  });

  // Atualização dos Cards
  const mediaGeralFinal = disciplinasComMedia > 0 ? (somaMediasGerais / disciplinasComMedia).toFixed(1).replace(".", ",") : "—";
  
  document.getElementById("media-geral").textContent = mediaGeralFinal;
  document.getElementById("total-faltas").textContent = totalFaltasGeral;
  document.getElementById("qtd-bom-desempenho").textContent = countBomDesempenho;
  document.getElementById("qtd-atencao").textContent = countAtencao;

  // A frequência de 92% é apenas demonstrativa nesta etapa e será tratada de outra forma futuramente
  document.getElementById("frequencia").textContent = "92%";

  // Atualiza a camada de visualização em gráficos (Somente Leitura)
  atualizarGraficos();
}

// Alternar entre modo de leitura e edição
function alternarModoEdicao() {
  modoEdicao = !modoEdicao;
  const btnAlternar = document.getElementById("btn-alternar-edicao");
  const btnSalvar = document.getElementById("btn-salvar");
  const msgSalvar = document.getElementById("msg-salvar");

  msgSalvar.textContent = "";

  if (modoEdicao) {
    btnAlternar.textContent = "Cancelar edição";
    btnSalvar.style.display = "inline-block";
  } else {
    btnAlternar.textContent = "Alterar dados";
    btnSalvar.style.display = "none";
  }

  renderizarBoletim();
}

// Salvar as alterações feitas na API
async function salvarDadosAPI() {
  const msgSalvar = document.getElementById("msg-salvar");
  const inputs = document.querySelectorAll(".input-edicao");
  
  let houverErro = false;

  // Remover marcações anteriores de erro
  inputs.forEach(i => i.classList.remove("input-invalido"));

  // Validação preliminar de todos os inputs da tela
  inputs.forEach(input => {
    const tipo = input.dataset.tipo;
    const valor = input.value;

    if (tipo === "nota") {
      const res = validarNotaEditada(valor);
      if (!res.valido) {
        input.classList.add("input-invalido");
        houverErro = true;
      }
    } else if (tipo === "falta") {
      const res = validarFaltaEditada(valor);
      if (!res.valido) {
        input.classList.add("input-invalido");
        houverErro = true;
      }
    }
  });

  if (houverErro) {
    msgSalvar.textContent = "Corrija os campos destacados em vermelho antes de salvar (Notas entre 0 e 10, Faltas inteiras >= 0).";
    msgSalvar.className = "msg-status msg-erro";
    return;
  }

  // Atualizar a estrutura de dados locais com os novos valores validados
  inputs.forEach(input => {
    const idx = Number(input.dataset.index);
    const tipo = input.dataset.tipo;
    const tri = Number(input.dataset.tri);
    const val = input.value;

    if (!dadosAtuais[idx]) return;

    if (tipo === "nota") {
      const valNota = validarNotaEditada(val).valor;
      if (tri === 0) dadosAtuais[idx].tri1 = valNota;
      if (tri === 1) dadosAtuais[idx].tri2 = valNota;
      if (tri === 2) dadosAtuais[idx].tri3 = valNota;
    } else if (tipo === "falta") {
      const valFalta = validarFaltaEditada(val).valor;
      if (!Array.isArray(dadosAtuais[idx].faltas)) {
        dadosAtuais[idx].faltas = [0, 0, 0];
      }
      dadosAtuais[idx].faltas[tri] = valFalta;
    }
  });

  msgSalvar.textContent = "Salvando...";
  msgSalvar.className = "msg-status msg-info";

  try {
    const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinSessao,
        dados: {
          disciplinas: dadosAtuais
        }
      })
    });

    if (resposta.ok) {
      msgSalvar.textContent = "Dados salvos com sucesso.";
      msgSalvar.className = "msg-status msg-sucesso";
      modoEdicao = false;
      document.getElementById("btn-alternar-edicao").textContent = "Alterar dados";
      document.getElementById("btn-salvar").style.display = "none";
      renderizarBoletim();
    } else {
      msgSalvar.textContent = "Falha ao salvar dados no servidor. Tente novamente.";
      msgSalvar.className = "msg-status msg-erro";
    }
  } catch (erro) {
    msgSalvar.textContent = "Erro de conexão ao tentar salvar os dados.";
    msgSalvar.className = "msg-status msg-erro";
  }
}

/* ==========================================================================
   CAMADA DE VISUALIZAÇÃO — GRÁFICOS CHART.JS (SOMENTE LEITURA)
   ========================================================================== */

// Gráfico 1 — Média por Disciplina (Barras Horizontais)
function atualizarGraficoMedias() {
  const canvas = document.getElementById("graficoMediasDisciplinas");
  if (!canvas) return;

  if (graficoMedias) {
    graficoMedias.destroy();
  }

  const rotulos = [];
  const valoresMedias = [];

  dadosAtuais.forEach(item => {
    rotulos.push(item.disciplina || "Sem nome");

    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    const notasValidas = [n1, n2, n3].filter(n => n !== null);

    if (notasValidas.length > 0) {
      const soma = notasValidas.reduce((acc, n) => acc + n, 0);
      valoresMedias.push(Number((soma / notasValidas.length).toFixed(1)));
    } else {
      valoresMedias.push(null);
    }
  });

  const ctx = canvas.getContext("2d");
  graficoMedias = new Chart(ctx, {
    type: "bar",
    data: {
      labels: rotulos,
      datasets: [{
        label: "Média",
        data: valoresMedias,
        backgroundColor: "rgba(0, 255, 136, 0.6)",
        borderColor: "#00ff88",
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              if (val === null || val === undefined) return " Sem nota";
              return ` Média: ${val.toFixed(1).replace(".", ",")}`;
            }
          }
        }
      },
      scales: {
        x: {
          min: 0,
          max: 10,
          ticks: { color: "#94a3b8" },
          grid: { color: "#1e293b" }
        },
        y: {
          ticks: { color: "#e2e8f0", font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

// Gráfico 2 — Evolução da Média Geral (Linha)
function atualizarGraficoEvolucao() {
  const canvas = document.getElementById("graficoEvolucaoTrimestres");
  if (!canvas) return;

  if (graficoEvolucao) {
    graficoEvolucao.destroy();
  }

  const somasTri = [0, 0, 0];
  const contagensTri = [0, 0, 0];

  dadosAtuais.forEach(item => {
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    if (n1 !== null) { somasTri[0] += n1; contagensTri[0]++; }
    if (n2 !== null) { somasTri[1] += n2; contagensTri[1]++; }
    if (n3 !== null) { somasTri[2] += n3; contagensTri[2]++; }
  });

  const mediasTrimestrais = [0, 1, 2].map(idx => {
    return contagensTri[idx] > 0 ? Number((somasTri[idx] / contagensTri[idx]).toFixed(1)) : null;
  });

  const ctx = canvas.getContext("2d");
  graficoEvolucao = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["1º Tri", "2º Tri", "3º Tri"],
      datasets: [{
        label: "Média Geral",
        data: mediasTrimestrais,
        borderColor: "#00d2d3",
        backgroundColor: "rgba(0, 210, 211, 0.15)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#00d2d3",
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              if (val === null || val === undefined) return " Sem nota";
              return ` Média Geral: ${val.toFixed(1).replace(".", ",")}`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: { color: "#94a3b8" },
          grid: { color: "#1e293b" }
        },
        x: {
          ticks: { color: "#e2e8f0" },
          grid: { color: "#1e293b" }
        }
      }
    }
  });
}

// Gráfico 3 — Faltas por Trimestre (Barras por Trimestre)
function atualizarGraficoFaltas() {
  const canvas = document.getElementById("graficoFaltasTrimestres");
  const divEstado = document.getElementById("estadoFaltas");
  const cardFaltas = document.getElementById("card-faltas-grafico");
  if (!canvas) return;

  if (graficoFaltas) {
    graficoFaltas.destroy();
  }

  let faltasTri1 = 0;
  let faltasTri2 = 0;
  let faltasTri3 = 0;

  dadosAtuais.forEach(item => {
    let faltasArray = [0, 0, 0];
    if (Array.isArray(item.faltas)) {
      faltasArray = item.faltas;
    } else if (typeof item.faltas === "number") {
      faltasArray = [item.faltas, 0, 0];
    }

    faltasTri1 += Number(faltasArray[0]) || 0;
    faltasTri2 += Number(faltasArray[1]) || 0;
    faltasTri3 += Number(faltasArray[2]) || 0;
  });

  const totalFaltasAcumuladas = faltasTri1 + faltasTri2 + faltasTri3;

  // Avaliação interna da faixa crítica
  if (divEstado && cardFaltas) {
    if (totalFaltasAcumuladas >= 350) {
      divEstado.innerHTML = '<span class="badge-perigo">Perigo</span>';
      cardFaltas.classList.add("card-perigo-alerta");
    } else {
      divEstado.innerHTML = "";
      cardFaltas.classList.remove("card-perigo-alerta");
    }
  }

  const ctx = canvas.getContext("2d");
  graficoFaltas = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["1º Tri", "2º Tri", "3º Tri"],
      datasets: [{
        label: "Faltas",
        data: [faltasTri1, faltasTri2, faltasTri3],
        backgroundColor: [
          "rgba(255, 71, 87, 0.7)",
          "rgba(255, 165, 2, 0.7)",
          "rgba(165, 94, 234, 0.7)"
        ],
        borderColor: [
          "#ff4757",
          "#ffa502",
          "#a55eea"
        ],
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` Faltas: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "#94a3b8", precision: 0 },
          grid: { color: "#1e293b" }
        },
        x: {
          ticks: { color: "#e2e8f0" },
          grid: { display: false }
        }
      }
    }
  });
}

// Função principal de atualização de todos os gráficos
function atualizarGraficos() {
  atualizarGraficoMedias();
  atualizarGraficoEvolucao();
  atualizarGraficoFaltas();
}