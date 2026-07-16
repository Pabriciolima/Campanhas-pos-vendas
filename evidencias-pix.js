import {
  supabase,
  SUPABASE_BUCKET
} from "./supabase-config.js";

const CONFIG_PIX_EVIDENCIAS = {
  pastaRaiz: "pix-do-presidente",
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

const estadoPixEvidencias = {
  contexto: null,
  arquivos: [],
  enviando: false
};

function pixEv(seletor) {
  return document.querySelector(seletor);
}

function pixEvTodos(seletor) {
  return [...document.querySelectorAll(seletor)];
}


function pixPrimeiroElemento(seletores) {
  for (const seletor of seletores) {
    const elemento = pixEv(seletor);

    if (elemento) {
      return elemento;
    }
  }

  return null;
}

function pixCampoCompetencia() {
  return pixPrimeiroElemento([
    "#pixLancamentoCompetencia",
    "#pixCompetenciaLancamento",
    "#pixCompetencia",
    "#competenciaPixLancamento",
    "#formPixPresidente input[type='month']",
    "#modalPixPresidente input[type='month']"
  ]);
}

function pixCampoFilial() {
  return pixPrimeiroElemento([
    "#pixLancamentoFilial",
    "#pixFilialLancamento",
    "#pixFilial",
    "#filialPixLancamento",
    "#formPixPresidente select[id*='Filial']",
    "#formPixPresidente select[id*='filial']",
    "#modalPixPresidente select[id*='Filial']",
    "#modalPixPresidente select[id*='filial']"
  ]);
}

function pixCampoParticipante() {
  return pixPrimeiroElemento([
    "#pixLancamentoFuncionario",
    "#pixLancamentoParticipante",
    "#pixFuncionario",
    "#pixParticipante",
    "#formPixPresidente select[id*='Funcionario']",
    "#formPixPresidente select[id*='Participante']",
    "#formPixPresidente select[id*='funcionario']",
    "#formPixPresidente select[id*='participante']"
  ]);
}

function normalizarPixEv(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function slugPixEv(valor) {
  return normalizarPixEv(valor)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escaparPixEv(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function numeroPixEv(valor) {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  let texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/%/g, "");

  if (texto.includes(",")) {
    texto = texto
      .replace(/\./g, "")
      .replace(",", ".");
  }

  texto = texto.replace(/[^\d.-]/g, "");

  const numero = Number(texto);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function moedaPixEv(valor) {
  return numeroPixEv(valor).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );
}

function moduloPixAtivo() {
  return (
    document.body.classList.contains("modulo-pix-ativo") ||
    pixEv("#pixPresidente")?.classList.contains("active")
  );
}

function competenciaPixAtiva() {
  return (
    pixCampoCompetencia()?.value ||
    pixEv("#competenciaGlobal")?.value ||
    pixEv("#pixDashboardCompetencia")?.value ||
    ""
  );
}

function contextoPixAtual() {
  const competencia =
    pixCampoCompetencia()?.value || "";

  const selectFilial =
    pixCampoFilial();

  const textoOpcao =
    selectFilial?.selectedOptions?.[0]
      ?.textContent
      ?.trim() ||
    selectFilial?.value ||
    "";

  if (!competencia || !textoOpcao) {
    return null;
  }

  const correspondencia =
    textoOpcao.match(
      /^\s*(\d+)\s*-\s*(.+?)\s*$/
    );

  let dn =
    correspondencia
      ? correspondencia[1]
      : "";

  const filial =
    correspondencia
      ? correspondencia[2].trim()
      : textoOpcao.trim();

  dn =
    dn ||
    selectFilial?.selectedOptions?.[0]?.dataset?.dn ||
    pixCampoParticipante()?.selectedOptions?.[0]?.dataset?.dn ||
    "";

  const pastaFilial =
    `${dn || "sem-dn"}-${slugPixEv(filial)}`;

  return {
    competencia,
    dn,
    filial,
    pasta:
      `${CONFIG_PIX_EVIDENCIAS.pastaRaiz}/${competencia}/${pastaFilial}`
  };
}

function construirContextoPix(
  competencia,
  filial,
  dn = ""
) {
  if (!competencia || !filial) {
    return null;
  }

  const texto =
    String(filial).trim();

  const correspondencia =
    texto.match(
      /^\s*(\d+)\s*-\s*(.+?)\s*$/
    );

  const dnFinal =
    dn ||
    (correspondencia ? correspondencia[1] : "");

  const filialFinal =
    correspondencia
      ? correspondencia[2].trim()
      : texto;

  return {
    competencia,
    dn: dnFinal,
    filial: filialFinal,
    pasta:
      `${CONFIG_PIX_EVIDENCIAS.pastaRaiz}/${competencia}/${dnFinal || "sem-dn"}-${slugPixEv(filialFinal)}`
  };
}

function urlPublicaPix(caminho) {
  const { data } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(caminho);

  return data.publicUrl;
}

async function listarEvidenciasContextoPix(contexto) {
  if (!contexto) {
    return [];
  }

  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .list(
      contexto.pasta,
      {
        limit: CONFIG_PIX_EVIDENCIAS.limiteArquivos,
        sortBy: {
          column: "created_at",
          order: "asc"
        }
      }
    );

  if (error) {
    throw error;
  }

  return (data || [])
    .filter(item => item.id && item.name)
    .map(item => {
      const caminho =
        `${contexto.pasta}/${item.name}`;

      return {
        nome: item.name,
        nomeOriginal:
          item.metadata?.nome_original ||
          item.name,
        caminho,
        url:
          urlPublicaPix(caminho)
      };
    });
}

function garantirHtmlEvidenciasPix() {
  if (pixEv("#pixEvidenciasSection")) {
    return pixEv("#pixEvidenciasSection");
  }

  const form =
    pixPrimeiroElemento([
      "#formPixPresidente",
      "#formLancamentoPix",
      "#modalPixPresidente form",
      "form[data-pix-form]"
    ]);

  if (!form) {
    console.warn(
      "[PIX EVIDÊNCIAS] Formulário do Pix não encontrado."
    );

    return null;
  }

  const resultadoPreview =
    pixPrimeiroElemento([
      "#pixResultadoPreview",
      "#resultadoPreviewPix",
      "#formPixPresidente .pix-preview",
      "#formPixPresidente .resultado-preview"
    ]);

  const campos =
    pixEv("#pixCamposDinamicos");

  const modalActions =
    form.querySelector(".modal-actions");

  const html = `
    <section
      id="pixEvidenciasSection"
      class="pix-evidence-section"
    >
      <div class="pix-evidence-header">
        <div>
          <p class="eyebrow">
            Evidências da filial
          </p>

          <h3>
            Imagens para o relatório do Pix
          </h3>

          <p>
            Anexe uma única vez por filial e competência.
            Os demais lançamentos da mesma filial visualizarão
            automaticamente as mesmas evidências.
          </p>
        </div>

        <span
          id="pixEvidenciaContador"
          class="pix-evidence-counter"
        >
          0/20
        </span>
      </div>

      <div
        id="pixEvidenciaLegenda"
        class="pix-evidence-branch"
      >
        Selecione competência e filial
      </div>

      <div
        id="pixEvidenciaDropzone"
        class="pix-evidence-dropzone"
      >
        <input
          type="file"
          id="pixEvidenciaInput"
          class="pix-evidence-input"
          accept="image/jpeg,image/png,image/webp"
          multiple
        />

        <div class="pix-evidence-dropzone-content">
          <div class="pix-evidence-upload-icon">
            ↑
          </div>

          <strong>
            Arraste as imagens para cá
          </strong>

          <small>
            Ou clique para selecionar JPG, PNG ou WEBP
          </small>

          <button
            type="button"
            id="btnSelecionarPixEvidencia"
            class="pix-evidence-select"
          >
            Selecionar imagens
          </button>
        </div>
      </div>

      <p
        id="pixEvidenciaMensagem"
        class="pix-evidence-message"
      ></p>

      <div
        id="pixEvidenciaGaleria"
        class="pix-evidence-gallery"
      ></div>
    </section>
  `;

  if (resultadoPreview) {
    resultadoPreview.insertAdjacentHTML(
      "afterend",
      html
    );
  } else if (modalActions) {
    modalActions.insertAdjacentHTML(
      "beforebegin",
      html
    );
  } else if (campos) {
    campos.insertAdjacentHTML(
      "afterend",
      html
    );
  } else {
    form.insertAdjacentHTML(
      "beforeend",
      html
    );
  }

  configurarUploadPix();

  [
    pixCampoCompetencia(),
    pixCampoFilial(),
    pixCampoParticipante()
  ]
    .filter(Boolean)
    .forEach(campo => {
      if (campo.dataset.pixEvidenceBound === "true") {
        return;
      }

      campo.dataset.pixEvidenceBound = "true";

      campo.addEventListener(
        "change",
        carregarPixEvidencias
      );
    });

  return pixEv("#pixEvidenciasSection");
}

function mensagemPixEvidencia(
  texto,
  tipo = ""
) {
  const elemento =
    pixEv("#pixEvidenciaMensagem");

  if (!elemento) {
    return;
  }

  elemento.className =
    `pix-evidence-message ${tipo}`.trim();

  elemento.textContent =
    texto;
}

function renderizarPixEvidencias() {
  const galeria =
    pixEv("#pixEvidenciaGaleria");

  const contador =
    pixEv("#pixEvidenciaContador");

  const legenda =
    pixEv("#pixEvidenciaLegenda");

  if (contador) {
    contador.textContent =
      `${estadoPixEvidencias.arquivos.length}/${CONFIG_PIX_EVIDENCIAS.limiteArquivos}`;
  }

  if (legenda) {
    legenda.textContent =
      estadoPixEvidencias.contexto
        ? `${estadoPixEvidencias.contexto.dn ? `${estadoPixEvidencias.contexto.dn} - ` : ""}${estadoPixEvidencias.contexto.filial} • ${estadoPixEvidencias.contexto.competencia}`
        : "Selecione competência e filial";
  }

  if (!galeria) {
    return;
  }

  if (!estadoPixEvidencias.arquivos.length) {
    galeria.innerHTML = `
      <div class="pix-evidence-empty">
        <strong>
          Nenhuma evidência anexada
        </strong>

        <span>
          As imagens desta filial aparecerão aqui.
        </span>
      </div>
    `;

    return;
  }

  galeria.innerHTML =
    estadoPixEvidencias.arquivos
      .map(
        arquivo => `
          <article class="pix-evidence-card">
            <button
              type="button"
              class="pix-evidence-image"
              data-pix-evidence-open="${escaparPixEv(arquivo.url)}"
            >
              <img
                src="${escaparPixEv(arquivo.url)}"
                alt="Evidência do Pix"
                loading="lazy"
              />
            </button>

            <div class="pix-evidence-card-info">
              <span>
                Evidência — ${escaparPixEv(estadoPixEvidencias.contexto?.filial)}
              </span>

              <button
                type="button"
                class="pix-evidence-remove"
                data-pix-evidence-path="${escaparPixEv(arquivo.caminho)}"
              >
                Excluir
              </button>
            </div>
          </article>
        `
      )
      .join("");

  galeria
    .querySelectorAll("[data-pix-evidence-open]")
    .forEach(
      botao =>
        botao.addEventListener(
          "click",
          () =>
            abrirImagemPix(
              botao.dataset.pixEvidenceOpen
            )
        )
    );

  galeria
    .querySelectorAll("[data-pix-evidence-path]")
    .forEach(
      botao =>
        botao.addEventListener(
          "click",
          () =>
            excluirPixEvidencia(
              botao.dataset.pixEvidencePath
            )
        )
    );
}

async function carregarPixEvidencias() {
  garantirHtmlEvidenciasPix();

  const contexto =
    contextoPixAtual();

  estadoPixEvidencias.contexto =
    contexto;

  if (!contexto) {
    estadoPixEvidencias.arquivos = [];

    mensagemPixEvidencia(
      "Selecione competência e filial."
    );

    renderizarPixEvidencias();
    return;
  }

  try {
    mensagemPixEvidencia(
      "Carregando evidências...",
      "loading"
    );

    estadoPixEvidencias.arquivos =
      await listarEvidenciasContextoPix(
        contexto
      );

    mensagemPixEvidencia(
      estadoPixEvidencias.arquivos.length
        ? `${estadoPixEvidencias.arquivos.length} evidência(s) encontrada(s).`
        : "Nenhuma evidência cadastrada para esta filial.",
      estadoPixEvidencias.arquivos.length
        ? "success"
        : ""
    );

    renderizarPixEvidencias();
  } catch (erro) {
    console.error(
      "[PIX EVIDÊNCIAS] Erro ao carregar:",
      erro
    );

    estadoPixEvidencias.arquivos = [];

    mensagemPixEvidencia(
      erro.message ||
      "Não foi possível carregar as evidências.",
      "error"
    );

    renderizarPixEvidencias();
  }
}

function validarArquivoPix(arquivo) {
  if (
    !CONFIG_PIX_EVIDENCIAS.tiposPermitidos.includes(
      arquivo.type
    )
  ) {
    throw new Error(
      `${arquivo.name}: use JPG, PNG ou WEBP.`
    );
  }

  const limite =
    CONFIG_PIX_EVIDENCIAS.limiteMbOriginal *
    1024 *
    1024;

  if (arquivo.size > limite) {
    throw new Error(
      `${arquivo.name}: máximo de ${CONFIG_PIX_EVIDENCIAS.limiteMbOriginal} MB.`
    );
  }
}

function carregarImagemLocalPix(arquivo) {
  return new Promise(
    (resolve, reject) => {
      const imagem =
        new Image();

      const url =
        URL.createObjectURL(
          arquivo
        );

      imagem.onload = () => {
        URL.revokeObjectURL(url);
        resolve(imagem);
      };

      imagem.onerror = erro => {
        URL.revokeObjectURL(url);
        reject(erro);
      };

      imagem.src = url;
    }
  );
}

async function comprimirImagemPix(arquivo) {
  validarArquivoPix(arquivo);

  const imagem =
    await carregarImagemLocalPix(
      arquivo
    );

  const maiorLado =
    Math.max(
      imagem.naturalWidth,
      imagem.naturalHeight
    );

  const escala =
    maiorLado >
    CONFIG_PIX_EVIDENCIAS.larguraMaxima
      ? CONFIG_PIX_EVIDENCIAS.larguraMaxima /
        maiorLado
      : 1;

  const largura =
    Math.round(
      imagem.naturalWidth *
      escala
    );

  const altura =
    Math.round(
      imagem.naturalHeight *
      escala
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = largura;
  canvas.height = altura;

  canvas
    .getContext("2d")
    .drawImage(
      imagem,
      0,
      0,
      largura,
      altura
    );

  return await new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error(
                "Não foi possível comprimir a imagem."
              )
            );
          }
        },
        "image/jpeg",
        CONFIG_PIX_EVIDENCIAS.qualidadeJpeg
      );
    }
  );
}

