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
for (const input of document.querySelectorAll('input[aria-required="true"]')) input.required = true;
for (const [name, limit] of [['url', 2048], ['title', 140], ['q', 160]]) {
  const input = document.querySelector(`input[name="${name}"]`);
  if (input) input.maxLength = limit;
}
document.querySelector('input[aria-invalid="true"]')?.focus();
