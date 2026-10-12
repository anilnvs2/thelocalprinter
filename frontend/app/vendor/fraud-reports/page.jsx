import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/layouts/DashboardLayout";
import VendorFraudReports from "@/views/vendor/VendorFraudReports";
export const dynamic = "force-dynamic";

export default function VendorFraudReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["VENDOR"]}>
      <DashboardLayout>
        <VendorFraudReports />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
