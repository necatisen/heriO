/**
 * "Neden eşleştiniz?" – what two people have in common, plus a ready first message.
 * Everything is computed on the phone from profile fields both people filled in.
 */
import { supabase } from '@/lib/supabase';
import { L } from '@/lib/l10n';
import { loadProfileExtras } from '@/components/ProfileExtras';
import { interestLabel, exerciseLabel, petLabel } from '@/lib/profileExtras';
import { getRelationshipGoalLabel } from '@/lib/profileTranslations';
import { dayMonthOf, loadBirthDateExact } from '@/lib/birthday';

export type MatchReason = { kind: 'interests' | 'city' | 'goal' | 'exercise' | 'pets' | 'birthday'; title: string; chips?: string[] };
export type MatchInsight = { reasons: MatchReason[]; opener: string | null };

type Basics = { city?: string | null; relationship_goal?: string | null; birth_date?: string | null };

async function basics(userId: string): Promise<Basics> {
  const { data } = await supabase.from('profiles').select('city, relationship_goal, birth_date').eq('id', userId).maybeSingle();
  return (data as Basics) || {};
}

const norm = (s?: string | null) => (s ?? '').trim().toLocaleLowerCase('tr');

export async function loadMatchInsight(myId: string, otherId: string, language: string): Promise<MatchInsight> {
  try {
    const [meB, otherB, meX, otherX, meExact, otherExact] = await Promise.all([
      basics(myId),
      basics(otherId),
      loadProfileExtras(myId),
      loadProfileExtras(otherId),
      loadBirthDateExact(myId),
      loadBirthDateExact(otherId),
    ]);
    const reasons: MatchReason[] = [];

    const shared = meX.interests.filter((i) => otherX.interests.includes(i));
    if (shared.length > 0) {
      reasons.push({
        kind: 'interests',
        title: shared.length === 1 ? L('1 ortak hobi', '1 shared hobby') : L('{0} ortak hobi', '{0} shared hobbies', [shared.length]),
        chips: shared.map(interestLabel).filter(Boolean),
      });
    }

    if (meB.city && norm(meB.city) === norm(otherB.city)) {
      reasons.push({ kind: 'city', title: L('İkiniz de {0} şehrindesiniz', 'You are both in {0}', [otherB.city!.trim()]) });
    }

    if (meB.relationship_goal && meB.relationship_goal === otherB.relationship_goal) {
      reasons.push({
        kind: 'goal',
        title: L('Aynı hedef: {0}', 'Same goal: {0}', [getRelationshipGoalLabel(meB.relationship_goal, language)]),
      });
    }

    if (meX.exercise && meX.exercise === otherX.exercise) {
      reasons.push({ kind: 'exercise', title: L('Spor alışkanlığınız aynı: {0}', 'Same exercise habit: {0}', [exerciseLabel(meX.exercise)]) });
    }

    const petLovers = ['dog', 'cat', 'other_pet', 'love_pets'];
    if (meX.pets && otherX.pets && petLovers.includes(meX.pets) && petLovers.includes(otherX.pets)) {
      reasons.push({ kind: 'pets', title: L('İkiniz de hayvanları seviyorsunuz', 'You both love animals'), chips: [petLabel(otherX.pets)] });
    }

    const a = dayMonthOf(meB.birth_date);
    const b = dayMonthOf(otherB.birth_date);
    if (meExact && otherExact && a && b && a.day === b.day && a.month === b.month) {
      reasons.push({ kind: 'birthday', title: L('Doğum günü ikizisiniz!', "You're birthday twins!") });
    }

    let opener: string | null = null;
    if (shared.length > 0) {
      opener = L(
        'Selam! İkimiz de {0} seviyormuşuz 🙂 Bu aralar en çok ne yapmaktan keyif alıyorsun?',
        "Hi! Looks like we both love {0} 🙂 What do you enjoy doing most these days?",
        [interestLabel(shared[0]).replace(/^\S+\s/, '').toLocaleLowerCase()]
      );
    } else if (reasons.some((r) => r.kind === 'birthday')) {
      opener = L('Selam doğum günü ikizim! 🎂 Doğum gününü genelde nasıl kutlarsın?', 'Hi birthday twin! 🎂 How do you usually celebrate?');
    } else if (reasons.some((r) => r.kind === 'city')) {
      opener = L('Selam! Aynı şehirdeyiz 🙂 Buralarda en sevdiğin mekân neresi?', "Hi! We're in the same city 🙂 What's your favourite spot around here?");
    }

    return { reasons, opener };
  } catch {
    return { reasons: [], opener: null };
  }
}
