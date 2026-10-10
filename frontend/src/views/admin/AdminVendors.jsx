"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Trash2,
  Eye,
  Pencil,
  Loader2,
  MoreHorizontal,
  UserCheck,
  UserX,
  Store,
  Building2,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Award,
} from "lucide-react";
import {
  getVendors,
  toggleVendorStatus,
  deleteVendor,
  updateUserApprovalStatus,
  getBusinesses,
  deleteBusiness,
} from "../../services/adminService";
import BusinessViewDialog from "./BusinessViewDialog";
import TrustScoreDialog from "../../components/admin/TrustScoreDialog";
import { PageHeader } from "../../components/shared/page-header";
import { StatusBadge } from "../../components/shared/status-badge";
import { EmptyState } from "../../components/shared/empty-state";
import { PageLoader } from "../../components/shared/page-loader";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
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
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import CopyableId from "../../components/admin/CopyableId";
import UnifiedViewDialog from "./UnifiedViewDialog";

const AdminVendors = () => {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [approvalConfirm, setApprovalConfirm] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [businessesTarget, setBusinessesTarget] = useState(null);
  const [vendorBusinesses, setVendorBusinesses] = useState([]);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [businessesError, setBusinessesError] = useState("");
  const [bizViewTarget, setBizViewTarget] = useState(null);
  const [bizDeleteTarget, setBizDeleteTarget] = useState(null);
  const [bizDeleteLoading, setBizDeleteLoading] = useState(false);
  const [bizDeleteError, setBizDeleteError] = useState("");
  // Trust Score: null = closed, otherwise the vendor's businesses to pick from.
  const [trustScoreList, setTrustScoreList] = useState(null);
  const [trustScoreLoading, setTrustScoreLoading] = useState(false);
  const debounceRef = useRef(null);

  const fetchVendors = async (p = 1, s = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await getVendors(p, s);
      setVendors(res.data.vendors);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors(page, search);
  }, [page]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchVendors(1, value);
    }, 400);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPage(1);
    fetchVendors(1, search);
  };

  const handleToggle = async (id) => {
    try {
      setActionLoading(id);
      setError("");
      const res = await toggleVendorStatus(id);
      setVendors((prev) =>
        prev.map((v) => (v._id === id ? { ...v, isActive: res.data.vendor.isActive } : v))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update vendor status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleShowBusinesses = async (v) => {
    setBusinessesTarget(v);
    setVendorBusinesses([]);
    setBusinessesError("");
    setBusinessesLoading(true);
    try {
      const res = await getBusinesses(1, "", "", v._id, 100);
      setVendorBusinesses(res.data.businesses || []);
    } catch (err) {
      setBusinessesError(err.response?.data?.message || "Failed to load businesses");
    } finally {
      setBusinessesLoading(false);
    }
  };

  // The Trust Score belongs to an individual business, so from a vendor row we
  // load that vendor's businesses and let the admin pick one (auto when there
  // is only one) before editing its score.
  const handleOpenTrustScore = async (v) => {
    try {
      setTrustScoreLoading(true);
      setError("");
      const res = await getBusinesses(1, "", "", v._id, 100);
      const list = (res.data.businesses || []).map((b) => ({
        _id: b._id,
        name: b.name,
        brandRecallScore: b.brandRecallScore ?? null,
      }));
      setTrustScoreList(list);
    } catch (err) {
      setTrustScoreList(null);
      setError(err.response?.data?.message || "Failed to load this vendor's businesses");
    } finally {
      setTrustScoreLoading(false);
    }
  };

  const handleTrustScoreSaved = ({ businessId, brandRecallScore }) => {
    setTrustScoreList((prev) =>
      Array.isArray(prev)
        ? prev.map((b) => (b._id === businessId ? { ...b, brandRecallScore } : b))
        : prev
    );
  };

  const handleDeleteBusinessConfirm = async () => {
    if (!bizDeleteTarget) return;
    try {
      setBizDeleteLoading(true);
      setBizDeleteError("");
      await deleteBusiness(bizDeleteTarget._id);
      const vendorId = businessesTarget?._id;
      setVendorBusinesses((prev) => prev.filter((b) => b._id !== bizDeleteTarget._id));
      setVendors((prev) =>
        prev.map((v) =>
          v._id === vendorId && typeof v.businessCount === "number" && v.businessCount > 0
            ? { ...v, businessCount: v.businessCount - 1 }
            : v
        )
      );
      setBizDeleteTarget(null);
    } catch (err) {
      setBizDeleteError(err.response?.data?.message || "Failed to delete business");
    } finally {
      setBizDeleteLoading(false);
    }
  };

  const handleApprovalAction = async () => {
    if (!approvalConfirm) return;
    try {
      setApprovalLoading(true);
      setError("");
      const res = await updateUserApprovalStatus(
        approvalConfirm.id,
        approvalConfirm.status
      );
      setVendors((prev) =>
        prev.map((v) =>
          v._id === approvalConfirm.id
            ? { ...v, approvalStatus: res.data.user.approvalStatus }
            : v
        )
      );
      setApprovalConfirm(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update vendor approval");
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setError("");
      await deleteVendor(deleteTarget._id);
      setVendors((prev) => prev.filter((v) => v._id !== deleteTarget._id));
      if (pagination) {
        const newTotal = pagination.total - 1;
        const newPages = Math.ceil(newTotal / pagination.limit);
        setPagination((prev) => ({ ...prev, total: newTotal, pages: newPages }));
        if (page > newPages && newPages > 0) {
          setPage(newPages);
        }
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete vendor");
    } finally {
      setDeleteLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Manage registered vendors and their platform access."
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
                placeholder="Search vendor or business name..."
                value={search}
                onChange={handleSearchChange}
                onSubmit={handleSearchSubmit}
                className="pl-9"
              />
            </div>
            {pagination && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {pagination.total} vendor{pagination.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <PageLoader text="Loading vendors..." />
          ) : vendors.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No Vendors Found"
              description={search ? "No vendors match your search." : "No vendors have registered yet."}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead>Businesses</TableHead>
                    <TableHead className="hidden sm:table-cell">Approval</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-semibold">
                              {getInitials(v.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{v.fullName}</p>
                            <CopyableId id={v.publicId} />
                            <p className="text-sm text-muted-foreground truncate">{v.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {v.phone || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge
                            variant="secondary"
                            className="font-mono cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary"
                            title={
                              v.businessNames?.length
                                ? v.businessNames.join(", ")
                                : `View businesses of ${v.fullName}`
                            }
                            onClick={() => handleShowBusinesses(v)}
                          >
                            <Building2 className="mr-1 h-3 w-3" />
                            {v.businessCount}
                          </Badge>
                          {v.businessNames?.length > 0 && (
                            <div className="max-w-[190px] space-y-0.5">
                              {v.businessNames.slice(0, 3).map((name, idx) => (
                                <p
                                  key={idx}
                                  className="truncate text-[11px] leading-tight text-muted-foreground"
                                  title={name}
                                >
                                  {name}
                                </p>
                              ))}
                              {v.businessNames.length > 3 && (
                                <p className="text-[11px] leading-tight text-muted-foreground">
                                  +{v.businessNames.length - 3} more
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusBadge status={v.approvalStatus || "pending"} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={v.isActive ? "active" : "inactive"} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewTarget(v)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenTrustScore(v)}
                              disabled={trustScoreLoading}
                            >
                              {trustScoreLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Award className="mr-2 h-4 w-4" />
                              )}
                              Set Trust Score
                            </DropdownMenuItem>
                            {v.approvalStatus !== "approved" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-emerald-600 focus:text-emerald-600"
                                  onClick={() =>
                                    setApprovalConfirm({
                                      id: v._id,
                                      name: v.fullName,
                                      status: "approved",
                                    })
                                  }
                                  disabled={approvalLoading}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve Account
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setApprovalConfirm({
                                      id: v._id,
                                      name: v.fullName,
                                      status: "rejected",
                                    })
                                  }
                                  disabled={approvalLoading}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject Account
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggle(v._id)}
                              disabled={actionLoading === v._id}
                            >
                              {actionLoading === v._id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : v.isActive ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              {v.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(v)}
                              disabled={actionLoading === v._id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => setPage((p) => p + 1)}
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

      <UnifiedViewDialog
        open={!!viewTarget}
        onOpenChange={(open) => !open && setViewTarget(null)}
        account={viewTarget}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.fullName}</strong> and all
              their businesses? This action cannot be undone.
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

      <Dialog
        open={!!approvalConfirm}
        onOpenChange={(open) => !open && setApprovalConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalConfirm?.status === "approved"
                ? "Approve Vendor Account"
                : "Reject Vendor Account"}
            </DialogTitle>
            <DialogDescription>
              {approvalConfirm?.status === "approved"
                ? `Approve "${approvalConfirm?.name}"? The vendor will be able to log in and manage their businesses.`
                : `Reject "${approvalConfirm?.name}"? The vendor will not be able to log in.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovalConfirm(null)}
              disabled={approvalLoading}
            >
              Cancel
            </Button>
            <Button
              variant={approvalConfirm?.status === "approved" ? "default" : "destructive"}
              onClick={handleApprovalAction}
              disabled={approvalLoading}
            >
              {approvalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {approvalConfirm?.status === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!businessesTarget}
        onOpenChange={(open) => !open && setBusinessesTarget(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Businesses — {businessesTarget?.fullName}</DialogTitle>
            <DialogDescription>
              {typeof businessesTarget?.businessCount === "number"
                ? `${businessesTarget.businessCount} business${
                    businessesTarget.businessCount === 1 ? "" : "es"
                  } registered for this vendor.`
                : "Businesses registered for this vendor."}
            </DialogDescription>
          </DialogHeader>

          {businessesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : businessesError ? (
            <p className="py-6 text-center text-sm text-destructive">{businessesError}</p>
          ) : vendorBusinesses.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No businesses yet"
              description="This vendor has not created any business listing."
            />
          ) : (
            <div className="space-y-2">
              {vendorBusinesses.map((b) => (
                <div
                  key={b._id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 sm:p-4"
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        typeof b.category === "string" ? b.category : b.category?.name,
                        b.city,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={b.status} />
                      <StatusBadge status={b.isActive ? "active" : "inactive"} />
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-blue-500 hover:bg-blue-500/10 hover:text-blue-600"
                      title="View business"
                      onClick={() => setBizViewTarget(b)}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600"
                      title="Edit business"
                      onClick={() => router.push(`/admin/businesses/${b._id}/edit`)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                      title="Delete business"
                      onClick={() => {
                        setBizDeleteError("");
                        setBizDeleteTarget(b);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
              {typeof businessesTarget?.businessCount === "number" &&
                businessesTarget.businessCount > vendorBusinesses.length && (
                  <p className="pt-1 text-center text-xs text-muted-foreground">
                    Showing {vendorBusinesses.length} of {businessesTarget.businessCount}{" "}
                    businesses.
                  </p>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BusinessViewDialog
        open={!!bizViewTarget}
        onOpenChange={(open) => {
          if (!open) setBizViewTarget(null);
        }}
        businessId={bizViewTarget?._id}
        showFraud
      />

      {/* Optional Brand Recall / Trust Score: pick one of the vendor's businesses */}
      <TrustScoreDialog
        open={Array.isArray(trustScoreList)}
        onOpenChange={(open) => {
          if (!open) setTrustScoreList(null);
        }}
        businesses={trustScoreList || []}
        onSaved={handleTrustScoreSaved}
      />

      <Dialog
        open={!!bizDeleteTarget}
        onOpenChange={(open) => {
          if (!open && !bizDeleteLoading) {
            setBizDeleteTarget(null);
            setBizDeleteError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Business</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{bizDeleteTarget?.name}</strong>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {bizDeleteError && <p className="text-sm text-destructive">{bizDeleteError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBizDeleteTarget(null);
                setBizDeleteError("");
              }}
              disabled={bizDeleteLoading}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBusinessConfirm} disabled={bizDeleteLoading}>
              {bizDeleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVendors;
