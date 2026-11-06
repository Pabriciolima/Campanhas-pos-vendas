ALTER TABLE public.campanhas_modulo_credenciais ADD COLUMN IF NOT EXISTS master_hash text;
CREATE OR REPLACE FUNCTION public.campanhas_modulos_v2(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions, pg_temp AS $$
DECLARE c public.campanhas_modulo_credenciais; s public.campanhas_modulo_sessoes; r record; a text:=p->>'acao'; m text:=p->>'modulo'; t text; h text; b jsonb; o jsonb; k text; idv text; n bigint;
BEGIN
 IF m IS NULL OR m NOT IN ('garantia','compras') THEN RETURN jsonb_build_object('status',400,'error','Módulo inválido.'); END IF;
 SELECT * INTO c FROM public.campanhas_modulo_credenciais WHERE modulo=m FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status',503,'error','Credencial indisponível.'); END IF;
 IF a='login' THEN
  IF c.bloqueado_ate>clock_timestamp() THEN RETURN jsonb_build_object('status',429,'error','Muitas tentativas. Aguarde 15 minutos.'); END IF;
  h:=coalesce(c.senha_hash,c.master_hash);
  IF length(coalesce(p->>'senha',''))>200 OR h IS NULL OR extensions.crypt(coalesce(p->>'senha',''),h)<>h THEN
   UPDATE public.campanhas_modulo_credenciais SET tentativas_falhas=CASE WHEN bloqueado_ate<=clock_timestamp() THEN 1 ELSE tentativas_falhas+1 END,bloqueado_ate=CASE WHEN tentativas_falhas>=4 AND (bloqueado_ate IS NULL OR bloqueado_ate>clock_timestamp()) THEN clock_timestamp()+interval '15 minutes' ELSE NULL END WHERE modulo=m;
   RETURN jsonb_build_object('status',401,'error','Senha inválida.');
  END IF;
  IF c.senha_hash IS NULL THEN
   IF length(coalesce(p->>'novaSenha',''))<12 OR length(p->>'novaSenha')>72 OR p->>'novaSenha'=p->>'senha' THEN RETURN jsonb_build_object('status',428,'error','Troque a senha master por uma senha de 12 a 72 caracteres.','trocaObrigatoria',true); END IF;
   UPDATE public.campanhas_modulo_credenciais SET senha_hash=extensions.crypt(p->>'novaSenha',extensions.gen_salt('bf',12)),master_hash=NULL,ativado_em=clock_timestamp(),alterado_em=clock_timestamp(),versao=versao+1 WHERE modulo=m;
   UPDATE public.campanhas_modulo_sessoes SET revogado_em=clock_timestamp() WHERE modulo=m;
  END IF;
  UPDATE public.campanhas_modulo_credenciais SET tentativas_falhas=0,bloqueado_ate=NULL WHERE modulo=m;
  t:=encode(extensions.gen_random_bytes(32),'hex');
  INSERT INTO public.campanhas_modulo_sessoes(token_hash,modulo,expira_em) VALUES(encode(extensions.digest(t,'sha256'),'hex'),m,clock_timestamp()+interval '8 hours');
  RETURN jsonb_build_object('token',t,'expiraEm',clock_timestamp()+interval '8 hours');
 END IF;
 SELECT * INTO s FROM public.campanhas_modulo_sessoes WHERE token_hash=encode(extensions.digest(coalesce(p->>'token',''),'sha256'),'hex') AND modulo=m AND revogado_em IS NULL AND expira_em>clock_timestamp();
 IF NOT FOUND OR c.senha_hash IS NULL THEN RETURN jsonb_build_object('status',401,'error','Entre com a senha do módulo.'); END IF;
 IF a='logout' THEN UPDATE public.campanhas_modulo_sessoes SET revogado_em=clock_timestamp() WHERE token_hash=s.token_hash; RETURN '{}'::jsonb; END IF;
 EXECUTE format('SELECT * FROM public.%I WHERE id=''principal'' FOR UPDATE',m||'_estado_v2') INTO r;
 IF r.id IS NULL THEN RETURN jsonb_build_object('status',503,'error','Base indisponível.'); END IF;
 IF a='ler' THEN
  IF p->>'revision'=r.revisao::text THEN RETURN jsonb_build_object('unchanged',true,'revision',r.revisao::text); END IF;
  RETURN jsonb_build_object(CASE WHEN m='garantia' THEN 'state' ELSE 'base' END,r.dados,'revision',r.revisao::text);
 END IF;
 IF a<>'salvar' THEN RETURN jsonb_build_object('status',400,'error','Ação inválida.'); END IF;
 IF p->>'revision' IS DISTINCT FROM r.revisao::text THEN RETURN jsonb_build_object('status',409,'error','Outro computador alterou a base. Atualize antes de salvar; seus dados locais foram preservados.'); END IF;
 IF m='garantia' THEN
  b:=p->'state';
  IF b->>'versao' IS DISTINCT FROM '2' OR jsonb_typeof(b->'competencias') IS DISTINCT FROM 'object' OR jsonb_typeof(b->'historico') IS DISTINCT FROM 'array' THEN RETURN jsonb_build_object('status',400,'error','Estado inválido.'); END IF;
  FOR k,o IN SELECT * FROM jsonb_each(b->'competencias') LOOP
   IF k !~ '^\d{4}-(0[1-9]|1[0-2])$' OR jsonb_typeof(o->'metricas') IS DISTINCT FROM 'object' OR jsonb_typeof(o->'participantes') IS DISTINCT FROM 'array' THEN RETURN jsonb_build_object('status',400,'error','Competência inválida.'); END IF;
  END LOOP;
 ELSE
  b:=r.dados;
  IF jsonb_typeof(p->'operacoes') IS DISTINCT FROM 'array' THEN RETURN jsonb_build_object('status',400,'error','Operações inválidas.'); END IF;
  IF jsonb_array_length(p->'operacoes') NOT BETWEEN 1 AND 2000 THEN RETURN jsonb_build_object('status',400,'error','Limite de operações.'); END IF;
  FOR o IN SELECT * FROM jsonb_array_elements(p->'operacoes') LOOP
   k:=o->>'colecao';idv:=o->>'id';
   IF k IS NULL OR k NOT IN ('compras_campanha_responsaveis','compras_campanha_indicadores','compras_campanha_importacoes','compras_campanha_ajustes_apuracao') OR idv IS NULL OR length(idv) NOT BETWEEN 1 AND 700 OR idv IN ('__proto__','prototype','constructor') OR coalesce(o->>'tipo','') NOT IN ('set','delete') THEN RETURN jsonb_build_object('status',400,'error','Operação inválida.'); END IF;
   IF o->>'tipo'='delete' THEN b:=b#-ARRAY['colecoes',k,idv];b:=jsonb_set(b,ARRAY['exclusoes',k||'/'||idv],to_jsonb(clock_timestamp()));
   ELSE
    IF jsonb_typeof(o->'dados') IS DISTINCT FROM 'object' THEN RETURN jsonb_build_object('status',400,'error','Registro inválido.'); END IF;
    b:=jsonb_set(b,ARRAY['colecoes',k,idv],(CASE WHEN o->>'merge'='true' THEN coalesce(b#>ARRAY['colecoes',k,idv],'{}'::jsonb) ELSE '{}'::jsonb END)||(o->'dados')||jsonb_build_object('id',idv));b:=b#-ARRAY['exclusoes',k||'/'||idv];
   END IF;
   b:=jsonb_set(b,ARRAY['alterados',k||'/'||idv],to_jsonb(clock_timestamp()));
  END LOOP;
 END IF;
 IF octet_length(b::text)>3000000 THEN RETURN jsonb_build_object('status',413,'error','Base acima do limite.'); END IF;
 EXECUTE format('UPDATE public.%I SET dados=$1,revisao=revisao+1,atualizado_em=clock_timestamp() WHERE id=''principal'' RETURNING revisao',m||'_estado_v2') INTO n USING b;
 RETURN jsonb_build_object('revision',n::text)||CASE WHEN m='compras' THEN jsonb_build_object('base',b) ELSE '{}'::jsonb END;
END $$;
REVOKE ALL ON FUNCTION public.campanhas_modulos_v2(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.campanhas_modulos_v2(jsonb) TO service_role;
REVOKE ALL ON public.garantia_estado_v2,public.compras_estado_v2,public.campanhas_modulo_credenciais,public.campanhas_modulo_sessoes FROM anon,authenticated;
