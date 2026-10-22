// Double de interface: não representa validação de API/Auth/RLS.
// @ts-nocheck
import {validateBriefing} from '../../src/services/planningFoundationService.ts?real';
const copy=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const pause=()=>new Promise(resolve=>setTimeout(resolve,80));
const now=()=>new Date().toISOString();
const clients=[{id:'fictional-a',name:'Café Horizonte — fictício',status:'active'},{id:'fictional-b',name:'Estúdio Aurora — fictício',status:'active'}];
const pillars=[{id:'p1',client_id:'fictional-a',name:'Bastidores',is_active:true,display_order:0},{id:'p2',client_id:'fictional-a',name:'Educação',is_active:true,display_order:1},{id:'p3',client_id:'fictional-a',name:'Comunidade',is_active:true,display_order:2}];
const strategies:Record<string,any>={'fictional-a':{id:'strategy-a',client_id:'fictional-a',positioning:'Café de bairro com produção artesanal e conversa próxima.',value_proposition:'Uma pausa acolhedora na rotina.',target_audience:'Pessoas que trabalham e vivem na região.',brand_voice_tone:'Próximo, claro e acolhedor.',business_goals:'Aumentar visitas recorrentes e apresentar os produtos da casa.',priority_channels:['instagram'],valid_from:'2026-10-01',valid_until:null,review_on:'2026-11-01',revision:1}};
const briefings:Record<string,any>={};const series:Record<string,any>={};
const revisions={strategy:{'fictional-a':[{revision:1,snapshot:copy(strategies['fictional-a']),changed_at:now()}]},briefing:{}};
export const formatPlanningError=(error:Error)=>error.message;
export async function fetchClients(){await pause();return copy(clients);}
export async function getClientStrategy(clientId:string){await pause();return copy(strategies[clientId]||null);}
export async function getClientPillars(clientId:string){await pause();return copy(pillars.filter(p=>p.client_id===clientId));}
export async function getBriefing(clientId:string){await pause();return copy(briefings[clientId]||null);}
export async function getEditorialSeries(clientId:string){await pause();return copy(Object.values(series).filter((s:any)=>s.client_id===clientId));}
export async function getPlanningRevisions(clientId:string,kind:'strategy'|'briefing'){await pause();return copy((revisions[kind][clientId]||[]).toReversed());}
export async function saveBriefing(clientId:string,revision:number,questions:any[],status:string){
 validateBriefing(questions);await pause();if(revision!==(briefings[clientId]?.revision||0))throw new Error('Conflito de revisão no teste.');
 const result={client_id:clientId,questions:copy(questions),status,revision:revision+1,updated_at:now()};briefings[clientId]=result;(revisions.briefing[clientId]||=[]).push({revision:result.revision,snapshot:copy(result),changed_at:now()});return copy(result);
}
export async function saveStrategyRevision(clientId:string,revision:number,input:any){await pause();if(revision!==(strategies[clientId]?.revision||0))throw new Error('Conflito de revisão no teste.');const result={id:strategies[clientId]?.id||crypto.randomUUID(),client_id:clientId,...input,revision:revision+1};strategies[clientId]=result;(revisions.strategy[clientId]||=[]).push({revision:result.revision,snapshot:copy(result),changed_at:now()});return copy(result);}
export async function saveEditorialSeries(clientId:string,input:any){await pause();if(input.revision!==(series[input.id]?.revision||0))throw new Error('Conflito de revisão no teste.');if(!input.name.trim())throw new Error('Informe o nome da série.');const result={...copy(input),client_id:clientId,revision:input.revision+1};series[input.id]=result;return copy(result);}
export async function getEditorialPlans(){return [];}
export async function getCampaigns(){return [];}
export function calculateEditorialPlanMetrics(){return {target_posts_count:0,allocated_posts_count:0,unallocated_posts_count:0,overallocated:false,pillar_count:0};}
// Ações legadas não fazem parte deste roteiro de QA: falham explicitamente.
const unavailable=async()=>{throw new Error('Ação fora deste teste de interface.');};
export const updateClient=unavailable,createClientPillar=unavailable,updateClientPillar=unavailable,setClientPillarActive=unavailable,reorderClientPillars=unavailable,createEditorialPlan=unavailable,updateEditorialPlan=unavailable,setEditorialPlanStatus=unavailable,archiveEditorialPlan=unavailable,setEditorialPlanPillars=unavailable,createCampaign=unavailable,updateCampaign=unavailable,setCampaignStatus=unavailable,archiveCampaign=unavailable,deleteCampaign=unavailable,getEditorialPlan=unavailable,getCampaign=unavailable,getEditorialPlanPillars=unavailable;
