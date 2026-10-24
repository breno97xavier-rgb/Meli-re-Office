// @ts-nocheck
// Double isolado de interface; nenhuma validação de banco, Storage ou OAuth.
import { getEditorialTemplates, previewPlans } from './planning-preview-services';
const copy=value=>JSON.parse(JSON.stringify(value));
const applications={},links=[],pieces={};
export const executionError=error=>error.message;
export async function getEditorialApplication(clientId,planId){return copy(Object.values(applications).find(a=>a.client_id===clientId&&a.editorial_plan_id===planId)||null);}
export async function getEditorialContentLinks(clientId,id){return copy(links.filter(l=>l.client_id===clientId&&l.application_id===id));}
export async function applyEditorialTemplate(clientId,planId,templateId,revision){const model=(await getEditorialTemplates(clientId)).find(m=>m.id===templateId&&m.revision===revision);if(!model)throw new Error('Modelo indisponível no teste.');const result={id:crypto.randomUUID(),client_id:clientId,editorial_plan_id:planId,template_id:templateId,template_revision:revision,snapshot:copy(model)};applications[result.id]=result;return copy(result);}
export async function resolveEditorialSlotContent(clientId,appId,slotId,unit,request){const app=applications[appId];if(!app||app.client_id!==clientId)throw new Error('Cliente inválido no teste.');const prior=links.find(l=>l.application_id===appId&&l.slot_id===slotId&&l.unit_index===unit);if(prior)return copy(pieces[prior.content_id]);let piece;if(request.contentId){piece=pieces[request.contentId];if(!piece||piece.client_id!==clientId)throw new Error('Peça inválida.');piece.editorial_plan_id=app.editorial_plan_id;}else{piece={...copy(request.input),id:crypto.randomUUID(),editorial_plan_id:app.editorial_plan_id,editorial_status:'draft',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};pieces[piece.id]=piece;}links.push({application_id:appId,client_id:clientId,slot_id:slotId,unit_index:unit,content_id:piece.id});return copy(piece);}
export async function fetchContents(clientId){return copy(Object.values(pieces).filter(c=>c.client_id===clientId));}
export async function fetchContentById(id){if(!pieces[id])throw new Error('Peça ausente.');return copy(pieces[id]);}
export async function updateContent(id,input){pieces[id]={...pieces[id],...copy(input)};return copy(pieces[id]);}
export async function fetchContentAssets(){return [];}
export async function fetchContentMedia(){return {assets:[],urls:{}};}
export async function getContentAssetsSignedUrls(){return {};}
export const formatBytes=(value:number)=>`${value} bytes`;
const unavailable=async()=>{throw new Error('Operação de arquivos fora deste teste visual.');};
export const uploadContentAsset=unavailable,replaceContentAsset=unavailable,reorderContentAssets=unavailable,removeCurrentAsset=unavailable,getContentAssetSignedUrl=unavailable,downloadContentAsset=unavailable;
pieces['00000000-0000-0000-0000-000000000401']={id:'00000000-0000-0000-0000-000000000401',client_id:'00000000-0000-0000-0000-000000000021',internal_title:'Vídeo já produzido — fictício',format:'reels',editorial_status:'draft',primary_channel:'instagram',planned_date:null,editorial_plan_id:null};
