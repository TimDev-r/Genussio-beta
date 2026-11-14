import { queryOptions } from "@tanstack/react-query";
import { getHousehold } from "./household.functions";
export const householdQuery = () =>
  queryOptions({ queryKey: ["household"], queryFn: () => getHousehold(), staleTime: 0 });
