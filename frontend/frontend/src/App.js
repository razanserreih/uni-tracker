import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";               // ← add this
import AdminDashboard from "./pages/AdminDashboard";
import ManageCourses from "./pages/ManageCourses";
import ManageStudents from "./pages/ManageStudents";
import ManageGrades from "./pages/ManageGrades";
import ManageAttendance from "./pages/ManageAttendance";
import ManageOfferings from "./pages/ManageOfferings";
import ManageLectures from "./pages/ManageLectures";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* default route goes to /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* login */}
        <Route path="/login" element={<LoginPage />} />

        {/* admin + management pages */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/manage-courses" element={<ManageCourses />} />
        <Route path="/manage-students" element={<ManageStudents />} />
        <Route path="/attendance" element={<ManageAttendance />} />
        <Route path="/grades" element={<ManageGrades />} />
        <Route path="/manage-offerings" element={<ManageOfferings />} />
        <Route path="/manage-lectures" element={<ManageLectures />} />

        {/* catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
