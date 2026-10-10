"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Heart,
  ArrowRight,
  Printer,
  Star,
  Navigation,
  Loader2,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { getUserDashboard, getFilterOptions, getPublicBusinesses, addToWishlist, removeFromWishlist } from "../../services/userService";
import { businessHref } from "../../lib/utils";
import { PageLoader } from "../../components/shared/page-loader";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import UserBusinessCard from "../../components/user/UserBusinessCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const SEARCH_PLACEHOLDERS = [
  "Search by business name...",
  "Search by vendor ID...",
  "Search by location...",
];

const UserDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [displayPlaceholder, setDisplayPlaceholder] = useState(SEARCH_PLACEHOLDERS[0]);
  const [locationName, setLocationName] = useState("");
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [radius, setRadius] = useState("");
  const [category, setCategory] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [minRating, setMinRating] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [orderingMethod, setOrderingMethod] = useState("");
  const [orderLimits, setOrderLimits] = useState("");
  const [filters, setFilters] = useState({
    categories: [],
    serviceTypes: [],
    customerTypes: [],
    orderingMethods: [],
    orderLimits: [],
  });

  const [searchResults, setSearchResults] = useState(null);
  const [filterResults, setFilterResults] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPagination, setSearchPagination] = useState(null);
  const [filterPagination, setFilterPagination] = useState(null);
  const [searchPage, setSearchPage] = useState(1);
  const [filterPage, setFilterPage] = useState(1);
  const [wishlistOverrides, setWishlistOverrides] = useState({});
  const [togglingWishlistId, setTogglingWishlistId] = useState(null);
  // Fresh server flags win whenever the result sets change.
  useEffect(() => { setWishlistOverrides({}); }, [searchResults, filterResults, data]);

  const isWishlisted = (b) =>
    wishlistOverrides[b._id] ?? !!b.isWishlisted;

  const toggleWishlist = async (e, businessId) => {
    e?.stopPropagation?.();
    setTogglingWishlistId(businessId);
    try {
      const currently = wishlistOverrides[businessId] ?? !!(
        [...(searchResults || []), ...(filterResults || []), ...(data?.recentBusinesses || [])]
          .find((x) => x._id === businessId)?.isWishlisted
      );
      if (currently) {
        await removeFromWishlist(businessId);
        setWishlistOverrides((prev) => ({ ...prev, [businessId]: false }));
      } else {
        await addToWishlist(businessId);
        setWishlistOverrides((prev) => ({ ...prev, [businessId]: true }));
      }
    } catch (err) { /* silent */ } finally { setTogglingWishlistId(null); }
  };

  const debounceRef = useRef(null);
  const searchQueryRef = useRef("");
  const filterFetchIdRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setDisplayPlaceholder(SEARCH_PLACEHOLDERS[placeholderIdx]);
  }, [placeholderIdx]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await getUserDashboard();
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await getFilterOptions();
        setFilters(res.data);
      } catch (err) { /* silent */ }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    setFilterPage(1);
  }, [locationName, userLat, userLng, radius, category, serviceId, minRating, serviceType, customerType, orderingMethod, orderLimits]);

  const hasActiveFilters = !!(locationName.trim() || userLat !== null || radius || category || serviceId || minRating || serviceType || customerType || orderingMethod || orderLimits);

  const performFilterSearch = useCallback(async (targetPage = 1) => {
    const fetchId = ++filterFetchIdRef.current;
    setFilterLoading(true);
    try {
      const params = { page: targetPage, limit: 12 };
      if (userLat !== null && userLng !== null && radius) {
        params.lat = userLat;
        params.lng = userLng;
        params.radius = radius;
      } else if (locationName.trim()) {
        const cityName = locationName.split(",")[0].trim();
        if (cityName) params.city = cityName;
      }
      if (serviceId) {
        params.serviceId = serviceId;
      } else if (category) {
        params.categoryId = category;
      }
      if (minRating) params.minRating = minRating;
      if (serviceType) params.serviceType = serviceType;
      if (customerType) params.customerType = customerType;
      if (orderingMethod) params.orderingMethod = orderingMethod;
      if (orderLimits) params.orderLimits = orderLimits;
      const res = await getPublicBusinesses(params);
      if (filterFetchIdRef.current === fetchId) {
        setFilterResults(res.data.businesses || []);
        setFilterPagination(res.data.pagination || null);
      }
    } catch (err) {
      if (filterFetchIdRef.current === fetchId) {
        setFilterResults([]);
        setFilterPagination(null);
      }
    } finally {
      if (filterFetchIdRef.current === fetchId) {
        setFilterLoading(false);
      }
    }
  }, [locationName, userLat, userLng, radius, category, serviceId, minRating, serviceType, customerType, orderingMethod, orderLimits]);

  useEffect(() => {
    if (searchQuery.trim()) return;
    if (!hasActiveFilters) {
      setFilterResults(null);
      setFilterLoading(false);
      setFilterPagination(null);
      return;
    }
    performFilterSearch(filterPage);
  }, [hasActiveFilters, performFilterSearch, searchQuery, filterPage]);

  const performSearch = useCallback(async (query, targetPage = 1) => {
    if (!query || !query.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      setSearchPagination(null);
      return;
    }
    setSearchLoading(true);
    try {
      const params = { search: query.trim(), page: targetPage, limit: 12 };
      if (userLat !== null && userLng !== null && radius) {
        params.lat = userLat;
        params.lng = userLng;
        params.radius = radius;
      } else if (locationName.trim()) {
        const cityName = locationName.split(",")[0].trim();
        if (cityName) params.city = cityName;
      }
      if (serviceId) {
        params.serviceId = serviceId;
      } else if (category) {
        params.categoryId = category;
      }
      if (minRating) params.minRating = minRating;
      if (serviceType) params.serviceType = serviceType;
      if (customerType) params.customerType = customerType;
      if (orderingMethod) params.orderingMethod = orderingMethod;
      if (orderLimits) params.orderLimits = orderLimits;
      const res = await getPublicBusinesses(params);
      if (searchQueryRef.current.trim() === query.trim()) {
        setSearchResults(res.data.businesses || []);
        setSearchPagination(res.data.pagination || null);
      }
    } catch (err) {
      if (searchQueryRef.current.trim() === query.trim()) {
        setSearchResults([]);
        setSearchPagination(null);
      }
    } finally {
      if (searchQueryRef.current.trim() === query.trim()) {
        setSearchLoading(false);
      }
    }
  }, [locationName, userLat, userLng, radius, category, serviceId, minRating, serviceType, customerType, orderingMethod, orderLimits]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
    setSearchPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      setSearchPagination(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      performSearch(searchQuery, 1);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, performSearch]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLocationLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLat(latitude);
        setUserLng(longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await res.json();
          const addr = data.address;
          const cityParts = [addr.city || addr.town || addr.village || addr.county, addr.state].filter(Boolean);
          setLocationName(cityParts.join(", ") || data.display_name?.split(",").slice(0, 2).join(",") || "");
        } catch {
          setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === 1) setError("Location permission denied. Please allow location access.");
        else if (err.code === 2) setError("Unable to determine your location.");
        else setError("Location request timed out. Please try again.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchPage(1);
    performSearch(searchQuery, 1);
  };

  if (loading) return <PageLoader />;
  if (error && !data) return <div className="text-destructive p-6">{error}</div>;

  const { stats, recentBusinesses, popularCategories } = data || {};

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalBusinesses}</p>
                <p className="text-xs text-muted-foreground">Businesses</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
                <Heart size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.wishlistCount}</p>
                <p className="text-xs text-muted-foreground">Wishlisted</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0">
                <Star size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalCategories}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {popularCategories && popularCategories.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground">Browse by Category</h3>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => router.push("/user/businesses")}>
              View All <ArrowRight size={14} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularCategories.map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className="cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-colors"
                onClick={() => router.push(`/user/businesses?category=${encodeURIComponent(cat)}`)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {searchLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : searchResults !== null && searchQuery.trim() ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground">
              Search Results {searchPagination ? `(${searchPagination.total} total)` : searchResults.length > 0 && `(${searchResults.length})`}
            </h3>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => { setSearchQuery(""); setSearchResults(null); }}>
              <X size={14} /> Clear Search
            </Button>
          </div>
          {searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <img src="/data-not-found.png" alt="No Data Found" className="mb-4 h-48 w-48 object-contain" />
              <h3 className="mb-1 text-base font-semibold">No Data Found in Database</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                No businesses match your search. Try a different query.
              </p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((b) => (
                <UserBusinessCard
                  key={b._id}
                  business={b}
                  detailHref={businessHref(b, "/user/businesses")}
                  showWishlist
                  wishlisted={isWishlisted(b)}
                  togglingWishlist={togglingWishlistId === b._id}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>
            {searchPagination && searchPagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  disabled={searchPage <= 1}
                  onClick={() => { setSearchPage(searchPage - 1); performSearch(searchQuery, searchPage - 1); }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground px-3">
                  Page {searchPagination.page} of {searchPagination.pages}
                </span>
                <button
                  disabled={searchPage >= searchPagination.pages}
                  onClick={() => { setSearchPage(searchPage + 1); performSearch(searchQuery, searchPage + 1); }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
            </>
          )}
        </div>
      ) : filterLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : filterResults !== null ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground">
              Filtered Results {filterPagination ? `(${filterPagination.total} total)` : filterResults.length > 0 && `(${filterResults.length})`}
            </h3>
          </div>
          {filterResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <img src="/data-not-found.png" alt="No Data Found" className="mb-4 h-48 w-48 object-contain" />
              <h3 className="mb-1 text-base font-semibold">No Data Found in Database</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                No businesses match the selected filters. Try adjusting your criteria.
              </p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterResults.map((b) => (
                <UserBusinessCard
                  key={b._id}
                  business={b}
                  detailHref={businessHref(b, "/user/businesses")}
                  showWishlist
                  wishlisted={isWishlisted(b)}
                  togglingWishlist={togglingWishlistId === b._id}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>
            {filterPagination && filterPagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  disabled={filterPage <= 1}
                  onClick={() => setFilterPage(filterPage - 1)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground px-3">
                  Page {filterPagination.page} of {filterPagination.pages}
                </span>
                <button
                  disabled={filterPage >= filterPagination.pages}
                  onClick={() => setFilterPage(filterPage + 1)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
            </>
          )}
        </div>
      ) : recentBusinesses && recentBusinesses.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground">Recently Added</h3>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => router.push("/user/businesses")}>
              View All <ArrowRight size={14} />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentBusinesses.map((b) => (
              <UserBusinessCard
                key={b._id}
                business={b}
                detailHref={businessHref(b, "/user/businesses")}
                showWishlist
                wishlisted={isWishlisted(b)}
                togglingWishlist={togglingWishlistId === b._id}
                onToggleWishlist={toggleWishlist}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default UserDashboard;
