import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
export const SessionContext = createContext<{ user: User | null; ready: boolean; error: boolean }>({
  user: null,
  ready: false,
  error: false,
});
export const useSession = () => useContext(SessionContext);