function nomeArquivoPixEvidencia() {
  const id =
    crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  return `${Date.now()}-${id}.jpg`;
}

async function enviarPixEvidencias(
  arquivosRecebidos
) {
  const contexto =
    contextoPixAtual();

  if (!contexto) {
    alert(
      "Selecione primeiro a competência e a filial."
    );

    return;
  }

  if (estadoPixEvidencias.enviando) {
    return;
  }

  const arquivos =
    [...arquivosRecebidos];

  if (!arquivos.length) {
    return;
  }

  const vagas =
    CONFIG_PIX_EVIDENCIAS.limiteArquivos -
    estadoPixEvidencias.arquivos.length;

  if (arquivos.length > vagas) {
    alert(
      `Você pode adicionar somente mais ${vagas} imagem(ns).`
    );

    return;
  }

  try {
    estadoPixEvidencias.enviando =
      true;

    pixEv("#pixEvidenciaDropzone")
      ?.classList.add(
        "uploading"
      );

    let numero = 0;

    for (const arquivo of arquivos) {
      numero += 1;

      mensagemPixEvidencia(
        `Preparando imagem ${numero} de ${arquivos.length}...`,
        "loading"
      );

      const imagem =
        await comprimirImagemPix(
          arquivo
        );

      const caminho =
        `${contexto.pasta}/${nomeArquivoPixEvidencia()}`;

      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(
          caminho,
          imagem,
          {
            contentType:
              "image/jpeg",
            cacheControl:
              "3600",
            upsert:
              false,
            metadata: {
              nome_original:
                arquivo.name,
              campanha:
                "PIX_DO_PRESIDENTE",
              competencia:
                contexto.competencia,
              dn:
                contexto.dn,
              filial:
                contexto.filial
            }
          }
        );

      if (error) {
        throw error;
      }
    }

    await carregarPixEvidencias();

    mensagemPixEvidencia(
      "Evidências enviadas com sucesso para esta filial.",
      "success"
    );

    atualizarBotoesPixEvidencia();
  } catch (erro) {
    console.error(
      "[PIX EVIDÊNCIAS] Erro no envio:",
      erro
    );

    alert(
      erro.message ||
      "Não foi possível enviar as evidências."
    );

    mensagemPixEvidencia(
      erro.message ||
      "Falha no envio.",
      "error"
    );
  } finally {
    estadoPixEvidencias.enviando =
      false;

    pixEv("#pixEvidenciaDropzone")
      ?.classList.remove(
        "uploading"
      );

    const input =
      pixEv("#pixEvidenciaInput");

    if (input) {
      input.value = "";
    }
  }
}

