const CACHE_NAME = 'word-card-v4';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './韓文智慧單字卡(完整版).html',
  './日文智慧單字卡(完整版).html',
  './西文智慧單字卡(完整版).html',
  './法文智慧單字卡(完整版).html',
  './英文智慧單字卡(完整版).html'
];

// 安裝事件：逐一快取檔案
self.addEventListener('install', event => {
  console.log('[SW] 正在安裝 v4...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 使用 map 逐一添加，確保單一檔案 404 不會中斷整個 SW 的安裝
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`[SW] 無法快取資源 (可能檔案不存在): ${url}`);
          });
        })
      );
    })
  );
  self.skipWaiting(); // 強制跳過等待，立即接管
});

// 激活事件：清理舊快取並接管頁面
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 刪除過期快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] 激活完成，開始接管受控頁面');
      return self.clients.claim();
    })
  );
});

// 請求攔截：網路優先 (Network First)
self.addEventListener('fetch', event => {
  // 只攔截 GET 請求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 成功取得回應則放入快取
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 斷網或失敗時回退到快取
        return caches.match(event.request).then(match => {
          if (match) return match;
          // 如果連快取都沒有，且是頁面請求，可以回傳 index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});