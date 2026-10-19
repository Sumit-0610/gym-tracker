import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../format';
import Card from '../components/Card';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import './Admin.css';

// Admin page: how many people use the app, who they are, and how the server
// is set up. The server decides who may see it (403 for everyone else); the
// Admin link only shows for admins, but this page never relies on that.
export default function Admin() {
  const users = useApi(() => api.adminUsers(), []);
  const config = useApi(() => api.adminConfig(), []);

  if (users.error?.status === 403) {
    return (
      <div className="page">
        <h1>Admin</h1>
        <Card>
          <p>This page is only for admins.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page admin">
      <h1>Admin</h1>

      <section aria-labelledby="admin-users">
        <h2 id="admin-users" className="admin-heading">
          Users
          {users.data && (
            <span className="admin-count">{users.data.count}</span>
          )}
        </h2>
        {users.loading && <Spinner label="Loading users…" />}
        {users.error && <ErrorMessage error={users.error} />}
        {users.data && (
          <ul className="admin-users">
            {users.data.users.map((u) => (
              <li key={u.id}>
                <Card className="admin-user">
                  <p className="admin-user-name">
                    <strong>{u.username}</strong>
                    {u.is_admin && <span className="admin-tag">Admin</span>}
                  </p>
                  <p className="admin-user-email">
                    {u.email ? (
                      <>
                        {u.email}{' '}
                        <span className="admin-dim">
                          ({u.email_verified ? 'verified' : 'not verified'})
                        </span>
                      </>
                    ) : (
                      <span className="admin-dim">No email</span>
                    )}
                  </p>
                  <dl className="admin-facts">
                    <div>
                      <dt>Joined</dt>
                      <dd>{formatDate(u.created_at)}</dd>
                    </div>
                    <div>
                      <dt>Workouts</dt>
                      <dd>{u.workout_count}</dd>
                    </div>
                    <div>
                      <dt>Last workout</dt>
                      <dd>
                        {u.last_workout_at
                          ? formatDate(u.last_workout_at)
                          : 'None yet'}
                      </dd>
                    </div>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="admin-config">
        <h2 id="admin-config" className="admin-heading">
          Config
        </h2>
        {config.loading && <Spinner label="Loading config…" />}
        {config.error && <ErrorMessage error={config.error} />}
        {config.data && <ConfigCard c={config.data} />}
      </section>
    </div>
  );
}

const onOff = (on) => (on ? 'On' : 'Off');

function ConfigCard({ c }) {
  const rows = [
    ['Environment', c.environment],
    ['Database', c.database],
    ['App address', c.app_url || 'Not set'],
    ['Timezone', c.timezone],
    [
      'AI coach recap',
      c.ai_recap.enabled ? `On (${c.ai_recap.model})` : onOff(false),
    ],
    [
      'Email',
      c.email.enabled
        ? `On (${c.email.provider}, from ${c.email.from})`
        : 'Off',
    ],
    ['Admin emails', c.admin_emails.join(', ') || 'None'],
    ['Login lasts', `${c.session_days} days`],
    ['Node.js', c.node_version],
    ['Server started', new Date(c.started_at).toLocaleString()],
  ];
  return (
    <Card>
      <dl className="admin-config">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="admin-dim admin-note">
        Read-only. These come from the server&apos;s environment variables;
        change them in Render and redeploy. API keys are never shown.
      </p>
    </Card>
  );
}