async function excluirPixEvidencia(caminho) {
  if (
    !confirm(
      "Excluir esta evidência do Pix para toda a filial?"
    )
  ) {
    return;
  }

  try {
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([caminho]);

    if (error) {
      throw error;
    }

    await carregarPixEvidencias();

    atualizarBotoesPixEvidencia();
  } catch (erro) {
    console.error(
      "[PIX EVIDÊNCIAS] Erro ao excluir:",
      erro
    );

    alert(
      erro.message ||
      "Não foi possível excluir a evidência."
    );
  }
}

function configurarUploadPix() {
  const dropzone =
    pixEv("#pixEvidenciaDropzone");

  const input =
    pixEv("#pixEvidenciaInput");

  const botao =
    pixEv("#btnSelecionarPixEvidencia");

  if (!dropzone || !input) {
    return;
  }

  botao?.addEventListener(
    "click",
    evento => {
      evento.stopPropagation();
      input.click();
    }
  );

  dropzone.addEventListener(
    "click",
    evento => {
      if (
        !evento.target.closest(
          "button, a"
        )
      ) {
        input.click();
      }
    }
  );

  input.addEventListener(
    "change",
    () =>
      enviarPixEvidencias(
        input.files
      )
  );

  [
    "dragenter",
    "dragover"
  ].forEach(
    nome =>
      dropzone.addEventListener(
        nome,
        evento => {
          evento.preventDefault();

          dropzone.classList.add(
            "dragging"
          );
        }
      )
  );

  [
    "dragleave",
    "drop"
  ].forEach(
    nome =>
      dropzone.addEventListener(
        nome,
        evento => {
          evento.preventDefault();

          dropzone.classList.remove(
            "dragging"
          );
        }
      )
  );

  dropzone.addEventListener(
    "drop",
    evento =>
      enviarPixEvidencias(
        evento.dataTransfer.files
      )
  );
}

/* =========================================================
   VISUALIZADOR
========================================================= */

