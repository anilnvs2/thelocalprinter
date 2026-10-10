"use client";

import { useState, useEffect, useRef } from "react";
import {
  Store,
  Eye,
  Trash2,
  Loader2,
  MoreHorizontal,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Video,
  Clock,
  Search,
  User,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getResellerApplications,
  getResellerApplicationById,
  deleteResellerApplication,
} from "../../services/adminService";
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

const ImageViewer = ({ url, label }) => {
  const [open, setOpen] = useState(false);

  if (!url) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground italic">Not provided</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        className="relative group cursor-pointer rounded-lg overflow-hidden border"
        onClick={() => setOpen(true)}
      >
        <img
          src={url}
          alt={label}
          className="w-full h-40 object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/80 z-10"
            onClick={() => setOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={url}
            alt={label}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

const VideoPlayer = ({ url, label }) => {
  if (!url) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground italic">Not provided</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="relative rounded-lg overflow-hidden bg-black">
        <video
          src={url}
          controls
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          className="w-full max-h-[300px] object-contain"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

const statusTabs = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const AdminResellerApplications = () => {
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const debounceRef = useRef(null);

  const fetchApplications = async (p = 1, s = "", st = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await getResellerApplications(p, s, st === "all" ? "" : st);
      setApplications(res.data.applications);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load reseller applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(page, search, statusFilter);
  }, [page, statusFilter]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchApplications(1, value, statusFilter);
    }, 400);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPage(1);
    fetchApplications(1, search, statusFilter);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleView = async (id) => {
    setDetailLoading(true);
    try {
      const res = await getResellerApplicationById(id);
      setSelectedApp(res.data.application);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load application details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setError("");
      await deleteResellerApplication(deleteTarget._id);
      setApplications((prev) => prev.filter((a) => a._id !== deleteTarget._id));
      if (pagination) {
        const newTotal = pagination.total - 1;
        const newPages = Math.ceil(newTotal / pagination.limit);
        setPagination((prev) => ({ ...prev, total: newTotal, pages: newPages }));
        if (page > newPages && newPages > 0) setPage(newPages);
      }
      if (selectedApp?._id === deleteTarget._id) setSelectedApp(null);
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete application");
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
        title="Reseller Applications"
        description="Manage reseller applications and their approval status."
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

      <div className="flex flex-wrap items-center gap-2">
        {statusTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => handleStatusFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={handleSearchChange}
                onSubmit={handleSearchSubmit}
                className="pl-9"
              />
            </div>
            {pagination && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {pagination.total} application{pagination.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <PageLoader text="Loading applications..." />
          ) : applications.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No Applications"
              description={
                search || statusFilter !== "all"
                  ? "No applications match your criteria."
                  : "No reseller applications found."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead className="hidden sm:table-cell">Company</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((a) => (
                    <TableRow key={a._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold">
                              {getInitials(a.user?.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[180px]">
                              {a.user?.fullName || "Unknown"}
                            </p>
                            <CopyableId id={a.user?.publicId} />
                            <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                              {a.user?.email || ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {a.companyName || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {a.businessCategory ? (
                          <Badge variant="secondary" className="font-normal">
                            {a.businessCategory}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={a.status.toLowerCase()} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => handleView(a._id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(a)}
                              disabled={deleteLoading && deleteTarget?._id === a._id}
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

      {/* Detail View Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              {selectedApp?.companyName} — submitted by {selectedApp?.user?.fullName}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedApp && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-semibold">
                    {getInitials(selectedApp.user?.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedApp.user?.fullName}</p>
                  <CopyableId id={selectedApp.user?.publicId} />
                  <p className="text-sm text-muted-foreground">{selectedApp.user?.email}</p>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={selectedApp.status.toLowerCase()} />
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  { icon: Building2, label: "Company", value: selectedApp.companyName },
                  { icon: User, label: "Applicant", value: selectedApp.user?.fullName },
                  { icon: Mail, label: "Email", value: selectedApp.user?.email },
                  { icon: Phone, label: "Phone", value: selectedApp.contactNumber || selectedApp.user?.phone || "N/A" },
                  { icon: MapPin, label: "Address", value: selectedApp.address || "N/A" },
                  { icon: FileText, label: "Category", value: selectedApp.businessCategory },
                  { icon: CreditCard, label: "GST Number", value: selectedApp.gstNumber || "N/A" },
                  { icon: Clock, label: "Yearly Turnover", value: selectedApp.yearlyTurnover || "N/A" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <item.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-muted-foreground">{item.label}</p>
                      <p className="font-medium">{item.value || "N/A"}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedApp.rejectionReason && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
                  <p className="text-muted-foreground font-medium">Rejection Reason</p>
                  <p className="text-destructive">{selectedApp.rejectionReason}</p>
                </div>
              )}

              <div className="space-y-4">
                <ImageViewer
                  url={selectedApp.businessCardPath ? `/${selectedApp.businessCardPath}` : null}
                  label="Business Card"
                />
                <VideoPlayer
                  url={selectedApp.locationVideoPath ? `/${selectedApp.locationVideoPath}` : null}
                  label="Location Video"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the application from{" "}
              <strong>{deleteTarget?.user?.fullName}</strong>? This action cannot be undone.
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
    </div>
  );
};

export default AdminResellerApplications;
