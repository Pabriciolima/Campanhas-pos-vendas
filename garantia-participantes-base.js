// Cadastro solicitado pelo responsável, extraído exclusivamente da aba BONIFICAÇÃO DA EQUIPE.
// Apenas nomes, perfis e vínculos; não inclui remuneração, índices, férias ou datas de experiência.
import {filial,normalizar,chavePessoa,vazio,mesEstado} from './garantia-dados.js?v=20261022-cadastro';
export const VERSAO_BASE='bonificacao-setembro-2026-v1';
export const PARTICIPANTES_REFERENCIA=[
  {
    "nome": "Roberty Loran da Silva Castro",
    "perfil": "localAssist",
    "filial": "Belém",
    "unidades": [
      "Belém"
    ],
    "cargoPlanilha": "Assistente de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!4"
  },
  {
    "nome": "Alex de Queiroz Andrade",
    "perfil": "localAux",
    "filial": "Belém",
    "unidades": [
      "Belém"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!5"
  },
  {
    "nome": "Lara Bruna Rocha Miranda",
    "perfil": "localAssist",
    "filial": "Macapá",
    "unidades": [
      "Macapá"
    ],
    "cargoPlanilha": "Assistente de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!6"
  },
  {
    "nome": "Saullo Henrique Mendes de Oliveira",
    "perfil": "localAux",
    "filial": "São Luís",
    "unidades": [
      "São Luís"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!7"
  },
  {
    "nome": "Giulliane Lennon de Moraes Silva",
    "perfil": "localAux",
    "filial": "São Luis",
    "unidades": [
      "São Luis"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!8"
  },
  {
    "nome": "Antonio Rivaldo de Oliveira Alves",
    "perfil": "admPv",
    "filial": "Bacabal",
    "unidades": [
      "Bacabal"
    ],
    "cargoPlanilha": "Assistente Adm. PV",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!9"
  },
  {
    "nome": "Maria Eduarda",
    "perfil": "localAssist",
    "filial": "Teresina",
    "unidades": [
      "Teresina"
    ],
    "cargoPlanilha": "Assistente de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!10"
  },
  {
    "nome": "Francisca Dayane",
    "perfil": "localAux",
    "filial": "Teresina",
    "unidades": [
      "Teresina"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!11"
  },
  {
    "nome": "Thaís Ribeiro Araújo Lima",
    "perfil": "localAssist",
    "filial": "Uruçuí",
    "unidades": [
      "Uruçuí"
    ],
    "cargoPlanilha": "Assistente de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!12"
  },
  {
    "nome": "Juciney Domingos de Amorim Junior",
    "perfil": "localAssist",
    "filial": "Cuiabá",
    "unidades": [
      "Cuiabá"
    ],
    "cargoPlanilha": "Assistente de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!13"
  },
  {
    "nome": "Eduarda Lima Peixoto",
    "perfil": "localAux",
    "filial": "Cuiabá",
    "unidades": [
      "Cuiabá"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!14"
  },
  {
    "nome": "Edilaine Rosa Jovio",
    "perfil": "localAux",
    "filial": "Cuiabá",
    "unidades": [
      "Cuiabá"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!15"
  },
  {
    "nome": "João Pedro Barros Silva",
    "perfil": "localAssist",
    "filial": "Rondonópolis",
    "unidades": [
      "Rondonópolis"
    ],
    "cargoPlanilha": "Assistente de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!16"
  },
  {
    "nome": "Fellype Gabriel da Silva Toro",
    "perfil": "localAux",
    "filial": "Rondonópolis",
    "unidades": [
      "Rondonópolis"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!17"
  },
  {
    "nome": "Stefânia Hirle Galvão",
    "perfil": "localAux",
    "filial": "Água Boa",
    "unidades": [
      "Água Boa"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!18"
  },
  {
    "nome": "Rafaeli Cristina Andrede Alves",
    "perfil": "localAssist",
    "filial": "Sinop",
    "unidades": [
      "Sinop"
    ],
    "cargoPlanilha": "Assistente de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!19"
  },
  {
    "nome": "Kethelen Radija Freitas de Morais",
    "perfil": "localAux",
    "filial": "Sinop",
    "unidades": [
      "Sinop"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!20"
  },
  {
    "nome": "Joel Lucas da Silva Rolim",
    "perfil": "localAssist",
    "filial": "Porto Velho",
    "unidades": [
      "Porto Velho"
    ],
    "cargoPlanilha": "Assistente de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!21"
  },
  {
    "nome": "Douglas Maklaud Rocha Felix",
    "perfil": "localAux",
    "filial": "Porto Velho",
    "unidades": [
      "Porto Velho"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!22"
  },
  {
    "nome": "Jéssica Pereira Ribeiro",
    "perfil": "localAux",
    "filial": "Ji Paraná",
    "unidades": [
      "Ji Paraná"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!23"
  },
  {
    "nome": "Kalinka Raduns Pchebichewski",
    "perfil": "localAssist",
    "filial": "Vilhena",
    "unidades": [
      "Vilhena"
    ],
    "cargoPlanilha": "Assistente de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!24"
  },
  {
    "nome": "Gabriel de Lima Gomes",
    "perfil": "localAux",
    "filial": "Vilhena",
    "unidades": [
      "Vilhena"
    ],
    "cargoPlanilha": "Auxiliar de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!25"
  },
  {
    "nome": "Renata Shara",
    "perfil": "assistente",
    "filial": "GERAL",
    "unidades": [],
    "cargoPlanilha": "Assistente Administrativo de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!29"
  },
  {
    "nome": "Rômulo Alves",
    "perfil": "assistente",
    "filial": "GERAL",
    "unidades": [],
    "cargoPlanilha": "Assistente Administrativo de Garantia",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!30"
  },
  {
    "nome": "Nayara Oliveira",
    "perfil": "analista",
    "filial": "CENTRAL",
    "unidades": [
      "Teresina",
      "São Luis"
    ],
    "cargoPlanilha": "Analista de Garantia (Central)",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!34"
  },
  {
    "nome": "Marcos Santos",
    "perfil": "analista",
    "filial": "CENTRAL",
    "unidades": [
      "Sinop",
      "Água Boa",
      "Vilhena"
    ],
    "cargoPlanilha": "Analista de Garantia (Central)",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!35"
  },
  {
    "nome": "Edilene Silva",
    "perfil": "analista",
    "filial": "CENTRAL",
    "unidades": [
      "Belém",
      "Porto Velho"
    ],
    "cargoPlanilha": "Analista de Garantia (Central)",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!36"
  },
  {
    "nome": "Raimundo Rabelo dos Reis Junior",
    "perfil": "analista",
    "filial": "CENTRAL",
    "unidades": [
      "Uruçuí",
      "Cuiabá",
      "Macapá"
    ],
    "cargoPlanilha": "Analista de Garantia (Central)",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!37"
  },
  {
    "nome": "Gabriela Alves",
    "perfil": "analista",
    "filial": "CENTRAL",
    "unidades": [
      "Bacabal",
      "Rondonópolis",
      "Ji Paraná"
    ],
    "cargoPlanilha": "Analista de Garantia (Central)",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!38"
  },
  {
    "nome": "Daisy Cristhinne Pinto da Graça Abrão",
    "perfil": "lider",
    "filial": "GERAL",
    "unidades": [],
    "cargoPlanilha": "Gestão da Garantia — cargo específico a confirmar",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!44"
  },
  {
    "nome": "Gilmara Cabral Lima Maciel",
    "perfil": "supervisora",
    "filial": "GERAL",
    "unidades": [],
    "cargoPlanilha": "Gestão da Garantia — cargo específico a confirmar",
    "origemCadastro": "BONIFICAÇÃO DA EQUIPE!45"
  }
];
const nomeComparavel=s=>normalizar(String(s||'').replace(/\s*\([^)]*\)\s*$/,''));
export function preencherParticipantes(estado,competencia){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)||competencia<'2026-09')return {estado,adicionados:0,alterado:false};
 const atual=mesEstado(estado,competencia);
 if(atual.cadastroBaseVersao===VERSAO_BASE)return {estado,adicionados:0,alterado:false};
 const next=structuredClone(estado||vazio()),m=structuredClone(atual);let adicionados=0;
 for(const raw of PARTICIPANTES_REFERENCIA){const p={...raw,filial:filial(raw.filial),unidades:raw.unidades.map(filial)};
  if(!m.participantes.some(existente=>chavePessoa(existente)===chavePessoa(p)||(nomeComparavel(existente.nome)===nomeComparavel(p.nome)&&filial(existente.filial)===p.filial))){m.participantes.push(p);adicionados++;}
 }
 m.cadastroBaseVersao=VERSAO_BASE;next.competencias[competencia]=m;
 next.historico.push({data:new Date().toISOString(),competencia,acao:'Cadastro inicial de participantes da planilha',arquivo:'BONIFICAÇÃO DA EQUIPE — setembro/2026',registros:adicionados});
 return {estado:next,adicionados,alterado:true};
}
