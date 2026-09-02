/* Representative User-Agent strings. Keep versions easy to update as browsers change. */
globalThis.MASQUERADE_PRESETS = Object.freeze([
  // Desktop
  { id: 'win-chrome', cat: 'Desktop', name: 'Chrome 140', sub: 'Windows 11 · x64', chip: 'Win', browser: 'Chrome', os: 'Windows', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' },
  { id: 'mac-chrome', cat: 'Desktop', name: 'Chrome 140', sub: 'macOS · Intel', chip: 'mac', browser: 'Chrome', os: 'macOS', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' },
  { id: 'linux-chrome', cat: 'Desktop', name: 'Chrome 140', sub: 'Ubuntu · Linux x64', chip: 'Linux', browser: 'Chrome', os: 'Linux', ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' },
  { id: 'cros-chrome', cat: 'Desktop', name: 'Chrome 140', sub: 'Chromebook · ChromeOS', chip: 'CrOS', browser: 'Chrome', os: 'ChromeOS', ua: 'Mozilla/5.0 (X11; CrOS x86_64 16181.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' },
  { id: 'win-edge', cat: 'Desktop', name: 'Edge 140', sub: 'Windows 11 · x64', chip: 'Win', browser: 'Edge', os: 'Windows', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0' },
  { id: 'win-firefox', cat: 'Desktop', name: 'Firefox 142', sub: 'Windows 11 · x64', chip: 'Win', browser: 'Firefox', os: 'Windows', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0' },
  { id: 'mac-firefox', cat: 'Desktop', name: 'Firefox 142', sub: 'macOS', chip: 'mac', browser: 'Firefox', os: 'macOS', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0' },
  { id: 'mac-safari', cat: 'Desktop', name: 'Safari 18', sub: 'macOS', chip: 'mac', browser: 'Safari', os: 'macOS', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15' },
  { id: 'win-opera', cat: 'Desktop', name: 'Opera 120', sub: 'Windows 11 · x64', chip: 'Win', browser: 'Opera', os: 'Windows', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/120.0.0.0' },

  // Mobile
  { id: 'ios-safari', cat: 'Mobile', name: 'Safari 18', sub: 'iPhone · iOS 18', chip: 'iOS', browser: 'Safari', os: 'iOS', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1' },
  { id: 'ios-chrome', cat: 'Mobile', name: 'Chrome 140', sub: 'iPhone · iOS 18', chip: 'iOS', browser: 'Chrome', os: 'iOS', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1' },
  { id: 'android-chrome', cat: 'Mobile', name: 'Chrome 140', sub: 'Pixel · Android 16', chip: 'And', browser: 'Chrome', os: 'Android', ua: 'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' },
  { id: 'android-samsung', cat: 'Mobile', name: 'Samsung Internet 28', sub: 'Galaxy · Android 16', chip: 'And', browser: 'Samsung Internet', os: 'Android', ua: 'Mozilla/5.0 (Linux; Android 16; SM-S948B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/136.0.0.0 Mobile Safari/537.36' },
  { id: 'android-firefox', cat: 'Mobile', name: 'Firefox 142', sub: 'Android 16 · phone', chip: 'And', browser: 'Firefox', os: 'Android', ua: 'Mozilla/5.0 (Android 16; Mobile; rv:142.0) Gecko/142.0 Firefox/142.0' },

  // Tablet
  { id: 'ipad-safari', cat: 'Tablet', name: 'Safari 18', sub: 'iPad · iPadOS 18', chip: 'iOS', browser: 'Safari', os: 'iPadOS', ua: 'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1' },
  { id: 'android-tablet-chrome', cat: 'Tablet', name: 'Chrome 140', sub: 'Galaxy Tab · Android 16', chip: 'And', browser: 'Chrome', os: 'Android', ua: 'Mozilla/5.0 (Linux; Android 16; SM-X736B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' },
  { id: 'android-tablet-firefox', cat: 'Tablet', name: 'Firefox 142', sub: 'Android 16 · tablet', chip: 'And', browser: 'Firefox', os: 'Android', ua: 'Mozilla/5.0 (Android 16; Tablet; rv:142.0) Gecko/142.0 Firefox/142.0' },

  // Optional crawler identities for rendering and SEO checks.
  { id: 'googlebot', cat: 'Bots', name: 'Googlebot 2.1', sub: 'desktop crawler', chip: 'Bot', browser: 'Googlebot', os: 'Other', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
  { id: 'googlebot-mobile', cat: 'Bots', name: 'Googlebot', sub: 'smartphone crawler', chip: 'Bot', browser: 'Googlebot', os: 'Android', ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.142 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
  { id: 'bingbot', cat: 'Bots', name: 'Bingbot 2.0', sub: 'web crawler', chip: 'Bot', browser: 'Bingbot', os: 'Other', ua: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' }
]);
