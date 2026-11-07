/**
 * Read-only deployment diagnostics for the SIPETAK speech UI.
 * No API key, bearer token, user identity, or provider account details are exposed.
 * Does not consume D1 quota, contact OpenAI, or accept recorded audio.
 */
const noStore = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff'
};
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: noStore });

async function assess(env, toggle) {
  if (env?.[toggle] !== 'true') return { ready: false, reason: 'not-enabled' };
  if (!env?.OPENAI_API_KEY) return { ready: false, reason: 'key-missing' };
  if (!env?.TRANSCRIBE_DB?.prepare) return { ready: false, reason: 'd1-missing' };
  try {
    // Query a known table to distinguish D1 binding from an uninitialized schema.
    await env.TRANSCRIBE_DB.prepare('SELECT 1 FROM transcription_quota LIMIT 1').first();
  } catch {
    return { ready: false, reason: 'd1-table-missing' };
  }
  if (!env?.SUPABASE_URL || !env?.SUPABASE_PUBLISHABLE_KEY)
    return { ready: false, reason: 'auth-config-missing' };
  return { ready: true, reason: 'configured' };
}
export async function onRequestGet({ env }) {
  return response({
    live: await assess(env, 'TRANSCRIBE_LIVE_ENABLED'),
    upload: await assess(env, 'TRANSCRIBE_ENABLED'),
    note: 'Konfigurasi telah diperiksa; sesi login, jaringan, dan penyedia AI tetap harus diuji saat digunakan.'
  });
}
export function onRequestPost() { return response({error:'Gunakan GET untuk mengecek kesiapan server.'}, 405); }
