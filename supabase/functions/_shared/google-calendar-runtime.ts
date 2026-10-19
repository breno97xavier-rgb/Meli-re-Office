import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { CalendarError, type Dependencies } from './google-calendar-core.ts';
export function runtime():Dependencies {
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 return {
  env:name=>Deno.env.get(name),fetch,
  async identity(request){
   const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))throw new CalendarError(401,'Entre no Office para conectar sua agenda.');
   const {data,error}=await admin.auth.getUser(authorization.slice(7));if(error||!data.user)throw new CalendarError(401,'Sua sessão expirou. Entre novamente.');
   const memberships=await admin.from('workspace_members').select('workspace_id,workspace:workspaces!inner(status)').eq('user_id',data.user.id).eq('status','active').in('role',['owner','admin']).eq('workspace.status','active');
   const ids=[...new Set((memberships.data||[]).map(row=>row.workspace_id))];
   if(memberships.error||ids.length!==1)throw new CalendarError(403,'A conexão exige uma única agência ativa como administrador.');
   return {userId:data.user.id,workspaceId:ids[0]};
  },
  async store(action,user,workspace,payload={}){const {data,error}=await admin.rpc('office_google_calendar_store',{p_action:action,p_user_id:user,p_workspace_id:workspace,p_payload:payload});if(error)throw new CalendarError(403,'Não foi possível confirmar a conexão nesta agência.');return data;}
 };
}
