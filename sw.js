// Service Worker for 异常信息填报系统 V3
const CACHE_NAME = 'yichang-info-v7';
const CDN_CACHE = 'cdn-v7';

// 只缓存CDN静态资源
const cdnUrls = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// 安装 - 预缓存CDN资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CDN_CACHE)
      .then(cache => cache.addAll(cdnUrls))
      .then(() => self.skipWaiting())
  );
});

// 激活 - 清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CDN_CACHE)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截 - 网络优先，CDN降级缓存
self.addEventListener('fetch', event => {
  // 跳过非GET请求（INSERT/UPDATE等不拦截）
  if (event.request.method !== 'GET') return;
  
  // Supabase API请求不拦截，直接走网络
  if (event.request.url.includes('supabase')) return;
  
  // index.html 永远走网络（确保用户拿到最新代码）
  if (event.request.url.includes('index.html') || 
      event.request.url.endsWith('/') ||
      event.request.url.endsWith('yichang-info')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  
  // CDN资源：缓存优先，网络降级
  if (event.request.url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CDN_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }
  
  // 其他请求：网络优先
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
