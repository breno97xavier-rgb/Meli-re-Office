import base from './planning-preview.config.mjs';
// Doubles explícitos: confirmar altera apenas estado em memória nesta página.
export default {...base, server:{...base.server,port:4178},plugins:[{
 name:'review-confirm-fictional-data',enforce:'pre',
 resolveId(source){
  if(source.endsWith('/hooks/usePresentationEditor'))return '\0qa-editor';
  if(source==='qa-prepare'||source.endsWith('/services/presentationsService'))return '\0qa-prepare';
 },
 load(id){
  if(id==='\0qa-prepare')return 'export let prepared=false; export async function preparePresentationReview(){prepared=true;} export async function createNextPresentationRound(){throw new Error("Fora do escopo deste QA isolado");}';
  if(id==='\0qa-editor')return `import {useState} from 'react';import {prepared} from 'qa-prepare';
   export function usePresentationEditor(){const [,refresh]=useState(0);return {
    presentation:{id:'qa-round',title:'TESTE QA — preparação de versão',status:'draft',round_number:3,client:{name:'Cliente fictício'}},
    items:[{id:'qa-item',content_id:'qa-content',client_approval_status:'pending',review_id:prepared?'qa-review':null,content:{id:'qa-content',title:'Peça fictícia',format:'static_post'}}],
    signedUrls:{},availableContents:[],clientContents:[],loading:false,loadData:async()=>refresh(x=>x+1)
   };}`;
 }
},...base.plugins]};
