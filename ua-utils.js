/* Pure helpers shared by the service worker and the Node validation tests. */
const MASQUERADE_MAX_UA_LENGTH = 512;
const MASQUERADE_CLIENT_HINT_HEADERS = [
  'sec-ch-ua', 'sec-ch-ua-full-version-list', 'sec-ch-ua-mobile',
  'sec-ch-ua-platform', 'sec-ch-ua-platform-version', 'sec-ch-ua-arch',
  'sec-ch-ua-bitness', 'sec-ch-ua-model', 'sec-ch-ua-form-factor', 'sec-ch-ua-wow64'
];

function masqueradeValidateUserAgent(value) {
  const ua = String(value ?? '').trim();
  if (!ua) throw new Error('Enter a User-Agent string first.');
  if (ua.length > MASQUERADE_MAX_UA_LENGTH) throw new Error(`User-Agent strings must be ${MASQUERADE_MAX_UA_LENGTH} characters or fewer.`);
  if (/[\u0000-\u001f\u007f]/.test(ua)) throw new Error('User-Agent strings cannot contain control characters.');
  return ua;
}

function masqueradeIsMobileUA(ua) { return /\bMobile\b|iPhone|iPod/.test(ua); }

function masqueradePlatformOf(ua) {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/CrOS/.test(ua)) return 'Chrome OS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return null;
}

function masqueradeAndroidModel(ua) {
  const parenthesized = ua.match(/\(([^)]*)\)/)?.[1];
  if (!parenthesized) return null;
  const parts = parenthesized.split(';').map((part) => part.trim());
  const androidIndex = parts.findIndex((part) => /^Android\b/i.test(part));
  if (androidIndex < 0) return null;
  for (const part of parts.slice(androidIndex + 1)) {
    if (!part || /^(?:Mobile|Tablet|wv|rv:[\d.]+|[a-z]{2}(?:[-_][A-Z]{2})?)$/i.test(part)) continue;
    const model = part.replace(/\s+Build\/.*$/i, '').trim();
    if (model && !/^Build\//i.test(model)) return model;
  }
  return null;
}

function masqueradeBrandListFor(ua, chromiumVersion) {
  const version = chromiumVersion || '99';
  const edge = ua.match(/Edg\/(\d+)/);
  const opera = ua.match(/OPR\/(\d+)/);
  const samsung = ua.match(/SamsungBrowser\/(\d+)/);
  const product = edge ? ['Microsoft Edge', edge[1]] : opera ? ['Opera', opera[1]] : samsung ? ['Samsung Internet', samsung[1]] : ['Google Chrome', version];
  return [product, ['Chromium', version], ['Not?A_Brand', '24']].map(([name, value]) => `"${name}";v="${value}"`).join(', ');
}

function masqueradeBuildRequestHeaders(ua) {
  const headers = [{ header: 'user-agent', operation: 'set', value: ua }];
  const chromium = ua.match(/(?:Chrome|CriOS)\/(\d+)/);
  const isChromium = Boolean(chromium) || /(?:Edg|OPR|SamsungBrowser)\//.test(ua);
  if (isChromium) {
    headers.push(
      { header: 'sec-ch-ua', operation: 'set', value: masqueradeBrandListFor(ua, chromium?.[1]) },
      { header: 'sec-ch-ua-mobile', operation: 'set', value: masqueradeIsMobileUA(ua) ? '?1' : '?0' }
    );
    const platform = masqueradePlatformOf(ua);
    if (platform) headers.push({ header: 'sec-ch-ua-platform', operation: 'set', value: `"${platform}"` });
    const granularHints = [MASQUERADE_CLIENT_HINT_HEADERS[1], ...MASQUERADE_CLIENT_HINT_HEADERS.slice(4)];
    for (const header of granularHints) headers.push({ header, operation: 'remove' });
  } else {
    for (const header of MASQUERADE_CLIENT_HINT_HEADERS) headers.push({ header, operation: 'remove' });
  }
  return headers;
}

