import {
  supabase,
  SUPABASE_BUCKET
} from "./supabase-config.js";

const CONFIG = {
  limiteArquivos: 20,
  limiteMbOriginal: 12,
  larguraMaxima: 1800,
  qualidadeJpeg: 0.82,
  tiposPermitidos: [
    "image/jpeg",
    "image/png",
    "image/webp"
  ]
};

const estado = {
  contexto: null,
  arquivos: [],
  processando: false
};

const $ = seletor =>
  document.querySelector(seletor);

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function slug(valor) {
  return normalizar(valor)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function obterContextoAtual() {
  const competencia =
    $("#lancamentoCompetencia")?.value || "";

  const campoFilial =
    $("#lancamentoFilial");

  const textoFilial =
    campoFilial?.selectedOptions?.[0]
      ?.textContent
      ?.trim() ||
    campoFilial?.value ||
    "";

  if (!competencia || !textoFilial) {
    return null;
  }

  const correspondencia =
    textoFilial.match(/^\s*(\d+)\s*-\s*(.+?)\s*$/);

  const dn =
    correspondencia
      ? correspondencia[1]
      : "";

  const filial =
    correspondencia
      ? correspondencia[2].trim()
      : textoFilial.trim();

  return {
    campanha: "produtivos",
    competencia,
    dn,
    filial,
    pasta:
      `produtivos/${competencia}/${dn || "sem-dn"}-${slug(filial)}`
  };
}

function mostrarMensagem(texto, tipo = "") {
  const elemento =
    $("#evidenciaMensagem");

  if (!elemento) return;

  elemento.className =
    `evidence-message ${tipo}`.trim();

  elemento.textContent = texto;
}

function atualizarCabecalho() {
  const contador =
    $("#evidenciaContador");

  const filial =
    $("#evidenciaLegendaFilial");

  if (contador) {
    contador.textContent =
      `${estado.arquivos.length}/${CONFIG.limiteArquivos}`;
  }

  if (filial) {
    filial.textContent =
      estado.contexto
        ? `${estado.contexto.dn ? `${estado.contexto.dn} - ` : ""}${estado.contexto.filial} • ${estado.contexto.competencia}`
        : "Selecione a competência e a filial";
  }
}

function renderizarGaleria() {
  const galeria =
    $("#evidenciaGaleria");

  if (!galeria) return;

  atualizarCabecalho();

  if (!estado.arquivos.length) {
    galeria.innerHTML = `
      <div class="evidence-empty">
        <strong>Nenhuma evidência anexada</strong>
        <span>As imagens desta filial e competência aparecerão aqui.</span>
      </div>
    `;

    return;
  }

  galeria.innerHTML =
    estado.arquivos.map(
      arquivo => `
        <article class="evidence-card">
          <a
            href="${escaparHtml(arquivo.url)}"
            target="_blank"
            rel="noopener noreferrer"
            class="evidence-image-link"
          >
            <img
              src="${escaparHtml(arquivo.url)}"
              alt="Evidência da filial ${escaparHtml(estado.contexto?.filial)}"
              loading="lazy"
            />
          </a>

          <div class="evidence-card-info">
            <span title="${escaparHtml(arquivo.nome)}">
              ${escaparHtml(arquivo.nome)}
            </span>

            <button
              type="button"
              class="evidence-remove-btn"
              data-evidence-path="${escaparHtml(arquivo.caminho)}"
            >
              Excluir
            </button>
          </div>
        </article>
      `
    ).join("");

  galeria.querySelectorAll("[data-evidence-path]").forEach(
    botao =>
      botao.addEventListener(
        "click",
        () => excluirEvidencia(botao.dataset.evidencePath)
      )
  );
}

function urlPublica(caminho) {
  const { data } =
    supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(caminho);

  return data.publicUrl;
}

async function carregarEvidencias() {
  const contexto =
    obterContextoAtual();

  estado.contexto = contexto;

  if (!contexto) {
    estado.arquivos = [];
    mostrarMensagem(
      "Selecione a competência e a filial para visualizar as evidências."
    );
    renderizarGaleria();
    return;
  }

  try {
    mostrarMensagem("Carregando evidências...", "loading");

    const { data, error } =
      await supabase.storage
        .from(SUPABASE_BUCKET)
        .list(contexto.pasta, {
          limit: CONFIG.limiteArquivos,
          sortBy: {
            column: "created_at",
            order: "asc"
          }
        });

    if (error) throw error;

    estado.arquivos =
      (data || [])
        .filter(item => item.id && item.name)
        .map(item => {
          const caminho = `${contexto.pasta}/${item.name}`;

          return {
            nome: item.name,
            caminho,
            url: urlPublica(caminho),
            criadoEm: item.created_at || ""
          };
        });

    mostrarMensagem(
      estado.arquivos.length
        ? `${estado.arquivos.length} evidência(s) encontrada(s) para esta filial.`
        : "Nenhuma evidência cadastrada para esta filial.",
      estado.arquivos.length ? "success" : ""
    );

    renderizarGaleria();
  } catch (erro) {
    console.error("Erro ao carregar evidências:", erro);
    estado.arquivos = [];
    mostrarMensagem(
      `Não foi possível carregar as evidências: ${erro.message || erro}`,
      "error"
    );
    renderizarGaleria();
  }
}

function validarArquivo(arquivo) {
  if (!CONFIG.tiposPermitidos.includes(arquivo.type)) {
    throw new Error(
      `${arquivo.name}: formato não permitido. Use JPG, PNG ou WEBP.`
    );
  }

  const limite =
    CONFIG.limiteMbOriginal * 1024 * 1024;

  if (arquivo.size > limite) {
    throw new Error(
      `${arquivo.name}: o arquivo original não pode ultrapassar ${CONFIG.limiteMbOriginal} MB.`
    );
  }
}

function carregarImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    const url = URL.createObjectURL(arquivo);

    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagem);
    };

    imagem.onerror = erro => {
      URL.revokeObjectURL(url);
      reject(erro);
    };

    imagem.src = url;
  });
}

