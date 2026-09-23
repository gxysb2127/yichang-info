// 自包含同源代理（auth），不依赖共享模块，避免导入导致的 1101
export async function onRequest(context) {
  const { request, env } = context;
  let url;
  try {
    url = new URL(request.url);
    const base = (env.SUPABASE_URL || '').replace(/\/+$/, '');
    if (!base) {
      return jsonResp(500, url, { error: 'SUPABASE_URL 未配置' });
    }
    let subpath = url.pathname.replace(/^\/auth/, '') || '/';
    if (!subpath.startsWith('/')) subpath = '/' + subpath;
    const target = base + '/auth' + subpath + url.search;

    const headers = new Headers();
    for (const [k, v] of request.headers.entries()) {
      const lk = k.toLowerCase();
      if (['host', 'content-length', 'connection', 'accept-encoding'].includes(lk)) continue;
      headers.set(k, v);
    }
    const init = { method: request.method, headers, redirect: 'follow' };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer();
    }
    const resp = await fetch(target, init);
    const outHeaders = new Headers(resp.headers);
    outHeaders.set('access-control-allow-origin', url.origin || '*');
    outHeaders.set('access-control-allow-credentials', 'true');
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: outHeaders,
    });
  } catch (err) {
    try {
      return jsonResp(500, url, { error: 'PROXY_ERR: ' + (err && err.message), stack: String(err && err.stack).slice(0, 400) });
    } catch (e2) {
      return new Response('PROXY_FATAL: ' + err, { status: 500 });
    }
  }
}

function jsonResp(status, url, obj) {
  const h = { 'content-type': 'application/json; charset=utf-8' };
  if (url) {
    h['access-control-allow-origin'] = url.origin || '*';
    h['access-control-allow-credentials'] = 'true';
  }
  return new Response(JSON.stringify(obj), { status, headers: h });
}
