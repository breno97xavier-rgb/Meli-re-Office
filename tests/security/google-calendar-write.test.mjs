import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {SourceTextModule,createContext} from 'node:vm';
const mod=new SourceTextModule(stripTypeScriptTypes(readFileSync('supabase/functions/_shared/google-calendar-core.ts','utf8'),{mode:'transform'}),{context:createContext({Request,Response,URL,URLSearchParams,crypto,TextEncoder,AbortSignal})});
await mod.link(()=>{throw Error('Unexpected import');});await mod.evaluate();const core=mod.namespace;
const input={title:'Teste fictício',description:'Descrição',location:'Local fictício',allDay:false,start:'2026-10-18T12:00:00.000Z',end:'2026-10-18T13:00:00.000Z'};
const original={id:'abc123',etag:'"v1"',summary:'Teste',organizer:{self:true},start:{dateTime:input.start},end:{dateTime:input.end},eventType:'default'};
const requestId='12345678-1234-4234-8234-123456789abc';
function setup({scope=core.WRITE_SCOPE,row=original,revision='r1',mutationStatus=200,identityError=false}={}){
 const calls=[],stores=[];
 const api=core.createCalendarApi({env:name=>({GOOGLE_CALENDAR_CLIENT_ID:'test',GOOGLE_CALENDAR_CLIENT_SECRET:'fake',SUPABASE_URL:'https://example.supabase.co'})[name],identity:async()=>{if(identityError)throw new core.CalendarError(401,'Sessão inválida');return{userId:'user-a',workspaceId:'workspace-a'};},store:async(action,user,workspace)=>{stores.push({action,user,workspace});return action==='token'?{refresh_token:'fake',revision:'r1'}:{connected:true,revision};},fetch:async(url,options)=>{
  calls.push({url:String(url),options});
  if(String(url).includes('oauth2.googleapis.com'))return Response.json({access_token:'fake',scope});
  if(!options.method)return Response.json(row);
  if(options.method==='DELETE'&&mutationStatus===200)return new Response(null,{status:204});
  return Response.json(row,{status:mutationStatus});
 }});
 const call=body=>api(new Request('https://example.test',{method:'POST',headers:{Origin:core.OFFICE_ORIGIN},body:JSON.stringify(body)}));
 return{call,calls,stores,writes:()=>calls.filter(x=>['POST','PATCH','DELETE'].includes(x.options.method)&&!x.url.includes('oauth2.googleapis.com'))};
}
test('unauthenticated callers cannot reach credentials or Google writes',async()=>{const s=setup({identityError:true});assert.equal((await s.call({action:'create',event:input,request_id:requestId})).status,401);assert.equal(s.calls.length,0);});
test('legacy read-only authorization cannot write',async()=>{for(const action of['create','update','delete']){const s=setup({scope:core.READ_SCOPE});assert.equal((await s.call({action,event:input,request_id:requestId,id:'abc123',etag:'"v1"',confirm:true})).status,409);assert.equal(s.writes().length,0);}});
test('creation pins primary calendar and strips forbidden properties',async()=>{const s=setup();assert.equal((await s.call({action:'create',request_id:requestId,calendar:'foreign',workspace_id:'foreign',event:{...input,attendees:[{email:'foreign@example.test'}],recurrence:['RRULE:FREQ=DAILY']}})).status,200);const w=s.writes()[0],body=JSON.parse(w.options.body);assert.equal(w.url,'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none');assert.equal(body.attendees,undefined);assert.equal(body.recurrence,undefined);assert.equal(body.id.length,64);assert.ok(s.stores.every(x=>x.user==='user-a'&&x.workspace==='workspace-a'));});
test('repeating creation uses deterministic provider ID',async()=>{const s=setup();await s.call({action:'create',request_id:requestId,event:input});await s.call({action:'create',request_id:requestId,event:input});assert.equal(JSON.parse(s.writes()[0].options.body).id,JSON.parse(s.writes()[1].options.body).id);});
test('invalid dates, title and path IDs are rejected before token access',async()=>{for(const event of[{...input,title:' '},{...input,end:input.start},{...input,start:'bad'},{...input,allDay:true,start:'2026-02-30',end:'2026-03-04'}]){const s=setup();assert.equal((await s.call({action:'create',request_id:requestId,event})).status,400);assert.equal(s.calls.length,0);}const s=setup();assert.equal((await s.call({action:'update',id:'../foreign',etag:'"v1"',event:input})).status,400);});
test('update patches only allowed fields with provider etag precondition',async()=>{const s=setup();assert.equal((await s.call({action:'update',id:'abc123',etag:'"v1"',event:input})).status,200);assert.equal(s.writes()[0].options.method,'PATCH');assert.equal(s.writes()[0].options.headers['If-Match'],'"v1"');assert.equal(JSON.parse(s.writes()[0].options.body).summary,input.title);});
test('stale etag and provider conflicts never overwrite concurrent edits',async()=>{const s=setup();assert.equal((await s.call({action:'update',id:'abc123',etag:'"old"',event:input})).status,409);assert.equal(s.writes().length,0);const conflict=setup({mutationStatus:412});assert.equal((await conflict.call({action:'update',id:'abc123',etag:'"v1"',event:input})).status,409);assert.equal(conflict.writes().length,1);});
test('series masters, guest invitations and special events cannot be mutated',async()=>{for(const extra of[{recurrence:['RRULE:FREQ=DAILY']},{attendees:[{self:true}]},{organizer:{self:false}},{eventType:'birthday'}]){const s=setup({row:{...original,...extra}});assert.equal((await s.call({action:'delete',id:'abc123',etag:'"v1"',confirm:true})).status,403);assert.equal(s.writes().length,0);}});
test('recurring occurrence writes exact instance ID without changing master series',async()=>{const s=setup({row:{...original,id:'abc123_20261018T120000Z',recurringEventId:'abc123'}});await s.call({action:'delete',id:'abc123_20261018T120000Z',etag:'"v1"',confirm:true});assert.ok(s.writes()[0].url.includes('/abc123_20261018T120000Z?'));});
test('deletion requires explicit confirmation and sends no event body',async()=>{const s=setup();assert.equal((await s.call({action:'delete',id:'abc123',etag:'"v1"'})).status,400);assert.equal(s.calls.length,0);const response=await s.call({action:'delete',id:'abc123',etag:'"v1"',confirm:true});assert.equal((await response.json()).deleted,true);assert.equal(s.writes()[0].options.body,undefined);});
test('disconnect or reconnect during operation blocks provider mutation',async()=>{const s=setup({revision:'r2'});assert.equal((await s.call({action:'create',request_id:requestId,event:input})).status,409);assert.equal(s.writes().length,0);});
test('all-day payload keeps exclusive end and omits dateTime',()=>{const payload=core.eventInput({...input,allDay:true,start:'2026-10-18',end:'2026-10-19'});assert.equal(payload.start.date,'2026-10-18');assert.equal(payload.end.date,'2026-10-19');assert.equal(payload.start.dateTime,undefined);});
