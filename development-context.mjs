// Shared by the game and standalone story players. No flag = production keys.
export function isDevelopment(search = globalThis.location?.search || '') {
 return new URLSearchParams(search).get('dev') === '1';
}
export function storageKey(key, search = globalThis.location?.search || '') {
 return isDevelopment(search) ? 'cherry-development:' + key : key;
}
export function developmentHref(path, search = globalThis.location?.search || '') {
 if (!isDevelopment(search)) return path;
 const url = new URL(path, 'https://development.local');
 url.searchParams.set('dev', '1');
 if (url.pathname === '/') url.searchParams.set('view', 'game');
 return path.replace(/[?#].*$/, '') + url.search + url.hash;
}
