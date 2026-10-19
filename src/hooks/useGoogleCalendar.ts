import { useCallback,useEffect,useRef,useState } from 'react';
import { fetchGoogleStatus,fetchGoogleEvents,connectGoogleCalendar,disconnectGoogleCalendar } from '../services/googleCalendarService';
import type { GoogleCalendarEvent,GoogleCalendarStatus } from '../types/googleCalendar';
export function useGoogleCalendar(from:string,until:string){
 const [status,setStatus]=useState<GoogleCalendarStatus|null>(null),[events,setEvents]=useState<GoogleCalendarEvent[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const sequence=useRef(0);
 const reload=useCallback(async()=>{const request=++sequence.current;setLoading(true);setError('');setEvents([]);setStatus(null);try{const next=await fetchGoogleStatus();if(request!==sequence.current)return;setStatus(next);if(next.configured&&next.connected){const rows=await fetchGoogleEvents(from,until);if(request===sequence.current)setEvents(rows);}}catch(e){if(request===sequence.current){setError(e instanceof Error?e.message:'Agenda indisponível.');}}finally{if(request===sequence.current)setLoading(false);}},[from,until]);
 useEffect(()=>{reload();return()=>{sequence.current++;};},[reload]);
 const connect=async()=>{setBusy(true);setError('');try{window.location.assign(await connectGoogleCalendar());}catch(e){setError(e instanceof Error?e.message:'Falha ao conectar.');setBusy(false);}};
 const disconnect=async()=>{if(!window.confirm('Desconectar a agenda desta conta no Office? Os eventos no Google serão preservados.'))return;sequence.current++;setEvents([]);setLoading(false);setBusy(true);setError('');try{await disconnectGoogleCalendar();await reload();}catch(e){setError(e instanceof Error?e.message:'Falha ao desconectar.');}finally{setBusy(false);}};
 return {status,events,error,loading,busy,reload,connect,disconnect};
}
