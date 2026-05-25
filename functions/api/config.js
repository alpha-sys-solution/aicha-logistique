/**
 * Cloudflare Pages Function : GET /api/config
 * Retourne les variables d'environnement publiques (anon key uniquement)
 * au moment où l'app charge — elles ne sont jamais dans le code source.
 */
export async function onRequestGet(context) {
  const { env } = context;

  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Variables d\'environnement manquantes' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      supabaseUrl: env.SUPABASE_URL,
      supabaseKey: env.SUPABASE_KEY,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Ne pas mettre en cache la config
        'Cache-Control': 'no-store',
      },
    }
  );
}
