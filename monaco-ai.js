(()=>{"use strict";
const root=document.getElementById("monaco-assistant");if(!root)return;
const panel=root.querySelector(".monaco-ai-panel"),button=root.querySelector(".monaco-ai-launcher"),messages=root.querySelector(".monaco-ai-messages"),form=root.querySelector(".monaco-ai-form"),input=form.querySelector("input");
const topics=[
[["nps","cofrinho"],"O NPS dos cargos elegíveis reserva R$ 250 por semana com 90% ou mais. As semanas 1 a 3 acumulam; na semana 4, o NPS da própria semana precisa atingir 90% para liberar o saldo (até R$ 1.000). O NPS é independente da meta semanal de faturamento."],
[["ticket","margem","faixa"],"O bônus de ticket médio ou margem só é pago quando a meta semanal acumulada é atingida. Para Consultor Técnico, as faixas de ticket R$ 7.300, R$ 7.500, R$ 7.800 e R$ 8.100 correspondem a R$ 600, R$ 700, R$ 800 e R$ 900. Confira a política do cargo para outras faixas."],
[["gordura","deficit","déficit","saldo"],"A gordura de um dia ajuda a compensar os seguintes; o déficit precisa ser recuperado. O saldo segue para os próximos dias e semanas da mesma competência, segundo os lançamentos oficiais."],
[["oficina","mecanico","mecânico","produtividade","eficiencia","eficiência"],"Na Campanha da Oficina, os mecânicos são avaliados por faturamento, horas vendidas, produtividade, eficiência, treinamento e evidências de O.S. Na regra de outubro/2026+, a meta mensal de referência é R$ 69.900, o piso é R$ 48.930, as horas vendidas precisam alcançar 70% das disponíveis, a produtividade 70% e a eficiência 80%. Consulte a política para as faixas."],
[["os aberta","o.s.","penalidade","28%"],"Na semana 4 do Pix, para cargos sujeitos a esse indicador, O.S. em aberto acima de 28% aplica penalidade de 50% sobre o subtotal da semana, conforme a apuração oficial."],
[["dia","diaria","diária","50%","metade","bonus","bônus","meta","pix","presidente","habilitado"],"No Pix do Presidente (outubro/2026+), a meta semanal acumulada é obrigatória para o bônus-base e ticket/margem. Meta semanal e todos os dias cumpridos: 100% da base. Meta semanal cumprida, mas algum dia não: 50%. Meta semanal não cumprida: R$ 0,00 de base e ticket/margem, mesmo com dias atingidos. O NPS tem regra independente."]
];
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function add(value,user){const el=document.createElement("div");el.className="monaco-ai-message"+(user?" monaco-ai-user":"");el.textContent=value;messages.appendChild(el);messages.scrollTop=messages.scrollHeight;}
function answer(q){const n=normalize(q);for(const [keys,response] of topics){if(keys.some(k=>n.includes(normalize(k))))return response;}return "Posso explicar as regras do Pix do Presidente e da Campanha da Oficina: metas, bônus-base, ticket, margem, NPS, gordura, déficit e penalidades. Faça uma pergunta sobre um desses assuntos. Para valores individuais, consulte a apuração oficial.";}
function toggle(){panel.hidden=!panel.hidden;button.setAttribute("aria-expanded",String(!panel.hidden));if(!panel.hidden){if(!messages.children.length)add("Olá! Sou o Mônaco AI, seu assistente gratuito de políticas. Qual é sua dúvida?");input.focus();}}
button.addEventListener("click",toggle);root.querySelector(".monaco-ai-close").addEventListener("click",toggle);
form.addEventListener("submit",e=>{e.preventDefault();const q=input.value.trim().slice(0,600);if(!q)return;add(q,true);input.value="";add(answer(q));input.focus();});
root.querySelectorAll("[data-monaco-question]").forEach(el=>el.addEventListener("click",()=>{const q=el.dataset.monacoQuestion;add(q,true);add(answer(q));}));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden)toggle();});
})();