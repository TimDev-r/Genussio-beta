import { queryOptions } from "@tanstack/react-query";
import { getList, getPlan } from "./plan.functions";

export const planQuery = () =>
  queryOptions({
    queryKey: ["plan"],
    queryFn: () => getPlan(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

export const listQuery = () =>
  queryOptions({
    queryKey: ["list"],
    queryFn: () => getList(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
