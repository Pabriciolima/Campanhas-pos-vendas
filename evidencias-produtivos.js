import {
  firestore
} from "./firebase-config.js";

import {
  supabase
} from "./supabase-config.js";

import {
  doc as firebaseDoc,
  collection as firebaseCollection,
  getDocs as firebaseGetDocs,
  getDoc as firebaseGetDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* =========================================================
   EVIDÊNCIAS — CAMPANHA DOS PRODUTIVOS

   A evidência pertence à combinação:
   COMPETÊNCIA + FILIAL + CAMPANHA

   Portanto, uma imagem enviada no lançamento de qualquer
   colaborador vale para todos os colaboradores da mesma
   filial e competência.
========================================================= */

const EVIDENCIAS_COLLECTION =
  "evidencias_produtivos";

const EVIDENCIAS_SUPABASE_TABLE =
  "produtivos_evidencias";

/*
  O supabase-config.js atual exporta apenas `supabase`.
  O bucket já existente das evidências é mantido aqui para impedir
  que uma importação inexistente interrompa todo o módulo e desative
  os botões "Evidências".
*/
const SUPABASE_BUCKET =
  "evidencias-produtivos";

/* =========================================================
   ETAPA 05 — CAMADA COMPATÍVEL SUPABASE

   Mantém intactas todas as funções visuais e regras existentes
   deste arquivo. As operações que antes tinham formato Firestore
   passam a usar a tabela produtivos_evidencias no Supabase.

   Na primeira leitura, documentos antigos que ainda existirem
   somente no Firebase são copiados automaticamente. Depois disso,
   toda criação, edição, exclusão e tempo real usam o Supabase.
========================================================= */

const MARCADOR_TIMESTAMP =
  "__supabase_server_timestamp__";
const MARCADOR_ARRAY_UNION =
  "__supabase_array_union__";
const MARCADOR_ARRAY_REMOVE =
  "__supabase_array_remove__";

function serverTimestamp() {
  return {
    [MARCADOR_TIMESTAMP]: true
  };
}

function arrayUnion(...itens) {
  return {
    [MARCADOR_ARRAY_UNION]: itens
  };
}

function arrayRemove(...itens) {
  return {
    [MARCADOR_ARRAY_REMOVE]: itens
  };
}

function collection(_banco, nome) {
  return {
    tipo: "collection",
    nome
  };
}

function doc(_banco, nome, id) {
  return {
    tipo: "doc",
    nome,
    id: String(id || "")
  };
}

function serializarEvidenciaSupabase(valor) {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor?.toDate === "function") {
    return valor.toDate().toISOString();
  }
  if (Array.isArray(valor)) {
    return valor.map(serializarEvidenciaSupabase);
  }
  if (typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, item]) => [
        chave,
        serializarEvidenciaSupabase(item)
      ])
    );
  }
  return valor;
}

