// 同源反向代理：把对 Pages 自身域名的请求转发到 Supabase，
// 使移动网络等无法直接访问 supabase.co 的环境也能正常使用。
export function createProxyHandler(prefix) {
  return async (request, env) => {
    const base = (env.SUPABASE_URL || '').replace(/\/+$/, '');
    const url = new URL(request.url);
    const corsHeaders = {
      'access-control-allow-origin': url.origin || '*',
      'access-control-allow-credentials': 'true',
    };
    if (!base) {
      return new Response(JSON.stringify({ error: 'SUPABASE_URL 未配置' }), {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders },
      });
    }
    // 去掉路径中的前缀部分，得到 Supabase 端的子路径（如 /v1/health）
    let subpath = url.pathname.replace(new RegExp('^/' + prefix), '') || '/';
    if (!subpath.startsWith('/')) subpath = '/' + subpath;
    const target = base + '/' + prefix + subpath + url.search;

    // 复制请求头，剔除会导致 fetch 抛错的逐跳/主机相关头
    const fwdHeaders = new Headers();
    for (const [k, v] of request.headers.entries()) {
      const lk = k.toLowerCase();
      if (['host', 'content-length', 'connection', 'accept-encoding'].includes(lk)) continue;
      fwdHeaders.set(k, v);
    }

    const init = { method: request.method, headers: fwdHeaders, redirect: 'follow' };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer();
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
