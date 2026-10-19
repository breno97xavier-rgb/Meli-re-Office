import type { GoogleCalendarEvent } from '../types/googleCalendar';
function civil(date:Date,zone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function projectGoogleEvents(events:GoogleCalendarEvent[],days:string[],zone:string,search='') {
 const byDate:Record<string,GoogleCalendarEvent[]>={};const seen=new Set<string>();
 for(const event of events){
  if(seen.has(event.id)||!event.title.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))continue;
  seen.add(event.id);
  const start=event.allDay?event.start:civil(new Date(event.start),zone);
  // Both all-day and timed events use an exclusive end. Midnight belongs to the preceding day.
  const end=event.allDay?new Date(Date.parse(event.end)-86400000).toISOString().slice(0,10):civil(new Date(Date.parse(event.end)-1),zone);
  for(const day of days)if(day>=start&&day<=end)(byDate[day]||=[]).push(event);
 }
 for(const group of Object.values(byDate))group.sort((a,b)=>Number(b.allDay)-Number(a.allDay)||a.start.localeCompare(b.start)||a.title.localeCompare(b.title));
 return byDate;
}
