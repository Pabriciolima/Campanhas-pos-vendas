/* Regras confirmadas pelo usuário para a conferência Apollo/Linx.
   Funções puras: nenhuma gravação ou alteração de NPS. */
(function(global){
'use strict';
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const number=v=>{if(typeof v==='number')return v;let s=String(v??'').replace(/[^0-9,.-]/g,'');if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');return Number(s)||0};
const round=v=>Math.round((v+Number.EPSILON)*100)/100;
const role=s=>{const c=clean(s);if(c.includes('ORCAMENTISTA')||c.includes('FACILITADOR'))return 'orcamentista';if(c.includes('SUPERVISOR')&&c.includes('POSVENDAS'))return 'supervisor_pos';if(c.includes('SUPERVISOR')&&(c.includes('ASSISTENCIA')||c.includes('OFICINA')))return 'supervisor_oficina';if(c.includes('SUPERVISOR')&&c.includes('PECAS'))return 'supervisor_pecas';if(c.includes('GERENTE'))return 'gerente';if(c.includes('CONSULTOR')&&c.includes('TECNICO'))return 'oficina';if(c.includes('CONSULTOR')&&c.includes('PECAS'))return 'balcao';return 'desconhecido'};
function match(participants,report){const found=[],unmatched=[],ambiguous=[];for(const p of participants){const candidates=report.filter(r=>clean(r.nome||r.name)===clean(p.colaborador||p.nome));if(candidates.length===1)found.push({participant:p,source:candidates[0]});else if(candidates.length>1)ambiguous.push({participant:p,candidates});else unmatched.push(p)}return {found,unmatched,ambiguous}}
function office(row){const mo=number(row.mo),parts=number(row.parts),goalMo=number(row.goalMo),goalParts=number(row.goalParts);const ticketMo=number(row.ticketMo),ticketParts=number(row.ticketParts);return {realizado:round(mo+parts),meta:round(goalMo+goalParts),ticket:round(ticketMo+ticketParts)}}
function counter(row){return {realizado:number(row.sale),meta:number(row.goal),margem:number(row.margin),rentabilidade:number(row.profit)}}
function group(rows){const sum=(arr,k)=>round(arr.reduce((a,r)=>a+number(r[k]),0));const mean=arr=>arr.length?round(arr.reduce((a,r)=>a+number(r.margem),0)/arr.length):null;const oficina=rows.filter(r=>r.tipo==='oficina'),balcao=rows.filter(r=>r.tipo==='balcao');return {oficina:{meta:sum(oficina,'meta'),realizado:sum(oficina,'realizado'),ticket:sum(oficina,'ticket')},balcao:{meta:sum(balcao,'meta'),realizado:sum(balcao,'realizado'),margem:mean(balcao)},geral:{meta:sum(rows,'meta'),realizado:sum(rows,'realizado'),ticket:sum(oficina,'ticket'),margem:mean(balcao)}}}
function supervisor(tipo,rows){const g=group(rows);if(tipo==='supervisor_oficina'||tipo==='orcamentista')return g.oficina;if(tipo==='supervisor_pecas')return g.balcao;return g.geral}
global.pixApolloRules=Object.freeze({clean,number,round,role,match,office,counter,group,supervisor});
})(window);
