"use client";

import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import Link from "next/link";
import {
  Tags,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  Loader2,
  ChevronDown,
  ChevronRight,
  Upload,
  X,
  Eye,
  ExternalLink,
} from "lucide-react";
import { mergeCategories, isCoreCategory, LOCKED_CATEGORY_SLUG } from "../../data/vendorCategories";
import {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "../../services/adminService";
import { PageHeader } from "../../components/shared/page-header";
import { StatusBadge } from "../../components/shared/status-badge";
import { EmptyState } from "../../components/shared/empty-state";
import { PageLoader } from "../../components/shared/page-loader";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const PAGE_SIZE = 10;
const FETCH_LIMIT = 500;

// Subcategory chip with hover edit/delete actions, so services can be
// managed straight from the Services column without expanding the row.
// NOTE: the action buttons always occupy their space (opacity swap only) —
// showing them with display:none on hover resized the chip and caused the
// hover vibration/reflow loop.
const ServiceChip = ({ cat, sub, busy, onEdit, onDelete, onActivate }) => (
  <span
    className={`group inline-flex items-center rounded-md border border-transparent bg-secondary text-secondary-foreground transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/10 ${
      sub.isActive === false ? "opacity-60" : ""
    }`}
  >
    <Link
      href={`/categories/${cat.slug}/${sub.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open /categories/${cat.slug}/${sub.slug}`}
      className="px-2 py-1 text-xs font-normal hover:text-brand-orange transition-colors"
    >
      {sub.name}
    </Link>
    <span className="hidden md:inline-flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
      {sub.isActive === false && !sub.isStatic ? (
        <>
          <button
            type="button"
            title="Activate subcategory"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onActivate();
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Power className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            title="Delete permanently"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            title={sub.isStatic ? "Make editable & edit" : "Edit subcategory"}
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-brand-orange transition-colors disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Edit2 className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            title={sub.isActive === false ? "Delete permanently" : "Disable subcategory"}
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </>
      )}
    </span>
  </span>
);

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingType, setEditingType] = useState("parent");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    type: "parent",
    parentId: "",
    parentName: "",
    parentIsStatic: false,
    image: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState("parent");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [viewTarget, setViewTarget] = useState(null);
  const [subcategoryNames, setSubcategoryNames] = useState([""]);
  const fileInputRef = useRef(null);

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const fetchCategories = async (p = 1, q = "") => {
    try {
      setLoading(true);
      setError("");
      const res = await getCategories(p, q, FETCH_LIMIT);
      setCategories(res.data.categories);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // One fetch, then search + pagination run on the merged list so the 9
    // core categories and DB rows never repeat across pages.
    fetchCategories(1, "");
  }, []);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // DB categories + the 9 core categories (always listed, even if the API
  // failed). Core-only entries carry isStatic:true → no edit/delete actions.
  const displayCategories = useMemo(() => {
    const merged = mergeCategories(categories);
    const q = search.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter(
      (c) => (c.name || "").toLowerCase().includes(q)
    );
  }, [categories, search]);

  const totalPages = Math.max(1, Math.ceil(displayCategories.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = displayCategories.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Parent picker for the "Add Subcategory" dialog — includes the core
  // categories (T shirt excluded, its subcategory list is hardcoded).
  const parentOptions = useMemo(
    () => mergeCategories(categories).filter((c) => c.slug !== LOCKED_CATEGORY_SLUG),
    [categories]
  );

  const openCreateParent = () => {
    setEditing(null);
    setEditingType("parent");
    setForm({
      name: "",
      slug: "",
      description: "",
      type: "parent",
      parentId: "",
      parentName: "",
      parentIsStatic: false,
      image: "",
      kind: "business",
    });
    setFormError("");
    setShowForm(true);
  };

  const openCreateSubcategory = (parent) => {
    setEditing(null);
    setEditingType("subcategory");
    setForm({
      name: "",
      slug: "",
      description: "",
      type: "subcategory",
      parentId: parent?._id || parent || "",
      parentName: parent?.name || "",
      parentIsStatic: !!parent?.isStatic,
      image: "",
    });
    setSubcategoryNames([""]);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (cat, type = "parent") => {
    setEditing(cat);
    setEditingType(type);
    if (type === "subcategory") {
      setForm({
        name: cat.name,
        slug: cat.slug || "",
        description: cat.description || "",
        type: "subcategory",
        parentId: cat.parentId?._id || cat.parentId || "",
        parentName: cat.parentId?.name || "",
        parentIsStatic: !!cat.parentId?.isStatic,
        image: cat.image || "",
      });
    } else {
      setForm({
        name: cat.name,
        slug: cat.slug || "",
        description: cat.description || "",
        type: "parent",
        parentId: "",
        parentName: "",
        parentIsStatic: false,
        image: cat.image || "",
        kind: cat.kind || "business",
      });
    }
    setFormError("");
    setShowForm(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isSub = editingType === "subcategory";
    const okTypes = isSub
      ? ["image/svg+xml", "image/png", "image/jpeg", "image/webp"]
      : ["image/svg+xml"];
    if (!okTypes.includes(file.type)) {
      setFormError(
        isSub
          ? "Only SVG, PNG, JPG or WebP images are allowed"
          : "Only SVG files are allowed"
      );
      return;
    }
    // Raster images are stored inline (data URL) — keep them small.
    if (isSub && file.type !== "image/svg+xml" && file.size > 1.5 * 1024 * 1024) {
      setFormError("Image must be smaller than 1.5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, image: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setForm((prev) => ({ ...prev, image: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (value) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: prev.slug === generateSlug(prev.name) || prev.slug === ""
        ? generateSlug(value)
        : prev.slug,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingType === "subcategory" && !editing && !form.parentId) {
      setFormError("Parent category is required");
      return;
    }
    if (editingType === "subcategory" && editing) {
      if (!form.name.trim()) {
        setFormError("Name is required");
        return;
      }
    } else if (editingType === "subcategory" && !editing) {
      const validNames = subcategoryNames.filter((n) => n.trim());
      if (validNames.length === 0) {
        setFormError("At least one subcategory name is required");
        return;
      }
    } else {
      if (!form.name.trim()) {
        setFormError("Name is required");
        return;
      }
    }
    try {
      setSaving(true);
      setFormError("");
      if (editing) {
        if (editingType === "subcategory") {
          await updateSubcategory(editing._id, {
            name: form.name.trim(),
            parentId: form.parentId,
            description: form.description,
            image: form.image,
          });
        } else {
          await updateCategory(editing._id, {
            name: form.name.trim(),
            description: form.description,
            image: form.image,
            kind: form.kind || "business",
          });
        }
      } else {
        if (editingType === "subcategory") {
          const validNames = subcategoryNames.filter((n) => n.trim());
          // A core category lives only in code until an admin adds a
          // subcategory → create its parent doc first, then attach subs.
          let parentId = form.parentId;
          const parentInDb = categories.some((c) => c._id === form.parentId);
          if (!parentInDb) {
            const created = await createCategory({
              name: form.parentName,
              type: "parent",
            });
            parentId = created?.data?.category?._id;
            if (!parentId) {
              throw new Error("Could not prepare parent category");
            }
          }
          for (const name of validNames) {
            await createSubcategory({
              name: name.trim(),
              parentId,
              image: form.image,
            });
          }
        } else {
          await createCategory({
            name: form.name.trim(),
            description: form.description,
            type: "parent",
            image: form.image,
            kind: form.kind || "business",
          });
        }
      }
      setShowForm(false);
      fetchCategories(1, "");
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      setActionLoading(id);
      setError("");
      await toggleCategoryStatus(id);
      fetchCategories(1, "");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to toggle status");
    } finally {
      setActionLoading(null);
    }
  };

  const normName = (s) => (s || "").trim().toLowerCase();

  // Static (builtin) subcategories have no DB document, so they cannot be
  // edited/deleted directly. Materializing creates the DB parent (if needed)
  // plus a real DB subcategory, which the merged list then picks up as the
  // editable row (DB rows always win over same-named static entries).
  const ensureDbParent = async (parent) => {
    const inDb = categories.some((c) => c._id === parent._id);
    if (inDb) return parent._id;
    const created = await createCategory({
      name: parent.name,
      type: "parent",
    });
    const newId = created?.data?.category?._id;
    if (!newId) throw new Error("Could not prepare parent category");
    return newId;
  };

  const materializeStaticSub = async (parent, sub) => {
    const parentId = await ensureDbParent(parent);
    const fresh = await getCategories(1, "", FETCH_LIMIT);
    const cats = fresh?.data?.categories || [];
    setCategories(cats);
    const dbParent = cats.find((c) => c._id === parentId);
    const existing = (dbParent?.services || []).find(
      (s) => normName(s.name) === normName(sub.name)
    );
    if (existing) return { parentId, sub: existing };
    const created = await createSubcategory({
      name: sub.name.trim(),
      parentId,
    });
    const dbSub = created?.data?.category;
    if (!dbSub?._id) throw new Error("Could not prepare subcategory");
    return { parentId, sub: dbSub };
  };

  const handleEditStaticSub = async (parent, sub) => {
    try {
      setActionLoading(sub._id);
      setError("");
      const { sub: dbSub } = await materializeStaticSub(parent, sub);
      openEdit(dbSub, "subcategory");
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to prepare subcategory for editing"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Two-step delete rule:
  //   1st delete → disable (deactivate). The row stays as a dimmed inactive
  //   row with Activate + Delete actions.
  //   2nd delete (on a disabled row) → permanent hard delete. The backend
  //   tombstones the slug on the parent, so even a builtin static default by
  //   the same name stays suppressed and can never resurrect the chip.
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setError("");
      if (deleteType === "subcategory") {
        if (deleteTarget._isStatic) {
          // Static default: materialize, then deactivate so the merged list
          // (admin + public) suppresses it everywhere. It stays recoverable
          // via Activate on its dimmed row.
          const { sub: dbSub } = await materializeStaticSub(
            deleteTarget._parent,
            deleteTarget
          );
          await updateSubcategory(dbSub._id, { isActive: false });
        } else if (deleteTarget.isActive === false) {
          // 2nd delete on a disabled row → permanent.
          await deleteSubcategory(deleteTarget._id);
        } else {
          // 1st delete → disable only.
          await updateSubcategory(deleteTarget._id, { isActive: false });
        }
      } else {
        await deleteCategory(deleteTarget._id);
      }
      setDeleteTarget(null);
      fetchCategories(1, "");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage business categories and subcategories."
        actions={
          <Button onClick={openCreateParent}>
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        }
      />

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-destructive hover:text-destructive"
            onClick={() => setError("")}
          >
            Dismiss
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={handleSearchChange}
                onSubmit={handleSearchSubmit}
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {displayCategories.length} categor{displayCategories.length !== 1 ? "ies" : "y"}
            </span>
          </div>

          {loading ? (
            <PageLoader text="Loading categories..." />
          ) : displayCategories.length === 0 ? (
            <EmptyState
              icon={Tags}
              title="No Categories"
              description={
                search
                  ? "No categories match your search."
                  : "Create your first category to organize businesses."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="hidden md:table-cell">Services</TableHead>
                    <TableHead className="hidden sm:table-cell">URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    <TableHead className="w-[110px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((cat) => (
                    <Fragment key={cat._id}>
                      <TableRow>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={expandedRows[cat._id] ? "Collapse subcategories" : "Expand to manage subcategories"}
                            onClick={() => toggleRow(cat._id)}
                          >
                            {expandedRows[cat._id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {cat.image ? (
                              cat.image.trim().startsWith('<') ? (
                                <div className="h-8 w-8 flex-shrink-0 rounded border object-contain bg-muted p-1 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: cat.image }} />
                              ) : (
                                <img src={cat.image} alt={cat.name} className="h-8 w-8 flex-shrink-0 rounded border object-contain bg-muted" />
                              )
                            ) : (
                              <div className="h-8 w-8 flex-shrink-0 rounded border bg-muted flex items-center justify-center">
                                <Tags className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium">
                                <Link
                                  href={`/categories/${cat.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex max-w-full items-center gap-1 truncate hover:text-brand-orange transition-colors"
                                  title={`Open /categories/${cat.slug}`}
                                >
                                  <span className="truncate">{cat.name}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                                </Link>
                                {cat.kind === "staffing" && (
                                  <Badge className="ml-1.5 text-[10px] font-semibold">
                                    Staffing
                                  </Badge>
                                )}
                              </div>
                              {cat.services && cat.services.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 md:hidden">
                                  {cat.services.map((sub) => (
                                    <ServiceChip
                                      key={sub._id}
                                      cat={cat}
                                      sub={sub}
                                      busy={actionLoading === sub._id}
                                      onActivate={() => handleToggle(sub._id)}
                                      onEdit={() =>
                                        sub.isStatic
                                          ? handleEditStaticSub(cat, sub)
                                          : openEdit(sub, "subcategory")
                                      }
                                      onDelete={() => {
                                        setDeleteTarget(
                                          sub.isStatic
                                            ? { ...sub, _isStatic: true, _parent: cat }
                                            : { ...sub, _parent: cat }
                                        );
                                        setDeleteType("subcategory");
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {cat.services && cat.services.length > 0 ? (
                              cat.services.map((sub) => (
                                <ServiceChip
                                  key={sub._id}
                                  cat={cat}
                                  sub={sub}
                                  busy={actionLoading === sub._id}
                                  onActivate={() => handleToggle(sub._id)}
                                  onEdit={() =>
                                    sub.isStatic
                                      ? handleEditStaticSub(cat, sub)
                                      : openEdit(sub, "subcategory")
                                  }
                                  onDelete={() => {
                                    setDeleteTarget(
                                      sub.isStatic
                                        ? { ...sub, _isStatic: true, _parent: cat }
                                        : { ...sub, _parent: cat }
                                    );
                                    setDeleteType("subcategory");
                                  }}
                                />
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Link
                            href={`/categories/${cat.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Open /categories/${cat.slug}`}
                          >
                            <Badge variant="outline" className="font-mono text-xs hover:border-brand-orange hover:text-brand-orange transition-colors">
                              /categories/{cat.slug}
                            </Badge>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={cat.isActive ? "active" : "inactive"} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {formatDate(cat.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            {!cat.isStatic && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Edit category"
                                  onClick={() => openEdit(cat, "parent")}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  title="Delete category"
                                  disabled={actionLoading === cat._id}
                                  onClick={() => {
                                    setDeleteTarget(cat);
                                    setDeleteType("parent");
                                  }}
                                >
                                  {actionLoading === cat._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <span className="sr-only">Actions</span>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                  >
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                  </svg>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewTarget(cat)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/categories/${cat.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Open Public Page
                                  </Link>
                                </DropdownMenuItem>
                                {!cat.isStatic && (
                                  <>
                                    {cat.slug !== LOCKED_CATEGORY_SLUG && (
                                      <DropdownMenuItem onClick={() => openCreateSubcategory(cat)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Subcategory
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => handleToggle(cat._id)}
                                      disabled={actionLoading === cat._id}
                                    >
                                      {actionLoading === cat._id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <Power className="mr-2 h-4 w-4" />
                                      )}
                                      {cat.isActive ? "Deactivate" : "Activate"}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {cat.isStatic &&
                                  isCoreCategory(cat.slug) &&
                                  cat.slug !== LOCKED_CATEGORY_SLUG && (
                                    <DropdownMenuItem onClick={() => openCreateSubcategory(cat)}>
                                      <Plus className="mr-2 h-4 w-4" />
                                      Add Subcategory
                                    </DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows[cat._id] &&
                        cat.services &&
                        cat.services.map((sub) => (
                          <TableRow
                            key={sub._id}
                            className={`bg-muted/30 ${sub.isActive === false ? "opacity-60" : ""}`}
                          >
                            <TableCell></TableCell>
                            <TableCell>
                              <div className="pl-6 flex items-center gap-2 min-w-0">
                                {sub.image ? (
                                  sub.image.trim().startsWith('<') ? (
                                    <div className="h-6 w-6 shrink-0 rounded border object-contain bg-muted p-0.5 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: sub.image }} />
                                  ) : (
                                    <img src={sub.image} alt={sub.name} className="h-6 w-6 shrink-0 rounded border object-cover bg-muted" />
                                  )
                                ) : (
                                  <div className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30" />
                                )}
                                <Link
                                  href={`/categories/${cat.slug}/${sub.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm truncate hover:text-brand-orange transition-colors"
                                  title={`Open /categories/${cat.slug}/${sub.slug}`}
                                >
                                  {sub.name}
                                </Link>
                                {sub.isStatic && (
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    Default
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell"></TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Link
                                href={`/categories/${cat.slug}/${sub.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Open /categories/${cat.slug}/${sub.slug}`}
                              >
                                <Badge variant="outline" className="font-mono text-xs hover:border-brand-orange hover:text-brand-orange transition-colors">
                                  /{sub.slug}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={sub.isActive ? "active" : "inactive"} />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                              {formatDate(sub.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-0.5">
                                {sub.isActive === false && !sub.isStatic ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                                      title="Activate subcategory"
                                      disabled={actionLoading === sub._id}
                                      onClick={() => handleToggle(sub._id)}
                                    >
                                      {actionLoading === sub._id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Power className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      title="Delete permanently"
                                      disabled={actionLoading === sub._id}
                                      onClick={() => {
                                        setDeleteTarget({ ...sub, _parent: cat });
                                        setDeleteType("subcategory");
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title={sub.isStatic ? "Make editable & edit subcategory" : "Edit subcategory"}
                                  disabled={actionLoading === sub._id}
                                  onClick={() =>
                                    sub.isStatic
                                      ? handleEditStaticSub(cat, sub)
                                      : openEdit(sub, "subcategory")
                                  }
                                >
                                  {actionLoading === sub._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Edit2 className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  title="Disable subcategory"
                                  disabled={actionLoading === sub._id}
                                  onClick={() => {
                                    setDeleteTarget(
                                      sub.isStatic
                                        ? { ...sub, _isStatic: true, _parent: cat }
                                        : { ...sub, _parent: cat }
                                    );
                                    setDeleteType("subcategory");
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                  </>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <span className="sr-only">Actions</span>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                      >
                                        <circle cx="12" cy="12" r="1" />
                                        <circle cx="12" cy="5" r="1" />
                                        <circle cx="12" cy="19" r="1" />
                                      </svg>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link
                                        href={`/categories/${cat.slug}/${sub.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open Public Page
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        sub.isStatic
                                          ? handleEditStaticSub(cat, sub)
                                          : openEdit(sub, "subcategory")
                                      }
                                      disabled={actionLoading === sub._id}
                                    >
                                      <Edit2 className="mr-2 h-4 w-4" />
                                      {sub.isStatic ? "Make Editable" : "Edit"}
                                    </DropdownMenuItem>
                                    {!sub.isStatic && (
                                      <DropdownMenuItem
                                        onClick={() => handleToggle(sub._id)}
                                        disabled={actionLoading === sub._id}
                                      >
                                        {actionLoading === sub._id ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <Power className="mr-2 h-4 w-4" />
                                        )}
                                        {sub.isActive ? "Deactivate" : "Activate"}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => {
                                        setDeleteTarget(
                                          sub.isStatic
                                            ? { ...sub, _isStatic: true, _parent: cat }
                                            : { ...sub, _parent: cat }
                                        );
                                        setDeleteType("subcategory");
                                      }}
                                      disabled={actionLoading === sub._id}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 flex-1 sm:flex-none"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 flex-1 sm:flex-none"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setSubcategoryNames([""]);
          removeImage();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? editingType === "subcategory"
                  ? "Edit Subcategory"
                  : "Edit Category"
                : editingType === "subcategory"
                ? "New Subcategory"
                : "New Category"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the details below."
                : editingType === "subcategory"
                ? "Add a new subcategory under a parent category."
                : "Add a new parent category to organize businesses."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {!editing && (
              <div className="space-y-2">
                <Label>
                  Category Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={editingType}
                  onValueChange={(val) => {
                    setEditingType(val);
                    setForm((prev) => ({ ...prev, type: val, parentId: "", image: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent Category</SelectItem>
                    <SelectItem value="subcategory">Sub Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {editingType === "subcategory" && (
              <div className="space-y-2">
                <Label>
                  Parent Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.parentId}
                  onValueChange={(val) => {
                    const parent = parentOptions.find((c) => c._id === val);
                    setForm((prev) => ({
                      ...prev,
                      parentId: val,
                      parentName: parent?.name || "",
                      parentIsStatic: !!parent?.isStatic,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editingType === "subcategory" && !editing ? (
              <div className="space-y-2">
                <Label>
                  Subcategory Names <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">Enter at least one subcategory name. Leave the last field blank if done.</p>
                {subcategoryNames.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={val}
                      onChange={(e) => {
                        const updated = [...subcategoryNames];
                        updated[idx] = e.target.value;
                        if (idx === subcategoryNames.length - 1 && e.target.value.trim()) {
                          updated.push("");
                        }
                        setSubcategoryNames(updated);
                      }}
                      placeholder={`Subcategory ${idx + 1}`}
                      autoFocus={idx === 0}
                    />
                    {subcategoryNames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSubcategoryNames(subcategoryNames.filter((_, i) => i !== idx))}
                        className="text-destructive hover:text-destructive/80 p-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="cat-name">
                  {editingType === "subcategory" ? "Subcategory" : "Category"} Name{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cat-name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Printing, Business Cards..."
                  autoFocus
                />
              </div>
            )}

            {!(editingType === "subcategory" && !editing) && (
              <div className="space-y-2">
                <Label htmlFor="cat-description">Description</Label>
                <Textarea
                  id="cat-description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short description shown on the public category page..."
                  rows={3}
                />
              </div>
            )}

            {editingType === "parent" && (
              <div className="space-y-2">
                <Label htmlFor="cat-kind">Category Kind</Label>
                <Select
                  value={form.kind || "business"}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, kind: val }))}
                >
                  <SelectTrigger id="cat-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business (shops & services)</SelectItem>
                    <SelectItem value="staffing">Staffing (people to hire)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Staffing categories are excluded from the business search and vendor
                  category picker.
                </p>
              </div>
            )}

            {(editingType === "parent" || editingType === "subcategory") && (
              <div className="space-y-2">
                <Label htmlFor="cat-image">
                  {editingType === "parent"
                    ? "Category Image (SVG)"
                    : "Subcategory Image (SVG, PNG, JPG, WebP)"}
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="cat-image"
                    type="file"
                    accept={
                      editingType === "parent"
                        ? ".svg,image/svg+xml"
                        : ".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
                    }
                    onChange={handleImageUpload}
                    ref={fileInputRef}
                    className="flex-1"
                  />
                  {form.image && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {editingType === "subcategory" && !editing && (
                  <p className="text-xs text-muted-foreground">
                    Applied to every subcategory created in this batch. Edit a
                    subcategory later to give it its own image.
                  </p>
                )}
                {editingType === "subcategory" && editing && (
                  <p className="text-xs text-muted-foreground">
                    Shown on the subcategory hero background. SVG icons render
                    faint, photos render as a cover.
                  </p>
                )}
                {form.image && (
                  form.image.trim().startsWith('<') ? (
                    <div className="h-16 w-16 rounded border object-contain bg-muted mt-2 p-2 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: form.image }} />
                  ) : (
                    <img src={form.image} alt="Preview" className="h-16 w-16 rounded border object-contain bg-muted mt-2" />
                  )
                )}
              </div>
            )}

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {deleteType === "subcategory" ? "Subcategory" : "Category"}
            </DialogTitle>
            <DialogDescription>
              {deleteType === "subcategory" &&
              !deleteTarget?._isStatic &&
              deleteTarget?.isActive === false ? (
                <>
                  Permanently delete <strong>{deleteTarget?.name}</strong>? It
                  will be removed everywhere and cannot be restored. Businesses
                  and poster boys using it will be unlinked.
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
                  {deleteType === "parent" &&
                    " This will also delete all subcategories under it."}{" "}
                  {deleteType === "subcategory"
                    ? "It will be disabled (hidden everywhere) and can be re-activated later from its dimmed row."
                    : "Businesses and poster boys using it will be unlinked. This action cannot be undone."}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Category Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Category Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {viewTarget?.image ? (
                viewTarget.image.trim().startsWith('<') ? (
                  <div className="h-16 w-16 rounded-lg border object-contain bg-muted p-2 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: viewTarget.image }} />
                ) : (
                  <img src={viewTarget.image} alt={viewTarget.name} className="h-16 w-16 rounded-lg border object-contain bg-muted" />
                )
              ) : (
                <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center">
                  <Tags className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">{viewTarget?.name}</h3>
                <p className="text-sm text-muted-foreground">{viewTarget?.slug}</p>
              </div>
            </div>
            {viewTarget?.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{viewTarget.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                <StatusBadge status={viewTarget?.isActive ? "active" : "inactive"} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Created</p>
                <p className="text-sm">{viewTarget && formatDate(viewTarget.createdAt)}</p>
              </div>
            </div>
            {viewTarget?.services && viewTarget.services.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Services / Subcategories</p>
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-1">
                  {viewTarget.services.map((sub) => (
                    <Badge key={sub._id} variant="secondary">{sub.name}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategories;
