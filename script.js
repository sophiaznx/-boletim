// Dados fictícios dos estudantes do 9º Ano
const dadosBoletim = [
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

// Função para normalizar qualquer nota e transformá-la na escala de 0 a 10
function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  // Converte texto com vírgula para ponto se necessário
  let valorLimpo = valor;
  if (typeof valor === "string") {
    valorLimpo = valor.replace(",", ".");
  }

  let numero = Number(valorLimpo);

  // Se não for um número válido, descarta
  if (isNaN(numero)) {
    return null;
  }

  // Ajusta a escala se a nota for maior que 10 e até 100
  if (numero > 10 && numero <= 100) {
    numero = numero / 10;
  }

  // Verifica se a nota final está no intervalo válido de 0 a 10
  if (numero >= 0 && numero <= 10) {
    return numero;
  }

  return null;
}

// Função principal que processa os dados e constrói a página
function carregarBoletim() {
  const corpoTabela = document.getElementById("corpo-tabela");
  corpoTabela.innerHTML = "";

  let somaMediasGerais = 0;
  let disciplinasComMedia = 0;
  let totalFaltasGeral = 0;
  let countBomDesempenho = 0;
  let countAtencao = 0;

  // Itera por cada disciplina para calcular e preencher a tabela
  dadosBoletim.forEach(item => {
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    // Soma das faltas da disciplina
    const totalFaltasDisc = item.faltas.reduce((acc, f) => acc + f, 0);
    totalFaltasGeral += totalFaltasDisc;

    // Cálculo da média usando apenas notas válidas
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

    // Formatação das notas para exibição no HTML
    const formatarExibicao = (nota) => nota !== null ? nota.toFixed(1).replace(".", ",") : "—";

    // Criando a linha da tabela dinamicamente
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.disciplina}</strong></td>
      <td>${formatarExibicao(n1)}</td>
      <td>${formatarExibicao(n2)}</td>
      <td>${formatarExibicao(n3)}</td>
      <td><strong>${formatarExibicao(mediaDisc)}</strong></td>
      <td>${totalFaltasDisc}</td>
      <td class="${classeSituacao}">${situacao}</td>
    `;

    corpoTabela.appendChild(tr);
  });

  // Atualiza os Cards de Resumo no topo
  const mediaGeralFinal = disciplinasComMedia > 0 ? (somaMediasGerais / disciplinasComMedia).toFixed(1).replace(".", ",") : "—";
  
  document.getElementById("media-geral").textContent = mediaGeralFinal;
  document.getElementById("total-faltas").textContent = totalFaltasGeral;
  document.getElementById("qtd-bom-desempenho").textContent = countBomDesempenho;
  document.getElementById("qtd-atencao").textContent = countAtencao;

  // A frequência de 92% e a mensagem são apenas demonstrativas/fictícias nesta etapa inicial
  document.getElementById("frequencia").textContent = "92%";
}

// Executa a função ao carregar a página
carregarBoletim();