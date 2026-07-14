// Small wrapper around fetch() that attaches the JWT and parses JSON responses.
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('amica_token');
}

function getUser() {
  const raw = localStorage.getItem('amica_user');
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem('amica_token', token);
  localStorage.setItem('amica_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('amica_token');
  localStorage.removeItem('amica_user');
}

async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

// Redirects away if not logged in / wrong role. Call at the top of protected pages.
function guardPage(requiredRole) {
  const user = getUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  if (requiredRole && user.role !== requiredRole) {
    window.location.href = user.role === 'admin' ? 'dashboard-admin.html' : 'dashboard-customer.html';
    return null;
  }
  return user;
}
