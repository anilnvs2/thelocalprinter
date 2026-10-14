'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import {
  SlidersHorizontal,
  Search,
  X,
  ChevronDown,
  Loader2,
  Sun,
  Moon,
  Navigation,
} from 'lucide-react';
import UserBusinessCard from '@/components/user/UserBusinessCard';
import PosterBoyCard from '@/components/user/PosterBoyCard';
import { searchPublicBusinesses, getPublicFilterOptions, getLocationAutocomplete, getPublicPosterBoys, getActiveCategories } from '@/services/userService';
import { getSavedCity, clearLocation, onSavedLocationChange } from '@/lib/savedLocation';
import { businessHref } from '@/lib/utils';

// Radius filters businesses by distance from the search location. Default 5 km.
// Increasing the radius only adds more (further) businesses — it never removes
// ones already shown, so the result set grows monotonically. 0 ("Off") lists
// every business in the city regardless of distance.
const RADIUS_OPTIONS = [0, 5, 10, 20, 30, 50];
const RADIUS_DEFAULT = 5;

const CustomDropdown = ({ value, onChange, options, placeholder = "Select...", minWidth = "min-w-[220px]", align = "left", direction = "down" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${isOpen ? 'z-[60]' : 'z-40'}`} ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-[13px] lg:text-[14px] text-brand-navy font-semibold outline-none bg-transparent p-0 border-none cursor-pointer flex justify-between items-center group"
      >
        <span className="truncate pr-4 select-none">{value || placeholder}</span>
        <ChevronDown className={`w-[18px] h-[18px] text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-orange' : 'group-hover:text-brand-orange'}`} />
      </div>

      <div
        className={`absolute ${direction === 'up' ? 'bottom-[130%]' : 'top-[130%]'} ${align === 'right' ? 'right-0' : 'left-0'} ${minWidth} bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-gray-100 py-3 transition-all duration-300 ${isOpen ? 'opacity-100 visible translate-y-0' : `opacity-0 invisible ${direction === 'up' ? 'translate-y-[15px]' : '-translate-y-[15px]'}`}`}
      >
        {options.map((opt, i) => (
          <div
            key={i}
            onClick={() => { onChange(opt); setIsOpen(false); }}
            className="relative block py-3 pr-5 text-[14px] font-semibold text-brand-navy transition-all duration-300 hover:bg-brand-orange/5 hover:text-brand-orange cursor-pointer group/item pl-5 hover:pl-8"
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 bg-brand-orange transition-all duration-300 ease-out group-hover/item:h-[60%] rounded-r-md"></div>
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
};

const API_MAP = {
  filterOrder: { 'All order types': '', 'On Call': 'on_call', 'Shop Visit': 'shop_visit' },
  filterService: { 'All services': '', 'Print only': 'print_only', 'Design & Print': 'full_with_design' },
  filterLimit: { 'Any': '', 'No Limit': 'no_limit', 'Single': 'single', 'Minimum': 'minimum', 'Bulk': 'bulk' },
};

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef(null);

  // Lazy-init from the URL (and saved location) so the very first effect pass
  // already has the final keyword/location. This component only mounts on the
  // client (useSearchParams inside Suspense), so reading localStorage here is
  // safe and avoids a second fetch when the mount effect syncs the state.
  const [keyword, setKeyword] = useState(() => searchParams.get('q') || '');
  const [location, setLocation] = useState(() => searchParams.get('location') || getSavedCity());

  useEffect(() => {
    // No explicit location in the URL (footer links, direct open) → fall back
    // to the saved location so results stay location-aware across refreshes.
    const loc = searchParams.get('location') || getSavedCity();
    const q = searchParams.get('q') || '';
    setLocation(loc);
    setKeyword(q);
  }, [searchParams]);

  // Stay in sync with the saved location (e.g. auto re-detect after a clear)
  // unless the URL pins an explicit location chosen by the visitor.
  useEffect(() => {
    if (searchParams.get('location')) return undefined;
    return onSavedLocationChange(({ city }) => setLocation(city));
  }, [searchParams]);
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [filterRating, setFilterRating] = useState('Any rating');
  const [filterService, setFilterService] = useState('All services');
  const [filterOrder, setFilterOrder] = useState('All order types');
  const [filterDeal, setFilterDeal] = useState('B2B, B2C & both');
  const [filterLimit, setFilterLimit] = useState('Any');
  const [showFilters, setShowFilters] = useState(false);
  const [radius, setRadius] = useState(RADIUS_DEFAULT);
  const [radiusApplied, setRadiusApplied] = useState(RADIUS_DEFAULT);
  const [searchCoords, setSearchCoords] = useState(null);

  const [businesses, setBusinesses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({ categories: [] });
  const [currentPage, setCurrentPage] = useState(1);

  // Staffing ("Poster Boy") results sit on top when the query names the
  // category, one of its skills, or the visitor picks it in the Category filter.
  const [staffingCategory, setStaffingCategory] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [posterBoys, setPosterBoys] = useState([]);
  const [pbLoading, setPbLoading] = useState(false);
  // Staffing detection is async — don't render the businesses empty state until
  // we know whether this query also lists poster boys (otherwise "0 results"
  // flashes for a beat before the staffing category loads).
  const [catsReady, setCatsReady] = useState(false);

  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('search-theme');
    if (saved === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('search-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    getPublicFilterOptions().then(res => {
      if (res?.data) setFilterOptions(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getActiveCategories()
      .then(res => {
        const cats = res?.data?.categories || [];
        setAllCategories(cats);
        setStaffingCategory(cats.find(c => c.kind === 'staffing') || null);
      })
      .catch(() => setStaffingCategory(null))
      .finally(() => setCatsReady(true));
  }, []);

  const query = keyword.trim().toLowerCase();
  // "poster boy" (any casing) names the staffing category itself → list them all.
  // A single skill name narrows it down through the free-text search instead.
  const matchesStaffingName = !!(
    staffingCategory &&
    query &&
    (query.includes("poster boy") ||
      query.includes("poster-boy") ||
      (staffingCategory.name || "").toLowerCase().includes(query))
  );
  const matchesStaffingSkill = !!(
    staffingCategory &&
    query &&
    (staffingCategory.services || []).some(s =>
      (s.name || "").toLowerCase().includes(query)
    )
  );
  // Picking "Poster Boy" in the Category filter also lists the worker boys.
  const staffingSelected = !!(staffingCategory && filterCategory === staffingCategory.name);
  const showPosterBoys = matchesStaffingName || matchesStaffingSkill || staffingSelected;

  useEffect(() => {
    if (!showPosterBoys) {
      setPosterBoys([]);
      setPbLoading(false);
      return undefined;
    }
    let cancelled = false;
    setPbLoading(true);
    const params = { limit: 12 };
    if (matchesStaffingName || staffingSelected) {
      params.categoryId = staffingCategory._id;
    } else {
      params.search = keyword.trim();
    }
    if (location.trim()) params.city = location.trim();
    // Same geo contract as businesses: always send coords for distance,
    // radius only filters when > 0 (default 5 km).
    if (searchCoords) {
      params.lat = searchCoords.lat;
      params.lng = searchCoords.lng;
      if (Number(radiusApplied) > 0) params.radius = Number(radiusApplied);
    }
    getPublicPosterBoys(params)
      .then(res => { if (!cancelled) setPosterBoys(res?.data?.posterBoys || []); })
      .catch(() => { if (!cancelled) setPosterBoys([]); })
      .finally(() => { if (!cancelled) setPbLoading(false); });
    return () => { cancelled = true; };
  }, [showPosterBoys, matchesStaffingName, staffingSelected, staffingCategory, keyword, location, searchCoords, radiusApplied]);

  // Reverse-geocode the location string to lat/lng once, and remember which
  // location string has settled. The business search waits on this so it runs
  // exactly once with the final coords instead of firing without radius and
  // again when the geocode resolves.
  const [geoSettledFor, setGeoSettledFor] = useState('');

  useEffect(() => {
    const loc = (location || '').trim();
    if (!loc) {
      setSearchCoords(null);
      setGeoSettledFor('');
      return undefined;
    }
    let cancelled = false;
    getLocationAutocomplete(loc, 8)
      .then((res) => {
        if (cancelled) return;
        const list = res?.data?.locations || [];
        const match = list.find((l) =>
          l && l.lat !== null && l.lon !== null && l.lat !== '' && l.lon !== '' &&
          Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lon))
        );
        setSearchCoords(match ? { lat: Number(match.lat), lng: Number(match.lon) } : null);
        setGeoSettledFor(loc);
      })
      .catch(() => {
        if (cancelled) return;
        setSearchCoords(null);
        setGeoSettledFor(loc);
      });
    return () => { cancelled = true; };
  }, [location]);

  useEffect(() => {
    const t = setTimeout(() => setRadiusApplied(radius), 350);
    return () => clearTimeout(t);
  }, [radius]);

  const hasActiveFilters = !!(keyword.trim() || location.trim() || filterCategory !== 'All Categories' || filterService !== 'All services' || filterOrder !== 'All order types' || filterDeal !== 'B2B, B2C & both' || filterLimit !== 'Any' || filterRating !== 'Any rating' || radiusApplied > 0);

  const filtersRef = useRef({});
  filtersRef.current = { keyword, location, filterCategory, filterService, filterOrder, filterDeal, filterLimit, filterRating, filterOptions, allCategories, staffingCategory, radiusApplied, searchCoords };

  // Refetch when coords or radius change. Coords are always part of the key
  // (even with radius Off) so distance still resolves without flicker.
  const geoKey = searchCoords
    ? `${searchCoords.lat},${searchCoords.lng},${radiusApplied}`
    : `no-geo-${radiusApplied}`;
  // True once the reverse-geocode for the current location has settled (or
  // there is no location to geocode). The business search waits on this so
  // it fires once with the final coords instead of once without radius and
  // again when the geocode resolves.
  const geoReady = (location || '').trim() === geoSettledFor;

  // Monotonic sequence so a slow, stale response can never overwrite the
  // results of a newer search (rapid filter changes, location switch, etc.).
  const fetchSeqRef = useRef(0);

  const doFetch = useCallback(async (page = 1) => {
    const seq = ++fetchSeqRef.current;
    const f = filtersRef.current;
    // Staffing ("Poster Boy") is not a business category — its people are
    // listed by the poster-boy section, so skip the business query entirely.
    const staffingPick = !!(f.staffingCategory && f.filterCategory === f.staffingCategory.name);
    if (staffingPick) {
      setBusinesses([]);
      setPagination({ page: 1, limit: 12, total: 0, pages: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (f.keyword.trim()) params.search = f.keyword.trim();
      if (f.location.trim()) params.city = f.location.trim();
      if (f.filterCategory && f.filterCategory !== 'All Categories') {
        const cat =
          (f.allCategories || []).find(c => c.name === f.filterCategory) ||
          (f.filterOptions.categories || []).find(c => c.name === f.filterCategory);
        if (cat && cat.kind !== 'staffing') params.categoryId = cat.id || cat._id;
      }
      if (f.filterService !== 'All services') {
        const v = API_MAP.filterService[f.filterService];
        if (v) params.serviceType = v;
      }
      if (f.filterOrder !== 'All order types') {
        const v = API_MAP.filterOrder[f.filterOrder];
        if (v) params.orderingMethod = v;
      }
      if (f.filterDeal !== 'B2B, B2C & both') {
        params.customerType = API_MAP.dealWith?.[f.filterDeal] || '';
      }
      if (f.filterLimit !== 'Any') {
        const v = API_MAP.filterLimit[f.filterLimit];
        if (v) params.orderLimits = v;
      }
      if (f.filterRating !== 'Any rating') {
        params.minRating = f.filterRating === '4 Stars & up' ? 4 : 3;
      }
      if (f.searchCoords) {
        params.lat = f.searchCoords.lat;
        params.lng = f.searchCoords.lng;
        // Radius filters by distance (default 5 km). 0 ("Off") still sends
        // coords so the backend returns "X km away" sorted nearest-first.
        params.radius = Number(f.radiusApplied) || 0;
      }

      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key];
      });

      const res = await searchPublicBusinesses(params);
      if (seq !== fetchSeqRef.current) return; // superseded by a newer search
      if (res?.data) {
        setBusinesses(res.data.businesses || []);
        setPagination(res.data.pagination || { page: 1, limit: 12, total: 0, pages: 0 });
      }
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      console.error('Search failed:', err);
      setBusinesses([]);
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!geoReady) {
      // New location chosen — coords not settled yet. Show the spinner
      // instead of stale results from the previous location.
      setLoading(true);
      return;
    }
    doFetch(1);
    setCurrentPage(1);
  }, [keyword, location, filterCategory, filterService, filterOrder, filterDeal, filterLimit, filterRating, geoReady, geoKey, doFetch]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    doFetch(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAllFilters = () => {
    setKeyword('');
    setLocation('');
    clearLocation();
    // Drop stale location/q from the URL so it cannot resurrect old filters.
    router.replace('/search', { scroll: false });
    setFilterCategory('All Categories');
    setFilterService('All services');
    setFilterOrder('All order types');
    setFilterDeal('B2B, B2C & both');
    setFilterLimit('Any');
    setFilterRating('Any rating');
    setRadius(RADIUS_DEFAULT);
    setRadiusApplied(RADIUS_DEFAULT);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.search-top-block', { y: 20, opacity: 0, duration: 0.5, ease: 'power2.out' });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const categoryOptions = [
    'All Categories',
    ...(allCategories.length
      ? allCategories.map(c => c.name)
      : (filterOptions.categories?.map(c => c.name) || [])),
  ];

  // When a radius search comes back empty, offer the next size up
  // (5 → 10 → 20 → 30 → 50) so the visitor can widen the area in one tap.
  const nextRadiusOption = RADIUS_OPTIONS.find((v) => v > radiusApplied) ?? null;
  const canTryLargerRadius =
    !loading &&
    businesses.length === 0 &&
    !!searchCoords &&
    radiusApplied > 0 &&
    nextRadiusOption !== null &&
    !(showPosterBoys && posterBoys.length > 0);

  // The page renders atomically: "Searching..." until the business search,
  // staffing-category detection, and (when applicable) the poster-boy search
  // have ALL settled. This prevents the empty state / "0 results" from
  // flashing before the poster-boy results arrive.
  const searchPending = loading || !catsReady || (showPosterBoys && pbLoading);

  const isDark = theme === 'dark';

  return (
    <div ref={containerRef} className={`min-h-screen pt-[100px] pb-12 px-4 md:px-6 flex flex-col items-center transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-[#F7F8FA]'}`}>
      <div className="max-w-screen-xl w-full flex flex-col items-center">

        <div className="search-top-block relative z-30 w-full flex flex-col items-center mb-6">

          <div className="mt-5 flex flex-col gap-3 items-center w-full max-w-[1300px]">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2.5 text-[14px] font-extrabold transition-all duration-300 px-6 py-3 rounded-full shadow-md hover:shadow-lg border w-full sm:w-auto justify-center ${isDark ? 'bg-gray-800 border-gray-700 ' + (showFilters ? 'text-brand-orange border-brand-orange/20' : 'text-gray-200 hover:text-brand-orange') : 'bg-white border-gray-100 ' + (showFilters ? 'text-brand-orange border-brand-orange/20' : 'text-brand-navy hover:text-brand-orange')}`}>
                <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={2.5} />
                Filters & Radius
              </button>
              <button onClick={toggleTheme}
                className={`flex items-center gap-2 text-[14px] font-extrabold transition-all duration-300 px-5 py-3 rounded-full shadow-md hover:shadow-lg border w-full sm:w-auto justify-center ${isDark ? 'bg-gray-800 border-gray-700 text-yellow-400 hover:text-yellow-300' : 'bg-white border-gray-100 text-brand-navy hover:text-brand-orange'}`}>
                {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>

          <div className={`w-full max-w-[1300px] grid transition-[grid-template-rows,opacity,margin] duration-500 ease-in-out ${showFilters ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
            <div className="overflow-hidden">
              <div className={`w-full border rounded-3xl px-6 md:px-8 pt-8 pb-8 shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="flex flex-col relative">
                    <label className={`text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-300' : 'text-brand-navy'}`}>Category</label>
                    <div className={`border-b py-1.5 transition-colors ${isDark ? 'border-gray-600 hover:border-gray-400' : 'border-gray-100 hover:border-gray-300'}`}>
                      <CustomDropdown value={filterCategory} onChange={setFilterCategory} options={categoryOptions} />
                    </div>
                  </div>
                  <div className="flex flex-col relative">
                    <label className={`text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-300' : 'text-brand-navy'}`}>Rating (Minimum)</label>
                    <div className={`border-b py-1.5 transition-colors ${isDark ? 'border-gray-600 hover:border-gray-400' : 'border-gray-100 hover:border-gray-300'}`}>
                      <CustomDropdown value={filterRating} onChange={setFilterRating} options={['Any rating', '4 Stars & up', '3 Stars & up']} />
                    </div>
                  </div>
                  <div className="flex flex-col relative">
                    <label className={`text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-300' : 'text-brand-navy'}`}>Service</label>
                    <div className={`border-b py-1.5 transition-colors ${isDark ? 'border-gray-600 hover:border-gray-400' : 'border-gray-100 hover:border-gray-300'}`}>
                      <CustomDropdown value={filterService} onChange={setFilterService} options={['All services', 'Print only', 'Design & Print']} direction="up" />
                    </div>
                  </div>
                  <div className="flex flex-col relative">
                    <label className={`text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-300' : 'text-brand-navy'}`}>Order</label>
                    <div className={`border-b py-1.5 transition-colors ${isDark ? 'border-gray-600 hover:border-gray-400' : 'border-gray-100 hover:border-gray-300'}`}>
                      <CustomDropdown value={filterOrder} onChange={setFilterOrder} options={['All order types', 'On Call', 'Shop Visit']} direction="up" />
                    </div>
                  </div>
                  <div className="flex flex-col relative">
                    <label className={`text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-300' : 'text-brand-navy'}`}>Deal With</label>
                    <div className={`border-b py-1.5 transition-colors ${isDark ? 'border-gray-600 hover:border-gray-400' : 'border-gray-100 hover:border-gray-300'}`}>
                      <CustomDropdown value={filterDeal} onChange={setFilterDeal} options={['B2B, B2C & both', 'B2B only', 'B2C only']} direction="up" />
                    </div>
                  </div>
                  <div className="flex flex-col relative">
                    <label className={`text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-300' : 'text-brand-navy'}`}>Orders Limit</label>
                    <div className={`border-b py-1.5 transition-colors ${isDark ? 'border-gray-600 hover:border-gray-400' : 'border-gray-100 hover:border-gray-300'}`}>
                      <CustomDropdown value={filterLimit} onChange={setFilterLimit} options={['Any', 'No Limit', 'Single', 'Minimum', 'Bulk']} direction="up" />
                    </div>
                  </div>
                  <div className="flex flex-col md:col-span-2">
                    <label className={`text-[11px] font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-300' : 'text-brand-navy'}`}>
                      Radius: <span className="text-brand-orange">{radius === 0 ? 'Off' : `${radius} KM`}</span>
                    </label>
                    <div className={`border-b py-1.5 transition-colors ${isDark ? 'border-gray-600' : 'border-gray-100'}`}>
                      <input
                        type="range"
                        min={0}
                        max={RADIUS_OPTIONS.length - 1}
                        step={1}
                        value={Math.max(0, RADIUS_OPTIONS.indexOf(radius))}
                        onChange={(e) => setRadius(RADIUS_OPTIONS[Number(e.target.value)] ?? RADIUS_DEFAULT)}
                        aria-label="Radius in kilometers"
                        className="w-full accent-brand-orange cursor-pointer touch-none"
                      />
                      <div className={`flex justify-between text-[11px] font-semibold mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {RADIUS_OPTIONS.map((v) => (
                          <span key={v} className={radius === v ? 'text-brand-orange' : ''}>{v === 0 ? 'Off' : `${v} km`}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button onClick={() => { doFetch(1); setCurrentPage(1); }}
                      className="w-full h-[44px] bg-[#1C364F] hover:bg-[#122538] text-white rounded-xl font-bold text-[14px] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                      <SlidersHorizontal className="w-4 h-4" /> Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[1300px] flex flex-col mt-4">
          <div className="relative z-20 border-b pb-5 mb-8 transition-colors duration-300"
            style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
            <div className="flex flex-col">
              <h2 className={`text-[20px] md:text-[24px] font-extrabold transition-colors ${isDark ? 'text-gray-100' : 'text-brand-navy'}`}>
                {searchPending
                  ? 'Searching...'
                  : (() => {
                      const total = showPosterBoys
                        ? posterBoys.length + pagination.total
                        : pagination.total;
                      return `${total} result${total !== 1 ? 's' : ''} found`;
                    })()}
              </h2>
              {hasActiveFilters && !searchPending && (
                <p className={`text-[14px] font-medium mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {location.trim() ? `in ${location.trim()}` : 'Filtered results'}
                </p>
              )}
            </div>
          </div>

          {showPosterBoys && !searchPending && (
            <section className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 rounded-full bg-brand-orange" />
                <h3 className={`text-[18px] md:text-[20px] font-extrabold ${isDark ? 'text-gray-100' : 'text-brand-navy'}`}>
                  Poster Boys
                </h3>
                <span className={`text-[13px] font-medium px-2.5 py-0.5 rounded-full ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-brand-orange/10 text-brand-orange'}`}>
                  {posterBoys.length}
                </span>
                {location.trim() && (
                  <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-slate-100 text-brand-navy'}`}>
                    in {location.trim()}
                  </span>
                )}
              </div>
              {pbLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border h-[280px] animate-pulse`} />
                  ))}
                </div>
              ) : posterBoys.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {posterBoys.map(pb => <PosterBoyCard key={pb._id} posterBoy={pb} detailHref={`/poster-boys/${pb._id}`} />)}
                </div>
              ) : (
                <p className={`text-[14px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  No poster boys found here yet. Try another location or skill.
                </p>
              )}
            </section>
          )}

          {searchPending ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className={`w-10 h-10 animate-spin mb-4 ${isDark ? 'text-brand-orange' : 'text-brand-orange'}`} />
              <p className={`text-[16px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Searching for businesses...</p>
            </div>
          ) : businesses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {businesses.map((biz) => (
                  <UserBusinessCard
                    key={biz._id}
                    business={biz}
                    detailHref={businessHref(biz)}
                  />
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                    <button key={page} onClick={() => handlePageChange(page)}
                      className={`w-10 h-10 rounded-xl font-bold text-[14px] transition-all ${currentPage === page ? 'bg-[#EA580C] text-white shadow-md' : isDark ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-brand-orange hover:text-brand-orange' : 'bg-white border border-gray-200 text-brand-navy hover:border-brand-orange hover:text-brand-orange'}`}>
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={`flex flex-col items-center justify-center text-center py-16 rounded-3xl border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className={`w-[72px] h-[72px] mb-6 flex items-center justify-center rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <Search className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-300'}`} strokeWidth={2.5} />
              </div>
              <h3 className={`text-[22px] font-extrabold mb-2 ${isDark ? 'text-gray-100' : 'text-brand-navy'}`}>
                {showPosterBoys && posterBoys.length > 0
                  ? 'No printing businesses found for this query'
                  : canTryLargerRadius
                    ? `No businesses found within ${radiusApplied} km`
                    : 'No businesses found nearby'}
              </h3>
              <p className={`text-[15px] font-medium mb-8 max-w-[400px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {showPosterBoys && posterBoys.length > 0
                  ? 'Poster boys are listed above. Try another keyword or clear filters.'
                  : canTryLargerRadius
                    ? 'Widen the radius to look further out for printing businesses near you.'
                    : "Try adjusting your search filters or expanding the area to find what you're looking for."}
              </p>
              {canTryLargerRadius && (
                <button onClick={() => setRadius(nextRadiusOption)}
                  className="mb-3 bg-brand-orange hover:bg-brand-orange/90 text-white px-8 py-3.5 rounded-full font-bold text-[14px] transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                  <Navigation className="w-4 h-4" /> Try {nextRadiusOption} km
                </button>
              )}
              <button onClick={clearAllFilters}
                className="bg-[#1C364F] hover:bg-[#122538] text-white px-8 py-3.5 rounded-full font-bold text-[14px] transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                <X className="w-4 h-4" /> Clear All Filters
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading search...</div></div>}>
      <SearchContent />
    </Suspense>
  );
}