async function comprimirImagem(arquivo) {
  validarArquivo(arquivo);

  const imagem =
    await carregarImagem(arquivo);

  const maiorLado =
    Math.max(imagem.naturalWidth, imagem.naturalHeight);

  const escala =
    maiorLado > CONFIG.larguraMaxima
      ? CONFIG.larguraMaxima / maiorLado
      : 1;

  const largura =
    Math.round(imagem.naturalWidth * escala);

  const altura =
    Math.round(imagem.naturalHeight * escala);

  const canvas =
    document.createElement("canvas");

  canvas.width = largura;
  canvas.height = altura;

  canvas
    .getContext("2d")
    .drawImage(imagem, 0, 0, largura, altura);

  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      resultado => {
        if (resultado) {
          resolve(resultado);
        } else {
          reject(new Error("Não foi possível comprimir a imagem."));
        }
      },
      "image/jpeg",
      CONFIG.qualidadeJpeg
    );
  });
}

function nomeDoArquivo() {
  const id =
    crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${Date.now()}-${id}.jpg`;
}

async function enviarEvidencias(arquivosRecebidos) {
  const contexto =
    obterContextoAtual();

  if (!contexto) {
    alert("Selecione primeiro a competência e a filial.");
    return;
  }

  if (estado.processando) return;

  const arquivos =
    [...arquivosRecebidos];

  if (!arquivos.length) return;

  const vagas =
    CONFIG.limiteArquivos - estado.arquivos.length;

  if (vagas <= 0) {
    alert(
      `Esta filial já possui o limite de ${CONFIG.limiteArquivos} evidências.`
    );
    return;
  }

  if (arquivos.length > vagas) {
    alert(`Você pode adicionar somente mais ${vagas} imagem(ns).`);
    return;
  }

  try {
    estado.processando = true;
    $("#evidenciaDropzone")?.classList.add("uploading");

    let numero = 0;

    for (const arquivo of arquivos) {
      numero += 1;

      mostrarMensagem(
        `Preparando imagem ${numero} de ${arquivos.length}...`,
        "loading"
      );

      const imagemComprimida =
        await comprimirImagem(arquivo);

      const caminho =
        `${contexto.pasta}/${nomeDoArquivo()}`;

      mostrarMensagem(
        `Enviando imagem ${numero} de ${arquivos.length}...`,
        "loading"
      );

      const { error } =
        await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(caminho, imagemComprimida, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: false
          });

      if (error) throw error;
    }

    await carregarEvidencias();
    mostrarMensagem(
      "Evidências enviadas com sucesso para toda a filial.",
      "success"
    );
  } catch (erro) {
    console.error("Erro ao enviar evidências:", erro);
    alert(erro.message || "Não foi possível enviar as evidências.");
    mostrarMensagem(
      erro.message || "Não foi possível enviar as evidências.",
      "error"
    );
  } finally {
    estado.processando = false;
    $("#evidenciaDropzone")?.classList.remove("uploading");

    const input = $("#evidenciaInput");
    if (input) input.value = "";
  }
}

async function excluirEvidencia(caminho) {
  if (!confirm("Deseja excluir esta evidência da filial?")) {
    return;
  }

  try {
    const { error } =
      await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([caminho]);

    if (error) throw error;

    await carregarEvidencias();
    mostrarMensagem("Evidência excluída.", "success");
  } catch (erro) {
    console.error("Erro ao excluir evidência:", erro);
    alert(erro.message || "Não foi possível excluir a evidência.");
  }
}

function configurarUpload() {
  const dropzone = $("#evidenciaDropzone");
  const input = $("#evidenciaInput");
  const botao = $("#btnSelecionarEvidencia");

  if (!dropzone || !input) {
    console.warn("Área de evidências não encontrada no index.html.");
    return;
  }

  botao?.addEventListener("click", evento => {
    evento.stopPropagation();
    input.click();
  });

  dropzone.addEventListener("click", evento => {
    if (!evento.target.closest("button, a")) {
      input.click();
    }
  });

  input.addEventListener("change", () => {
    enviarEvidencias(input.files);
  });

  ["dragenter", "dragover"].forEach(nome => {
    dropzone.addEventListener(nome, evento => {
      evento.preventDefault();
      dropzone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach(nome => {
    dropzone.addEventListener(nome, evento => {
      evento.preventDefault();
      dropzone.classList.remove("dragging");
    });
  });

  dropzone.addEventListener("drop", evento => {
    enviarEvidencias(evento.dataTransfer.files);
  });
}

function configurarMudancas() {
  [
    "#lancamentoCompetencia",
    "#lancamentoFilial"
  ].forEach(seletor => {
    $(seletor)?.addEventListener("change", carregarEvidencias);
  });

  $("#btnNovoLancamento")?.addEventListener("click", () => {
    setTimeout(carregarEvidencias, 120);
  });

  document.addEventListener("click", evento => {
    const botao = evento.target.closest(".mini-btn");

    if (botao && normalizar(botao.textContent) === "EDITAR") {
      setTimeout(carregarEvidencias, 180);
    }
  });
}

/* =========================================================
   BUSCA E ANEXO DAS EVIDÊNCIAS NO PDF
========================================================= */

async function buscarEvidenciasDaCompetencia(competencia) {
  if (!competencia) return [];

  const pastaCompetencia =
    `produtivos/${competencia}`;

  const {
    data: filiais,
    error: erroFiliais
  } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .list(pastaCompetencia, {
      limit: 200,
      sortBy: {
        column: "name",
        order: "asc"
      }
    });

  if (erroFiliais) throw erroFiliais;

  const pastas =
    (filiais || []).filter(item => !item.id && item.name);

  const grupos =
    await Promise.all(
      pastas.map(async pasta => {
        const caminhoPasta =
          `${pastaCompetencia}/${pasta.name}`;

        const { data: imagens, error } =
          await supabase.storage
            .from(SUPABASE_BUCKET)
            .list(caminhoPasta, {
              limit: CONFIG.limiteArquivos,
              sortBy: {
                column: "created_at",
                order: "asc"
              }
            });

        if (error) throw error;

        const partes = pasta.name.split("-");
        const dn = /^\d+$/.test(partes[0]) ? partes.shift() : "";
        const filial = partes.join(" ").toUpperCase();

        return {
          dn,
          filial,
          imagens:
            (imagens || [])
              .filter(item => item.id && item.name)
              .map(item => {
                const caminho = `${caminhoPasta}/${item.name}`;

                return {
                  nome: item.name,
                  caminho,
                  url: urlPublica(caminho)
                };
              })
        };
      })
    );

  return grupos.filter(grupo => grupo.imagens.length);
}

function imagemParaDataUrl(url) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.crossOrigin = "anonymous";

    imagem.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = imagem.naturalWidth;
      canvas.height = imagem.naturalHeight;

      canvas
        .getContext("2d")
        .drawImage(imagem, 0, 0);

      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", 0.88),
        largura: imagem.naturalWidth,
        altura: imagem.naturalHeight
      });
    };

    imagem.onerror = () =>
      reject(new Error("Não foi possível carregar uma das evidências."));

    imagem.src = url;
  });
}

async function anexarEvidenciasAoPdf(pdf, competencia) {
  if (!pdf) {
    throw new Error("O documento PDF não foi informado.");
  }

  const grupos =
    await buscarEvidenciasDaCompetencia(competencia);

  for (const grupo of grupos) {
    pdf.addPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("EVIDÊNCIAS DA APURAÇÃO", 14, 18);

    pdf.setFontSize(11);
    pdf.text(
      `Filial: ${grupo.dn ? `${grupo.dn} - ` : ""}${grupo.filial}`,
      14,
      27
    );
    pdf.text(`Competência: ${competencia}`, 14, 34);

    let y = 44;

    for (const item of grupo.imagens) {
      const imagem =
        await imagemParaDataUrl(item.url);

      const proporcao =
        Math.min(
          180 / imagem.largura,
          105 / imagem.altura
        );

      const largura = imagem.largura * proporcao;
      const altura = imagem.altura * proporcao;

      if (y + altura + 18 > 285) {
        pdf.addPage();
        y = 20;
      }

      const x = (210 - largura) / 2;

      pdf.addImage(
        imagem.dataUrl,
        "JPEG",
        x,
        y,
        largura,
        altura
      );

      y += altura + 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(
        `Evidência — ${grupo.dn ? `${grupo.dn} - ` : ""}${grupo.filial}`,
        14,
        y
      );
      y += 13;
    }
  }

  return pdf;
}

window.evidenciasProdutivos = {
  carregar: carregarEvidencias,
  buscarPorCompetencia: buscarEvidenciasDaCompetencia,
  anexarAoPdf: anexarEvidenciasAoPdf
};

document.addEventListener("DOMContentLoaded", () => {
  configurarUpload();
  configurarMudancas();
  renderizarGaleria();
});