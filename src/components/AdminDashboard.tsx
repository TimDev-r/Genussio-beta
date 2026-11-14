// Internal admin page for the two founders: German only on purpose.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminDashboard, type Dashboard } from "@/lib/feedback.functions";
import { cn } from "@/lib/utils";

const FUNNEL_LABELS: Record<string, string> = {
  signed_up: "Angemeldet (Personen)",
  household: "Haushalt erstellt",
  two_members: "2+ Mitglieder",
  deck_finished: "Deck fertig geswipt",
  plan_created: "Wochenplan erstellt",
  list_opened: "Einkaufsliste geöffnet",
  cooked: "Gericht gekocht",
  reserved: "Reservierung geklickt",
};
const SAVINGS_LABELS: Record<string, string> = {
  nichts: "nichts",
  bis10: "bis 10 €",
  "10bis20": "10–20 €",
  "20bis40": "20–40 €",
  mehr40: "> 40 €",
};
const RESERVATION_LABELS: Record<string, string> = {
  geklickt: "geklickt",
  vorgemerkt: "vorgemerkt",
  bezahlt: "bezahlt",
  erstattet: "erstattet",
};

const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(new Date(iso))
    : "–";
const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function isoDaysAgo(days: number) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

function Kpi({
  label,
  value,
  hint,
  target,
  current,
}: {
  label: string;
  value: string;
  hint?: string;
  target?: number;
  current?: number | null;
}) {
  const ok = target != null && current != null ? current >= target : null;
  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <p className="text-xs font-bold text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-extrabold",
          ok === true && "text-deal",
          ok === false && "text-destructive",
        )}
      >
        {value}
      </p>
      {(hint || target != null) && (
        <p className="text-xs text-muted-foreground">
          {hint}
          {hint && target != null ? " · " : ""}
          {target != null ? `Ziel ${target} %` : ""}
        </p>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [group, setGroup] = useState("all");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard", from, to, group],
    queryFn: () => getAdminDashboard({ data: { from: from || null, to: to || null, group } }),
  });
  const d: Dashboard | undefined = data?.dashboard;
  const k = d?.kpis;
  const pct = (n: number | null | undefined) => (n == null ? "–" : `${n} %`);
  const top = Math.max(1, ...(d?.funnel.map((f) => f.count) ?? [1]));

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link to="/app">
            <ArrowLeft />
            Zur App
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/import">
            <Upload />
            Inhalte importieren
          </Link>
        </Button>
      </header>
      <h1 className="text-2xl font-extrabold">Beta-Dashboard</h1>

      <section className="mt-4 grid gap-3 rounded-3xl border border-border bg-card p-4 sm:grid-cols-3">
        <label className="text-sm font-bold">
          Von
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-bold">
          Bis
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm font-bold">
          Gruppe
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="all">Alle</option>
            <option value="beta">Alle Beta-Codes</option>
            <option value="utm">Alle Anzeigen (utm)</option>
            {data?.groups.map((g) => (
              <option key={`${g.kind}:${g.value}`} value={`${g.kind}:${g.value}`}>
                {g.kind === "beta" ? "Beta-Code" : "Kampagne"} {g.value} ({g.people})
              </option>
            ))}
          </select>
        </label>
      </section>

      {isLoading && <p className="mt-6 text-muted-foreground">Lädt …</p>}
      {error && (
        <p role="alert" className="mt-6 font-bold text-destructive">
          Konnte nicht geladen werden: {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {k && d && (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Anmeldungen" value={String(k.signups)} hint={`${k.households} Haushalte`} />
            <Kpi
              label="Haushalte mit 2+"
              value={pct(k.multi_member_share)}
              target={60}
              current={k.multi_member_share}
            />
            <Kpi label="Deck fertig" value={String(k.deck_finished)} hint="Haushalte" />
            <Kpi label="Plan erstellt" value={String(k.planned)} hint="Haushalte" />
            <Kpi
              label="Gekocht"
              value={pct(k.cooked_share)}
              hint={`${k.cooked} von ${k.planned_dinners} Abendessen`}
              target={50}
              current={k.cooked_share}
            />
            <Kpi
              label="Ø Tage gekocht"
              value={k.checkin.avg_days_cooked == null ? "–" : String(k.checkin.avg_days_cooked)}
              hint={`${k.checkin.answers} Check-ins`}
            />
            <Kpi
              label="„Ja“ zu 39,99 €"
              value={pct(k.checkin.price_yes_share)}
              hint={`${k.checkin.price_answers} Antworten`}
            />
            <Kpi
              label="Reservierungen"
              value={`${k.reservations_clicked} / ${k.reservations_paid}`}
              hint="geklickt / bezahlt"
            />
          </section>

          <section className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-4">
              <h2 className="font-extrabold">Aktiv in Woche 2–4</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {(k.retention ?? []).map((r) => (
                  <li key={r.week} className="flex justify-between">
                    <span>Woche {r.week}</span>
                    <span className="font-bold">
                      {r.eligible
                        ? `${r.active} von ${r.eligible} (${Math.round((r.active / r.eligible) * 100)} %)`
                        : "noch keine"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-border bg-card p-4">
              <h2 className="font-extrabold">Gespart laut Check-in</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.keys(SAVINGS_LABELS).map((key) => (
                  <li key={key} className="flex justify-between">
                    <span>{SAVINGS_LABELS[key]}</span>
                    <span className="font-bold">{k.checkin.savings[key] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card p-4">
            <h2 className="font-extrabold">Funnel</h2>
            <ol className="mt-3 space-y-2">
              {d.funnel.map((f) => (
                <li
                  key={f.step}
                  className="grid grid-cols-[11rem_1fr_3rem] items-center gap-3 text-sm"
                >
                  <span>{FUNNEL_LABELS[f.step] ?? f.step}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${(f.count / top) * 100}%` }}
                    />
                  </span>
                  <span className="text-right font-bold tabular-nums">{f.count}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card p-4">
            <h2 className="font-extrabold">Haushalte ({d.households.length})</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs text-muted-foreground uppercase">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Mitgl.</th>
                    <th className="py-2 pr-3">Gruppe</th>
                    <th className="py-2 pr-3">Erstellt</th>
                    <th className="py-2 pr-3">Zuletzt aktiv</th>
                    <th className="py-2 pr-3">Pläne</th>
                    <th className="py-2 pr-3">Gekocht</th>
                    <th className="py-2">Reservierung</th>
                  </tr>
                </thead>
                <tbody>
                  {d.households.map((h) => (
                    <tr key={h.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 font-bold">{h.name || "–"}</td>
                      <td className="py-2 pr-3">{h.members}</td>
                      <td className="py-2 pr-3">{h.group}</td>
                      <td className="py-2 pr-3">{fmtDate(h.created_at)}</td>
                      <td className="py-2 pr-3">{fmtDate(h.last_activity)}</td>
                      <td className="py-2 pr-3">{h.plans}</td>
                      <td className="py-2 pr-3">{h.cooked}</td>
                      <td className="py-2">
                        {h.reservation ? (RESERVATION_LABELS[h.reservation] ?? h.reservation) : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card p-4">
            <h2 className="font-extrabold">Neuestes Feedback</h2>
            {d.feedback.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Noch kein Feedback.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {d.feedback.map((f) => (
                  <li key={f.id} className="py-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(f.created_at)} · {f.household ?? "ohne Haushalt"} ·{" "}
                      {f.kind === "woche" ? "Wochen-Check-in" : "Feedback"}
                      {f.rating ? ` · ${"★".repeat(f.rating)}` : ""}
                    </p>
                    <p className="mt-1 break-words whitespace-pre-wrap">
                      {f.kind === "woche" ? describeCheckIn(f.answer) : f.answer}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function describeCheckIn(answer: string | null) {
  try {
    const a = JSON.parse(answer ?? "{}") as {
      days_cooked?: number;
      savings?: string;
      would_pay?: string;
      week_start?: string;
    };
    return [
      a.week_start ? `Woche ab ${fmtDate(a.week_start)}` : null,
      a.days_cooked != null ? `${a.days_cooked} Tage gekocht` : null,
      a.savings ? `gespart: ${SAVINGS_LABELS[a.savings] ?? a.savings}` : null,
      a.would_pay ? `39,99 €: ${a.would_pay}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  } catch {
    return answer ?? "";
  }
}
