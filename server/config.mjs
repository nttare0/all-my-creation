export function siteConfig(env, production) {
  const base = env.PUBLIC_ORIGIN ? URL.parse(env.PUBLIC_ORIGIN) : null;
  if (env.PUBLIC_ORIGIN && (!base || !['https:', 'http:'].includes(base.protocol) || base.href !== `${base.origin}/` || (production && base.protocol !== 'https:'))) {
    throw new Error('Set PUBLIC_ORIGIN to the site origin only (HTTPS required in production).');
  }
  const contact = env.CONTACT_EMAIL || '';
  if (contact && !/^[^\s@?&<>]+@[^\s@?&<>]+\.[a-z]{2,}$/i.test(contact)) throw new Error('CONTACT_EMAIL must be an email address.');
  return { publicOrigin: base?.origin, production, contact };
}
