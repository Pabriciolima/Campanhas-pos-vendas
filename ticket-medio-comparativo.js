import { supabase } from "./supabase-config.js";

/* Comparativo de Ticket Médio — Pix do Presidente | 2026.09.25 */
const ROOT="ticketMedioComparativoPix",STYLE=ROOT+"Style";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const num=v=>{if(typeof v==="number")return Number.isFinite(v)?v:0;let s=String(v??"").trim();if(!s)return 0;s=s.includes(",")?s.replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,""):s.replace(/[^0-9.-]/g,"");const n=Number(s);return Number.isFinite(n)?n:0};
const money=v=>num(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
let rows=[],months=[];

function activeCompetence(){return String($("#competenciaGlobal")?.value||$("#pixDashboardCompetencia")?.value||new Date().toISOString().slice(0,7)).trim()}
function sixMonths(c){const [y,m]=c.split("-").map(Number),d=new Date(y,m-1,1);return Array.from({length:6},(_,i)=>{const x=new Date(d.getFullYear(),d.getMonth()-5+i,1);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")})}
function monthLabel(c){const [y,m]=c.split("-").map(Number);return new Intl.DateTimeFormat("pt-BR",{month:"short",year:"2-digit"}).format(new Date(y,m-1,1)).replace(".","")}
function dashboard(){return $("#pix-dashboard")||$('[data-pix-view-content="dashboard"]')||$(".pix-dashboard")}
function avg(list){const a=list.filter(x=>x.ticket>0);return a.length?a.reduce((s,x)=>s+x.ticket,0)/a.length:0}

function css(){
 if($("#"+STYLE))return;
 const e=document.createElement("style");e.id=STYLE;e.textContent=`
 #${ROOT}{margin-top:18px} #${ROOT} .tm-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
 #${ROOT} .tm-head h2{margin:2px 0 4px} #${ROOT} .tm-head p{margin:0;color:var(--muted,#718390);font-size:12px}
 #${ROOT} .tm-filter{display:grid;gap:5px;min-width:250px} #${ROOT} .tm-filter span{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
 #${ROOT} select{min-height:40px;padding:0 12px;border:1px solid var(--line,#dce6ec);border-radius:10px;background:var(--surface,#fff);color:inherit;font:inherit}
 #${ROOT} .tm-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}
 #${ROOT} .tm-kpi{padding:14px;border:1px solid var(--line,#dce6ec);border-radius:14px;background:rgba(127,127,127,.04)}
 #${ROOT} .tm-kpi span{display:block;color:var(--muted,#718390);font-size:10px;font-weight:800;text-transform:uppercase}
 #${ROOT} .tm-kpi strong{display:block;margin-top:6px;font-size:19px} #${ROOT} .tm-kpi small{color:var(--muted,#718390)}
 #${ROOT} .tm-chart{padding:16px 12px 6px;border:1px solid var(--line,#dce6ec);border-radius:16px;overflow-x:auto}
 #${ROOT} svg{display:block;width:100%;min-width:620px;height:260px} #${ROOT} .grid{stroke:currentColor;opacity:.1}
 #${ROOT} .line{fill:none;stroke:#12a985;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
 #${ROOT} .area{fill:#12a985;opacity:.08} #${ROOT} .dot{fill:#12a985;stroke:var(--surface,#fff);stroke-width:3}
 #${ROOT} .lab{fill:currentColor;font-size:10px;opacity:.7} #${ROOT} .val{fill:currentColor;font-size:10px;font-weight:800}
 #${ROOT} .tm-rank{margin-top:16px} #${ROOT} .tm-rank h3{margin:0 0 10px;font-size:14px}
 #${ROOT} table{width:100%;border-collapse:collapse;font-size:11px} #${ROOT} th,#${ROOT} td{padding:9px 10px;border-bottom:1px solid var(--line,#dce6ec);text-align:left}
 #${ROOT} th{font-size:9px;text-transform:uppercase;color:var(--muted,#718390)} #${ROOT} .empty{padding:32px;text-align:center;color:var(--muted,#718390)}
 @media(max-width:820px){#${ROOT} .tm-kpis{grid-template-columns:1fr 1fr}#${ROOT} .tm-filter{width:100%;min-width:0}}
 `;document.head.appendChild(e)
}

function ui(){
 const d=dashboard();if(!d)return null;let r=$("#"+ROOT);if(r)return r;
 r=document.createElement("article");r.id=ROOT;r.className="panel";r.innerHTML=`
 <div class="tm-head"><div><p class="eyebrow">ANÁLISE · ÚLTIMOS 6 MESES</p><h2>Comparativo de Ticket Médio</h2>
 <p>Histórico do ticket médio informado nos lançamentos do Pix do Presidente.</p></div>
 <label class="tm-filter"><span>Filial</span><select id="ticketMedioFiltroFilial"><option value="">Comparativo geral</option></select></label></div>
 <div id="ticketMedioConteudo" class="empty">Carregando histórico…</div>`;
 d.appendChild(r);$("#ticketMedioFiltroFilial")?.addEventListener("change",render);return r
}

function series(branch){return months.map(c=>{const list=rows.filter(x=>x.competencia===c&&(!branch||x.filial===branch));return{c,v:avg(list),n:list.length}})}
function chart(s){
 const W=900,H=250,L=62,R=25,T=30,B=38,max=Math.max(...s.map(x=>x.v),1),top=max*1.15;
 const x=i=>L+i*((W-L-R)/Math.max(s.length-1,1)),y=v=>T+(top-v)/top*(H-T-B);
 const pts=s.map((d,i)=>x(i)+","+y(d.v)).join(" "),area=L+","+(H-B)+" "+pts+" "+x(s.length-1)+","+(H-B);
 const grid=[0,.25,.5,.75,1].map(p=>{const yy=T+p*(H-T-B),v=top*(1-p);return`<line class="grid" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="lab" x="2" y="${yy+4}">${esc(money(v).replace(",00",""))}</text>`}).join("");
 const dots=s.map((d,i)=>`<circle class="dot" cx="${x(i)}" cy="${y(d.v)}" r="5"><title>${esc(monthLabel(d.c))}: ${esc(money(d.v))}</title></circle><text class="val" text-anchor="middle" x="${x(i)}" y="${Math.max(14,y(d.v)-11)}">${d.v?esc(money(d.v).replace(",00","")):"—"}</text><text class="lab" text-anchor="middle" x="${x(i)}" y="${H-10}">${esc(monthLabel(d.c))}</text>`).join("");
 return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ticket médio nos últimos seis meses">${grid}<polygon class="area" points="${area}"/><polyline class="line" points="${pts}"/>${dots}</svg>`
}

function fillBranches(){
 const s=$("#ticketMedioFiltroFilial");if(!s)return;const old=s.value,bs=[...new Set(rows.map(x=>x.filial))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
 s.innerHTML='<option value="">Comparativo geral</option>'+bs.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join("");if(bs.includes(old))s.value=old
}

function render(){
 const box=$("#ticketMedioConteudo"),branch=$("#ticketMedioFiltroFilial")?.value||"";if(!box)return;
 const s=series(branch),valid=s.filter(x=>x.v>0);if(!valid.length){box.innerHTML='<div class="empty">Sem ticket médio informado para este filtro nos últimos 6 meses.</div>';return}
 const current=s.at(-1)?.v||0,previous=s.at(-2)?.v||0,mean=valid.reduce((a,b)=>a+b.v,0)/valid.length,best=valid.reduce((a,b)=>b.v>a.v?b:a),variation=previous>0?(current-previous)/previous*100:null,last=months.at(-1);
 const ranking=[...new Set(rows.map(x=>x.filial))].map(f=>({f,v:avg(rows.filter(x=>x.competencia===last&&x.filial===f))})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
 box.innerHTML=`<div class="tm-kpis">
 <div class="tm-kpi"><span>Ticket atual</span><strong>${money(current)}</strong><small>${esc(monthLabel(last))}</small></div>
 <div class="tm-kpi"><span>Média 6 meses</span><strong>${money(mean)}</strong><small>${branch?esc(branch):"Todas as filiais"}</small></div>
 <div class="tm-kpi"><span>Variação mensal</span><strong>${variation===null?"—":(variation>=0?"+":"")+variation.toFixed(1).replace(".",",")+"%"}</strong><small>vs. mês anterior</small></div>
 <div class="tm-kpi"><span>Melhor mês</span><strong>${money(best.v)}</strong><small>${esc(monthLabel(best.c))}</small></div></div>
 <div class="tm-chart">${chart(s)}</div>
 ${branch?"":`<div class="tm-rank"><h3>Comparativo geral por filial · ${esc(monthLabel(last))}</h3><div class="table-wrap"><table><thead><tr><th>Filial</th><th>Ticket médio</th><th>Vs. geral</th></tr></thead><tbody>${ranking.map(i=>{const d=current>0?(i.v-current)/current*100:0;return`<tr><td><strong>${esc(i.f)}</strong></td><td>${money(i.v)}</td><td>${d>=0?"+":""}${d.toFixed(1).replace(".",",")}%</td></tr>`}).join("")}</tbody></table></div></div>`}`
}

async function load(){
 if(!ui())return;months=sixMonths(activeCompetence());const{data,error}=await supabase.from("pix_lancamentos").select("competencia,filial,dados").gte("competencia",months[0]).lte("competencia",months.at(-1));
 if(error){console.error("[TICKET MÉDIO]",error);$("#ticketMedioConteudo").innerHTML='<div class="empty">Não foi possível carregar o comparativo.</div>';return}
 rows=(data||[]).map(r=>{const d=r.dados||{};return{competencia:String(r.competencia||d.competencia||""),filial:String(r.filial||d.filial||"").trim(),ticket:num(d.ticketMedio)}}).filter(x=>x.competencia&&x.filial&&x.ticket>0);
 fillBranches();render()
}

function start(){css();const go=()=>{if(dashboard())load()};go();document.addEventListener("click",e=>{if(e.target.closest('[data-pix-view="dashboard"]'))setTimeout(go,150)});$("#competenciaGlobal")?.addEventListener("change",()=>$("#"+ROOT)&&load());new MutationObserver(()=>{if(dashboard()&&!$("#"+ROOT))go()}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
