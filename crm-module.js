import { firestore } from "./firebase-config.js";

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ======================================================================
           CAMPANHAS DO CRM — MÓDULO COMPLETO v1.1
           Sistema de Campanhas Pós-Vendas
           ----------------------------------------------------------------------
           Arquivo isolado: crm-module.js
           - não altera Produtivos;
           - não altera Pix do Presidente;
           - não altera Garantia;
           - não altera Compras;
           - usa o menu CRM que já existe no index.html;
           - cria as telas do CRM dinamicamente dentro do <main>;
           - inclui importação XLSX/XLS/CSV na área de Lançamentos.
           ====================================================================== */

        (() => {
          "use strict";

          const VERSION = "2026.08.25-16.5";
          const STORAGE_KEY = "campanhas_crm_estado_v01";
          const IMPORT_KEY = "campanhas_crm_importacoes_v01";
          const CRM_AUDIT_KEY = "campanhas_crm_auditoria_v01";
          const CRM_AUDIT_ACCESS_KEY = "campanhas_crm_auditoria_acesso_v01";
          const CRM_AUDIT_PASSWORD = "123321";
          const CRM_FIREBASE = {
            participantes: "crm_participantes",
            competencias: "crm_competencias",
            importacoes: "crm_importacoes",
            auditoria: "crm_auditoria",
            meta: "crm_meta"
          };

          let crmFirebasePronto = false;
          let crmFirebaseAplicandoSnapshot = false;
          let crmFirebaseTimer = null;
          let crmImportFirebaseTimer = null;
          const crmHashesRemotos = new Map();
          const crmImportHashesRemotos = new Map();


          const $ = (selector, root = document) => root.querySelector(selector);
          const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

          const texto = value =>
            String(value ?? "")
              .replace(/\u00A0/g, " ")
              .replace(/\s+/g, " ")
              .trim();

          const normalizar = value =>
            texto(value)
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toUpperCase();

          const escapar = value =>
            String(value ?? "")
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")
              .replaceAll('"', "&quot;")
              .replaceAll("'", "&#039;");

          const numero = value => {
            if (value === null || value === undefined || value === "") return 0;
            if (typeof value === "number") return Number.isFinite(value) ? value : 0;

            let raw = texto(value)
              .replace(/R\$/gi, "")
              .replace(/\s/g, "")
              .replace(/%/g, "");

            if (!raw) return 0;

            if (raw.includes(",") && raw.includes(".")) {
              raw =
                raw.lastIndexOf(",") > raw.lastIndexOf(".")
                  ? raw.replace(/\./g, "").replace(",", ".")
                  : raw.replace(/,/g, "");
            } else if (raw.includes(",")) {
              raw = raw.replace(",", ".");
            }

            const result = Number(raw);
            return Number.isFinite(result) ? result : 0;
          };

          const moeda = value =>
            (Number(value) || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            });

          const percentual = value =>
            `${(Number(value) || 0).toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1
            })}%`;

          const idUnico = () =>
            `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

          const clone = value => JSON.parse(JSON.stringify(value));

          function competenciaAnterior() {
            const agora = new Date();
            const anterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

            return [
              anterior.getFullYear(),
              String(anterior.getMonth() + 1).padStart(2, "0")
            ].join("-");
          }

          function mudarCompetencia(competencia, delta) {
            const [ano, mes] = String(competencia).split("-").map(Number);
            const data = new Date(ano, mes - 1 + delta, 1);

            return [
              data.getFullYear(),
              String(data.getMonth() + 1).padStart(2, "0")
            ].join("-");
          }

          /* -------------------------------------------------------------------
             REGRAS DA CAMPANHA
             Baseadas no material de apuração que foi analisado para o CRM.
             ------------------------------------------------------------------- */

          const REGRAS = {
            assistente: {
              label: "Assistente",
              teto: 900,
              primeiroAtendimento: 50,
              tempoResposta: 50,
              loginApp: [
                [100, 100],
                [80, 80],
                [60, 70]
              ],
              agendamento: [
                [100, 100],
                [90, 80],
                [80, 70]
              ],
              faturamento: [
                [100, 100],
                [90, 80],
                [80, 70]
              ],
              dynamoAtivo: [
                [40, 150],
                [30, 100],
                [20, 90]
              ],
              dynamoReceptivo: [
                [80, 150],
                [70, 100],
                [60, 90]
              ],
              smd: [
                [90, 100],
                [70, 95],
                [50, 90]
              ],
              nps: [
                [9, 100],
                [7, 95],
                [6, 90]
              ],
              qualidade: [
                [97, 100],
                [90, 80],
                [80, 70]
              ]
            },

            analista: {
              label: "Analista",
              teto: 2000,
              primeiroAtendimento: 100,
              tempoResposta: 100,
              loginApp: [
                [100, 150],
                [80, 100],
                [60, 90]
              ],
              agendamento: [
                [100, 150],
                [90, 100],
                [80, 90]
              ],
              faturamento: [
                [100, 300],
                [90, 200],
                [80, 150]
              ],
              dynamoAtivo: [
                [40, 300],
                [30, 200],
                [20, 150]
              ],
              dynamoReceptivo: [
                [80, 300],
                [70, 200],
                [60, 150]
              ],
              smd: [
                [90, 150],
                [70, 100],
                [50, 90]
              ],
              nps: [
                [9, 150],
                [7, 100],
                [6, 90]
              ],
              qualidade: [
                [97, 150],
                [90, 100],
                [80, 90]
              ]
            },

            supervisao: {
              label: "Supervisão",
              teto: 3300,
              primeiroAtendimento: 200,
              tempoResposta: 200,
              loginApp: [
                [100, 200],
                [80, 150],
                [60, 100]
              ],
              agendamento: [
                [100, 250],
                [90, 200],
                [80, 150]
              ],
              faturamento: [
                [100, 250],
                [90, 200],
                [80, 150]
              ],
              dynamoAtivo: [
                [40, 250],
                [30, 200],
                [20, 150]
              ],
              dynamoReceptivo: [
                [80, 250],
                [70, 200],
                [60, 150]
              ],
              smd: [
                [90, 250],
                [70, 200],
                [50, 150]
              ],
              nps: [
                [9, 250],
                [7, 200],
                [6, 150]
              ],
              qualidade: [
                [97, 150],
                [90, 100],
                [80, 90]
              ]
            }
          };

          const ALIASES = {
            nome: [
              "nome",
              "assistente",
              "atendente",
              "colaborador",
              "responsavel",
              "responsável",
              "usuario",
              "usuário"
            ],

            marca: ["marca", "time", "equipe"],
            filial: ["filial", "unidade", "casa"],
            dn: ["dn", "codigo", "código"],
            funcao: ["funcao", "função", "cargo", "nivel", "nível"],

            faturados: [
              "faturados",
              "clientes faturados",
              "qtd faturados"
            ],

            metaCadastro: [
              "meta cadastro",
              "meta cadastrados",
              "meta"
            ],

            cadastrados: [
              "cadastrados",
              "cadastros",
              "cadastrado"
            ],

            logados: [
              "logados",
              "logado",
              "login",
              "logins"
            ],

            percentualLogados: [
              "% logados",
              "percentual logados",
              "% login",
              "percentual login"
            ],

            totalAtendimentos: [
              "total atend",
              "total atendimento",
              "total atendimentos",
              "atendimentos"
            ],

            primeiroAtendimento: [
              "1º atend",
              "1o atend",
              "1 atendimento",
              "primeiro atendimento",
              "1ª resposta",
              "1a resposta",
              "primeira resposta"
            ],

            tempoResposta: [
              "t resposta",
              "tempo resposta",
              "tempo de resposta",
              "resposta media",
              "resposta média"
            ],

            recebidas: [
              "recebidas",
              "ligacoes recebidas",
              "ligações recebidas"
            ],

            perdidas: [
              "perdidas",
              "ligacoes perdidas",
              "ligações perdidas"
            ],

            percentualPerdidas: [
              "% perdidas",
              "percentual perdidas",
              "perc perdidas"
            ],

            nota1: ["1", "nota 1", "estrela 1"],
            nota2: ["2", "nota 2", "estrela 2"],
            nota3: ["3", "nota 3", "estrela 3"],
            nota4: ["4", "nota 4", "estrela 4"],
            nota5: ["5", "nota 5", "estrela 5"],

            totalTickets: [
              "total tickets",
              "tickets",
              "total"
            ],

            percentualSatisfacao: [
              "%",
              "% satisfacao",
              "% satisfação",
              "satisfacao",
              "satisfação"
            ],

            agendamentoFiat: [
              "agendamento fiat",
              "agend fiat",
              "agend. fiat"
            ],

            agendamentoDiesel: [
              "agendamento diesel",
              "agend diesel",
              "agend. diesel"
            ],

            faturamentoFiat: [
              "faturamento fiat",
              "fatur fiat",
              "fatur. fiat"
            ],

            faturamentoDiesel: [
              "faturamento diesel",
              "fatur diesel",
              "fatur. diesel"
            ],

            dynamoFiatAtivo: [
              "dynamo fiat ativo",
              "fiat ativo"
            ],

            dynamoFiatReceptivo: [
              "dynamo fiat receptivo",
              "fiat receptivo"
            ],

            dynamoDieselAtivo: [
              "dynamo diesel ativo",
              "diesel ativo"
            ],

            dynamoDieselReceptivo: [
              "dynamo diesel receptivo",
              "diesel receptivo"
            ],

            smd: ["smd", "pesquisa smd"],
            nps: ["nps", "pesquisa nps"],

            qualidade: [
              "qualidade",
              "estrelas",
              "blip",
              "qualidade atendimento"
            ]
          };

          const ESTADO_PADRAO = {
            competencia: competenciaAnterior(),
            view: "dashboard",
            participantes: [],
            resultados: {}
          };


          function hashCRM(valor) {
            try {
              return JSON.stringify(valor ?? null);
            } catch {
              return String(valor ?? "");
            }
          }

          function sanitizarFirestoreCRM(valor) {
            if (valor === undefined) return null;

            if (Array.isArray(valor)) {
              return valor.map(sanitizarFirestoreCRM);
            }

            if (
              valor &&
              typeof valor === "object" &&
              !(valor instanceof Date)
            ) {
              const saida = {};

              Object.entries(valor).forEach(
                ([chave, item]) => {
                  if (item !== undefined) {
                    saida[chave] =
                      sanitizarFirestoreCRM(item);
                  }
                }
              );

              return saida;
            }

            if (
              typeof valor === "number" &&
              !Number.isFinite(valor)
            ) {
              return 0;
            }

            return valor;
          }

          function limparMetadadosFirebaseCRM(valor) {
            if (!valor || typeof valor !== "object") {
              return valor;
            }

            const clone = { ...valor };
            delete clone._updatedAt;
            delete clone.atualizadoEmFirebase;
            return clone;
          }

          function mostrarStatusFirebaseCRM(
            mensagem,
            tipo = "ok"
          ) {
            const existente =
              document.getElementById(
                "crmFirebaseStatus"
              );

            if (existente) {
              existente.textContent = mensagem;
              existente.dataset.status = tipo;
              return;
            }

            const menuCRM =
              document.querySelector(
                "#crmMenuGroup"
              ) ||
              document.querySelector(
                '[data-module="crm"]'
              );

            if (!menuCRM) return;

            const status =
              document.createElement("div");

            status.id = "crmFirebaseStatus";
            status.className =
              "crm-firebase-status";
            status.dataset.status = tipo;
            status.textContent = mensagem;

            menuCRM.appendChild(status);
          }

          async function sincronizarEstadoFirebaseCRM() {
            if (
              !crmFirebasePronto ||
              crmFirebaseAplicandoSnapshot
            ) {
              return;
            }

            try {
              const batch =
                writeBatch(firestore);

              let houveAlteracao = false;

              const participantesAtuais =
                new Set();

              estado.participantes.forEach(
                participante => {
                  const id =
                    String(
                      participante.id ||
                      idUnico()
                    );

                  participante.id = id;
                  participantesAtuais.add(id);

                  const payload =
                    sanitizarFirestoreCRM({
                      ...participante
                    });

                  const hash =
                    hashCRM(payload);

                  const chave =
                    `p:${id}`;

                  if (
                    crmHashesRemotos.get(chave) !==
                    hash
                  ) {
                    houveAlteracao = true;

                    batch.set(
                      doc(
                        firestore,
                        CRM_FIREBASE.participantes,
                        id
                      ),
                      {
                        ...payload,
                        _updatedAt:
                          serverTimestamp()
                      },
                      { merge: true }
                    );

                    crmHashesRemotos.set(
                      chave,
                      hash
                    );
                  }
                }
              );

              [...crmHashesRemotos.keys()]
                .filter(
                  chave =>
                    chave.startsWith("p:") &&
                    !participantesAtuais.has(
                      chave.slice(2)
                    )
                )
                .forEach(chave => {
                  const id =
                    chave.slice(2);

                  houveAlteracao = true;

                  batch.delete(
                    doc(
                      firestore,
                      CRM_FIREBASE.participantes,
                      id
                    )
                  );

                  crmHashesRemotos.delete(chave);
                });

              const competenciasAtuais =
                new Set();

              Object.entries(
                estado.resultados || {}
              ).forEach(
                ([competencia, dados]) => {
                  competenciasAtuais.add(
                    competencia
                  );

                  const payload =
                    sanitizarFirestoreCRM({
                      competencia,
                      clientes:
                        dados.clientes || [],
                      atendimento:
                        dados.atendimento || [],
                      satisfacao:
                        dados.satisfacao || [],
                      indicadores:
                        dados.indicadores || [],
                      manuais:
                        dados.manuais || []
                    });

                  const hash =
                    hashCRM(payload);

                  const chave =
                    `c:${competencia}`;

                  if (
                    crmHashesRemotos.get(chave) !==
                    hash
                  ) {
                    houveAlteracao = true;

                    batch.set(
                      doc(
                        firestore,
                        CRM_FIREBASE.competencias,
                        competencia
                      ),
                      {
                        ...payload,
                        _updatedAt:
                          serverTimestamp()
                      },
                      { merge: true }
                    );

                    crmHashesRemotos.set(
                      chave,
                      hash
                    );
                  }
                }
              );

              [...crmHashesRemotos.keys()]
                .filter(
                  chave =>
                    chave.startsWith("c:") &&
                    !competenciasAtuais.has(
                      chave.slice(2)
                    )
                )
                .forEach(chave => {
                  const competencia =
                    chave.slice(2);

                  houveAlteracao = true;

                  batch.delete(
                    doc(
                      firestore,
                      CRM_FIREBASE.competencias,
                      competencia
                    )
                  );

                  crmHashesRemotos.delete(chave);
                });

              const metaPayload =
                sanitizarFirestoreCRM({
                  competencia:
                    estado.competencia,
                  view:
                    estado.view
                });

              const metaHash =
                hashCRM(metaPayload);

              if (
                crmHashesRemotos.get("meta") !==
                metaHash
              ) {
                houveAlteracao = true;

                batch.set(
                  doc(
                    firestore,
                    CRM_FIREBASE.meta,
                    "estado"
                  ),
                  {
                    ...metaPayload,
                    _updatedAt:
                      serverTimestamp()
                  },
                  { merge: true }
                );

                crmHashesRemotos.set(
                  "meta",
                  metaHash
                );
              }

              if (houveAlteracao) {
                await batch.commit();
              }

              mostrarStatusFirebaseCRM(
                "CRM sincronizado com Firebase",
                "ok"
              );
            } catch (erro) {
              console.error(
                "[CRM/Firebase] Falha ao sincronizar estado:",
                erro
              );

              mostrarStatusFirebaseCRM(
                "CRM sem sincronização",
                "erro"
              );
            }
          }

          function agendarSincronizacaoFirebaseCRM() {
            if (!crmFirebasePronto) return;

            window.clearTimeout(
              crmFirebaseTimer
            );

            crmFirebaseTimer =
              window.setTimeout(
                sincronizarEstadoFirebaseCRM,
                350
              );
          }

          async function sincronizarImportacoesFirebaseCRM(
            lista
          ) {
            if (
              !crmFirebasePronto ||
              crmFirebaseAplicandoSnapshot
            ) {
              return;
            }

            try {
              const batch =
                writeBatch(firestore);

              let houveAlteracao = false;

              const idsAtuais =
                new Set();

              (Array.isArray(lista) ? lista : [])
                .forEach(item => {
                  const id =
                    String(
                      item.id ||
                      `${item.competencia || "sem"}-${item.tipo || "arquivo"}-${item.dataHora || idUnico()}`
                    )
                      .replace(
                        /[^a-zA-Z0-9_-]/g,
                        "_"
                      );

                  item.id = id;
                  idsAtuais.add(id);

                  const payload =
                    sanitizarFirestoreCRM({
                      ...item
                    });

                  const hash =
                    hashCRM(payload);

                  if (
                    crmImportHashesRemotos.get(id) !==
                    hash
                  ) {
                    houveAlteracao = true;

                    batch.set(
                      doc(
                        firestore,
                        CRM_FIREBASE.importacoes,
                        id
                      ),
                      {
                        ...payload,
                        _updatedAt:
                          serverTimestamp()
                      },
                      { merge: true }
                    );

                    crmImportHashesRemotos.set(
                      id,
                      hash
                    );
                  }
                });

              [...crmImportHashesRemotos.keys()]
                .filter(
                  id => !idsAtuais.has(id)
                )
                .forEach(id => {
                  houveAlteracao = true;

                  batch.delete(
                    doc(
                      firestore,
                      CRM_FIREBASE.importacoes,
                      id
                    )
                  );

                  crmImportHashesRemotos.delete(
                    id
                  );
                });

              if (houveAlteracao) {
                await batch.commit();
              }
            } catch (erro) {
              console.error(
                "[CRM/Firebase] Falha ao sincronizar importações:",
                erro
              );
            }
          }

          function agendarImportacoesFirebaseCRM(
            lista
          ) {
            if (!crmFirebasePronto) return;

            window.clearTimeout(
              crmImportFirebaseTimer
            );

            crmImportFirebaseTimer =
              window.setTimeout(
                () =>
                  sincronizarImportacoesFirebaseCRM(
                    lista
                  ),
                300
              );
          }

          async function carregarFirebaseInicialCRM() {
            try {
              mostrarStatusFirebaseCRM(
                "Conectando CRM ao Firebase...",
                "sync"
              );

              const [
                participantesSnap,
                competenciasSnap,
                importacoesSnap,
                metaSnap,
                auditoriaSnap
              ] = await Promise.all([
                getDocs(
                  collection(
                    firestore,
                    CRM_FIREBASE.participantes
                  )
                ),
                getDocs(
                  collection(
                    firestore,
                    CRM_FIREBASE.competencias
                  )
                ),
                getDocs(
                  collection(
                    firestore,
                    CRM_FIREBASE.importacoes
                  )
                ),
                getDocs(
                  collection(
                    firestore,
                    CRM_FIREBASE.meta
                  )
                ),
                getDocs(
                  collection(
                    firestore,
                    CRM_FIREBASE.auditoria
                  )
                )
              ]);

              const temRemoto =
                !participantesSnap.empty ||
                !competenciasSnap.empty ||
                !importacoesSnap.empty;

              crmFirebaseAplicandoSnapshot = true;

              if (temRemoto) {
                estado.participantes =
                  participantesSnap.docs.map(
                    snap => ({
                      id: snap.id,
                      ...limparMetadadosFirebaseCRM(
                        snap.data()
                      )
                    })
                  );

                participantesSnap.docs.forEach(
                  snap => {
                    const limpo =
                      limparMetadadosFirebaseCRM(
                        snap.data()
                      );

                    crmHashesRemotos.set(
                      `p:${snap.id}`,
                      hashCRM(
                        sanitizarFirestoreCRM({
                          id: snap.id,
                          ...limpo
                        })
                      )
                    );
                  }
                );

                const resultados = {};

                competenciasSnap.docs.forEach(
                  snap => {
                    const data =
                      limparMetadadosFirebaseCRM(
                        snap.data()
                      );

                    resultados[snap.id] = {
                      clientes:
                        Array.isArray(data.clientes)
                          ? data.clientes
                          : [],
                      atendimento:
                        Array.isArray(data.atendimento)
                          ? data.atendimento
                          : [],
                      satisfacao:
                        Array.isArray(data.satisfacao)
                          ? data.satisfacao
                          : [],
                      indicadores:
                        Array.isArray(data.indicadores)
                          ? data.indicadores
                          : [],
                      manuais:
                        Array.isArray(data.manuais)
                          ? data.manuais
                          : [],
                      calculados: []
                    };

                    crmHashesRemotos.set(
                      `c:${snap.id}`,
                      hashCRM(
                        sanitizarFirestoreCRM({
                          competencia:
                            snap.id,
                          clientes:
                            resultados[snap.id]
                              .clientes,
                          atendimento:
                            resultados[snap.id]
                              .atendimento,
                          satisfacao:
                            resultados[snap.id]
                              .satisfacao,
                          indicadores:
                            resultados[snap.id]
                              .indicadores,
                          manuais:
                            resultados[snap.id]
                              .manuais
                        })
                      )
                    );
                  });

                estado.resultados =
                  resultados;

                const metaDoc =
                  metaSnap.docs.find(
                    snap =>
                      snap.id === "estado"
                  );

                if (metaDoc) {
                  const meta =
                    limparMetadadosFirebaseCRM(
                      metaDoc.data()
                    );

                  if (meta.competencia) {
                    estado.competencia =
                      meta.competencia;
                  }

                  if (meta.view) {
                    estado.view =
                      meta.view;
                  }

                  crmHashesRemotos.set(
                    "meta",
                    hashCRM(
                      sanitizarFirestoreCRM({
                        competencia:
                          estado.competencia,
                        view:
                          estado.view
                      })
                    )
                  );
                }

                const imports =
                  importacoesSnap.docs
                    .map(
                      snap => ({
                        id: snap.id,
                        ...limparMetadadosFirebaseCRM(
                          snap.data()
                        )
                      })
                    )
                    .sort(
                      (a, b) =>
                        new Date(
                          b.dataHora || 0
                        ) -
                        new Date(
                          a.dataHora || 0
                        )
                    );

                localStorage.setItem(
                  IMPORT_KEY,
                  JSON.stringify(imports)
                );

                importacoesSnap.docs.forEach(
                  snap => {
                    const limpo =
                      limparMetadadosFirebaseCRM(
                        snap.data()
                      );

                    crmImportHashesRemotos.set(
                      snap.id,
                      hashCRM(
                        sanitizarFirestoreCRM({
                          ...limpo,
                          id: snap.id
                        })
                      )
                    );
                  }
                );

                const audits =
                  auditoriaSnap.docs
                    .map(
                      snap => ({
                        id: snap.id,
                        ...limparMetadadosFirebaseCRM(
                          snap.data()
                        )
                      })
                    )
                    .sort(
                      (a, b) =>
                        new Date(
                          b.dataHora || 0
                        ) -
                        new Date(
                          a.dataHora || 0
                        )
                    );

                if (audits.length) {
                  localStorage.setItem(
                    CRM_AUDIT_KEY,
                    JSON.stringify(audits)
                  );
                }

                localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify(estado)
                );
              }

              crmFirebaseAplicandoSnapshot = false;
              crmFirebasePronto = true;

              /*
               * Se o Firebase ainda estiver vazio e este navegador
               * tiver os dados antigos locais, fazemos migração
               * automática uma única vez. É isso que publica a base
               * que já foi importada para os demais usuários.
               */
              if (!temRemoto) {
                await sincronizarEstadoFirebaseCRM();
                await sincronizarImportacoesFirebaseCRM(
                  carregarHistoricoImportacoes()
                );

                const logs =
                  carregarAuditoriaCRM();

                for (const log of logs) {
                  if (!log?.id) continue;

                  await setDoc(
                    doc(
                      firestore,
                      CRM_FIREBASE.auditoria,
                      String(log.id)
                    ),
                    {
                      ...sanitizarFirestoreCRM(
                        log
                      ),
                      _updatedAt:
                        serverTimestamp()
                    },
                    { merge: true }
                  );
                }
              }

              recalcular();
              renderizar();

              mostrarStatusFirebaseCRM(
                "CRM sincronizado com Firebase",
                "ok"
              );

              iniciarListenersFirebaseCRM();
            } catch (erro) {
              crmFirebaseAplicandoSnapshot = false;
              crmFirebasePronto = false;

              console.error(
                "[CRM/Firebase] Não foi possível iniciar sincronização:",
                erro
              );

              mostrarStatusFirebaseCRM(
                "Firebase indisponível no CRM",
                "erro"
              );
            }
          }

          function iniciarListenersFirebaseCRM() {
            onSnapshot(
              collection(
                firestore,
                CRM_FIREBASE.participantes
              ),
              snapshot => {
                if (!crmFirebasePronto) return;

                // Ignora o eco local da própria gravação.
                if (snapshot.metadata?.hasPendingWrites) return;

                crmFirebaseAplicandoSnapshot = true;

                estado.participantes =
                  snapshot.docs.map(
                    snap => ({
                      id: snap.id,
                      ...limparMetadadosFirebaseCRM(
                        snap.data()
                      )
                    })
                  );

                snapshot.docs.forEach(
                  snap => {
                    const limpo =
                      limparMetadadosFirebaseCRM(
                        snap.data()
                      );

                    crmHashesRemotos.set(
                      `p:${snap.id}`,
                      hashCRM(
                        sanitizarFirestoreCRM({
                          id: snap.id,
                          ...limpo
                        })
                      )
                    );
                  }
                );

                localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify(estado)
                );

                crmFirebaseAplicandoSnapshot = false;

                renderizar();
              },
              erro =>
                console.error(
                  "[CRM/Firebase] participantes:",
                  erro
                )
            );

            onSnapshot(
              collection(
                firestore,
                CRM_FIREBASE.competencias
              ),
              snapshot => {
                if (!crmFirebasePronto) return;

                if (snapshot.metadata?.hasPendingWrites) return;

                crmFirebaseAplicandoSnapshot = true;

                const resultados = {};

                snapshot.docs.forEach(
                  snap => {
                    const data =
                      limparMetadadosFirebaseCRM(
                        snap.data()
                      );

                    resultados[snap.id] = {
                      clientes:
                        data.clientes || [],
                      atendimento:
                        data.atendimento || [],
                      satisfacao:
                        data.satisfacao || [],
                      indicadores:
                        data.indicadores || [],
                      manuais:
                        data.manuais || [],
                      calculados: []
                    };

                    crmHashesRemotos.set(
                      `c:${snap.id}`,
                      hashCRM(
                        sanitizarFirestoreCRM({
                          competencia: snap.id,
                          clientes:
                            resultados[snap.id].clientes,
                          atendimento:
                            resultados[snap.id].atendimento,
                          satisfacao:
                            resultados[snap.id].satisfacao,
                          indicadores:
                            resultados[snap.id].indicadores,
                          manuais:
                            resultados[snap.id].manuais
                        })
                      )
                    );
                  }
                );

                estado.resultados =
                  resultados;

                localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify(estado)
                );

                crmFirebaseAplicandoSnapshot = false;

                renderizar();
              },
              erro =>
                console.error(
                  "[CRM/Firebase] competencias:",
                  erro
                )
            );

            onSnapshot(
              collection(
                firestore,
                CRM_FIREBASE.importacoes
              ),
              snapshot => {
                if (!crmFirebasePronto) return;
                if (snapshot.metadata?.hasPendingWrites) return;

                const lista =
                  snapshot.docs
                    .map(
                      snap => ({
                        id: snap.id,
                        ...limparMetadadosFirebaseCRM(
                          snap.data()
                        )
                      })
                    )
                    .sort(
                      (a, b) =>
                        new Date(
                          b.dataHora || 0
                        ) -
                        new Date(
                          a.dataHora || 0
                        )
                    );

                crmImportHashesRemotos.clear();

                lista.forEach(item => {
                  crmImportHashesRemotos.set(
                    item.id,
                    hashCRM(
                      sanitizarFirestoreCRM(item)
                    )
                  );
                });

                localStorage.setItem(
                  IMPORT_KEY,
                  JSON.stringify(lista)
                );

                // Só a tela de Lançamentos depende do histórico de cargas.
                if (estado.view === "lancamentos") {
                  renderizar();
                }
              },
              erro =>
                console.error(
                  "[CRM/Firebase] importacoes:",
                  erro
                )
            );

            onSnapshot(
              collection(
                firestore,
                CRM_FIREBASE.auditoria
              ),
              snapshot => {
                if (!crmFirebasePronto) return;
                if (snapshot.metadata?.hasPendingWrites) return;

                const lista =
                  snapshot.docs
                    .map(
                      snap => ({
                        id: snap.id,
                        ...limparMetadadosFirebaseCRM(
                          snap.data()
                        )
                      })
                    )
                    .sort(
                      (a, b) =>
                        new Date(
                          b.dataHora || 0
                        ) -
                        new Date(
                          a.dataHora || 0
                        )
                    );

                localStorage.setItem(
                  CRM_AUDIT_KEY,
                  JSON.stringify(lista)
                );

                if (
                  document.getElementById(
                    "crmAuditoriaModal"
                  )
                ) {
                  renderizarAuditoriaCRM();
                }
              },
              erro =>
                console.error(
                  "[CRM/Firebase] auditoria:",
                  erro
                )
            );
          }

          let estado = carregarEstado();

          function carregarEstado() {
            try {
              const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

              return {
                ...clone(ESTADO_PADRAO),
                ...salvo,
                participantes: Array.isArray(salvo.participantes)
                  ? salvo.participantes
                  : [],
                resultados:
                  salvo.resultados && typeof salvo.resultados === "object"
                    ? salvo.resultados
                    : {}
              };
            } catch {
              return clone(ESTADO_PADRAO);
            }
          }

          function salvarEstado() {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(estado)
            );

            agendarSincronizacaoFirebaseCRM();
          }

          function carregarHistoricoImportacoes() {
            try {
              const lista = JSON.parse(localStorage.getItem(IMPORT_KEY) || "[]");
              return Array.isArray(lista) ? lista : [];
            } catch {
              return [];
            }
          }

          function salvarHistoricoImportacoes(lista) {
            const seguro =
              Array.isArray(lista)
                ? lista
                : [];

            localStorage.setItem(
              IMPORT_KEY,
              JSON.stringify(seguro)
            );

            agendarImportacoesFirebaseCRM(
              seguro
            );
          }

          function dadosCompetencia(competencia = estado.competencia) {
            if (!estado.resultados[competencia]) {
              estado.resultados[competencia] = {
                clientes: [],
                atendimento: [],
                satisfacao: [],
                indicadores: [],
                manuais: [],
                calculados: []
              };
            }

            const dados = estado.resultados[competencia];

            if (!Array.isArray(dados.clientes)) dados.clientes = [];
            if (!Array.isArray(dados.atendimento)) dados.atendimento = [];
            if (!Array.isArray(dados.satisfacao)) dados.satisfacao = [];
            if (!Array.isArray(dados.indicadores)) dados.indicadores = [];
            if (!Array.isArray(dados.manuais)) dados.manuais = [];
            if (!Array.isArray(dados.calculados)) dados.calculados = [];

            return dados;
          }

          function chaveNivel(valor) {
            const cargo = normalizar(valor);

            if (cargo.includes("SUPERV")) return "supervisao";
            if (cargo.includes("ANALISTA")) return "analista";

            return "assistente";
          }

          function labelNivel(valor) {
            return REGRAS[chaveNivel(valor)].label;
          }

          function aplicarFaixa(faixas, valor) {
            const numeroAtual = Number(valor) || 0;

            for (const [minimo, premio] of faixas) {
              if (numeroAtual >= minimo) return premio;
            }

            return 0;
          }

          function tempoEmMinutos(valor) {
            const raw = texto(valor);

            if (!raw) return Number.POSITIVE_INFINITY;

            if (typeof valor === "number" && Number.isFinite(valor)) {
              /*
               * Excel guarda horário como fração de dia.
               */
              if (valor > 0 && valor < 1) return valor * 24 * 60;
              return valor;
            }

            const partes = raw.split(":").map(Number);

            if (partes.length >= 2 && partes.every(item => Number.isFinite(item))) {
              return (
                (partes[0] || 0) * 60 +
                (partes[1] || 0) +
                (partes[2] || 0) / 60
              );
            }

            const result = Number(raw);
            return Number.isFinite(result) ? result : Number.POSITIVE_INFINITY;
          }

          function encontrarPorNome(lista, nome) {
            const chave = normalizar(nome);

            return lista.find(item => normalizar(item.nome) === chave) || null;
          }

          function calcularParticipante(participante) {
            const dados = dadosCompetencia();
            const nivel = chaveNivel(participante.nivel || participante.funcao);
            const regras = REGRAS[nivel];

            const clientes = encontrarPorNome(dados.clientes, participante.nome);
            const atendimento = encontrarPorNome(dados.atendimento, participante.nome);
            const satisfacao = encontrarPorNome(dados.satisfacao, participante.nome);

            const indicadorIndividual =
              encontrarPorNome(dados.indicadores, participante.nome);

            const indicadorMarca =
              indicadorIndividual ||
              dados.indicadores.find(item => {
                if (!item.marca) return false;

                const marcaParticipante = normalizar(participante.marca);
                const marcaItem = normalizar(item.marca);

                return (
                  marcaParticipante === marcaItem ||
                  marcaParticipante.includes(marcaItem) ||
                  marcaItem.includes(marcaParticipante)
                );
              }) ||
              {};

            const marca = normalizar(participante.marca);
            const temFiat = marca.includes("FIAT");
            const temDiesel = marca.includes("DIESEL");

            const login =
              clientes?.metaCadastro
                ? (Number(clientes.logados || 0) / Number(clientes.metaCadastro || 1)) * 100
                : Number(clientes?.percentualLogados || 0);

            const itens = {
              primeiroAtendimento:
                tempoEmMinutos(atendimento?.primeiroAtendimento) <= 5
                  ? regras.primeiroAtendimento
                  : 0,

              tempoResposta:
                tempoEmMinutos(atendimento?.tempoResposta) <= 5
                  ? regras.tempoResposta
                  : 0,

              loginApp:
                aplicarFaixa(regras.loginApp, login),

              agendamento: 0,
              faturamento: 0,
              dynamoAtivo: 0,
              dynamoReceptivo: 0,

              smd:
                aplicarFaixa(regras.smd, indicadorMarca.smd),

              nps:
                aplicarFaixa(regras.nps, indicadorMarca.nps),

              qualidade:
                aplicarFaixa(
                  regras.qualidade,
                  satisfacao?.percentual || indicadorMarca.qualidade
                )
            };

            if (temFiat) {
              itens.agendamento += aplicarFaixa(
                regras.agendamento,
                indicadorMarca.agendamentoFiat
              );

              itens.faturamento += aplicarFaixa(
                regras.faturamento,
                indicadorMarca.faturamentoFiat
              );

              itens.dynamoAtivo += aplicarFaixa(
                regras.dynamoAtivo,
                indicadorMarca.dynamoFiatAtivo
              );

              itens.dynamoReceptivo += aplicarFaixa(
                regras.dynamoReceptivo,
                indicadorMarca.dynamoFiatReceptivo
              );
            }

            if (temDiesel) {
              itens.agendamento += aplicarFaixa(
                regras.agendamento,
                indicadorMarca.agendamentoDiesel
              );

              itens.faturamento += aplicarFaixa(
                regras.faturamento,
                indicadorMarca.faturamentoDiesel
              );

              itens.dynamoAtivo += aplicarFaixa(
                regras.dynamoAtivo,
                indicadorMarca.dynamoDieselAtivo
              );

              itens.dynamoReceptivo += aplicarFaixa(
                regras.dynamoReceptivo,
                indicadorMarca.dynamoDieselReceptivo
              );
            }

            const bruto = Object.values(itens).reduce(
              (total, atual) => total + (Number(atual) || 0),
              0
            );

            const total = Math.min(bruto, regras.teto);

            return {
              participanteId: participante.id,
              nome: participante.nome,
              funcao: participante.funcao,
              nivel: regras.label,
              marca: participante.marca,
              filial: participante.filial,
              dn: participante.dn,
              teto: regras.teto,
              itens,
              total,
              bruto,
              percentualTeto:
                regras.teto > 0
                  ? (total / regras.teto) * 100
                  : 0,
              primeiroAtendimento: atendimento?.primeiroAtendimento || "",
              tempoResposta: atendimento?.tempoResposta || "",
              possuiClientes: Boolean(clientes),
              possuiAtendimento: Boolean(atendimento),
              possuiSatisfacao: Boolean(satisfacao),
              possuiIndicadores: Boolean(
                indicadorIndividual ||
                Object.keys(indicadorMarca).length
              )
            };
          }


          function sincronizarLancamentosManuais() {
            const dados = dadosCompetencia();
            const manuais = Array.isArray(dados.manuais) ? dados.manuais : [];

            const limpar = lista =>
              (Array.isArray(lista) ? lista : [])
                .filter(item => !item?._origemManualCRM);

            dados.clientes = limpar(dados.clientes);
            dados.atendimento = limpar(dados.atendimento);
            dados.satisfacao = limpar(dados.satisfacao);
            dados.indicadores = limpar(dados.indicadores);

            /*
             * O lançamento manual entra na frente dos dados importados.
             * Assim ele funciona como correção/override sem apagar o arquivo
             * original. Ao excluir o manual, o importado volta a valer.
             */
            [...manuais].reverse().forEach(registro => {
              const base = {
                nome: registro.nome,
                funcao: registro.funcao,
                marca: registro.marca,
                dn: registro.dn,
                filial: registro.filial,
                _origemManualCRM: true,
                _manualId: registro.id
              };

              dados.clientes.unshift({
                ...base,
                faturados: Number(registro.faturados || 0),
                metaCadastro: Number(registro.metaCadastro || 0),
                cadastrados: Number(registro.cadastrados || 0),
                logados: Number(registro.logados || 0),
                percentualLogados:
                  Number(registro.metaCadastro || 0) > 0
                    ? (Number(registro.logados || 0) / Number(registro.metaCadastro || 1)) * 100
                    : Number(registro.percentualLogados || 0)
              });

              dados.atendimento.unshift({
                ...base,
                totalAtendimentos: Number(registro.totalAtendimentos || 0),
                primeiroAtendimento: registro.primeiroAtendimento || "",
                tempoResposta: registro.tempoResposta || "",
                recebidas: Number(registro.recebidas || 0),
                perdidas: Number(registro.perdidas || 0),
                percentualPerdidas:
                  Number(registro.recebidas || 0) + Number(registro.perdidas || 0) > 0
                    ? (
                        Number(registro.perdidas || 0) /
                        (
                          Number(registro.recebidas || 0) +
                          Number(registro.perdidas || 0)
                        )
                      ) * 100
                    : 0
              });

              dados.satisfacao.unshift({
                ...base,
                nota1: Number(registro.nota1 || 0),
                nota2: Number(registro.nota2 || 0),
                nota3: Number(registro.nota3 || 0),
                nota4: Number(registro.nota4 || 0),
                nota5: Number(registro.nota5 || 0),
                totalTickets: Number(registro.totalTickets || 0),
                percentual: Number(registro.qualidade || 0)
              });

              dados.indicadores.unshift({
                ...base,
                agendamentoFiat: Number(registro.agendamentoFiat || 0),
                agendamentoDiesel: Number(registro.agendamentoDiesel || 0),
                faturamentoFiat: Number(registro.faturamentoFiat || 0),
                faturamentoDiesel: Number(registro.faturamentoDiesel || 0),
                dynamoFiatAtivo: Number(registro.dynamoFiatAtivo || 0),
                dynamoFiatReceptivo: Number(registro.dynamoFiatReceptivo || 0),
                dynamoDieselAtivo: Number(registro.dynamoDieselAtivo || 0),
                dynamoDieselReceptivo: Number(registro.dynamoDieselReceptivo || 0),
                smd: Number(registro.smd || 0),
                nps: Number(registro.nps || 0),
                qualidade: Number(registro.qualidade || 0)
              });
            });
          }

          function participantePorIdCRM(id) {
            return estado.participantes.find(item => item.id === id) || null;
          }

          function registroManualPorId(id) {
            return dadosCompetencia().manuais.find(item => item.id === id) || null;
          }

          function recalcular() {
            /*
             * IMPORTANTE: recalcular é uma operação PURA.
             * Não salva e não sincroniza com Firebase.
             * Isso evita o ciclo:
             * snapshot -> render -> recalcular -> salvar -> write -> snapshot.
             */
            sincronizarLancamentosManuais();

            dadosCompetencia().calculados =
              estado.participantes
                .filter(item => item.ativo !== false)
                .map(calcularParticipante);
          }

          /* -------------------------------------------------------------------
             IMPORTAÇÃO
             ------------------------------------------------------------------- */

          async function garantirXLSX() {
            if (window.XLSX) return window.XLSX;

            return await new Promise((resolve, reject) => {
              const script = document.createElement("script");

              script.src =
                "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

              script.onload = () => resolve(window.XLSX);
              script.onerror = () =>
                reject(
                  new Error(
                    "Não foi possível carregar o leitor XLSX."
                  )
                );

              document.head.appendChild(script);
            });
          }

          function detectarSeparador(csv) {
            const primeiraLinha =
              String(csv)
                .split(/\r?\n/)
                .find(linha => linha.trim()) || "";

            return [",", ";", "\t"]
              .map(separador => ({
                separador,
                colunas: primeiraLinha.split(separador).length
              }))
              .sort((a, b) => b.colunas - a.colunas)[0].separador;
          }

          function converterCSV(textoCSV) {
            const separador = detectarSeparador(textoCSV);
            const linhas = [];

            let linha = [];
            let campo = "";
            let aspas = false;

            const origem =
              String(textoCSV).replace(/^\uFEFF/, "");

            for (let i = 0; i < origem.length; i += 1) {
              const caractere = origem[i];

              if (caractere === '"') {
                if (aspas && origem[i + 1] === '"') {
                  campo += '"';
                  i += 1;
                } else {
                  aspas = !aspas;
                }

                continue;
              }

              if (!aspas && caractere === separador) {
                linha.push(campo);
                campo = "";
                continue;
              }

              if (!aspas && (caractere === "\n" || caractere === "\r")) {
                if (caractere === "\r" && origem[i + 1] === "\n") i += 1;

                linha.push(campo);
                campo = "";

                if (linha.some(item => texto(item))) linhas.push(linha);

                linha = [];
                continue;
              }

              campo += caractere;
            }

            if (campo || linha.length) {
              linha.push(campo);

              if (linha.some(item => texto(item))) linhas.push(linha);
            }

            return linhas;
          }

          async function lerMatrizArquivo(arquivo) {
            const extensao =
              arquivo.name.split(".").pop().toLowerCase();

            if (extensao === "csv") {
              return {
                matriz: converterCSV(await arquivo.text()),
                aba: "CSV"
              };
            }

            const XLSX = await garantirXLSX();

            const workbook =
              XLSX.read(
                await arquivo.arrayBuffer(),
                {
                  type: "array",
                  raw: false
                }
              );

            let melhor = {
              matriz: [],
              aba: ""
            };

            for (const nomeAba of workbook.SheetNames) {
              const matriz =
                XLSX.utils.sheet_to_json(
                  workbook.Sheets[nomeAba],
                  {
                    header: 1,
                    defval: "",
                    raw: false
                  }
                );

              if (matriz.length > melhor.matriz.length) {
                melhor = {
                  matriz,
                  aba: nomeAba
                };
              }
            }

            return melhor;
          }

          function encontrarLinhaCabecalho(matriz) {
            const palavras = [
              "NOME",
              "ASSISTENTE",
              "ATENDENTE",
              "COLABORADOR",
              "MARCA",
              "LOGAD",
              "ATEND",
              "SATIS",
              "FATUR",
              "AGEND",
              "DYNAMO",
              "NPS",
              "SMD"
            ];

            let melhor = {
              indice: 0,
              score: -1
            };

            matriz
              .slice(0, 30)
              .forEach((linha, indice) => {
                const conteudo =
                  normalizar(linha.join(" | "));

                const score =
                  palavras.reduce(
                    (soma, palavra) =>
                      soma +
                      (
                        conteudo.includes(palavra)
                          ? 1
                          : 0
                      ),
                    0
                  );

                if (score > melhor.score) {
                  melhor = {
                    indice,
                    score
                  };
                }
              });

            return melhor.indice;
          }

          function mapearCabecalho(cabecalho) {
            const mapa = {};
            const normalizados = cabecalho.map(valor => normalizar(valor));

            // 1º passe: correspondência exata.
            Object.entries(ALIASES).forEach(([campo, nomes]) => {
              const aliases = nomes.map(normalizar);

              const indice = normalizados.findIndex(atual =>
                aliases.some(alvo => atual === alvo)
              );

              if (indice >= 0) mapa[campo] = indice;
            });

            // 2º passe: correspondência parcial, somente do cabeçalho para o alias.
            // Evita que "LOGADOS" seja confundido com "% LOGADOS".
            Object.entries(ALIASES).forEach(([campo, nomes]) => {
              if (mapa[campo] !== undefined) return;

              const aliases = nomes
                .map(normalizar)
                .filter(alvo => alvo.length >= 4);

              const indice = normalizados.findIndex(atual =>
                atual &&
                aliases.some(alvo => atual.includes(alvo))
              );

              if (indice >= 0) mapa[campo] = indice;
            });

            return mapa;
          }

          const valorCelula = (linha, mapa, campo) =>
            mapa[campo] === undefined
              ? ""
              : linha[mapa[campo]] ?? "";

          function nomeValido(valor) {
            const atual = normalizar(valor);

            if (texto(valor).length < 3) return false;

            if (
              atual.includes("TOTAL") ||
              atual === "ASSISTENTE" ||
              atual === "ATENDENTE" ||
              atual === "COLABORADOR"
            ) {
              return false;
            }

            return true;
          }

          function normalizarImportacao(tipo, matriz) {
            const cabecalhoIndice =
              encontrarLinhaCabecalho(matriz);

            const mapa =
              mapearCabecalho(
                matriz[cabecalhoIndice] || []
              );

            const linhas =
              matriz.slice(cabecalhoIndice + 1);

            let dados = [];

            if (tipo === "clientes") {
              dados =
                linhas
                  .map(linha => ({
                    nome:
                      texto(valorCelula(linha, mapa, "nome")),
                    marca:
                      texto(valorCelula(linha, mapa, "marca")),
                    dn:
                      texto(valorCelula(linha, mapa, "dn")),
                    filial:
                      texto(valorCelula(linha, mapa, "filial")),
                    funcao:
                      texto(valorCelula(linha, mapa, "funcao")),
                    faturados:
                      numero(valorCelula(linha, mapa, "faturados")),
                    metaCadastro:
                      numero(valorCelula(linha, mapa, "metaCadastro")),
                    cadastrados:
                      numero(valorCelula(linha, mapa, "cadastrados")),
                    logados:
                      numero(valorCelula(linha, mapa, "logados")),
                    percentualLogados:
                      numero(valorCelula(linha, mapa, "percentualLogados"))
                  }))
                  .filter(item => nomeValido(item.nome));
            }

            if (tipo === "atendimento") {
              dados =
                linhas
                  .map(linha => ({
                    nome:
                      texto(valorCelula(linha, mapa, "nome")),
                    marca:
                      texto(valorCelula(linha, mapa, "marca")),
                    totalAtendimentos:
                      numero(valorCelula(linha, mapa, "totalAtendimentos")),
                    primeiroAtendimento:
                      texto(valorCelula(linha, mapa, "primeiroAtendimento")),
                    tempoResposta:
                      texto(valorCelula(linha, mapa, "tempoResposta")),
                    recebidas:
                      numero(valorCelula(linha, mapa, "recebidas")),
                    perdidas:
                      numero(valorCelula(linha, mapa, "perdidas")),
                    percentualPerdidas:
                      numero(valorCelula(linha, mapa, "percentualPerdidas"))
                  }))
                  .filter(item => nomeValido(item.nome));
            }

            if (tipo === "satisfacao") {
              dados =
                linhas
                  .map(linha => ({
                    nome:
                      texto(valorCelula(linha, mapa, "nome")),
                    marca:
                      texto(valorCelula(linha, mapa, "marca")),
                    nota1:
                      numero(valorCelula(linha, mapa, "nota1")),
                    nota2:
                      numero(valorCelula(linha, mapa, "nota2")),
                    nota3:
                      numero(valorCelula(linha, mapa, "nota3")),
                    nota4:
                      numero(valorCelula(linha, mapa, "nota4")),
                    nota5:
                      numero(valorCelula(linha, mapa, "nota5")),
                    totalTickets:
                      numero(valorCelula(linha, mapa, "totalTickets")),
                    percentual:
                      numero(valorCelula(linha, mapa, "percentualSatisfacao"))
                  }))
                  .filter(item => nomeValido(item.nome));

              dados.forEach(item => {
                if (!item.totalTickets) {
                  item.totalTickets =
                    item.nota1 +
                    item.nota2 +
                    item.nota3 +
                    item.nota4 +
                    item.nota5;
                }

                if (!item.percentual && item.totalTickets) {
                  item.percentual =
                    (
                      (item.nota4 + item.nota5) /
                      item.totalTickets
                    ) * 100;
                }
              });
            }

            if (tipo === "indicadores") {
              dados =
                linhas
                  .map(linha => ({
                    nome:
                      texto(valorCelula(linha, mapa, "nome")),
                    marca:
                      texto(valorCelula(linha, mapa, "marca")),
                    dn:
                      texto(valorCelula(linha, mapa, "dn")),
                    filial:
                      texto(valorCelula(linha, mapa, "filial")),
                    funcao:
                      texto(valorCelula(linha, mapa, "funcao")),
                    agendamentoFiat:
                      numero(valorCelula(linha, mapa, "agendamentoFiat")),
                    agendamentoDiesel:
                      numero(valorCelula(linha, mapa, "agendamentoDiesel")),
                    faturamentoFiat:
                      numero(valorCelula(linha, mapa, "faturamentoFiat")),
                    faturamentoDiesel:
                      numero(valorCelula(linha, mapa, "faturamentoDiesel")),
                    dynamoFiatAtivo:
                      numero(valorCelula(linha, mapa, "dynamoFiatAtivo")),
                    dynamoFiatReceptivo:
                      numero(valorCelula(linha, mapa, "dynamoFiatReceptivo")),
                    dynamoDieselAtivo:
                      numero(valorCelula(linha, mapa, "dynamoDieselAtivo")),
                    dynamoDieselReceptivo:
                      numero(valorCelula(linha, mapa, "dynamoDieselReceptivo")),
                    smd:
                      numero(valorCelula(linha, mapa, "smd")),
                    nps:
                      numero(valorCelula(linha, mapa, "nps")),
                    qualidade:
                      numero(valorCelula(linha, mapa, "qualidade"))
                  }))
                  .filter(
                    item =>
                      nomeValido(item.nome) ||
                      Boolean(item.marca)
                  );
            }

            return {
              cabecalhoIndice,
              mapa,
              dados
            };
          }

          function criarParticipantesAusentes(dados) {
            dados.forEach(item => {
              if (!item.nome) return;

              const existe =
                estado.participantes.some(
                  participante =>
                    normalizar(participante.nome) ===
                    normalizar(item.nome)
                );

              if (existe) return;

              const funcaoImportada =
                item.funcao ||
                "Assistente de CRM";

              estado.participantes.push({
                id: idUnico(),
                nome: item.nome,
                funcao: funcaoImportada,
                nivel: labelNivel(funcaoImportada),
                marca: item.marca || "",
                dn: item.dn || "",
                filial: item.filial || "",
                ativo: true,
                origemCadastro: "IMPORTAÇÃO CRM"
              });
            });
          }

          async function processarImportacao(tipo, arquivo) {
            mostrarToast(
              `Analisando ${arquivo.name}...`,
              "info"
            );

            const leitura =
              await lerMatrizArquivo(arquivo);

            const resultado =
              normalizarImportacao(
                tipo,
                leitura.matriz
              );

            if (!resultado.dados.length) {
              throw new Error(
                "Nenhuma linha válida foi localizada no arquivo."
              );
            }

            const dados = dadosCompetencia();

            /*
             * A fonte mais recente substitui apenas a mesma origem
             * na competência atual.
             * Nenhum outro módulo é alterado.
             */
            dados[tipo] = resultado.dados;

            criarParticipantesAusentes(
              resultado.dados
            );

            const cargaId = idUnico();

            if (Array.isArray(dados[tipo])) {
              dados[tipo].forEach(item => {
                if (item && !item._arquivoImportacaoCRM) {
                  item._arquivoImportacaoCRM = cargaId;
                }
              });
            }

            const historico =
              carregarHistoricoImportacoes();

            historico.unshift({
              id: idUnico(),
              competencia: estado.competencia,
              tipo,
              arquivo: arquivo.name,
              aba: leitura.aba,
              linhas: resultado.dados.length,
              campos:
                Object.keys(resultado.mapa),
              dataHora:
                new Date().toISOString()
            });

            salvarHistoricoImportacoes(
              historico.slice(0, 300)
            );

            registrarAuditoriaCRM({
              acao: "IMPORTAÇÃO",
              entidade: "CARGA DE ARQUIVO",
              competencia: estado.competencia,
              origem: arquivo.name,
              descricao:
                `${resultado.dados.length} linha(s) importada(s) em ${tipo}.`,
              detalhes: {
                tipo,
                arquivo: arquivo.name,
                aba: leitura.aba,
                linhas: resultado.dados.length,
                campos: Object.keys(resultado.mapa)
              }
            });

            recalcular();
            salvarEstado();
            renderizar();

            mostrarToast(
              `${resultado.dados.length} linha(s) importada(s) com sucesso.`,
              "ok"
            );
          }


          /* -------------------------------------------------------------------
             AUDITORIA EXCLUSIVA DO CRM
             ------------------------------------------------------------------- */

          function carregarAuditoriaCRM() {
            try {
              const lista =
                JSON.parse(
                  localStorage.getItem(CRM_AUDIT_KEY) ||
                  "[]"
                );

              return Array.isArray(lista)
                ? lista
                : [];
            } catch {
              return [];
            }
          }

          function salvarAuditoriaCRM(lista) {
            localStorage.setItem(
              CRM_AUDIT_KEY,
              JSON.stringify(
                Array.isArray(lista)
                  ? lista.slice(0, 2000)
                  : []
              )
            );
          }

          function cloneSeguroCRM(valor) {
            try {
              return JSON.parse(
                JSON.stringify(valor ?? null)
              );
            } catch {
              return valor ?? null;
            }
          }

          function registrarAuditoriaCRM({
            acao,
            entidade,
            colaborador = "",
            competencia = estado.competencia,
            marca = "",
            filial = "",
            origem = "CRM",
            descricao = "",
            antes = null,
            depois = null,
            detalhes = null
          }) {
            const logs =
              carregarAuditoriaCRM();

            logs.unshift({
              id: idUnico(),
              modulo: "CRM",
              acao: texto(acao || "EVENTO"),
              entidade: texto(entidade || "REGISTRO"),
              colaborador: texto(colaborador),
              competencia:
                texto(competencia || estado.competencia),
              marca: texto(marca),
              filial: texto(filial),
              origem: texto(origem || "CRM"),
              descricao: texto(descricao),
              antes: cloneSeguroCRM(antes),
              depois: cloneSeguroCRM(depois),
              detalhes: cloneSeguroCRM(detalhes),
              dataHora: new Date().toISOString()
            });

            salvarAuditoriaCRM(logs);

            if (crmFirebasePronto) {
              const logNovo = logs[0];

              setDoc(
                doc(
                  firestore,
                  CRM_FIREBASE.auditoria,
                  String(logNovo.id)
                ),
                {
                  ...sanitizarFirestoreCRM(
                    logNovo
                  ),
                  _updatedAt:
                    serverTimestamp()
                },
                { merge: true }
              ).catch(erro => {
                console.error(
                  "[CRM/Firebase] auditoria:",
                  erro
                );
              });
            }
          }

          function auditoriaCRMComRetroativos() {
            const persistidos =
              carregarAuditoriaCRM();

            const idsExistentes =
              new Set(
                persistidos
                  .map(item => item.referencia)
                  .filter(Boolean)
              );

            const retroativos = [];

            carregarHistoricoImportacoes()
              .forEach(carga => {
                const ref =
                  `IMPORT:${carga.id || carga.arquivo}:${carga.competencia}`;

                if (idsExistentes.has(ref)) return;

                retroativos.push({
                  id: `retro-${ref}`,
                  referencia: ref,
                  modulo: "CRM",
                  acao: "IMPORTAÇÃO",
                  entidade: "CARGA DE ARQUIVO",
                  colaborador: "",
                  competencia:
                    carga.competencia || "",
                  marca: "",
                  filial: "",
                  origem:
                    carga.arquivo || "Arquivo importado",
                  descricao:
                    `${carga.linhas || 0} linha(s) processada(s) em ${carga.tipo || "fonte CRM"}.`,
                  antes: null,
                  depois: null,
                  detalhes: {
                    arquivo: carga.arquivo || "",
                    aba: carga.aba || "",
                    origem: carga.tipo || "",
                    linhas: carga.linhas || 0,
                    campos: carga.campos || []
                  },
                  dataHora:
                    carga.dataHora ||
                    new Date().toISOString()
                });
              });

            Object.entries(estado.resultados || {})
              .forEach(([competencia, dados]) => {
                (dados?.manuais || [])
                  .forEach(registro => {
                    const ref =
                      `MANUAL:${registro.id}:${competencia}`;

                    if (idsExistentes.has(ref)) return;

                    retroativos.push({
                      id: `retro-${ref}`,
                      referencia: ref,
                      modulo: "CRM",
                      acao: "LANÇAMENTO MANUAL",
                      entidade: "LANÇAMENTO",
                      colaborador:
                        registro.nome || "",
                      competencia,
                      marca:
                        registro.marca || "",
                      filial:
                        registro.filial || "",
                      origem:
                        "Lançamento manual",
                      descricao:
                        "Registro manual existente na competência.",
                      antes: null,
                      depois:
                        cloneSeguroCRM(registro),
                      detalhes: null,
                      dataHora:
                        registro.atualizadoEm ||
                        new Date().toISOString()
                    });
                  });
              });

            return [
              ...persistidos,
              ...retroativos
            ].sort(
              (a, b) =>
                new Date(b.dataHora || 0) -
                new Date(a.dataHora || 0)
            );
          }

          function resumoAlteracoesCRM(log) {
            const ignorar =
              new Set([
                "id",
                "participanteId",
                "atualizadoEm",
                "_arquivoImportacaoCRM",
                "_origemManualCRM",
                "_manualId"
              ]);

            const antes =
              log?.antes &&
              typeof log.antes === "object"
                ? log.antes
                : {};

            const depois =
              log?.depois &&
              typeof log.depois === "object"
                ? log.depois
                : {};

            const campos =
              [...new Set([
                ...Object.keys(antes),
                ...Object.keys(depois)
              ])]
                .filter(
                  campo =>
                    !ignorar.has(campo)
                );

            return campos
              .filter(
                campo =>
                  JSON.stringify(antes[campo]) !==
                  JSON.stringify(depois[campo])
              )
              .slice(0, 18)
              .map(campo => ({
                campo,
                antes:
                  antes[campo] ?? "—",
                depois:
                  depois[campo] ?? "—"
              }));
          }

          function formatarValorAuditoriaCRM(valor) {
            if (
              valor === null ||
              valor === undefined ||
              valor === ""
            ) {
              return "—";
            }

            if (typeof valor === "object") {
              try {
                return JSON.stringify(valor);
              } catch {
                return String(valor);
              }
            }

            return String(valor);
          }

          function fecharAuditoriaCRM() {
            $("#crmAuditoriaModal")?.remove();
            document.body.classList.remove(
              "crm-auditoria-aberta"
            );
          }

          function solicitarSenhaAuditoriaCRM() {
            if (
              sessionStorage.getItem(
                CRM_AUDIT_ACCESS_KEY
              ) === "true"
            ) {
              return Promise.resolve(true);
            }

            return new Promise(resolve => {
              const overlay =
                document.createElement("div");

              overlay.className =
                "crm-audit-lock-overlay";

              overlay.innerHTML = `
                <div class="crm-audit-lock-card">
                  <div class="crm-audit-lock-icon">
                    🔒
                  </div>

                  <p class="crm-kicker">
                    ACESSO RESTRITO · CRM
                  </p>

                  <h3>Auditoria do CRM</h3>

                  <p>
                    Digite a senha para consultar somente
                    os registros de rastreabilidade do módulo CRM.
                  </p>

                  <input
                    type="password"
                    id="crmAuditPassword"
                    autocomplete="off"
                    placeholder="Digite a senha"
                    aria-label="Senha da auditoria do CRM"
                  />

                  <div
                    id="crmAuditPasswordError"
                    class="crm-audit-lock-error"
                  ></div>

                  <div class="crm-audit-lock-actions">
                    <button
                      type="button"
                      class="crm-secondary-button"
                      id="crmAuditCancel"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      class="crm-primary-button"
                      id="crmAuditEnter"
                    >
                      Acessar
                    </button>
                  </div>
                </div>
              `;

              document.body.appendChild(overlay);

              const input =
                $("#crmAuditPassword", overlay);

              const concluir =
                sucesso => {
                  overlay.remove();
                  resolve(sucesso);
                };

              $("#crmAuditCancel", overlay)
                ?.addEventListener(
                  "click",
                  () => concluir(false)
                );

              const entrar = () => {
                if (
                  String(input?.value || "") ===
                  CRM_AUDIT_PASSWORD
                ) {
                  sessionStorage.setItem(
                    CRM_AUDIT_ACCESS_KEY,
                    "true"
                  );

                  concluir(true);
                  return;
                }

                const erro =
                  $("#crmAuditPasswordError", overlay);

                if (erro) {
                  erro.textContent =
                    "Senha incorreta.";
                }

                if (input) {
                  input.value = "";
                  input.focus();
                }
              };

              $("#crmAuditEnter", overlay)
                ?.addEventListener(
                  "click",
                  entrar
                );

              input?.addEventListener(
                "keydown",
                evento => {
                  if (evento.key === "Enter") {
                    entrar();
                  }
                }
              );

              window.setTimeout(
                () => input?.focus(),
                60
              );
            });
          }

          function filtrosAuditoriaCRM() {
            const modal =
              $("#crmAuditoriaModal");

            if (!modal) {
              return {
                acao: "",
                origem: "",
                inicio: "",
                fim: "",
                busca: ""
              };
            }

            return {
              acao:
                $("#crmAuditFiltroAcao", modal)
                  ?.value || "",

              origem:
                $("#crmAuditFiltroOrigem", modal)
                  ?.value || "",

              inicio:
                $("#crmAuditDataInicio", modal)
                  ?.value || "",

              fim:
                $("#crmAuditDataFim", modal)
                  ?.value || "",

              busca:
                normalizar(
                  $("#crmAuditBusca", modal)
                    ?.value || ""
                )
            };
          }

          function logsFiltradosAuditoriaCRM() {
            const filtros =
              filtrosAuditoriaCRM();

            return auditoriaCRMComRetroativos()
              .filter(log => {
                if (
                  filtros.acao &&
                  normalizar(log.acao) !==
                  normalizar(filtros.acao)
                ) {
                  return false;
                }

                if (
                  filtros.origem &&
                  normalizar(log.origem) !==
                  normalizar(filtros.origem)
                ) {
                  return false;
                }

                const data =
                  new Date(log.dataHora || 0);

                if (filtros.inicio) {
                  const inicio =
                    new Date(
                      `${filtros.inicio}T00:00:00`
                    );

                  if (data < inicio) {
                    return false;
                  }
                }

                if (filtros.fim) {
                  const fim =
                    new Date(
                      `${filtros.fim}T23:59:59`
                    );

                  if (data > fim) {
                    return false;
                  }
                }

                if (filtros.busca) {
                  const pilha =
                    normalizar([
                      log.acao,
                      log.entidade,
                      log.colaborador,
                      log.competencia,
                      log.marca,
                      log.filial,
                      log.origem,
                      log.descricao,
                      JSON.stringify(log.detalhes || {}),
                      JSON.stringify(log.antes || {}),
                      JSON.stringify(log.depois || {})
                    ].join(" "));

                  if (
                    !pilha.includes(
                      filtros.busca
                    )
                  ) {
                    return false;
                  }
                }

                return true;
              });
          }

          function renderizarAuditoriaCRM() {
            const modal =
              $("#crmAuditoriaModal");

            if (!modal) return;

            const lista =
              $("#crmAuditLista", modal);

            const contador =
              $("#crmAuditContador", modal);

            const logs =
              logsFiltradosAuditoriaCRM();

            if (contador) {
              contador.textContent =
                `${logs.length} registro(s)`;
            }

            if (!lista) return;

            if (!logs.length) {
              lista.innerHTML = `
                <div class="crm-audit-empty">
                  Nenhum registro do CRM encontrado
                  para os filtros selecionados.
                </div>
              `;
              return;
            }

            lista.innerHTML =
              logs.map(log => {
                const alteracoes =
                  resumoAlteracoesCRM(log);

                const detalhes =
                  log.detalhes &&
                  typeof log.detalhes === "object"
                    ? Object.entries(log.detalhes)
                    : [];

                return `
                  <article
                    class="crm-audit-item"
                    data-action="${escapar(normalizar(log.acao))}"
                  >
                    <div class="crm-audit-item-top">
                      <div class="crm-audit-chips">
                        <span class="crm-audit-chip module">
                          CRM
                        </span>

                        <span class="crm-audit-chip action">
                          ${escapar(log.acao)}
                        </span>

                        ${
                          log.competencia
                            ? `
                              <span class="crm-audit-chip">
                                ${escapar(log.competencia)}
                              </span>
                            `
                            : ""
                        }

                        ${
                          log.marca
                            ? `
                              <span class="crm-audit-chip">
                                ${escapar(log.marca)}
                              </span>
                            `
                            : ""
                        }
                      </div>

                      <time>
                        ${new Date(
                          log.dataHora || Date.now()
                        ).toLocaleString("pt-BR")}
                      </time>
                    </div>

                    <h3>
                      ${escapar(
                        log.colaborador ||
                        log.entidade ||
                        "Registro CRM"
                      )}
                    </h3>

                    <p class="crm-audit-description">
                      ${escapar(
                        log.descricao ||
                        `${log.entidade || "Registro"} atualizado no CRM.`
                      )}
                    </p>

                    <div class="crm-audit-meta">
                      <span>
                        <b>Entidade:</b>
                        ${escapar(log.entidade || "—")}
                      </span>

                      <span>
                        <b>Origem:</b>
                        ${escapar(log.origem || "CRM")}
                      </span>

                      ${
                        log.filial
                          ? `
                            <span>
                              <b>Filial:</b>
                              ${escapar(log.filial)}
                            </span>
                          `
                          : ""
                      }
                    </div>

                    ${
                      alteracoes.length
                        ? `
                          <div class="crm-audit-diffs">
                            ${alteracoes.map(diff => `
                              <div class="crm-audit-diff">
                                <strong>
                                  ${escapar(
                                    nomeColunaCRM(diff.campo)
                                  )}
                                </strong>

                                <span class="before">
                                  ${escapar(
                                    formatarValorAuditoriaCRM(
                                      diff.antes
                                    )
                                  )}
                                </span>

                                <span class="arrow">→</span>

                                <span class="after">
                                  ${escapar(
                                    formatarValorAuditoriaCRM(
                                      diff.depois
                                    )
                                  )}
                                </span>
                              </div>
                            `).join("")}
                          </div>
                        `
                        : ""
                    }

                    ${
                      detalhes.length
                        ? `
                          <div class="crm-audit-details">
                            ${detalhes
                              .slice(0, 12)
                              .map(([chave, valor]) => `
                                <span>
                                  <b>${escapar(
                                    nomeColunaCRM(chave)
                                  )}:</b>
                                  ${escapar(
                                    formatarValorAuditoriaCRM(
                                      valor
                                    )
                                  )}
                                </span>
                              `)
                              .join("")}
                          </div>
                        `
                        : ""
                    }
                  </article>
                `;
              }).join("");
          }

          async function exportarAuditoriaCRMExcel() {
            try {
              const XLSX =
                await garantirXLSX();

              const logs =
                logsFiltradosAuditoriaCRM();

              const linhas =
                logs.flatMap(log => {
                  const alteracoes =
                    resumoAlteracoesCRM(log);

                  if (alteracoes.length) {
                    return alteracoes.map(diff => ({
                      "Data/Hora":
                        new Date(log.dataHora)
                          .toLocaleString("pt-BR"),
                      Módulo: "CRM",
                      Ação: log.acao,
                      Entidade: log.entidade,
                      Competência:
                        log.competencia,
                      Marca: log.marca,
                      Filial: log.filial,
                      Colaborador:
                        log.colaborador,
                      Campo:
                        nomeColunaCRM(diff.campo),
                      Antes:
                        formatarValorAuditoriaCRM(
                          diff.antes
                        ),
                      Depois:
                        formatarValorAuditoriaCRM(
                          diff.depois
                        ),
                      Origem: log.origem,
                      Descrição:
                        log.descricao
                    }));
                  }

                  return [{
                    "Data/Hora":
                      new Date(log.dataHora)
                        .toLocaleString("pt-BR"),
                    Módulo: "CRM",
                    Ação: log.acao,
                    Entidade: log.entidade,
                    Competência:
                      log.competencia,
                    Marca: log.marca,
                    Filial: log.filial,
                    Colaborador:
                      log.colaborador,
                    Campo: "—",
                    Antes: "—",
                    Depois: "—",
                    Origem: log.origem,
                    Descrição:
                      log.descricao
                  }];
                });

              const workbook =
                XLSX.utils.book_new();

              const sheet =
                XLSX.utils.json_to_sheet(
                  linhas
                );

              sheet["!cols"] = [
                { wch: 20 },
                { wch: 10 },
                { wch: 18 },
                { wch: 20 },
                { wch: 14 },
                { wch: 16 },
                { wch: 22 },
                { wch: 34 },
                { wch: 24 },
                { wch: 28 },
                { wch: 28 },
                { wch: 25 },
                { wch: 48 }
              ];

              XLSX.utils.book_append_sheet(
                workbook,
                sheet,
                "Auditoria CRM"
              );

              XLSX.writeFile(
                workbook,
                `auditoria-crm-${estado.competencia}.xlsx`
              );
            } catch (erro) {
              mostrarToast(
                erro?.message ||
                "Falha ao exportar auditoria CRM.",
                "erro"
              );
            }
          }

          function exportarAuditoriaCRMPDF() {
            const logs =
              logsFiltradosAuditoriaCRM();

            if (!logs.length) {
              mostrarToast(
                "Não existem registros do CRM para exportar.",
                "info"
              );
              return;
            }

            if (
              !window.jspdf?.jsPDF ||
              typeof window.jspdf.jsPDF !== "function"
            ) {
              mostrarToast(
                "Biblioteca de PDF não disponível.",
                "erro"
              );
              return;
            }

            const { jsPDF } = window.jspdf;

            const doc =
              new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
              });

            const azul = [11, 61, 96];
            const verde = [9, 139, 95];

            doc.setFillColor(...azul);
            doc.rect(0, 0, 297, 28, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text(
              "AUDITORIA EXCLUSIVA — CAMPANHA DO CRM",
              14,
              12
            );

            doc.setFont(
              "helvetica",
              "normal"
            );
            doc.setFontSize(8.5);
            doc.text(
              `${logs.length} registro(s) filtrado(s) • Gerado em ${new Date().toLocaleString("pt-BR")}`,
              14,
              19
            );

            const corpo =
              logs.flatMap(log => {
                const diffs =
                  resumoAlteracoesCRM(log);

                if (diffs.length) {
                  return diffs.map(diff => [
                    new Date(log.dataHora)
                      .toLocaleString("pt-BR"),
                    log.acao || "—",
                    log.competencia || "—",
                    log.colaborador ||
                    log.entidade ||
                    "—",
                    nomeColunaCRM(diff.campo),
                    formatarValorAuditoriaCRM(
                      diff.antes
                    ),
                    formatarValorAuditoriaCRM(
                      diff.depois
                    ),
                    log.origem || "CRM"
                  ]);
                }

                return [[
                  new Date(log.dataHora)
                    .toLocaleString("pt-BR"),
                  log.acao || "—",
                  log.competencia || "—",
                  log.colaborador ||
                  log.entidade ||
                  "—",
                  "—",
                  "—",
                  "—",
                  log.origem || "CRM"
                ]];
              });

            if (
              typeof doc.autoTable ===
              "function"
            ) {
              doc.autoTable({
                startY: 34,

                head: [[
                  "DATA/HORA",
                  "AÇÃO",
                  "COMPETÊNCIA",
                  "REGISTRO",
                  "CAMPO",
                  "ANTES",
                  "DEPOIS",
                  "ORIGEM"
                ]],

                body: corpo,

                theme: "grid",

                margin: {
                  left: 10,
                  right: 10,
                  bottom: 12
                },

                styles: {
                  font: "helvetica",
                  fontSize: 7.1,
                  cellPadding: 2.5,
                  lineColor:
                    [216, 227, 233],
                  lineWidth: .15,
                  textColor:
                    [25, 52, 70],
                  valign: "middle",
                  overflow: "linebreak"
                },

                headStyles: {
                  fillColor: azul,
                  textColor:
                    [255, 255, 255],
                  fontStyle: "bold"
                },

                alternateRowStyles: {
                  fillColor:
                    [247, 250, 251]
                },

                columnStyles: {
                  0: { cellWidth: 32 },
                  1: { cellWidth: 28 },
                  2: { cellWidth: 24 },
                  3: { cellWidth: 48 },
                  4: { cellWidth: 35 },
                  5: { cellWidth: 38 },
                  6: { cellWidth: 38 },
                  7: { cellWidth: 40 }
                },

                didDrawPage: () => {
                  doc.setFontSize(7);
                  doc.setTextColor(
                    102,
                    123,
                    136
                  );

                  doc.text(
                    `Sistema de Campanhas Pós-Vendas • Auditoria CRM • Página ${doc.internal.getCurrentPageInfo().pageNumber}`,
                    14,
                    202
                  );
                }
              });
            }

            doc.save(
              `auditoria-crm-${estado.competencia}.pdf`
            );
          }

          async function abrirAuditoriaCRM() {
            const liberado =
              await solicitarSenhaAuditoriaCRM();

            if (!liberado) return;

            fecharAuditoriaCRM();

            const logs =
              auditoriaCRMComRetroativos();

            const acoes =
              [...new Set(
                logs
                  .map(item => item.acao)
                  .filter(Boolean)
              )]
                .sort();

            const origens =
              [...new Set(
                logs
                  .map(item => item.origem)
                  .filter(Boolean)
              )]
                .sort();

            const modal =
              document.createElement("div");

            modal.id =
              "crmAuditoriaModal";

            modal.className =
              "crm-audit-modal";

            modal.innerHTML = `
              <div
                class="crm-audit-backdrop"
                data-crm-audit-close
              ></div>

              <section class="crm-audit-card">
                <header class="crm-audit-header">
                  <div>
                    <p class="crm-kicker">
                      RASTREABILIDADE · CRM
                    </p>

                    <h2>
                      Auditoria exclusiva do CRM
                    </h2>

                    <span>
                      Este painel exibe somente ações,
                      importações e alterações do módulo CRM.
                    </span>
                  </div>

                  <div class="crm-audit-header-actions">
                    <button
                      type="button"
                      class="crm-audit-export excel"
                      id="crmAuditExportExcel"
                    >
                      Exportar Excel
                    </button>

                    <button
                      type="button"
                      class="crm-audit-export pdf"
                      id="crmAuditExportPDF"
                    >
                      Exportar PDF
                    </button>

                    <button
                      type="button"
                      class="crm-audit-close"
                      data-crm-audit-close
                      aria-label="Fechar"
                    >
                      ×
                    </button>
                  </div>
                </header>

                <div class="crm-audit-filters">
                  <select
                    id="crmAuditFiltroAcao"
                    aria-label="Filtrar ação"
                  >
                    <option value="">
                      Todas as ações
                    </option>

                    ${acoes.map(acao => `
                      <option value="${escapar(acao)}">
                        ${escapar(acao)}
                      </option>
                    `).join("")}
                  </select>

                  <select
                    id="crmAuditFiltroOrigem"
                    aria-label="Filtrar origem"
                  >
                    <option value="">
                      Todas as origens
                    </option>

                    ${origens.map(origem => `
                      <option value="${escapar(origem)}">
                        ${escapar(origem)}
                      </option>
                    `).join("")}
                  </select>

                  <input
                    type="date"
                    id="crmAuditDataInicio"
                    aria-label="Data inicial"
                  />

                  <input
                    type="date"
                    id="crmAuditDataFim"
                    aria-label="Data final"
                  />

                  <input
                    type="search"
                    id="crmAuditBusca"
                    placeholder="Buscar colaborador, marca, filial, campo..."
                  />
                </div>

                <div class="crm-audit-toolbar">
                  <strong id="crmAuditContador">
                    0 registro(s)
                  </strong>

                  <span>
                    Módulo filtrado permanentemente:
                    <b>CRM</b>
                  </span>
                </div>

                <div
                  id="crmAuditLista"
                  class="crm-audit-list"
                ></div>
              </section>
            `;

            document.body.appendChild(modal);

            document.body.classList.add(
              "crm-auditoria-aberta"
            );

            $$(
              "[data-crm-audit-close]",
              modal
            ).forEach(botao => {
              botao.addEventListener(
                "click",
                fecharAuditoriaCRM
              );
            });

            [
              "#crmAuditFiltroAcao",
              "#crmAuditFiltroOrigem",
              "#crmAuditDataInicio",
              "#crmAuditDataFim",
              "#crmAuditBusca"
            ].forEach(seletor => {
              $(seletor, modal)
                ?.addEventListener(
                  "input",
                  renderizarAuditoriaCRM
                );

              $(seletor, modal)
                ?.addEventListener(
                  "change",
                  renderizarAuditoriaCRM
                );
            });

            $("#crmAuditExportExcel", modal)
              ?.addEventListener(
                "click",
                exportarAuditoriaCRMExcel
              );

            $("#crmAuditExportPDF", modal)
              ?.addEventListener(
                "click",
                exportarAuditoriaCRMPDF
              );

            renderizarAuditoriaCRM();
          }

          /* -------------------------------------------------------------------
             LAYOUT
             ------------------------------------------------------------------- */

          function garantirEstruturaCRM() {
            let secao = $("#crmCampanhas");

            if (secao) return secao;

            const main = $("main.main");

            if (!main) return null;

            secao = document.createElement("section");
            secao.id = "crmCampanhas";
            secao.className = "view crm-campaign-view";

            secao.innerHTML = `
              <div class="crm-module-shell">
                <div id="crmConteudo"></div>
              </div>
            `;

            main.appendChild(secao);

            return secao;
          }


          function nomeMesCRM(competencia) {
            const [ano, mes] = String(competencia).split("-").map(Number);
            const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
            if (!ano || !mes || !nomes[mes - 1]) return competencia;
            return `${nomes[mes - 1]} de ${ano}`;
          }

          function localizarControlesGlobaisCRM() {
            return {
              pageTitle: $("#pageTitle"),
              competencia: $("#competenciaGlobal"),
              exportOption: $("#tipoExportacao"),
              filialLabel: $("#pixFilialExportacaoLabel"),
              filialFilter: $("#pixFilialExportacao"),
              btnExcel: $("#btnExportarExcel"),
              btnPDF: $("#btnExportarPdf")
            };
          }
          function garantirNavegacaoMesCRM() {
            /*
             * O CRM reutiliza a navegação mensal ORIGINAL do projeto:
             * #controleHistoricoMensal.
             * Não cria um segundo "Histórico mensal".
             */
            return $("#controleHistoricoMensal") || null;
          }

          function sincronizarCabecalhoCRM() {
            const c = localizarControlesGlobaisCRM();

            document.body.classList.add("crm-mode-active");

            if (c.pageTitle) {
              c.pageTitle.textContent = "Campanhas do CRM";
            }

            const botaoAuditoria =
              $("#produtivosTopbarActions .auditoria-atalho") ||
              $("#btnAuditoriaPRODUTIVOS");

            if (botaoAuditoria) {
              botaoAuditoria.innerHTML =
                "◉ Auditoria CRM";
              botaoAuditoria.title =
                "Abrir auditoria exclusiva da Campanha do CRM";
              botaoAuditoria.dataset.crmVisual =
                "1";
            }

            garantirNavegacaoMesCRM();

            if (c.competencia) {
              c.competencia.value = estado.competencia;
              c.competencia.setAttribute(
                "aria-label",
                "Histórico mensal do CRM"
              );
            }

            const tituloMes = $("#historicoMesAtual");

            if (tituloMes) {
              tituloMes.textContent =
                nomeMesCRM(estado.competencia);
            }

            if (c.exportOption) {
              const valorAtual =
                c.exportOption.value || "habilitados";

              c.exportOption.innerHTML = `
                <option value="habilitados">Somente habilitados</option>
                <option value="todos">Todos os participantes</option>
              `;

              c.exportOption.value =
                ["habilitados", "todos"].includes(valorAtual)
                  ? valorAtual
                  : "habilitados";
            }

            if (c.filialLabel && c.filialFilter) {
              c.filialLabel.hidden = false;

              const titulo =
                c.filialLabel.querySelector("span");

              if (titulo) titulo.textContent = "Marca";

              const marcaAtual =
                window.__crmMarcaGlobal || "";

              c.filialFilter.innerHTML = `
                <option value="">Todas as marcas</option>
                <option value="Diesel">Diesel / Volkswagen</option>
                <option value="Fiat">Fiat</option>
                <option value="Fiat / Diesel">Fiat / Diesel</option>
              `;

              c.filialFilter.value = marcaAtual;
            }
          }

          function crmEstaAtivo() {
            return Boolean(
              $("#crmCampanhas")?.classList.contains("active")
            );
          }

          function aplicarMarcaNoCabecalhoCRM() {
            if (!crmEstaAtivo()) return;

            const c = localizarControlesGlobaisCRM();

            if (c.filialLabel) {
              c.filialLabel.hidden = false;

              const titulo =
                c.filialLabel.querySelector("span");

              if (titulo) titulo.textContent = "Marca";
            }

            if (c.filialFilter) {
              const valorAtual =
                window.__crmMarcaGlobal || "";

              const opcoesEsperadas = [
                ["", "Todas as marcas"],
                ["Diesel", "Diesel / Volkswagen"],
                ["Fiat", "Fiat"],
                ["Fiat / Diesel", "Fiat / Diesel"]
              ];

              const assinaturaAtual =
                [...c.filialFilter.options]
                  .map(opcao => `${opcao.value}|${opcao.textContent}`)
                  .join("||");

              const assinaturaCRM =
                opcoesEsperadas
                  .map(([valor, texto]) => `${valor}|${texto}`)
                  .join("||");

              if (assinaturaAtual !== assinaturaCRM) {
                c.filialFilter.innerHTML =
                  opcoesEsperadas
                    .map(
                      ([valor, texto]) =>
                        `<option value="${escapar(valor)}">${escapar(texto)}</option>`
                    )
                    .join("");
              }

              c.filialFilter.value =
                opcoesEsperadas.some(
                  ([valor]) => valor === valorAtual
                )
                  ? valorAtual
                  : "";
            }

            if (c.exportOption) {
              const assinaturaAtual =
                [...c.exportOption.options]
                  .map(opcao => `${opcao.value}|${opcao.textContent}`)
                  .join("||");

              const assinaturaCRM =
                "habilitados|Somente habilitados||todos|Todos os participantes";

              if (assinaturaAtual !== assinaturaCRM) {
                c.exportOption.innerHTML = `
                  <option value="habilitados">Somente habilitados</option>
                  <option value="todos">Todos os participantes</option>
                `;
              }
            }
          }

          function reafirmarCabecalhoCRM() {
            [0, 25, 70, 160, 300].forEach(atraso => {
              window.setTimeout(
                () => {
                  if (!crmEstaAtivo()) return;

                  sincronizarCabecalhoCRM();
                  aplicarMarcaNoCabecalhoCRM();
                },
                atraso
              );
            });
          }

          function navegarMesCRM(delta) {
            if (!crmEstaAtivo()) return;

            estado.competencia =
              mudarCompetencia(
                estado.competencia,
                delta
              );

            salvarEstado();

            const c =
              localizarControlesGlobaisCRM();

            if (c.competencia) {
              c.competencia.value = estado.competencia;
            }

            const tituloMes = $("#historicoMesAtual");

            if (tituloMes) {
              tituloMes.textContent =
                nomeMesCRM(estado.competencia);
            }

            sincronizarCabecalhoCRM();
            aplicarMarcaNoCabecalhoCRM();

            recalcular();
            renderizar();

            reafirmarCabecalhoCRM();
          }

          function conectarCabecalhoGlobalCRM() {
            const c = localizarControlesGlobaisCRM();

            garantirNavegacaoMesCRM();

            if (c.competencia && !c.competencia.dataset.crmBound) {
              c.competencia.dataset.crmBound = "1";

              c.competencia.addEventListener(
                "change",
                evento => {
                  if (!crmEstaAtivo()) return;

                  evento.preventDefault();
                  evento.stopImmediatePropagation();

                  estado.competencia =
                    evento.target.value ||
                    estado.competencia;

                  salvarEstado();

                  sincronizarCabecalhoCRM();
                  aplicarMarcaNoCabecalhoCRM();

                  recalcular();
                  renderizar();
                  reafirmarCabecalhoCRM();
                },
                true
              );
            }

            if (c.filialFilter && !c.filialFilter.dataset.crmBound) {
              c.filialFilter.dataset.crmBound = "1";

              c.filialFilter.addEventListener(
                "change",
                evento => {
                  if (!crmEstaAtivo()) return;

                  evento.stopImmediatePropagation();

                  window.__crmMarcaGlobal =
                    evento.target.value || "";

                  renderizar();
                  aplicarMarcaNoCabecalhoCRM();
                },
                true
              );
            }

            /*
             * Usa as setas ORIGINAIS do sistema, mas intercepta
             * em CAPTURE antes de Produtivos/Pix.
             */
            if (!document.documentElement.dataset.crmMonthCaptureV161) {
              document.documentElement.dataset.crmMonthCaptureV161 = "1";

              document.addEventListener(
                "click",
                evento => {
                  if (!crmEstaAtivo()) return;

                  const botao =
                    evento.target.closest(
                      "#btnMesAnterior, #btnMesSeguinte"
                    );

                  if (!botao) return;

                  evento.preventDefault();
                  evento.stopImmediatePropagation();

                  navegarMesCRM(
                    botao.id === "btnMesAnterior"
                      ? -1
                      : 1
                  );
                },
                true
              );
            }


            /*
             * AUDITORIA EXCLUSIVA DO CRM.
             *
             * O botão visível no topbar foi originalmente criado
             * pelo auditoria-campanhas.js para Produtivos.
             * Quando o CRM está ativo, interceptamos o clique
             * em CAPTURE antes do listener antigo e abrimos
             * somente a auditoria local do CRM.
             */
            if (
              !document.documentElement
                .dataset.crmAuditCaptureV163
            ) {
              document.documentElement
                .dataset.crmAuditCaptureV163 =
                  "1";

              document.addEventListener(
                "click",
                evento => {
                  if (!crmEstaAtivo()) return;

                  const botao =
                    evento.target.closest(
                      ".auditoria-atalho, #btnAuditoriaPRODUTIVOS, #btnAuditoriaPIX"
                    );

                  if (!botao) return;

                  evento.preventDefault();
                  evento.stopImmediatePropagation();

                  abrirAuditoriaCRM();
                },
                true
              );
            }

            /*
             * CORREÇÃO DA IMPRESSÃO:
             * interceptamos o clique no document CAPTURE.
             * Assim os listeners antigos de Pix/Produtivos nem
             * chegam a receber o clique quando CRM está ativo.
             */
            if (!document.documentElement.dataset.crmExportCaptureV161) {
              document.documentElement.dataset.crmExportCaptureV161 = "1";

              document.addEventListener(
                "click",
                evento => {
                  if (!crmEstaAtivo()) return;

                  const botao =
                    evento.target.closest(
                      "#btnExportarExcel, #btnExportarPdf"
                    );

                  if (!botao) return;

                  evento.preventDefault();
                  evento.stopImmediatePropagation();

                  if (botao.id === "btnExportarExcel") {
                    exportarExcel();
                  } else {
                    exportarPDF();
                  }
                },
                true
              );
            }

            if (!document.documentElement.dataset.crmCompetenciaEventBound) {
              document.documentElement.dataset.crmCompetenciaEventBound = "1";

              document.addEventListener(
                "campanha:competencia-alterada",
                () => {
                  if (!crmEstaAtivo()) return;
                  reafirmarCabecalhoCRM();
                }
              );
            }

            if (!window.__crmHeaderObserver) {
              const alvo =
                $("#produtivosTopbarActions") ||
                document.body;

              window.__crmHeaderObserver =
                new MutationObserver(() => {
                  if (!crmEstaAtivo()) return;

                  window.requestAnimationFrame(
                    () => {
                      aplicarMarcaNoCabecalhoCRM();

                      const tituloMes =
                        $("#historicoMesAtual");

                      if (tituloMes) {
                        tituloMes.textContent =
                          nomeMesCRM(
                            estado.competencia
                          );
                      }
                    }
                  );
                });

              window.__crmHeaderObserver.observe(
                alvo,
                {
                  childList: true,
                  subtree: true,
                  characterData: true
                }
              );
            }
          }

          function listaCalculadosFiltrada() {
            const marca =
              window.__crmMarcaGlobal ||
              "";

            return (
              dadosCompetencia().calculados || []
            ).filter(item => {
              if (!marca) return true;

              const atual = normalizar(item.marca);
              const alvo = normalizar(marca);

              if (marca === "Fiat / Diesel") {
                return (
                  atual.includes("FIAT") &&
                  atual.includes("DIESEL")
                );
              }

              return atual.includes(alvo);
            });
          }


          const CRM_VW_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEsAAABNCAIAAABhdQ6gAAAIbklEQVR4AexZCTiVWRjuRgvaRUlaTNG+L0qpJ6EUquFKRMS0qBSVaRJZmzZUUqJSypKlIkuRVErap5qGtA8tiDZJGPNe5+mfO4hH5zddze95n/95z3fO/9/vO+855zvnaFrxvf81bfK9/3ERNn6FOQ05DUW/B7hRKvoa1eUhp2FdPST69ZyGoq9RXR5yGtbVQ6Jfz2ko+hrV5eH/W8O6eqdx1HMaNg6davOS07C23mkcdZyGjUOn2rzkNKytd+qo+1hSGh570Wjp1qFTbRVULCWU+BJKfBAU5yzzjIxPQ4M6PsFGdYNo+Dy30Mret8MgE/7izUcT0qUkW6iO6Gttqg2ASEq0iIxL01+4SXrw3EVrd+e+esNGIF/8BssRfiotc9waojhuQUBoYvHHT2uX6hdlhKZGbgj1sdviMA8AuRC14UNm2BrrHz8Ul+w+dLKn6gK3HeHl5X990Ue6CjYjfFX4biLfwXX7EXO+eu+ecnAsOvGKmFgNPwHjidNX0UChS0crI411W4I1jNe/efcBFtZRw89/3W9kPMgZPs3uTubT0yEuvm4LbC318J3bGU9SLt0BqYLki7dRBaOtpa630/ykYOert+6P1Fn59FkejOyCnQhf5r/WMHYqKi5JjfSYNHYgXLQwVJdu3xrE0z8azyrw9D8OS9vWkguMtUDUVQedDXfLL3inbuRU+OY9LCyChQjfF33UNHEu+lCSHOIyqG8P4lzzZuJLzLTBY5Ku3H/8HIRB5sOc2ORrKC40mSLRsjkIMLS/YkqYa37B2+nm7iWfSmFhCyxEuHbzoVt/PA7yXj6wT3dhtxabTkWcsHjtjcGTgVeAoCguLmZrpcsYQdA7AZusL17L2Ox3DEW2QBvh4+xcrIft27bSGD+4ik+y0m3nGUyCMTA8mRl7WI0ORp6BcY6eGhqACGOG5uiOHdps2nUUzYTtNJw2QuQGZAgEsCf4VHU/iErICv4hiaTW7/BJZBFwu38LCAuAHIOB+q6oeOOuKBRZwddGWPnj8DUsJrWSNvHwiUCohDNPZUV5nckjUdwRGFtWVg5s23cCRQiOMQkiDLy+3iuUWPaHJ1dUVBBO+aSKMD7lOtxCQoMT2MfUKOPKnwRpI/v5q4i4tODj58gOxs5KYMRbwtgbmvQi7zUs+CCUTL+ZBU4PqgijEy+3aN7My9GCrDEbdkZWXwbVRvfHOglHN/sdJWtMv94KWhOGwiIMvIidDSw9FTptd7Zq00oyJukKivSgijDjQY7KMCUpyZbrV8yGK89eFjDzDUUG9otmgl+/8/Dm3UcgqxcKiiDCwIt4HRZHG37LFs3Gj+pLtgSwUIIqwhe5hd26yMCDmVqjoQxIjbPRYJqqfGdp1AJYP41nqIEIA0PdfUc4LPiaycwJINjNPcnJA6EHVYSYVHKy7eEEj8dzsTMCwWyEGiDCaNqUh83AmTBX4HyEBzKhcC04FlgyA9evMCS1crIdnmTnoooeVBGKi4mVfz4TzJqiMkC5Gxz61TcSmoAII+16ZkraHSDzYY6wHRynRExgEMzAubMmggA8XhOWltImVBF2kmkH0eAQwOPxHG0MQbBsVpERu1ZL+53O3mGAme32KvHvCoonH3FYZkAExEee5uR3lm0HQg+qCDFEX+QVMk7oa48hsxGTSjgMn8A4ZELSDHuDfWGnCccTArr7RIBgBpp+FhDF7Bf5XWQ7gNCDKsK+vbpieWRSM2Qkiyo0QXIjziEN+AWfBJ8ycSh/uiqIZ8Bx5hUISDZozAxEA9Reu/2gn5ICOD2oIpyuPqLg9fvzl+8yfjAy4hxMZAyNTs179RYNbMx1SKLPevScnC2EBWRmIFqeS7+LV3TUBZshFClBFaHG+CHIXccTLzNOVJeRbNP6K3WDhqOG9B4zTBmNvQIEh0afA7HVBUQtLqlaSbVUHzcInB5UESI8Iz21XUEJWF0YVyAj4kHRY2cEDvg3fn8ITrbgIHaVmzic8dNv3Nu0+ygsPbrKCguIw4p/yClYmomLoZYeVBHi552WG5aWla90DwQngIyONnxwhI0LNRAZ6TZMlp+ppYKQYJxm7oahCLLOhs8soSguXuuHPOFoI1iWUaQHbYTd5WWsTaeGxaRGJVxivNHXHturh+AmigxCa1NtbF9JLbL/MvNp4KSqyhKK1I/dPHTuLMNOqsAP0UaIT7ivMsZRaO5yb2xTUQQQhqvdHBAAx3wSEjiBpZFGaykJwtfZ/JMDL9/MWuroP2yAosNSA1LLypOFCLHzjt3vAKe1TJzvZv1J3EJiQC4Bn2cwCTcAIAzQ0mqOBorQ30xfcAkAfuW3+zoW7tiOngxyYi5vYKcHCxHCia5y0smhLmXl5Sp69jGVpx7ISOYSs8agGYPlFjqYrtjEkOUE9xqqs35GYImHnXGLwTRjhbATIVzp11vhRryn8g/yuvM9rOx9X78tmq07Lu7AOmVFedRWAbRKOOhowZ+ME5Oh9RYz2+1jR/S5meCl2K1TlZb0RdYihCs4GZ0Ld8d1fVBUSi+1RbhrUZDrCHt1YNeCoevkGYJmuPzGTE467NyujVT1lvQWNiOENxhpHqtNss76YruDS6qBmjadh5trm7lCpTUbg1a6BZqu2DbF1EV6sOko3VWeAdGYpY8v7Pllib5wwsB3WATLERLPMAgDty4ruBUU6mM3dngfDMXTF255743xDYrHHiA3/42m2pBj/mvQAPf/yJbkrQZ6NkiExFessYY646L22GOCZacHFN87gn85PU3zvx63FZHraY5ikiRp30DPBoywgTyu72e5COvbY6LXntNQ9DSpr0echvXtMdFrz2koeprU1yNOw/r2mOi15zQUPU3q69F/rWF9/aNvz0VI34ff+gucht9aAfrf/xsAAP//xBJ7SAAAAAZJREFUAwDdLiD2kdUSSwAAAABJRU5ErkJggg==";

          function logoMarcaHTML(marca, compacta = false) {
            const valor = normalizar(marca);
            const classes = compacta ? "crm-brand-logo compact" : "crm-brand-logo";

            const vw = `
              <span class="${classes} vw" title="Volkswagen / Diesel">
                <img src="${CRM_VW_LOGO}" alt="Volkswagen" />
              </span>
            `;

            const fiat = `
              <span class="${classes} fiat" title="Fiat">
                <span class="crm-fiat-bars" aria-hidden="true">
                  <i></i><i></i><i></i><i></i>
                </span>
                <b>FIAT</b>
              </span>
            `;

            if (valor.includes("FIAT") && valor.includes("DIESEL")) {
              return `<span class="crm-brand-dual">${vw}${fiat}</span>`;
            }

            if (valor.includes("FIAT")) return fiat;
            if (valor.includes("DIESEL")) return vw;

            return "";
          }

          function nomeColunaCRM(chave) {
            const labels = {
              nome: "Colaborador",
              funcao: "Função",
              marca: "Marca",
              dn: "DN",
              filial: "Filial",
              faturados: "Faturados",
              metaCadastro: "Meta cadastro",
              cadastrados: "Cadastrados",
              logados: "Logados",
              percentualLogados: "% logados",
              totalAtendimentos: "Total atend.",
              primeiroAtendimento: "1º atend.",
              tempoResposta: "T. resposta",
              recebidas: "Recebidas",
              perdidas: "Perdidas",
              percentualPerdidas: "% perdidas",
              nota1: "Nota 1",
              nota2: "Nota 2",
              nota3: "Nota 3",
              nota4: "Nota 4",
              nota5: "Nota 5",
              totalTickets: "Total tickets",
              percentual: "Satisfação",
              agendamentoFiat: "Agend. Fiat",
              agendamentoDiesel: "Agend. Diesel",
              faturamentoFiat: "Fatur. Fiat",
              faturamentoDiesel: "Fatur. Diesel",
              dynamoFiatAtivo: "Dynamo Fiat ativo",
              dynamoFiatReceptivo: "Dynamo Fiat recept.",
              dynamoDieselAtivo: "Dynamo Diesel ativo",
              dynamoDieselReceptivo: "Dynamo Diesel recept.",
              smd: "SMD",
              nps: "NPS",
              qualidade: "Qualidade"
            };

            return labels[chave] || chave;
          }

          function valorTabelaCRM(linha, coluna) {
            if (coluna === "marca") {
              return `
                <div class="crm-brand-cell">
                  ${logoMarcaHTML(linha[coluna], true)}
                  <span>${escapar(linha[coluna] || "—")}</span>
                </div>
              `;
            }

            if (coluna === "nome") {
              return `
                <div class="crm-person-cell">
                  ${logoMarcaHTML(linha.marca, true)}
                  <strong>${escapar(linha[coluna] || "—")}</strong>
                </div>
              `;
            }

            if (coluna === "percentualLogados") {
              const calculado =
                Number(linha.metaCadastro || 0) > 0
                  ? (Number(linha.logados || 0) / Number(linha.metaCadastro || 1)) * 100
                  : Number(linha.percentualLogados || 0);

              return `<span class="crm-percent-pill">${percentual(calculado)}</span>`;
            }

            if (coluna === "percentualPerdidas" || coluna === "percentual") {
              return `<span class="crm-percent-pill">${percentual(linha[coluna])}</span>`;
            }

            return escapar(linha[coluna] ?? "—");
          }

          function podioHTML() {
            const ranking =
              [...listaCalculadosFiltrada()]
                .filter(item => item.total > 0)
                .sort(
                  (a, b) =>
                    b.total - a.total ||
                    tempoEmMinutos(a.primeiroAtendimento) -
                    tempoEmMinutos(b.primeiroAtendimento)
                )
                .slice(0, 3);

            const ordemVisual = [
              { indice: 1, lugar: 2 },
              { indice: 0, lugar: 1 },
              { indice: 2, lugar: 3 }
            ];

            const medalha = lugar => "♛";

            return `
              <article class="crm-panel crm-podium-panel">
                <div class="crm-podium-header">
                  <div>
                    <p class="crm-kicker">
                      RECONHECIMENTO · CAMPANHA DO CRM
                    </p>

                    <h3>Pódio mensal do CRM</h3>

                    <span>
                      Top 3 por valor total de bonificação apurada ·
                      desempate por menor tempo médio de 1º atendimento ·
                      ${escapar(estado.competencia)}
                    </span>
                  </div>
                </div>

                <div class="crm-podium-stage">
                  <div class="crm-podium-grid">
                    ${ordemVisual
                      .map(({ indice, lugar }) => {
                        const item = ranking[indice];

                        const classe =
                          lugar === 1
                            ? "ouro"
                            : lugar === 2
                              ? "prata"
                              : "bronze";

                        return `
                          <section class="crm-podium-card ${classe}">
                            <div class="crm-podium-crown" aria-hidden="true">
                              <span class="crm-crown-symbol">${medalha(lugar)}</span>
                            </div>

                            <span class="crm-place-chip">
                              ${lugar}º LUGAR
                            </span>

                            ${
                              item
                                ? `
                                  <div class="crm-podium-brand">
                                    ${logoMarcaHTML(item.marca)}
                                  </div>

                                  <h4>${escapar(item.nome)}</h4>

                                  <p>${escapar(item.funcao)}</p>

                                  <span class="crm-podium-branch">
                                    ${escapar(item.marca || "—")}
                                    ${item.dn ? ` · DN ${escapar(item.dn)}` : ""}
                                  </span>

                                  <div class="crm-podium-money">
                                    <em>BONIFICAÇÃO APURADA</em>

                                    <strong>${moeda(item.total)}</strong>

                                    <span>
                                      ${percentual(item.percentualTeto)}
                                      do teto de ${moeda(item.teto)}
                                    </span>
                                  </div>
                                `
                                : `
                                  <div class="crm-podium-brand placeholder"></div>

                                  <h4 class="crm-await">
                                    Aguardando resultado
                                  </h4>

                                  <p>Nenhum colaborador elegível</p>
                                `
                            }
                          </section>
                        `;
                      })
                      .join("")}
                  </div>
                </div>
              </article>
            `;
          }
          function resumoDashboardHTML() {
            const calculados =
              listaCalculadosFiltrada();

            const participantesAtivos =
              estado.participantes.filter(
                item => item.ativo !== false
              );

            const clientes =
              dadosCompetencia().clientes || [];

            const atendimento =
              dadosCompetencia().atendimento || [];

            const satisfacao =
              dadosCompetencia().satisfacao || [];

            const totalMeta =
              clientes.reduce(
                (soma, item) =>
                  soma + (Number(item.metaCadastro) || 0),
                0
              );

            const totalLogados =
              clientes.reduce(
                (soma, item) =>
                  soma + (Number(item.logados) || 0),
                0
              );

            const loginGeral =
              totalMeta
                ? (totalLogados / totalMeta) * 100
                : 0;

            const recebidas =
              atendimento.reduce(
                (soma, item) =>
                  soma + (Number(item.recebidas) || 0),
                0
              );

            const perdidas =
              atendimento.reduce(
                (soma, item) =>
                  soma + (Number(item.perdidas) || 0),
                0
              );

            const respondidos =
              recebidas + perdidas
                ? (recebidas / (recebidas + perdidas)) * 100
                : 0;

            const tickets =
              satisfacao.reduce(
                (soma, item) =>
                  soma + (Number(item.totalTickets) || 0),
                0
              );

            const positivos =
              satisfacao.reduce(
                (soma, item) =>
                  soma +
                  (Number(item.nota4) || 0) +
                  (Number(item.nota5) || 0),
                0
              );

            const satisfacaoMedia =
              tickets
                ? (positivos / tickets) * 100
                : 0;

            const investimento =
              calculados.reduce(
                (soma, item) =>
                  soma + (Number(item.total) || 0),
                0
              );

            return `
              <div class="crm-dashboard-cards">
                <article>
                  <span>Participantes ativos</span>
                  <strong>${participantesAtivos.length}</strong>
                  <small>Base atual do CRM</small>
                </article>

                <article>
                  <span>% logados geral</span>
                  <strong>${percentual(loginGeral)}</strong>
                  <small>
                    ${totalLogados} logados · meta ${totalMeta}
                  </small>
                </article>

                <article>
                  <span>% atendimentos respondidos</span>
                  <strong>${percentual(respondidos)}</strong>
                  <small>
                    ${recebidas} recebidas · ${perdidas} perdidas
                  </small>
                </article>

                <article>
                  <span>Satisfação média</span>
                  <strong>${percentual(satisfacaoMedia)}</strong>
                  <small>
                    ${tickets} tickets avaliados
                  </small>
                </article>

                <article>
                  <span>Total investido</span>
                  <strong>${moeda(investimento)}</strong>
                  <small>
                    Competência ${escapar(estado.competencia)}
                  </small>
                </article>
              </div>
            `;
          }

          function tabelaFonteHTML(titulo, dados) {
            if (!dados.length) {
              return `
                <article class="crm-panel">
                  <div class="crm-panel-header">
                    <div>
                      <h3>${escapar(titulo)}</h3>
                      <span>Sem dados importados</span>
                    </div>
                  </div>

                  <div class="crm-empty-state">
                    Importe o arquivo correspondente na área
                    <strong>Lançamentos</strong>.
                  </div>
                </article>
              `;
            }

            const colunas =
              Object.keys(dados[0])
                .filter(chave => !chave.startsWith("_"));

            return `
              <article class="crm-panel crm-data-panel">
                <div class="crm-panel-header">
                  <div>
                    <h3>${escapar(titulo)}</h3>
                    <span>${dados.length} registro(s) importado(s)</span>
                  </div>
                </div>

                <div class="crm-table-wrap">
                  <table class="crm-table crm-source-table">
                    <thead>
                      <tr>
                        ${colunas
                          .map(coluna => `<th>${escapar(nomeColunaCRM(coluna))}</th>`)
                          .join("")}
                      </tr>
                    </thead>

                    <tbody>
                      ${dados
                        .slice(0, 30)
                        .map(
                          linha => `
                            <tr>
                              ${colunas
                                .map(
                                  coluna =>
                                    `<td class="crm-col-${escapar(coluna)}">${valorTabelaCRM(linha, coluna)}</td>`
                                )
                                .join("")}
                            </tr>
                          `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              </article>
            `;
          }
          function dashboardHTML() {
            const dados = dadosCompetencia();

            return `
              ${podioHTML()}
              ${resumoDashboardHTML()}

              ${tabelaFonteHTML(
                "Cadastro & Login no App",
                dados.clientes || []
              )}

              ${tabelaFonteHTML(
                "Atendimento",
                dados.atendimento || []
              )}

              ${tabelaFonteHTML(
                "Pesquisa de Satisfação",
                dados.satisfacao || []
              )}
            `;
          }

          function participantesHTML() {
            return `
              <article class="crm-panel">
                <div class="crm-panel-header">
                  <div>
                    <p class="crm-kicker">
                      BASE OFICIAL
                    </p>

                    <h3>
                      Base de participantes · Campanha do CRM
                    </h3>

                    <span>
                      ${estado.participantes.length}
                      colaborador(es) cadastrado(s)
                    </span>
                  </div>

                  <button
                    type="button"
                    id="crmNovoParticipante"
                    class="crm-primary-button"
                  >
                    + Novo participante
                  </button>
                </div>

                <div class="crm-table-wrap">
                  <table class="crm-table">
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Função</th>
                        <th>Nível</th>
                        <th>Marca</th>
                        <th>Filial</th>
                        <th>Teto de bonificação</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      ${
                        estado.participantes.length
                          ? estado.participantes
                              .map(participante => {
                                const regras =
                                  REGRAS[
                                    chaveNivel(
                                      participante.nivel ||
                                      participante.funcao
                                    )
                                  ];

                                return `
                                  <tr>
                                    <td>
                                      <strong>
                                        ${escapar(participante.nome)}
                                      </strong>
                                    </td>

                                    <td>
                                      ${escapar(participante.funcao)}
                                    </td>

                                    <td>
                                      <span class="crm-level-chip">
                                        ${escapar(regras.label)}
                                      </span>
                                    </td>

                                    <td>
                                      ${escapar(participante.marca || "—")}
                                    </td>

                                    <td>
                                      ${escapar(participante.filial || "—")}
                                      ${
                                        participante.dn
                                          ? ` · DN ${escapar(participante.dn)}`
                                          : ""
                                      }
                                    </td>

                                    <td>
                                      ${moeda(regras.teto)}
                                    </td>

                                    <td>
                                      <span
                                        class="crm-status-chip ${
                                          participante.ativo !== false
                                            ? "ativo"
                                            : "inativo"
                                        }"
                                      >
                                        ${
                                          participante.ativo !== false
                                            ? "Ativo"
                                            : "Inativo"
                                        }
                                      </span>
                                    </td>

                                    <td>
                                      <button
                                        type="button"
                                        class="crm-mini-button"
                                        data-crm-editar="${escapar(participante.id)}"
                                      >
                                        Editar
                                      </button>

                                      <button
                                        type="button"
                                        class="crm-mini-button danger"
                                        data-crm-toggle="${escapar(participante.id)}"
                                      >
                                        ${
                                          participante.ativo !== false
                                            ? "Inativar"
                                            : "Ativar"
                                        }
                                      </button>
                                    </td>
                                  </tr>
                                `;
                              })
                              .join("")
                          : `
                            <tr>
                              <td colspan="8">
                                <div class="crm-empty-state">
                                  Nenhum participante cadastrado.
                                </div>
                              </td>
                            </tr>
                          `
                      }
                    </tbody>
                  </table>
                </div>
              </article>
            `;
          }


          function abrirModalLancamentoManual(registro = null) {
            const participantes =
              estado.participantes
                .filter(item => item.ativo !== false)
                .sort((a, b) =>
                  String(a.nome || "").localeCompare(
                    String(b.nome || ""),
                    "pt-BR"
                  )
                );

            if (!participantes.length) {
              mostrarToast(
                "Cadastre pelo menos um participante antes do lançamento manual.",
                "info"
              );
              return;
            }

            const atual =
              registro || {
                id: "",
                participanteId: participantes[0].id,
                metaCadastro: "",
                cadastrados: "",
                logados: "",
                faturados: "",
                totalAtendimentos: "",
                primeiroAtendimento: "",
                tempoResposta: "",
                recebidas: "",
                perdidas: "",
                nota1: "",
                nota2: "",
                nota3: "",
                nota4: "",
                nota5: "",
                totalTickets: "",
                qualidade: "",
                agendamentoFiat: "",
                agendamentoDiesel: "",
                faturamentoFiat: "",
                faturamentoDiesel: "",
                dynamoFiatAtivo: "",
                dynamoFiatReceptivo: "",
                dynamoDieselAtivo: "",
                dynamoDieselReceptivo: "",
                smd: "",
                nps: ""
              };

            const modal =
              document.createElement("div");

            modal.className = "crm-modal-overlay";

            const campo = (
              label,
              nome,
              valor,
              tipo = "number",
              step = "0.01"
            ) => `
              <label class="crm-form-field">
                <span>${label}</span>
                <input
                  type="${tipo}"
                  name="${nome}"
                  value="${escapar(valor ?? "")}"
                  ${tipo === "number" ? `step="${step}"` : ""}
                />
              </label>
            `;

            modal.innerHTML = `
              <div
                class="crm-modal-backdrop"
                data-crm-fechar-modal
              ></div>

              <form
                id="crmFormLancamentoManual"
                class="crm-modal-card crm-manual-modal"
              >
                <header class="crm-modal-header">
                  <div>
                    <p class="crm-kicker">
                      LANÇAMENTO MANUAL · ${escapar(estado.competencia)}
                    </p>

                    <h3>
                      ${
                        registro
                          ? "Editar lançamento"
                          : "Novo lançamento"
                      }
                    </h3>

                    <span>
                      Os dados manuais têm prioridade sobre a importação
                      para o colaborador nesta competência.
                    </span>
                  </div>

                  <button
                    type="button"
                    class="crm-modal-close"
                    data-crm-fechar-modal
                    aria-label="Fechar"
                  >×</button>
                </header>

                <div class="crm-modal-body">
                  <section class="crm-manual-section">
                    <h4>Colaborador</h4>

                    <label class="crm-form-field full">
                      <span>Participante</span>

                      <select name="participanteId" required>
                        ${participantes.map(item => `
                          <option
                            value="${escapar(item.id)}"
                            ${
                              item.id === atual.participanteId
                                ? "selected"
                                : ""
                            }
                          >
                            ${escapar(item.nome)} ·
                            ${escapar(item.funcao)} ·
                            ${escapar(item.marca)}
                          </option>
                        `).join("")}
                      </select>
                    </label>
                  </section>

                  <section class="crm-manual-section">
                    <h4>Cadastro & Login no APP</h4>

                    <div class="crm-form-grid">
                      ${campo("Faturados", "faturados", atual.faturados, "number", "1")}
                      ${campo("Meta cadastro", "metaCadastro", atual.metaCadastro, "number", "1")}
                      ${campo("Cadastrados", "cadastrados", atual.cadastrados, "number", "1")}
                      ${campo("Logados", "logados", atual.logados, "number", "1")}
                    </div>
                  </section>

                  <section class="crm-manual-section">
                    <h4>Atendimento</h4>

                    <div class="crm-form-grid">
                      ${campo("Total atendimentos", "totalAtendimentos", atual.totalAtendimentos, "number", "1")}
                      ${campo("1º atendimento", "primeiroAtendimento", atual.primeiroAtendimento, "time")}
                      ${campo("Tempo de resposta", "tempoResposta", atual.tempoResposta, "time")}
                      ${campo("Recebidas", "recebidas", atual.recebidas, "number", "1")}
                      ${campo("Perdidas", "perdidas", atual.perdidas, "number", "1")}
                    </div>
                  </section>

                  <section class="crm-manual-section">
                    <h4>Satisfação / Qualidade</h4>

                    <div class="crm-form-grid">
                      ${campo("Nota 1", "nota1", atual.nota1, "number", "1")}
                      ${campo("Nota 2", "nota2", atual.nota2, "number", "1")}
                      ${campo("Nota 3", "nota3", atual.nota3, "number", "1")}
                      ${campo("Nota 4", "nota4", atual.nota4, "number", "1")}
                      ${campo("Nota 5", "nota5", atual.nota5, "number", "1")}
                      ${campo("Total tickets", "totalTickets", atual.totalTickets, "number", "1")}
                      ${campo("Qualidade (%)", "qualidade", atual.qualidade)}
                    </div>
                  </section>

                  <section class="crm-manual-section">
                    <h4>Indicadores mensais</h4>

                    <div class="crm-form-grid">
                      ${campo("Agendamento Fiat (%)", "agendamentoFiat", atual.agendamentoFiat)}
                      ${campo("Agendamento Diesel (%)", "agendamentoDiesel", atual.agendamentoDiesel)}
                      ${campo("Faturamento Fiat (%)", "faturamentoFiat", atual.faturamentoFiat)}
                      ${campo("Faturamento Diesel (%)", "faturamentoDiesel", atual.faturamentoDiesel)}
                      ${campo("Dynamo Fiat Ativo (%)", "dynamoFiatAtivo", atual.dynamoFiatAtivo)}
                      ${campo("Dynamo Fiat Receptivo (%)", "dynamoFiatReceptivo", atual.dynamoFiatReceptivo)}
                      ${campo("Dynamo Diesel Ativo (%)", "dynamoDieselAtivo", atual.dynamoDieselAtivo)}
                      ${campo("Dynamo Diesel Receptivo (%)", "dynamoDieselReceptivo", atual.dynamoDieselReceptivo)}
                      ${campo("SMD", "smd", atual.smd)}
                      ${campo("NPS", "nps", atual.nps)}
                    </div>
                  </section>
                </div>

                <footer class="crm-modal-footer">
                  <button
                    type="button"
                    class="crm-secondary-button"
                    data-crm-fechar-modal
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    class="crm-primary-button"
                  >
                    Salvar lançamento
                  </button>
                </footer>
              </form>
            `;

            document.body.appendChild(modal);

            $$("[data-crm-fechar-modal]", modal)
              .forEach(botao => {
                botao.addEventListener(
                  "click",
                  () => modal.remove()
                );
              });

            $("#crmFormLancamentoManual", modal)
              ?.addEventListener(
                "submit",
                evento => {
                  evento.preventDefault();

                  const form =
                    new FormData(evento.currentTarget);

                  const participante =
                    participantePorIdCRM(
                      String(form.get("participanteId") || "")
                    );

                  if (!participante) {
                    mostrarToast(
                      "Participante não localizado.",
                      "erro"
                    );
                    return;
                  }

                  const numero = nome =>
                    Number(
                      String(form.get(nome) || "")
                        .replace(",", ".")
                    ) || 0;

                  const payload = {
                    id:
                      registro?.id ||
                      idUnico(),

                    participanteId:
                      participante.id,

                    nome:
                      participante.nome,

                    funcao:
                      participante.funcao,

                    marca:
                      participante.marca,

                    dn:
                      participante.dn,

                    filial:
                      participante.filial,

                    faturados: numero("faturados"),
                    metaCadastro: numero("metaCadastro"),
                    cadastrados: numero("cadastrados"),
                    logados: numero("logados"),

                    totalAtendimentos: numero("totalAtendimentos"),
                    primeiroAtendimento:
                      String(form.get("primeiroAtendimento") || ""),
                    tempoResposta:
                      String(form.get("tempoResposta") || ""),
                    recebidas: numero("recebidas"),
                    perdidas: numero("perdidas"),

                    nota1: numero("nota1"),
                    nota2: numero("nota2"),
                    nota3: numero("nota3"),
                    nota4: numero("nota4"),
                    nota5: numero("nota5"),
                    totalTickets: numero("totalTickets"),
                    qualidade: numero("qualidade"),

                    agendamentoFiat: numero("agendamentoFiat"),
                    agendamentoDiesel: numero("agendamentoDiesel"),
                    faturamentoFiat: numero("faturamentoFiat"),
                    faturamentoDiesel: numero("faturamentoDiesel"),
                    dynamoFiatAtivo: numero("dynamoFiatAtivo"),
                    dynamoFiatReceptivo: numero("dynamoFiatReceptivo"),
                    dynamoDieselAtivo: numero("dynamoDieselAtivo"),
                    dynamoDieselReceptivo: numero("dynamoDieselReceptivo"),
                    smd: numero("smd"),
                    nps: numero("nps"),

                    atualizadoEm:
                      new Date().toISOString()
                  };

                  const dados =
                    dadosCompetencia();

                  const antesAuditoria =
                    registro
                      ? cloneSeguroCRM(registro)
                      : null;

                  if (registro) {
                    const indice =
                      dados.manuais.findIndex(
                        item => item.id === registro.id
                      );

                    if (indice >= 0) {
                      dados.manuais[indice] = payload;
                    }
                  } else {
                    /*
                     * Um lançamento manual por colaborador/competência.
                     * Se já existir, atualizamos em vez de duplicar.
                     */
                    const existente =
                      dados.manuais.findIndex(
                        item =>
                          item.participanteId ===
                          participante.id
                      );

                    if (existente >= 0) {
                      payload.id =
                        dados.manuais[existente].id;

                      dados.manuais[existente] =
                        payload;
                    } else {
                      dados.manuais.push(payload);
                    }
                  }

                  salvarEstado();

                  registrarAuditoriaCRM({
                    acao:
                      registro
                        ? "ALTERAÇÃO"
                        : "CRIAÇÃO",
                    entidade: "LANÇAMENTO MANUAL",
                    colaborador: payload.nome,
                    competencia: estado.competencia,
                    marca: payload.marca,
                    filial: payload.filial,
                    origem: "Lançamento manual",
                    descricao:
                      registro
                        ? "Lançamento manual do CRM alterado."
                        : "Lançamento manual do CRM criado.",
                    antes: antesAuditoria,
                    depois: payload
                  });

                  sincronizarLancamentosManuais();
                  recalcular();

                  modal.remove();
                  renderizar();

                  mostrarToast(
                    registro
                      ? "Lançamento manual atualizado."
                      : "Lançamento manual salvo.",
                    "sucesso"
                  );
                }
              );
          }

          function excluirLancamentoManual(id) {
            const registro =
              registroManualPorId(id);

            if (!registro) return;

            if (
              !window.confirm(
                `Excluir o lançamento manual de ${registro.nome} nesta competência?`
              )
            ) {
              return;
            }

            const dados =
              dadosCompetencia();

            dados.manuais =
              dados.manuais.filter(
                item => item.id !== id
              );

            registrarAuditoriaCRM({
              acao: "EXCLUSÃO",
              entidade: "LANÇAMENTO MANUAL",
              colaborador: registro.nome,
              competencia: estado.competencia,
              marca: registro.marca,
              filial: registro.filial,
              origem: "Lançamento manual",
              descricao:
                "Lançamento manual do CRM excluído.",
              antes: registro,
              depois: null
            });

            salvarEstado();
            sincronizarLancamentosManuais();
            recalcular();
            renderizar();

            mostrarToast(
              "Lançamento manual excluído.",
              "sucesso"
            );
          }

          function excluirCargaImportada(id) {
            const historico =
              carregarHistoricoImportacoes();

            const carga =
              historico.find(item => item.id === id);

            if (!carga) return;

            if (
              !window.confirm(
                `Excluir a carga "${carga.arquivo}" desta competência?`
              )
            ) {
              return;
            }

            const dados =
              dadosCompetencia(carga.competencia);

            if (
              carga.tipo &&
              Array.isArray(dados[carga.tipo])
            ) {
              dados[carga.tipo] =
                dados[carga.tipo]
                  .filter(
                    item =>
                      !(
                        item?._arquivoImportacaoCRM ===
                        carga.id
                      )
                  );

              /*
               * Compatibilidade com cargas antigas que ainda não possuíam
               * identificador de arquivo: limpa a origem inteira apenas
               * se não houver marcação individual disponível.
               */
              const possuiMarcacao =
                dados[carga.tipo].some(
                  item => item?._arquivoImportacaoCRM
                );

              if (!possuiMarcacao) {
                dados[carga.tipo] = [];
              }
            }

            salvarHistoricoImportacoes(
              historico.filter(
                item => item.id !== id
              )
            );

            registrarAuditoriaCRM({
              acao: "EXCLUSÃO",
              entidade: "CARGA DE ARQUIVO",
              competencia:
                carga.competencia ||
                estado.competencia,
              origem:
                carga.arquivo ||
                "Arquivo importado",
              descricao:
                `Carga ${carga.arquivo || ""} excluída do CRM.`,
              antes: carga,
              depois: null
            });

            salvarEstado();
            recalcular();
            renderizar();

            mostrarToast(
              "Carga importada excluída.",
              "sucesso"
            );
          }

          function ultimoImportado(tipo) {
            return (
              carregarHistoricoImportacoes()
                .find(
                  item =>
                    item.competencia === estado.competencia &&
                    item.tipo === tipo
                ) || null
            );
          }

          function cardImportacaoHTML(
            tipo,
            titulo,
            descricao,
            formatos
          ) {
            const ultimo =
              ultimoImportado(tipo);

            return `
              <article class="crm-import-card">
                <div class="crm-import-icon">
                  ${
                    tipo === "clientes"
                      ? "APP"
                      : tipo === "atendimento"
                        ? "CSV"
                        : tipo === "satisfacao"
                          ? "★"
                          : "KPI"
                  }
                </div>

                <div class="crm-import-copy">
                  <h4>${escapar(titulo)}</h4>

                  <p>
                    ${escapar(descricao)}
                  </p>

                  <small>
                    ${
                      ultimo
                        ? `
                          ${ultimo.linhas} linha(s) ·
                          ${new Date(ultimo.dataHora).toLocaleString("pt-BR")}
                        `
                        : "Nenhum arquivo importado nesta competência"
                    }
                  </small>
                </div>

                <label class="crm-import-button">
                  Importar arquivo

                  <input
                    type="file"
                    data-crm-importar="${escapar(tipo)}"
                    accept="${escapar(formatos)}"
                    hidden
                  />
                </label>
              </article>
            `;
          }

          function lancamentosHTML() {
            const historico =
              carregarHistoricoImportacoes()
                .filter(
                  item =>
                    item.competencia === estado.competencia
                );

            const manuais =
              dadosCompetencia().manuais || [];

            return `
              <article class="crm-panel crm-import-main">
                <div class="crm-panel-header crm-launch-header">
                  <div>
                    <p class="crm-kicker">
                      ENTRADA DE DADOS
                    </p>

                    <h3>
                      Central de lançamentos do CRM
                    </h3>

                    <span>
                      Competência ${escapar(estado.competencia)}.
                      Importe os arquivos oficiais ou lance manualmente.
                    </span>
                  </div>

                  <button
                    type="button"
                    class="crm-primary-button crm-new-manual"
                    id="crmNovoLancamentoManual"
                  >
                    + Novo lançamento manual
                  </button>
                </div>

                <div class="crm-import-grid">
                  ${cardImportacaoHTML(
                    "clientes",
                    "ClientesApp · Cadastro/Login",
                    "Meta, cadastrados, logados e percentual de login por assistente.",
                    ".xlsx,.xls,.csv"
                  )}

                  ${cardImportacaoHTML(
                    "atendimento",
                    "Atendimento",
                    "Total atendido, 1º atendimento, tempo de resposta, recebidas e perdidas.",
                    ".csv,.xlsx,.xls"
                  )}

                  ${cardImportacaoHTML(
                    "satisfacao",
                    "Satisfação",
                    "Notas 1 a 5, total de tickets e percentual de qualidade.",
                    ".csv,.xlsx,.xls"
                  )}

                  ${cardImportacaoHTML(
                    "indicadores",
                    "Faturamento · Agendamento · Dynamo · NPS/SMD",
                    "Indicadores mensais por colaborador, marca ou consolidado.",
                    ".xlsx,.xls,.csv"
                  )}
                </div>

                <div class="crm-import-guide">
                  <strong>Duas formas de alimentar o CRM</strong>

                  <span>
                    A importação mantém a velocidade para grandes volumes.
                    O lançamento manual permite incluir, corrigir, editar
                    ou excluir um colaborador individualmente.
                  </span>
                </div>
              </article>

              <article class="crm-panel">
                <div class="crm-panel-header">
                  <div>
                    <p class="crm-kicker">LANÇAMENTO INDIVIDUAL</p>
                    <h3>Lançamentos manuais</h3>
                    <span>
                      ${manuais.length} lançamento(s) nesta competência
                    </span>
                  </div>
                </div>

                <div class="crm-table-wrap">
                  <table class="crm-table crm-manual-table">
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Função</th>
                        <th>Marca</th>
                        <th>1º atend.</th>
                        <th>Login</th>
                        <th>Qualidade</th>
                        <th>Atualizado em</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      ${
                        manuais.length
                          ? manuais
                              .map(item => {
                                const login =
                                  Number(item.metaCadastro || 0) > 0
                                    ? (
                                        Number(item.logados || 0) /
                                        Number(item.metaCadastro || 1)
                                      ) * 100
                                    : 0;

                                return `
                                  <tr>
                                    <td>
                                      <strong>${escapar(item.nome)}</strong>
                                    </td>
                                    <td>${escapar(item.funcao)}</td>
                                    <td>
                                      <div class="crm-brand-cell">
                                        ${logoMarcaHTML(item.marca, true)}
                                        <span>${escapar(item.marca)}</span>
                                      </div>
                                    </td>
                                    <td>${escapar(item.primeiroAtendimento || "—")}</td>
                                    <td>
                                      <span class="crm-percent-pill">
                                        ${percentual(login)}
                                      </span>
                                    </td>
                                    <td>
                                      ${percentual(item.qualidade || 0)}
                                    </td>
                                    <td>
                                      ${
                                        item.atualizadoEm
                                          ? new Date(item.atualizadoEm)
                                              .toLocaleString("pt-BR")
                                          : "—"
                                      }
                                    </td>
                                    <td>
                                      <div class="crm-row-actions">
                                        <button
                                          type="button"
                                          class="crm-mini-button"
                                          data-crm-editar-manual="${escapar(item.id)}"
                                        >
                                          Editar
                                        </button>

                                        <button
                                          type="button"
                                          class="crm-mini-button danger"
                                          data-crm-excluir-manual="${escapar(item.id)}"
                                        >
                                          Excluir
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                `;
                              })
                              .join("")
                          : `
                            <tr>
                              <td colspan="8">
                                <div class="crm-empty-state">
                                  Nenhum lançamento manual nesta competência.
                                </div>
                              </td>
                            </tr>
                          `
                      }
                    </tbody>
                  </table>
                </div>
              </article>

              <article class="crm-panel">
                <div class="crm-panel-header">
                  <div>
                    <p class="crm-kicker">RASTREABILIDADE</p>
                    <h3>Histórico de cargas</h3>

                    <span>
                      ${historico.length}
                      arquivo(s) na competência
                    </span>
                  </div>
                </div>

                <div class="crm-table-wrap">
                  <table class="crm-table">
                    <thead>
                      <tr>
                        <th>Origem</th>
                        <th>Arquivo</th>
                        <th>Aba</th>
                        <th>Linhas</th>
                        <th>Data/Hora</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      ${
                        historico.length
                          ? historico
                              .map(
                                item => `
                                  <tr>
                                    <td>${escapar(item.tipo)}</td>
                                    <td>${escapar(item.arquivo)}</td>
                                    <td>${escapar(item.aba || "—")}</td>
                                    <td>${item.linhas}</td>
                                    <td>
                                      ${new Date(item.dataHora).toLocaleString("pt-BR")}
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        class="crm-mini-button danger"
                                        data-crm-excluir-carga="${escapar(item.id || "")}"
                                        ${
                                          item.id
                                            ? ""
                                            : "disabled"
                                        }
                                      >
                                        Excluir carga
                                      </button>
                                    </td>
                                  </tr>
                                `
                              )
                              .join("")
                          : `
                            <tr>
                              <td colspan="6">
                                <div class="crm-empty-state">
                                  Nenhum arquivo importado nesta competência.
                                </div>
                              </td>
                            </tr>
                          `
                      }
                    </tbody>
                  </table>
                </div>
              </article>
            `;
          }
          function apuracaoHTML() {
            const lista =
              listaCalculadosFiltrada();

            return `
              <article class="crm-panel">
                <div class="crm-panel-header">
                  <div>
                    <p class="crm-kicker">
                      RESULTADO CONSOLIDADO
                    </p>

                    <h3>
                      Apuração detalhada ·
                      ${escapar(estado.competencia)}
                    </h3>

                    <span>
                      Valores de bonificação em R$ por indicador
                    </span>
                  </div>
                </div>

                <div class="crm-table-wrap">
                  <table class="crm-table crm-apuracao-table">
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Nível</th>
                        <th>Marca</th>
                        <th>1º Atend.</th>
                        <th>T. Resposta</th>
                        <th>Login APP</th>
                        <th>Agendamento</th>
                        <th>Faturamento</th>
                        <th>Dynamo Ativo</th>
                        <th>Dynamo Recept.</th>
                        <th>SMD</th>
                        <th>NPS</th>
                        <th>Qualidade</th>
                        <th>Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      ${
                        lista.length
                          ? lista
                              .map(
                                item => `
                                  <tr>
                                    <td>
                                      <strong>
                                        ${escapar(item.nome)}
                                      </strong>

                                      <small class="crm-cell-subtitle">
                                        ${escapar(item.funcao)}
                                      </small>
                                    </td>

                                    <td>${escapar(item.nivel)}</td>
                                    <td>${escapar(item.marca || "—")}</td>

                                    <td>${moeda(item.itens.primeiroAtendimento)}</td>
                                    <td>${moeda(item.itens.tempoResposta)}</td>
                                    <td>${moeda(item.itens.loginApp)}</td>
                                    <td>${moeda(item.itens.agendamento)}</td>
                                    <td>${moeda(item.itens.faturamento)}</td>
                                    <td>${moeda(item.itens.dynamoAtivo)}</td>
                                    <td>${moeda(item.itens.dynamoReceptivo)}</td>
                                    <td>${moeda(item.itens.smd)}</td>
                                    <td>${moeda(item.itens.nps)}</td>
                                    <td>${moeda(item.itens.qualidade)}</td>

                                    <td>
                                      <strong>
                                        ${moeda(item.total)}
                                      </strong>
                                    </td>
                                  </tr>
                                `
                              )
                              .join("")
                          : `
                            <tr>
                              <td colspan="14">
                                <div class="crm-empty-state">
                                  Sem apuração.
                                  Importe os arquivos na área Lançamentos.
                                </div>
                              </td>
                            </tr>
                          `
                      }
                    </tbody>
                  </table>
                </div>
              </article>
            `;
          }

          function politicasHTML() {
            const linhas = [
              {
                nivel: "Assistentes",
                primeiro: "Até 5 min · R$ 50",
                login: "100% R$100 · 80% R$80 · 60% R$70",
                agendamento: "100% R$100 · 90% R$80 · 80% R$70",
                faturamento: "100% R$100 · 90% R$80 · 80% R$70",
                dynamo: "Ativo 40/30/20% · Receptivo 80/70/60%",
                pesquisa: "SMD/NPS por faixa",
                qualidade: "97/90/80%",
                teto: "R$ 900"
              },
              {
                nivel: "Analistas",
                primeiro: "Até 5 min · R$ 100",
                login: "100% R$150 · 80% R$100 · 60% R$90",
                agendamento: "100% R$150 · 90% R$100 · 80% R$90",
                faturamento: "100% R$300 · 90% R$200 · 80% R$150",
                dynamo: "Ativo 40/30/20% · Receptivo 80/70/60%",
                pesquisa: "SMD/NPS por faixa",
                qualidade: "97/90/80%",
                teto: "R$ 2.000"
              },
              {
                nivel: "Supervisão",
                primeiro: "Até 5 min · R$ 200",
                login: "100% R$200 · 80% R$150 · 60% R$100",
                agendamento: "100% R$250 · 90% R$200 · 80% R$150",
                faturamento: "100% R$250 · 90% R$200 · 80% R$150",
                dynamo: "Ativo 40/30/20% · Receptivo 80/70/60%",
                pesquisa: "SMD/NPS por faixa",
                qualidade: "97/90/80%",
                teto: "R$ 3.300"
              }
            ];

            return `
              <article class="crm-panel">
                <div class="crm-panel-header">
                  <div>
                    <p class="crm-kicker">
                      POLÍTICAS
                    </p>

                    <h3>
                      Regras de bonificação por nível
                    </h3>

                    <span>
                      Vigência ${escapar(estado.competencia)}
                    </span>
                  </div>
                </div>

                <div class="crm-table-wrap">
                  <table class="crm-table">
                    <thead>
                      <tr>
                        <th>Nível</th>
                        <th>1º atendimento</th>
                        <th>Login APP</th>
                        <th>Agendamento</th>
                        <th>Faturamento marca</th>
                        <th>Dynamo</th>
                        <th>Pesquisa SMD/NPS</th>
                        <th>Qualidade BLIP</th>
                        <th>Teto</th>
                      </tr>
                    </thead>

                    <tbody>
                      ${linhas
                        .map(
                          item => `
                            <tr>
                              <td>
                                <span class="crm-level-chip">
                                  ${escapar(item.nivel)}
                                </span>
                              </td>

                              <td>${escapar(item.primeiro)}</td>
                              <td>${escapar(item.login)}</td>
                              <td>${escapar(item.agendamento)}</td>
                              <td>${escapar(item.faturamento)}</td>
                              <td>${escapar(item.dynamo)}</td>
                              <td>${escapar(item.pesquisa)}</td>
                              <td>${escapar(item.qualidade)}</td>

                              <td>
                                <strong>
                                  ${escapar(item.teto)}
                                </strong>
                              </td>
                            </tr>
                          `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>

                <div class="crm-policy-note">
                  Meta geral:
                  1º atendimento e tempo de resposta em até 5 minutos.
                  Login, faturamento, agendamento, Dynamo, SMD/NPS e qualidade
                  são avaliados conforme o nível e a marca do colaborador.
                </div>
              </article>
            `;
          }

          function renderizar() {
            recalcular();

            const conteudo =
              $("#crmConteudo");

            if (!conteudo) return;

            if (estado.view === "dashboard") {
              conteudo.innerHTML = dashboardHTML();
            } else if (estado.view === "funcionarios") {
              conteudo.innerHTML = participantesHTML();
            } else if (estado.view === "lancamentos") {
              conteudo.innerHTML = lancamentosHTML();
            } else if (estado.view === "apuracao") {
              conteudo.innerHTML = apuracaoHTML();
            } else {
              conteudo.innerHTML = politicasHTML();
            }

            atualizarMenuCRM();
            conectarEventosConteudo();
          }

          function atualizarMenuCRM() {
            $$(".crm-menu-btn")
              .forEach(botao => {
                botao.classList.toggle(
                  "active",
                  botao.dataset.crmView === estado.view
                );
              });
          }

          function abrirCRM(view = estado.view || "dashboard") {
            const secao = garantirEstruturaCRM();
            if (!secao) return;

            estado.view = view;
            salvarEstado();

            $$(".view").forEach(viewElement => viewElement.classList.remove("active"));
            secao.classList.add("active");

            sincronizarCabecalhoCRM();
            aplicarMarcaNoCabecalhoCRM();
            renderizar();
            reafirmarCabecalhoCRM();
          }

          function sairDoCRM() {
            $("#crmCampanhas")
              ?.classList.remove("active");

            document.body.classList.remove(
              "crm-mode-active"
            );

            const botaoAuditoria =
              $("#produtivosTopbarActions .auditoria-atalho") ||
              $("#btnAuditoriaPRODUTIVOS");

            if (
              botaoAuditoria &&
              botaoAuditoria.dataset.crmVisual === "1"
            ) {
              botaoAuditoria.innerHTML =
                "◉ Auditoria";
              botaoAuditoria.title =
                "Abrir auditoria";
              delete botaoAuditoria.dataset.crmVisual;
            }
          }

          function conectarMenuExistente() {
            $$(".crm-menu-btn")
              .forEach(botao => {
                botao.addEventListener(
                  "click",
                  evento => {
                    evento.preventDefault();
                    evento.stopPropagation();

                    abrirCRM(
                      botao.dataset.crmView ||
                      "dashboard"
                    );
                  }
                );
              });

            const toggleCRM =
              $('[data-module-toggle="crm"]');

            if (toggleCRM) {
              toggleCRM.addEventListener(
                "click",
                () => {
                  window.setTimeout(
                    () => {
                      const grupo =
                        $('[data-module-group="crm"]');

                      if (
                        grupo &&
                        grupo.classList.contains("open")
                      ) {
                        abrirCRM(
                          estado.view ||
                          "dashboard"
                        );
                      }
                    },
                    0
                  );
                }
              );
            }

            /*
             * Quando o usuário abre outro módulo,
             * só escondemos a view do CRM.
             */
            $$(
              '[data-module-toggle]:not([data-module-toggle="crm"])'
            ).forEach(botao => {
              botao.addEventListener(
                "click",
                () => sairDoCRM()
              );
            });

            $$(".nav-btn,.pix-menu-btn,.garantia-menu-btn")
              .forEach(botao => {
                botao.addEventListener(
                  "click",
                  () => sairDoCRM()
                );
              });
          }

          /* -------------------------------------------------------------------
             PARTICIPANTE
             ------------------------------------------------------------------- */

          function abrirModalParticipante(participante = null) {
            const atual =
              participante || {
                id: "",
                nome: "",
                funcao: "Assistente de CRM",
                nivel: "Assistente",
                marca: "Diesel",
                dn: "4700",
                filial: "",
                ativo: true
              };

            const modal =
              document.createElement("div");

            modal.className =
              "crm-modal-overlay";

            modal.innerHTML = `
              <div
                class="crm-modal-backdrop"
                data-crm-fechar-modal
              ></div>

              <form
                class="crm-modal-card"
                id="crmFormParticipante"
              >
                <header class="crm-modal-header">
                  <div>
                    <p class="crm-kicker">
                      CADASTRO CRM
                    </p>

                    <h3>
                      ${
                        participante
                          ? "Editar participante"
                          : "Novo participante"
                      }
                    </h3>
                  </div>

                  <button
                    type="button"
                    class="crm-modal-close"
                    data-crm-fechar-modal
                  >
                    ×
                  </button>
                </header>

                <div class="crm-form-grid">
                  <label class="full">
                    <span>Nome</span>

                    <input
                      name="nome"
                      value="${escapar(atual.nome)}"
                      required
                    />
                  </label>

                  <label>
                    <span>Função</span>

                    <input
                      name="funcao"
                      value="${escapar(atual.funcao)}"
                      required
                    />
                  </label>

                  <label>
                    <span>Nível</span>

                    <select name="nivel">
                      <option
                        ${
                          labelNivel(atual.nivel) === "Assistente"
                            ? "selected"
                            : ""
                        }
                      >
                        Assistente
                      </option>

                      <option
                        ${
                          labelNivel(atual.nivel) === "Analista"
                            ? "selected"
                            : ""
                        }
                      >
                        Analista
                      </option>

                      <option
                        ${
                          labelNivel(atual.nivel) === "Supervisão"
                            ? "selected"
                            : ""
                        }
                      >
                        Supervisão
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>Marca</span>

                    <select name="marca">
                      <option
                        ${atual.marca === "Diesel" ? "selected" : ""}
                      >
                        Diesel
                      </option>

                      <option
                        ${atual.marca === "Fiat" ? "selected" : ""}
                      >
                        Fiat
                      </option>

                      <option
                        ${
                          atual.marca === "Fiat / Diesel"
                            ? "selected"
                            : ""
                        }
                      >
                        Fiat / Diesel
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>DN</span>

                    <input
                      name="dn"
                      value="${escapar(atual.dn || "")}"
                    />
                  </label>

                  <label>
                    <span>Filial</span>

                    <input
                      name="filial"
                      value="${escapar(atual.filial || "")}"
                    />
                  </label>
                </div>

                <footer class="crm-modal-actions">
                  <button
                    type="button"
                    class="crm-secondary-button"
                    data-crm-fechar-modal
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    class="crm-primary-button"
                  >
                    Salvar participante
                  </button>
                </footer>
              </form>
            `;

            document.body.appendChild(modal);

            $$("[data-crm-fechar-modal]", modal)
              .forEach(botao => {
                botao.addEventListener(
                  "click",
                  () => modal.remove()
                );
              });

            $("#crmFormParticipante", modal)
              .addEventListener(
                "submit",
                evento => {
                  evento.preventDefault();

                  const formData =
                    new FormData(evento.currentTarget);

                  const novo = {
                    id:
                      participante?.id ||
                      idUnico(),

                    nome:
                      texto(formData.get("nome")),

                    funcao:
                      texto(formData.get("funcao")),

                    nivel:
                      texto(formData.get("nivel")),

                    marca:
                      texto(formData.get("marca")),

                    dn:
                      texto(formData.get("dn")),

                    filial:
                      texto(formData.get("filial")),

                    ativo:
                      participante?.ativo !== false
                  };

                  const indice =
                    estado.participantes.findIndex(
                      item => item.id === novo.id
                    );

                  const antesParticipante =
                    indice >= 0
                      ? cloneSeguroCRM(
                          estado.participantes[indice]
                        )
                      : null;

                  if (indice >= 0) {
                    estado.participantes[indice] = novo;
                  } else {
                    estado.participantes.push(novo);
                  }

                  registrarAuditoriaCRM({
                    acao:
                      indice >= 0
                        ? "ALTERAÇÃO"
                        : "CRIAÇÃO",
                    entidade: "PARTICIPANTE",
                    colaborador: novo.nome,
                    competencia: estado.competencia,
                    marca: novo.marca,
                    filial: novo.filial,
                    origem: "Base CRM",
                    descricao:
                      indice >= 0
                        ? "Cadastro de participante do CRM alterado."
                        : "Participante incluído na base do CRM.",
                    antes: antesParticipante,
                    depois: novo
                  });

                  salvarEstado();
                  modal.remove();
                  renderizar();

                  mostrarToast(
                    "Participante salvo com sucesso.",
                    "ok"
                  );
                }
              );
          }

          function conectarEventosConteudo() {
            $("#crmNovoParticipante")
              ?.addEventListener(
                "click",
                () => abrirModalParticipante()
              );

            $$("[data-crm-editar]")
              .forEach(botao => {
                botao.addEventListener(
                  "click",
                  () => {
                    const participante =
                      estado.participantes.find(
                        item =>
                          item.id ===
                          botao.dataset.crmEditar
                      );

                    if (participante) {
                      abrirModalParticipante(
                        participante
                      );
                    }
                  }
                );
              });

            $$("[data-crm-toggle]")
              .forEach(botao => {
                botao.addEventListener(
                  "click",
                  () => {
                    const participante =
                      estado.participantes.find(
                        item =>
                          item.id ===
                          botao.dataset.crmToggle
                      );

                    if (!participante) return;

                    const antesStatus =
                      cloneSeguroCRM(participante);

                    participante.ativo =
                      participante.ativo === false;

                    registrarAuditoriaCRM({
                      acao:
                        participante.ativo
                          ? "ATIVAÇÃO"
                          : "INATIVAÇÃO",
                      entidade: "PARTICIPANTE",
                      colaborador:
                        participante.nome,
                      competencia:
                        estado.competencia,
                      marca:
                        participante.marca,
                      filial:
                        participante.filial,
                      origem: "Base CRM",
                      descricao:
                        participante.ativo
                          ? "Participante reativado no CRM."
                          : "Participante inativado no CRM.",
                      antes: antesStatus,
                      depois: participante
                    });

                    salvarEstado();
                    renderizar();
                  }
                );
              });

            $$("[data-crm-importar]")
              .forEach(input => {
                input.addEventListener(
                  "change",
                  async evento => {
                    const arquivo =
                      evento.target.files?.[0];

                    if (!arquivo) return;

                    try {
                      await processarImportacao(
                        evento.target.dataset.crmImportar,
                        arquivo
                      );
                    } catch (erro) {
                      console.error(
                        "[CRM] Erro na importação:",
                        erro
                      );

                      mostrarToast(
                        erro?.message ||
                        "Falha ao importar o arquivo.",
                        "erro"
                      );
                    } finally {
                      evento.target.value = "";
                    }
                  }
                );
              });

            $("#crmNovoLancamentoManual")
              ?.addEventListener(
                "click",
                () => abrirModalLancamentoManual()
              );

            $$("[data-crm-editar-manual]")
              .forEach(botao => {
                botao.addEventListener(
                  "click",
                  () => {
                    const registro =
                      registroManualPorId(
                        botao.dataset.crmEditarManual
                      );

                    if (registro) {
                      abrirModalLancamentoManual(registro);
                    }
                  }
                );
              });

            $$("[data-crm-excluir-manual]")
              .forEach(botao => {
                botao.addEventListener(
                  "click",
                  () =>
                    excluirLancamentoManual(
                      botao.dataset.crmExcluirManual
                    )
                );
              });

            $$("[data-crm-excluir-carga]")
              .forEach(botao => {
                botao.addEventListener(
                  "click",
                  () => {
                    const id =
                      botao.dataset.crmExcluirCarga;

                    if (id) excluirCargaImportada(id);
                  }
                );
              });

          }

          /* -------------------------------------------------------------------
             EXPORTAÇÃO
             ------------------------------------------------------------------- */


          function origemEvidenciaCRM(...registros) {
            const validos =
              registros.filter(Boolean);

            if (!validos.length) return "Sem fonte";

            if (
              validos.some(
                item => item?._origemManualCRM
              )
            ) {
              return "Lançamento manual";
            }

            return "Arquivo importado";
          }

          function evidenciasParticipanteCRM(item) {
            const dados =
              dadosCompetencia();

            const clientes =
              encontrarPorNome(
                dados.clientes,
                item.nome
              );

            const atendimento =
              encontrarPorNome(
                dados.atendimento,
                item.nome
              );

            const satisfacao =
              encontrarPorNome(
                dados.satisfacao,
                item.nome
              );

            const indicadorIndividual =
              encontrarPorNome(
                dados.indicadores,
                item.nome
              );

            const indicadorMarca =
              indicadorIndividual ||
              dados.indicadores.find(registro => {
                if (!registro?.marca) return false;

                const participante =
                  normalizar(item.marca);

                const registroMarca =
                  normalizar(registro.marca);

                return (
                  participante === registroMarca ||
                  participante.includes(registroMarca) ||
                  registroMarca.includes(participante)
                );
              }) ||
              {};

            const marca =
              normalizar(item.marca);

            const temFiat =
              marca.includes("FIAT");

            const temDiesel =
              marca.includes("DIESEL");

            const login =
              Number(clientes?.metaCadastro || 0) > 0
                ? (
                    Number(clientes?.logados || 0) /
                    Number(clientes?.metaCadastro || 1)
                  ) * 100
                : Number(
                    clientes?.percentualLogados || 0
                  );

            const qualidade =
              Number(
                satisfacao?.percentual ??
                indicadorMarca?.qualidade ??
                0
              );

            const origemGeral =
              origemEvidenciaCRM(
                clientes,
                atendimento,
                satisfacao,
                indicadorMarca
              );

            const evidencias = [
              {
                indicador: "1º Atendimento",
                observado:
                  atendimento?.primeiroAtendimento ||
                  "Não informado",
                detalhe:
                  "Meta: até 5 min",
                bonus:
                  Number(
                    item.itens?.primeiroAtendimento ||
                    0
                  ),
                origem:
                  origemEvidenciaCRM(atendimento)
              },

              {
                indicador: "Tempo de resposta",
                observado:
                  atendimento?.tempoResposta ||
                  "Não informado",
                detalhe:
                  "Meta: até 5 min",
                bonus:
                  Number(
                    item.itens?.tempoResposta || 0
                  ),
                origem:
                  origemEvidenciaCRM(atendimento)
              },

              {
                indicador: "Login APP",
                observado:
                  clientes
                    ? `${Number(clientes.logados || 0)} logado(s) / ${Number(clientes.metaCadastro || 0)} meta = ${percentual(login)}`
                    : "Não informado",
                detalhe:
                  "Faixa conforme nível",
                bonus:
                  Number(
                    item.itens?.loginApp || 0
                  ),
                origem:
                  origemEvidenciaCRM(clientes)
              }
            ];

            if (temFiat) {
              evidencias.push(
                {
                  indicador: "Agendamento Fiat",
                  observado:
                    percentual(
                      indicadorMarca?.agendamentoFiat || 0
                    ),
                  detalhe:
                    "Atingimento da meta",
                  bonus:
                    Number(
                      item.itens?.agendamento || 0
                    ),
                  origem:
                    origemEvidenciaCRM(indicadorMarca)
                },
                {
                  indicador: "Faturamento Fiat",
                  observado:
                    percentual(
                      indicadorMarca?.faturamentoFiat || 0
                    ),
                  detalhe:
                    "Atingimento da meta",
                  bonus:
                    Number(
                      item.itens?.faturamento || 0
                    ),
                  origem:
                    origemEvidenciaCRM(indicadorMarca)
                },
                {
                  indicador: "Dynamo Fiat Ativo",
                  observado:
                    percentual(
                      indicadorMarca?.dynamoFiatAtivo || 0
                    ),
                  detalhe:
                    "Conversão ativa",
                  bonus:
                    Number(
                      item.itens?.dynamoAtivo || 0
                    ),
                  origem:
                    origemEvidenciaCRM(indicadorMarca)
                },
                {
                  indicador: "Dynamo Fiat Receptivo",
                  observado:
                    percentual(
                      indicadorMarca?.dynamoFiatReceptivo || 0
                    ),
                  detalhe:
                    "Conversão receptiva",
                  bonus:
                    Number(
                      item.itens?.dynamoReceptivo || 0
                    ),
                  origem:
                    origemEvidenciaCRM(indicadorMarca)
                }
              );
            }

            if (temDiesel) {
              evidencias.push(
                {
                  indicador: "Agendamento Diesel",
                  observado:
                    percentual(
                      indicadorMarca?.agendamentoDiesel || 0
                    ),
                  detalhe:
                    "Atingimento da meta",
                  bonus:
                    Number(
                      item.itens?.agendamento || 0
                    ),
                  origem:
                    origemEvidenciaCRM(indicadorMarca)
                },
                {
                  indicador: "Faturamento Diesel",
                  observado:
                    percentual(
                      indicadorMarca?.faturamentoDiesel || 0
                    ),
                  detalhe:
                    "Atingimento da meta",
                  bonus:
                    Number(
                      item.itens?.faturamento || 0
                    ),
                  origem:
                    origemEvidenciaCRM(indicadorMarca)
                },
                {
                  indicador: "Dynamo Diesel Ativo",
                  observado:
                    percentual(
                      indicadorMarca?.dynamoDieselAtivo || 0
                    ),
                  detalhe:
                    "Conversão ativa",
                  bonus:
                    Number(
                      item.itens?.dynamoAtivo || 0
                    ),
                  origem:
                    origemEvidenciaCRM(indicadorMarca)
                },
                {
                  indicador: "Dynamo Diesel Receptivo",
                  observado:
                    percentual(
                      indicadorMarca?.dynamoDieselReceptivo || 0
                    ),
                  detalhe:
                    "Conversão receptiva",
                  bonus:
                    Number(
                      item.itens?.dynamoReceptivo || 0
                    ),
                  origem:
                    origemEvidenciaCRM(indicadorMarca)
                }
              );
            }

            evidencias.push(
              {
                indicador: "SMD",
                observado:
                  indicadorMarca?.smd !== undefined
                    ? String(indicadorMarca.smd)
                    : "Não informado",
                detalhe:
                  "Resultado conforme faixa",
                bonus:
                  Number(item.itens?.smd || 0),
                origem:
                  origemEvidenciaCRM(indicadorMarca)
              },

              {
                indicador: "NPS",
                observado:
                  indicadorMarca?.nps !== undefined
                    ? String(indicadorMarca.nps)
                    : "Não informado",
                detalhe:
                  "Resultado conforme faixa",
                bonus:
                  Number(item.itens?.nps || 0),
                origem:
                  origemEvidenciaCRM(indicadorMarca)
              },

              {
                indicador: "Qualidade BLIP",
                observado:
                  qualidade
                    ? percentual(qualidade)
                    : "Não informado",
                detalhe:
                  satisfacao?.totalTickets
                    ? `${Number(satisfacao.totalTickets)} ticket(s) avaliados`
                    : "Avaliações 4/5 estrelas",
                bonus:
                  Number(
                    item.itens?.qualidade || 0
                  ),
                origem:
                  origemEvidenciaCRM(
                    satisfacao,
                    indicadorMarca
                  )
              }
            );

            return {
              origemGeral,
              evidencias
            };
          }

          function linhasEvidenciasExportacaoCRM(
            participantes
          ) {
            return participantes.flatMap(item => {
              const pacote =
                evidenciasParticipanteCRM(item);

              return pacote.evidencias.map(
                evidencia => ({
                  Colaborador: item.nome,
                  Função: item.funcao,
                  Marca: item.marca,
                  DN: item.dn,
                  Filial: item.filial,
                  Indicador: evidencia.indicador,
                  Observado: evidencia.observado,
                  Evidência: evidencia.detalhe,
                  Origem: evidencia.origem,
                  "Bônus indicador":
                    evidencia.bonus,
                  "Total habilitado":
                    item.total
                })
              );
            });
          }

          function linhasExportacaoCRM(apenasHabilitados = true) {
            return listaCalculadosFiltrada()
              .filter(item =>
                apenasHabilitados
                  ? Number(item.total || 0) > 0
                  : true
              )
              .sort((a, b) =>
                String(a.nome || "").localeCompare(
                  String(b.nome || ""),
                  "pt-BR"
                )
              );
          }

          async function exportarExcel() {
            try {
              const XLSX = await garantirXLSX();
              const workbook = XLSX.utils.book_new();

              const tipo =
                $("#tipoExportacao")?.value ||
                "habilitados";

              const linhas =
                linhasExportacaoCRM(tipo !== "todos")
                  .map(item => ({
                    Colaborador: item.nome,
                    Função: item.funcao,
                    Marca: item.marca,
                    DN: item.dn,
                    Filial: item.filial,
                    "Valor habilitado": item.total
                  }));

              const sheet =
                XLSX.utils.json_to_sheet(linhas);

              sheet["!cols"] = [
                { wch: 36 },
                { wch: 23 },
                { wch: 18 },
                { wch: 10 },
                { wch: 24 },
                { wch: 18 }
              ];

              XLSX.utils.book_append_sheet(
                workbook,
                sheet,
                "Habilitados CRM"
              );

              const participantesExportados =
                linhasExportacaoCRM(
                  tipo !== "todos"
                );

              const evidencias =
                linhasEvidenciasExportacaoCRM(
                  participantesExportados
                );

              const sheetEvidencias =
                XLSX.utils.json_to_sheet(
                  evidencias
                );

              sheetEvidencias["!cols"] = [
                { wch: 34 },
                { wch: 22 },
                { wch: 18 },
                { wch: 9 },
                { wch: 24 },
                { wch: 24 },
                { wch: 28 },
                { wch: 30 },
                { wch: 20 },
                { wch: 18 },
                { wch: 18 }
              ];

              XLSX.utils.book_append_sheet(
                workbook,
                sheetEvidencias,
                "Evidências CRM"
              );

              XLSX.writeFile(
                workbook,
                `crm-${tipo}-${estado.competencia}.xlsx`
              );
            } catch (erro) {
              mostrarToast(
                erro?.message ||
                "Falha ao exportar Excel.",
                "erro"
              );
            }
          }

          function exportarPDF() {
            const habilitados =
              linhasExportacaoCRM(true);

            if (!habilitados.length) {
              mostrarToast(
                "Não existem participantes habilitados para imprimir nesta competência.",
                "info"
              );
              return;
            }

            const total =
              habilitados.reduce(
                (soma, item) =>
                  soma + Number(item.total || 0),
                0
              );

            if (
              window.jspdf?.jsPDF &&
              typeof window.jspdf.jsPDF === "function"
            ) {
              const { jsPDF } = window.jspdf;

              const doc =
                new jsPDF({
                  orientation: "landscape",
                  unit: "mm",
                  format: "a4"
                });

              const azul = [11, 61, 96];
              const verde = [10, 140, 91];
              const cinza = [102, 123, 136];
              const dourado = [195, 145, 0];
              const claro = [245, 249, 250];

              const desenharCabecalho = (
                titulo,
                subtitulo
              ) => {
                doc.setFillColor(...azul);
                doc.rect(0, 0, 297, 28, "F");

                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(16);

                doc.text(
                  titulo,
                  14,
                  12
                );

                doc.setFont(
                  "helvetica",
                  "normal"
                );

                doc.setFontSize(8.7);

                doc.text(
                  subtitulo,
                  14,
                  19
                );
              };

              const desenharRodape = () => {
                const pagina =
                  doc.internal
                    .getCurrentPageInfo()
                    .pageNumber;

                doc.setTextColor(...cinza);
                doc.setFontSize(7.2);

                doc.text(
                  `Sistema de Campanhas Pós-Vendas • CRM • Competência ${estado.competencia} • Página ${pagina}`,
                  14,
                  202
                );
              };

              /*
               * PÁGINA 1 — RESUMO PARA PAGAMENTO
               */
              desenharCabecalho(
                "CAMPANHA DO CRM — HABILITADOS",
                `Competência: ${estado.competencia}  •  ${habilitados.length} participante(s) habilitado(s)`
              );

              doc.setFont(
                "helvetica",
                "bold"
              );

              doc.setFontSize(11);

              doc.text(
                `TOTAL: ${moeda(total)}`,
                282,
                17,
                { align: "right" }
              );

              const corpoResumo =
                habilitados.map(item => [
                  item.nome || "—",
                  item.funcao || "—",
                  item.marca || "—",
                  item.dn || "—",
                  item.filial || "—",
                  moeda(item.total)
                ]);

              if (
                typeof doc.autoTable ===
                "function"
              ) {
                doc.autoTable({
                  startY: 34,

                  head: [[
                    "COLABORADOR",
                    "FUNÇÃO",
                    "MARCA",
                    "DN",
                    "FILIAL",
                    "VALOR"
                  ]],

                  body:
                    corpoResumo,

                  theme: "grid",

                  margin: {
                    left: 12,
                    right: 12,
                    bottom: 12
                  },

                  styles: {
                    font: "helvetica",
                    fontSize: 8.2,
                    cellPadding: 3.2,
                    lineColor:
                      [216, 227, 233],
                    lineWidth: .18,
                    textColor:
                      [25, 52, 70],
                    valign: "middle"
                  },

                  headStyles: {
                    fillColor: azul,
                    textColor:
                      [255, 255, 255],
                    fontStyle: "bold",
                    fontSize: 8
                  },

                  alternateRowStyles: {
                    fillColor:
                      [247, 250, 251]
                  },

                  columnStyles: {
                    0: {
                      cellWidth: 72
                    },

                    1: {
                      cellWidth: 48
                    },

                    2: {
                      cellWidth: 34
                    },

                    3: {
                      cellWidth: 18,
                      halign: "center"
                    },

                    4: {
                      cellWidth: 56
                    },

                    5: {
                      cellWidth: 34,
                      halign: "right",
                      fontStyle: "bold",
                      textColor: verde
                    }
                  },

                  didDrawPage: () => {
                    desenharRodape();
                  }
                });

                /*
                 * PÁGINAS SEGUINTES — EVIDÊNCIAS
                 *
                 * Um bloco por colaborador para deixar transparente
                 * de onde saiu cada valor da habilitação.
                 */
                habilitados.forEach(
                  (item, indice) => {
                    doc.addPage(
                      "a4",
                      "landscape"
                    );

                    const pacote =
                      evidenciasParticipanteCRM(
                        item
                      );

                    desenharCabecalho(
                      `EVIDÊNCIAS — ${String(item.nome || "").toUpperCase()}`,
                      `${item.funcao || "—"} • ${item.marca || "—"} • DN ${item.dn || "—"} • ${item.filial || "—"}`
                    );

                    /*
                     * Cards de síntese
                     */
                    doc.setFillColor(
                      ...claro
                    );

                    doc.roundedRect(
                      14,
                      34,
                      84,
                      21,
                      3,
                      3,
                      "F"
                    );

                    doc.roundedRect(
                      106,
                      34,
                      84,
                      21,
                      3,
                      3,
                      "F"
                    );

                    doc.roundedRect(
                      198,
                      34,
                      84,
                      21,
                      3,
                      3,
                      "F"
                    );

                    doc.setTextColor(
                      ...cinza
                    );

                    doc.setFontSize(7.4);

                    doc.text(
                      "VALOR HABILITADO",
                      18,
                      41
                    );

                    doc.text(
                      "TETO DO CARGO",
                      110,
                      41
                    );

                    doc.text(
                      "ORIGEM DOS DADOS",
                      202,
                      41
                    );

                    doc.setFont(
                      "helvetica",
                      "bold"
                    );

                    doc.setFontSize(13);

                    doc.setTextColor(
                      ...verde
                    );

                    doc.text(
                      moeda(item.total),
                      18,
                      50
                    );

                    doc.setTextColor(
                      ...dourado
                    );

                    doc.text(
                      moeda(item.teto),
                      110,
                      50
                    );

                    doc.setTextColor(
                      ...azul
                    );

                    doc.setFontSize(9.5);

                    doc.text(
                      pacote.origemGeral,
                      202,
                      49
                    );

                    const linhas =
                      pacote.evidencias.map(
                        evidencia => [
                          evidencia.indicador,
                          evidencia.observado,
                          evidencia.detalhe,
                          evidencia.origem,
                          moeda(
                            evidencia.bonus
                          )
                        ]
                      );

                    doc.autoTable({
                      startY: 62,

                      head: [[
                        "INDICADOR",
                        "RESULTADO / EVIDÊNCIA",
                        "REGRA / REFERÊNCIA",
                        "ORIGEM",
                        "BÔNUS"
                      ]],

                      body: linhas,

                      theme: "grid",

                      margin: {
                        left: 14,
                        right: 14,
                        bottom: 14
                      },

                      styles: {
                        font: "helvetica",
                        fontSize: 8.1,
                        cellPadding: 3.2,
                        lineColor:
                          [218, 228, 233],
                        lineWidth: .17,
                        textColor:
                          [28, 53, 69],
                        valign: "middle"
                      },

                      headStyles: {
                        fillColor:
                          [21, 72, 102],
                        textColor:
                          [255, 255, 255],
                        fontStyle:
                          "bold"
                      },

                      alternateRowStyles: {
                        fillColor:
                          [248, 251, 252]
                      },

                      columnStyles: {
                        0: {
                          cellWidth: 47,
                          fontStyle:
                            "bold"
                        },

                        1: {
                          cellWidth: 75
                        },

                        2: {
                          cellWidth: 63
                        },

                        3: {
                          cellWidth: 50
                        },

                        4: {
                          cellWidth: 32,
                          halign: "right",
                          fontStyle:
                            "bold",
                          textColor: verde
                        }
                      },

                      didDrawPage: () => {
                        desenharRodape();
                      }
                    });

                    /*
                     * Total conferido no fim do bloco
                     */
                    const fimTabela =
                      doc.lastAutoTable
                        ?.finalY || 170;

                    if (fimTabela < 188) {
                      doc.setFont(
                        "helvetica",
                        "bold"
                      );

                      doc.setFontSize(9);

                      doc.setTextColor(
                        ...azul
                      );

                      doc.text(
                        `Soma das bonificações considerada no sistema: ${moeda(item.bruto)}  •  Total após teto: ${moeda(item.total)}`,
                        14,
                        Math.min(
                          fimTabela + 9,
                          193
                        )
                      );
                    }
                  }
                );
              }

              doc.save(
                `crm-habilitados-evidencias-${estado.competencia}.pdf`
              );

              return;
            }

            /*
             * Fallback isolado — também com evidências.
             */
            const popup =
              window.open(
                "",
                "_blank",
                "width=1200,height=800"
              );

            if (!popup) {
              mostrarToast(
                "O navegador bloqueou a janela de impressão.",
                "erro"
              );
              return;
            }

            const blocos =
              habilitados.map(item => {
                const pacote =
                  evidenciasParticipanteCRM(
                    item
                  );

                return `
                  <section class="evidence">
                    <header>
                      <div>
                        <h2>${escapar(item.nome)}</h2>
                        <p>
                          ${escapar(item.funcao)} ·
                          ${escapar(item.marca)} ·
                          DN ${escapar(item.dn)} ·
                          ${escapar(item.filial)}
                        </p>
                      </div>

                      <strong>
                        ${moeda(item.total)}
                      </strong>
                    </header>

                    <table>
                      <thead>
                        <tr>
                          <th>Indicador</th>
                          <th>Resultado / Evidência</th>
                          <th>Regra</th>
                          <th>Origem</th>
                          <th>Bônus</th>
                        </tr>
                      </thead>

                      <tbody>
                        ${pacote.evidencias
                          .map(evidencia => `
                            <tr>
                              <td>${escapar(evidencia.indicador)}</td>
                              <td>${escapar(evidencia.observado)}</td>
                              <td>${escapar(evidencia.detalhe)}</td>
                              <td>${escapar(evidencia.origem)}</td>
                              <td>${moeda(evidencia.bonus)}</td>
                            </tr>
                          `)
                          .join("")}
                      </tbody>
                    </table>
                  </section>
                `;
              }).join("");

            popup.document.write(`
              <!doctype html>
              <html lang="pt-BR">
              <head>
                <meta charset="utf-8">

                <title>
                  CRM Habilitados + Evidências
                  ${escapar(estado.competencia)}
                </title>

                <style>
                  *{box-sizing:border-box}
                  body{
                    font-family:Arial,sans-serif;
                    margin:0;
                    color:#17364b;
                    background:#fff
                  }
                  .hero{
                    padding:24px 34px;
                    color:#fff;
                    background:#0b3d60
                  }
                  .hero h1{
                    margin:0 0 7px;
                    font-size:24px
                  }
                  .hero p{margin:0}
                  main{padding:24px 34px}
                  table{
                    width:100%;
                    border-collapse:collapse
                  }
                  th{
                    padding:9px;
                    text-align:left;
                    color:#fff;
                    background:#0b3d60
                  }
                  td{
                    padding:9px;
                    border:1px solid #d9e4e9
                  }
                  .summary td:last-child,
                  .evidence td:last-child{
                    text-align:right;
                    font-weight:700;
                    color:#078558
                  }
                  .evidence{
                    page-break-before:always;
                    padding-top:12px
                  }
                  .evidence header{
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:20px;
                    margin-bottom:15px
                  }
                  .evidence h2{
                    margin:0 0 4px;
                    font-size:19px
                  }
                  .evidence p{
                    margin:0;
                    color:#607984
                  }
                  .evidence header strong{
                    font-size:20px;
                    color:#078558
                  }
                </style>
              </head>

              <body>
                <div class="hero">
                  <h1>
                    Campanha do CRM — Habilitados
                  </h1>

                  <p>
                    Competência
                    ${escapar(estado.competencia)}
                    · ${habilitados.length}
                    participante(s)
                    · Total ${moeda(total)}
                  </p>
                </div>

                <main>
                  <table class="summary">
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Função</th>
                        <th>Marca</th>
                        <th>DN</th>
                        <th>Filial</th>
                        <th>Valor</th>
                      </tr>
                    </thead>

                    <tbody>
                      ${habilitados.map(item => `
                        <tr>
                          <td>${escapar(item.nome)}</td>
                          <td>${escapar(item.funcao)}</td>
                          <td>${escapar(item.marca)}</td>
                          <td>${escapar(item.dn)}</td>
                          <td>${escapar(item.filial)}</td>
                          <td>${moeda(item.total)}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>

                  ${blocos}
                </main>

                <script>
                  window.onload = () => window.print();
                <\/script>
              </body>
              </html>
            `);

            popup.document.close();
          }
          /* -------------------------------------------------------------------
             EVENTOS GLOBAIS DO CRM
             ------------------------------------------------------------------- */

          function conectarToolbar() {
            conectarCabecalhoGlobalCRM();
          }

          function mostrarToast(mensagem, tipo = "ok") {
            let toast =
              $("#crmToast");

            if (!toast) {
              toast =
                document.createElement("div");

              toast.id =
                "crmToast";

              document.body.appendChild(toast);
            }

            toast.className =
              `crm-toast ${tipo} show`;

            toast.textContent =
              mensagem;

            window.clearTimeout(
              toast.__timer
            );

            toast.__timer =
              window.setTimeout(
                () =>
                  toast.classList.remove("show"),
                2800
              );
          }

          function iniciar() {
            const secao =
              garantirEstruturaCRM();

            if (!secao) {
              console.warn(
                "[CRM] Não foi possível localizar main.main."
              );

              return;
            }

            conectarMenuExistente();
            conectarCabecalhoGlobalCRM();
            recalcular();

            /*
             * Não abre o CRM automaticamente.
             * O sistema continua iniciando exatamente no módulo
             * que já iniciava antes.
             */
            console.info(
              `[CRM] Módulo ${VERSION} carregado sem alterar os módulos existentes.`
            );

            /*
             * A partir desta versão o CRM não depende mais apenas
             * do localStorage. A base/importações/edições passam a
             * ser compartilhadas pelo Firestore em tempo real.
             */
            carregarFirebaseInicialCRM();
          }

          window.CRMModule = {
            version: VERSION,

            abrir(view = "dashboard") {
              abrirCRM(view);
            },

            renderizar,

            getEstado() {
              return clone(estado);
            },

            getCompetencia() {
              return estado.competencia;
            },

            resetarCRM() {
              const autorizado =
                window.confirm(
                  "Deseja limpar somente o cache local deste navegador? Os dados compartilhados no Firebase serão mantidos."
                );

              if (!autorizado) return;

              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(IMPORT_KEY);

              estado =
                clone(ESTADO_PADRAO);

              garantirEstruturaCRM();
              conectarToolbar();
              renderizar();

              mostrarToast(
                "Dados locais do CRM removidos.",
                "ok"
              );
            }
          };

          if (document.readyState === "loading") {
            document.addEventListener(
              "DOMContentLoaded",
              iniciar,
              {
                once: true
              }
            );
          } else {
            iniciar();
          }
        })();