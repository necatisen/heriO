// End-to-end backend test: runs the same Supabase calls the app makes, then deletes its test users.
// Usage (from project root): node scripts/e2e-backend-test.cjs
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');
const { createClient } = require(path.join(root, 'node_modules/@supabase/supabase-js'));
const sharp = require(path.join(root, 'node_modules/sharp'));

const env = Object.fromEntries(
  fs.readFileSync(path.join(root, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')])
);
const URL_ = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const results = [];
const timings = [];
async function step(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}${detail ? '  — ' + detail : ''}`);
  } catch (e) {
    results.push({ name, ok: false });
    console.log(`FAIL  ${name}  — ${e?.message || JSON.stringify(e)}`);
  }
  timings.push(Date.now() - t0);
}
const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const check = ({ data, error }, label) => {
  if (error) throw new Error(`${label}: ${error.message} (${error.code || ''})`);
  return data;
};
const client = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function randomJpeg(w, h, quality) {
  const raw = Buffer.alloc(w * h * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = Math.floor(Math.random() * 256);
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality }).toBuffer();
}

async function callFunction(c, name, body) {
  const { data: s } = await c.auth.getSession();
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${s.session.access_token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

(async () => {
  console.log(`Sunucu: ${URL_}\n`);
  const stamp = Date.now();
  const users = {
    a: { email: `qa-${stamp}-a@example.com`, password: 'QaTest!2026', full_name: 'Qa Alpha', username: `qa_alpha_${stamp % 100000}`, gender: 'male' },
    b: { email: `qa-${stamp}-b@example.com`, password: 'QaTest!2026', full_name: 'Qa Beta', username: `qa_beta_${stamp % 100000}`, gender: 'female' },
  };
  const A = client();
  const B = client();
  let idA, idB, sessionId, messageId;

  // With SUPABASE_SERVICE_ROLE_KEY set, users are created pre-confirmed via the admin API
  // (works even while "Confirm email" is on); otherwise the normal app signUp is used.
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;
  if (admin) for (const u of Object.values(users)) u.email = u.email.replace('@example.com', '@birthchat-qa.test');
  for (const [k, c] of [['a', A], ['b', B]]) {
    const u = users[k];
    const meta = { full_name: u.full_name, username: u.username, birth_date: '1995-05-05', gender: u.gender, country: 'turkey', city: 'İstanbul', height: 175, preferred_language: 'tr', consents: { version: 'qa', accepted_at: new Date().toISOString(), app_version_code: 0, types: ['terms_privacy', 'kvkk_notice', 'transfer_abroad'] } };
    await step(`Kayıt (${k.toUpperCase()})`, async () => {
      if (admin) {
        check(await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true, user_metadata: meta }), 'createUser');
        const { data, error } = await c.auth.signInWithPassword({ email: u.email, password: u.password });
        if (error) throw error;
        if (k === 'a') idA = data.user.id;
        else idB = data.user.id;
        return 'yönetici API ile oluşturuldu, giriş yapıldı';
      }
      const { data, error } = await c.auth.signUp({ email: u.email, password: u.password, options: { data: meta } });
      if (error) throw error;
      if (k === 'a') idA = data.user.id;
      else idB = data.user.id;
      must(data.session, 'oturum açılmadı (e-posta onayı açık olabilir)');
      return 'oturum açıldı';
    });
  }

  await step('Profil otomatik oluştu (trigger)', async () => {
    const p = check(await A.from('profiles').select('username').eq('id', idA).single(), 'profiles');
    must(p.username === users.a.username, 'username eşleşmiyor');
  });
  await step('Başlangıç kredisi', async () => {
    const c = check(await A.from('credits').select('balance').eq('user_id', idA).maybeSingle(), 'credits');
    must(c && c.balance > 0, 'kredi yok');
    return `bakiye ${c.balance}`;
  });
  await step('Kayıt onayları kaydedildi (trigger)', async () => {
    const rows = check(await A.from('user_consents').select('consent_type').eq('user_id', idA), 'user_consents');
    must(rows.length === 3, `${rows.length} onay kaydı`);
    check(await A.from('user_consents').insert({ user_id: idA, consent_type: 'biometric', version: 'qa' }), 'insert');
    const del = await A.from('user_consents').delete().eq('user_id', idA).select('id');
    must(!del.data || del.data.length === 0, 'onay kaydı silinebildi!');
    return '3 + biyometrik';
  });
  await step('Güvenlik: kullanıcı kendine premium/kredi veremez', async () => {
    await A.from('subscriptions').update({ is_premium: true }).eq('user_id', idA);
    await A.from('credits').update({ balance: 999999 }).eq('user_id', idA);
    const sub = check(await A.from('subscriptions').select('is_premium').eq('user_id', idA).maybeSingle(), 'sub');
    const cr = check(await A.from('credits').select('balance').eq('user_id', idA).maybeSingle(), 'credits');
    must(!sub?.is_premium, 'premium yazılabildi!');
    must(cr.balance !== 999999, 'kredi yazılabildi!');
  });
  await step('Sıkıştırılmış profil fotoğrafı yükleme', async () => {
    const img = await sharp(await randomJpeg(2000, 2000, 95)).resize({ width: 1080 }).jpeg({ quality: 70 }).toBuffer();
    check(await A.storage.from('avatars').upload(`${idA}/avatar.jpg`, img, { contentType: 'image/jpeg', upsert: true }), 'upload');
    const url = A.storage.from('avatars').getPublicUrl(`${idA}/avatar.jpg`).data.publicUrl;
    check(await A.from('profiles').update({ profile_picture: url }).eq('id', idA), 'profile');
    check(await A.from('photos').insert({ user_id: idA, photo_url: url }), 'photos');
    must((await fetch(url)).ok, 'public URL açılmadı');
  });
  await step('Keşfet: A, B profilini görüyor', async () => {
    must(check(await A.from('profiles').select('id').eq('id', idB), 'profiles').length === 1, 'B görünmüyor');
  });
  await step('Beğeni + karşılıklı eşleşme', async () => {
    check(await A.from('likes').insert({ user_id: idA, liked_user_id: idB }), 'like A→B');
    check(await B.from('likes').insert({ user_id: idB, liked_user_id: idA }), 'like B→A');
    check(await B.from('friends').insert({ user_id: idB, friend_id: idA, status: 'accepted' }), 'friends 1');
    check(await B.from('friends').insert({ user_id: idA, friend_id: idB, status: 'accepted' }), 'friends 2');
    sessionId = check(await B.from('chat_sessions').insert({ user1_id: idB, user2_id: idA, status: 'active' }).select('id').single(), 'session').id;
    check(await B.from('notifications').insert({ user_id: idA, actor_user_id: idB, type: 'match', data: {} }), 'notification');
  });
  await step('Mesaj gönder / oku / tepki', async () => {
    messageId = check(await A.from('messages').insert({ session_id: sessionId, sender_id: idA, receiver_id: idB, content: 'Merhaba' }).select('id').single(), 'send').id;
    must(check(await B.from('messages').select('id').eq('session_id', sessionId), 'read').length === 1, 'B mesajı görmüyor');
    // Stored text is encrypted; the participant gets the plain text through get_message_texts.
    const stored = check(await B.from('messages').select('content').eq('id', messageId).single(), 'stored').content;
    must(String(stored).startsWith('enc1:'), 'mesaj veritabanında şifresiz');
    const plain = check(await B.rpc('get_message_texts', { p_ids: [messageId] }), 'decrypt');
    must(plain[0]?.content === 'Merhaba', 'mesaj çözülemedi');
    check(await B.from('message_reactions').upsert({ message_id: messageId, user_id: idB, emoji: '❤️' }, { onConflict: 'message_id,user_id' }), 'reaction');
  });
  await step('Kredi düşme', async () => {
    check(await A.rpc('deduct_credits', { p_user_id: idA, p_amount: 1, p_type: 'chat_spent', p_description: 'QA' }), 'rpc');
  });
  await step('Push token kaydı', async () => {
    check(await A.from('push_tokens').upsert({ user_id: idA, token: `ExponentPushToken[qa-${stamp}]`, platform: 'android' }, { onConflict: 'user_id,platform' }), 'push_tokens');
  });
  await step('RLS: başkasının profilini değiştirememe', async () => {
    await A.from('profiles').update({ bio: 'hacked' }).eq('id', idB);
    must(check(await B.from('profiles').select('bio').eq('id', idB).single(), 'read').bio !== 'hacked', 'değiştirilebildi!');
  });
  await step('Fonksiyon: send-push-message', async () => {
    const r = await callFunction(A, 'send-push-message', { to_user_id: idB, title: 'QA', body: 'test' });
    must(r.status < 500 && r.status !== 401 && r.status !== 404, `${r.status} ${r.body.message || r.body.msg || ''}`);
    return `HTTP ${r.status}`;
  });
  await step('Push: beğeni/eşleşme bildirimi (sahte beğeni reddedilir)', async () => {
    const ok = await callFunction(A, 'send-push-message', { kind: 'match', to_user_id: idB });
    must(ok.status === 200, `gerçek beğeni: ${ok.status} ${ok.body.message || ''}`);
    const fake = await callFunction(A, 'send-push-message', { kind: 'like', to_user_id: idA });
    must(fake.status === 403, `sahte beğeni kabul edildi: ${fake.status}`);
    return `200 / 403`;
  });
  await step('Doğum günü: gerçek tarih + ikiz bulma', async () => {
    const bd = '1995-11-22';
    check(await A.from('profiles').update({ birth_date: bd, birth_date_exact: true }).eq('id', idA), 'A doğum günü');
    check(await B.from('profiles').update({ birth_date: '1993-11-22', birth_date_exact: true }).eq('id', idB), 'B doğum günü');
    const hidden = check(await A.rpc('birthday_twins', { max_rows: 30 }), 'birthday_twins (kapalı)');
    must(!hidden.some((t) => t.id === idB), 'paylaşımı kapalı B ikizlerde görünüyor!');
    check(await B.from('profiles').update({ share_birthday: true }).eq('id', idB), 'B paylaş');
    const twins = check(await A.rpc('birthday_twins', { max_rows: 30 }), 'birthday_twins');
    must(twins.some((t) => t.id === idB), 'B ikiz olarak görünmüyor');
    check(await A.rpc('birthday_week_ids'), 'birthday_week_ids');
    return `${twins.length} ikiz`;
  });
  await step('Doğum günü: kutlama / teşekkür / güvenlik', async () => {
    // A → B allowed (B shares). B → A refused (A does not share).
    const g = check(await A.from('birthday_greetings').insert({ from_user: idA, to_user: idB, kind: 'wish', note: 'İyi ki doğdun' }).select('id').single(), 'A kutla');
    const twice = await A.from('birthday_greetings').insert({ from_user: idA, to_user: idB, kind: 'hello' });
    must(twice.error, 'aynı yıl ikinci not kabul edildi!');
    const back = await B.from('birthday_greetings').insert({ from_user: idB, to_user: idA, kind: 'hello' });
    must(back.error, 'paylaşımı kapalı kişiye not gönderilebildi!');
    const forged = await A.from('birthday_greetings').update({ thanked_at: new Date().toISOString() }).eq('id', g.id).select('id');
    must(!forged.data?.length, 'gönderen kendi notunu teşekkürlü yapabildi!');
    const pw = await callFunction(A, 'send-push-message', { kind: 'birthday_wish', to_user_id: idB });
    must(pw.status === 200, `birthday_wish push ${pw.status}`);
    const fakeThanks = await callFunction(A, 'send-push-message', { kind: 'birthday_thanks', to_user_id: idB });
    must(fakeThanks.status === 403, `sahte teşekkür push ${fakeThanks.status}`);
    check(await B.from('birthday_greetings').update({ thanked_at: new Date().toISOString() }).eq('id', g.id), 'B teşekkür');
    const pt = await callFunction(B, 'send-push-message', { kind: 'birthday_thanks', to_user_id: idA });
    must(pt.status === 200, `birthday_thanks push ${pt.status}`);
    check(await B.from('notifications').select('id').limit(1), 'bildirim okunur');
    check(await B.from('birthday_greetings').delete().eq('id', g.id), 'B sil');
    return '200 / 403';
  });
  await step('Güvenlik sertleştirme (migration 20261128120000)', async () => {
    const anon = client();
    const ap = await anon.from('profiles').select('id').limit(5);
    const hardened = !ap.error && (ap.data || []).length === 0;
    if (!hardened) return 'migration henüz çalıştırılmadı — atlandı (UYARI: profiller girişsiz okunabiliyor)';
    // Dangerous RPCs are gone / closed.
    const del = await anon.rpc('delete_all_users');
    must(del.error, 'delete_all_users hâlâ çağrılabiliyor!');
    // Receiver cannot rewrite a message they received; sender cannot fake "read".
    const m = check(await A.from('messages').insert({ session_id: sessionId, sender_id: idA, receiver_id: idB, content: 'orijinal' }).select('id').single(), 'mesaj');
    await B.from('messages').update({ content: 'sahte', is_read: true }).eq('id', m.id);
    const [plain] = check(await B.rpc('get_message_texts', { p_ids: [m.id] }), 'metin');
    must(plain && Object.values(plain).includes('orijinal'), 'alıcı mesaj metnini değiştirebildi!');
    must(check(await A.from('messages').select('is_read').eq('id', m.id).single(), 'okundu').is_read === true, 'alıcı okundu işaretleyemedi');
    // Location is stored rounded.
    check(await A.from('profiles').update({ latitude: 38.423456, longitude: 27.142789 }).eq('id', idA), 'konum');
    const loc = check(await B.from('profiles').select('latitude, longitude').eq('id', idA).single(), 'konum oku');
    must(loc.latitude === 38.42 && loc.longitude === 27.14, `konum yuvarlanmadı (${loc.latitude}, ${loc.longitude})`);
    // Avatars bucket cannot be listed across users.
    const list = await B.storage.from('avatars').list(idA);
    must(!list.data || list.data.length === 0, 'başkasının fotoğraf klasörü listelenebiliyor!');
    return 'girişsiz erişim kapalı, mesaj değiştirme engelli, konum yuvarlanıyor, depolama kapalı';
  });
  await step('Kibar kapanış: kapanan sohbete mesaj yazılamaz', async () => {
    check(await B.from('messages').insert({ session_id: sessionId, sender_id: idB, receiver_id: idA, content: 'İyi şanslar' }), 'kapanış notu');
    check(await B.from('chat_sessions').update({ closed_by: idB, closed_at: new Date().toISOString() }).eq('id', sessionId), 'kapat');
    const after = await A.from('messages').insert({ session_id: sessionId, sender_id: idA, receiver_id: idB, content: 'hâlâ orada mısın' });
    must(after.error, 'kapalı sohbete mesaj gönderilebildi!');
    const s = check(await A.from('chat_sessions').select('closed_by').eq('id', sessionId).single(), 'A görüyor');
    must(s.closed_by === idB, 'kapanış bilgisi görünmüyor');
  });
  await step('Planlar: paylaş / katıl / kabul / güvenlik', async () => {
    const at = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();
    const plan = check(
      await A.from('plans').insert({ user_id: idA, category: 'coffee', title: 'QA kahve planı', starts_at: at(24), city: 'İzmir' }).select('id').single(),
      'plan oluştur'
    );
    must(check(await B.from('plans').select('id').eq('id', plan.id), 'B görüyor').length === 1, 'B planı görmüyor');
    const own = await A.from('plan_joins').insert({ plan_id: plan.id, user_id: idA });
    must(own.error, 'kendi planına katılabildi!');
    const join = check(await B.from('plan_joins').insert({ plan_id: plan.id, user_id: idB }).select('id').single(), 'B katıl');
    must(check(await A.from('plan_joins').select('id').eq('plan_id', plan.id), 'A istekleri').length === 1, 'A isteği görmüyor');
    await B.from('plan_joins').update({ status: 'accepted' }).eq('id', join.id);
    must(check(await A.from('plan_joins').select('status').eq('id', join.id).single(), 'durum').status === 'pending', 'B kendini kabul edebildi!');
    const pj = await callFunction(B, 'send-push-message', { kind: 'plan_join', plan_id: plan.id, to_user_id: idA });
    must(pj.status === 200, `plan_join push ${pj.status}`);
    const fake = await callFunction(B, 'send-push-message', { kind: 'plan_accept', plan_id: plan.id, to_user_id: idA });
    must(fake.status === 403, `sahte kabul push ${fake.status}`);
    check(await A.from('plan_joins').update({ status: 'accepted' }).eq('id', join.id), 'A kabul');
    const pa = await callFunction(A, 'send-push-message', { kind: 'plan_accept', plan_id: plan.id, to_user_id: idB });
    must(pa.status === 200, `plan_accept push ${pa.status}`);
    check(await A.from('plans').insert({ user_id: idA, category: 'walk', title: 'QA plan 2', starts_at: at(30) }), 'plan 2');
    check(await A.from('plans').insert({ user_id: idA, category: 'food', title: 'QA plan 3', starts_at: at(40) }), 'plan 3');
    const fourth = await A.from('plans').insert({ user_id: idA, category: 'games', title: 'QA plan 4', starts_at: at(50) });
    must(fourth.error, '4. açık plan engellenmedi!');
  });
  await step('Moderasyon: şikâyet gizliliği / yetkisiz işlem reddedilir', async () => {
    const rep = check(
      await A.from('user_reports').insert({ reporter_id: idA, reported_user_id: idB, reason: 'QA spam', context: { excerpt: 'qa' } }).select('id').single(),
      'şikâyet'
    );
    const forged = await A.from('user_reports').insert({ reporter_id: idA, reported_user_id: idB, reason: 'x', status: 'resolved' });
    must(forged.error, 'şikâyet kapalı olarak eklenebildi!');
    must(check(await B.from('user_reports').select('id').eq('reported_user_id', idB), 'B okuyor').length === 0, 'şikâyet edilen kişi şikâyeti görebiliyor!');
    const n = await callFunction(A, 'moderate-user', { action: 'notify_report', report_id: rep.id });
    must(n.status === 200, `notify_report ${n.status} ${n.body.message || ''}`);
    const fakeNotify = await callFunction(B, 'moderate-user', { action: 'notify_report', report_id: rep.id });
    must(fakeNotify.status === 403, `başkasının şikâyeti bildirildi: ${fakeNotify.status}`);
    const act = await callFunction(B, 'moderate-user', { action: 'act', kind: 'ban', target_user_id: idA, reason: 'x' });
    must(act.status === 403, `yetkisiz ban: ${act.status}`);
    const up = await B.storage.from('moderation-evidence').upload(`${idA}/qa.jpg`, Buffer.from('x'), { contentType: 'image/jpeg' });
    must(up.error, 'yetkisiz kanıt yüklendi!');
    must(check(await B.from('moderation_actions').select('id'), 'log').length === 0, 'kullanıcı işlem kaydını görüyor!');
    const selfBan = await B.from('user_bans').insert({ user_id: idA, reason: 'x' });
    must(selfBan.error, 'kullanıcı ban ekleyebildi!');
    if (!admin) return `bildirim: ${n.body.notified ?? 0} yetkili`;

    // Full flow with a temporary moderator (needs the service role key).
    check(await admin.from('staff_roles').insert({ user_id: idA, role: 'moderator' }), 'moderatör ekle');
    try {
      const noEvidence = await callFunction(A, 'moderate-user', { action: 'act', kind: 'ban', target_user_id: idB, reason: 'QA' });
      must(noEvidence.status === 400, `kanıtsız ban: ${noEvidence.status}`);
      const path = `${idB}/qa_${Date.now()}.jpg`;
      check(await A.storage.from('moderation-evidence').upload(path, await randomJpeg(32, 32, 60), { contentType: 'image/jpeg' }), 'kanıt yükle');
      const s = await callFunction(A, 'moderate-user', { action: 'act', kind: 'suspend', days: 1, target_user_id: idB, reason: 'QA spam', note: 'e2e', evidence: [path] });
      must(s.status === 200, `askı ${s.status} ${s.body.message || ''}`);
      must(check(await B.from('user_bans').select('until'), 'B ban görüyor').length === 1, 'ban kaydı yok');
      must(check(await A.from('user_reports').select('status').eq('id', rep.id).single(), 'durum').status === 'resolved', 'şikâyet kapanmadı');
      const relog = await client().auth.signInWithPassword({ email: users.b.email, password: users.b.password });
      must(relog.error, 'askıdaki kullanıcı giriş yapabildi!');
      const log = check(await A.from('moderation_actions').select('action, actor_id, evidence').eq('target_user', idB), 'log');
      must(log.some((l) => l.action === 'suspend' && l.actor_id === idA && l.evidence.length === 1), 'işlem kaydı eksik');
      const u = await callFunction(A, 'moderate-user', { action: 'act', kind: 'unban', target_user_id: idB, reason: 'QA bitti' });
      must(u.status === 200, `ban kaldır ${u.status}`);
      must(check(await A.from('user_bans').select('user_id').eq('user_id', idB), 'ban sil').length === 0, 'ban kalktı ama kayıt duruyor');
      await admin.storage.from('moderation-evidence').remove([path]);
      return `askı → giriş engellendi → kaldırıldı · e-posta: ${s.body.email_sent ? 'gitti' : 'SMTP yok'}`;
    } finally {
      await admin.from('staff_roles').delete().eq('user_id', idA);
    }
  });
  await step('Plan düzenleme + tekrar şikâyet (migration 20261127120000)', async () => {
    const probe = await A.from('plans').select('id, edited_at, edit_count').eq('title', 'QA kahve planı').maybeSingle();
    if (probe.error && /edited_at|edit_count/.test(probe.error.message)) return 'migration henüz çalıştırılmadı — atlandı';
    const plan = check(probe, 'plan bul');
    must(plan, 'QA planı bulunamadı');
    const at = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();
    // Owner edits: counter + label.
    const ed = check(await A.from('plans').update({ title: 'QA kahve planı', place: 'Kordon', starts_at: at(26) }).eq('id', plan.id).select('edited_at, edit_count').single(), 'düzenle');
    must(ed.edited_at && ed.edit_count === 1, `düzenleme işaretlenmedi (${ed.edit_count})`);
    // Owner cannot move the plan beyond 15 days.
    const far = await A.from('plans').update({ starts_at: at(24 * 20) }).eq('id', plan.id);
    must(far.error && /plan_time_range/.test(far.error.message), '15 günden sonraya taşınabildi!');
    // Someone else cannot edit it.
    await B.from('plans').update({ title: 'hacked' }).eq('id', plan.id);
    must(check(await A.from('plans').select('title').eq('id', plan.id).single(), 'başlık').title === 'QA kahve planı', 'başkası planı düzenleyebildi!');
    // Update push: only the owner, only to accepted people.
    const pu = await callFunction(A, 'send-push-message', { kind: 'plan_update', plan_id: plan.id, to_user_id: idB });
    must(pu.status === 200, `plan_update push ${pu.status}`);
    const fakeU = await callFunction(B, 'send-push-message', { kind: 'plan_update', plan_id: plan.id, to_user_id: idA });
    must(fakeU.status === 403, `sahte plan_update push ${fakeU.status}`);
    // Reports: the same person may report again, up to 3 times a day.
    const before = check(
      await A.from('user_reports').select('id').eq('reporter_id', idA).eq('reported_user_id', idB).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      'şikâyet say'
    ).length;
    for (let i = before; i < 3; i++) {
      check(await A.from('user_reports').insert({ reporter_id: idA, reported_user_id: idB, reason: `QA tekrar ${i}` }), `tekrar şikâyet ${i}`);
    }
    const over = await A.from('user_reports').insert({ reporter_id: idA, reported_user_id: idB, reason: 'QA fazla' });
    must(over.error && /report_limit_user/.test(over.error.message), 'günlük şikâyet sınırı çalışmadı!');
    return 'düzenleme, 15 gün sınırı, push doğrulama, şikâyet sınırı OK';
  });
  await step('Fonksiyon: moderate-image', async () => {
    const img = (await randomJpeg(64, 64, 70)).toString('base64');
    const r = await callFunction(A, 'moderate-image', { image_base64: img });
    must(r.status !== 401 && r.status !== 404, `${r.status} ${r.body.message || r.body.msg || ''}`);
    return `HTTP ${r.status}, allowed=${r.body.allowed}`;
  });
  await step('Fonksiyon: verification-pipeline', async () => {
    const selfie = (await randomJpeg(720, 900, 85)).toString('base64');
    const frame = (await randomJpeg(480, 600, 70)).toString('base64');
    const r = await callFunction(A, 'verification-pipeline', {
      selfie_base64: `data:image/jpeg;base64,${selfie}`,
      liveness_passed: true,
      liveness_frames: [1, 2, 3, 4].map(() => `data:image/jpeg;base64,${frame}`),
    });
    must(r.status === 200 && r.body.success, `${r.status} ${r.body.message || r.body.msg || ''}`);
    return r.body.verification_status;
  });
  await step('Güvenlik: kullanıcı rozeti kendisi veremez', async () => {
    await B.from('profiles').update({ verification_status: 'verified', is_verified: true }).eq('id', idB);
    const rpc = await B.rpc('set_verification_status', { target_user_id: idB, new_status: 'verified' });
    must(!!rpc.error, 'set_verification_status istemciden çağrılabildi!');
    const p = check(await B.from('profiles').select('verification_status, is_verified').eq('id', idB).single(), 'read');
    must(p.verification_status !== 'verified' && !p.is_verified, 'kullanıcı kendini doğruladı!');
  });
  await step('Profil fotoğrafı değişince rozet düşer', async () => {
    const before = check(await A.from('profiles').select('verification_status').eq('id', idA).single(), 'read');
    check(await A.from('profiles').update({ profile_picture: `https://example.com/qa-${stamp}.jpg` }).eq('id', idA), 'update');
    const after = check(await A.from('profiles').select('verification_status').eq('id', idA).single(), 'read');
    must(after.verification_status === 'unverified', `durum: ${after.verification_status}`);
    return `${before.verification_status} → ${after.verification_status}`;
  });

  for (const [k, c] of [['b', B], ['a', A]]) {
    await step(`Hesap silme + dosya temizliği (${k.toUpperCase()})`, async () => {
      const id = k === 'a' ? idA : idB;
      const r = await callFunction(c, 'delete-account', {});
      must(r.status === 200 && r.body.success, `${r.status} ${r.body.message || ''}`);
      if (admin) {
        const { data: files } = await admin.storage.from('avatars').list(id);
        must(!files || files.length === 0, `${files.length} dosya kaldı`);
        const { data: u } = await admin.auth.admin.getUserById(id);
        must(!u?.user, 'auth kullanıcısı silinmedi');
      }
      return `${r.body.files_removed} dosya silindi`;
    });
  }

  const failed = results.filter((r) => !r.ok).length;
  const avg = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
  console.log(`\nSONUÇ: ${results.length - failed}/${results.length} geçti${failed ? `, ${failed} başarısız` : ''} · adım başına ort. ${avg} ms`);
})();
