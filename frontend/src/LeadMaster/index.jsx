import { Routes, Route, Navigate } from 'react-router-dom';

import Inicio from './Inicio';
import BriefingImovel from './BriefingImovel';
import BriefingGerando from './BriefingGerando';
import PacoteCampanha from './PacoteCampanha';
import Refinamento from './Refinamento';
import Dashboard from './Dashboard';
import Campanhas from './Campanhas';
import CRM from './CRM';
import WhatsApp from './WhatsApp';
import Scraping from './Scraping';
import Configuracao from './Configuracao';
import LeadDetail from './LeadDetail';

export default function LeadMasterRoutes() {
  return (
    <Routes>
      <Route path="inicio" element={<Inicio />} />
      <Route path="campanha/briefing" element={<BriefingImovel />} />
      <Route path="campanha/gerando" element={<BriefingGerando />} />
      <Route path="campanha/pacote" element={<PacoteCampanha />} />
      <Route path="campanha/refinamento" element={<Refinamento />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="campanhas" element={<Campanhas />} />
      <Route path="crm" element={<CRM />} />
      <Route path="leads/:leadId" element={<LeadDetail />} />
      <Route path="whatsapp" element={<WhatsApp />} />
      <Route path="scraping" element={<Scraping />} />
      <Route path="configuracao" element={<Configuracao />} />
      <Route path="" element={<Navigate to="inicio" replace />} />
      <Route path="*" element={<Navigate to="inicio" replace />} />
    </Routes>
  );
}
