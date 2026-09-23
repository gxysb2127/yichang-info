// 同源反向代理：把对 Pages 自身域名的请求转发到 Supabase，
// 使移动网络等无法直接访问 supabase.co 的环境也能正常使用。
export function createProxyHandler(prefix) {
  return async (request, env) => {
    const base = (env.SUPABASE_URL || '').replace(/\/+$/, '');
    if (!base) {
      return new Response(JSON.stringify({ error: 'SUPABASE_URL 未配置' }), {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }
    const url = new URL(request.url);
    const target = base + '/' + prefix + url.search;
    const init = {
      method: request.method,
      headers: request.headers,
      redirect: 'follow',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
      init.duplex = 'half';
    }
    const resp = await fetch(target, init);
    const headers = new Headers(resp.headers);
    headers.set('access-control-allow-origin', url.origin || '*');
    headers.set('access-control-allow-credentials', 'true');
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers,
    });
  };
}