function garantirModalPixEvidencias() {
  if (pixEv("#modalPixEvidencias")) {
    return;
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <dialog
        id="modalPixEvidencias"
        class="pix-evidence-viewer-dialog"
      >
        <div class="pix-evidence-viewer">
          <div class="pix-evidence-viewer-header">
            <div>
              <p class="eyebrow">
                Pix do Presidente
              </p>

              <h2 id="pixEvidenceViewerTitle">
                Evidências da filial
              </h2>
            </div>

            <button
              type="button"
              id="fecharModalPixEvidencias"
              class="icon-btn"
            >
              ×
            </button>
          </div>

          <div
            id="pixEvidenceViewerBody"
            class="pix-evidence-viewer-body"
          ></div>
        </div>
      </dialog>

      <dialog
        id="modalPixImagemEvidencia"
        class="pix-evidence-image-dialog"
      >
        <button
          type="button"
          id="fecharPixImagemEvidencia"
          class="pix-evidence-image-close"
        >
          ×
        </button>

        <img
          id="pixImagemEvidenciaAmpliada"
          alt="Evidência do Pix ampliada"
        />
      </dialog>
    `
  );

  pixEv("#fecharModalPixEvidencias")
    ?.addEventListener(
      "click",
      () =>
        pixEv("#modalPixEvidencias")
          ?.close()
    );

  pixEv("#fecharPixImagemEvidencia")
    ?.addEventListener(
      "click",
      () =>
        pixEv("#modalPixImagemEvidencia")
          ?.close()
    );
}

function abrirImagemPix(url) {
  garantirModalPixEvidencias();

  const imagem =
    pixEv("#pixImagemEvidenciaAmpliada");

  if (imagem) {
    imagem.src = url;
  }

  pixEv("#modalPixImagemEvidencia")
    ?.showModal();
}

async function abrirAlbumPix(
  competencia,
  filial,
  dn = ""
) {
  garantirModalPixEvidencias();

  const contexto =
    construirContextoPix(
      competencia,
      filial,
      dn
    );

  if (!contexto) {
    return;
  }

  const titulo =
    pixEv("#pixEvidenceViewerTitle");

  const corpo =
    pixEv("#pixEvidenceViewerBody");

  if (titulo) {
    titulo.textContent =
      `${contexto.dn ? `${contexto.dn} - ` : ""}${contexto.filial} • ${contexto.competencia}`;
  }

  if (corpo) {
    corpo.innerHTML =
      `<div class="pix-evidence-viewer-empty">Carregando...</div>`;
  }

  pixEv("#modalPixEvidencias")
    ?.showModal();

  try {
    const arquivos =
      await listarEvidenciasContextoPix(
        contexto
      );

    if (!corpo) {
      return;
    }

    corpo.innerHTML =
      arquivos.length
        ? arquivos.map(
            arquivo => `
              <button
                type="button"
                class="pix-evidence-viewer-card"
                data-pix-view-image="${escaparPixEv(arquivo.url)}"
              >
                <img
                  src="${escaparPixEv(arquivo.url)}"
                  alt="Evidência do Pix"
                  loading="lazy"
                />

                <span>
                  Evidência — ${escaparPixEv(contexto.filial)}
                </span>
              </button>
            `
          ).join("")
        : `
          <div class="pix-evidence-viewer-empty">
            Nenhuma evidência encontrada.
          </div>
        `;

    corpo
      .querySelectorAll("[data-pix-view-image]")
      .forEach(
        botao =>
          botao.addEventListener(
            "click",
            () =>
              abrirImagemPix(
                botao.dataset.pixViewImage
              )
          )
      );
  } catch (erro) {
    console.error(
      "[PIX EVIDÊNCIAS] Erro ao abrir álbum:",
      erro
    );

    if (corpo) {
      corpo.innerHTML = `
        <div class="pix-evidence-viewer-empty error">
          Não foi possível carregar as evidências.
        </div>
      `;
    }
  }
}

function dadosLinhaPix(linha) {
  const celulas =
    [...linha.children];

  return {
    competencia:
      celulas[0]?.textContent?.trim() || "",
    semana:
      celulas[1]?.textContent?.trim() || "",
    filial:
      celulas[2]?.textContent?.trim() || ""
  };
}

function adicionarBotaoPixNaLinha(linha) {
  if (
    linha.querySelector(
      ".pix-evidence-row-button"
    )
  ) {
    return;
  }

  const dados =
    dadosLinhaPix(linha);

  if (
    !dados.competencia ||
    !dados.filial
  ) {
    return;
  }

  const destino =
    linha.lastElementChild;

  if (!destino) {
    return;
  }

  const botao =
    document.createElement(
      "button"
    );

  botao.type =
    "button";

  botao.className =
    "mini-btn pix-evidence-row-button";

  botao.innerHTML =
    "📷 Evidência";

  botao.addEventListener(
    "click",
    evento => {
      evento.preventDefault();
      evento.stopPropagation();

      abrirAlbumPix(
        dados.competencia,
        dados.filial
      );
    }
  );

  let acoes =
    destino.querySelector(
      ".actions"
    );

  if (!acoes) {
    acoes =
      document.createElement(
        "div"
      );

    acoes.className =
      "actions";

    destino.appendChild(
      acoes
    );
  }

  acoes.prepend(botao);
}

function atualizarBotoesPixEvidencia() {
  pixEvTodos(
    "#pixTabelaLancamentos tr"
  ).forEach(
    adicionarBotaoPixNaLinha
  );

  /*
   * Na apuração não há coluna de ações.
   * Criamos uma pequena célula somente se necessário.
   */
  pixEvTodos(
    "#pixTabelaApuracao tr"
  ).forEach(
    linha => {
      if (
        linha.querySelector(
          ".pix-evidence-row-button"
        )
      ) {
        return;
      }

      const dados =
        dadosLinhaPix(linha);

      if (
        !dados.competencia ||
        !dados.filial
      ) {
        return;
      }

      const ultima =
        linha.lastElementChild;

      if (!ultima) {
        return;
      }

      const botao =
        document.createElement(
          "button"
        );

      botao.type =
        "button";

      botao.className =
        "mini-btn pix-evidence-row-button";

      botao.innerHTML =
        "📷 Evidência";

      botao.addEventListener(
        "click",
        evento => {
          evento.preventDefault();
          evento.stopPropagation();

          abrirAlbumPix(
            dados.competencia,
            dados.filial
          );
        }
      );

      ultima.appendChild(botao);
    }
  );
}

function observarTabelasPix() {
  [
    "#pixTabelaLancamentos",
    "#pixTabelaApuracao"
  ].forEach(
    seletor => {
      const tabela =
        pixEv(seletor);

      if (!tabela) {
        return;
      }

      new MutationObserver(
        atualizarBotoesPixEvidencia
      ).observe(
        tabela,
        {
          childList: true,
          subtree: true
        }
      );
    }
  );

  atualizarBotoesPixEvidencia();
}

/* =========================================================
   DADOS EXCLUSIVOS DO PIX PARA EXPORTAÇÃO
========================================================= */

function mapaCabecalhoPix(tabela) {
  const cabecalhos =
    [...tabela.querySelectorAll("thead th")];

  const mapa = {};

  cabecalhos.forEach(
    (th, indice) => {
      const texto =
        normalizarPixEv(
          th.textContent
        );

      if (texto.includes("COMPET")) mapa.competencia = indice;
      if (texto.includes("SEMANA")) mapa.semana = indice;
      if (texto.includes("FILIAL")) mapa.filial = indice;
      if (texto.includes("COLABORADOR")) mapa.colaborador = indice;
      if (texto.includes("CARGO")) mapa.cargo = indice;
      if (texto.includes("INDICADORES")) mapa.indicadores = indice;
      if (texto.includes("BONIF") && texto.includes("FAT")) mapa.bonusFaturamento = indice;
      if (texto.includes("TICKET")) mapa.bonusTicket = indice;
      if (texto === "NPS") mapa.nps = indice;
      if (texto.includes("PENALIDADE")) mapa.penalidade = indice;
      if (texto === "TOTAL") mapa.total = indice;
      if (texto.includes("STATUS")) mapa.status = indice;
    }
  );

  return mapa;
}

function normalizarCompetenciaPixExportacao(valor) {
  const texto =
    String(valor ?? "").trim();

  if (/^\d{4}-\d{2}$/.test(texto)) {
    return texto;
  }

  const formatoBr =
    texto.match(
      /^(\d{2})\/(\d{4})$/
    );

  if (formatoBr) {
    return `${formatoBr[2]}-${formatoBr[1]}`;
  }

  return texto;
}

function tipoExportacaoPixAtual() {
  const valor =
    normalizarPixEv(
      pixEv("#tipoExportacao")?.value ||
      pixEv("#pixTipoExportacao")?.value ||
      "HABILITADOS"
    );

  return valor.includes("TODOS")
    ? "todos"
    : "habilitados";
}

function tabelasPixDisponiveis() {
  const seletores = [
    "#pixTabelaApuracao",
    "#tabelaPixApuracao",
    "#pixTabelaLancamentos",
    "#tabelaPixLancamentos",
    "#pixHistoricoTabelaBody",
    "#pixHistoricoTabela tbody"
  ];

  const tabelas = [];

  for (const seletor of seletores) {
    const elemento =
      pixEv(seletor);

    if (!elemento) {
      continue;
    }

    const tabela =
      elemento.tagName === "TABLE"
        ? elemento
        : elemento.closest("table");

    if (
      tabela &&
      !tabelas.includes(tabela)
    ) {
      tabelas.push(tabela);
    }
  }

  return tabelas;
}

function quantidadeLinhasValidasPix(tabela) {
  return [
    ...tabela.querySelectorAll(
      "tbody tr"
    )
  ].filter(
    linha => {
      const texto =
        normalizarPixEv(
          linha.textContent
        );

      return (
        linha.children.length >= 5 &&
        texto &&
        !texto.includes("NENHUM") &&
        !texto.includes("CARREGANDO")
      );
    }
  ).length;
}

function tabelaPixComResultados() {
  const tabelas =
    tabelasPixDisponiveis();

  return tabelas
    .map(
      tabela => ({
        tabela,
        quantidade:
          quantidadeLinhasValidasPix(
            tabela
          )
      })
    )
    .sort(
      (a, b) =>
        b.quantidade -
        a.quantidade
    )[0]?.tabela || null;
}

function limparStatusPixExportacao(valor) {
  const texto =
    normalizarPixEv(valor);

  /*
   * A célula de ações pode acrescentar textos como:
   * "Evidência", "Editar" e "Excluir".
   *
   * Para o relatório, mantemos somente o status real.
   */
  if (
    texto.includes("NAO HABILITADO") ||
    texto.includes("NÃO HABILITADO")
  ) {
    return "NÃO HABILITADO";
  }

  if (texto.includes("HABILITADO")) {
    return "HABILITADO";
  }

  return texto || "NÃO HABILITADO";
}

const DNs_PIX_POR_FILIAL = {
  "ANANINDEUA": "4700",
  "SAO LUIS": "4731",
  "BACABAL": "1960",
  "MACAPA": "4756",
  "TERESINA": "4730",
  "URUCUI": "4730",
  "SINOP": "1928",
  "CUIABA": "4738",
  "AGUA BOA": "4738",
  "RONDONOPOLIS": "4774"
};

function resolverDnPixPorFilial(
  filialRecebida,
  dnRecebido = ""
) {
  const dnLimpo =
    String(dnRecebido || "")
      .replace(/\D/g, "");

  if (dnLimpo) {
    return dnLimpo;
  }

  const filial =
    normalizarPixEv(filialRecebida);

  /*
   * Primeiro procura o DN nas opções já carregadas no sistema.
   */
  const opcoes =
    [
      ...document.querySelectorAll(
        "select option"
      )
    ];

  for (const opcao of opcoes) {
    const texto =
      normalizarPixEv(
        opcao.textContent
      );

    const filialOpcao =
      normalizarPixEv(
        opcao.dataset?.filial ||
        texto.replace(
          /^\d+\s*-\s*/,
          ""
        )
      );

    if (
      filialOpcao === filial ||
      texto.endsWith(`- ${filial}`) ||
      texto === filial
    ) {
      const dn =
        String(
          opcao.dataset?.dn ||
          texto.match(
            /^\s*(\d+)\s*-/
          )?.[1] ||
          ""
        ).replace(/\D/g, "");

      if (dn) {
        return dn;
      }
    }
  }

  /*
   * Fallback para as filiais já conhecidas pelo módulo.
   * BACABAL = DN 1960.
   */
  return (
    DNs_PIX_POR_FILIAL[filial] ||
    ""
  );
}

function dadosPixParaExportar() {
  const tabela =
    tabelaPixComResultados();

  if (!tabela) {
    console.warn(
      "[PIX EXPORTAÇÃO] Nenhuma tabela do Pix foi encontrada."
    );

    return [];
  }

  const tbody =
    tabela.querySelector("tbody");

  if (!tbody) {
    return [];
  }

  const mapa =
    mapaCabecalhoPix(tabela);

  const competenciaSelecionada =
    normalizarCompetenciaPixExportacao(
      competenciaPixAtiva()
    );

  const tipo =
    tipoExportacaoPixAtual();

  const resultados = [
    ...tbody.querySelectorAll("tr")
  ]
    .map(
      linha => {
        const celulas =
          [...linha.children];

        if (celulas.length < 5) {
          return null;
        }

        const valor = indice =>
          indice === undefined
            ? ""
            : celulas[indice]
                ?.textContent
                ?.replace(/\s+/g, " ")
                ?.trim() || "";

        /*
         * As tabelas de Lançamentos e Apuração possuem
         * cabeçalhos completos. O Histórico mensal possui
         * outra estrutura; por isso usamos os nomes do
         * cabeçalho quando disponíveis e índices de apoio.
         */
        const competenciaBruta =
          valor(
            mapa.competencia ?? 0
          );

        const statusBruto =
          valor(
            mapa.status ??
            Math.max(
              0,
              celulas.length - 2
            )
          );

        const item = {
          competencia:
            normalizarCompetenciaPixExportacao(
              competenciaBruta ||
              competenciaSelecionada
            ),
          semana:
            valor(mapa.semana ?? 1),
          filial:
            valor(mapa.filial ?? 2),
          colaborador:
            valor(mapa.colaborador ?? 3),
          cargo:
            valor(mapa.cargo ?? 4),
          indicadores:
            valor(mapa.indicadores ?? 5),
          bonusFaturamento:
            numeroPixEv(
              valor(
                mapa.bonusFaturamento ?? 6
              )
            ),
          bonusTicket:
            numeroPixEv(
              valor(
                mapa.bonusTicket ?? 7
              )
            ),
          nps:
            numeroPixEv(
              valor(mapa.nps ?? 8)
            ),
          penalidade:
            numeroPixEv(
              valor(
                mapa.penalidade ?? 9
              )
            ),
          total:
            numeroPixEv(
              valor(
                mapa.total ??
                Math.max(
                  0,
                  celulas.length - 3
                )
              )
            ),
          status:
            limparStatusPixExportacao(
              statusBruto
            )
        };

        if (
          !item.colaborador ||
          normalizarPixEv(
            item.colaborador
          ).includes("NENHUM")
        ) {
          return null;
        }

        if (
          competenciaSelecionada &&
          item.competencia &&
          item.competencia !==
            competenciaSelecionada
        ) {
          return null;
        }

        const statusNormalizado =
          limparStatusPixExportacao(
            item.status
          );

        if (
          tipo === "habilitados" &&
          statusNormalizado !==
            "HABILITADO"
        ) {
          return null;
        }

        return item;
      }
    )
    .filter(Boolean);

  console.info(
    `[PIX EXPORTAÇÃO] ${resultados.length} resultado(s) preparado(s).`,
    {
      competencia:
        competenciaSelecionada,
      tipo,
      tabela:
        tabela.id || "sem-id"
    }
  );

  return resultados;
}
function competenciaExibicaoPix(
  competencia
) {
  if (!competencia) {
    return "";
  }

  const [ano, mes] =
    competencia.split("-");

  return `${mes}/${ano}`;
}

function nomeRelatorioPix(
  extensao
) {
  const competencia =
    competenciaPixAtiva() ||
    "sem-competencia";

  return `pix-do-presidente-${competencia}.${extensao}`;
}

/* =========================================================
   BUSCA DE TODAS AS EVIDÊNCIAS DO PIX NA COMPETÊNCIA
========================================================= */

async function buscarEvidenciasPixCompetencia(
  competencia
) {
  if (!competencia) {
    return [];
  }

  const pastaCompetencia =
    `${CONFIG_PIX_EVIDENCIAS.pastaRaiz}/${competencia}`;

  const {
    data: pastas,
    error
  } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .list(
      pastaCompetencia,
      {
        limit: 200,
        sortBy: {
          column: "name",
          order: "asc"
        }
      }
    );

  if (error) {
    throw error;
  }

  const grupos =
    await Promise.all(
      (pastas || [])
        .filter(
          item =>
            !item.id &&
            item.name
        )
        .map(
          async pasta => {
            const caminho =
              `${pastaCompetencia}/${pasta.name}`;

            const {
              data: arquivos,
              error: erroArquivos
            } = await supabase.storage
              .from(SUPABASE_BUCKET)
              .list(
                caminho,
                {
                  limit:
                    CONFIG_PIX_EVIDENCIAS.limiteArquivos,
                  sortBy: {
                    column:
                      "created_at",
                    order:
                      "asc"
                  }
                }
              );

            if (erroArquivos) {
              throw erroArquivos;
            }

            let dn = "";
            let filial = "";

            if (
              pasta.name.startsWith(
                "sem-dn-"
              )
            ) {
              filial =
                pasta.name
                  .slice(
                    "sem-dn-".length
                  )
                  .replace(
                    /-/g,
                    " "
                  )
                  .toUpperCase();
            } else {
              const partes =
                pasta.name.split("-");

              dn =
                /^\d+$/.test(partes[0])
                  ? partes.shift()
                  : "";

              filial =
                partes
                  .join(" ")
                  .toUpperCase();
            }

            dn =
              resolverDnPixPorFilial(
                filial,
                dn
              );

            return {
              dn,
              filial,
              imagens:
                (arquivos || [])
                  .filter(
                    item =>
                      item.id &&
                      item.name
                  )
                  .map(
                    item => {
                      const caminhoImagem =
                        `${caminho}/${item.name}`;

                      return {
                        nome:
                          item.name,
                        caminho:
                          caminhoImagem,
                        url:
                          urlPublicaPix(
                            caminhoImagem
                          )
                      };
                    }
                  )
            };
          }
        )
    );

  return grupos.filter(
    grupo =>
      grupo.imagens.length
  );
}

function imagemRemotaParaDataPix(url) {
  return new Promise(
    (resolve, reject) => {
      const imagem =
        new Image();

      imagem.crossOrigin =
        "anonymous";

      imagem.onload = () => {
        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width =
          imagem.naturalWidth;

        canvas.height =
          imagem.naturalHeight;

        canvas
          .getContext("2d")
          .drawImage(
            imagem,
            0,
            0
          );

        const dataUrl =
          canvas.toDataURL(
            "image/jpeg",
            0.88
          );

        resolve({
          dataUrl,
          base64:
            dataUrl.split(",")[1],
          largura:
            imagem.naturalWidth,
          altura:
            imagem.naturalHeight
        });
      };

      imagem.onerror =
        () =>
          reject(
            new Error(
              "Não foi possível carregar uma evidência."
            )
          );

      imagem.src = url;
    }
  );
}

/* =========================================================
   PDF EXCLUSIVO DO PIX
========================================================= */

async function exportarPdfPixIndependente() {
  const resultados =
    dadosPixParaExportar();

  if (!resultados.length) {
    alert(
      "Não existem resultados do Pix para a competência e o filtro selecionados. Verifique o mês e altere para Todos os resultados, se necessário."
    );

    return;
  }

  if (
    !window.jspdf?.jsPDF
  ) {
    throw new Error(
      "Biblioteca jsPDF não encontrada."
    );
  }

  const competencia =
    competenciaPixAtiva();

  const tipo =
    pixEv("#tipoExportacao")
      ?.value === "todos"
      ? "Todos os resultados"
      : "Somente habilitados";

  const documento =
    new window.jspdf.jsPDF({
      orientation:
        "landscape",
      unit:
        "mm",
      format:
        "a4"
    });

  documento.setFillColor(
    11,
    49,
    84
  );

  documento.rect(
    0,
    0,
    297,
    34,
    "F"
  );

  documento.setTextColor(
    255,
    255,
    255
  );

  documento.setFont(
    "helvetica",
    "bold"
  );

  documento.setFontSize(
    20
  );

  documento.text(
    "PIX DO PRESIDENTE",
    12,
    14
  );

  documento.setFont(
    "helvetica",
    "normal"
  );

  documento.setFontSize(
    9
  );

  documento.text(
    `Competência: ${competenciaExibicaoPix(competencia)}`,
    12,
    23
  );

  documento.text(
    `Exportação: ${tipo}`,
    12,
    29
  );

  const total =
    resultados.reduce(
      (soma, item) =>
        soma + item.total,
      0
    );

  const filiais =
    new Set(
      resultados.map(
        item =>
          item.filial
      )
    ).size;

  documento.autoTable({
    startY: 40,
    margin: {
      left: 10,
      right: 10
    },
    head: [[
      "Competência",
      "Semana",
      "Filial",
      "Colaborador",
      "Cargo",
      "Indicadores",
      "Bonif. faturamento",
      "Bônus ticket",
      "NPS",
      "Penalidade",
      "Total",
      "Status"
    ]],
    body:
      resultados.map(
        item => [
          competenciaExibicaoPix(
            item.competencia
          ),
          item.semana,
          item.filial,
          item.colaborador,
          item.cargo,
          item.indicadores,
          moedaPixEv(
            item.bonusFaturamento
          ),
          moedaPixEv(
            item.bonusTicket
          ),
          moedaPixEv(
            item.nps
          ),
          moedaPixEv(
            item.penalidade
          ),
          moedaPixEv(
            item.total
          ),
          limparStatusPixExportacao(
            item.status
          )
        ]
      ),
    theme:
      "grid",
    styles: {
      font:
        "helvetica",
      fontSize:
        6.2,
      cellPadding:
        1.7,
      valign:
        "middle",
      lineColor:
        [222, 230, 235],
      lineWidth:
        0.15
    },
    headStyles: {
      fillColor:
        [11, 122, 83],
      textColor:
        [255, 255, 255],
      fontStyle:
        "bold"
    },
    alternateRowStyles: {
      fillColor:
        [247, 250, 252]
    },
    didParseCell:
      dados => {
        if (
          dados.section === "body" &&
          dados.column.index === 11
        ) {
          const status =
            limparStatusPixExportacao(
              dados.cell.raw
            );

          dados.cell.text = [
            status
          ];

          const habilitado =
            status ===
            "HABILITADO";

          dados.cell.styles.fontStyle =
            "bold";

          dados.cell.styles.textColor =
            habilitado
              ? [8, 115, 68]
              : [164, 33, 33];
        }
      }
  });

  const evidencias =
    await buscarEvidenciasPixCompetencia(
      competencia
    );

  for (const grupo of evidencias) {
    documento.addPage();

    documento.setTextColor(
      15,
      35,
      52
    );

    documento.setFont(
      "helvetica",
      "bold"
    );

    documento.setFontSize(
      16
    );

    documento.text(
      "EVIDÊNCIAS — PIX DO PRESIDENTE",
      14,
      17
    );

    documento.setFontSize(
      11
    );

    documento.text(
      `Filial: ${grupo.dn ? `${grupo.dn} - ` : ""}${grupo.filial}`,
      14,
      26
    );

    documento.text(
      `Competência: ${competenciaExibicaoPix(competencia)}`,
      14,
      33
    );

    let y = 41;

    for (const item of grupo.imagens) {
      const imagem =
        await imagemRemotaParaDataPix(
          item.url
        );

      const proporcao =
        Math.min(
          255 /
          imagem.largura,
          125 /
          imagem.altura
        );

      const largura =
        imagem.largura *
        proporcao;

      const altura =
        imagem.altura *
        proporcao;

      if (
        y +
        altura +
        16 >
        195
      ) {
        documento.addPage();
        y = 18;
      }

      const x =
        (297 - largura) /
        2;

      documento.addImage(
        imagem.dataUrl,
        "JPEG",
        x,
        y,
        largura,
        altura
      );

      y += altura + 5;

      documento.setFont(
        "helvetica",
        "normal"
      );

      documento.setFontSize(
        9
      );

      documento.text(
        `Evidência — ${grupo.dn ? `${grupo.dn} - ` : ""}${grupo.filial}`,
        14,
        y
      );

      y += 12;
    }
  }

  documento.save(
    nomeRelatorioPix("pdf")
  );
}

/* =========================================================
   EXCEL EXCLUSIVO DO PIX
========================================================= */

async function exportarExcelPixIndependente() {
  const resultados =
    dadosPixParaExportar();

  if (!resultados.length) {
    alert(
      "Não existem resultados do Pix para a competência e o filtro selecionados. Verifique o mês e altere para Todos os resultados, se necessário."
    );

    return;
  }

  if (!window.ExcelJS) {
    throw new Error(
      "Biblioteca ExcelJS não encontrada."
    );
  }

  const competencia =
    competenciaPixAtiva();

  const workbook =
    new ExcelJS.Workbook();

  workbook.creator =
    "Sistema de Campanhas Pós-Vendas";

  workbook.created =
    new Date();

  const planilha =
    workbook.addWorksheet(
      "Pix do Presidente",
      {
        views: [
          {
            state:
              "frozen",
            ySplit:
              8,
            showGridLines:
              false
          }
        ]
      }
    );

  planilha.columns = [
    { key: "competencia", width: 14 },
    { key: "semana", width: 11 },
    { key: "filial", width: 18 },
    { key: "colaborador", width: 29 },
    { key: "cargo", width: 29 },
    { key: "indicadores", width: 42 },
    { key: "bonusFaturamento", width: 19 },
    { key: "bonusTicket", width: 17 },
    { key: "nps", width: 14 },
    { key: "penalidade", width: 15 },
    { key: "total", width: 16 },
    { key: "status", width: 18 }
  ];

  planilha.mergeCells(
    "A1:L2"
  );

  const titulo =
    planilha.getCell(
      "A1"
    );

  titulo.value =
    "PIX DO PRESIDENTE";

  titulo.font = {
    bold:
      true,
    size:
      20,
    color: {
      argb:
        "FFFFFFFF"
    }
  };

  titulo.fill = {
    type:
      "pattern",
    pattern:
      "solid",
    fgColor: {
      argb:
        "FF0B3154"
    }
  };

  titulo.alignment = {
    vertical:
      "middle",
    horizontal:
      "left"
  };

  planilha.mergeCells(
    "A3:L3"
  );

  planilha.getCell(
    "A3"
  ).value =
    `Competência: ${competenciaExibicaoPix(competencia)}`;

  planilha.getCell(
    "A3"
  ).font = {
    bold:
      true,
    color: {
      argb:
        "FF0B3154"
    }
  };

  const total =
    resultados.reduce(
      (soma, item) =>
        soma + item.total,
      0
    );

  const habilitados =
    resultados.filter(
      item =>
        normalizarPixEv(
          item.status
        ) === "HABILITADO"
    ).length;

  const filiais =
    new Set(
      resultados.map(
        item =>
          item.filial
      )
    ).size;

  planilha.getCell("A5").value = "Resultados";
  planilha.getCell("A6").value = resultados.length;
  planilha.getCell("D5").value = "Habilitados";
  planilha.getCell("D6").value = habilitados;
  planilha.getCell("G5").value = "Filiais";
  planilha.getCell("G6").value = filiais;
  planilha.getCell("J5").value = "Total";
  planilha.getCell("J6").value = total;

  ["A5", "D5", "G5", "J5"].forEach(
    endereco => {
      planilha.getCell(endereco).font = {
        color: {
          argb:
            "FF526572"
        }
      };
    }
  );

  planilha.getCell("J6").numFmt =
    'R$ #,##0.00';

  const cabecalho =
    [
      "Competência",
      "Semana",
      "Filial",
      "Colaborador",
      "Cargo",
      "Indicadores",
      "Bonif. faturamento",
      "Bônus ticket",
      "NPS",
      "Penalidade",
      "Total",
      "Status"
    ];

  planilha.addRow([]);

  const linhaCabecalho =
    planilha.addRow(
      cabecalho
    );

  linhaCabecalho.eachCell(
    celula => {
      celula.font = {
        bold:
          true,
        color: {
          argb:
            "FFFFFFFF"
        }
      };

      celula.fill = {
        type:
          "pattern",
        pattern:
          "solid",
        fgColor: {
          argb:
            "FF0B7A53"
        }
      };

      celula.alignment = {
        vertical:
          "middle",
        horizontal:
          "center"
      };
    }
  );

  resultados.forEach(
    item => {
      const linha =
        planilha.addRow([
          competenciaExibicaoPix(
            item.competencia
          ),
          item.semana,
          item.filial,
          item.colaborador,
          item.cargo,
          item.indicadores,
          item.bonusFaturamento,
          item.bonusTicket,
          item.nps,
          item.penalidade,
          item.total,
          limparStatusPixExportacao(
            item.status
          )
        ]);

      [7, 8, 9, 10, 11].forEach(
        coluna => {
          linha.getCell(coluna).numFmt =
            'R$ #,##0.00';
        }
      );

      const status =
        linha.getCell(12);

      status.font = {
        bold:
          true,
        color: {
          argb:
            normalizarPixEv(
              limparStatusPixExportacao(
                item.status
              )
            ) === "HABILITADO"
              ? "FF087344"
              : "FFA42121"
        }
      };
    }
  );

  planilha.autoFilter = {
    from: "A8",
    to: "L8"
  };

  planilha.pageSetup = {
    orientation:
      "landscape",
    fitToPage:
      true,
    fitToWidth:
      1,
    fitToHeight:
      0,
    paperSize:
      9
  };

  const evidencias =
    await buscarEvidenciasPixCompetencia(
      competencia
    );

  const planilhaEvidencias =
    workbook.addWorksheet(
      "Evidências Pix",
      {
        views: [
          {
            showGridLines:
              false
          }
        ]
      }
    );

  planilhaEvidencias.columns = [
    { width: 4 },
    { width: 23 },
    { width: 23 },
    { width: 23 },
    { width: 23 },
    { width: 4 }
  ];

  planilhaEvidencias.mergeCells(
    "A1:F2"
  );

  const tituloEvidencias =
    planilhaEvidencias.getCell(
      "A1"
    );

  tituloEvidencias.value =
    "EVIDÊNCIAS — PIX DO PRESIDENTE";

  tituloEvidencias.font = {
    bold:
      true,
    size:
      18,
    color: {
      argb:
        "FFFFFFFF"
    }
  };

  tituloEvidencias.fill = {
    type:
      "pattern",
    pattern:
      "solid",
    fgColor: {
      argb:
        "FF0B3154"
    }
  };

  tituloEvidencias.alignment = {
    vertical:
      "middle",
    horizontal:
      "left"
  };

  let linhaAtual = 4;

  if (!evidencias.length) {
    planilhaEvidencias.mergeCells(
      `A${linhaAtual}:F${linhaAtual + 1}`
    );

    planilhaEvidencias.getCell(
      `A${linhaAtual}`
    ).value =
      "Nenhuma evidência cadastrada para esta competência.";
  }

  for (const grupo of evidencias) {
    planilhaEvidencias.mergeCells(
      `A${linhaAtual}:F${linhaAtual}`
    );

    const cabecalhoFilial =
      planilhaEvidencias.getCell(
        `A${linhaAtual}`
      );

    cabecalhoFilial.value =
      `${grupo.dn ? `${grupo.dn} - ` : ""}${grupo.filial}`;

    cabecalhoFilial.font = {
      bold:
        true,
      size:
        13,
      color: {
        argb:
          "FFFFFFFF"
      }
    };

    cabecalhoFilial.fill = {
      type:
        "pattern",
      pattern:
        "solid",
      fgColor: {
        argb:
          "FF0B7A53"
      }
    };

    linhaAtual += 1;

    let colunaImagem = 1;

    for (const item of grupo.imagens) {
      if (colunaImagem > 3) {
        colunaImagem = 1;
        linhaAtual += 11;
      }

      const imagem =
        await imagemRemotaParaDataPix(
          item.url
        );

      const imagemId =
        workbook.addImage({
          base64:
            imagem.base64,
          extension:
            "jpeg"
        });

      const colunaInicial =
        colunaImagem === 1
          ? 1
          : colunaImagem === 2
            ? 3
            : 5;

      planilhaEvidencias.addImage(
        imagemId,
        {
          tl: {
            col:
              colunaInicial - 1,
            row:
              linhaAtual - 1
          },
          ext: {
            width:
              180,
            height:
              120
          },
          editAs:
            "oneCell"
        }
      );

      planilhaEvidencias.getRow(
        linhaAtual
      ).height = 92;

      planilhaEvidencias.getCell(
        linhaAtual + 8,
        colunaInicial
      ).value =
        `Evidência — ${grupo.filial}`;

      planilhaEvidencias.getCell(
        linhaAtual + 8,
        colunaInicial
      ).font = {
        bold:
          true,
        size:
          9
      };

      colunaImagem += 1;
    }

    linhaAtual += 13;
  }

  const buffer =
    await workbook.xlsx.writeBuffer();

  const blob =
    new Blob(
      [buffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    URL.createObjectURL(
      blob
    );

  link.download =
    nomeRelatorioPix("xlsx");

  link.click();

  URL.revokeObjectURL(
    link.href
  );
}

/* =========================================================
   INTERCEPTAÇÃO INDEPENDENTE DOS BOTÕES
========================================================= */

function configurarExportacaoPixIndependente() {
  const botaoExcel =
    pixEv("#btnExportarExcel");

  const botaoPdf =
    pixEv("#btnExportarPdf");

  botaoExcel?.addEventListener(
    "click",
    evento => {
      if (!moduloPixAtivo()) {
        return;
      }

      evento.preventDefault();
      evento.stopPropagation();
      evento.stopImmediatePropagation();

      exportarExcelPixIndependente()
        .catch(
          erro => {
            console.error(
              "[PIX EXCEL] Erro:",
              erro
            );

            alert(
              erro.message ||
              "Não foi possível exportar o Excel do Pix."
            );
          }
        );
    },
    true
  );

  botaoPdf?.addEventListener(
    "click",
    evento => {
      if (!moduloPixAtivo()) {
        return;
      }

      evento.preventDefault();
      evento.stopPropagation();
      evento.stopImmediatePropagation();

      exportarPdfPixIndependente()
        .catch(
          erro => {
            console.error(
              "[PIX PDF] Erro:",
              erro
            );

            alert(
              erro.message ||
              "Não foi possível exportar o PDF do Pix."
            );
          }
        );
    },
    true
  );
}

function configurarContextoPixEvidencias() {
  garantirHtmlEvidenciasPix();

  [
    pixCampoCompetencia(),
    pixCampoFilial(),
    pixCampoParticipante()
  ]
    .filter(Boolean)
    .forEach(campo => {
      if (campo.dataset.pixEvidenceBound === "true") {
        return;
      }

      campo.dataset.pixEvidenceBound = "true";

      campo.addEventListener(
        "change",
        carregarPixEvidencias
      );
    });

  document.addEventListener(
    "click",
    evento => {
      if (
        evento.target.closest(
          "#btnNovoLancamentoPix, " +
          "#btnNovoPixPresidente, " +
          "[data-pix-edit]"
        )
      ) {
        setTimeout(
          carregarPixEvidencias,
          180
        );
      }
    }
  );
}

function iniciarPixEvidencias() {
  garantirHtmlEvidenciasPix();
  garantirModalPixEvidencias();
  configurarContextoPixEvidencias();
  observarTabelasPix();
  configurarExportacaoPixIndependente();
  renderizarPixEvidencias();

  console.info(
    "[PIX EVIDÊNCIAS] Módulo independente carregado."
  );
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    iniciarPixEvidencias,
    {
      once: true
    }
  );
} else {
  iniciarPixEvidencias();
}


document.addEventListener(
  "click",
  evento => {
    const abriuModalPix =
      evento.target.closest(
        "#btnNovoLancamentoPix, " +
        "#btnNovoPixPresidente, " +
        "#pixBtnNovoLancamento, " +
        "#pix-lancamentos .primary, " +
        "#pixTabelaLancamentos .mini-btn"
      );

    if (!abriuModalPix) {
      return;
    }

    setTimeout(
      () => {
        garantirHtmlEvidenciasPix();
        carregarPixEvidencias();
      },
      220
    );
  },
  true
);

window.evidenciasPix = {
  carregar:
    carregarPixEvidencias,
  abrir:
    abrirAlbumPix,
  exportarPdf:
    exportarPdfPixIndependente,
  exportarExcel:
    exportarExcelPixIndependente,
  buscarPorCompetencia:
    buscarEvidenciasPixCompetencia
};