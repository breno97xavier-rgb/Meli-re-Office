import {createRoot} from 'react-dom/client';
import {PlanningPage} from '../../src/pages/PlanningPage';
import '../../src/index.css';
createRoot(document.getElementById('root')!).render(<><div className="bg-amber-50 p-3 text-center text-sm text-amber-900">TESTE LOCAL · Dados fictícios · Sem conexão com banco ou contas reais</div><main className="mx-auto max-w-7xl"><PlanningPage/></main></>);
