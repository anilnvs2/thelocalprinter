"use client";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  Trash2,
  Eye,
  Loader2,
  MoreHorizontal,
  UserCheck,
  UserX,
  Megaphone,
  Mail,
  CheckCircle,
  XCircle,
  X,
  Play,
} from "lucide-react";
import {
  getPosterBoys,
  toggleUserStatus,
  deleteUser,
  updateUserApprovalStatus,
  updatePosterBoyProfileStatus,
} from "../../services/adminService";
import { PageHeader } from "../../components/shared/page-header";
import { StatusBadge } from "../../components/shared/status-badge";
import { EmptyState } from "../../components/shared/empty-state";
import { PageLoader } from "../../components/shared/page-loader";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
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
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import CopyableId from "../../components/admin/CopyableId";
import ProtectedVideo from "../../components/media/ProtectedVideo";
import WatermarkLogo from "../../components/media/WatermarkLogo";

const AdminPosterBoys = () => {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [accountConfirm, setAccountConfirm] = useState(null);
  const [profileConfirm, setProfileConfirm] = useState(null);
  const [actionLoading2, setActionLoading2] = useState(false);
  const [mediaOpenIndex, setMediaOpenIndex] = useState(null);
  const debounceRef = useRef(null);

  const fetchPosterBoys = async (p = 1, s = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await getPosterBoys(p, s, "approved");
      setItems(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load poster boys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosterBoys(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPosterBoys(1, value);
    }, 400);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPage(1);
    fetchPosterBoys(1, search);
  };

  const handleToggle = async (id) => {
    try {
      setActionLoading(id);
      setError("");
      const res = await toggleUserStatus(id);
      setItems((prev) =>
        prev.map((v) => (v._id === id ? { ...v, isActive: res.data.user.isActive } : v))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccountAction = async () => {
    if (!accountConfirm) return;
    try {
      setActionLoading2(true);
      setError("");
      const res = await updateUserApprovalStatus(accountConfirm.id, accountConfirm.status);
      setItems((prev) =>
        prev.map((v) =>
          v._id === accountConfirm.id
            ? { ...v, approvalStatus: res.data.user.approvalStatus }
            : v
        )
      );
      setAccountConfirm(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update account approval");
    } finally {
      setActionLoading2(false);
    }
  };

  const handleProfileAction = async () => {
    if (!profileConfirm) return;
    try {
      setActionLoading2(true);
      setError("");
      const res = await updatePosterBoyProfileStatus(profileConfirm.profileId, profileConfirm.status);
      const updated = res.data.profile;
      setItems((prev) =>
        prev.map((v) =>
          v._id === profileConfirm.userId
            ? {
                ...v,
                profile: {
                  ...v.profile,
                  status: updated.status,
                  hasPendingChange: updated.hasPendingChange,
                  pendingChangeAt: updated.pendingChangeAt,
                  skills: updated.skills,
                  languages: updated.languages,
                  address: updated.address,
                  aadhaarNumber: updated.aadhaarNumber,
                  workRadius: updated.workRadius,
                  strength: updated.strength,
                  orderAccepted: updated.orderAccepted,
                  bookingTimeline: updated.bookingTimeline,
                  workTiming: updated.workTiming,
                  workMedia: updated.workMedia,
                  profileCompleted: updated.profileCompleted,
                },
              }
            : v
        )
      );
      setViewTarget((prev) =>
        prev && prev._id === profileConfirm.userId
          ? {
              ...prev,
              profile: {
                ...prev.profile,
                status: updated.status,
                hasPendingChange: updated.hasPendingChange,
                pendingChangeAt: updated.pendingChangeAt,
                skills: updated.skills,
                languages: updated.languages,
                address: updated.address,
                aadhaarNumber: updated.aadhaarNumber,
                workRadius: updated.workRadius,
                strength: updated.strength,
                orderAccepted: updated.orderAccepted,
                bookingTimeline: updated.bookingTimeline,
                workTiming: updated.workTiming,
                workMedia: updated.workMedia,
                profileCompleted: updated.profileCompleted,
              },
            }
          : prev
      );
      setProfileConfirm(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile approval");
    } finally {
      setActionLoading2(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setError("");
      await deleteUser(deleteTarget._id);
      setItems((prev) => prev.filter((v) => v._id !== deleteTarget._id));
      if (pagination) {
        const newTotal = pagination.total - 1;
        const newPages = Math.ceil(newTotal / pagination.limit);
        setPagination((prev) => ({ ...prev, total: newTotal, pages: newPages }));
        if (page > newPages && newPages > 0) setPage(newPages);
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete poster boy");
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

  const profileBadge = (v) => {
    if (!v.profile) {
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          no profile
        </span>
      );
    }
    return <StatusBadge status={v.profile.status} />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Poster Boys"
        description="Approved worker boy accounts and their work profile approvals. First-time sign-ups are reviewed under Businesses."
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
                placeholder="Search poster boys..."
                value={search}
                onChange={handleSearchChange}
                onSubmit={handleSearchSubmit}
                className="pl-9"
              />
            </div>
            {pagination && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {pagination.total} poster boy{pagination.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <PageLoader text="Loading poster boys..." />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No Poster Boys Found"
              description={
                search
                  ? "No poster boys match your search."
                  : "No poster boys have registered yet."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Poster Boy</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead className="hidden md:table-cell">Skills</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="hidden sm:table-cell">Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((v) => (
                    <TableRow key={v._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold">
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
                        {v.phone || v.whatsappNumber || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          {profileBadge(v)}
                          {v.profile?.hasPendingChange && (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]"
                            >
                              change pending
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {v.profile?.skills?.length ? (
                          <span className="text-sm text-muted-foreground">
                            {v.profile.skills.slice(0, 2).join(", ")}
                            {v.profile.skills.length > 2
                              ? ` +${v.profile.skills.length - 2}`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={v.approvalStatus || "pending"} />
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
                              View Profile
                            </DropdownMenuItem>

                            {v.approvalStatus !== "approved" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-emerald-600 focus:text-emerald-600"
                                  onClick={() =>
                                    setAccountConfirm({
                                      id: v._id,
                                      name: v.fullName,
                                      status: "approved",
                                    })
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve Account
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setAccountConfirm({
                                      id: v._id,
                                      name: v.fullName,
                                      status: "rejected",
                                    })
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject Account
                                </DropdownMenuItem>
                              </>
                            )}

                            {v.profile &&
                              (v.profile.status !== "approved" || v.profile.hasPendingChange) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-emerald-600 focus:text-emerald-600"
                                  onClick={() =>
                                    setProfileConfirm({
                                      profileId: v.profile._id,
                                      userId: v._id,
                                      name: v.fullName,
                                      status: "approved",
                                      pending: v.profile.hasPendingChange,
                                    })
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  {v.profile.hasPendingChange
                                    ? "Approve Changes"
                                    : "Approve Profile"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setProfileConfirm({
                                      profileId: v.profile._id,
                                      userId: v._id,
                                      name: v.fullName,
                                      status: "rejected",
                                      pending: v.profile.hasPendingChange,
                                    })
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  {v.profile.hasPendingChange
                                    ? "Discard Changes"
                                    : "Reject Profile"}
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

      {/* Profile detail */}
      <Dialog
        open={!!viewTarget}
        onOpenChange={(open) => {
          if (!open) {
            setViewTarget(null);
            setMediaOpenIndex(null);
          }
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[85vh] overflow-y-auto"
          onInteractOutside={(e) => { if (mediaOpenIndex != null) e.preventDefault(); }}
          onPointerDownOutside={(e) => { if (mediaOpenIndex != null) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (mediaOpenIndex != null) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>{viewTarget?.fullName}</DialogTitle>
            <DialogDescription>
              Poster boy profile submitted for admin approval.
            </DialogDescription>
          </DialogHeader>

          {!viewTarget?.profile ? (
            <EmptyState
              icon={Megaphone}
              title="No profile yet"
              description="This poster boy has not submitted a work profile."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={viewTarget.profile.status} />
                {viewTarget.profile.hasPendingChange && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                    change pending
                  </Badge>
                )}
                <Badge variant="secondary" className="font-mono">
                  {viewTarget.publicId}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Mail size={13} className="text-muted-foreground" />
                    {viewTarget.email}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="text-sm font-medium">
                    {viewTarget.phone || viewTarget.whatsappNumber || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Aadhaar</Label>
                  <p className="text-sm font-medium">
                    {viewTarget.profile.aadhaarNumber || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Languages</Label>
                  <p className="text-sm font-medium">
                    {viewTarget.profile.languages?.join(", ") || "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <p className="text-sm font-medium">{viewTarget.profile.address || "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Skills</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {viewTarget.profile.skills?.length ? (
                      viewTarget.profile.skills.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm font-medium">—</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Work Radius</Label>
                  <p className="text-sm font-medium">{viewTarget.profile.workRadius || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Strength</Label>
                  <p className="text-sm font-medium">{viewTarget.profile.strength || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Order Accepted</Label>
                  <p className="text-sm font-medium">
                    {viewTarget.profile.orderAccepted?.length
                      ? viewTarget.profile.orderAccepted.join(", ")
                      : "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Booking Timeline</Label>
                  <p className="text-sm font-medium">{viewTarget.profile.bookingTimeline || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Timings</Label>
                  <p className="text-sm font-medium">{viewTarget.profile.workTiming || "—"}</p>
                </div>
              </div>

              {viewTarget.profile.workMedia?.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Work media ({viewTarget.profile.workMedia.length})
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-1.5">
                    {viewTarget.profile.workMedia.map((m, i) => (
                      <button
                        key={m.url + i}
                        type="button"
                        onClick={() => setMediaOpenIndex(i)}
                        className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer"
                      >
                        {m.resourceType === "video" ? (
                          <>
                            <video
                              src={m.url}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                              playsInline
                              preload="metadata"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play size={22} className="text-white" fill="currentColor" />
                            </span>
                            <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                              <Eye size={13} />
                            </span>
                          </>
                        ) : (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.url}
                              alt=""
                              className="w-full h-full object-cover pointer-events-none"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Eye size={18} className="text-white" />
                            </span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {viewTarget.profile.pendingChangeAt && (
                <p className="text-xs text-muted-foreground">
                  Changes submitted at{" "}
                  {new Date(viewTarget.profile.pendingChangeAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media lightbox */}
      {mediaOpenIndex != null && viewTarget?.profile?.workMedia?.[mediaOpenIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 pointer-events-auto"
          onClick={() => setMediaOpenIndex(null)}
        >
          {(() => {
            const m = viewTarget.profile.workMedia[mediaOpenIndex];
            return m.resourceType === "video" ? (
              <div
                className="relative w-full max-w-3xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute -top-3 -right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition-colors hover:bg-black"
                  onClick={() => setMediaOpenIndex(null)}
                  aria-label="Close preview"
                >
                  <X size={16} />
                </button>
                <ProtectedVideo src={m.url} variant="player" />
              </div>
            ) : (
              <div
                className="relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute -top-3 -right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition-colors hover:bg-black"
                  onClick={() => setMediaOpenIndex(null)}
                  aria-label="Close preview"
                >
                  <X size={16} />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt=""
                  className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
                />
                <WatermarkLogo size="lg" />
              </div>
            );
          })()}
        </div>
      )}

      {/* Delete */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Poster Boy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.fullName}</strong> and
              their work profile? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account approval */}
      <Dialog
        open={!!accountConfirm}
        onOpenChange={(open) => !open && setAccountConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accountConfirm?.status === "approved"
                ? "Approve Poster Boy Account"
                : "Reject Poster Boy Account"}
            </DialogTitle>
            <DialogDescription>
              {accountConfirm?.status === "approved"
                ? `Approve "${accountConfirm?.name}"? They will get access to their Poster Boy dashboard.`
                : `Reject "${accountConfirm?.name}"? They will not be able to log in.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountConfirm(null)} disabled={actionLoading2}>
              Cancel
            </Button>
            <Button
              variant={accountConfirm?.status === "approved" ? "default" : "destructive"}
              onClick={handleAccountAction}
              disabled={actionLoading2}
            >
              {actionLoading2 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {accountConfirm?.status === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile approval */}
      <Dialog
        open={!!profileConfirm}
        onOpenChange={(open) => !open && setProfileConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {profileConfirm?.status === "approved"
                ? profileConfirm?.pending
                  ? "Approve Profile Changes"
                  : "Approve Poster Boy Profile"
                : profileConfirm?.pending
                ? "Discard Profile Changes"
                : "Reject Poster Boy Profile"}
            </DialogTitle>
            <DialogDescription>
              {profileConfirm?.status === "approved"
                ? profileConfirm?.pending
                  ? `Apply the latest changes submitted by "${profileConfirm?.name}"?`
                  : `Approve the work profile of "${profileConfirm?.name}"?`
                : profileConfirm?.pending
                ? `Discard the pending changes from "${profileConfirm?.name}"? The currently approved profile stays as it is.`
                : `Reject the work profile of "${profileConfirm?.name}"? They can edit and resubmit.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileConfirm(null)} disabled={actionLoading2}>
              Cancel
            </Button>
            <Button
              variant={profileConfirm?.status === "approved" ? "default" : "destructive"}
              onClick={handleProfileAction}
              disabled={actionLoading2}
            >
              {actionLoading2 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {profileConfirm?.status === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPosterBoys;
