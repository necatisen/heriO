/**
 * Simple, explainable compatibility score (0–100) between the viewer and a candidate,
 * based on profile fields both people filled in. Fields that either side left empty
 * are skipped, so a sparse profile is not punished.
 */
type P = {
  birth_date?: string | null;
  city?: string | null;
  country?: string | null;
  relationship_goal?: string | null;
  smoking_habit?: string | null;
  alcohol_consumption?: string | null;
  religion?: string | null;
  children_status?: string | null;
  education?: string | null;
};

const age = (d?: string | null) => {
  if (!d) return null;
  const b = new Date(d);
  if (Number.isNaN(b.getTime())) return null;
  return (Date.now() - b.getTime()) / (365.25 * 24 * 3600 * 1000);
};
const same = (a?: string | null, b?: string | null) =>
  !!a && !!b ? a.trim().toLowerCase() === b.trim().toLowerCase() : null;

export function compatibilityScore(me: P | null | undefined, other: P): number | null {
  if (!me) return null;
  // [weight, result] – result null means "unknown", true/false or a 0..1 closeness.
  const parts: [number, boolean | number | null][] = [
    [3, same(me.relationship_goal, other.relationship_goal)],
    [2, same(me.city, other.city)],
    [1, same(me.country, other.country)],
    [2, same(me.smoking_habit, other.smoking_habit)],
    [1.5, same(me.alcohol_consumption, other.alcohol_consumption)],
    [1.5, same(me.religion, other.religion)],
    [1.5, same(me.children_status, other.children_status)],
    [1, same(me.education, other.education)],
  ];
  const a1 = age(me.birth_date);
  const a2 = age(other.birth_date);
  if (a1 != null && a2 != null) parts.push([2.5, Math.max(0, 1 - Math.abs(a1 - a2) / 15)]);

  let total = 0;
  let got = 0;
  for (const [w, r] of parts) {
    if (r === null) continue;
    total += w;
    got += w * (typeof r === 'number' ? r : r ? 1 : 0);
  }
  if (total < 3) return null; // not enough shared info to say anything
  // Map to 40..99 so the badge stays encouraging but still meaningful.
  return Math.round(40 + (got / total) * 59);
}
