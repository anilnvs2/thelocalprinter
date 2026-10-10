"use client";

import { useState, useEffect, useRef } from "react";
import {
  Star,
  Eye,
  EyeOff,
  Building2,
  User,
  Search,
  Loader2,
  MoreHorizontal,
  MessageSquare,
  Heart,
  CreditCard,
} from "lucide-react";
import { getAdminReviews, toggleReviewVisibility, getBusinesses } from "../../services/adminService";
import { PageHeader } from "../../components/shared/page-header";
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
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const RatingStars = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i <= rating
            ? "fill-amber-400 text-amber-400"
            : "fill-none text-muted-foreground/40"
        }`}
        strokeWidth={1.5}
      />
    ))}
    <span className="ml-1.5 text-xs font-semibold text-muted-foreground">
      {rating}.0
    </span>
  </div>
);

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [businesses, setBusinesses] = useState([]);
  const debounceRef = useRef(null);
  const filtersRef = useRef({ search: "", businessId: "", rating: "" });

  const fetchReviews = async (p = 1, s = "", businessId = "", rating = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminReviews(p, s, { businessId, rating });
      setReviews(res.data.reviews);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBusinesses(1, "", "", "", 200)
      .then((res) => setBusinesses(res.data.businesses || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchReviews(page, filtersRef.current.search, filtersRef.current.businessId, filtersRef.current.rating);
  }, [page]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      filtersRef.current = { ...filtersRef.current, search: value };
      setPage(1);
      fetchReviews(1, value, filtersRef.current.businessId, filtersRef.current.rating);
    }, 400);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    filtersRef.current = { ...filtersRef.current, search };
    setPage(1);
    fetchReviews(1, search, filtersRef.current.businessId, filtersRef.current.rating);
  };

  const handleBusinessFilter = (value) => {
    setBusinessFilter(value);
    const businessId = value === "all" ? "" : value;
    filtersRef.current = { ...filtersRef.current, businessId };
    setPage(1);
    fetchReviews(1, filtersRef.current.search, businessId, filtersRef.current.rating);
  };

  const handleRatingFilter = (value) => {
    setRatingFilter(value);
    const rating = value === "all" ? "" : value;
    filtersRef.current = { ...filtersRef.current, rating };
    setPage(1);
    fetchReviews(1, filtersRef.current.search, filtersRef.current.businessId, rating);
  };

  const handleToggleVisibility = async (id) => {
    try {
      setActionLoading(id);
      setError("");
      const res = await toggleReviewVisibility(id);
      setReviews((prev) =>
        prev.map((r) =>
          r._id === id ? { ...r, isVisible: res.data.review.isVisible } : r
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update review visibility");
    } finally {
      setActionLoading(null);
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
        title="Reviews"
        description="Manage customer reviews and their visibility."
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
                placeholder="Search by reviewer or business name..."
                value={search}
                onChange={handleSearchChange}
                onSubmit={handleSearchSubmit}
                className="pl-9"
              />
            </div>
            <Select value={businessFilter} onValueChange={handleBusinessFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Businesses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Businesses</SelectItem>
                {businesses.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={handleRatingFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Ratings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                {[5, 4, 3, 2, 1].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r} Star{r !== 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pagination && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {pagination.total} review{pagination.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <PageLoader text="Loading reviews..." />
          ) : reviews.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No Reviews Found"
              description={
                search ? "No reviews match your search." : "No reviews have been submitted yet."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead className="hidden sm:table-cell">Reviewer</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="hidden md:table-cell">Comment</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="hidden sm:table-cell">Wishlist</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-xs font-semibold">
                              {getInitials(r.business?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate max-w-[150px]">
                            {r.business?.name || "Deleted Business"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold">
                              {getInitials(r.user?.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm truncate">{r.user?.fullName || "Deleted User"}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {r.user?.email || ""}
                            </p>
                            {r.user?.publicId && (
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                {r.user.publicId}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RatingStars rating={r.rating} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]" title={r.comment}>
                          {r.comment || (
                            <span className="italic">No comment</span>
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.isVisible ? "success" : "secondary"}
                          className="gap-1"
                        >
                          {r.isVisible ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          {r.isVisible ? "Visible" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {r.isWishlisted ? (
                          <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20">
                            <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                            Loved
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
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
                            <DropdownMenuItem
                              onClick={() => handleToggleVisibility(r._id)}
                              disabled={actionLoading === r._id}
                            >
                              {actionLoading === r._id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : r.isVisible ? (
                                <EyeOff className="mr-2 h-4 w-4" />
                              ) : (
                                <Eye className="mr-2 h-4 w-4" />
                              )}
                              {r.isVisible ? "Hide Review" : "Show Review"}
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
    </div>
  );
};

export default AdminReviews;
