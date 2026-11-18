// Navigation, saving, search and removal also work without this enhancement.
const status = document.querySelector('#navigation-status');
const sort = document.querySelector('#sort');
sort?.addEventListener('change', () => sort.form.requestSubmit());

for (const form of document.querySelectorAll('form[method="post"]')) {
  form.addEventListener('submit', event => {
    if (form.hasAttribute('aria-busy')) { event.preventDefault(); return; }
    form.setAttribute('aria-busy', 'true');
    status.textContent = form.dataset.pending || 'Updating library…';
    for (const button of form.querySelectorAll('button[type="submit"]')) {
      button.disabled = true;
      button.setAttribute('data-working', form.dataset.pending || 'Updating…');
    }
  });
}
window.addEventListener('pageshow', () => {
  status.textContent = '';
  for (const form of document.querySelectorAll('form[aria-busy]')) {
    form.removeAttribute('aria-busy');
    for (const button of form.querySelectorAll('[data-working]')) {
      button.disabled = false;
      button.removeAttribute('data-working');
    }
  }
});
const find = document.querySelector('#find-project');
if (find) {
  const hint = document.querySelector('.search-key');
  hint.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  hint.hidden = false;
  document.addEventListener('keydown', event => {
    if (!event.isComposing && (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault(); find.focus(); find.select();
    }
  });
}
document.querySelector('[aria-invalid="true"]')?.focus();