function iguaisEvidencia(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function aplicarPatchEvidencia(atual, patch) {
  const resultado = {
    ...(atual || {})
  };

  Object.entries(patch || {}).forEach(([chave, valor]) => {
    if (valor?.[MARCADOR_TIMESTAMP]) {
      resultado[chave] = new Date().toISOString();
      return;
    }

    if (Array.isArray(valor?.[MARCADOR_ARRAY_UNION])) {
      const lista = Array.isArray(resultado[chave])
        ? [...resultado[chave]]
        : [];

      valor[MARCADOR_ARRAY_UNION].forEach(item => {
        const itemSeguro = serializarEvidenciaSupabase(item);
        if (!lista.some(existente => iguaisEvidencia(existente, itemSeguro))) {
          lista.push(itemSeguro);
        }
      });

      resultado[chave] = lista;
      return;
    }

    if (Array.isArray(valor?.[MARCADOR_ARRAY_REMOVE])) {
      const remover = valor[MARCADOR_ARRAY_REMOVE]
        .map(serializarEvidenciaSupabase);
      resultado[chave] = (Array.isArray(resultado[chave])
        ? resultado[chave]
        : []
      ).filter(item =>
        !remover.some(alvo => iguaisEvidencia(item, alvo))
      );
      return;
    }

    resultado[chave] = serializarEvidenciaSupabase(valor);
  });

  return resultado;
}

function linhaEvidenciaSupabase(id, dados) {
  return {
    id,
    competencia: String(dados?.competencia || ""),
    filial: String(dados?.filial || ""),
    colaborador: String(
      dados?.matrizNome ||
      dados?.enviadoPorNome ||
      ""
    ),
    dados: serializarEvidenciaSupabase(dados),
    updated_at: new Date().toISOString()
  };
}

function snapshotDocumentoEvidencia(id, dados, existe = true) {
  return {
    id,
    ref: doc(firestore, EVIDENCIAS_COLLECTION, id),
    exists: () => existe,
    data: () => dados || {}
  };
}

async function buscarEvidenciaSupabase(id) {
  const { data, error } = await supabase
    .from(EVIDENCIAS_SUPABASE_TABLE)
    .select("id,dados")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function setDoc(referencia, patch, opcoes = {}) {
  const atual = opcoes.merge
    ? (await buscarEvidenciaSupabase(referencia.id))?.dados || {}
    : {};
  const dados = aplicarPatchEvidencia(atual, patch);
  const { error } = await supabase
    .from(EVIDENCIAS_SUPABASE_TABLE)
    .upsert(
      linhaEvidenciaSupabase(referencia.id, dados),
      { onConflict: "id" }
    );
  if (error) throw error;
}

async function getDoc(referencia) {
  const linha = await buscarEvidenciaSupabase(referencia.id);
  if (linha) {
    return snapshotDocumentoEvidencia(
      linha.id,
      linha.dados,
      true
    );
  }

  try {
    const antigo = await firebaseGetDoc(
      firebaseDoc(
        firestore,
        EVIDENCIAS_COLLECTION,
        referencia.id
      )
    );
    if (antigo.exists()) {
      const dados = serializarEvidenciaSupabase(antigo.data());
      await supabase
        .from(EVIDENCIAS_SUPABASE_TABLE)
        .upsert(
          linhaEvidenciaSupabase(referencia.id, dados),
          { onConflict: "id" }
        );
      return snapshotDocumentoEvidencia(referencia.id, dados, true);
    }
  } catch (erro) {
    console.warn("Evidência antiga não disponível no Firebase:", erro);
  }

  return snapshotDocumentoEvidencia(referencia.id, {}, false);
}

async function getDocs() {
  const { data, error } = await supabase
    .from(EVIDENCIAS_SUPABASE_TABLE)
    .select("id,dados");
  if (error) throw error;

  const mapa = new Map(
    (data || []).map(linha => [linha.id, linha.dados || {}])
  );

  try {
    const antigos = await firebaseGetDocs(
      firebaseCollection(firestore, EVIDENCIAS_COLLECTION)
    );
    const faltantes = antigos.docs
      .filter(item => !mapa.has(item.id))
      .map(item => ({
        id: item.id,
        dados: serializarEvidenciaSupabase(item.data())
      }));

    if (faltantes.length) {
      const { error: erroMigracao } = await supabase
        .from(EVIDENCIAS_SUPABASE_TABLE)
        .upsert(
          faltantes.map(item =>
            linhaEvidenciaSupabase(item.id, item.dados)
          ),
          { onConflict: "id" }
        );
      if (erroMigracao) throw erroMigracao;
      faltantes.forEach(item => mapa.set(item.id, item.dados));
      console.info(
        `[EVIDÊNCIAS/SUPABASE] ${faltantes.length} documento(s) antigo(s) migrado(s).`
      );
    }
  } catch (erro) {
    console.warn(
      "Migração complementar das evidências não disponível; usando Supabase:",
      erro
    );
  }

  return {
    docs: [...mapa.entries()].map(([id, dados]) =>
      snapshotDocumentoEvidencia(id, dados, true)
    )
  };
}

async function deleteDoc(referencia) {
  const { error } = await supabase
    .from(EVIDENCIAS_SUPABASE_TABLE)
    .delete()
    .eq("id", referencia.id);
  if (error) throw error;
}

function onSnapshot(referencia, sucesso, falha) {
  let ativo = true;

  const atualizar = async () => {
    if (!ativo) return;
    try {
      sucesso(await getDoc(referencia));
    } catch (erro) {
      falha?.(erro);
    }
  };

  atualizar();

  return () => {
    ativo = false;
  };
}

const MAX_ARQUIVOS = 10;
const MAX_TAMANHO_MB = 8;

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const estadoEvidencias = {
  chaveAtual: "",
  ultimoContextoValido: null,
  unsubscribe: null,
  imagens: [],
  enviando: false,
  assinaturaVisual: null
};

console.info(
  "[EVIDÊNCIAS/SUPABASE] Etapa 05 ativa — arquivos e metadados oficiais no Supabase."
);

function evidEl(seletor) {
  return document.querySelector(seletor);
}

function caminhoSupabaseEvidencia(
  caminho
) {
  return String(
    caminho || ""
  )
    .replace(/^\/+/, "")
    .replace(
      /^evidencias_produtivos\//,
      "produtivos/"
    );
}

async function removerArquivoSupabase(
  caminho
) {
  const caminhoNormalizado =
    caminhoSupabaseEvidencia(
      caminho
    );

  if (!caminhoNormalizado) {
    return;
  }

  const {
    error
  } =
    await supabase.storage
      .from(
        SUPABASE_BUCKET
      )
      .remove([
        caminhoNormalizado
      ]);

  if (error) {
    throw error;
  }
}

async function enviarArquivoSupabase(
  caminho,
  arquivo
) {
  const caminhoNormalizado =
    caminhoSupabaseEvidencia(
      caminho
    );

  const {
    error
  } =
    await supabase.storage
      .from(
        SUPABASE_BUCKET
      )
      .upload(
        caminhoNormalizado,
        arquivo,
        {
          contentType:
            arquivo.type,
          cacheControl:
            "3600",
          upsert:
            false
        }
      );

  if (error) {
    throw error;
  }

  const {
    data
  } =
    supabase.storage
      .from(
        SUPABASE_BUCKET
      )
      .getPublicUrl(
        caminhoNormalizado
      );

  const url =
    data?.publicUrl ||
    "";

  if (!url) {
    throw new Error(
      "O Supabase não retornou a URL pública da evidência."
    );
  }

  return {
    caminho:
      caminhoNormalizado,
    url
  };
}


const SENHA_GERENCIAR_EVIDENCIAS =
  "123321";

function escaparHtmlEvidencia(valor) {
  return String(
    valor ?? ""
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarDataEvidencia(valor) {
  if (!valor) {
    return "Não informado";
  }

  try {
    const data =
      valor?.toDate
        ? valor.toDate()
        : new Date(valor);

    if (
      Number.isNaN(
        data.getTime()
      )
    ) {
      return "Não informado";
    }

    return data.toLocaleString(
      "pt-BR"
    );
  } catch {
    return "Não informado";
  }
}

function garantirCssVisualizadorEvidencias() {
  if (
    document.querySelector(
      "#cssVisualizadorEvidenciasProdutivos"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "cssVisualizadorEvidenciasProdutivos";

  style.textContent = `
    .evidence-view-btn {
      white-space: nowrap;
    }

    .ev-viewer-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000005;
      display: grid;
      place-items: center;
      padding: 22px;
      background: rgba(4, 22, 38, .76);
      backdrop-filter: blur(8px);
    }

    .ev-viewer-card {
      width: min(1060px, 100%);
      max-height: 90vh;
      overflow: auto;
      border-radius: 22px;
      background: #fff;
      box-shadow: 0 30px 90px rgba(0, 0, 0, .34);
    }

    .ev-viewer-header {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      gap: 18px;
      padding: 22px 24px;
      color: #fff;
      background:
        linear-gradient(
          135deg,
          #0a3557,
          #087b5a
        );
    }

    .ev-viewer-header h2 {
      margin: 5px 0 0;
      font-size: 24px;
    }

    .ev-viewer-header p {
      margin: 7px 0 0;
      color: rgba(255,255,255,.86);
    }

    .ev-viewer-close {
      width: 40px;
      height: 40px;
      flex: 0 0 auto;
      border: 1px solid rgba(255,255,255,.35);
      border-radius: 12px;
      color: #fff;
      background: rgba(255,255,255,.12);
      font-size: 23px;
      cursor: pointer;
    }

    .ev-viewer-body {
      padding: 22px 24px 26px;
    }

    .ev-audit-grid {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .ev-audit-card {
      padding: 13px 14px;
      border: 1px solid #dce6ec;
      border-radius: 14px;
      background: #f8fbfc;
    }

    .ev-audit-card small {
      display: block;
      margin-bottom: 5px;
      color: #667887;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    .ev-audit-card strong {
      color: #0a2943;
    }

    .ev-viewer-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin: 0 0 16px;
      padding: 12px 14px;
      border-radius: 13px;
      background: #edf7f3;
    }

    .ev-viewer-toolbar p {
      margin: 0;
      color: #476172;
      font-size: 13px;
    }

    .ev-manage-btn,
    .ev-add-btn {
      min-height: 38px;
      padding: 0 14px;
      border: 0;
      border-radius: 10px;
      color: #fff;
      background: #087b5a;
      font-weight: 800;
      cursor: pointer;
    }

    .ev-gallery {
      display: grid;
      grid-template-columns:
        repeat(auto-fill, minmax(220px, 1fr));
      gap: 15px;
    }

    .ev-image-card {
      overflow: hidden;
      border: 1px solid #dce6ec;
      border-radius: 15px;
      background: #fff;
    }

    .ev-image-card img {
      width: 100%;
      height: 170px;
      display: block;
      object-fit: cover;
      background: #eef3f6;
    }

    .ev-image-info {
      display: grid;
      gap: 5px;
      padding: 12px;
      color: #526575;
      font-size: 12px;
    }

    .ev-image-info strong {
      overflow: hidden;
      color: #102d45;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ev-delete-btn {
      margin-top: 6px;
      min-height: 34px;
      border: 1px solid #f0b7b7;
      border-radius: 9px;
      color: #b51f28;
      background: #fff7f7;
      font-weight: 800;
      cursor: pointer;
    }

    .ev-empty {
      padding: 34px;
      border: 1px dashed #b8cad5;
      border-radius: 15px;
      color: #667887;
      text-align: center;
      background: #f8fbfc;
    }

    .ev-password-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000010;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(4, 22, 38, .72);
    }

    .ev-password-card {
      width: min(390px, 100%);
      padding: 24px;
      border-radius: 19px;
      background: #fff;
      box-shadow: 0 25px 70px rgba(0,0,0,.32);
      border-top: 4px solid #087b5a;
    }

    .ev-password-card h3 {
      margin: 0 0 8px;
      color: #102d45;
    }

    .ev-password-card p {
      margin: 0 0 16px;
      color: #667887;
      line-height: 1.45;
    }

    .ev-password-card input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 13px;
      border: 1px solid #cbd8e1;
      border-radius: 11px;
      font-size: 16px;
    }

    .ev-password-actions {
      display: flex;
      justify-content: flex-end;
      gap: 9px;
      margin-top: 17px;
    }

    .ev-password-actions button {
      min-height: 39px;
      padding: 0 14px;
      border-radius: 10px;
      font-weight: 800;
      cursor: pointer;
    }

    .ev-password-cancel {
      border: 1px solid #cad7e0;
      background: #fff;
    }

    .ev-password-confirm {
      border: 0;
      color: #fff;
      background: #087b5a;
    }

    .ev-password-error {
      margin-top: 8px;
      color: #bd2028;
      font-weight: 700;
    }

    .evidence-card {
      position: relative;
      transform: translateY(0);
      transition: transform .28s ease, opacity .28s ease;
    }

    .evidence-card-loading {
      min-height: 145px;
      overflow: hidden;
      background: #edf4f7;
    }

    .evidence-card-loading::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 3;
      background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,.92) 45%, transparent 70%);
      transform: translateX(-110%);
      animation: evidenceJitterShimmer 1.05s cubic-bezier(.4,0,.2,1) infinite;
      pointer-events: none;
    }

    .evidence-card img {
      opacity: 1;
      transform: scale(1);
      transition: opacity .34s ease, transform .46s cubic-bezier(.2,.8,.2,1);
    }

    .evidence-card-loading img {
      opacity: 0;
      transform: scale(1.045);
    }

    #evidenciaDropzone.uploading {
      position: relative;
      overflow: hidden;
      pointer-events: none;
    }

    #evidenciaDropzone.uploading::after {
      content: "Preparando e enviando imagens…";
      position: absolute;
      inset: 0;
      z-index: 5;
      display: grid;
      place-items: center;
      color: #075f48;
      background: linear-gradient(120deg, rgba(235,250,245,.96), rgba(255,255,255,.96), rgba(225,246,239,.96));
      background-size: 220% 100%;
      font-weight: 800;
      animation: evidenceJitterGradient 1.2s ease infinite;
    }

    @keyframes evidenceJitterShimmer {
      to { transform: translateX(110%); }
    }

    @keyframes evidenceJitterGradient {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }

    @media (prefers-reduced-motion: reduce) {
      .evidence-card-loading::after,
      #evidenciaDropzone.uploading::after {
        animation: none;
      }
    }

    @media (max-width: 760px) {
      .ev-audit-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

      .ev-viewer-toolbar {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}

function solicitarSenhaEvidencias() {
  return new Promise(resolve => {
    const overlay =
      document.createElement("div");

    overlay.className =
      "ev-password-overlay";

    overlay.innerHTML = `
      <div class="ev-password-card">
        <h3>Autorizar alteração</h3>

        <p>
          A visualização é liberada para todos.
          Para adicionar ou excluir evidências,
          informe a senha administrativa.
        </p>

        <input
          type="password"
          inputmode="numeric"
          autocomplete="off"
          placeholder="Digite a senha"
        >

        <div
          class="ev-password-error"
          hidden
        >
          Senha incorreta.
        </div>

        <div class="ev-password-actions">
          <button
            type="button"
            class="ev-password-cancel"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="ev-password-confirm"
          >
            Autorizar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(
      overlay
    );

    const input =
      overlay.querySelector("input");

    const erro =
      overlay.querySelector(
        ".ev-password-error"
      );

    const fechar =
      resultado => {
        overlay.remove();
        resolve(resultado);
      };

    const validar = () => {
      if (
        input.value ===
        SENHA_GERENCIAR_EVIDENCIAS
      ) {
        fechar(true);
        return;
      }

      erro.hidden = false;
      input.value = "";
      input.focus();
    };

    overlay
      .querySelector(
        ".ev-password-confirm"
      )
      .addEventListener(
        "click",
        validar
      );

    overlay
      .querySelector(
        ".ev-password-cancel"
      )
      .addEventListener(
        "click",
        () => fechar(false)
      );

    input.addEventListener(
      "keydown",
      evento => {
        if (evento.key === "Enter") {
          validar();
        }

        if (evento.key === "Escape") {
          fechar(false);
        }
      }
    );

    input.focus();
  });
}

async function listarDocumentosEvidencias() {
  const snapshot =
    await getDocs(
      collection(
        firestore,
        EVIDENCIAS_COLLECTION
      )
    );

  return snapshot.docs.map(
    documento => ({
      id:
        documento.id,
      referencia:
        documento.ref,
      ...documento.data()
    })
  );
}

async function buscarEvidenciaDaFilial(
  competencia,
  filial,
  dn = ""
) {
  const documentos =
    await listarDocumentosEvidencias();

  const competenciaNormalizada =
    String(
      competencia || ""
    );

  const filialNormalizada =
    normalizarEvidencia(
      filial
    );

  const dnNormalizado =
    String(
      dn || ""
    );

  return documentos.find(
    item =>
      String(
        item.competencia || ""
      ) === competenciaNormalizada &&
      normalizarEvidencia(
        item.filial
      ) === filialNormalizada &&
      (
        !dnNormalizado ||
        !item.dn ||
        String(item.dn) ===
          dnNormalizado
      )
  ) || null;
}

function contextoDoDocumentoEvidencia(
  documento
) {
  return {
    chave:
      documento.id,

    competencia:
      documento.competencia ||
      "",

    filial:
      documento.filial ||
      "",

    dn:
      documento.dn ||
      "",

    lancamentoId:
      documento.matrizLancamentoId ||
      "",

    funcionarioId:
      documento.matrizFuncionarioId ||
      "",

    funcionarioNome:
      documento.matrizNome ||
      "Não informado"
  };
}

async function excluirImagemPorDocumento(
  documento,
  imagem
) {
  if (imagem?.caminho) {
    await removerArquivoSupabase(
      imagem.caminho
    ).catch(
      erro => {
        const mensagem =
          String(
            erro?.message ||
            ""
          ).toLowerCase();

        if (
          !mensagem.includes(
            "not found"
          )
        ) {
          throw erro;
        }
      }
    );
  }

  await setDoc(
    documento.referencia,
    {
      imagens:
        arrayRemove(
          imagem
        ),
      atualizadoEm:
        serverTimestamp()
    },
    {
      merge: true
    }
  );
}

async function enviarArquivosParaDocumento(
  arquivos,
  documento
) {
  const contexto =
    contextoDoDocumentoEvidencia(
      documento
    );

  const imagensAtuais =
    Array.isArray(
      documento.imagens
    )
      ? documento.imagens
      : [];

  const lista =
    [...arquivos];

  const vagas =
    MAX_ARQUIVOS -
    imagensAtuais.length;

  if (
    !lista.length ||
    vagas <= 0
  ) {
    return;
  }

  if (lista.length > vagas) {
    throw new Error(
      `Você pode adicionar somente mais ${vagas} arquivo(s).`
    );
  }

  lista.forEach(
    validarArquivoEvidencia
  );

  for (const arquivo of lista) {
    const id =
      gerarIdEvidencia();

    const extensao =
      arquivo.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "jpg";

    const caminho =
      [
        "produtivos",
        contexto.competencia,
        [
          contexto.dn ||
            "sem-dn",
          slugEvidencia(
            contexto.filial
          )
        ].join("-"),
        `${id}.${extensao}`
      ].join("/");

    const upload =
      await enviarArquivoSupabase(
        caminho,
        arquivo
      );

    const imagem = {
      id,
      nome:
        arquivo.name,
      url:
        upload.url,
      caminho:
        upload.caminho,
      tamanho:
        arquivo.size,
      tipo:
        arquivo.type,
      criadoEmCliente:
        new Date().toISOString(),
      enviadoPorLancamentoId:
        contexto.lancamentoId,
      enviadoPorFuncionarioId:
        contexto.funcionarioId,
      enviadoPorNome:
        contexto.funcionarioNome
    };

    await setDoc(
      documento.referencia,
      {
        imagens:
          arrayUnion(
            imagem
          ),
        atualizadoEm:
          serverTimestamp()
      },
      {
        merge: true
      }
    );
  }
}

async function abrirVisualizadorEvidencias(
  competencia,
  filial,
  dn = ""
) {
  garantirCssVisualizadorEvidencias();

  const documento =
    await buscarEvidenciaDaFilial(
      competencia,
      filial,
      dn
    );

  const imagens =
    Array.isArray(
      documento?.imagens
    )
      ? documento.imagens
      : [];

  const overlay =
    document.createElement("div");

  overlay.className =
    "ev-viewer-overlay";

  const renderizar = (
    gerenciar = false
  ) => {
    const imagensAtuais =
      Array.isArray(
        documento?.imagens
      )
        ? documento.imagens
        : [];

    overlay.innerHTML = `
      <div class="ev-viewer-card">
        <header class="ev-viewer-header">
          <div>
            <small>
              EVIDÊNCIAS DA FILIAL
            </small>

            <h2>
              ${escaparHtmlEvidencia(
                filial
              )}
            </h2>

            <p>
              Competência
              ${escaparHtmlEvidencia(
                competencia
              )}
              · DN
              ${escaparHtmlEvidencia(
                dn ||
                documento?.dn ||
                "não informado"
              )}
            </p>
          </div>

          <button
            type="button"
            class="ev-viewer-close"
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div class="ev-viewer-body">
          <div class="ev-audit-grid">
            <div class="ev-audit-card">
              <small>Total de evidências</small>
              <strong>
                ${imagensAtuais.length}
              </strong>
            </div>

            <div class="ev-audit-card">
              <small>Competência</small>
              <strong>
                ${escaparHtmlEvidencia(
                  competencia
                )}
              </strong>
            </div>

            <div class="ev-audit-card">
              <small>Última atualização</small>
              <strong>
                ${escaparHtmlEvidencia(
                  formatarDataEvidencia(
                    documento?.atualizadoEm
                  )
                )}
              </strong>
            </div>

            <div class="ev-audit-card">
              <small>Armazenamento</small>
              <strong>
                Supabase Storage
              </strong>
            </div>
          </div>

          <div class="ev-viewer-toolbar">
            <p>
              As evidências pertencem à filial e à
              competência, portanto são válidas para
              todos os colaboradores desta unidade.
            </p>

            ${
              documento
                ? gerenciar
                  ? `
                    <label
                      class="ev-add-btn"
                      role="button"
                    >
                      + Adicionar imagens

                      <input
                        type="file"
                        class="ev-add-input"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        hidden
                      >
                    </label>
                  `
                  : `
                    <button
                      type="button"
                      class="ev-manage-btn"
                    >
                      🔒 Gerenciar evidências
                    </button>
                  `
                : ""
            }
          </div>

          ${
            imagensAtuais.length
              ? `
                <div class="ev-gallery">
                  ${imagensAtuais.map(
                    imagem => `
                      <article class="ev-image-card">
                        <a
                          href="${escaparHtmlEvidencia(
                            imagem.url
                          )}"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src="${escaparHtmlEvidencia(
                              imagem.url
                            )}"
                            alt="Evidência da filial"
                            loading="lazy"
                          >
                        </a>

                        <div class="ev-image-info">
                          <strong
                            title="${escaparHtmlEvidencia(
                              imagem.nome ||
                              "Evidência"
                            )}"
                          >
                            ${escaparHtmlEvidencia(
                              imagem.nome ||
                              "Evidência"
                            )}
                          </strong>

                          <span>
                            Enviado por:
                            ${escaparHtmlEvidencia(
                              imagem.enviadoPorNome ||
                              "Não informado"
                            )}
                          </span>

                          <span>
                            Data:
                            ${escaparHtmlEvidencia(
                              formatarDataEvidencia(
                                imagem.criadoEmCliente
                              )
                            )}
                          </span>

                          ${
                            gerenciar
                              ? `
                                <button
                                  type="button"
                                  class="ev-delete-btn"
                                  data-imagem-id="${escaparHtmlEvidencia(
                                    imagem.id
                                  )}"
                                >
                                  Excluir evidência
                                </button>
                              `
                              : ""
                          }
                        </div>
                      </article>
                    `
                  ).join("")}
                </div>
              `
              : `
                <div class="ev-empty">
                  <strong>
                    Nenhuma evidência registrada
                  </strong>

                  <p>
                    Ainda não existem imagens vinculadas
                    a esta filial nesta competência.
                  </p>
                </div>
              `
          }
        </div>
      </div>
    `;

    overlay
      .querySelector(
        ".ev-viewer-close"
      )
      .addEventListener(
        "click",
        () => overlay.remove()
      );

    overlay
      .querySelector(
        ".ev-manage-btn"
      )
      ?.addEventListener(
        "click",
        async () => {
          const autorizado =
            await solicitarSenhaEvidencias();

          if (autorizado) {
            renderizar(true);
          }
        }
      );

    overlay
      .querySelector(
        ".ev-add-input"
      )
      ?.addEventListener(
        "change",
        async evento => {
          try {
            await enviarArquivosParaDocumento(
              evento.target.files,
              documento
            );

            const atualizado =
              await buscarEvidenciaDaFilial(
                competencia,
                filial,
                dn
              );

            Object.assign(
              documento,
              atualizado
            );

            renderizar(true);
          } catch (erro) {
            alert(
              erro.message ||
              "Não foi possível adicionar as imagens."
            );
          }
        }
      );

    overlay
      .querySelectorAll(
        ".ev-delete-btn"
      )
      .forEach(
        botao =>
          botao.addEventListener(
            "click",
            async () => {
              const imagem =
                documento.imagens.find(
                  item =>
                    item.id ===
                    botao.dataset.imagemId
                );

              if (!imagem) {
                return;
              }

              if (
                !confirm(
                  "Excluir esta evidência para toda a filial?"
                )
              ) {
                return;
              }

              await excluirImagemPorDocumento(
                documento,
                imagem
              );

              documento.imagens =
                documento.imagens.filter(
                  item =>
                    item.id !== imagem.id
                );

              renderizar(true);
            }
          )
      );
  };

  renderizar(false);

  document.body.appendChild(
    overlay
  );

  overlay.addEventListener(
    "click",
    evento => {
      if (
        evento.target === overlay
      ) {
        overlay.remove();
      }
    }
  );
}

async function converterImagemParaPngDataUrl(
  url
) {
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
          imagem.naturalWidth ||
          imagem.width;

        canvas.height =
          imagem.naturalHeight ||
          imagem.height;

        const contexto =
          canvas.getContext("2d");

        contexto.drawImage(
          imagem,
          0,
          0
        );

        resolve({
          dataUrl:
            canvas.toDataURL(
              "image/png"
            ),
          largura:
            canvas.width,
          altura:
            canvas.height
        });
      };

      imagem.onerror =
        () =>
          reject(
            new Error(
              "Não foi possível carregar a imagem da evidência."
            )
          );

      imagem.src =
        `${url}${
          url.includes("?")
            ? "&"
            : "?"
        }auditoria=${Date.now()}`;
    }
  );
}

