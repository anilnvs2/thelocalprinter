'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import PageHero from '@/components/common/PageHero';
import UserBusinessCard from '@/components/user/UserBusinessCard';
import PosterBoyCard from '@/components/user/PosterBoyCard';
import { ChevronRight } from 'lucide-react';
import { getActiveCategories, getPublicPosterBoys } from '@/services/userService';
import { getSavedCity, onSavedLocationChange } from '@/lib/savedLocation';
import { mergeCategories } from '@/data/vendorCategories';
import { businessHref } from '@/lib/utils';
import api from '@/services/api';

export default function SubCategoryPage({ params }) {
  const { slug, subCategorySlug } = use(params);
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bizLoading, setBizLoading] = useState(true);
  const [savedCity, setSavedCity] = useState('');

  useEffect(() => {
    getActiveCategories()
      .then((res) => setCategories(mergeCategories(res.data?.categories || [])))
      .catch(() => setCategories(mergeCategories([])))
      .finally(() => setLoading(false));
  }, []);

  const parentCategory = categories.find((c) => c.slug === slug);
  const subCategory = parentCategory?.services?.find((s) => s.slug === subCategorySlug);
  // Staffing parents (e.g. "Poster Boy") list people filtered by skill.
  const isStaffing = parentCategory?.kind === 'staffing';
  const [posterBoys, setPosterBoys] = useState([]);

  // Listings follow the saved location (auto-detected or typed by the visitor)
  // and refetch whenever it changes.
  useEffect(() => {
    setSavedCity(getSavedCity());
    return onSavedLocationChange(({ city }) => setSavedCity(city));
  }, []);

  useEffect(() => {
    if (!subCategory || !parentCategory) return;
    setBizLoading(true);
    if (isStaffing) {
      setBusinesses([]);
      const params = { limit: 12, serviceId: subCategory._id };
      if (savedCity) params.city = savedCity;
      getPublicPosterBoys(params)
        .then((res) => setPosterBoys(res.data?.posterBoys || []))
        .catch(() => setPosterBoys([]))
        .finally(() => setBizLoading(false));
      return;
    }
    setPosterBoys([]);
    // Match businesses that actually selected this subcategory (serviceIds
    // stores the same id the vendor form writes — real DB id or the static
    // pseudo-id for the 9 core categories), plus the saved location.
    const params = { limit: 12, serviceId: subCategory._id };
    if (savedCity) params.city = savedCity;
    api.get(`/user/public/businesses`, { params })
      .then((res) => setBusinesses(res.data?.data?.businesses || []))
      .catch(() => setBusinesses([]))
      .finally(() => setBizLoading(false));
  }, [subCategory?._id, parentCategory?._id, parentCategory?.name, isStaffing, savedCity]);

  if (!loading && !parentCategory) {
    return (
      <div className="bg-brand-light min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-[28px] font-extrabold text-brand-navy mb-4">Category Not Found</h1>
          <Link href="/" className="text-brand-orange font-bold hover:underline">Browse All Categories</Link>
        </div>
      </div>
    );
  }

  if (!loading && parentCategory && !subCategory) {
    return (
      <div className="bg-brand-light min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-[28px] font-extrabold text-brand-navy mb-4">Subcategory Not Found</h1>
          <Link href={`/categories/${slug}`} className="text-brand-orange font-bold hover:underline">Back to {parentCategory.name}</Link>
        </div>
      </div>
    );
  }

  const subcategoryName = subCategory?.name || decodeURIComponent(subCategorySlug).replace(/-/g, ' ');
  const categoryName = parentCategory?.name || decodeURIComponent(slug).replace(/-/g, ' ');

  return (
    <div className="bg-brand-light min-h-screen">
      <PageHero
        badge="BROWSE BY SUBCATEGORY"
        title={subcategoryName}
        subtitle={`Find the best ${subcategoryName.toLowerCase()} services near you.`}
      />
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-16">
        <nav className="flex items-center gap-2 text-[14px] text-brand-muted mb-8">
          <Link href="/" className="hover:text-brand-orange transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/categories/${slug}`} className="hover:text-brand-orange transition-colors">{categoryName}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-brand-navy font-semibold">{subcategoryName}</span>
        </nav>

        <h2 className="text-[24px] font-extrabold text-brand-navy mb-6">
          {bizLoading
            ? 'Loading...'
            : isStaffing
              ? `${subcategoryName} Poster Boys (${posterBoys.length})${savedCity ? ` in ${savedCity}` : ''}`
              : `${subcategoryName} Businesses (${businesses.length})${savedCity ? ` in ${savedCity}` : ''}`}
        </h2>
        {bizLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-brand-border h-[280px] animate-pulse" />
            ))}
          </div>
        ) : (isStaffing ? posterBoys.length > 0 : businesses.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isStaffing
              ? posterBoys.map((pb) => <PosterBoyCard key={pb._id} posterBoy={pb} detailHref={`/poster-boys/${pb._id}`} />)
              : businesses.map((biz) => <UserBusinessCard key={biz._id} business={biz} detailHref={businessHref(biz)} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-brand-border shadow-sm">
            <img src="/data-not-found.png" alt="No Data Found" className="mb-4 h-48 w-48 object-contain" />
            <h3 className="mb-1 text-base font-semibold text-brand-navy">No Data Found in Database</h3>
            <p className="max-w-xs text-sm text-brand-muted">
              {isStaffing
                ? savedCity
                  ? `No approved ${subcategoryName} available in ${savedCity}. Change your location from the search bar above.`
                  : `No approved ${subcategoryName} available yet. Check back soon!`
                : savedCity
                  ? `No approved businesses yet for ${subcategoryName} in ${savedCity}. Change your location from the search bar above.`
                  : `No approved businesses yet for ${subcategoryName}. Check back soon!`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
