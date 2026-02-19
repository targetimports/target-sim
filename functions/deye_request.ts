import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const BASE_URLS = {
  US: 'https://us1-developer.deyecloud.com/v1.0',
  EU: 'https://eu1-developer.deyecloud.com/v1.0',
};

const normalizeRegion = (r) => {
  const x = String(r || '').trim().toUpperCase();
  if (x === 'AMEA' || x === 'AMERICA' || x === 'US1' || x === 'USA') return 'US';
  if (x === 'EMEA' || x === 'EU1' || x === 'EUROPE') return 'EU';
  if (x === 'US' || x === 'EU') return x;
  return 'US'; // default (AMEA geralmente é US)
};

// SHA-256 hex no Deno
async function sha256Hex(text) {
  const data = new TextEncoder().encode(String(text));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getConfig(base44) {
  const list = await base44.asServiceRole.entities.DeyeSettings.list({ limit: 1, order: 'desc' });
  if (!list?.length) throw new Error('DeyeSettings não encontrado');

  const raw = list[0];
  const config = raw.data ?? raw; // ✅ FIX
  return config;
}

async function readCachedToken(base44) {
  const list = await base44.asServiceRole.entities.DeyeAuth.list({ limit: 1, order: 'desc' });
  if (!list?.length) return null;

  const raw = list[0];
  const auth = raw.data ?? raw; // ✅ FIX
  return auth.accessToken || auth.token || null;
}

async function saveToken(base44, token) {
  // Salva (upsert simples: cria novo)
  await base44.asServiceRole.entities.DeyeAuth.create({
    data: { accessToken: token, updatedAt: new Date().toISOString() },
  });
}

async function obtainToken(base44, config) {
  const region = normalizeRegion(config.region);
  const baseURL = BASE_URLS[region] || BASE_URLS.US;

  const appId = String(config.appId || '').trim();
  const appSecret = String(config.appSecret || '').trim();
  const email = String(config.email || '').trim();
  const password = String(config.password || '').trim();

  const missing = [];
  if (!appId) missing.push('appId');
  if (!appSecret) missing.push('appSecret');
  if (!email) missing.push('email');
  if (!password) missing.push('password');

  if (missing.length) {
    throw new Error(`Config Deye incompleta: faltando ${missing.join(', ')}`);
  }

  const passwordHash = await sha256Hex(password);

  const url = `${baseURL}/account/token?appId=${encodeURIComponent(appId)}`;
  const body = {
    appSecret,
    email,
    password: passwordHash,
  };

  // Se você estiver usando business context:
  // if (config.companyId) body.companyId = String(config.companyId);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    // não vazar segredo
    throw new Error(`Token falhou: ${res.status} - ${JSON.stringify(json).slice(0, 500)}`);
  }

  // A resposta pode vir em formatos diferentes. Ajuste aqui conforme seu retorno real.
  const token =
    json?.data?.token ||
    json?.token ||
    json?.data?.accessToken ||
    json?.accessToken;

  if (!token) {
    throw new Error(`Token não encontrado na resposta: ${JSON.stringify(json).slice(0, 500)}`);
  }

  await saveToken(base44, token);
  return token;
}

async function deyeFetch({ baseURL, token, path, method, payload }) {
  const url = new URL(`${baseURL}${path.startsWith('/') ? '' : '/'}${path}`);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `bearer ${token}`,
  };

  const options = { method, headers };

  if (method !== 'GET') {
    options.body = JSON.stringify(payload && Object.keys(payload).length ? payload : {});
  }

  const res = await fetch(url.toString(), options);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  return { res, json, text };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { path, method = 'GET', payload = {}, retryCount = 0 } = body;

    if (!path) return Response.json({ success: false, error: 'path é obrigatório' }, { status: 400 });

    const config = await getConfig(base44);
    const region = normalizeRegion(config.region);
    const baseURL = BASE_URLS[region] || BASE_URLS.US;

    let token = await readCachedToken(base44);
    if (!token) token = await obtainToken(base44, config);

    // 1ª tentativa
    let { res, json } = await deyeFetch({ baseURL, token, path, method, payload });

    // 401 => refresh token 1x
    if (res.status === 401 && retryCount === 0) {
      token = await obtainToken(base44, config);
      ({ res, json } = await deyeFetch({ baseURL, token, path, method, payload }));
    }

    // 429 => backoff até 3
    if (res.status === 429 && retryCount < 3) {
      const delayMs = Math.pow(2, retryCount) * 1000;
      await sleep(delayMs);
      // retry via recursão local (sem invoke)
      return await (async () => {
        const nextReq = new Request(req.url, {
          method: 'POST',
          headers: req.headers,
          body: JSON.stringify({ path, method, payload, retryCount: retryCount + 1 }),
        });
        return await (await fetch(nextReq)).clone(); // fallback (se não quiser, implemente loop)
      })();
    }

    return Response.json({
      success: true,
      status: res.status,
      ok: res.ok,
      region,
      data: json,
    }, { status: res.ok ? 200 : 400 });

  } catch (error) {
    return Response.json({
      success: false,
      error: String(error?.message || error),
    }, { status: 500 });
  }
});
