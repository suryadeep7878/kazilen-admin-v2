import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  apiFetch,
  type MembershipPlan,
  type MembershipSubscription,
  type SubscriptionPayment,
  type WorkerQuota,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Membership() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<MembershipSubscription[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    price: "399",
    duration_days: "30",
    bookings_included: "10",
    description: "",
    features: "",
    is_active: true,
  });
  const [assignForm, setAssignForm] = useState({ worker_id: "", plan_id: "" });
  const [quotaLookup, setQuotaLookup] = useState("");
  const [quota, setQuota] = useState<WorkerQuota | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [p, s, pay] = await Promise.all([
        apiFetch<{ plans: MembershipPlan[] }>("/api/membership/admin/plans"),
        apiFetch<{ subscriptions: MembershipSubscription[] }>("/api/membership/admin/subscriptions?limit=20"),
        apiFetch<{ payments: SubscriptionPayment[] }>("/api/payments/admin/payments?limit=20").catch(() => ({ payments: [] as SubscriptionPayment[] })),
      ]);
      setPlans(p.plans);
      setSubscriptions(s.subscriptions);
      setPayments(pay.payments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load membership");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanForm({ name: "", price: "399", duration_days: "30", bookings_included: "10", description: "", features: "", is_active: true });
    setShowPlanForm(true);
  };

  const openEditPlan = (p: MembershipPlan) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name,
      price: String(p.price),
      duration_days: String(p.duration_days),
      bookings_included: p.bookings_included != null ? String(p.bookings_included) : "",
      description: p.description ?? "",
      features: (p.features || []).join("\n"),
      is_active: p.is_active,
    });
    setShowPlanForm(true);
  };

  const submitPlan = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        name: planForm.name.trim(),
        price: Number(planForm.price) || 0,
        duration_days: Number(planForm.duration_days) || 30,
        bookings_included: planForm.bookings_included === "" ? null : Number(planForm.bookings_included),
        description: planForm.description.trim() || null,
        features: planForm.features.split("\n").map((f) => f.trim()).filter(Boolean),
        is_active: planForm.is_active,
      };
      if (editingPlan) {
        await apiFetch(`/api/membership/admin/plans/${editingPlan.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Membership plan updated. Worker site reads active plans.");
      } else {
        await apiFetch("/api/membership/admin/plans", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Membership plan created.");
      }
      setShowPlanForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const deletePlan = async (id: number) => {
    if (!confirm(`Delete plan #${id}?`)) return;
    try {
      await apiFetch(`/api/membership/admin/plans/${id}`, { method: "DELETE" });
      setNotice(`Plan #${id} deleted.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const assignPlan = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/api/membership/admin/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          worker_id: Number(assignForm.worker_id),
          plan_id: Number(assignForm.plan_id),
          status: "active",
        }),
      });
      setNotice("Worker subscribed to plan.");
      setAssignForm({ worker_id: "", plan_id: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    }
  };

  const setSubStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/api/membership/admin/subscriptions/${id}?status=${status}`, { method: "PUT" });
      setNotice(`Subscription #${id} set to ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Membership</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Worker subscription plans shown on the worker site. Assign or cancel subscriptions here.
          </p>
        </div>
        <Button size="sm" onClick={openNewPlan}>
          <Plus className="h-4 w-4" />
          Add Plan
        </Button>
      </div>

      {notice && (
        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2">{notice}</p>
      )}
      {error && (
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{p.name}</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">₹{p.price} · {p.duration_days} days · {p.bookings_included ?? "∞"} bookings</p>
                </div>
                <Badge variant={p.is_active ? "success" : "default"}>{p.is_active ? "active" : "hidden"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.description && <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>}
              {(p.features || []).length > 0 && (
                <ul className="text-xs text-slate-600 list-disc pl-4 space-y-0.5">
                  {p.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] font-semibold text-slate-500">{p.subscribers_count} active subscribers</p>
              <div className="flex gap-1.5 pt-1">
                <Button size="sm" variant="secondary" onClick={() => openEditPlan(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button size="sm" variant="secondary" onClick={() => deletePlan(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!isLoading && plans.length === 0 && (
        <p className="text-xs text-slate-500">No plans yet. Create one to show on the worker site.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Check worker quota (2 free, then plan)</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setQuotaError(null);
              setQuota(null);
              try {
                const data = await apiFetch<{ status: string; quota: WorkerQuota }>(
                  `/api/admin/users/${quotaLookup}/quota`
                );
                setQuota(data.quota);
              } catch (err) {
                setQuotaError(err instanceof Error ? err.message : "Lookup failed");
              }
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="quota-worker-id">Worker ID</Label>
              <Input id="quota-worker-id" type="number" min="1" required value={quotaLookup} onChange={(e) => setQuotaLookup(e.target.value)} placeholder="e.g. 5" />
            </div>
            <Button type="submit" size="sm" variant="secondary">Check</Button>
          </form>
          {quotaError && <p className="text-xs font-semibold text-amber-700 mt-2">{quotaError}</p>}
          {quota && (
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              {quota.subscribed ? (
                <p>
                  Plan: <span className="font-bold text-slate-900">{quota.plan_name ?? "-"}</span> ·{" "}
                  {quota.plan_used}/{quota.plan_limit ?? "∞"} used
                  {quota.quota_exhausted ? " · exhausted" : ` · ${quota.plan_remaining ?? 0} left`}
                </p>
              ) : (
                <p>
                  Free tier: <span className="font-bold text-slate-900">{quota.free_used}/{quota.free_limit}</span> used
                  {quota.quota_exhausted ? " · exhausted — needs plan" : ` · ${quota.free_remaining} left`}
                </p>
              )}
              {quota.subscription && (
                <p className="text-[11px] text-slate-500">
                  Latest: {quota.subscription.plan_name ?? `#${quota.subscription.plan_id}`} · {quota.subscription.status} · expires {quota.subscription.expires_at ?? "-"}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign plan to worker</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={assignPlan} className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="worker-id">Worker ID</Label>
              <Input id="worker-id" type="number" min="1" required value={assignForm.worker_id} onChange={(e) => setAssignForm({ ...assignForm, worker_id: e.target.value })} placeholder="e.g. 5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-id">Plan</Label>
              <select
                id="plan-id"
                value={assignForm.plan_id}
                onChange={(e) => setAssignForm({ ...assignForm, plan_id: e.target.value })}
                required
                className="flex h-9 bg-white border border-slate-300 text-sm font-medium text-slate-900 rounded-sm px-3 py-1.5 focus:outline-none focus:border-brand"
              >
                <option value="">Select...</option>
                {plans.filter((p) => p.is_active).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">Subscribe</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent subscriptions (manual + online)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-bold">ID</th>
                  <th className="py-2 pr-3 font-bold">Worker</th>
                  <th className="py-2 pr-3 font-bold">Plan</th>
                  <th className="py-2 pr-3 font-bold">Status</th>
                  <th className="py-2 pr-3 font-bold">Expires</th>
                  <th className="py-2 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 text-slate-700">
                    <td className="py-2 pr-3 font-bold text-slate-900">#{s.id}</td>
                    <td className="py-2 pr-3">{s.worker_name ?? `#${s.worker_id}`}</td>
                    <td className="py-2 pr-3">{s.plan_name ?? `#${s.plan_id}`}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={s.status === "active" ? "success" : "default"}>{s.status}</Badge>
                    </td>
                    <td className="py-2 pr-3">{s.expires_at ?? "-"}</td>
                    <td className="py-2">
                      <div className="flex gap-1.5">
                        {s.status !== "cancelled" && (
                          <Button size="sm" variant="secondary" onClick={() => setSubStatus(s.id, "cancelled")}>Cancel</Button>
                        )}
                        {s.status !== "active" && (
                          <Button size="sm" variant="secondary" onClick={() => setSubStatus(s.id, "active")}>Activate</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500">No subscriptions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {isLoading && <p className="text-xs font-semibold text-slate-500 py-3">Loading...</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Online payments (Razorpay)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
            Read-only receipt log for worker online payments. Manual admin assignments above do not appear here.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-bold">ID</th>
                  <th className="py-2 pr-3 font-bold">Worker</th>
                  <th className="py-2 pr-3 font-bold">Plan</th>
                  <th className="py-2 pr-3 font-bold">Amount</th>
                  <th className="py-2 pr-3 font-bold">Status</th>
                  <th className="py-2 pr-3 font-bold">Order / Payment</th>
                  <th className="py-2 font-bold">Sub</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pay) => (
                  <tr key={pay.id} className="border-b border-slate-100 last:border-0 text-slate-700">
                    <td className="py-2 pr-3 font-bold text-slate-900">#{pay.id}</td>
                    <td className="py-2 pr-3">{pay.worker_name ?? `#${pay.worker_id}`}</td>
                    <td className="py-2 pr-3">{pay.plan_name ?? `#${pay.plan_id}`}</td>
                    <td className="py-2 pr-3">₹{pay.amount}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={pay.status === "captured" ? "success" : "default"}>{pay.status}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-[11px] text-slate-500">
                      {pay.razorpay_order_id}
                      {pay.razorpay_payment_id ? ` / ${pay.razorpay_payment_id}` : ""}
                      {pay.failure_reason ? ` · ${pay.failure_reason}` : ""}
                    </td>
                    <td className="py-2">{pay.subscription_id ? `#${pay.subscription_id}` : "-"}</td>
                  </tr>
                ))}
                {!isLoading && payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-500">No online payments yet. Manual assignments are listed above.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {isLoading && <p className="text-xs font-semibold text-slate-500 py-3">Loading...</p>}
        </CardContent>
      </Card>

      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-md border border-slate-200 shadow-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">{editingPlan ? "Edit plan" : "Add plan"}</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowPlanForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={submitPlan} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="plan-name">Name</Label>
                <Input id="plan-name" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required placeholder="e.g. Pro" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-price">Price ₹</Label>
                  <Input id="plan-price" type="number" min="0" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-days">Days</Label>
                  <Input id="plan-days" type="number" min="1" value={planForm.duration_days} onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-bookings">Bookings</Label>
                  <Input id="plan-bookings" type="number" min="0" value={planForm.bookings_included} onChange={(e) => setPlanForm({ ...planForm, bookings_included: e.target.value })} placeholder="∞" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-desc">Description</Label>
                <Input id="plan-desc" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="Priority dispatch..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-features">Features (one per line)</Label>
                <textarea
                  id="plan-features"
                  rows={4}
                  value={planForm.features}
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                  placeholder={"30 bookings\nPriority dispatch"}
                  className="flex w-full bg-white border border-slate-300 text-sm font-medium text-slate-900 rounded-sm px-3 py-1.5 focus:outline-none focus:border-brand"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={planForm.is_active} onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })} />
                Visible on worker site
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowPlanForm(false)}>Cancel</Button>
                <Button type="submit" size="sm">{editingPlan ? "Save" : "Create"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
