export const OFFICE_ORIGIN='https://meli-re-office.vercel.app';
export const READ_SCOPE='https://www.googleapis.com/auth/calendar.events.owned.readonly';
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
 return {id:event.id,title:typeof event.summary==='string'?event.summary.slice(0,300):'Compromisso sem título',start,end,allDay,url:safeEventLink(event.htmlLink)};
}
export function createCalendarApi(deps:Dependencies){return async(request:Request)=>{
 try{
  const origin=request.headers.get('Origin');if(origin&&origin!==OFFICE_ORIGIN)return json({error:'Origem não permitida.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'Método não permitido.'},405);
  const identity=await deps.identity(request); // Always verify identity before using server credentials.
  const raw=await request.text();if(raw.length>8192)throw new CalendarError(400,'Solicitação inválida.');
  let body:any;try{body=JSON.parse(raw);}catch{throw new CalendarError(400,'Solicitação inválida.');}
  if(!body||!['status','connect','events','disconnect'].includes(body.action))throw new CalendarError(400,'Ação inválida.');
  const cfg=configuration(deps);const store=(action:string,payload?:Record<string,unknown>)=>deps.store(action,identity.userId,identity.workspaceId,payload);
  if(body.action==='status'){const status=await store('status');return json({configured:Boolean(cfg),connected:Boolean(status?.connected)});}
  if(body.action==='disconnect'){await store('disconnect');return json({disconnected:true});}
  if(!cfg)throw new CalendarError(503,'A conexão aguarda configuração do Google Cloud no servidor.');
  if(body.action==='connect'){
   const state=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');
   await store('start',{hash:await hash(state)});
   const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:cfg.id,redirect_uri:cfg.callback,response_type:'code',scope:READ_SCOPE,state,access_type:'offline',prompt:'consent',include_granted_scopes:'false'}).toString();
   return json({url:url.href});
  }
  const range=eventRange(body.from,body.until);
  const connection=await store('token');if(!connection?.refresh_token)throw new CalendarError(409,'Conecte sua conta Google para visualizar os compromissos.');
  const token=await tokenRequest(deps,{client_id:cfg.id,client_secret:cfg.secret,refresh_token:connection.refresh_token,grant_type:'refresh_token'});
  if(token.refresh_token)await store('save',{revision:connection.revision,refresh_token:token.refresh_token});
  const events=[];let next:string|undefined;
  for(let page=0;page<10;page++){
   const url=new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
   url.search=new URLSearchParams({timeMin:range.min,timeMax:range.max,singleEvents:'true',maxResults:'1000',fields:'nextPageToken,items(id,status,summary,start,end,htmlLink)',...(next?{pageToken:next}:{})}).toString();
   const response=await deps.fetch(url,{headers:{Authorization:`Bearer ${token.access_token}`},signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw new CalendarError(response.status===401||response.status===403?409:502,'Não foi possível ler a agenda. Confira a autorização ou tente novamente.');
   const data=await response.json();if(!Array.isArray(data.items)&&data.items!==undefined)throw new CalendarError(502,'Resposta de agenda inválida.');
   for(const value of data.items||[]){const event=normalizeEvent(value);if(event)events.push(event);}
   next=data.nextPageToken;if(!next)break;
   if(page===9)throw new CalendarError(422,'Há eventos demais neste período. Nenhuma lista parcial será exibida.');
  }
  // Do not return an in-flight result after disconnect/reconnect.
  const current=await store('status');if(!current?.connected||current.revision!==connection.revision)throw new CalendarError(409,'A conexão mudou. Atualize a agenda.');
  return json({events});
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
   if(typeof token.refresh_token!=='string'||!(token.scope||'').split(' ').includes(READ_SCOPE))throw new Error('scope');
   await deps.store('save',stored.user_id,stored.workspace_id,{revision:stored.revision,refresh_token:token.refresh_token});outcome='connected';
  }
 }catch{/* Never log codes, states, tokens, provider bodies or request URLs. */}
 return new Response(null,{status:303,headers:{Location:OFFICE_ORIGIN+'/calendario?google_calendar='+outcome,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
};}
