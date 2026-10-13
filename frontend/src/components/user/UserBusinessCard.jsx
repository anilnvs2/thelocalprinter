"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Heart,
  Loader2,
  Star,
  Navigation,
  ArrowRight,
  User as UserIcon,
  BadgeCheck,
  Award,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import CopyableId from "../admin/CopyableId";
import WatermarkLogo from "../media/WatermarkLogo";

const SERVICE_TYPE_LABELS = {
  print_only: "Print Only",
  full_with_design: "Design + Print",
  full_without_design: "Print (No Design)",
};

const ORDER_LIMIT_LABELS = {
  single: "Single Order",
  minimum: "Minimum Order",
  bulk: "Bulk Orders",
  no_limit: "No Limit",
};

const ORDERING_METHOD_LABELS = {
  on_call: "On Call",
  shop_visit: "Shop Visit",
  both: "On Call and Shop Visit",
};

const CUSTOMER_TYPE_LABELS = {
  b2b: "B2B",
  b2c: "B2C",
  both: "B2B and B2C",
};

/**
 * USER-only business card. Shows only user-permitted data:
 * outdoor/indoor store images (never videos/thumbnails), never GST.
 */
const UserBusinessCard = ({
  business: b,
  detailHref,
  showWishlist = false,
  wishlisted = false,
  togglingWishlist = false,
  onToggleWishlist,
}) => {
  const router = useRouter();
  if (!b) return null;

  const image =
    b.verificationMedia?.outdoorStoreImage ||
    b.verificationMedia?.indoorStoreImage ||
    "";
  const services = Array.isArray(b.serviceIds) ? b.serviceIds : [];
  const rating = b.ratingSummary?.averageRating || 0;
  const reviewCount = b.ratingSummary?.reviewCount || 0;
  const isGpsVerified = !!(
    b.gpsCoordinates &&
    b.gpsCoordinates.lat !== null &&
    b.gpsCoordinates.lat !== "" &&
    b.gpsCoordinates.lng !== null &&
    b.gpsCoordinates.lng !== "" &&
    Number.isFinite(Number(b.gpsCoordinates.lat)) &&
    Number.isFinite(Number(b.gpsCoordinates.lng))
  );

  // Optional, admin-managed Brand Recall / Trust Score (0-10). No score = no badge.
  const trustScore =
    b.brandRecallScore === null ||
    b.brandRecallScore === undefined ||
    b.brandRecallScore === ""
      ? NaN
      : Number(b.brandRecallScore);
  const hasTrustScore = Number.isFinite(trustScore);

  const goToProfile = () => {
    if (detailHref) router.push(detailHref);
  };

  const directionsHref = isGpsVerified
    ? `https://www.google.com/maps/dir/?api=1&destination=${Number(b.gpsCoordinates.lat)},${Number(b.gpsCoordinates.lng)}`
    : "";

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden flex flex-col"
      onClick={goToProfile}
    >
      <div className="h-40 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-950/30 flex items-center justify-center text-primary relative overflow-hidden shrink-0">
        {image ? (
          <img
            src={image}
            alt={b.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Building2 size={36} />
        )}
        {image && <WatermarkLogo position="bottom-right" size="sm" />}
        {(isGpsVerified || reviewCount > 0 || hasTrustScore) && (
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1.5">
            {isGpsVerified && (
              <span className="inline-flex items-center gap-1 bg-emerald-600/95 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full backdrop-blur-sm shadow-sm">
                <BadgeCheck size={12} className="shrink-0" />
                GPS Verified
              </span>
            )}
            {hasTrustScore && (
              <span
                title="Trust Score assigned by the admin"
                className="inline-flex items-center gap-1 bg-amber-500/95 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full backdrop-blur-sm shadow-sm whitespace-nowrap"
              >
                <Award size={12} className="shrink-0" />
                Trust Score {trustScore}/10
              </span>
            )}
            {reviewCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-black/65 text-white text-[11px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                {rating.toFixed(1)} ({reviewCount})
              </span>
            )}
          </div>
        )}
        {showWishlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist?.(e, b._id);
            }}
            disabled={togglingWishlist}
            aria-label="Toggle wishlist"
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-background/90 flex items-center justify-center backdrop-blur-sm transition-colors hover:bg-white dark:hover:bg-background"
          >
            {togglingWishlist ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Heart
                size={14}
                className={
                  wishlisted
                    ? "text-red-500 fill-red-500"
                    : "text-muted-foreground"
                }
              />
            )}
          </button>
        )}
      </div>

      <CardContent className="p-4 flex flex-col gap-1.5 flex-1">
        {b.distance != null && (
          <span className="inline-flex items-center gap-1 self-start text-[11px] font-bold text-primary">
            <Navigation size={12} className="shrink-0" />
            {b.distance} km away
          </span>
        )}

        <h3 className="text-sm font-bold text-foreground truncate">{b.name}</h3>

        {b.vendor?.publicId && (
          <div
            className="flex items-center gap-1.5 min-w-0 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-muted-foreground shrink-0">Vendor ID:</span>
            <CopyableId id={b.vendor.publicId} />
          </div>
        )}

        {b.contactName && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <UserIcon size={12} className="shrink-0" />
            <span className="truncate">{b.contactName}</span>
          </p>
        )}

        {b.category && (
          <div className="flex items-center gap-1.5">
            {b.categoryId?.image &&
              (b.categoryId.image.trim().startsWith("<") ? (
                <div
                  className="h-4 w-4 shrink-0 [&>svg]:w-4 [&>svg]:h-4"
                  dangerouslySetInnerHTML={{ __html: b.categoryId.image }}
                />
              ) : (
                <img
                  src={b.categoryId.image}
                  alt=""
                  className="h-4 w-4 shrink-0 object-contain"
                />
              ))}
            <Badge variant="secondary" className="text-[10px]">
              {b.category}
            </Badge>
          </div>
        )}

        {services.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {services.slice(0, 3).map((service) => (
              <Badge
                key={service._id || service.name || service}
                variant="outline"
                className="text-[9px]"
              >
                {service.name || service}
              </Badge>
            ))}
            {services.length > 3 && (
              <Badge variant="outline" className="text-[9px]">
                +{services.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {(b.city || b.address) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={12} className="shrink-0" />
            {directionsHref ? (
              <a
                href={directionsHref}
                target="_blank"
                rel="noopener noreferrer"
                title="Get directions"
                onClick={(e) => e.stopPropagation()}
                className="truncate hover:text-primary hover:underline underline-offset-2"
              >
                {b.city}
                {b.address ? `, ${b.address}` : ""}
              </a>
            ) : (
              <span className="truncate">
                {b.city}
                {b.address ? `, ${b.address}` : ""}
              </span>
            )}
          </p>
        )}

        {(b.serviceType || b.customerType || b.orderingMethod || b.orderLimits) && (
          <div className="flex flex-wrap gap-1">
            {b.serviceType && SERVICE_TYPE_LABELS[b.serviceType] && (
              <Badge variant="outline" className="text-[10px]">
                {SERVICE_TYPE_LABELS[b.serviceType]}
              </Badge>
            )}
            {b.customerType && CUSTOMER_TYPE_LABELS[b.customerType] && (
              <Badge variant="outline" className="text-[10px]">
                {CUSTOMER_TYPE_LABELS[b.customerType]}
              </Badge>
            )}
            {b.orderingMethod && ORDERING_METHOD_LABELS[b.orderingMethod] && (
              <Badge variant="outline" className="text-[10px]">
                {ORDERING_METHOD_LABELS[b.orderingMethod]}
              </Badge>
            )}
            {b.orderLimits && ORDER_LIMIT_LABELS[b.orderLimits] && (
              <Badge variant="outline" className="text-[10px]">
                {ORDER_LIMIT_LABELS[b.orderLimits]}
              </Badge>
            )}
          </div>
        )}

        {b.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {b.description}
          </p>
        )}

        <div className="pt-1 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1 text-xs font-semibold hover:text-primary hover:border-primary/40"
            onClick={(e) => {
              e.stopPropagation();
              goToProfile();
            }}
          >
            View Full Profile <ArrowRight size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserBusinessCard;