function filiaisPermitidasDaExportacao(
  opcoes = {}
) {
  const resultados =
    Array.isArray(
      opcoes.resultados
    )
      ? opcoes.resultados
      : [];

  return new Set(
    resultados.map(
      item =>
        normalizarEvidencia(
          item.filial
        )
    )
  );
}

async function documentosParaExportacao(
  competencia,
  opcoes = {}
) {
  const permitidas =
    filiaisPermitidasDaExportacao(
      opcoes
    );

  const documentos =
    await listarDocumentosEvidencias();

  return documentos.filter(
    item =>
      String(
        item.competencia ||
        ""
      ) === String(
        competencia || ""
      ) &&
      (
        !permitidas.size ||
        permitidas.has(
          normalizarEvidencia(
            item.filial
          )
        )
      ) &&
      Array.isArray(
        item.imagens
      ) &&
      item.imagens.length
  );
}

async function anexarAoPdf(
  pdf,
  competencia,
  opcoes = {}
) {
  const documentos =
    await documentosParaExportacao(
      competencia,
      opcoes
    );

  if (!documentos.length) {
    return;
  }

  for (const documento of documentos) {
    pdf.addPage(
      "a4",
      "landscape"
    );

    const larguraPagina =
      pdf.internal.pageSize.getWidth();

    pdf.setFillColor(
      7,
      43,
      77
    );

    pdf.rect(
      0,
      0,
      larguraPagina,
      27,
      "F"
    );

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(15);

    pdf.text(
      "EVIDÊNCIAS PARA AUDITORIA",
      12,
      11
    );

    pdf.setFontSize(9);

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.text(
      `${documento.dn || "DN não informado"} - ${documento.filial || ""} · Competência ${competencia}`,
      12,
      19
    );

    pdf.setTextColor(
      35,
      49,
      60
    );

    pdf.setFontSize(8);

    pdf.text(
      `Total de evidências anexadas: ${documento.imagens.length}`,
      12,
      34
    );

    let x = 12;
    let y = 41;
    const larguraImagem = 82;
    const alturaImagem = 55;
    const espacamento = 7;

    for (
      let indice = 0;
      indice < documento.imagens.length;
      indice += 1
    ) {
      const imagem =
        documento.imagens[indice];

      if (
        x + larguraImagem >
        larguraPagina - 10
      ) {
        x = 12;
        y += alturaImagem + 18;
      }

      if (y + alturaImagem > 190) {
        pdf.addPage(
          "a4",
          "landscape"
        );

        y = 20;
        x = 12;
      }

      try {
        const convertida =
          await converterImagemParaPngDataUrl(
            imagem.url
          );

        pdf.addImage(
          convertida.dataUrl,
          "PNG",
          x,
          y,
          larguraImagem,
          alturaImagem,
          undefined,
          "FAST"
        );
      } catch {
        pdf.setDrawColor(
          190,
          202,
          210
        );

        pdf.rect(
          x,
          y,
          larguraImagem,
          alturaImagem
        );

        pdf.text(
          "Imagem indisponível",
          x + 5,
          y + 12
        );
      }

      pdf.setFontSize(6.5);

      pdf.text(
        `${indice + 1}. ${(imagem.nome || "Evidência").slice(0, 45)}`,
        x,
        y + alturaImagem + 5
      );

      pdf.text(
        `Enviado por: ${(imagem.enviadoPorNome || "Não informado").slice(0, 40)}`,
        x,
        y + alturaImagem + 9
      );

      x +=
        larguraImagem +
        espacamento;
    }
  }
}

