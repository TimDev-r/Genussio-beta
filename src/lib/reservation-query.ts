import { queryOptions } from "@tanstack/react-query";
import { getReservation } from "./reservation.functions";

export const reservationQuery = () =>
  queryOptions({ queryKey: ["reservation"], queryFn: () => getReservation(), staleTime: 0 });
