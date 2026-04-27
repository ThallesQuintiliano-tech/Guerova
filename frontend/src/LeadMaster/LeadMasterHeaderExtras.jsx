import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Button,
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { Typeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import { mockKanban, mockUser, flattenKanbanForSearch } from './mockData';
import { loadKanban } from './leadMasterStorage';

export default function LeadMasterHeaderExtras() {
  const navigate = useNavigate();
  const [leadOptions, setLeadOptions] = useState(() => flattenKanbanForSearch(loadKanban(mockKanban)));

  const refreshLeadOptions = useCallback(() => {
    setLeadOptions(flattenKanbanForSearch(loadKanban(mockKanban)));
  }, []);

  return (
    <div className="d-flex align-items-center gap-2 me-2 lm-header-actions flex-wrap justify-content-end">
      <div className="lm-header-typeahead" style={{ minWidth: 200, maxWidth: 320 }}>
        <Typeahead
          id="lm-global-lead-search"
          placeholder="Buscar lead…"
          minLength={1}
          highlightFirstResult
          labelKey={(opt) => `${opt.name} · ${opt.phone} · ${opt.column}`}
          options={leadOptions}
          onFocus={refreshLeadOptions}
          onChange={(selected) => {
            if (selected?.length) {
              navigate(`/leadmaster/leads/${selected[0].id}`);
            }
          }}
          inputProps={{ 'aria-label': 'Buscar lead por nome, telefone ou etapa' }}
        />
      </div>
      <Button color="link" className="p-2" aria-label="Notificações">
        <FontAwesomeIcon icon={faBell} size="lg" />
      </Button>
      <Button color="link" className="p-2" aria-label="Ajuda">
        <FontAwesomeIcon icon={faQuestionCircle} size="lg" />
      </Button>
      <UncontrolledDropdown>
        <DropdownToggle color="link" className="d-flex align-items-center gap-2 text-decoration-none text-dark lm-user-pill">
          <div className="lm-avatar">{mockUser.initials}</div>
          <div className="d-none d-md-block text-start lh-sm">
            <div className="fw-bold small">{mockUser.name}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              {mockUser.subtitle}{' '}
              <span className="ms-1 text-muted">▾</span>
            </div>
          </div>
        </DropdownToggle>
        <DropdownMenu end>
          <DropdownItem header>Conta</DropdownItem>
          <DropdownItem>Preferências de anúncios</DropdownItem>
          <DropdownItem>Sair (mock)</DropdownItem>
        </DropdownMenu>
      </UncontrolledDropdown>
    </div>
  );
}
