import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, CardBody, CardTitle, Col, Input, Label, Row, Spinner, Table } from 'reactstrap';
import { useAuth } from '../auth/AuthContext';

export default function AdminUsers() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    isSystemAdmin: false,
    accountId: '',
    accountRole: 'account_user',
  });

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ru, ra] = await Promise.all([apiFetch('/api/admin/users'), apiFetch('/api/admin/accounts')]);
      const ju = await ru.json().catch(() => ({}));
      const ja = await ra.json().catch(() => ({}));
      if (!ru.ok || !ju?.ok) throw new Error(ju?.error || 'Falha ao listar usuários.');
      if (!ra.ok || !ja?.ok) throw new Error(ja?.error || 'Falha ao listar contas.');
      setUsers(Array.isArray(ju.users) ? ju.users : []);
      setAccounts(Array.isArray(ja.accounts) ? ja.accounts : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const canSubmit = useMemo(() => form.name && form.email && form.password, [form]);

  const onCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        isSystemAdmin: Boolean(form.isSystemAdmin),
        accountId: form.accountId ? Number(form.accountId) : null,
        accountRole: form.accountRole,
      };
      const r = await apiFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.message || j?.error || 'Falha ao criar usuário.');
      setForm({ name: '', email: '', password: '', isSystemAdmin: false, accountId: '', accountRole: 'account_user' });
      await loadAll();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Admin do sistema — Usuários</h2>

      {error && (
        <Alert color="danger" className="small">
          {error}
        </Alert>
      )}

      <Row className="g-3">
        <Col lg={5}>
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">
                Criar usuário
              </CardTitle>

              <div className="mb-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="mb-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                />
              </div>
              <div className="mb-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                />
              </div>
              <div className="mb-2">
                <Label>Admin do sistema</Label>
                <Input
                  type="select"
                  value={form.isSystemAdmin ? 'yes' : 'no'}
                  onChange={(e) => setForm((s) => ({ ...s, isSystemAdmin: e.target.value === 'yes' }))}
                >
                  <option value="no">Não</option>
                  <option value="yes">Sim</option>
                </Input>
              </div>

              <div className="mb-2">
                <Label>Vincular à conta (opcional)</Label>
                <Input
                  type="select"
                  value={form.accountId}
                  onChange={(e) => setForm((s) => ({ ...s, accountId: e.target.value }))}
                >
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Input>
              </div>
              <div className="mb-3">
                <Label>Role na conta</Label>
                <Input
                  type="select"
                  value={form.accountRole}
                  onChange={(e) => setForm((s) => ({ ...s, accountRole: e.target.value }))}
                  disabled={!form.accountId}
                >
                  <option value="account_user">Usuário</option>
                  <option value="account_admin">Admin da conta</option>
                </Input>
              </div>

              <Button color="primary" className="rounded-pill" onClick={onCreate} disabled={!canSubmit || loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" /> Salvando…
                  </>
                ) : (
                  'Criar'
                )}
              </Button>
            </CardBody>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">
                Usuários (últimos 200)
              </CardTitle>
              <div className="table-responsive">
                <Table size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Admin sistema</th>
                      <th>Criado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.is_system_admin ? 'Sim' : 'Não'}</td>
                        <td>{String(u.created_at || '').slice(0, 19).replace('T', ' ')}</td>
                      </tr>
                    ))}
                    {!users.length ? (
                      <tr>
                        <td colSpan={5} className="text-muted">
                          Nenhum usuário.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