function masqueradeBuildUserAgentOverride(ua) {
  const chromium = ua.match(/(?:Chrome|CriOS)\/(\d+(?:\.\d+)*)/);
  const isChromium = Boolean(chromium) || /(?:Edg|OPR|SamsungBrowser)\//.test(ua);
  const platform = masqueradePlatformOf(ua);
  const navigatorPlatform = /Windows/.test(ua) ? 'Win32'
    : /Macintosh|Mac OS X/.test(ua) ? 'MacIntel'
      : /iPad/.test(ua) ? 'MacIntel'
        : /iPhone|iPod/.test(ua) ? 'iPhone'
          : /Android/.test(ua) ? 'Linux armv8l'
            : 'Linux x86_64';
  const override = {
    userAgent: ua,
    platform: navigatorPlatform
  };

  // Chrome only exposes userAgentData metadata for Chromium-shaped identities.
  if (!isChromium) return override;

  const fullVersion = ua.match(/(?:Chrome|CriOS|Edg|OPR|SamsungBrowser)\/(\d+(?:\.\d+)*)/)?.[1] || '99.0.0.0';
  const majorVersion = fullVersion.split('.')[0];
  const edge = ua.match(/Edg\/(\d+)/);
  const opera = ua.match(/OPR\/(\d+)/);
  const samsung = ua.match(/SamsungBrowser\/(\d+)/);
  const product = edge ? ['Microsoft Edge', edge[1]] : opera ? ['Opera', opera[1]] : samsung ? ['Samsung Internet', samsung[1]] : ['Google Chrome', majorVersion];
  const brands = [product, ['Chromium', majorVersion], ['Not?A_Brand', '24']].map(([brand, version]) => ({ brand, version }));
  const fullVersionList = [product, ['Chromium', fullVersion], ['Not?A_Brand', '24']].map(([brand, version]) => ({ brand, version }));
  const androidModel = masqueradeAndroidModel(ua) || '';
  const platformVersion = platform === 'Windows' ? '10.0'
    : platform === 'macOS' ? (ua.match(/Mac OS X ([0-9_]+)/)?.[1] || '10_15_7').replaceAll('_', '.')
      : platform === 'Chrome OS' ? (ua.match(/CrOS [^ ]+ ([^;)]+)/)?.[1] || '0.0.0')
        : platform === 'Android' ? (ua.match(/Android ([^;]+)/)?.[1] || '0')
          : '';
  override.userAgentMetadata = {
    brands,
    fullVersionList,
    platform: platform || 'Linux',
    platformVersion,
    architecture: platform === 'Android' ? 'arm' : 'x86',
    model: androidModel,
    mobile: masqueradeIsMobileUA(ua),
    bitness: /Win64|x86_64|WOW64/.test(ua) ? '64' : '',
    wow64: /WOW64/.test(ua),
    formFactors: /iPad|Tablet|Android(?!.*Mobile)/.test(ua) ? ['Tablet'] : masqueradeIsMobileUA(ua) ? ['Mobile'] : ['Desktop']
  };
  return override;
}

function masqueradeDescribeUserAgent(ua) {
  const browserMatchers = [
    ['Googlebot', /Googlebot(?:-\w+)?\/([\d.]+)/i],
    ['Bingbot', /bingbot\/([\d.]+)/i],
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/i],
    ['Edge', /(?:Edg|EdgA|EdgiOS)\/([\d.]+)/i],
    ['Opera', /(?:OPR|Opera Mini)\/([\d.]+)/i],
    ['Firefox', /(?:FxiOS|Firefox)\/([\d.]+)/i],
    ['Safari', /Version\/([\d.]+).*Safari\//i],
    ['Chrome', /(?:CriOS|Chrome)\/([\d.]+)/i]
  ];
  const browserMatch = browserMatchers.map(([name, matcher]) => [name, ua.match(matcher)]).find(([, match]) => match);
  const browser = browserMatch?.[0] || null;
  const browserVersion = browserMatch?.[1]?.[1] || null;
  const browserLabel = browser ? `${browser}${browserVersion ? ` ${browserVersion.split('.')[0]}` : ''}` : null;
  const platform = masqueradePlatformOf(ua);
  const androidVersion = ua.match(/Android\s+([\d.]+)/i)?.[1] || null;
  const iosVersion = ua.match(/(?:CPU (?:iPhone )?OS|iPhone OS|CPU OS)\s+([\d_]+)/i)?.[1]?.replaceAll('_', '.') || null;
  const os = platform === 'Android' ? `Android${androidVersion ? ` ${androidVersion}` : ''}`
    : platform === 'iOS' ? `iOS${iosVersion ? ` ${iosVersion}` : ''}`
      : platform === 'Windows' ? 'Windows 10/11'
        : platform === 'macOS' ? `macOS ${(ua.match(/Mac OS X ([\d_]+)/i)?.[1] || '10.15.7').replaceAll('_', '.')}`
          : platform === 'Chrome OS' ? 'ChromeOS'
            : platform === 'Linux' ? 'Linux' : null;
  const androidModel = masqueradeAndroidModel(ua);
  const device = /iPad/i.test(ua) ? 'iPad'
    : /iPhone/i.test(ua) ? 'iPhone'
      : /iPod/i.test(ua) ? 'iPod'
        : platform === 'Android' ? androidModel : platform ? 'Desktop' : null;
  const deviceType = browser && /bot/i.test(browser) ? 'Bot'
    : device === 'iPad' || (platform === 'Android' && !/Mobile/i.test(ua)) ? 'Tablet'
      : device === 'iPhone' || device === 'iPod' || (platform === 'Android' && /Mobile/i.test(ua)) ? 'Mobile'
        : platform ? 'Desktop' : null;
  const recognized = Boolean(browser && platform) || deviceType === 'Bot';
  const labelTarget = device && device !== deviceType ? device : deviceType === 'Bot' ? null : os || deviceType;
  const detail = deviceType ? `${deviceType}${os && labelTarget !== os ? ` · ${os}` : ''}` : 'Browser or device could not be identified';
  return {
    recognized,
    browser,
    browserVersion,
    os,
    device,
    deviceType,
    label: recognized ? `${browserLabel}${labelTarget ? ` · ${labelTarget}` : ''}` : 'Unrecognized User-Agent',
    detail: recognized ? detail : 'Browser or device could not be identified'
  };
}

globalThis.MASQUERADE_UA_UTILS = Object.freeze({
  MAX_UA_LENGTH: MASQUERADE_MAX_UA_LENGTH,
  CLIENT_HINT_HEADERS: MASQUERADE_CLIENT_HINT_HEADERS,
  validateUserAgent: masqueradeValidateUserAgent,
  buildRequestHeaders: masqueradeBuildRequestHeaders,
  buildUserAgentOverride: masqueradeBuildUserAgentOverride,
  describeUserAgent: masqueradeDescribeUserAgent
});
