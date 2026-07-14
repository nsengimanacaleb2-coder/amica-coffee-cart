// Adjusts the shared nav bar depending on whether someone is logged in.
document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  const authSlot = document.getElementById('nav-auth-slot');
  if (!authSlot) return;

  if (user) {
    const dashHref = user.role === 'admin' ? 'dashboard-admin.html' : 'dashboard-customer.html';
    authSlot.innerHTML = `
      <a href="${dashHref}">Hi, ${user.name.split(' ')[0]}</a>
      <a href="#" id="logout-link" class="nav-cta">Log out</a>
    `;
    document.getElementById('logout-link').addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = 'index.html';
    });
  } else {
    authSlot.innerHTML = `
      <a href="login.html">Log in</a>
      <a href="register.html" class="nav-cta">Book Now</a>
    `;
  }
});