async function anexarAoExcel(
  livro,
  competencia,
  opcoes = {}
) {
  const documentos =
    await documentosParaExportacao(
      competencia,
      opcoes
    );

  if (!documentos.length) {
    return;
  }

  const planilha =
    livro.addWorksheet(
      "Evidências",
      {
        views: [
          {
            showGridLines:
              false
          }
        ]
      }
    );

  planilha.columns = [
    {
      key: "a",
      width: 18
    },
    {
      key: "b",
      width: 25
    },
    {
      key: "c",
      width: 25
    },
    {
      key: "d",
      width: 25
    },
    {
      key: "e",
      width: 25
    },
    {
      key: "f",
      width: 25
    }
  ];

  let linha = 1;

  for (const documento of documentos) {
    planilha.mergeCells(
      linha,
      1,
      linha,
      6
    );

    const titulo =
      planilha.getCell(
        linha,
        1
      );

    titulo.value =
      `${documento.dn || "DN não informado"} - ${documento.filial || ""} · ${competencia}`;

    titulo.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF"
      },
      size: 13
    };

    titulo.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF0B7A53"
      }
    };

    titulo.alignment = {
      vertical: "middle"
    };

    planilha.getRow(
      linha
    ).height = 27;

    linha += 1;

    planilha.mergeCells(
      linha,
      1,
      linha,
      6
    );

    planilha.getCell(
      linha,
      1
    ).value =
      `Total de evidências: ${documento.imagens.length} | Última atualização: ${formatarDataEvidencia(documento.atualizadoEm)}`;

    linha += 2;

    let coluna = 1;

    for (const imagem of documento.imagens) {
      if (coluna > 3) {
        coluna = 1;
        linha += 12;
      }

      try {
        const convertida =
          await converterImagemParaPngDataUrl(
            imagem.url
          );

        const idImagem =
          livro.addImage({
            base64:
              convertida.dataUrl,
            extension:
              "png"
          });

        planilha.addImage(
          idImagem,
          {
            tl: {
              col:
                coluna - 1,
              row:
                linha - 1
            },
            ext: {
              width: 220,
              height: 135
            }
          }
        );
      } catch {
        planilha.getCell(
          linha,
          coluna
        ).value =
          "Imagem indisponível";
      }

      const celulaLegenda =
        planilha.getCell(
          linha + 9,
          coluna
        );

      celulaLegenda.value =
        `${imagem.nome || "Evidência"}\nEnviado por: ${imagem.enviadoPorNome || "Não informado"}\nData: ${formatarDataEvidencia(imagem.criadoEmCliente)}`;

      celulaLegenda.alignment = {
        wrapText: true,
        vertical: "top"
      };

      celulaLegenda.font = {
        size: 9
      };

      coluna += 2;
    }

    linha += 13;
  }

  planilha.pageSetup = {
    orientation:
      "landscape",
    fitToPage:
      true,
    fitToWidth:
      1,
    fitToHeight:
      0
  };
}

