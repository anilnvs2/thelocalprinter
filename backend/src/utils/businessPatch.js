// Applies vendor submitted business data onto a target object.
// Only fields present in `data` are written, so partial payloads keep old values.
const applyBusinessPatch = (target, data) => {
  if (!data || typeof data !== "object") return target;

  // Section 1
  if (data.name !== undefined) target.name = typeof data.name === "string" ? data.name.trim() : data.name;
  if (data.description !== undefined) target.description = data.description;
  if (data.establishedYear !== undefined) target.establishedYear = data.establishedYear;
  if (data.workingHours !== undefined) target.workingHours = data.workingHours;

  // Section 2
  if (data.contactName !== undefined) target.contactName = data.contactName;
  if (data.phone !== undefined) target.phone = data.phone;
  if (data.whatsapp !== undefined) target.whatsapp = data.whatsapp;
  if (data.contactEmail !== undefined) target.contactEmail = data.contactEmail;
  if (data.website !== undefined) target.website = data.website;

  // Section 3
  if (data.category !== undefined) target.category = data.category;
  if (data.categoryId !== undefined) target.categoryId = data.categoryId;
  if (data.serviceIds !== undefined) target.serviceIds = data.serviceIds;
  if (data.tags !== undefined) target.tags = data.tags;
  if (data.address !== undefined) target.address = data.address;
  if (data.city !== undefined) target.city = data.city;
  if (data.gpsCoordinates !== undefined) target.gpsCoordinates = data.gpsCoordinates;
  if (data.googleBusinessProfileLink !== undefined) target.googleBusinessProfileLink = data.googleBusinessProfileLink;

  // Section 4
  if (data.gstAvailable !== undefined) target.gstAvailable = data.gstAvailable;
  if (data.gstNumber !== undefined) target.gstNumber = data.gstNumber;

  // Section 5
  if (data.orderLimits !== undefined) target.orderLimits = data.orderLimits;

  // Section 6
  if (data.serviceType !== undefined) target.serviceType = data.serviceType;

  // Section 7
  if (data.customerType !== undefined) target.customerType = data.customerType;

  // Section 8
  if (data.orderingMethod !== undefined) target.orderingMethod = data.orderingMethod;

  // Section 9
  if (data.paymentModes !== undefined) target.paymentModes = data.paymentModes;

  // Section 10
  if (data.socialMedia !== undefined) target.socialMedia = data.socialMedia;

  // Section 11
  if (data.verificationMedia !== undefined) target.verificationMedia = data.verificationMedia;

  // Section 12
  if (data.languages !== undefined) target.languages = data.languages;

  // Section 13
  if (data.returnReplacementPolicy !== undefined) target.returnReplacementPolicy = data.returnReplacementPolicy;
  if (data.replaceMistakesAtNoCharge !== undefined) target.replaceMistakesAtNoCharge = data.replaceMistakesAtNoCharge;
  if (data.inHouseDesignerAvailable !== undefined) target.inHouseDesignerAvailable = data.inHouseDesignerAvailable;
  if (data.customerLocationVisitAvailable !== undefined) target.customerLocationVisitAvailable = data.customerLocationVisitAvailable;
  if (data.addonServices !== undefined) target.addonServices = data.addonServices;

  // Section 14
  if (data.sampleDisplayAvailable !== undefined) target.sampleDisplayAvailable = data.sampleDisplayAvailable;
  if (data.preferredFileFormats !== undefined) target.preferredFileFormats = data.preferredFileFormats;

  // Section 15
  if (data.acceptsPurchaseOrder !== undefined) target.acceptsPurchaseOrder = data.acceptsPurchaseOrder;

  // Section 16
  if (data.fraudReport !== undefined) target.fraudReport = data.fraudReport;

  return target;
};

module.exports = { applyBusinessPatch };
