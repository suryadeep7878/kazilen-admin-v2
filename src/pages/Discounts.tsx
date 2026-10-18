import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DiscountRow {
  id: number;
  code: string;
  discount_type: string;
  value: number;
  scope: string;
  user_ids: string | null;
  min_amount: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
}

export default function Discounts() {
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscountRow | null>(null);
  const [form, setForm] = useState({
    code: "",
    discount_type: "flat",
    value: "100",
    scope: "all",
    user_ids: "",
    min_amount: "0",
    max_uses: "",
    valid_from: "",
    valid_to: "",
    is_active: true,
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ discounts: DiscountRow[] }>("/api/admin/discounts");
      setRows(data.discounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load discounts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ code: "", discount_type: "flat", value: "100", scope: "all", user_ids: "", min_amount: "0", max_uses: "", valid_from: "", valid_to: "", is_active: true });
    setShowForm(true);
  };

  const openEdit = (d: DiscountRow) => {
    setEditing(d);
    let ids = "";
    try {
      const parsed = d.user_ids ? JSON.parse(d.user_ids) : [];
      if (Array.isArray(parsed)) ids = parsed.join(", ");
    } catch {
      ids = d.user_ids ?? "";
    }
    setForm({
      code: d.code,
      discount_type: d.discount_type,
      value: String(d.value),
      scope: d.scope,
      user_ids: ids,
      min_amount: String(d.min_amount ?? 0),
      max_uses: d.max_uses != null ? String(d.max_uses) : "",
      valid_from: d.valid_from ?? "",
      valid_to: d.valid_to ?? "",
      is_active: d.is_active,
    });
    setShowForm(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        value: Number(form.value) || 0,
        scope: form.scope,
        user_ids: form.scope === "users" ? form.user_ids.split(",").map((x) => x.trim()).filter(Boolean) : [],
        min_amount: Number(form.min_amount) || 0,
        max_uses: form.max_uses === "" ? null : Number(form.max_uses),
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        is_active: form.is_active,
      };
      if (editing) {
        await apiFetch(`/api/admin/discounts/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice(`Discount ${editing.code} updated.`);
      } else {
        await apiFetch("/api/admin/discounts", { method: "POST", body: JSON.stringify(payload) });
        setNotice(`Discount ${payload.code} created.`);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const remove = async (d: DiscountRow) => {
    if (!confirm(`Delete discount ${d.code}?`)) return;
    try {
      await apiFetch(`/api/admin/discounts/${d.id}`, { method: "DELETE" });
      setNotice(`Discount ${d.code} deleted.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Discounts</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            {rows.length} codes for all customers or specific customers. Applied at booking.
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Add Discount
        </Button>
      </div>

      {notice && (
        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2">{notice}</p>
      )}
      {error && (
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-bold">Code</th>
                  <th className="py-2 pr-3 font-bold">Off</th>
                  <th className="py-2 pr-3 font-bold">Scope</th>
                  <th className="py-2 pr-3 font-bold">Used</th>
                  <th className="py-2 pr-3 font-bold">Status</th>
                  <th className="py-2 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0 text-slate-700">
                    <td className="py-2 pr-3 font-bold text-slate-900">{d.code}</td>
                    <td className="py-2 pr-3">{d.discount_type === "percent" ? `${d.value}%` : `₹${d.value}`}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={d.scope === "all" ? "success" : "brand"}>{d.scope}</Badge>
                    </td>
                    <td className="py-2 pr-3">{d.used_count}{d.max_uses != null ? `/${d.max_uses}` : ""}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={d.is_active ? "success" : "default"}>{d.is_active ? "active" : "hidden"}</Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(d)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => remove(d)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500">
                      No discount codes yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {isLoading && <p className="text-xs font-semibold text-slate-500 py-3">Loading...</p>}
        </CardContent>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-md border border-slate-200 shadow-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">{editing ? `Edit ${editing.code}` : "Add discount"}</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              {!editing && (
                <div className="space-y-1.5">
                  <Label htmlFor="disc-code">Code (e.g. DIWALI10)</Label>
                  <Input id="disc-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="DIWALI10" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="disc-type">Type</Label>
                  <select
                    id="disc-type"
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                    className="flex h-9 w-full bg-white border border-slate-300 text-sm font-medium text-slate-900 rounded-sm px-3 py-1.5 focus:outline-none focus:border-brand"
                  >
                    <option value="flat">Flat ₹ off</option>
                    <option value="percent">Percent % off</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="disc-value">Value</Label>
                  <Input id="disc-value" type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disc-scope">Applies to</Label>
                <select
                  id="disc-scope"
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  className="flex h-9 w-full bg-white border border-slate-300 text-sm font-medium text-slate-900 rounded-sm px-3 py-1.5 focus:outline-none focus:border-brand"
                >
                  <option value="all">All customers</option>
                  <option value="users">Specific customers</option>
                </select>
              </div>
              {form.scope === "users" && (
                <div className="space-y-1.5">
                  <Label htmlFor="disc-users">Customer user IDs (comma separated)</Label>
                  <Input id="disc-users" value={form.user_ids} onChange={(e) => setForm({ ...form, user_ids: e.target.value })} placeholder="e.g. 5, 12" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="disc-min">Min booking ₹</Label>
                  <Input id="disc-min" type="number" min="0" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="disc-max">Max uses (blank = unlimited)</Label>
                  <Input id="disc-max" type="number" min="0" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="∞" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" size="sm">{editing ? "Save" : "Create"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
