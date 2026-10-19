import { supabase } from '../lib/supabase';
import type { GoogleCalendarEvent,GoogleCalendarStatus,GoogleEventInput } from '../types/googleCalendar';
async function invoke(body:Record<string,unknown>){
 const {data,error}=await supabase.functions.invoke('google-calendar',{body});
 if(error){let message='Não foi possível acessar a conexão Google. Confira sua sessão e tente novamente.';try{const details=await error.context?.json();if(typeof details?.error==='string')message=details.error;}catch{/* keep safe message */}throw new Error(message);}
 if(data?.error)throw new Error(data.error);if(!data)throw new Error('Conexão sem confirmação.');return data;
}
export async function fetchGoogleStatus():Promise<GoogleCalendarStatus>{return invoke({action:'status'});}
export async function connectGoogleCalendar(){const result=await invoke({action:'connect'});const url=new URL(result.url);if(url.origin!=='https://accounts.google.com'||url.pathname!=='/o/oauth2/v2/auth')throw new Error('Endereço de autorização inválido.');return url.href;}
export async function disconnectGoogleCalendar(){await invoke({action:'disconnect'});}
export async function fetchGoogleEvents(from:string,until:string):Promise<{events:GoogleCalendarEvent[];canWrite:boolean}>{const result=await invoke({action:'events',from,until});if(!Array.isArray(result.events))throw new Error('Resposta de agenda inválida.');return {events:result.events,canWrite:result.canWrite===true};}
export async function saveGoogleEvent(event:GoogleEventInput,requestId:string,existing?:GoogleCalendarEvent){const result=await invoke(existing?{action:'update',id:existing.id,etag:existing.etag,event}:{action:'create',request_id:requestId,event});if(!result.confirmed)throw new Error('Salvamento não confirmado. Atualize a agenda.');}
export async function deleteGoogleEvent(event:GoogleCalendarEvent){const result=await invoke({action:'delete',id:event.id,etag:event.etag,confirm:true});if(result.deleted!==true)throw new Error('Exclusão não confirmada. Atualize a agenda.');}
