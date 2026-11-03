/* Local educational adaptation. Original public frontend remains in _nuxt/. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const method = (options.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    if (url.pathname.startsWith('/api/') && method !== 'GET' && method !== 'HEAD') {
      // Preserve the form's normal success state without contacting a business.
      window.dispatchEvent(new CustomEvent('local-demo-submitted'));
      return new Response(JSON.stringify({ success: true, status: 'success', message: 'Demo request completed locally.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
      const response = await nativeFetch(url.pathname + '.json');
      if (url.pathname === '/api/blog') {
        const {handleBlogQuery} = await import('./blog-data.mjs');
        return new Response(JSON.stringify(handleBlogQuery(await response.json(), url.searchParams)), {headers:{'Content-Type':'application/json'}});
      }
      return response;
    }
    return nativeFetch(input, options);
  };
  window.addEventListener('local-demo-submitted', () => {
    let note = document.getElementById('local-demo-result');
    if (!note) {
      note = document.createElement('div');
      note.id = 'local-demo-result'; note.setAttribute('role', 'status');
      note.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);max-width:calc(100% - 32px);width:max-content;background:#f3f3e9;color:#e33529;border:1px solid currentColor;border-radius:12px;padding:16px 22px;z-index:999999;font:14px/1.35 sans-serif;text-align:center';
      document.body.append(note);
    }
    note.textContent = 'Demo completed. No request was sent to the company.';
    setTimeout(() => note.remove(), 8000);
  });
  const describeControls = () => {
    const ball = document.querySelector('.preloader__ball-wrap');
    if (ball && !ball.hasAttribute('aria-label')) ball.setAttribute('aria-label', 'Bounce the ball to enter the site');
    document.querySelectorAll('a[href="+18584492691"]').forEach(link => link.href = 'tel:+18584492691');
    document.querySelectorAll('.btn-slide__mob').forEach(button => {
      if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', button.classList.contains('prev') ? 'Previous service' : 'Next service');
    });
    const form = document.querySelector('form, main.book-now');
    if (form && !form.querySelector('.local-demo-note')) {
      const note = document.createElement('p');
      note.className = 'local-demo-note p2-medium';
      note.style.cssText = 'position:fixed;bottom:12px;right:16px;max-width:calc(100% - 32px);font-size:11px;line-height:1.4;opacity:.8;z-index:1000';
      note.textContent = 'Educational demo. Requests are not sent to the company.';
      form.append(note);
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    describeControls();
    new MutationObserver(describeControls).observe(document.body, { childList: true, subtree: true });
  });
})();
