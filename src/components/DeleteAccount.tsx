import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteMyAccount } from "@/lib/reservation.functions";
import { supabase } from "@/integrations/supabase/client";

/** "Konto löschen": removes the account; the household goes with its last adult. */
export function DeleteAccount({ lastAdult }: { lastAdult: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      await deleteMyAccount();
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      queryClient.clear();
      void navigate({ to: "/", replace: true });
    } catch {
      setError(t("account.error"));
      setBusy(false);
    }
  }

  return (
    <div className="px-6 pb-10">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={busy}
          >
            <Trash2 />
            {t("account.delete")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("account.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {lastAdult ? t("account.confirmLast") : t("account.confirmMember")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("account.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void run()}
            >
              {t("account.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
