import React, { Fragment } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

import { IoIosCalendar } from 'react-icons/io';

import PerfectScrollbar from 'react-perfect-scrollbar';

import {
  DropdownToggle,
  DropdownMenu,
  Nav,
  Col,
  Row,
  Button,
  NavItem,
  NavLink,
  UncontrolledTooltip,
  UncontrolledButtonDropdown,
} from 'reactstrap';

import { toast, Bounce } from 'react-toastify';

import { faAngleDown } from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import 'react-toastify/dist/ReactToastify.css';

import city3 from '../../../assets/utils/images/dropdown-header/city3.jpg';
import avatar1 from '../../../assets/utils/images/avatars/1.jpg';

function UserBox() {
  const { user, accounts, accountId, setActiveAccountId, logout } = useAuth();
  const navigate = useNavigate();

  const activeAccount = accounts.find((a) => String(a.id) === String(accountId)) || accounts[0] || null;

  const notify2 = () =>
    toast("Você não tem novos itens no calendário hoje.", {
      transition: Bounce,
      closeButton: true,
      autoClose: 4000,
      position: 'bottom-center',
      type: 'success',
    });

  const onLogout = async () => {
    await logout();
    navigate('/pages/login', { replace: true });
  };

  return (
    <Fragment>
      <div className="header-btn-lg pe-0">
        <div className="widget-content p-0">
          <div className="widget-content-wrapper">
            <div className="widget-content-left">
              <UncontrolledButtonDropdown>
                <DropdownToggle color="link" className="p-0">
                  <img width={42} className="rounded-circle" src={avatar1} alt="" />
                  <FontAwesomeIcon className="ms-2 opacity-8" icon={faAngleDown} />
                </DropdownToggle>
                <DropdownMenu className="rm-pointers dropdown-menu-lg">
                  <div className="dropdown-menu-header">
                    <div className="dropdown-menu-header-inner bg-info">
                      <div
                        className="menu-header-image opacity-2"
                        style={{
                          backgroundImage: 'url(' + city3 + ')',
                        }}
                      />
                      <div className="menu-header-content text-start">
                        <div className="widget-content p-0">
                          <div className="widget-content-wrapper">
                            <div className="widget-content-left me-3">
                              <img width={42} className="rounded-circle" src={avatar1} alt="" />
                            </div>
                            <div className="widget-content-left">
                              <div className="widget-heading">{user?.name || 'Usuário'}</div>
                              <div className="widget-subheading opacity-8">{user?.email || ''}</div>
                              {activeAccount ? (
                                <div className="widget-subheading opacity-8">
                                  Conta: <b>{activeAccount.name}</b>
                                </div>
                              ) : null}
                            </div>
                            <div className="widget-content-right me-2">
                              <Button className="btn-pill btn-shadow btn-shine" color="focus" onClick={onLogout}>
                                Sair
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="scroll-area-xs" style={{ height: '150px' }}>
                    <PerfectScrollbar>
                      <Nav vertical>
                        <NavItem className="nav-item-header">Conta</NavItem>
                        {accounts.length > 1 ? (
                          <NavItem>
                            <div className="px-3 pt-2 pb-3">
                              <Label className="small text-muted mb-1">Conta ativa</Label>
                              <Input
                                type="select"
                                value={accountId || ''}
                                onChange={(e) => setActiveAccountId(e.target.value)}
                              >
                                {accounts.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name} ({a.role})
                                  </option>
                                ))}
                              </Input>
                            </div>
                          </NavItem>
                        ) : (
                          <NavItem>
                            <NavLink href="#" onClick={(e) => e.preventDefault()}>
                              Preferências de anúncios
                            </NavLink>
                          </NavItem>
                        )}
                        <NavItem className="nav-item-header">Atalhos</NavItem>
                        <NavItem>
                          <NavLink href="#" onClick={(e) => e.preventDefault()}>
                            Notificações
                            <div className="ms-auto badge rounded-pill bg-info">8</div>
                          </NavLink>
                        </NavItem>
                      </Nav>
                    </PerfectScrollbar>
                  </div>
                </DropdownMenu>
              </UncontrolledButtonDropdown>
            </div>
            <div className="widget-content-left  ms-3 header-user-info">
              <div className="widget-heading">{user?.name || 'Usuário'}</div>
              <div className="widget-subheading">{activeAccount ? activeAccount.name : 'Minha conta'}</div>
            </div>
            <div className="widget-content-right header-user-info ms-3">
              <Button className="btn-shadow p-1" size="sm" onClick={notify2} color="info" id="Tooltip-1">
                <IoIosCalendar color="#ffffff" fontSize="20px" />
              </Button>
              <UncontrolledTooltip placement="bottom" target={'Tooltip-1'}>
                Ver notificações
              </UncontrolledTooltip>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

export default UserBox;
