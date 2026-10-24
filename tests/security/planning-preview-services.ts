// Double de interface: não representa validação de API/Auth/RLS.
// @ts-nocheck
import {validateBriefing} from '../../src/services/planningFoundationService.ts?real';
const copy=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const pause=()=>new Promise(resolve=>setTimeout(resolve,80));
const now=()=>new Date().toISOString();
const clients=[{id:'00000000-0000-0000-0000-000000000021',name:'Café Horizonte — fictício',status:'active'},{id:'00000000-0000-0000-0000-000000000022',name:'Estúdio Aurora — fictício',status:'active'}];
const pillars=[{id:'00000000-0000-0000-0000-000000000041',client_id:'00000000-0000-0000-0000-000000000021',name:'Bastidores',is_active:true,display_order:0},{id:'00000000-0000-0000-0000-000000000042',client_id:'00000000-0000-0000-0000-000000000021',name:'Educação',is_active:true,display_order:1},{id:'00000000-0000-0000-0000-000000000043',client_id:'00000000-0000-0000-0000-000000000021',name:'Comunidade',is_active:true,display_order:2}];
const strategies:Record<string,any>={'00000000-0000-0000-0000-000000000021':{id:'strategy-a',client_id:'00000000-0000-0000-0000-000000000021',positioning:'Café de bairro com produção artesanal e conversa próxima.',value_proposition:'Uma pausa acolhedora na rotina.',target_audience:'Pessoas que trabalham e vivem na região.',brand_voice_tone:'Próximo, claro e acolhedor.',business_goals:'Aumentar visitas recorrentes e apresentar os produtos da casa.',priority_channels:['instagram'],valid_from:'2026-10-01',valid_until:null,review_on:'2026-11-01',revision:1}};
const briefings:Record<string,any>={};const series:Record<string,any>={};
const revisions={strategy:{'00000000-0000-0000-0000-000000000021':[{revision:1,snapshot:copy(strategies['00000000-0000-0000-0000-000000000021']),changed_at:now()}]},briefing:{}};
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
export const previewPlans=[{id:'00000000-0000-0000-0000-000000000301',client_id:clients[0].id,title:'Quinzena piloto — fictícia',start_date:null,end_date:null,status:'draft',target_posts_count:3,secondary_goals:[],pillars:[],created_at:now(),updated_at:now()}];
export async function getEditorialPlans(clientId:string){return copy(previewPlans.filter(plan=>plan.client_id===clientId));}
export async function fetchContentPlanningOptions(clientId:string){return {editorialPlans:await getEditorialPlans(clientId),pillars:await getClientPillars(clientId),campaigns:[]};}
export async function getCampaigns(){return [];}
export function calculateEditorialPlanMetrics(){return {target_posts_count:0,allocated_posts_count:0,unallocated_posts_count:0,overallocated:false,pillar_count:0};}
// Ações legadas não fazem parte deste roteiro de QA: falham explicitamente.
const unavailable=async()=>{throw new Error('Ação fora deste teste de interface.');};
export const updateClient=unavailable,createClientPillar=unavailable,updateClientPillar=unavailable,setClientPillarActive=unavailable,reorderClientPillars=unavailable,createEditorialPlan=unavailable,updateEditorialPlan=unavailable,setEditorialPlanStatus=unavailable,archiveEditorialPlan=unavailable,setEditorialPlanPillars=unavailable,createCampaign=unavailable,updateCampaign=unavailable,setCampaignStatus=unavailable,archiveCampaign=unavailable,deleteCampaign=unavailable,getEditorialPlan=unavailable,getCampaign=unavailable,getEditorialPlanPillars=unavailable;


const templates:Record<string,any>={};
templates['00000000-0000-0000-0000-000000000302']={id:'00000000-0000-0000-0000-000000000302',client_id:clients[0].id,name:'Quinzenal piloto — fictício',position_count:14,notes:'',is_active:true,revision:1,created_at:now(),updated_at:now(),slots:[{id:'00000000-0000-0000-0000-000000000303',position:2,title:'Bastidores do café',guidance:'Mostrar o processo artesanal.',pillar_id:'00000000-0000-0000-0000-000000000041',series_id:null,campaign_id:null,objective:'Aproximar a marca do público',funnel:'Relacionamento',format:'reels',priority:'main',recurrence:'every_cycle',quantity:2,is_active:true,destinations:[{channel:'instagram',profile:'@cafe_horizonte'},{channel:'whatsapp',profile:'Comercial'}]}]};
const templateHistory:Record<string,any[]>={};
export async function getEditorialTemplates(clientId:string){await pause();return copy(Object.values(templates).filter((model:any)=>model.client_id===clientId));}
export async function saveEditorialTemplate(clientId:string,draft:any){
 await pause();if(draft.client_id!==clientId)throw new Error('Cliente inválido no teste.');
 const {validateEditorialTemplate}=await import('../../src/utils/editorialTemplates');validateEditorialTemplate(draft);
 if(draft.revision!==(templates[draft.id]?.revision||0))throw new Error('Conflito de versão no teste.');
 const result={...copy(draft),revision:draft.revision+1,created_at:templates[draft.id]?.created_at||now(),updated_at:now()};
 templates[draft.id]=result;(templateHistory[draft.id]||=[]).unshift({revision:result.revision,snapshot:copy(result),changed_at:now()});return copy(result);
}
export async function getEditorialTemplateRevisions(clientId:string,templateId:string){await pause();if(templates[templateId]?.client_id!==clientId)return [];return copy(templateHistory[templateId]||[]);}
