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

  // Atualiza a