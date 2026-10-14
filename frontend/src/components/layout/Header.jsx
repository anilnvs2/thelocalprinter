'use client';

import Link from 'next/link';
import SearchBar from '../navigation/SearchBar';
import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { usePathname, useRouter } from 'next/navigation'; 
import { Menu, X, MapPin, Search, Crosshair, Loader2, LogOut, LayoutDashboard, ChevronDown, ChevronRight, Heart, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getActiveCategories, getWishlist, getPublicFilterOptions, getLocationAutocomplete } from '@/services/userService';
import { mergeCategories } from '@/data/vendorCategories';
import {
  readSavedLocation,
  saveLocation,
  saveManualLocation,
  isManualLocation,
  hasGeoAttempt,
  markGeoAttempt,
  requestCurrentCity,
  onSavedLocationChange,
} from '@/lib/savedLocation';

const MOBILE_LOCATION_DEBOUNCE_MS = 300;
const MOBILE_LOCATION_LIMIT = 5;

export default function Header() {
  const headerRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter(); 
  const { user, loading, logout } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
  const [mobileSuggestions, setMobileSuggestions] = useState([]);
  const [showMobileSuggestions, setShowMobileSuggestions] = useState(false);
  const [mobileSelectedIndex, setMobileSelectedIndex] = useState(-1);
  const [mobileNotification, setMobileNotification] = useState('');
  const [mobileLocationSuggestions, setMobileLocationSuggestions] = useState([]);
  const [showMobileLocationSuggestions, setShowMobileLocationSuggestions] = useState(false);
  const [mobileLocationSelectedIndex, setMobileLocationSelectedIndex] = useState(-1);
  const [isMobileLocationLoading, setIsMobileLocationLoading] = useState(false);
  const mobileLocationMetaRef = useRef(null);
  const mobileLocationDebounceRef = useRef(null);
  const mobileLocationAbortRef = useRef(null);
  const mobileLocationRequestIdRef = useRef(0);
  const mobileCitiesRef = useRef([]);
  const mobileLocationWrapperRef = useRef(null);
  const mobileCategoriesRef = useRef(mergeCategories([]));
  const mobileSearchWrapperRef = useRef(null);
  const profileRef = useRef(null);
  const locationOriginRef = useRef(`header-${Math.random().toString(36).slice(2)}`);
  const locationPersistRef = useRef(null);
  const locationInputRef = useRef('');
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    if (!loading && user?.role === 'USER') {
      getWishlist(1)
        .then((res) => setWishlistCount(res.data?.pagination?.total ?? 0))
        .catch(() => setWishlistCount(0));
    }
  }, [user, loading]);

  const getDashboardRoute = (role) => {
    switch (role) {
      case 'ADMIN': return '/admin/dashboard';
      case 'VENDOR': return '/vendor/dashboard';
      case 'USER': return '/user/dashboard/wishlist';
      case 'POSTER_BOY': return '/posterboy/dashboard';
      default: return '/user/dashboard';
    }
  };

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    setIsMobileProfileOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (mobileSearchWrapperRef.current && !mobileSearchWrapperRef.current.contains(e.target)) {
        setShowMobileSuggestions(false);
      }
      if (mobileLocationWrapperRef.current && !mobileLocationWrapperRef.current.contains(e.target)) {
        setShowMobileLocationSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    getActiveCategories()
      .then((res) => { mobileCategoriesRef.current = mergeCategories(res.data?.categories || []); })
      .catch(() => { mobileCategoriesRef.current = mergeCategories([]); });
    getPublicFilterOptions()
      .then((res) => { mobileCitiesRef.current = res.data?.cities || []; })
      .catch(() => { mobileCitiesRef.current = []; });
    return () => {
      if (mobileLocationDebounceRef.current) clearTimeout(mobileLocationDebounceRef.current);
      if (mobileLocationAbortRef.current) mobileLocationAbortRef.current.abort();
      if (locationPersistRef.current) clearTimeout(locationPersistRef.current);
    };
  }, []);

  // Fill the mobile location field when "Find Printers Near Me" detects the user's position.
  useEffect(() => {
    const onNearMeLocation = (e) => {
      const city = e?.detail?.city;
      if (city) {
        setLocationInput(city);
        mobileLocationMetaRef.current = null;
        setShowMobileLocationSuggestions(false);
        setMobileLocationSuggestions([]);
        saveLocation(city, { source: 'near_me' }, locationOriginRef.current);
      }
    };
    window.addEventListener('near-me-location', onNearMeLocation);
    return () => window.removeEventListener('near-me-location', onNearMeLocation);
  }, []);

  // Detect once per page load when no saved location exists (first visit, or
  // a reload after the visitor cleared it). Marked before asking so a remount
  // never re-prompts; clearing the field marks it too, so the visitor is never
  // forced back into auto-detect within the same visit.
  const runAutoDetect = useCallback(() => {
    if (isManualLocation() || hasGeoAttempt()) return;
    markGeoAttempt();
    setIsLocating(true);
    requestCurrentCity().then((city) => {
      setIsLocating(false);
      // Never fight the visitor: skip if they typed or saved something meanwhile.
      if (!city || isManualLocation() || readSavedLocation()?.city || locationInputRef.current.trim()) return;
      setLocationInput(city);
      saveLocation(city, { source: 'auto' }, locationOriginRef.current);
    });
  }, []);

  // Mirror of the location field so async detect results never clobber typing.
  useEffect(() => {
    locationInputRef.current = locationInput;
  }, [locationInput]);

  // Restore the saved location (survives refresh); first visit detects it.
  useEffect(() => {
    const saved = readSavedLocation();
    if (saved?.city) {
      setLocationInput(saved.city);
      return undefined;
    }
    runAutoDetect();
    return () => setIsLocating(false);
  }, [runAutoDetect]);

  // Keep the mobile field in sync when the desktop field (or another tab)
  // changes it. A clear (reset) never re-triggers auto-detection: the visitor
  // removed it on purpose, so they type it themselves. A reload/refresh
  // starts fresh and detects again.
  useEffect(() => {
    const off = onSavedLocationChange(({ city, origin }) => {
      if (origin !== locationOriginRef.current) {
        setLocationInput(city);
        mobileLocationMetaRef.current = null;
        setShowMobileLocationSuggestions(false);
        setMobileLocationSuggestions([]);
      }
    });
    return off;
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true); 

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county;
          
          if (city) {
            setLocationInput(city);
            saveLocation(city, { source: 'near_me', lat: latitude, lng: longitude }, locationOriginRef.current);
          } else {
            setLocationInput('Location Found');
          }
        } catch (error) {
          console.error(error);
          alert("Could not fetch location name.");
        } finally {
          setIsLocating(false); 
        }
      },
      (error) => {
        setIsLocating(false);
        markGeoAttempt();
        alert('Location access denied. Please type your city.');
      }
    );
  };

  const computeMobileDbLocationFallback = useCallback((text) => {
    const q = (text || '').trim().toLowerCase();
    if (!q) return [];
    return mobileCitiesRef.current
      .filter((city) => city.toLowerCase().includes(q))
      .slice(0, MOBILE_LOCATION_LIMIT)
      .map((city) => ({ placeId: `db-${city}`, displayName: city, city, state: '', country: '', lat: null, lon: null }));
  }, []);

  const fetchMobileLocationSuggestions = useCallback((text) => {
    const query = (text || '').trim();
    if (mobileLocationDebounceRef.current) clearTimeout(mobileLocationDebounceRef.current);
    if (mobileLocationAbortRef.current) mobileLocationAbortRef.current.abort();
    if (!query) {
      setMobileLocationSuggestions([]);
      setShowMobileLocationSuggestions(false);
      setIsMobileLocationLoading(false);
      return;
    }
    setIsMobileLocationLoading(true);
    setShowMobileLocationSuggestions(true);
    const requestId = ++mobileLocationRequestIdRef.current;
    mobileLocationDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      mobileLocationAbortRef.current = controller;
      try {
        const res = await getLocationAutocomplete(query, MOBILE_LOCATION_LIMIT, controller.signal);
        if (mobileLocationRequestIdRef.current !== requestId) return;
        setMobileLocationSuggestions((res?.data?.locations || []).slice(0, MOBILE_LOCATION_LIMIT));
        setMobileLocationSelectedIndex(-1);
      } catch (err) {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        if (mobileLocationRequestIdRef.current !== requestId) return;
        setMobileLocationSuggestions(computeMobileDbLocationFallback(query));
        setMobileLocationSelectedIndex(-1);
      } finally {
        if (mobileLocationRequestIdRef.current === requestId) setIsMobileLocationLoading(false);
      }
    }, MOBILE_LOCATION_DEBOUNCE_MS);
  }, [computeMobileDbLocationFallback]);

  const handleMobileLocationChange = (e) => {
    const val = e.target.value;
    setLocationInput(val);
    mobileLocationMetaRef.current = null;
    setMobileLocationSelectedIndex(-1);
    fetchMobileLocationSuggestions(val);
    if (locationPersistRef.current) clearTimeout(locationPersistRef.current);
    locationPersistRef.current = setTimeout(() => {
      saveManualLocation(val, locationOriginRef.current);
    }, 600);
  };

  const handleMobileLocationSuggestionClick = (suggestion) => {
    if (!suggestion) return;
    // ONLY populate the location field — no navigation, no search.
    setLocationInput(suggestion.displayName);
    mobileLocationMetaRef.current = suggestion;
    setShowMobileLocationSuggestions(false);
    setMobileLocationSuggestions([]);
    setMobileLocationSelectedIndex(-1);
    setIsMobileLocationLoading(false);
    saveManualLocation(suggestion.displayName, locationOriginRef.current);
  };

  const handleMobileLocationKeyDown = (e) => {
    if (!showMobileLocationSuggestions || (mobileLocationSuggestions.length === 0 && !isMobileLocationLoading)) {
      if (e.key === 'Escape') setShowMobileLocationSuggestions(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMobileLocationSelectedIndex((prev) => (prev < mobileLocationSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMobileLocationSelectedIndex((prev) => (prev > 0 ? prev - 1 : mobileLocationSuggestions.length - 1));
    } else if (e.key === 'Enter' && mobileLocationSelectedIndex >= 0) {
      e.preventDefault();
      handleMobileLocationSuggestionClick(mobileLocationSuggestions[mobileLocationSelectedIndex]);
    } else if (e.key === 'Escape') {
      setShowMobileLocationSuggestions(false);
      setMobileLocationSelectedIndex(-1);
    }
  };

  const computeMobileSuggestions = useCallback((text) => {
    if (!text || !text.trim()) return [];
    const q = text.trim().toLowerCase();
    const categoryResults = [];
    const subResults = [];
    mobileCategoriesRef.current.forEach((cat) => {
      if (cat.name.toLowerCase().includes(q)) {
        categoryResults.push({ type: 'CATEGORY', name: cat.name, href: `/categories/${cat.slug}` });
      }
      (cat.services || []).forEach((sub) => {
        if (sub.name.toLowerCase().includes(q)) {
          subResults.push({ type: 'SUBCATEGORY', name: sub.name, parentName: cat.name, href: `/categories/${cat.slug}/${sub.slug}` });
        }
      });
    });
    // Parent categories first (capped so subcategories still get room),
    // then subcategories — neither gets pushed out by the 12-item limit.
    return [...categoryResults.slice(0, 6), ...subResults].slice(0, 12);
  }, []);

  const handleMobileSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    setMobileSelectedIndex(-1);
    if (!val.trim()) {
      setMobileSuggestions([]);
      setShowMobileSuggestions(false);
      return;
    }
    const results = computeMobileSuggestions(val);
    setMobileSuggestions(results);
    setShowMobileSuggestions(results.length > 0);
  };

  const handleMobileSuggestionClick = (suggestion) => {
    setSearchInput(suggestion.name);
    setShowMobileSuggestions(false);
    setMobileSuggestions([]);
  };

  const handleMobileSearchKeyDown = (e) => {
    if (!showMobileSuggestions || mobileSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMobileSelectedIndex((prev) => (prev < mobileSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMobileSelectedIndex((prev) => (prev > 0 ? prev - 1 : mobileSuggestions.length - 1));
    } else if (e.key === 'Enter' && mobileSelectedIndex >= 0) {
      e.preventDefault();
      handleMobileSuggestionClick(mobileSuggestions[mobileSelectedIndex]);
    } else if (e.key === 'Escape') {
      setShowMobileSuggestions(false);
      setMobileSelectedIndex(-1);
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        y: -20,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out'
      });
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // If the header unmounts (route change) while the menu is open, never
    // leave the body scroll-locked — that looks like a frozen page.
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const userInitial = user?.role ? user.role.charAt(0) : '?';

  return (
    <>
      <header 
        ref={headerRef}
        className="fixed top-4 left-0 w-full z-40 px-4 md:px-6 flex justify-center pointer-events-none"
      >
        <div className="pointer-events-auto w-full h-[65px] max-w-screen-xl mx-auto px-4 lg:px-6 rounded-2xl bg-white/75 backdrop-blur-md shadow-lg border border-brand-border/50 flex items-center justify-between gap-8 transition-all">
          
          <Link href="/" className="shrink-0">
            <div className="flex items-center gap-2.5">
               <img 
                 src="/logo.webp" 
                 alt="Logo" 
                 className="w-[130px] md:w-[160px] h-auto" 
               />
            </div>
          </Link>

          <div className="hidden lg:flex flex-grow justify-center max-w-[740px] px-4">
            <SearchBar />
          </div>

          <nav className="hidden lg:flex items-center gap-2 shrink-0 text-[16px] font-bold">
            <Link 
              href="/about" 
              className={`px-4 py-2 rounded-xl transition-colors ${
                pathname === '/about' ? 'bg-brand-orange/10 text-brand-orange' : 'text-brand-navy hover:bg-brand-orange/10 hover:text-brand-orange'
              }`}
            >
              About
            </Link>
            <Link 
              href="/contact" 
              className={`px-4 py-2 rounded-xl transition-colors ${
                pathname === '/contact' ? 'bg-brand-orange/10 text-brand-orange' : 'text-brand-navy hover:bg-brand-orange/10 hover:text-brand-orange'
              }`}
            >
              Contact
            </Link>

            {!loading && user?.role === 'USER' && (
              <Link 
                href="/user/dashboard/wishlist" 
                className={`relative p-2 rounded-xl transition-colors ${
                  pathname === '/user/dashboard/wishlist' ? 'bg-brand-orange/10 text-brand-orange' : 'text-brand-navy hover:bg-brand-orange/10 hover:text-brand-orange'
                }`}
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-orange px-1 text-[9px] font-bold text-white leading-none">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {!loading && (
              <>
                {!user ? (
                  <Link 
                    href="/login" 
                    className="ml-2 px-6 py-2 rounded-xl border border-brand-border text-brand-navy hover:border-brand-navy hover:bg-brand-light transition-colors bg-white/50"
                  >
                    Login/Signup
                  </Link>
                ) : (
                  <div className="relative ml-2" ref={profileRef}>
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-brand-border bg-white/50 hover:bg-brand-light transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center text-[14px] font-bold shrink-0">
                        {userInitial}
                      </div>

                      <ChevronDown className={`w-4 h-4 text-brand-muted transition-transform hidden xl:block ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProfileOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-brand-border/50 py-2 z-50">
                        <div className="px-4 py-3 border-b border-brand-border/50 xl:hidden">
                          <p className="text-[14px] font-bold text-brand-navy line-clamp-1">{user.fullName}</p>
                          <p className="text-[11px] font-semibold text-brand-orange uppercase tracking-wider mt-0.5">{user.role}</p>
                        </div>
                        <Link
                          href={getDashboardRoute(user.role)}
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-semibold text-brand-navy hover:bg-brand-light hover:text-brand-orange transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-semibold text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </nav>

          <div className="flex items-center gap-2 lg:hidden pointer-events-auto">
            <Link 
             href="/search"
              className="w-9 h-9 flex items-center justify-center rounded-full  text-black shadow-sm hover:bg-[#D84A06] transition-colors"
            >
              <MapPin className="w-5 h-5" />
            </Link>
            <button 
              className="p-1.5 text-brand-navy hover:text-brand-orange transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
          
        </div>
      </header>

      <div 
        className={`fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[50] transition-opacity duration-300 lg:hidden ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div 
        className={`fixed top-0 right-0 h-full w-[85%] max-w-[320px] bg-white z-[60] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-brand-border/50">
          <img src="/logo.webp" alt="Logo" className="h-auto w-[130px]" />
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-full bg-brand-light text-brand-muted hover:text-brand-orange transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          
          <div className="w-full flex flex-col gap-2.5 p-4 bg-[#F7F8FA] rounded-2xl border border-brand-border">
            
            {mobileNotification && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[12px] font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {mobileNotification}
              </div>
            )}

            <div className="relative" ref={mobileLocationWrapperRef}>
              <div className="flex items-center bg-white p-2 rounded-xl">
                <MapPin className="w-[18px] h-[18px] text-brand-orange shrink-0 ml-1.5 mr-2.5" />
                <input
                  type="text"
                  value={locationInput}
                  onChange={handleMobileLocationChange}
                  onKeyDown={handleMobileLocationKeyDown}
                  onFocus={() => { if (locationInput.trim()) fetchMobileLocationSuggestions(locationInput); }}
                  autoComplete="off"
                  placeholder={isLocating ? "Detecting..." : "Enter location..."}
                  className="w-full text-[14px] bg-transparent outline-none border-none focus:ring-0 p-0 text-brand-navy font-medium placeholder:font-normal placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  aria-label="Use current location"
                  className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center shrink-0 transition-all ml-1 active:scale-95 cursor-pointer z-10 disabled:opacity-50"
                >
                  {isLocating ? (
                    <Loader2 className="w-[18px] h-[18px] text-brand-orange animate-spin" />
                  ) : (
                    <Crosshair className="w-[18px] h-[18px] text-brand-navy opacity-60 hover:opacity-100 pointer-events-none" />
                  )}
                </button>
              </div>

              {showMobileLocationSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-brand-border shadow-lg z-50 overflow-hidden max-h-[240px] overflow-y-auto">
                  {isMobileLocationLoading && mobileLocationSuggestions.length === 0 ? (
                    <div className="flex items-center gap-2.5 px-3 py-3 text-[12px] text-brand-muted">
                      <Loader2 className="w-4 h-4 animate-spin text-brand-orange shrink-0" />
                      Finding locations…
                    </div>
                  ) : mobileLocationSuggestions.length > 0 ? (
                    <ul>
                      {mobileLocationSuggestions.map((s, i) => (
                        <li
                          key={`ml-${s.placeId}-${i}`}
                          onClick={() => handleMobileLocationSuggestionClick(s)}
                          className={`flex items-center gap-2.5 px-3 py-3 cursor-pointer transition-colors min-h-[44px] ${i === mobileLocationSelectedIndex ? 'bg-brand-orange/5' : 'active:bg-slate-100'}`}
                        >
                          <MapPin className="w-4 h-4 text-brand-orange shrink-0" />
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-semibold text-brand-darkText truncate">{s.displayName}</span>
                            {(s.state || s.country) && (
                              <span className="block text-[10px] text-brand-muted truncate">{[s.state, s.country].filter(Boolean).join(', ')}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-3 py-3 text-[12px] text-brand-muted">No locations found</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="relative" ref={mobileSearchWrapperRef}>
              <div className="flex items-center bg-white p-2 rounded-xl">
                <Search className="w-[18px] h-[18px] text-brand-orange shrink-0 ml-1.5 mr-2.5" />
                <input 
                  type="text" 
                  value={searchInput}
                  onChange={handleMobileSearchChange}
                  onKeyDown={handleMobileSearchKeyDown}
                  onFocus={() => { if (searchInput.trim() && mobileSuggestions.length > 0) setShowMobileSuggestions(true); }}
                  autoComplete="off"
                  placeholder="Search category or subcategory..." 
                  className="w-full h-9 text-[14px] bg-transparent outline-none border-none focus:ring-0 p-0 text-brand-navy font-medium placeholder:font-normal placeholder:text-gray-400" 
                />
              </div>

              {showMobileSuggestions && mobileSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-brand-border shadow-lg z-50 overflow-hidden max-h-[260px] overflow-y-auto">
                  <ul>
                    {mobileSuggestions.map((s, i) => (
                      <li
                        key={`m-${s.type}-${s.href}-${i}`}
                        onClick={() => handleMobileSuggestionClick(s)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${i === mobileSelectedIndex ? 'bg-brand-orange/5' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-slate-100">
                          {s.type === 'CATEGORY' && <Search className="w-3.5 h-3.5 text-brand-orange" />}
                          {s.type === 'SUBCATEGORY' && <ChevronRight className="w-3.5 h-3.5 text-brand-orange" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-brand-darkText truncate">{s.name}</div>
                          {s.type === 'SUBCATEGORY' && (
                            <div className="text-[10px] text-brand-muted truncate">{s.parentName}</div>
                          )}
                        </div>
                        <span className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${s.type === 'CATEGORY' ? 'bg-brand-orange/10 text-brand-orange' : 'bg-blue-50 text-blue-500'}`}>
                          {s.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showMobileSuggestions && searchInput.trim() && mobileSuggestions.length === 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-brand-border shadow-lg z-50 px-3 py-4 text-center">
                  <p className="text-[12px] text-brand-muted">No suggestions found</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!locationInput.trim() || !searchInput.trim()) {
                  setMobileNotification('Please fill both location and search field.');
                  setTimeout(() => setMobileNotification(''), 3000);
                  return;
                }
                setIsMobileMenuOpen(false);
                const params = new URLSearchParams();
                params.set('location', locationInput.trim());
                params.set('q', searchInput.trim());
                router.push(`/search?${params.toString()}`);
              }}
              className="w-full bg-[#EA580C] hover:bg-[#D84A06] text-white py-3 rounded-xl font-bold text-[14px] mt-2 transition-colors shadow-sm active:scale-[0.98]"
            >
              Search
            </button>
          </div>

          <nav className="flex flex-col gap-3 text-[16px] font-bold">
            <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="p-4 rounded-xl text-brand-navy bg-brand-light/50 hover:bg-brand-orange/10 hover:text-brand-orange transition-colors">
              About
            </Link>
            <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className="p-4 rounded-xl text-brand-navy bg-brand-light/50 hover:bg-brand-orange/10 hover:text-brand-orange transition-colors">
              Contact
            </Link>
            {!loading && user?.role === 'USER' && (
              <Link href="/user/dashboard/wishlist" onClick={() => setIsMobileMenuOpen(false)} className={`relative flex items-center gap-3 p-4 rounded-xl text-brand-navy bg-brand-light/50 hover:bg-brand-orange/10 hover:text-brand-orange transition-colors ${pathname === '/user/dashboard/wishlist' ? 'bg-brand-orange/10 text-brand-orange' : ''}`}>
                <span className="relative">
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-orange px-1 text-[9px] font-bold text-white leading-none">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </span>
                Wishlist
              </Link>
            )}
          </nav>
        </div>

        <div className="p-6 border-t border-brand-border/50">
          {!loading && (
            <>
              {!user ? (
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center w-full py-4 rounded-xl border-2 border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white transition-colors font-bold text-[16px]">
                  Login/Signup
                </Link>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setIsMobileProfileOpen(!isMobileProfileOpen)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-brand-light border border-brand-border cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center text-[16px] font-bold shrink-0">
                      {userInitial}
                    </div>

                    <ChevronDown className={`w-4 h-4 text-brand-muted transition-transform ${isMobileProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isMobileProfileOpen && (
                    <div className="flex flex-col gap-1 pl-3">
                      <Link
                        href={getDashboardRoute(user.role)}
                        onClick={() => { setIsMobileProfileOpen(false); setIsMobileMenuOpen(false); }}
                        className="flex items-center gap-3 p-3 rounded-xl text-[14px] font-semibold text-brand-navy hover:bg-brand-orange/10 hover:text-brand-orange transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-[14px] font-semibold text-red-500 hover:bg-red-50 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
