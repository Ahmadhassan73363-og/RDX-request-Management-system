import { pool } from './server/db.js';
import app from './server/app.js';
import http from 'http';

async function main() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const body = {
    status: 'pending_president',
    currentApprovalStepIndex: 4,
    currentApproverRole: 'President',
    approvalHistory: [
      {
        id: 'ah-1789740418347',
        action: 'approve',
        userId: 'usr-1',
        comments: 'Approved through workflow',
        roleName: 'Super Admin',
        userName: 'Alexander Vance jake',
        ipAddress: '192.168.1.104',
        stepOrder: 1,
        timestamp: '2026-09-18T14:06:58.347Z',
        userEmail: 'alexander.vance@enterprise.com',
        digitalSignature: 'TYPED_SIGNATURE:awdawd:2026-09-18T14:06:58.203Z'
      },
      {
        id: 'ah-1789740422755',
        action: 'approve',
        userId: 'usr-1',
        comments: 'Approved through workflow',
        roleName: 'Super Admin',
        userName: 'Alexander Vance jake',
        ipAddress: '192.168.1.100',
        stepOrder: 2,
        timestamp: '2026-09-18T14:07:02.755Z',
        userEmail: 'alexander.vance@enterprise.com',
        digitalSignature: 'TYPED_SIGNATURE:awdaw:2026-09-18T14:07:02.452Z'
      },
      {
        id: 'ah-1789741968864',
        action: 'approve',
        userId: 'usr-6',
        comments: 'Approved step 3',
        roleName: 'HOD',
        userName: 'Elena Rostova',
        ipAddress: '192.168.1.110',
        stepOrder: 3,
        timestamp: '2026-09-18T14:32:48.864Z',
        userEmail: 'elena.rostova@enterprise.com',
        digitalSignature: 'TYPED_SIGNATURE:Elena:2026-09-18T14:32:48.000Z'
      }
    ]
  };

  const res = await fetch(`${baseUrl}/api/requests/req-1789734531600`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);

  server.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
