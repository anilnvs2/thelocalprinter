"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Heart, Building2, MapPin, Trash2, Loader2 } from "lucide-react";
import { getWishlist, removeFromWishlist } from "../../services/userService";
import { businessHref } from "../../lib/utils";
import { PageHeader } from "../../components/shared/page-header";
import { EmptyState } from "../../components/shared/empty-state";
import { PageLoader } from "../../components/shared/page-loader";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import CopyableId from "../../components/admin/CopyableId";

const UserWishlist = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [removingId, setRemovingId] = useState(null);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getWishlist(page);
      setItems(res.data.wishlist);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const handleRemove = async (businessId) => {
    setRemovingId(businessId);
    try {
      await removeFromWishlist(businessId);
      setItems((prev) => prev.filter((item) => item.business?._id !== businessId));
      setPagination((prev) => prev ? { ...prev, total: prev.total - 1 } : prev);
    } catch (err) { /* silent */ } finally { setRemovingId(null); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader title="My Wishlist" description="Businesses you've saved for later" />

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="text-destructive text-sm p-6">{error}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your Wishlist is Empty"
          description="Start exploring and save businesses you're interested in."
        />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => {
              const b = item.business;
              if (!b) return null;
              return (
                <Card key={item._id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4">
                      <div
                        onClick={() => router.push(businessHref(b, "/user/businesses"))}
                        className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-950/30 flex items-center justify-center text-primary flex-shrink-0 cursor-pointer overflow-hidden"
                      >
                        {b.verificationMedia?.outdoorStoreImage || b.verificationMedia?.indoorStoreImage ? (
                          <img src={b.verificationMedia.outdoorStoreImage || b.verificationMedia.indoorStoreImage} alt={b.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 size={24} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(businessHref(b, "/user/businesses"))}>
                        <h3 className="text-sm font-bold text-foreground truncate">{b.name}</h3>
                        {b.vendor?.publicId && (
                          <CopyableId id={b.vendor.publicId} />
                        )}
                        {b.category && (
                          <div className="flex items-center gap-1.5">
                            {b.categoryId?.image && (b.categoryId.image.trim().startsWith('<') ? <div className="h-3.5 w-3.5 [&>svg]:w-3.5 [&>svg]:h-3.5" dangerouslySetInnerHTML={{ __html: b.categoryId.image }} /> : <img src={b.categoryId.image} alt="" className="h-3.5 w-3.5 object-contain" />)}
                            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide">{b.category}</p>
                          </div>
                        )}
                        {b.city && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin size={12} /> {b.city}
                          </p>
                        )}
                        {b.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{b.description.slice(0, 80)}...</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-500/10 flex-shrink-0"
                        onClick={() => handleRemove(b._id)}
                        disabled={removingId === b._id}
                      >
                        {removingId === b._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserWishlist;
