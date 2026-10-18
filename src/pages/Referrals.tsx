import { useCallback, useEffect, useState } from "react";
import { Gift, Trophy } from "lucide-react";
import { apiFetch, type ReferralClaim, type ReferralConfig, type ReferralLeader } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 20;

export default function Referrals() {
  const [leaders, setLeaders] = useState<ReferralLeader[]>([]);
  const [claims, setClaims] = useState<ReferralClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<ReferralConfig>({ mode: "both", referrer_reward_rs: 50, referred_reward_rs: 20, is_active: true });
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      const data = await apiFetch<{ total: number; leaders: ReferralLeader[]; claims: ReferralClaim[]; config?: ReferralConfig }>(
        `/api/admin/referrals?${params.toString()}`
      );
      setLeaders(data.leaders);
      setClaims(data.claims);
      setTotal(data.total);
      if (data.config) setConfig(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referrals");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveConfig = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ config: ReferralConfig }>("/api/admin/referrals/config", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      setConfig(data.config);
      setNotice(`Referral rewards saved: ₹${data.config.referrer_reward_rs} referrer / ₹${data.config.referred_reward_rs} referred (${data.config.mode}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    load(offset);
  }, [load, offset]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">Refer & Earn</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          {total} referral {total === 1 ? "claim" : "claims"}. Points + ₹ rewards are awarded automatically on registration.
        </p>
      </div>

      {notice && (
        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2">{notice}</p>
      )}
      {error && (
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reward settings (₹)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ref-mode">Give reward to</Label>
              <select
                id="ref-mode"
                value={config.mode}
                onChange={(e) => setConfig({ ...config, mode: e.target.value })}
                className="flex h-9 bg-white border border-slate-300 text-sm font-medium text-slate-900 rounded-sm px-3 py-1.5 focus:outline-none focus:border-brand"
              >
                <option value="both">Both referrer + referred</option>
                <option value="referrer_only">Referrer only</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-referrer">Referrer ₹</Label>
              <Input id="ref-referrer" type="number" min="0" value={String(config.referrer_reward_rs)} onChange={(e) => setConfig({ ...config, referrer_reward_rs: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-referred">Referred ₹</Label>
              <Input id="ref-referred" type="number" min="0" value={String(config.referred_reward_rs)} onChange={(e) => setConfig({ ...config, referred_reward_rs: Number(e.target.value) || 0 })} disabled={config.mode !== "both"} />
            </div>
            <Button size="sm" disabled={isSaving} onClick={saveConfig}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" />
              Leaderboard
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-bold">User</th>
                  <th className="py-2 pr-3 font-bold">Phone</th>
                  <th className="py-2 pr-3 font-bold">Role</th>
                  <th className="py-2 pr-3 font-bold">Code</th>
                  <th className="py-2 pr-3 font-bold">Points</th>
                  <th className="py-2 font-bold">Earnings ₹</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0 text-slate-700">
                    <td className="py-2 pr-3 font-medium text-slate-900">{l.full_name ?? `#${l.id}`}</td>
                    <td className="py-2 pr-3">{l.phone_number}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={l.role === "worker" ? "brand" : "default"}>{l.role}</Badge>
                    </td>
                    <td className="py-2 pr-3 font-bold">{l.referral_code ?? "-"}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="warning">
                        <Gift className="h-3 w-3" />
                        {l.referral_points}
                      </Badge>
                    </td>
                    <td className="py-2 font-bold text-slate-900">₹{l.referral_earnings ?? 0}</td>
                  </tr>
                ))}
                {!isLoading && leaders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500">
                      No referrals yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent claims</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-bold">ID</th>
                  <th className="py-2 pr-3 font-bold">Referrer</th>
                  <th className="py-2 pr-3 font-bold">Referred</th>
                  <th className="py-2 pr-3 font-bold">Code</th>
                  <th className="py-2 font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 text-slate-700">
                    <td className="py-2 pr-3 font-bold text-slate-900">#{c.id}</td>
                    <td className="py-2 pr-3">{c.referrer_name ?? `#${c.referrer_id}`}</td>
                    <td className="py-2 pr-3">{c.referred_name ?? `#${c.referred_user_id}`}</td>
                    <td className="py-2 pr-3 font-bold">{c.referral_code}</td>
                    <td className="py-2">{c.created_at ?? "-"}</td>
                  </tr>
                ))}
                {!isLoading && claims.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500">
                      No claims yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {isLoading && <p className="text-xs font-semibold text-slate-500 py-3">Loading...</p>}
          <div className="flex items-center justify-between pt-3">
            <p className="text-[11px] font-semibold text-slate-500">Page {offset + 1} of {pageCount}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - 1))}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={offset + 1 >= pageCount} onClick={() => setOffset((o) => o + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
