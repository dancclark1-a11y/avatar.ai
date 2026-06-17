// Simple hash-based router
// Usage:
//   const router = new Router();
//   router.on('/', handler)
//        .on('/chat/:id', ({ id }) => ...)
//        .on('*', fallback);

export class Router {
  constructor() {
    this._routes = [];
    this._handleChange = this._handleChange.bind(this);
    window.addEventListener('hashchange', this._handleChange);
    window.addEventListener('load', this._handleChange);
  }

  on(pattern, handler) {
    const paramNames = [];
    const regexStr = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/:([\w]+)/g, (_, name) => { paramNames.push(name); return '([^/]+)'; });
    this._routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, handler, isWild: pattern === '*' });
    return this;
  }

  navigate(path) {
    window.location.hash = path;
  }

  _handleChange() {
    const hash = window.location.hash.slice(1) || '/';
    for (const route of this._routes) {
      if (route.isWild) continue;
      const match = hash.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((n, i) => { params[n] = decodeURIComponent(match[i + 1]); });
        route.handler(params);
        return;
      }
    }
    const wild = this._routes.find(r => r.isWild);
    if (wild) wild.handler({});
  }
}
