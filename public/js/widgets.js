// ---------- Theme (dark mode + font size) ----------
function applyStoredTheme() {
  const theme = localStorage.getItem('amica_theme') || 'light';
  const scale = localStorage.getItem('amica_font_scale') || '1';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.setProperty('--font-scale', scale);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('amica_theme', next);
}

function adjustFontScale(delta) {
  let scale = parseFloat(localStorage.getItem('amica_font_scale') || '1');
  scale = Math.min(1.3, Math.max(0.85, scale + delta));
  localStorage.setItem('amica_font_scale', scale);
  document.documentElement.style.setProperty('--font-scale', scale);
}

applyStoredTheme();

// ---------- Simple FAQ chatbot (keyword matching, no external AI service needed) ----------
const CHATBOT_FAQ = [
  { keywords: ['price', 'cost', 'how much', 'rate'], answer: "Our carts range from about $120–$320/day, and packages start around $220. Check the Coffee Carts and Packages pages for exact pricing." },
  { keywords: ['book', 'booking', 'reserve'], answer: 'You can book a cart from the Coffee Carts page — pick a cart, choose your date, and submit a booking request. You\'ll need an account first.' },
  { keywords: ['cancel'], answer: 'You can cancel a Pending or Approved booking anytime from your Dashboard under "My Bookings".' },
  { keywords: ['reschedule', 'change date'], answer: 'Pending bookings can be rescheduled from your Dashboard. Approved bookings — contact us directly and we\'ll help.' },
  { keywords: ['payment', 'pay', 'mobile money', 'momo', 'card'], answer: 'We accept Cash, Mobile Money, and Bank Transfer. Online card payment is available on select bookings once approved.' },
  { keywords: ['location', 'area', 'where', 'travel'], answer: 'We serve Kigali and surrounding areas. Enter your event location on the booking form and we\'ll confirm travel details.' },
  { keywords: ['menu', 'drink', 'coffee', 'tea'], answer: 'Our menu includes Espresso, Cappuccino, Latte, Mocha, Americano, Hot Chocolate, Tea, and snacks — see the full Menu page.' },
  { keywords: ['contact', 'phone', 'email', 'whatsapp'], answer: 'Email hello@amicahouse.com, call +250 780 000 000, or use the WhatsApp button in the corner of the page.' },
  { keywords: ['package'], answer: 'We offer Wedding, Birthday, Corporate, Graduation, and VIP packages — see the Packages page for what\'s included.' },
];

function chatbotReply(text) {
  const lower = text.toLowerCase();
  const match = CHATBOT_FAQ.find((f) => f.keywords.some((k) => lower.includes(k)));
  return match ? match.answer : "I'm not sure about that one — try asking about pricing, booking, payment, or our menu, or reach us directly via the Contact section.";
}

function injectSiteWidgets() {
  // Skip link
  if (!document.querySelector('.skip-link')) {
    const skip = document.createElement('a');
    skip.href = '#main-content';
    skip.className = 'skip-link';
    skip.textContent = 'Skip to main content';
    document.body.prepend(skip);
  }

  // Accessibility controls, placed inside the nav auth slot's parent
  const navLinks = document.querySelector('.nav-links');
  if (navLinks && !document.querySelector('.a11y-controls')) {
    const controls = document.createElement('span');
    controls.className = 'a11y-controls';
    controls.innerHTML = `
      <button class="a11y-btn" id="font-dec" title="Decrease text size" aria-label="Decrease text size">A-</button>
      <button class="a11y-btn" id="font-inc" title="Increase text size" aria-label="Increase text size">A+</button>
      <button class="a11y-btn" id="theme-toggle" title="Toggle dark mode" aria-label="Toggle dark mode">◐</button>
    `;
    navLinks.appendChild(controls);
    document.getElementById('font-dec').addEventListener('click', () => adjustFontScale(-0.05));
    document.getElementById('font-inc').addEventListener('click', () => adjustFontScale(0.05));
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  }

  // WhatsApp click-to-chat
  if (!document.querySelector('.whatsapp-float')) {
    const wa = document.createElement('a');
    wa.href = 'https://wa.me/250780000000?text=' + encodeURIComponent('Hi Amica House, I have a question about booking a coffee cart.');
    wa.className = 'whatsapp-float';
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'Chat with us on WhatsApp');
    wa.textContent = '💬';
    document.body.appendChild(wa);
  }

  // Chatbot widget
  if (!document.querySelector('.chat-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'chat-toggle';
    toggleBtn.setAttribute('aria-label', 'Open chat assistant');
    toggleBtn.textContent = '☕';
    document.body.appendChild(toggleBtn);

    const win = document.createElement('div');
    win.className = 'chat-window';
    win.innerHTML = `
      <div class="chat-header">Amica House Assistant</div>
      <div class="chat-body" id="chat-body">
        <div class="chat-msg bot">Hi! Ask me about pricing, booking, payment methods, or our menu.</div>
      </div>
      <div class="chat-suggestions">
        <button data-q="How much does a cart cost?">Pricing</button>
        <button data-q="How do I book?">Booking</button>
        <button data-q="What payment methods?">Payment</button>
      </div>
      <div style="padding:10px;border-top:1px solid var(--border);display:flex;gap:6px;">
        <input type="text" id="chat-input" placeholder="Type a question…" style="flex:1;">
        <button class="btn btn-primary btn-sm" id="chat-send">Send</button>
      </div>
    `;
    document.body.appendChild(win);

    toggleBtn.addEventListener('click', () => win.classList.toggle('open'));

    function sendMessage(text) {
      if (!text.trim()) return;
      const body = document.getElementById('chat-body');
      body.insertAdjacentHTML('beforeend', `<div class="chat-msg user">${text}</div>`);
      body.insertAdjacentHTML('beforeend', `<div class="chat-msg bot">${chatbotReply(text)}</div>`);
      body.scrollTop = body.scrollHeight;
    }

    document.getElementById('chat-send').addEventListener('click', () => {
      const input = document.getElementById('chat-input');
      sendMessage(input.value);
      input.value = '';
    });
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('chat-send').click();
    });
    win.querySelectorAll('.chat-suggestions button').forEach((b) => {
      b.addEventListener('click', () => sendMessage(b.dataset.q));
    });
  }
}

document.addEventListener('DOMContentLoaded', injectSiteWidgets);
