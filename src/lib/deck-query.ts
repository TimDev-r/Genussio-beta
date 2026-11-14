import { queryOptions } from "@tanstack/react-query";
import { getDeck, getMatches } from "./deck.functions";

// staleTime 0 + refetch on focus: cards removed by refresh_deck never linger on screen.
export const deckQuery = () =>
  queryOptions({
    queryKey: ["deck"],
    queryFn: () => getDeck(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

export const matchesQuery = () =>
  queryOptions({
    queryKey: ["matches"],
    queryFn: () => getMatches(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
