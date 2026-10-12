import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SocketProvider } from "./context/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./views/Login";
import Signup from "./views/Signup";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardPlaceholder from "./views/DashboardPlaceholder";
import UserDashboard from "./views/user/UserDashboard";
import UserExplore from "./views/user/UserExplore";
import UserBusinessDetails from "./views/user/UserBusinessDetails";
import UserWishlist from "./views/user/UserWishlist";
import UserProfile from "./views/user/UserProfile";
import UserChat from "./views/user/UserChat";
import VendorDashboard from "./views/vendor/VendorDashboard";
import VendorBusinesses from "./views/vendor/VendorBusinesses";
import VendorBusinessForm from "./views/vendor/VendorBusinessForm";
import VendorPending from "./views/vendor/VendorPending";
import VendorProfile from "./views/vendor/VendorProfile";
import VendorReviews from "./views/vendor/VendorReviews";
import VendorChat from "./views/vendor/VendorChat";
import VendorFraudReports from "./views/vendor/VendorFraudReports";
import AdminDashboard from "./views/admin/AdminDashboard";
import AdminUsers from "./views/admin/AdminUsers";
import AdminVendors from "./views/admin/AdminVendors";
import AdminBusinesses from "./views/admin/AdminBusinesses";
import AdminBusinessEditPage from "./views/admin/AdminBusinessEditPage";
import AdminUserEditPage from "./views/admin/AdminUserEditPage";
import AdminApprovals from "./views/admin/AdminApprovals";
import AdminCategories from "./views/admin/AdminCategories";
import AdminResellerApplications from "./views/admin/AdminResellerApplications";
import AdminSettings from "./views/admin/AdminSettings";
import AdminReviews from "./views/admin/AdminReviews";
import AdminChat from "./views/admin/AdminChat";
import VendorPackage from "./views/vendor/VendorPackage";
import UserPackage from "./views/user/UserPackage";

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/vendor/pending"
            element={
              <ProtectedRoute allowedRoles={["VENDOR"]}>
                <VendorPending />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendor/businesses/new"
            element={
              <ProtectedRoute allowedRoles={["VENDOR"]}>
                <DashboardLayout>
                  <VendorBusinessForm />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendor/businesses/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["VENDOR"]}>
                <DashboardLayout>
                  <VendorBusinessForm />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendor"
            element={
              <ProtectedRoute allowedRoles={["VENDOR"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<VendorDashboard />} />
            <Route path="businesses" element={<VendorBusinesses />} />
            <Route path="reviews" element={<VendorReviews />} />
            <Route path="fraud-reports" element={<VendorFraudReports />} />
            <Route path="chat" element={<VendorChat />} />
            <Route path="package" element={<VendorPackage />} />
            <Route path="profile" element={<VendorProfile />} />
          </Route>

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="businesses" element={<AdminBusinesses />} />
            <Route path="businesses/:id/edit" element={<AdminBusinessEditPage />} />
            <Route path="users/:id/edit" element={<AdminUserEditPage />} />
            <Route path="approvals" element={<Navigate to="/admin/businesses" replace />} />
            <Route path="reseller-applications" element={<AdminResellerApplications />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="chat" element={<AdminChat />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
