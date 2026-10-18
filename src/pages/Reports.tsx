import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Summary {
  total_bookings: number;
  completed_bookings: number;
  total_revenue: number;
  ever_active_customers: number;
  repeat_customers: number;
  repeat_rate: number;
  daily: Array<{ date: string; bookings: number; revenue: number }>;
}

interface Churn {
  days: number;
  cutoff: string;
  ever_active_customers: number;
  active_customers: number;
  churned_customers: number;
  churn_rate: number;
}

export default function Reports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState("60");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [churn, setChurn] = useState<Churn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sParams = new URLSearchParams();
      if (from) sParams.set("from", from);
      if (to) sParams.set("to", to);
      const [s, c] = await Promise.all([
        apiFetch<Summary & { status: string }>(`/api/admin/reports/summary?${sParams.toString()}`),
        apiFetch<Churn & { status: string }>(`/api/admin/reports/churn?days=${Number(days) || 60}`),
      ]);
      setSummary(s);
      setChurn(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, [from, to, days]);

  useEffect(() => {
    load();
  }, [load]);

  const maxBookings = Math.max(1, ...(summary?.daily.map((d) => d.bookings) ?? [1]));

  const exportCsv = () => {
    if (!summary) return;
    const lines = ["date,bookings,revenue", ...summary.daily.map((d) => `${d.date},${d.bookings},${d.revenue}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kazilen-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Business Report</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Bookings, revenue, repeat rate and customer churn.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!summary}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rep-from">From</Label>
              <Input id="rep-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-to">To</Label>
              <Input id="rep-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-days">Churn window (days)</Label>
              <select
                id="rep-days"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="flex h-9 bg-white border border-slate-300 text-sm font-medium text-slate-900 rounded-sm px-3 py-1.5 focus:outline-none focus:border-brand"
              >
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
            <Button size="sm" onClick={load}>Apply</Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-xs font-semibold text-slate-500 py-3">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Total bookings", value: String(summary?.total_bookings ?? 0) },
              { label: "Revenue (completed)", value: `₹${summary?.total_revenue ?? 0}` },
              { label: "Repeat rate", value: `${summary?.repeat_rate ?? 0}%` },
              { label: "Churn rate", value: `${churn?.churn_rate ?? 0}%` },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
                  <p className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Churn — {churn?.churned_customers ?? 0} churned of {churn?.ever_active_customers ?? 0} ever-active
                (active since {churn?.cutoff ?? "-"}: {churn?.active_customers ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 leading-relaxed">
                Churned = customer with a booking before {churn?.cutoff ?? "-"} and none in the last {churn?.days ?? days} days.
                Churn rate = churned / ever-active × 100.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bookings by day</CardTitle>
            </CardHeader>
            <CardContent>
              {(summary?.daily ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">No bookings in this range.</p>
              ) : (
                <div className="space-y-1.5">
                  {(summary?.daily ?? []).slice(-30).map((d) => (
                    <div key={d.date} className="flex items-center gap-2 text-xs">
                      <span className="w-24 shrink-0 font-semibold text-slate-500">{d.date}</span>
                      <div className="flex-1 h-4 bg-slate-100 rounded-sm overflow-hidden">
                        <div
                          className="h-4 bg-[#ff8a4c] rounded-sm"
                          style={{ width: `${Math.max(2, (d.bookings / maxBookings) * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right font-bold text-slate-900">{d.bookings} · ₹{d.revenue}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