function configurarBotoesVisualizacaoEvidencias() {
  if (
    document.documentElement.dataset
      .evidenciasProdutivosCliqueConfigurado === "true"
  ) {
    return;
  }

  document.documentElement.dataset
    .evidenciasProdutivosCliqueConfigurado = "true";

  document.addEventListener(
    "click",
    evento => {
      const botao =
        evento.target.closest(
          ".evidence-view-btn"
        );

      if (!botao) {
        return;
      }

      evento.preventDefault();
      evento.stopPropagation();

      abrirVisualizadorEvidencias(
        botao.dataset
          .evidenciaCompetencia,
        botao.dataset
          .evidenciaFilial,
        botao.dataset
          .evidenciaDn
      ).catch(
        erro => {
          console.error(
            "Erro ao abrir evidências:",
            erro
          );

          alert(
            erro.message ||
            "Não foi possível abrir as evidências."
          );
        }
      );
    }
  );
}

function normalizarEvidencia(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function slugEvidencia(valor) {
  return normalizarEvidencia(valor)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function contextoEvidenciaAtual() {
  const competencia =
    String(
      evidEl(
        "#lancamentoCompetencia"
      )?.value ||
      ""
    ).trim();

  const filialSelect =
    evidEl(
      "#lancamentoFilial"
    );

  const funcionarioSelect =
    evidEl(
      "#lancamentoFuncionario"
    );

  const funcionarioId =
    String(
      funcionarioSelect?.value ||
      ""
    ).trim();

  const funcionario =
    typeof window.funcionarioPorId ===
    "function"
      ? window.funcionarioPorId(
          funcionarioId
        )
      : null;

  /*
   * A filial pode vir do select ou do próprio funcionário.
   * Essa redundância evita que o upload fique bloqueado
   * quando outro trecho do sistema preenche os campos
   * programaticamente.
   */
  const filialTexto =
    String(
      filialSelect
        ?.selectedOptions?.[0]
        ?.textContent ||
      ""
    )
      .replace(
        /^\d+\s*-\s*/,
        ""
      )
      .trim();

  const filial =
    String(
      funcionario?.filial ||
      filialSelect?.value ||
      filialTexto ||
      ""
    ).trim();

  const dn =
    String(
      funcionario?.dn ||
      filialSelect
        ?.selectedOptions?.[0]
        ?.textContent
        ?.match(/^\d+/)?.[0] ||
      ""
    ).trim();

  if (
    !competencia ||
    !filial
  ) {
    return null;
  }

  const chave = [
    competencia,
    dn || "sem-dn",
    slugEvidencia(filial)
  ].join("__");

  const lancamentoId =
    evidEl(
      "#lancamentoId"
    )?.value ||
    "";

  const contextoResolvido = {
    chave,
    competencia,
    filial,
    dn,
    lancamentoId,
    funcionarioId,
    funcionarioNome:
      funcionario?.nome ||
      funcionarioSelect
        ?.selectedOptions?.[0]
        ?.textContent
        ?.split("—")?.[0]
        ?.trim() ||
      ""
  };

  estadoEvidencias.ultimoContextoValido =
    contextoResolvido;

  return contextoResolvido;
}


function chaveEvidenciaPorLancamento(
  lancamento
) {
  const competencia =
    String(
      lancamento?.competencia ||
      ""
    );

  const filial =
    String(
      lancamento?.filial ||
      ""
    );

  const dn =
    String(
      lancamento?.dn ||
      "sem-dn"
    );

  if (
    !competencia ||
    !filial
  ) {
    return "";
  }

  return [
    competencia,
    dn,
    slugEvidencia(filial)
  ].join("__");
}

function ordenarLancamentosDaCasa(
  lancamentos
) {
  return [...lancamentos]
    .sort(
      (a, b) =>
        String(
          a.nome || ""
        ).localeCompare(
          String(
            b.nome || ""
          ),
          "pt-BR"
        )
    );
}

async function removerDocumentoEvidencias(
  referenciaDocumento,
  imagens
) {
  for (
    const imagem
    of imagens
  ) {
    if (!imagem?.caminho) {
      continue;
    }

    await removerArquivoSupabase(
      imagem.caminho
    ).catch(
      erro => {
        /*
         * Se o arquivo já tiver sido removido do Supabase,
         * a referência no Firestore ainda poderá ser limpa.
         */
        const mensagem =
          String(
            erro?.message ||
            ""
          ).toLowerCase();

        if (
          !mensagem.includes(
            "not found"
          ) &&
          !mensagem.includes(
            "não encontrado"
          )
        ) {
          throw erro;
        }
      }
    );
  }

  await deleteDoc(
    referenciaDocumento
  );
}

async function antesDeExcluirLancamento({
  lancamento,
  restantes = []
}) {
  const chave =
    chaveEvidenciaPorLancamento(
      lancamento
    );

  if (!chave) {
    return;
  }

  const referenciaDocumento =
    doc(
      firestore,
      EVIDENCIAS_COLLECTION,
      chave
    );

  const snapshot =
    await getDoc(
      referenciaDocumento
    );

  if (!snapshot.exists()) {
    return;
  }

  const dados =
    snapshot.data() ||
    {};

  const imagens =
    Array.isArray(
      dados.imagens
    )
      ? dados.imagens
      : [];

  if (!imagens.length) {
    return;
  }

  const lancamentoId =
    String(
      lancamento.id ||
      ""
    );

  const restantesOrdenados =
    ordenarLancamentosDaCasa(
      restantes
    );

  /*
   * Documentos antigos não tinham matriz registrada.
   * Nesse caso, o lançamento atual só é tratado como matriz
   * quando ele é o primeiro da ordem da casa. Dessa forma,
   * excluir outro colaborador nunca remove a evidência.
   */
  const matrizAtualId =
    String(
      dados.matrizLancamentoId ||
      ""
    );

  const ehMatrizRegistrada =
    matrizAtualId &&
    matrizAtualId ===
      lancamentoId;

  const ehUltimoLancamento =
    restantesOrdenados.length ===
    0;

  if (ehUltimoLancamento) {
    await removerDocumentoEvidencias(
      referenciaDocumento,
      imagens
    );

    return;
  }

  if (
    matrizAtualId &&
    !ehMatrizRegistrada
  ) {
    /*
     * Não é o colaborador matriz:
     * mantém todas as evidências intactas.
     */
    return;
  }

  const proximoMatriz =
    restantesOrdenados[0];

  await setDoc(
    referenciaDocumento,
    {
      matrizLancamentoId:
        proximoMatriz.id,

      matrizFuncionarioId:
        proximoMatriz.funcionarioId ||
        "",

      matrizNome:
        proximoMatriz.nome ||
        "",

      matrizAtualizadaEm:
        serverTimestamp(),

      atualizadoEm:
        serverTimestamp()
    },
    {
      merge: true
    }
  );
}

function mensagemEvidencia(texto, tipo = "") {
  const elemento =
    evidEl("#evidenciaMensagem");

  if (!elemento) {
    return;
  }

  elemento.className =
    `evidence-message ${tipo}`.trim();

  elemento.textContent =
    texto;
}

function atualizarResumoEvidencia() {
  const contador =
    evidEl("#evidenciaContador");

  const status =
    evidEl("#evidenciaStatusFilial");

  if (contador) {
    contador.textContent =
      `${estadoEvidencias.imagens.length}/${MAX_ARQUIVOS}`;
  }

  if (status) {
    status.innerHTML =
      estadoEvidencias.imagens.length
        ? `
          <span class="evidence-shared-badge ok">
            ${estadoEvidencias.imagens.length}
            evidência(s) compartilhada(s) nesta filial
          </span>
        `
        : `
          <span class="evidence-shared-badge neutral">
            Nenhuma evidência adicionada nesta filial
          </span>
        `;
  }
}

function renderizarEvidencias() {
  const galeria =
    evidEl("#evidenciaGaleria");

  if (!galeria) {
    return;
  }

  /*
   * Vinculação direta e idempotente. Não depende do listener global nem do
   * estado deixado por uma versão anterior do módulo no documento.
   */
  galeria.onclick = evento => {
    const botaoExcluir = evento.target.closest("[data-evidence-id]");
    if (!botaoExcluir || !galeria.contains(botaoExcluir)) return;

    evento.preventDefault();
    evento.stopPropagation();
    excluirEvidencia(String(botaoExcluir.dataset.evidenceId || ""), botaoExcluir);
  };

  atualizarResumoEvidencia();

  const assinaturaVisual = JSON.stringify(
    estadoEvidencias.imagens.map(imagem => [
      imagem.id || "",
      imagem.caminho || "",
      imagem.url || "",
      imagem.nome || ""
    ])
  );

  if (
    estadoEvidencias.assinaturaVisual === assinaturaVisual &&
    galeria.childElementCount
  ) {
    return;
  }

  estadoEvidencias.assinaturaVisual = assinaturaVisual;

  galeria.innerHTML =
    estadoEvidencias.imagens.length
      ? estadoEvidencias.imagens.map(
          imagem => `
            <article class="evidence-card evidence-card-loading">
              <a
                href="${imagem.url}"
                target="_blank"
                rel="noopener noreferrer"
                class="evidence-image-link"
                title="Abrir imagem"
              >
                <img
                  src="${imagem.url}"
                  alt="${imagem.nome || "Evidência da filial"}"
                  loading="lazy"
                  decoding="async"
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                  onload="this.closest('.evidence-card')?.classList.remove('evidence-card-loading')"
                  onerror="this.closest('.evidence-card')?.classList.remove('evidence-card-loading')"
                />
              </a>

              <div class="evidence-card-info">
                <span title="${imagem.nome || ""}">
                  ${imagem.nome || "Evidência"}
                </span>

                <button
                  type="button"
                  class="evidence-remove-btn"
                  data-evidence-id="${imagem.id}"
                  title="Excluir evidência"
                  onclick="return window.excluirEvidenciaProdutivosDireta(event, this)"
                >
                  Excluir
                </button>
              </div>
            </article>
          `
        ).join("")
      : `
        <div class="evidence-empty">
          <strong>Nenhuma imagem anexada</strong>
          <span>
            Esta evidência é opcional e não interfere
            na habilitação da campanha.
          </span>
        </div>
      `;

}

function encerrarEscutaEvidencia() {
  if (
    typeof estadoEvidencias.unsubscribe ===
    "function"
  ) {
    estadoEvidencias.unsubscribe();
  }

  estadoEvidencias.unsubscribe =
    null;
}

async function recuperarEvidenciasDiretoDoStorage(contexto) {
  if (!contexto) return [];

  const pasta = [
    "produtivos",
    contexto.competencia,
    [
      contexto.dn || "sem-dn",
      slugEvidencia(contexto.filial)
    ].join("-")
  ].join("/");

  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .list(pasta, {
      limit: MAX_ARQUIVOS,
      sortBy: {
        column: "created_at",
        order: "asc"
      }
    });

  if (error) {
    console.warn("Falha ao conferir evidências no Storage:", error);
    return [];
  }

  return (data || [])
    .filter(item => item?.name && item.name !== ".emptyFolderPlaceholder")
    .map(item => {
      const caminho = `${pasta}/${item.name}`;
      const { data: publica } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(caminho);

      return {
        id: item.name.replace(/\.[^.]+$/, ""),
        nome: item.metadata?.nome_original || item.name,
        url: publica?.publicUrl || "",
        caminho,
        tamanho: item.metadata?.size || 0,
        tipo: item.metadata?.mimetype || "image/jpeg",
        criadoEmCliente: item.created_at || new Date().toISOString(),
        enviadoPorLancamentoId: contexto.lancamentoId || "",
        enviadoPorFuncionarioId: contexto.funcionarioId || "",
        enviadoPorNome: contexto.funcionarioNome || "Não informado"
      };
    })
    .filter(item => item.url);
}

function observarEvidenciasDaFilial() {
  const modalLancamento = evidEl("#modalLancamento");
  if (!modalLancamento?.open) {
    encerrarEscutaEvidencia();
    return;
  }

  const contextoAtual =
    contextoEvidenciaAtual();

  const modalAberto =
    true;

  const contexto = contextoAtual ||
    (modalAberto
      ? estadoEvidencias.ultimoContextoValido
      : null);

  if (!contexto) {
    if (modalAberto && estadoEvidencias.ultimoContextoValido) {
      return;
    }

    encerrarEscutaEvidencia();
    estadoEvidencias.chaveAtual =
      "";

    estadoEvidencias.imagens =
      [];

    mensagemEvidencia(
      "Selecione a competência e a filial para visualizar as evidências."
    );

    renderizarEvidencias();
    return;
  }

  estadoEvidencias.chaveAtual =
    contexto.chave;

  mensagemEvidencia(
    `Evidências compartilhadas de ${contexto.filial} — ${contexto.competencia}.`
  );

  const referenciaDocumento =
    doc(
      firestore,
      EVIDENCIAS_COLLECTION,
      contexto.chave
    );

  estadoEvidencias.unsubscribe =
    onSnapshot(
      referenciaDocumento,
      async snapshot => {
        const dados =
          snapshot.exists()
            ? snapshot.data()
            : {};

        let imagens =
          Array.isArray(dados.imagens)
            ? dados.imagens
            : [];

        if (!imagens.length) {
          imagens = await recuperarEvidenciasDiretoDoStorage(
            contexto
          );

          if (imagens.length) {
            await setDoc(
              referenciaDocumento,
              {
                campanha: "PRODUTIVOS",
                competencia: contexto.competencia,
                filial: contexto.filial,
                dn: contexto.dn,
                imagens,
                atualizadoEm: serverTimestamp()
              },
              { merge: true }
            ).catch(erro =>
              console.warn(
                "Imagens recuperadas; vínculo pendente de reparo:",
                erro
              )
            );
          }
        }

        estadoEvidencias.imagens = imagens;

        renderizarEvidencias();
      },
      erro => {
        console.error(
          "Erro ao carregar evidências:",
          erro
        );

        mensagemEvidencia(
          "Não foi possível carregar as evidências.",
          "error"
        );
      }
    );
}

function validarArquivoEvidencia(arquivo) {
  if (
    !TIPOS_PERMITIDOS.includes(
      arquivo.type
    )
  ) {
    throw new Error(
      `${arquivo.name}: use apenas JPG, PNG ou WEBP.`
    );
  }

  const limite =
    MAX_TAMANHO_MB *
    1024 *
    1024;

  if (arquivo.size > limite) {
    throw new Error(
      `${arquivo.name}: o limite é ${MAX_TAMANHO_MB} MB.`
    );
  }
}

function gerarIdEvidencia() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
}


function garantirContextoAntesDoUpload() {
  const contexto =
    contextoEvidenciaAtual() ||
    estadoEvidencias.ultimoContextoValido;

  if (contexto) {
    observarEvidenciasDaFilial();
    return contexto;
  }

  mensagemEvidencia(
    "Selecione a competência, a filial e o colaborador antes de anexar.",
    "error"
  );

  return null;
}

async function enviarArquivosEvidencia(
  arquivos
) {
  const contexto =
    garantirContextoAntesDoUpload();

  if (!contexto) {
    return;
  }

  const lista =
    [...arquivos];

  if (!lista.length) {
    return;
  }

  const vagas =
    MAX_ARQUIVOS -
    estadoEvidencias.imagens.length;

  if (vagas <= 0) {
    alert(
      `Esta filial já possui o limite de ${MAX_ARQUIVOS} evidências.`
    );

    return;
  }

  if (lista.length > vagas) {
    alert(
      `Você pode adicionar somente mais ${vagas} arquivo(s).`
    );

    return;
  }

  try {
    lista.forEach(
      validarArquivoEvidencia
    );

    estadoEvidencias.enviando =
      true;

    const area =
      evidEl("#evidenciaDropzone");

    area?.classList.add(
      "uploading"
    );

    mensagemEvidencia(
      "Enviando evidências...",
      "loading"
    );

    const imagensNovas = [];

    for (const arquivo of lista) {
      const id =
        gerarIdEvidencia();

      const extensao =
        arquivo.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const caminho =
        [
          "produtivos",
          contexto.competencia,
          [
            contexto.dn ||
              "sem-dn",
            slugEvidencia(
              contexto.filial
            )
          ].join("-"),
          `${id}.${extensao}`
        ].join("/");

      const uploadSupabase =
        await enviarArquivoSupabase(
          caminho,
          arquivo
        );

      const url =
        uploadSupabase.url;

      imagensNovas.push({
        id,
        nome:
          arquivo.name,
        url,
        caminho:
          uploadSupabase.caminho,
        tamanho:
          arquivo.size,
        tipo:
          arquivo.type,
        criadoEmCliente:
          new Date().toISOString(),

        enviadoPorLancamentoId:
          contexto.lancamentoId,

        enviadoPorFuncionarioId:
          contexto.funcionarioId,

        enviadoPorNome:
          contexto.funcionarioNome
      });
    }

    const referenciaDocumento = doc(
      firestore,
      EVIDENCIAS_COLLECTION,
      contexto.chave
    );

    const documentoAtual = await getDoc(
      referenciaDocumento
    );

    const dadosAtuais = documentoAtual.exists()
      ? documentoAtual.data()
      : {};

    const camposMatriz = dadosAtuais?.matrizLancamentoId
      ? {}
      : {
          matrizLancamentoId: contexto.lancamentoId,
          matrizFuncionarioId: contexto.funcionarioId,
          matrizNome: contexto.funcionarioNome,
          matrizCriadaEm: serverTimestamp()
        };

    await setDoc(
      referenciaDocumento,
      {
        campanha: "PRODUTIVOS",
        competencia: contexto.competencia,
        filial: contexto.filial,
        dn: contexto.dn,
        ...camposMatriz,
        imagens: arrayUnion(...imagensNovas),
        atualizadoEm: serverTimestamp()
      },
      {
        merge: true
      }
    );

    /* Atualiza a tela sem depender de Realtime ou de uma nova consulta. */
    const idsNovos = new Set(imagensNovas.map(imagem => imagem.id));
    estadoEvidencias.imagens = [
      ...estadoEvidencias.imagens.filter(imagem => !idsNovos.has(imagem.id)),
      ...imagensNovas
    ];
    estadoEvidencias.assinaturaVisual = null;
    renderizarEvidencias();

    mensagemEvidencia(
      "Evidência adicionada para toda a filial.",
      "success"
    );
  } catch (erro) {
    console.error(
      "Erro ao enviar evidência:",
      erro
    );

    mensagemEvidencia(
      erro.message ||
      "Não foi possível enviar a evidência.",
      "error"
    );

    alert(
      erro.message ||
      "Não foi possível enviar a evidência."
    );
  } finally {
    estadoEvidencias.enviando =
      false;

    evidEl(
      "#evidenciaDropzone"
    )?.classList.remove(
      "uploading"
    );

    const input =
      evidEl(
        "#evidenciaInput"
      );

    if (input) {
      input.value =
        "";
    }
  }
}

function confirmarExclusaoEvidenciaPremium() {
  return new Promise(resolve => {
    document.querySelector("#evidenciaConfirmacaoPremium")?.remove();

    if (!document.querySelector("#evidenciaConfirmacaoPremiumCss")) {
      const estilo = document.createElement("style");
      estilo.id = "evidenciaConfirmacaoPremiumCss";
      estilo.textContent = `
        @keyframes evidenciaConfirmarEntrada {
          from { opacity: 0; transform: translateY(16px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        #evidenciaConfirmacaoPremium .ev-confirm-card {
          animation: evidenciaConfirmarEntrada .24s cubic-bezier(.2,.8,.2,1);
        }
        #evidenciaConfirmacaoPremium button:focus-visible {
          outline: 3px solid rgba(16,185,129,.28);
          outline-offset: 2px;
        }
      `;
      document.head.appendChild(estilo);
    }

    const overlay = document.createElement("dialog");
    overlay.id = "evidenciaConfirmacaoPremium";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "evConfirmTitulo");
    overlay.style.cssText = `
      position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;
      margin:0;border:0;display:grid;place-items:center;padding:20px;
      background:rgba(2,20,35,.68);backdrop-filter:blur(7px);
    `;
    overlay.innerHTML = `
      <section class="ev-confirm-card" style="width:min(440px,100%);background:#fff;border:1px solid rgba(15,118,90,.14);border-radius:22px;padding:26px;box-shadow:0 28px 80px rgba(2,20,35,.34);font-family:inherit;">
        <div style="width:54px;height:54px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(145deg,#fff1f2,#ffe4e6);color:#dc2626;margin-bottom:18px;">
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>
        </div>
        <p style="margin:0 0 6px;color:#047857;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">Evidências da filial</p>
        <h3 id="evConfirmTitulo" style="margin:0;color:#102a3a;font-size:22px;line-height:1.25;">Excluir esta evidência?</h3>
        <p style="margin:10px 0 22px;color:#64748b;font-size:14px;line-height:1.6;">A imagem será removida para toda a filial e não aparecerá mais nos relatórios desta competência.</p>
        <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
          <button type="button" data-ev-confirmar="cancelar" style="min-height:44px;padding:0 18px;border:1px solid #dbe4e8;border-radius:12px;background:#fff;color:#334155;font-weight:800;cursor:pointer;">Cancelar</button>
          <button type="button" data-ev-confirmar="excluir" style="min-height:44px;padding:0 18px;border:0;border-radius:12px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(220,38,38,.22);">Excluir evidência</button>
        </div>
      </section>
    `;

    const suportaDialogModal =
      typeof overlay.showModal === "function";

    const finalizar = resultado => {
      document.removeEventListener("keydown", aoTeclado);
      if (overlay.open) overlay.close();
      overlay.remove();
      resolve(resultado);
    };
    const aoTeclado = evento => {
      if (evento.key === "Escape") finalizar(false);
    };

    overlay.addEventListener("click", evento => {
      const acao = evento.target.closest("[data-ev-confirmar]")?.dataset.evConfirmar;
      if (acao === "excluir") finalizar(true);
      if (acao === "cancelar" || evento.target === overlay) finalizar(false);
    });
    overlay.addEventListener("cancel", evento => {
      evento.preventDefault();
      finalizar(false);
    });
    if (!suportaDialogModal) {
      document.addEventListener("keydown", aoTeclado);
    }
    document.body.appendChild(overlay);
    if (suportaDialogModal) {
      overlay.showModal();
    } else {
      overlay.setAttribute("open", "");
    }
    overlay.querySelector('[data-ev-confirmar="cancelar"]')?.focus();
  });
}

