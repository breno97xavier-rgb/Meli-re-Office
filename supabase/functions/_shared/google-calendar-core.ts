export const OFFICE_ORIGIN='https://meli-re-office.vercel.app';
export const READ_SCOPE='https://www.googleapis.com/auth/calendar.events.owned.readonly';
export const WRITE_SCOPE='https://www.googleapis.com/auth/calendar.events.owned';
export interface Identity {userId:string;workspaceId:string}
export interface Dependencies {
 env:(name:string)=>string|undefined;
 identity:(request:Request)=>Promise<Identity>;
 store:(action:string,user:string|null,workspace:string|null,payload?:Record<string,unknown>)=>Promise<any>;
 fetch:typeof fetch;
}
export class CalendarError extends Error {constructor(public status:number,message:string){super(message);}}
const headers={'Access-Control-Allow-Origin':OFFICE_ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-retry-count, traceparent, tracestate, baggage','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
function configuration(deps:Dependencies){const id=deps.env('GOOGLE_CALENDAR_CLIENT_ID');const secret=deps.env('GOOGLE_CALENDAR_CLIENT_SECRET');const base=deps.env('SUPABASE_URL');return id&&secret&&base?{id,secret,callback:base+'/functions/v1/google-calendar-callback'}:null;}
async function tokenRequest(deps:Dependencies,params:Record<string,string>){
 const response=await deps.fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new CalendarError(409,'Reconecte sua conta Google para atualizar a autorização.');
 const token=await response.json();if(typeof token.access_token!=='string'||!token.access_token)throw new CalendarError(502,'O Google não confirmou a autorização.');return token;
}
export function eventRange(from:unknown,until:unknown){
 const valid=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!valid(from)||!valid(until))throw new CalendarError(400,'Período de agenda inválido.');
 const first=Date.parse(from),last=Date.parse(until);
 if(last<first||last-first>62*86400000)throw new CalendarError(400,'Consulte até 63 dias por vez.');
 return {min:new Date(first-86400000).toISOString(),max:new Date(last+2*86400000).toISOString()};
}
export function safeEventLink(value:unknown){if(typeof value!=='string')return null;try{const u=new URL(value);return u.protocol==='https:'&&((u.hostname==='calendar.google.com')||(u.hostname==='www.google.com'&&u.pathname.startsWith('/calendar/')))?u.href:null;}catch{return null;}}
function normalizeEvent(event:any){
 if(!event||typeof event.id!=='string'||event.status==='cancelled'||!event.start||!event.end)return null;
 const allDay=typeof event.start.date==='string';const start=allDay?event.start.date:event.start.dateTime,end=allDay?event.end.date:event.end.dateTime;
 if(typeof start!=='string'||typeof end!=='string'||isNaN(Date.parse(start))||isNaN(Date.parse(end))||Date.parse(end)<=Date.parse(start))return null;
 return {id:event.id,title:typeof event.summary==='string'?event.summary.slice(0,300):'Compromisso sem título',start,end,allDay,url:safeEventLink(event.htmlLink),etag:event.etag,recurring:Boolean(event.recurringEventId),description:typeof event.description==='string'?event.description:'',location:typeof event.location==='string'?event.location:'',editable:event.organizer?.self===true&&!event.attendees?.length&&(!event.eventType||event.eventType==='default')&&!event.recurrence?.length};
}
export function eventInput(input:any){
 if(!input||typeof input.title!=='string'||!input.title.trim()||input.title.length>300||typeof input.allDay!=='boolean')throw new CalendarError(400,'Informe título e período válidos.');
 const text=(value:unknown,max:number)=>{if(value!==undefined&&(typeof value!=='string'||value.length>max))throw new CalendarError(400,'Texto do compromisso inválido.');return typeof value==='string'?value:'';};
 const description=text(input.description,4000),location=text(input.location,500);
 const valid=(value:unknown)=>typeof value==='string'&&(input.allDay?/^\d{4}-\d{2}-\d{2}$/:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/).test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===(input.allDay?value:new Date(value).toISOString().slice(0,10));
 if(!valid(input.start)||!valid(input.end)||Date.parse(input.end)<=Date.parse(input.start))throw new CalendarError(400,'O término deve ser posterior ao início.');
 return {summary:input.title.trim(),description,location,start:input.allDay?{date:input.start}:{dateTime:input.start},end:input.allDay?{date:input.end}:{dateTime:input.end}};
}
export function createCalendarApi(deps:Dependencies){return async(request:Request)=>{
 try{
  const origin=request.headers.get('Origin');if(origin&&origin!==OFFICE_ORIGIN)return json({error:'Origem não permitida.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'Método não permitido.'},405);
  const identity=await deps.identity(request); // Always verify identity before using server credentials.
  const raw=await request.text();if(raw.length>8192)throw new CalendarError(400,'Solicitação inválida.');
  let body:any;try{body=JSON.parse(raw);}catch{throw new CalendarError(400,'Solicitação inválida.');}
  if(!body||!['status','connect','events','disconnect','create','update','delete'].includes(body.action))throw new CalendarError(400,'Ação inválida.');
  const cfg=configuration(deps);const store=(action:string,payload?:Record<string,unknown>)=>deps.store(action,identity.userId,identity.workspaceId,payload);
  if(body.action==='status'){const status=await store('status');return json({configured:Boolean(cfg),connected:Boolean(status?.connected)});}
  if(body.action==='disconnect'){await store('disconnect');return json({disconnected:true});}
  if(!cfg)throw new CalendarError(503,'A conexão aguarda configuração do Google Cloud no servidor.');
  if(body.action==='connect'){
   const state=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');
   await store('start',{hash:await hash(state)});
   const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:cfg.id,redirect_uri:cfg.callback,response_type:'code',scope:WRITE_SCOPE,state,access_type:'offline',prompt:'consent',include_granted_scopes:'false'}).toString();
   return json({url:url.href});
  }
  const writing=['create','update','delete'].includes(body.action);
  const range=writing?null:eventRange(body.from,body.until);
  const payload=writing&&body.action!=='delete'?eventInput(body.event):null;
  if(writing&&body.action==='create'&&(typeof body.request_id!=='string'||!(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i).test(body.request_id)))throw new CalendarError(400,'Identificador de criação inválido.');
  if(writing&&body.action!=='create'&&(typeof body.id!=='string'||!/^[a-zA-Z0-9_-]{5,1024}$/.test(body.id)||typeof body.etag!=='string'||!/^"[^"\r\n]{1,200}"$/.test(body.etag)))throw new CalendarError(400,'Atualize o compromisso antes de alterá-lo.');
  if(body.action==='delete'&&body.confirm!==true)throw new CalendarError(400,'Confirme a exclusão deste compromisso.');
  const connection=await store('token');if(!connection?.refresh_token)throw new CalendarError(409,'Conecte sua conta Google para visualizar os compromissos.');
  const token=await tokenRequest(deps,{client_id:cfg.id,client_secret:cfg.secret,refresh_token:connection.refresh_token,grant_type:'refresh_token'});
  if(token.refresh_token)await store('save',{revision:connection.revision,refresh_token:token.refresh_token});
  const canWrite=(token.scope||'').split(' ').includes(WRITE_SCOPE);
  if(writing){
   if(!canWrite)throw new CalendarError(409,'Reconecte o Google e autorize criar, editar e excluir compromissos.');
   const base='https://www.googleapis.com/calendar/v3/calendars/primary/events';
   const provider=async(url:string,options:RequestInit={})=>deps.fetch(url,{...options,headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});
   let id=body.id;
   if(body.action!=='create'){
    const before=await provider(base+'/'+encodeURIComponent(id));
    if(!before.ok)throw new CalendarError(before.status===404||before.status===410?404:502,'Compromisso indisponível. Atualize a agenda.');
    const current=await before.json();
    if(!normalizeEvent(current)?.editable)throw new CalendarError(403,'Edite séries completas, convites e eventos especiais diretamente no Google Agenda.');
    if(current.etag!==body.etag)throw new CalendarError(409,'O compromisso mudou no Google. Atualize a agenda antes de salvar.');
   }
   // Revalidate workspace membership and connection immediately before the provider write.
   const current=await store('status');if(!current?.connected||current.revision!==connection.revision)throw new CalendarError(409,'A conexão mudou. Atualize a agenda.');
   if(body.action==='create')id=await hash(identity.userId+':'+identity.workspaceId+':'+body.request_id);
   const url=base+(body.action==='create'?'':'/'+encodeURIComponent(id))+'?sendUpdates=none';
   const response=await provider(url,{method:body.action==='create'?'POST':body.action==='update'?'PATCH':'DELETE',headers:body.action==='create'?{}:{'If-Match':body.etag},...(body.action==='delete'?{}:{body:JSON.stringify(body.action==='create'?{...payload,id,extendedProperties:{private:{office_request_id:body.request_id}}}:payload)})});
   if(body.action==='create'&&response.status===409){
    const existing=await provider(base+'/'+id);
    if(existing.ok){const row=await existing.json();
     const same=row.summary===payload!.summary&&(row.description||'')===payload!.description&&(row.location||'')===payload!.location&&JSON.stringify(row.start)===JSON.stringify(payload!.start)&&JSON.stringify(row.end)===JSON.stringify(payload!.end);
     if(row.extendedProperties?.private?.office_request_id===body.request_id&&same)return json({event:normalizeEvent(row),confirmed:true});
    }
    throw new CalendarError(409,'Esta criação já foi recebida pelo Google. Atualize a agenda antes de editar ou criar novamente.');
   }
   if(!response.ok)throw new CalendarError(response.status===412?409:response.status===401||response.status===403?403:502,response.status===412?'O compromisso mudou no Google. Atualize a agenda.':'Operação não confirmada. Atualize a agenda antes de tentar novamente.');
   return body.action==='delete'?json({deleted:true}):json({event:normalizeEvent(await response.json()),confirmed:true});
  }
  const events=[];let next:string|undefined;
  for(let page=0;page<10;page++){
   const url=new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
   url.search=new URLSearchParams({timeMin:range!.min,timeMax:range!.max,singleEvents:'true',maxResults:'1000',fields:'nextPageToken,items(id,status,summary,start,end,htmlLink,etag,recurringEventId,recurrence,organizer(self),attendees(self),eventType,description,location)',...(next?{pageToken:next}:{})}).toString();
   const response=await deps.fetch(url,{headers:{Authorization:`Bearer ${token.access_token}`},signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw new CalendarError(response.status===401||response.status===403?409:502,'Não foi possível ler a agenda. Confira a autorização ou tente novamente.');
   const data=await response.json();if(!Array.isArray(data.items)&&data.items!==undefined)throw new CalendarError(502,'Resposta de agenda inválida.');
   for(const value of data.items||[]){const event=normalizeEvent(value);if(event)events.push(event);}
   next=data.nextPageToken;if(!next)break;
   if(page===9)throw new CalendarError(422,'Há eventos demais neste período. Nenhuma lista parcial será exibida.');
  }
  // Do not return an in-flight result after disconnect/reconnect.
  const current=await store('status');if(!current?.connected||current.revision!==connection.revision)throw new CalendarError(409,'A conexão mudou. Atualize a agenda.');
  return json({events,canWrite});
 }catch(error){return json({error:error instanceof CalendarError?error.message:'Não foi possível consultar a conexão Google.'},error instanceof CalendarError?error.status:500);}
};}
export function createCalendarCallback(deps:Dependencies){return async(request:Request)=>{
 let outcome='error';
 try{
  if(request.method!=='GET')return new Response('Method not allowed',{status:405});
  const cfg=configuration(deps);if(!cfg)throw new Error('not configured');
  const url=new URL(request.url),state=url.searchParams.get('state'),code=url.searchParams.get('code');
  if(!state||!/^[a-f0-9]{64}$/.test(state))throw new Error('state');
  const stored=await deps.store('consume_state',null,null,{hash:await hash(state)});if(!stored)throw new Error('state');
  if(url.searchParams.has('error'))outcome='cancelled';
  else {
   if(!code||code.length>4096)throw new Error('code');
   const token=await tokenRequest(deps,{client_id:cfg.id,client_secret:cfg.secret,redirect_uri:cfg.callback,grant_type:'authorization_code',code});
   if(typeof token.refresh_token!=='string'||!(token.scope||'').split(' ').some((scope:string)=>scope===READ_SCOPE||scope===WRITE_SCOPE))throw new Error('scope');
   await deps.store('save',stored.user_id,stored.workspace_id,{revision:stored.revision,refresh_token:token.refresh_token});outcome='connected';
  }
 }catch{/* Never log codes, states, tokens, provider bodies or request URLs. */}
 return new Response(null,{status:303,headers:{Location:OFFICE_ORIGIN+'/calendario?google_calendar='+outcome,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
};}
