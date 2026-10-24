import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { createReviewMediaHandler } from '../_shared/presentation-review-media-core.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } });
Deno.serve(createReviewMediaHandler({
  origins: (Deno.env.get('PRESENTATION_REVIEW_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean),
  now: Date.now,
  async read(token) {
    const { data, error } = await admin.rpc('get_public_presentation', { p_token: token });
    if (error || !data) throw new Error('INVALID_ACCESS');
    return data;
  },
  async sign(paths, ttl) {
    const { data, error } = await admin.storage.from('content-assets').createSignedUrls(paths, ttl);
    if (error || !data || data.some(entry => entry.error || !entry.path || !entry.signedUrl)) throw new Error('SIGN_FAILED');
    return Object.fromEntries(data.map(entry => [entry.path!, entry.signedUrl]));
  },
}));
