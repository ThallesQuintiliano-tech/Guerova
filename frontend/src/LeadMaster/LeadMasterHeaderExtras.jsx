import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Button,
  Input,
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { Typeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import { mockKanban, flattenKanbanForSearch } from './mockData';
import { loadKanban } from './leadMasterStorage';
import { useAuth } from '../auth/AuthContext';

export default function LeadMasterHeaderExtras() {
  const navigate = useNavigate();
  const { user, accounts, accountId, setActiveAccountId, logout } = useAuth();
  const [leadOptions, setLeadOptions] = useState(() => flattenKanbanForSearch(loadKanban(mockKanban)));

  const refreshLeadOptions = useCallback(() => {
    setLeadOptions(flattenKanbanForSearch(loadKanban(mockKanban)));
  }, []);

  const activeAccount = useMemo(
    () => accounts.find((a) => String(a.id) === String(accountId)) || accounts[0] || null,
    [accounts, accountId]
  );

  const initials = useMemo(() => {
    const name = String(user?.name || '').trim();
    if (!name) return 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || 'U';
    const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (a + b).toUpperCase();
  }, [user?.name]);

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
          <div className="lm-avatar">{initials}</div>
          <div className="d-none d-md-block text-start lh-sm">
            <div className="fw-bold small">{user?.name || 'Usuário'}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              {activeAccount ? activeAccount.name : 'Minha Conta'}{' '}
              <span className="ms-1 text-muted">▾</span>
            </div>
          </div>
        </DropdownToggle>
        <DropdownMenu end>
          <DropdownItem header>Conta</DropdownItem>
          {accounts.length > 1 ? (
            <div className="px-3 pt-2 pb-2" style={{ minWidth: 240 }}>
              <div className="text-muted small mb-1">Conta ativa</div>
              <Input type="select" value={accountId || ''} onChange={(e) => setActiveAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </Input>
            </div>
          ) : (
            <DropdownItem disabled={!activeAccount}>
              {activeAccount ? `Conta: ${activeAccount.name}` : 'Sem conta'}
            </DropdownItem>
          )}
          <DropdownItem divider />
          <DropdownItem
            onClick={async () => {
              await logout();
              navigate('/pages/login', { replace: true });
            }}
          >
            Sair
          </DropdownItem>
        </DropdownMenu>
      </UncontrolledDropdown>
    </div>
  );
}
