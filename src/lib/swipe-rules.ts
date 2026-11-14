import type { Vote } from "./deck.functions";

export type SwipeRow = { member_id: string; recipe_id: string; vote: Vote };
type MemberLike = { id: string; is_kid: boolean; user_id: string | null };

/** Cards the member hasn't voted on yet, in deck order. */
export function remainingCards<T extends { recipe_id: string; position: number }>(
  cards: readonly T[],
  swipes: readonly SwipeRow[],
  memberId: string,
) {
  const done = new Set(swipes.filter((s) => s.member_id === memberId).map((s) => s.recipe_id));
  return [...cards].sort((a, b) => a.position - b.position).filter((c) => !done.has(c.recipe_id));
}

/** How many of the current cards the member has voted on. */
export function swipedCount(
  cards: readonly { recipe_id: string }[],
  swipes: readonly SwipeRow[],
  memberId: string,
) {
  const ids = new Set(cards.map((c) => c.recipe_id));
  return new Set(
    swipes.filter((s) => s.member_id === memberId && ids.has(s.recipe_id)).map((s) => s.recipe_id),
  ).size;
}

export function memberDone(
  cards: readonly { recipe_id: string }[],
  swipes: readonly SwipeRow[],
  memberId: string,
) {
  return cards.length > 0 && swipedCount(cards, swipes, memberId) >= cards.length;
}

/** You can vote for yourself and for kid profiles; other adults swipe on their own phones. */
export function canSwipeFor(member: MemberLike, myMemberId: string | null) {
  return member.id === myMemberId || (member.is_kid && member.user_id === null);
}

/** Drag distance → vote. Up counts as super-like when it clearly beats the sideways movement. */
export function voteFromDrag(dx: number, dy: number, threshold = 100): Vote | null {
  if (-dy > threshold && Math.abs(dy) > Math.abs(dx)) return "super";
  if (dx > threshold) return "like";
  if (dx < -threshold) return "nope";
  return null;
}

/** Replace or add one member's vote locally (optimistic update). */
export function applySwipe(swipes: readonly SwipeRow[], next: SwipeRow) {
  return [
    ...swipes.filter((s) => !(s.member_id === next.member_id && s.recipe_id === next.recipe_id)),
    next,
  ];
}

export function removeSwipe(swipes: readonly SwipeRow[], memberId: string, recipeId: string) {
  return swipes.filter((s) => !(s.member_id === memberId && s.recipe_id === recipeId));
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const [first, second] = parts;
  if (!first) return "?";
  return ((first[0] ?? "") + (second?.[0] ?? "")).toUpperCase();
}
