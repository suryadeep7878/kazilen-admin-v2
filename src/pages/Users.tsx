import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { apiFetch, type AdminUser } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const ROLE_FILTERS = [
  { value: "", label: "All" },
  { value: "customer", label: "Customers" },
  { value: "worker", label: "Workers" },
];

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (roleFilter: string, page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (roleFilter) params.set("role", roleFilter);
      const data = await apiFetch<{ total: number; users: AdminUser[] }>(
        `/api/admin/users?${params.toString()}`
      );
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(role, offset);
  }, [load, role, offset]);

  const toggleOnline = async (u: AdminUser) => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_online: !u.is_online }),
      });
      setNotice(`Worker #${u.id} is now ${u.is_online ? "offline" : "online"}.`);
      await load(role, offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const toggleRole = async (u: AdminUser) => {
    const next = u.role === "worker" ? "customer" : "worker";
    if (!confirm(`Change user #${u.id} to ${next}?`)) return;
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({ role: next }),
      });
      setNotice(`User #${u.id} is now a ${next}.`);
      await load(role, offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const verifyUser = async (u: AdminUser, action: "approve" | "reject") => {
    if (!confirm(`${action === "approve" ? "Approve" : "Reject"} worker #${u.id} (${u.full_name ?? u.phone_number})?`)) return;
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/users/${u.id}/verification`, {
        method: "PUT",
        body: JSON.stringify({ action }),
      });
      setNotice(`Worker #${u.id} ${action === "approve" ? "approved and is now live" : "rejected"}.`);
      await load(role, offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const verificationBadge = (status: string) => {
    if (status === "approved") return <Badge variant="success">approved</Badge>;
    if (status === "rejected") return <Badge variant="destructive">rejected</Badge>;
    return <Badge variant="warning">pending</Badge>;
  };

  const removeUser = async (u: AdminUser) => {
    if (!confirm(`Delete user #${u.id} (${u.full_name ?? u.phone_number})?`)) return;
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      setNotice(`User #${u.id} deleted.`);
      await load(role, offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Users</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            {total} registered {total === 1 ? "account" : "accounts"} on the platform.
          </p>
        </div>
        <Link to="/workers/new">
          <Button size="sm">
            <UserPlus className="h-4 w-4" />
            Add Worker
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {ROLE_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={role === f.value ? "default" : "secondary"}
            onClick={() => {
              setRole(f.value);
              setOffset(0);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {notice && (
        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2">
          {notice}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2 mb-3">
              {error}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-bold">ID</th>
                  <th className="py-2 pr-3 font-bold">Name</th>
                  <th className="py-2 pr-3 font-bold">Phone</th>
                  <th className="py-2 pr-3 font-bold">Role</th>
                  <th className="py-2 pr-3 font-bold">Verification</th>
                  <th className="py-2 pr-3 font-bold">Status</th>
                  <th className="py-2 pr-3 font-bold">Referrals</th>
                  <th className="py-2 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 last:border-0 text-slate-700"
                  >
                    <td className="py-2 pr-3 font-bold text-slate-900">#{u.id}</td>
                    <td className="py-2 pr-3 font-medium">
                      <span className="flex items-center gap-2">
                        {u.profile_photo ? (
                          <img
                            src={u.profile_photo}
                            alt={u.full_name ?? "Worker photo"}
                            className="w-8 h-8 rounded-sm border border-slate-200 object-cover shrink-0"
                          />
                        ) : (
                          <span className="w-8 h-8 rounded-sm bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">
                            {(u.full_name ?? "W").trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                        {u.full_name ?? "-"}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{u.phone_number}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={u.role === "worker" ? "brand" : "default"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3">
                      {u.role === "worker" ? (
                        verificationBadge(u.verification_status ?? "approved")
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {u.role === "worker" ? (
                        <button
                          title="Toggle online/offline"
                          onClick={() => toggleOnline(u)}
                        >
                          <Badge variant={u.is_online ? "success" : "default"}>
                            {u.is_online ? "online" : "offline"}
                          </Badge>
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{u.referral_points}</td>
                    <td className="py-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {u.role === "worker" && (u.verification_status ?? "approved") === "pending" && (
                          <>
                            <Button
                              size="sm"
                              title="Approve worker (goes live in marketplace)"
                              onClick={() => verifyUser(u, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              title="Reject worker"
                              onClick={() => verifyUser(u, "reject")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          title={u.role === "worker" ? "Convert to customer" : "Convert to worker"}
                          onClick={() => toggleRole(u)}
                        >
                          {u.role === "worker" ? "To customer" : "To worker"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          title="Delete user"
                          onClick={() => removeUser(u)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {isLoading && (
            <p className="text-xs font-semibold text-slate-500 py-3">Loading...</p>
          )}
          <div className="flex items-center justify-between pt-3">
            <p className={cn("text-[11px] font-semibold text-slate-500")}>
              Page {offset + 1} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={offset + 1 >= pageCount}
                onClick={() => setOffset((o) => o + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
