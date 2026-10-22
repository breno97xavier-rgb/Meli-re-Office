// Servidor de QA local, separado da configuração/entrada de produção.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({
 plugins:[{
  name:'planning-fictional-services',enforce:'pre',
  resolveId(source){
   if(/\/services\/(planningService|planningFoundationService|clientsService)(?:\.ts)?$/.test(source))return path.resolve('tests/security/planning-preview-services.ts');
   if(/\/lib\/supabase(?:\.ts)?$/.test(source))return '\0planning-no-database';
  },
  load(id){if(id==='\0planning-no-database')return 'export const supabase = new Proxy({}, {get(){throw new Error("Este preview não acessa bancos ou contas reais.")}});';},
 },react(),tailwindcss()],
 resolve:{alias:{'@':path.resolve('.')}},
 optimizeDeps:{entries:['tests/security/planning-preview.html']},
 server:{host:'127.0.0.1',port:4177,strictPort:true},
});
