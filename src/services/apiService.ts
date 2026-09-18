// Client API adapter to sync state with the PostgreSQL Express backend
export interface ApiSyncErrorDetail {
  label: string;
  error: unknown;
}

// Every write goes through this helper so a failed sync is never silently
// swallowed — it's surfaced as a window event the UI can listen for
// (see Header.tsx), instead of only a console.warn no one will see.
async function request(label: string, url: string, options?: RequestInit): Promise<boolean> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`${res.status} ${res.statusText}${errBody ? `: ${errBody}` : ''}`);
    }
    return true;
  } catch (e) {
    console.warn(`API sync failed for ${label}:`, e);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<ApiSyncErrorDetail>('api-sync-error', { detail: { label, error: e } }));
    }
    return false;
  }
}

const jsonBody = (body: any): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const api = {
  async getBootstrap() {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      console.error('Bootstrap fetch failed — falling back to local/demo data. Check the server DB connection (env vars).', e);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<ApiSyncErrorDetail>('api-bootstrap-error', { detail: { label: 'bootstrap', error: e } }));
      }
      return null;
    }
  },

  saveUser(user: any) {
    const method = user.id ? 'PUT' : 'POST';
    const url = user.id ? `/api/users/${user.id}` : '/api/users';
    return request('saveUser', url, { method, ...jsonBody(user) });
  },

  deleteUser(userId: string) {
    return request('deleteUser', `/api/users/${userId}`, { method: 'DELETE' });
  },

  saveRole(role: any) {
    return request('saveRole', '/api/roles', { method: 'POST', ...jsonBody(role) });
  },

  deleteRole(roleId: string) {
    return request('deleteRole', `/api/roles/${roleId}`, { method: 'DELETE' });
  },

  saveCompany(company: any) {
    return request('saveCompany', '/api/companies', { method: 'POST', ...jsonBody(company) });
  },

  deleteCompany(companyId: string) {
    return request('deleteCompany', `/api/companies/${companyId}`, { method: 'DELETE' });
  },

  saveWarehouse(warehouse: any) {
    return request('saveWarehouse', '/api/warehouses', { method: 'POST', ...jsonBody(warehouse) });
  },

  deleteWarehouse(warehouseId: string) {
    return request('deleteWarehouse', `/api/warehouses/${warehouseId}`, { method: 'DELETE' });
  },

  saveCustomer(customer: any) {
    return request('saveCustomer', '/api/customers', { method: 'POST', ...jsonBody(customer) });
  },

  deleteCustomer(customerId: string) {
    return request('deleteCustomer', `/api/customers/${customerId}`, { method: 'DELETE' });
  },

  saveTeam(team: any) {
    const method = team.id ? 'PUT' : 'POST';
    const url = team.id ? `/api/teams/${team.id}` : '/api/teams';
    return request('saveTeam', url, { method, ...jsonBody(team) });
  },

  deleteTeam(teamId: string) {
    return request('deleteTeam', `/api/teams/${teamId}`, { method: 'DELETE' });
  },

  createRequest(req: any) {
    return request('createRequest', '/api/requests', { method: 'POST', ...jsonBody(req) });
  },

  updateRequest(id: string, req: any) {
    return request('updateRequest', `/api/requests/${id}`, { method: 'PUT', ...jsonBody(req) });
  },

  deleteRequest(id: string) {
    return request('deleteRequest', `/api/requests/${id}`, { method: 'DELETE' });
  },

  addBudgetTransaction(txn: any) {
    return request('addBudgetTransaction', '/api/budget-transactions', { method: 'POST', ...jsonBody(txn) });
  },

  saveForm(form: any) {
    return request('saveForm', '/api/forms', { method: 'POST', ...jsonBody(form) });
  },

  saveFormAssignment(fa: any) {
    return request('saveFormAssignment', '/api/form-assignments', { method: 'POST', ...jsonBody(fa) });
  },

  addAuditLog(log: any) {
    return request('addAuditLog', '/api/audit-logs', { method: 'POST', ...jsonBody(log) });
  },

  addNotification(notif: any) {
    return request('addNotification', '/api/notifications', { method: 'POST', ...jsonBody(notif) });
  },

  markNotificationRead(id: string, isRead: boolean = true) {
    return request('markNotificationRead', `/api/notifications/${id}`, { method: 'PUT', ...jsonBody({ isRead }) });
  },

  updateSettings(settings: any) {
    return request('updateSettings', '/api/settings', { method: 'PUT', ...jsonBody(settings) });
  },

  saveAdditionalField(field: any) {
    return request('saveAdditionalField', '/api/additional-fields', { method: 'POST', ...jsonBody(field) });
  },

  deleteAdditionalField(fieldId: string) {
    return request('deleteAdditionalField', `/api/additional-fields/${fieldId}`, { method: 'DELETE' });
  }
};
