"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Loader2,
  MapPin,
  Building2,
} from "lucide-react";
import {
  getMyBusinesses,
  getBusinessById,
  deleteBusiness,
  toggleBusinessStatus,
} from "../../services/vendorService";
import { PageHeader } from "../../components/shared/page-header";
import { StatusBadge } from "../../components/shared/status-badge";
import { EmptyState } from "../../components/shared/empty-state";
import { PageLoader } from "../../components/shared/page-loader";
import BusinessViewDialog from "../admin/BusinessViewDialog";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { TablePagination } from "../../components/admin/SharedComponents";

const VendorBusinesses = () => {
  const router = useRouter();
  const [businesses, setBusinesses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [showView, setShowView] = useState(false);
  const [viewBusinessId, setViewBusinessId] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [notice, setNotice] = useState("");

  const getPendingChange = (b) =>
    b.pendingChange && (b.pendingChange.type === "EDIT" || b.pendingChange.type === "DELETE")
      ? b.pendingChange
      : null;

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyBusinesses(page, search, statusFilter);
      setBusinesses(res.data.businesses);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load businesses");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteBusiness(deleteTarget._id);
      setNotice(res.message || "Delete request submitted for admin approval.");
      setShowDelete(false);
      setDeleteTarget(null);
      fetchBusinesses();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (b) => {
    setTogglingId(b._id);
    try {
      const res = await toggleBusinessStatus(b._id);
      if (res.message) setNotice(res.message);
      fetchBusinesses();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="My Businesses"
        description="Changes, status toggles and deletions go live only after admin approval."
        actions={
          <Button onClick={() => router.push("/vendor/businesses/new")} className="gap-2">
            <Plus size={18} />
            Add Business
          </Button>
        }
      />

      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <span>{notice}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-amber-700 hover:text-amber-800 dark:text-amber-400"
            onClick={() => setNotice("")}
          >
            Dismiss
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4 border-b flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search businesses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="p-6">
              <PageLoader />
            </div>
          ) : error ? (
            <div className="p-6 text-destructive text-sm">{error}</div>
          ) : businesses.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Building2}
                title="No Businesses Found"
                description={
                  search || statusFilter
                    ? "Try adjusting your search or filter."
                    : "No businesses yet. Add your first printing business!"
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden sm:table-cell">City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((b) => {
                    const pendingChange = getPendingChange(b);
                    const deletePending = pendingChange?.type === "DELETE";
                    return (
                    <TableRow key={b._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {b.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.phone || ""}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {b.city || ""} · {new Date(b.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          {b.categoryId?.image && (/^\s*</.test(b.categoryId.image) ? <div className="h-5 w-5 [&>svg]:w-5 [&>svg]:h-5" dangerouslySetInnerHTML={{ __html: b.categoryId.image }} /> : <img src={b.categoryId.image} alt="" className="h-5 w-5 object-contain" />)}
                          <div>
                            <p>{b.category || "-"}</p>
                            {b.serviceIds && b.serviceIds.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {b.serviceIds.map((service) => (
                                  <Badge key={service._id} variant="secondary" className="text-[10px]">
                                    {service.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {/* Extra categories assigned by admin — shown read-only. */}
                            {Array.isArray(b.additionalCategories) && b.additionalCategories.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {b.additionalCategories.map((entry) => (
                                  <div key={entry.categoryId?._id || entry.categoryId} className="text-[11px]">
                                    <span className="font-medium text-foreground">{entry.categoryId?.name || ""}</span>
                                    {Array.isArray(entry.serviceIds) && entry.serviceIds.length > 0 && (
                                      <span className="text-muted-foreground"> — {entry.serviceIds.map((s) => s.name || s).join(", ")}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{b.city || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusBadge status={b.status} />
                          {pendingChange && (
                            <Badge
                              variant="outline"
                              className={
                                deletePending
                                  ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              }
                            >
                              {deletePending ? "Delete Pending Approval" : "Changes Pending Approval"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggle(b)}
                          disabled={togglingId === b._id || deletePending}
                          title={
                            deletePending
                              ? "A delete request is waiting for admin approval"
                              : b.status === "approved"
                                ? "Changes require admin approval"
                                : undefined
                          }
                          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50"
                          style={{ background: b.isActive ? "#16a34a" : "#d1d5db" }}
                        >
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                            style={{ transform: b.isActive ? "translateX(18px)" : "translateX(3px)" }}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                            onClick={() => { setViewBusinessId(b._id); setShowView(true); }}
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 disabled:opacity-40"
                            disabled={deletePending}
                            onClick={() => router.push(`/vendor/businesses/${b._id}/edit`)}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10 disabled:opacity-40"
                            disabled={deletePending}
                            onClick={() => { setDeleteTarget(b); setShowDelete(true); }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && !error && pagination && (
            <TablePagination pagination={pagination} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>

      <BusinessViewDialog
        open={showView}
        onOpenChange={setShowView}
        businessId={viewBusinessId}
        fetchFn={() => getBusinessById(viewBusinessId).then((res) => ({ data: { business: res.data.business } }))}
        showSystemInfo={false}
        showFraud={true}
        title="Business Details"
      />

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Business Deletion</DialogTitle>
            <DialogDescription>
              Delete request for <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              The business will only be removed after admin approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <><Loader2 size={16} className="animate-spin mr-2" />Submitting...</> : "Request Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorBusinesses;
