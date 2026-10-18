import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import {
  apiFetch,
  getAdminToken,
  type AdminCategory,
  type AdminSubCategory,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

async function uploadCatalogImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const token = getAdminToken();
  const res = await fetch(`${API_URL}/api/admin/catalog/upload`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    let detail = `Upload failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch { /* keep default */ }
    throw new Error(detail);
  }
  const data = await res.json();
  // Resolve relative /static URLs against API host for preview + storage.
  const url = String(data.url || "");
  if (url.startsWith("/")) return `${API_URL}${url}`;
  return url;
}

export default function Categories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [subs, setSubs] = useState<AdminSubCategory[]>([]);
  const [activeTab, setActiveTab] = useState<"main" | "sub">("main");
  const [filterCategory, setFilterCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [editingSub, setEditingSub] = useState<AdminSubCategory | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [catForm, setCatForm] = useState({ id: "", name: "", description: "", image: "", is_active: true });
  const [subForm, setSubForm] = useState({
    id: "",
    category_id: "",
    label: "",
    description: "",
    image: "",
    tag: "",
    price_type: "fixed",
    fixed_price: "",
    price_per_hour: "",
    is_active: true,
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ categories: AdminCategory[]; sub_categories: AdminSubCategory[] }>(
        "/api/admin/catalog"
      );
      setCategories(data.categories);
      setSubs(data.sub_categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const data = await apiFetch<{ categories_upserted: number; sub_categories_upserted: number }>(
        "/api/admin/catalog/sync",
        { method: "POST" }
      );
      setNotice(`Synced ${data.categories_upserted} categories and ${data.sub_categories_upserted} sub-categories from services.json.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const openNewCategory = () => {
    setEditingCategory(null);
    setCatForm({ id: "", name: "", description: "", image: "", is_active: true });
    setShowCategoryForm(true);
  };

  const openEditCategory = (c: AdminCategory) => {
    setEditingCategory(c);
    setCatForm({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      image: c.image ?? "",
      is_active: c.is_active,
    });
    setShowCategoryForm(true);
  };

  const submitCategory = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingCategory) {
        await apiFetch(`/api/admin/categories/${editingCategory.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: catForm.name.trim(),
            description: catForm.description.trim() || null,
            image: catForm.image.trim() || null,
            is_active: catForm.is_active,
          }),
        });
        setNotice("Main category updated. Customer and worker sites read this list.");
      } else {
        const id = catForm.id.trim() || slugify(catForm.name);
        await apiFetch("/api/admin/categories", {
          method: "POST",
          body: JSON.stringify({
            id,
            name: catForm.name.trim(),
            description: catForm.description.trim() || null,
            image: catForm.image.trim() || null,
            is_active: catForm.is_active,
          }),
        });
        setNotice("Main category created.");
      }
      setShowCategoryForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm(`Delete main category "${id}"?`)) return;
    try {
      await apiFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      setNotice("Main category deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const toggleCategory = async (c: AdminCategory) => {
    try {
      await apiFetch(`/api/admin/categories/${c.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const openNewSub = () => {
    setEditingSub(null);
    setSubForm({
      id: "",
      category_id: filterCategory || categories[0]?.id || "",
      label: "",
      description: "",
      image: "",
      tag: "",
      price_type: "fixed",
      fixed_price: "",
      price_per_hour: "",
      is_active: true,
    });
    setShowSubForm(true);
  };

  const openEditSub = (s: AdminSubCategory) => {
    setEditingSub(s);
    setSubForm({
      id: s.id,
      category_id: s.category_id,
      label: s.label,
      description: s.description ?? "",
      image: s.image ?? "",
      tag: s.tag ?? "",
      price_type: s.price_type || "fixed",
      fixed_price: s.fixed_price != null ? String(s.fixed_price) : "",
      price_per_hour: s.price_per_hour != null ? String(s.price_per_hour) : "",
      is_active: s.is_active,
    });
    setShowSubForm(true);
  };

  const submitSub = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        category_id: subForm.category_id,
        label: subForm.label.trim(),
        description: subForm.description.trim() || null,
        image: subForm.image.trim() || null,
        tag: subForm.tag.trim() || null,
        price_type: subForm.price_type,
        fixed_price: subForm.fixed_price === "" ? null : Number(subForm.fixed_price),
        price_per_hour: subForm.price_per_hour === "" ? null : Number(subForm.price_per_hour),
        is_active: subForm.is_active,
      };
      if (editingSub) {
        await apiFetch(`/api/admin/sub-categories/${editingSub.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Sub-category updated.");
      } else {
        const id = subForm.id.trim() || slugify(subForm.label);
        await apiFetch("/api/admin/sub-categories", {
          method: "POST",
          body: JSON.stringify({ id, ...payload }),
        });
        setNotice("Sub-category created.");
      }
      setShowSubForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const deleteSub = async (id: string) => {
    if (!confirm(`Delete sub-category "${id}"?`)) return;
    try {
      await apiFetch(`/api/admin/sub-categories/${id}`, { method: "DELETE" });
      setNotice("Sub-category deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const toggleSub = async (s: AdminSubCategory) => {
    try {
      await apiFetch(`/api/admin/sub-categories/${s.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !s.is_active }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const visibleSubs = filterCategory ? subs.filter((s) => s.category_id === filterCategory) : subs;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Categories</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            {categories.length} main categories, {subs.length} sub-categories. Changes apply to customer and worker sites.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className="h-4 w-4" />
            {isSyncing ? "Syncing..." : "Sync from services.json"}
          </Button>
          {activeTab === "main" ? (
            <Button size="sm" onClick={openNewCategory}>
              <Plus className="h-4 w-4" />
              Add Main Category
            </Button>
          ) : (
            <Button size="sm" onClick={openNewSub}>
              <Plus className="h-4 w-4" />
              Add Sub Category
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant={activeTab === "main" ? "default" : "secondary"} onClick={() => setActiveTab("main")}>
          Main Category ({categories.length})
        </Button>
        <Button size="sm" variant={activeTab === "sub" ? "default" : "secondary"} onClick={() => setActiveTab("sub")}>
          Sub Category ({subs.length})
        </Button>
      </div>

      {notice && (
        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2">{notice}</p>
      )}
      {error && (
        <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
      )}

      {activeTab === "main" ? (
        <Card>
          <CardHeader>
            <CardTitle>Main categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-bold">ID</th>
                    <th className="py-2 pr-3 font-bold">Name</th>
                    <th className="py-2 pr-3 font-bold">Subs</th>
                    <th className="py-2 pr-3 font-bold">Status</th>
                    <th className="py-2 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0 text-slate-700">
                      <td className="py-2 pr-3 font-bold text-slate-900">{c.id}</td>
                      <td className="py-2 pr-3 font-medium">{c.name}</td>
                      <td className="py-2 pr-3">{c.sub_categories_count}</td>
                      <td className="py-2 pr-3">
                        <button onClick={() => toggleCategory(c)} title="Toggle active">
                          <Badge variant={c.is_active ? "success" : "default"}>
                            {c.is_active ? "active" : "hidden"}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => openEditCategory(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => deleteCategory(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && categories.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-500">
                        No categories yet. Sync from services.json or add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {isLoading && <p className="text-xs font-semibold text-slate-500 py-3">Loading...</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Sub-categories</CardTitle>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-8 bg-white border border-slate-300 text-xs font-medium text-slate-900 rounded-sm px-2.5 focus:outline-none focus:border-brand"
              >
                <option value="">All main categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-bold">ID</th>
                    <th className="py-2 pr-3 font-bold">Label</th>
                    <th className="py-2 pr-3 font-bold">Main</th>
                    <th className="py-2 pr-3 font-bold">Price</th>
                    <th className="py-2 pr-3 font-bold">Status</th>
                    <th className="py-2 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSubs.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0 text-slate-700">
                      <td className="py-2 pr-3 font-bold text-slate-900">{s.id}</td>
                      <td className="py-2 pr-3 font-medium">{s.label}</td>
                      <td className="py-2 pr-3">{s.category_id}</td>
                      <td className="py-2 pr-3">
                        {s.price_type === "hourly" ? `₹${s.price_per_hour ?? "-"} /hr` : `₹${s.fixed_price ?? "-"} fixed`}
                      </td>
                      <td className="py-2 pr-3">
                        <button onClick={() => toggleSub(s)} title="Toggle active">
                          <Badge variant={s.is_active ? "success" : "default"}>
                            {s.is_active ? "active" : "hidden"}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => openEditSub(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => deleteSub(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && visibleSubs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        No sub-categories found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {isLoading && <p className="text-xs font-semibold text-slate-500 py-3">Loading...</p>}
          </CardContent>
        </Card>
      )}

      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-md border border-slate-200 shadow-2xl p-5 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">{editingCategory ? "Edit main category" : "Add main category"}</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowCategoryForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={submitCategory} className="space-y-3">
              {!editingCategory && (
                <div className="space-y-1.5">
                  <Label htmlFor="cat-id">ID (slug, auto from name if empty)</Label>
                  <Input id="cat-id" value={catForm.id} onChange={(e) => setCatForm({ ...catForm, id: e.target.value })} placeholder="e.g. Electrician" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Name</Label>
                <Input id="cat-name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required placeholder="e.g. Electrician Services" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-desc">Description</Label>
                <Input id="cat-desc" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} placeholder="Wiring, repairs & fittings" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-image">Image — upload from PC (JPEG/PNG/WebP → auto WebP) or paste path</Label>
                {catForm.image && (
                  <img src={catForm.image} alt="Category preview" className="w-20 h-20 rounded-sm border border-slate-200 object-cover" />
                )}
                <div className="flex items-center gap-2">
                  <Input id="cat-image" value={catForm.image} onChange={(e) => setCatForm({ ...catForm, image: e.target.value })} placeholder="/categories/Electrician-service.webp" />
                  <label className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 rounded-sm cursor-pointer">
                    {isUploading ? "Uploading..." : "Upload"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setIsUploading(true);
                        setError(null);
                        try {
                          const url = await uploadCatalogImage(f);
                          setCatForm((prev) => ({ ...prev, image: url }));
                          setNotice("Image uploaded and converted to WebP.");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setIsUploading(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={catForm.is_active} onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })} />
                Visible on customer and worker sites
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowCategoryForm(false)}>Cancel</Button>
                <Button type="submit" size="sm">{editingCategory ? "Save" : "Create"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-md border border-slate-200 shadow-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">{editingSub ? "Edit sub-category" : "Add sub-category"}</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowSubForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={submitSub} className="space-y-3">
              {!editingSub && (
                <div className="space-y-1.5">
                  <Label htmlFor="sub-id">ID (slug, auto from label if empty)</Label>
                  <Input id="sub-id" value={subForm.id} onChange={(e) => setSubForm({ ...subForm, id: e.target.value })} placeholder="e.g. fan-repair" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="sub-cat">Main category</Label>
                <select
                  id="sub-cat"
                  value={subForm.category_id}
                  onChange={(e) => setSubForm({ ...subForm, category_id: e.target.value })}
                  required
                  className="flex h-9 w-full bg-white border border-slate-300 text-sm font-medium text-slate-900 rounded-sm px-3 py-1.5 focus:outline-none focus:border-brand"
                >
                  <option value="">Select...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-label">Label</Label>
                <Input id="sub-label" value={subForm.label} onChange={(e) => setSubForm({ ...subForm, label: e.target.value })} required placeholder="e.g. Fan Repair" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-desc">Description</Label>
                <Input id="sub-desc" value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} placeholder="Capacitor replacement..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sub-type">Price type</Label>
                  <select
                    id="sub-type"
                    value={subForm.price_type}
                    onChange={(e) => setSubForm({ ...subForm, price_type: e.target.value })}
                    className="flex h-9 w-full bg-white border border-slate-300 text-sm font-medium text-slate-900 rounded-sm px-3 py-1.5 focus:outline-none focus:border-brand"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-tag">Tag</Label>
                  <Input id="sub-tag" value={subForm.tag} onChange={(e) => setSubForm({ ...subForm, tag: e.target.value })} placeholder="Fast Booking" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sub-fixed">Fixed price ₹</Label>
                  <Input id="sub-fixed" type="number" min="0" value={subForm.fixed_price} onChange={(e) => setSubForm({ ...subForm, fixed_price: e.target.value })} placeholder="249" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-hourly">Per hour ₹</Label>
                  <Input id="sub-hourly" type="number" min="0" value={subForm.price_per_hour} onChange={(e) => setSubForm({ ...subForm, price_per_hour: e.target.value })} placeholder="199" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-image">Image — upload from PC (JPEG/PNG/WebP → auto WebP) or paste path</Label>
                {subForm.image && (
                  <img src={subForm.image} alt="Sub-category preview" className="w-20 h-20 rounded-sm border border-slate-200 object-cover" />
                )}
                <div className="flex items-center gap-2">
                  <Input id="sub-image" value={subForm.image} onChange={(e) => setSubForm({ ...subForm, image: e.target.value })} placeholder="/subcategories/fan-repair.webp" />
                  <label className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 rounded-sm cursor-pointer">
                    {isUploading ? "Uploading..." : "Upload"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setIsUploading(true);
                        setError(null);
                        try {
                          const url = await uploadCatalogImage(f);
                          setSubForm((prev) => ({ ...prev, image: url }));
                          setNotice("Image uploaded and converted to WebP.");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setIsUploading(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={subForm.is_active} onChange={(e) => setSubForm({ ...subForm, is_active: e.target.checked })} />
                Visible on customer and worker sites
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowSubForm(false)}>Cancel</Button>
                <Button type="submit" size="sm">{editingSub ? "Save" : "Create"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
