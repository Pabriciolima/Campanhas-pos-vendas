// Endpoint legado desativado: nenhuma leitura ou gravação sem autenticação.
export default function handler(req,res){res.setHeader('Cache-Control','no-store');return res.status(410).json({error:'Use o acesso autenticado do módulo no Supabase.'});}
