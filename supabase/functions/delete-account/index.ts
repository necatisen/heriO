// Deletes the caller's account completely: uploaded files (avatars, chat media,
// face-verification images) via the Storage API, then all DB data via delete_user_account().
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function listAll(admin: any, bucket: string, folder: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000, offset });
    if (error || !data?.length) break;
    for (const f of data) if (f.id) out.push(`${folder}/${f.name}`);
    if (data.length < 1000) break;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ success: false, message: 'Unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: u, error: uErr } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (uErr || !u?.user) return json({ success: false, message: 'Invalid token' }, 401);
  const uid = u.user.id;

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let removed = 0;
  try {
    for (const bucket of ['avatars', 'verification-selfies', 'chat-media']) {
      const paths = await listAll(admin, bucket, uid);
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
        if (!error) removed += Math.min(100, paths.length - i);
      }
    }
  } catch (e) {
    console.error('storage cleanup failed', e);
  }

  // Runs as the user, so auth.uid() inside the function is the caller.
  const { error } = await userClient.rpc('delete_user_account');
  if (error) return json({ success: false, message: error.message, files_removed: removed }, 500);
  return json({ success: true, files_removed: removed });
});