async function excluirEvidencia(
  imagemId,
  botao = null
) {
  const contexto =
    contextoEvidenciaAtual() ||
    estadoEvidencias.ultimoContextoValido;

  const imagem =
    estadoEvidencias.imagens.find(
      item =>
        String(item.id || "") === String(imagemId || "")
    );

  if (
    !contexto ||
    !imagem
  ) {
    return;
  }

  const confirmado =
    await confirmarExclusaoEvidenciaPremium();

  if (!confirmado) {
    return;
  }

  encerrarEscutaEvidencia();

  const imagensAnteriores =
    [...estadoEvidencias.imagens];

  try {
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Excluindo...";
    }

    estadoEvidencias.imagens =
      estadoEvidencias.imagens.filter(
        item => String(item.id || "") !== String(imagemId || "")
      );
    estadoEvidencias.assinaturaVisual = null;
    renderizarEvidencias();

    if (imagem.caminho) {
      await removerArquivoSupabase(
        imagem.caminho
      ).catch(
        erro => {
          /*
           * Se o arquivo já não existir no Supabase,
           * ainda removemos a referência do Firestore.
           */
          const mensagem =
            String(
              erro?.message ||
              ""
            ).toLowerCase();

          if (
            !mensagem.includes(
              "not found"
            ) &&
            !mensagem.includes(
              "não encontrado"
            )
          ) {
            throw erro;
          }
        }
      );
    }

    await setDoc(
      doc(
        firestore,
        EVIDENCIAS_COLLECTION,
        estadoEvidencias.chaveAtual ||
          contexto.chave
      ),
      {
        imagens:
          estadoEvidencias.imagens,
        atualizadoEm:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

    mensagemEvidencia(
      "Evidência excluída.",
      "success"
    );
  } catch (erro) {
    estadoEvidencias.imagens =
      imagensAnteriores;
    estadoEvidencias.assinaturaVisual = null;
    renderizarEvidencias();

    console.error(
      "Erro ao excluir evidência:",
      erro
    );

    alert(
      "Não foi possível excluir a evidência."
    );
  }
}

function prepararDropzoneEvidencia() {
  const dropzone =
    evidEl(
      "#evidenciaDropzone"
    );

  const input =
    evidEl(
      "#evidenciaInput"
    );

  const selecionar =
    evidEl(
      "#btnSelecionarEvidencia"
    );

  if (
    !dropzone ||
    !input ||
    !selecionar
  ) {
    console.warn(
      "Área de evidências não encontrada no modal."
    );

    return;
  }

  if (
    dropzone.dataset
      .evidenciaPreparada === "true"
  ) {
    return;
  }

  dropzone.dataset
    .evidenciaPreparada = "true";

  const abrirSeletor = evento => {
    evento?.preventDefault();
    evento?.stopPropagation();

    const contexto =
      garantirContextoAntesDoUpload();

    if (!contexto) {
      return;
    }

    input.value = "";
    input.click();
  };

  selecionar.addEventListener(
    "click",
    abrirSeletor
  );

  dropzone.addEventListener(
    "click",
    evento => {
      if (
        evento.target.closest(
          "button, a, input"
        )
      ) {
        return;
      }

      abrirSeletor(evento);
    }
  );

  input.addEventListener(
    "change",
    async () => {
      const arquivos =
        input.files;

      if (
        !arquivos ||
        !arquivos.length
      ) {
        return;
      }

      await enviarArquivosEvidencia(
        arquivos
      );

      input.value = "";
    }
  );

  [
    "dragenter",
    "dragover"
  ].forEach(
    eventoNome =>
      dropzone.addEventListener(
        eventoNome,
        evento => {
          evento.preventDefault();
          evento.stopPropagation();

          if (
            garantirContextoAntesDoUpload()
          ) {
            dropzone.classList.add(
              "dragging"
            );
          }
        }
      )
  );

  [
    "dragleave",
    "drop"
  ].forEach(
    eventoNome =>
      dropzone.addEventListener(
        eventoNome,
        evento => {
          evento.preventDefault();
          evento.stopPropagation();

          dropzone.classList.remove(
            "dragging"
          );
        }
      )
  );

  dropzone.addEventListener(
    "drop",
    async evento => {
      const contexto =
        garantirContextoAntesDoUpload();

      if (!contexto) {
        return;
      }

      const arquivos =
        evento.dataTransfer?.files;

      if (
        arquivos &&
        arquivos.length
      ) {
        await enviarArquivosEvidencia(
          arquivos
        );
      }
    }
  );
}


let intervaloContextoEvidencia =
  null;

function atualizarContextoEvidenciaAgora() {
  window.clearTimeout(
    atualizarContextoEvidenciaAgora
      .temporizador
  );

  atualizarContextoEvidenciaAgora
    .temporizador =
      window.setTimeout(
        observarEvidenciasDaFilial,
        30
      );
}


let observerContextoEvidencia =
  null;

function iniciarObserverContextoEvidencia() {
  observerContextoEvidencia
    ?.disconnect();

  const modal =
    evidEl(
      "#modalLancamento"
    );

  if (!modal) {
    return;
  }

  observerContextoEvidencia =
    new MutationObserver(
      () => {
        if (modal.open) {
          atualizarContextoEvidenciaAgora();
        }
      }
    );

  observerContextoEvidencia.observe(
    modal,
    {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: [
        "open",
        "value",
        "selected"
      ]
    }
  );
}

function iniciarMonitoramentoContextoEvidencia() {
  window.clearInterval(
    intervaloContextoEvidencia
  );

  intervaloContextoEvidencia =
    window.setInterval(
      () => {
        const modal =
          evidEl(
            "#modalLancamento"
          );

        if (
          modal?.open
        ) {
          const contexto =
            contextoEvidenciaAtual();

          const novaChave =
            contexto?.chave ||
            "";

          if (
            novaChave !==
            estadoEvidencias.chaveAtual
          ) {
            observarEvidenciasDaFilial();
          }
        }
      },
      400
    );
}

function configurarContextoEvidencia() {
  [
    "#lancamentoCompetencia",
    "#lancamentoFilial",
    "#lancamentoFuncionario"
  ].forEach(
    seletor => {
      const campo =
        evidEl(seletor);

      [
        "change",
        "input"
      ].forEach(
        eventoNome =>
          campo?.addEventListener(
            eventoNome,
            atualizarContextoEvidenciaAgora
          )
      );
    }
  );

  /*
   * Não usamos MutationObserver nem polling aqui. Eles observavam mudanças
   * produzidas pelo próprio modal e criavam um ciclo infinito de recarga.
   * Os eventos change/input e os botões abrir/editar já cobrem o contexto.
   */

  const modal =
    evidEl(
      "#modalLancamento"
    );

  modal?.addEventListener(
    "close",
    encerrarEscutaEvidencia
  );

  const botaoNovo =
    evidEl(
      "#btnNovoLancamento"
    );

  botaoNovo?.addEventListener(
    "click",
    () => {
      estadoEvidencias.ultimoContextoValido = null;
      estadoEvidencias.chaveAtual = "";
      setTimeout(
        atualizarContextoEvidenciaAgora,
        100
      );
    }
  );

  document.addEventListener(
    "click",
    evento => {
      if (
        evento.target.closest(
          "[data-edit-lancamento], [data-action='editar-lancamento']"
        )
      ) {
        setTimeout(
          atualizarContextoEvidenciaAgora,
          150
        );
      }
    }
  );
}

window.evidenciasProdutivos = {
  ...(window.evidenciasProdutivos || {}),

  antesDeExcluirLancamento,

  atualizarContexto:
    atualizarContextoEvidenciaAgora,

  abrirVisualizador:
    abrirVisualizadorEvidencias,

  anexarAoPdf,

  anexarAoExcel,

  versao:
    "2026.08.04-SUPABASE-AUDITORIA-03-SEM-MATRIZ-VISIVEL"
};

function inicializarModuloEvidenciasProdutivos() {
  garantirCssVisualizadorEvidencias();
  prepararDropzoneEvidencia();
  configurarContextoEvidencia();
  configurarBotoesVisualizacaoEvidencias();
  configurarExclusaoDelegadaEvidencias();
  renderizarEvidencias();
}

/*
 * Entrada pública usada diretamente pelo onclick de cada cartão. Isso evita
 * que listeners globais de outros módulos bloqueiem o botão do modal.
 */
window.excluirEvidenciaProdutivosDireta = function(evento, botao) {
  evento?.preventDefault();
  evento?.stopPropagation();

  const imagemId = String(botao?.dataset?.evidenceId || "");
  if (!imagemId) {
    console.error("[EVIDÊNCIAS] O botão não possui o ID da imagem.");
    alert("Não foi possível identificar esta evidência.");
    return false;
  }

  excluirEvidencia(imagemId, botao);
  return false;
};

function configurarExclusaoDelegadaEvidencias() {
  if (
    document.documentElement.dataset
      .evidenciasProdutivosExclusaoConfigurada === "true"
  ) {
    return;
  }

  document.documentElement.dataset
    .evidenciasProdutivosExclusaoConfigurada = "true";

  document.addEventListener("click", evento => {
    const botao = evento.target.closest("[data-evidence-id]");
    if (!botao) return;

    evento.preventDefault();
    evento.stopPropagation();

    excluirEvidencia(botao.dataset.evidenceId, botao);
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    inicializarModuloEvidenciasProdutivos,
    {
      once: true
    }
  );
} else {
  inicializarModuloEvidenciasProdutivos();
}
