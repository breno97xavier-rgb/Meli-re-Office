// Página real; somente o acesso a dados é substituído pelo servidor de QA.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PresentationEditorPage } from '../../src/pages/PresentationEditorPage';
import '../../src/index.css';
createRoot(document.getElementById('root')!).render(<><p className="bg-amber-50 p-4 text-center">TESTE LOCAL · Dados fictícios · Nenhum acesso a banco</p><PresentationEditorPage presentationId="qa-round" /></>);
