import { describe, expect, it } from "vitest";
import {
  applySwipe,
  canSwipeFor,
  initials,
  memberDone,
  remainingCards,
  removeSwipe,
  swipedCount,
  voteFromDrag,
} from "@/lib/swipe-rules";

const cards = [
  { recipe_id: "r2", position: 2 },
  { recipe_id: "r1", position: 1 },
  { recipe_id: "r3", position: 3 },
];

describe("swipe rules", () => {
  it("keeps deck order and skips cards the member already voted on", () => {
    const swipes = [
      { member_id: "me", recipe_id: "r1", vote: "like" as const },
      { member_id: "kid", recipe_id: "r2", vote: "nope" as const },
    ];
    expect(remainingCards(cards, swipes, "me").map((c) => c.recipe_id)).toEqual(["r2", "r3"]);
    expect(remainingCards(cards, swipes, "kid").map((c) => c.recipe_id)).toEqual(["r1", "r3"]);
  });

  it("ignores old votes on cards that left the deck", () => {
    const swipes = [
      { member_id: "me", recipe_id: "gone", vote: "like" as const },
      { member_id: "me", recipe_id: "r1", vote: "like" as const },
    ];
    expect(swipedCount(cards, swipes, "me")).toBe(1);
    expect(memberDone(cards, swipes, "me")).toBe(false);
  });

  it("marks a member done after voting on every card", () => {
    const swipes = cards.map((c) => ({
      member_id: "me",
      recipe_id: c.recipe_id,
      vote: "nope" as const,
    }));
    expect(memberDone(cards, swipes, "me")).toBe(true);
    expect(memberDone([], swipes, "me")).toBe(false);
  });

  it("lets you vote for yourself and kids, not for other adults", () => {
    expect(canSwipeFor({ id: "me", is_kid: false, user_id: "u1" }, "me")).toBe(true);
    expect(canSwipeFor({ id: "kid", is_kid: true, user_id: null }, "me")).toBe(true);
    expect(canSwipeFor({ id: "other", is_kid: false, user_id: "u2" }, "me")).toBe(false);
  });

  it("turns drags into votes", () => {
    expect(voteFromDrag(150, 10)).toBe("like");
    expect(voteFromDrag(-150, 10)).toBe("nope");
    expect(voteFromDrag(20, -160)).toBe("super");
    expect(voteFromDrag(40, -30)).toBeNull();
  });

  it("replaces and removes votes", () => {
    let s = applySwipe([], { member_id: "me", recipe_id: "r1", vote: "like" });
    s = applySwipe(s, { member_id: "me", recipe_id: "r1", vote: "super" });
    expect(s).toEqual([{ member_id: "me", recipe_id: "r1", vote: "super" }]);
    expect(removeSwipe(s, "me", "r1")).toEqual([]);
  });

  it("makes initials", () => {
    expect(initials("Egor Sklyarov")).toBe("ES");
    expect(initials("mia")).toBe("M");
    expect(initials(null)).toBe("?");
  });
});
