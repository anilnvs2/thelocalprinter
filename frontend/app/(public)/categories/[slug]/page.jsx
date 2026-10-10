'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import UserBusinessCard from '@/components/user/UserBusinessCard';
import PosterBoyCard from '@/components/user/PosterBoyCard';
import { ChevronRight, Layers, Store, Search, Sun, Moon } from 'lucide-react';
import { getActiveCategories, getPublicPosterBoys } from '@/services/userService';
import { getSavedCity, onSavedLocationChange } from '@/lib/savedLocation';
import { mergeCategories } from '@/data/vendorCategories';
import api from '@/services/api';

export default function CategoryPage({ params }) {
  const { slug } = use(params);
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bizLoading, setBizLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [savedCity, setSavedCity] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('lp-theme');
    if (saved === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const isDark = theme === 'dark';

  useEffect(() => {
    getActiveCategories()
      .then((res) => setCategories(mergeCategories(res.data?.categories || [])))
      .catch(() => setCategories(mergeCategories([])))
      .finally(() => setLoading(false));
  }, []);

  const parentCategory = categories.find((c) => c.slug === slug);
  // Staffing categories (e.g. "Poster Boy") list people, not businesses.
  const isStaffing = parentCategory?.kind === 'staffing';
  const [posterBoys, setPosterBoys] = useState([]);

  // Listings follow the saved location (auto-detected or typed by the visitor)
  // and refetch whenever it changes.
  useEffect(() => {
    setSavedCity(getSavedCity());
    return onSavedLocationChange(({ city }) => setSavedCity(city));
  }, []);

  useEffect(() => {
    if (!parentCategory?._id) return;
    setBizLoading(true);
    if (isStaffing) {
      setBusinesses([]);
      const params = { limit: 12, categoryId: parentCategory._id };
      if (savedCity) params.city = savedCity;
      getPublicPosterBoys(params)
        .then((res) => setPosterBoys(res.data?.posterBoys || []))
        .catch(() => setPosterBoys([]))
        .finally(() => setBizLoading(false));
      return;
    }
    setPosterBoys([]);
    const params = { limit: 12 };
    if (parentCategory.isStatic) {
      // No DB document for this category: match businesses by the stored
      // category name string instead of a categoryId reference.
      params.category = parentCategory.name;
    } else {
      params.categoryId = parentCategory._id;
    }
    if (savedCity) params.city = savedCity;
    api.get(`/user/public/businesses`, { params })
      .then((res) => setBusinesses(res.data?.data?.businesses || []))
      .catch(() => setBusinesses([]))
      .finally(() => setBizLoading(false));
  }, [parentCategory?._id, parentCategory?.isStatic, parentCategory?.name, isStaffing, savedCity]);

  if (!loading && !parentCategory) {
    return (
      <div className={`${isDark ? 'bg-gray-950' : 'bg-brand-light'} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <div className={`mb-6 mx-auto w-20 h-20 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-brand-orange/10'}`}>
            <Search className="w-8 h-8 text-brand-orange" />
          </div>
          <h1 className={`text-[28px] font-extrabold mb-3 ${isDark ? 'text-gray-100' : 'text-brand-navy'}`}>Category Not Found</h1>
          <p className={`text-[15px] mb-6 ${isDark ? 'text-gray-400' : 'text-brand-muted'}`}>The category you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-orange text-white rounded-full text-[14px] font-bold hover:bg-brand-orange-light transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const categoryName = parentCategory?.name || decodeURIComponent(slug).replace(/-/g, ' ');
  const subcategories = parentCategory?.services || [];
  const description = parentCategory?.description || '';
  const categoryImage = parentCategory?.image || '';
  const hasImage = categoryImage && categoryImage.trim().length > 0;

  return (
    <div className={`${isDark ? 'bg-gray-950' : 'bg-brand-light'} min-h-screen`}>
      {/* Hero Section */}
      <div className={`relative overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-brand-navy via-[#1B3654] to-[#112338]'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,81,22,0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(244,81,22,0.05)_0%,transparent_50%)]" />

        <div className="max-w-screen-xl mx-auto px-4 md:px-6 pt-8 pb-12 md:pt-12 md:pb-16 relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[13px] text-white/50 mb-8">
            <Link href="/" className="hover:text-white/80 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white/90 font-medium">Categories</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-brand-orange font-semibold">{categoryName}</span>
          </nav>

          {/* Main hero content */}
          <div className="flex flex-col md:flex-row items-start gap-8 md:items-center">
            {/* Text content */}
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-orange/15 border border-brand-orange/20 text-brand-orange text-[11px] font-bold tracking-widest uppercase mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                  CATEGORY
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-[28px] sm:text-[34px] md:text-[40px] font-extrabold text-white leading-tight mb-4 tracking-tight"
              >
                {categoryName}
              </motion.h1>

              {description && (
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-[15px] text-white/60 leading-relaxed mb-6 max-w-xl"
                >
                  {description}
                </motion.p>
              )}

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex items-center gap-6"
              >
                {subcategories.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-brand-orange" />
                    </div>
                    <div>
                      <p className="text-[18px] font-bold text-white leading-none">{subcategories.length}</p>
                      <p className="text-[11px] text-white/40 font-medium mt-0.5">{isStaffing ? 'Skills' : 'Services'}</p>
                    </div>
                  </div>
                )}
                <div className="w-px h-8 bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Store className="w-4 h-4 text-brand-orange" />
                  </div>
                    <div>
                      <p className="text-[18px] font-bold text-white leading-none">{bizLoading ? '...' : (isStaffing ? posterBoys.length : businesses.length)}</p>
                      <p className="text-[11px] text-white/40 font-medium mt-0.5">{isStaffing ? 'Poster Boys' : 'Businesses'}</p>
                    </div>
                </div>
              </motion.div>
            </div>

            {/* Category image */}
            {hasImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="hidden md:flex shrink-0 w-[140px] h-[140px] rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 items-center justify-center p-5"
              >
                {categoryImage.trim().startsWith('<') ? (
                  <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:text-brand-orange" dangerouslySetInnerHTML={{ __html: categoryImage }} />
                ) : (
                  <img src={categoryImage} alt={categoryName} className="w-full h-full object-contain" />
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-10 md:py-14">

        {/* Subcategories Section */}
        {subcategories.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-1 h-6 rounded-full bg-brand-orange`} />
              <h2 className={`text-[20px] font-extrabold ${isDark ? 'text-gray-100' : 'text-brand-navy'}`}>
                {isStaffing ? 'Available Skills' : 'Available Services'}
              </h2>
              <span className={`text-[13px] font-medium px-2.5 py-0.5 rounded-full ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-brand-orange/10 text-brand-orange'}`}>
                {subcategories.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {subcategories.map((sub) => (
                <Link
                  key={sub._id}
                  href={`/categories/${slug}/${sub.slug}`}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold border transition-colors select-none hover:border-brand-orange hover:text-brand-orange ${
                    isDark
                      ? 'bg-gray-900 border-gray-800 text-gray-300'
                      : 'bg-white border-brand-border text-brand-navy shadow-sm'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-brand-orange/60' : 'bg-brand-orange'}`} />
                  {sub.name}
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Businesses Section */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-1 h-6 rounded-full bg-brand-orange`} />
            <h2 className={`text-[20px] font-extrabold ${isDark ? 'text-gray-100' : 'text-brand-navy'}`}>
              {bizLoading
                ? 'Loading...'
                : isStaffing
                  ? `${categoryName} Poster Boys`
                  : `${categoryName} Businesses`}
            </h2>
            {!bizLoading && (
              <span className={`text-[13px] font-medium px-2.5 py-0.5 rounded-full ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-brand-orange/10 text-brand-orange'}`}>
                {isStaffing ? posterBoys.length : businesses.length}
              </span>
            )}
            {!bizLoading && savedCity && (
              <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-slate-100 text-brand-navy'}`}>
                in {savedCity}
              </span>
            )}
          </div>

          {bizLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-brand-border'} rounded-2xl border h-[280px] animate-pulse`} />
              ))}
            </div>
          ) : (isStaffing ? posterBoys.length > 0 : businesses.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isStaffing
                ? posterBoys.map((pb) => <PosterBoyCard key={pb._id} posterBoy={pb} detailHref={`/poster-boys/${pb._id}`} />)
                : businesses.map((biz) => <UserBusinessCard key={biz._id} business={biz} detailHref={`/businesses/${biz._id}`} />)}
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-brand-border'}`}>
              <img src="/data-not-found.png" alt="No Data Found" className="mb-4 h-48 w-48 object-contain" />
              <h3 className={`mb-1 text-base font-semibold ${isDark ? 'text-gray-200' : 'text-brand-navy'}`}>No Data Found in Database</h3>
              <p className="max-w-xs text-sm text-center text-brand-muted">
                {isStaffing
                  ? savedCity
                    ? `No approved ${categoryName} available in ${savedCity} yet. Change your location from the search bar above.`
                    : `No approved ${categoryName} available yet. Check back soon!`
                  : savedCity
                    ? `No businesses found in this category in ${savedCity} yet. Change your location from the search bar above.`
                    : 'No businesses found in this category yet. Check back soon!'}
              </p>
            </div>
          )}
        </motion.section>
      </div>

      {/* Fixed Theme Toggle - bottom right */}
      <button
        onClick={() => {
          const next = isDark ? 'light' : 'dark';
          setTheme(next);
          localStorage.setItem('lp-theme', next);
          if (next === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full shadow-lg border transition-all ${
          isDark
            ? 'bg-gray-800 border-gray-700 text-yellow-400 hover:bg-gray-700 hover:border-gray-600'
            : 'bg-white border-gray-200 text-brand-navy hover:bg-brand-light hover:border-brand-orange/30'
        }`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </div>
  );
}
