import { useCallback, useEffect, useState } from "react";
import { Pencil, Star, Trash2, X } from "lucide-react";
import { apiFetch, type AdminReview } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 20;

export default function Reviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<AdminReview | null>(null);
  const [editRating, setEditRating] = useState("5");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      const data = await apiFetch<{ total: number; reviews: AdminReview[] }>(
        `/api/admin/reviews?${params.toString()}`
      );
      setReviews(data.reviews);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(offset);
  }, [load, offset]);

  const remove = async (id: number) => {
    if (!confirm(`Delete review #${id}?`)) return;
    try {
      await apiFetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      setNotice(`Review #${id} deleted.`);
      await load(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const openEdit = (r: AdminReview) => {
    setEditing(r);
    setEditRating(String(r.rating));
    setEditDescription(r.description);
    setError(null);
    setNotice(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const rating = Number(editRating);
    if (!rating || rating < 1 || rating > 5) {
      setError("Rating must be 1-5");
      return;
    }
    if (!editDescription.trim()) {
      setError("Description cannot be empty");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/reviews/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({ rating, description: editDescription.trim() }),
      });
      setNotice(`Review #${editing.id} updated.`);
      setEditing(null);
      await load(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">Reviews</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          {total} participant {total === 1 ? "review" : "reviews"} from completed bookings.
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
          <CardTitle>All reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-bold">ID</th>
                  <th className="py-2 pr-3 font-bold">Booking</th>
                  <th className="py-2 pr-3 font-bold">Reviewer</th>
                  <th className="py-2 pr-3 font-bold">Reviewee</th>
                  <th className="py-2 pr-3 font-bold">Rating</th>
                  <th className="py-2 pr-3 font-bold">Comment</th>
                  <th className="py-2 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 text-slate-700 align-top">
                    <td className="py-2 pr-3 font-bold text-slate-900">#{r.id}</td>
                    <td className="py-2 pr-3">#{r.booking_id}<br /><span className="text-slate-400">{r.service_id}</span></td>
                    <td className="py-2 pr-3">{r.reviewer_name ?? `#${r.reviewer_id}`}</td>
                    <td className="py-2 pr-3">{r.reviewee_name ?? `#${r.reviewee_id}`}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="warning">
                        <Star className="h-3 w-3" />
                        {r.rating}/5
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 max-w-64">
                      <p className="line-clamp-3 leading-relaxed">{r.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{r.created_at ?? ""}</p>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="secondary" title="Edit review" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="secondary" title="Delete review" onClick={() => remove(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && reviews.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-500">
                      No reviews yet.
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-md border border-slate-200 shadow-2xl p-5 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Edit review #{editing.id}</h3>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-rating">Rating (1-5)</Label>
                <select
                  id="edit-rating"
                  value={editRating}
                  onChange={(e) => setEditRating(e.target.value)}
                  className="flex h-9 w-full bg-white border border-slate-300 text-sm font-medium text-slate-900 rounded-sm px-3 py-1.5 focus:outline-none focus:border-brand"
                >
                  <option value="1">1 - Poor</option>
                  <option value="2">2 - Fair</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-desc">Comment</Label>
                <textarea
                  id="edit-desc"
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="flex w-full bg-white border border-slate-300 text-sm text-slate-900 rounded-sm px-3 py-1.5 leading-relaxed focus:outline-none focus:border-brand"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" disabled={isSaving} onClick={saveEdit}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
