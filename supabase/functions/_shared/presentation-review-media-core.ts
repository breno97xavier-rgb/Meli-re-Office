export interface ReviewMediaDependencies {
  origins: string[];
  now(): number;
  read(token: string): Promise<Record<string, any>>;
  sign(paths: string[], ttl: number): Promise<Record<string, string>>;
}

/** No caller-supplied paths; only the files returned by the token-authorized frozen round. */
export function createReviewMediaHandler(deps: ReviewMediaDependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') || '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' };
    if (!deps.origins.includes(origin)) return new Response('{}', { status: 403, headers });
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info';
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { error: 'METHOD_NOT_ALLOWED' });
    // Read a bounded body, including when Content-Length is missing or dishonest.
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: 'INVALID_REQUEST' });
    let size = 0; const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.length; if (size > 2048) { await reader.cancel(); return reply(413, { error: 'REQUEST_TOO_LARGE' }); }
        chunks.push(value);
      }
      const body = JSON.parse(new TextDecoder().decode(Uint8Array.from(chunks.flatMap(chunk => [...chunk]))));
      if (Object.keys(body).some(key => key !== 'token') || typeof body.token !== 'string'
        || !/^[a-f0-9]{64}$/i.test(body.token)) return reply(400, { error: 'INVALID_REQUEST' });
      const data = await deps.read(body.token);
      const expires = Date.parse(data.access?.expires_at || '');
      const ttl = Math.min(300, Math.floor((expires - deps.now()) / 1000));
      if (!Number.isFinite(ttl) || ttl < 1) return reply(401, { error: 'INVALID_ACCESS' });
      const clientId = data.presentation?.client?.id;
      const paths: string[] = [];
      if (!Array.isArray(data.items) || data.items.length > 200) return reply(400, { error: 'INVALID_MEDIA' });
      for (const item of data.items) {
        if (!item.review_id) continue;
        if (!Array.isArray(item.assets)) return reply(400, { error: 'INVALID_MEDIA' });
        for (const asset of item.assets) {
          const path = asset.file_url;
          if (typeof path !== 'string' || !/^workspace\/[a-f0-9-]{36}\/clients\/[a-f0-9-]{36}\/contents\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.[a-z0-9]{1,32}$/i.test(path)
            || path.split('/')[3] !== clientId || path.split('/')[5] !== item.content_id) return reply(400, { error: 'INVALID_MEDIA' });
          paths.push(path);
        }
      }
      const unique = [...new Set(paths)];
      if (unique.length > 100) return reply(400, { error: 'TOO_MANY_FILES' });
      const urls = unique.length ? await deps.sign(unique, ttl) : {};
      // Revalidate revocation, expiry and workspace after the Storage request.
      const rechecked = await deps.read(body.token);
      const checkedExpiry = Date.parse(rechecked.access?.expires_at || '');
      if (!Number.isFinite(checkedExpiry) || checkedExpiry <= deps.now()
        || rechecked.presentation?.id !== data.presentation?.id) return reply(401, { error: 'INVALID_ACCESS' });
      return reply(200, { urls, expires_in: ttl });
    } catch {
      // Never return/log tokens, signed URLs, provider errors or service credentials.
      return reply(401, { error: 'MEDIA_UNAVAILABLE' });
    }
  };
}
