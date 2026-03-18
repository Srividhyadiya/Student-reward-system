// Removed duplicate React import
import { Routes, Route, useNavigate } from "react-router-dom";
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import TeacherManager from "./admin/TeacherManager";
import TeacherTimetable from "./admin/TeacherTimetable";
import StudentManagement from "./admin/StudentManagement";
import StudentLogin from "./student/StudentLogin";
import HomePage from "./student/HomePage";
import TeacherLogin from "./teacher/TeacherLogin";
import TeacherProfile from "./teacher/TeacherProfile";
import Attendance from "./teacher/Attendance";
import AddMarks from "./teacher/AddMarks";
import AssetsPreview from "./AssetsPreview";
import CanteenPage from "./canteen/CanteenPage";
import CanteenLogin from "./canteen/CanteenLogin";
import LibrarianLogin from "./library/LibrarianLogin";
import LibraryDashboard from "./library/LibraryDashboard";
import StationaryLogin from "./stationary/StationaryLogin";
import StationaryPage from "./stationary/StationaryPage";
import AddBooks from "./library/AddBooks";
import IssueBook from "./library/IssueBook";
import DueList from "./library/DueList";
import ReturnedList from "./library/ReturnedList";
import IssuedStudents from "./library/IssuedStudents";
import CoursePage from "./student/CoursePage";

const App = () => {
  const navigate = useNavigate();


  const handleDropdownChange = (e) => {
    const value = e.target.value;
    if (value) {
      navigate(value);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      {/* debug banner removed */}
      <div className="mb-8">
        <label htmlFor="userType" className="block mb-2 font-medium">Select User Type</label>
        <select
          id="userType"
          name="userType"
          className="p-2 border rounded"
          defaultValue=""
          onChange={handleDropdownChange}
          title="User Type Dropdown"
        >
          <option value="" disabled>
            Select User Type
          </option>
          <option value="/admin/login">Admin</option>
          <option value="/teacher/login">Teacher</option>
          <option value="/stationary/login">Stationary</option>
          <option value="/student/login">Student</option>
          <option value="/canteen/login">Canteen</option>
          <option value="/library/login">Librarian</option>
        </select>
      </div>
      <Routes>
        <Route path="/" element={<StudentLogin />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
  <Route path="/teacher/:id" element={<TeacherProfile />} />
  <Route path="/teacher/:id/attendance" element={<Attendance />} />
  <Route path="/teacher/:id/marks" element={<AddMarks />} />
  <Route path="/student" element={<HomePage />} />
  <Route path="/assets" element={<AssetsPreview />} />
  <Route path="/canteen/login" element={<CanteenLogin />} />
  <Route path="/canteen" element={<CanteenPage />} />
  <Route path="/library/login" element={<LibrarianLogin />} />
  <Route path="/library" element={<LibraryDashboard />} />
  <Route path="/stationary/login" element={<StationaryLogin />} />
  <Route path="/stationary" element={<StationaryPage />} />
  <Route path="/library/add-books" element={<AddBooks />} />
  <Route path="/library/issue-book" element={<IssueBook />} />
  <Route path="/library/issued-students" element={<IssuedStudents />} />
  <Route path="/library/due-list" element={<DueList />} />
  <Route path="/library/returned-list" element={<ReturnedList />} />
  <Route path="/courses" element={<CoursePage />} />
 
        <Route path="/admin/login" element={<AdminLogin />} />
  <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/teacher-management" element={<TeacherManager />} />
        <Route path="/admin/teacher/:id/timetable" element={<TeacherTimetable />} />
 

 
  

  <Route path="/admin/student-management" element={<StudentManagement />} />

        

    {/* /admin/main renders the admin Dashboard (main admin UI) */}
    <Route path="/admin/main" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
};

export default App;
