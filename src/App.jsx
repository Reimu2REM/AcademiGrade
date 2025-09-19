import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import supabase from "./config/supabaseclient";
import logo from "./assets/LOGO.png";



// Pages for Teachers
import Dashboard from "./dashboard";
import Records from "./records";
import Signup from "./signup";
import ProtectedRoute from "./ProtectedRoute";
import Login from "./Login";
import SectionGrading from "./SectionGrading"

// Admin Layout + Feature Pages
import Admin from "./Admin";                
import AdminTeachers from "./pages/AdminTeachers";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminGrades from "./pages/AdminGrades";


// ✅ Supabase Admin Email
const ADMIN_EMAIL = "admin@mwcis.ph";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);

    // ⏳ Add delay so logo shows longer
    setTimeout(() => {
      setLoading(false);
    }, 2500); // show at least 2.5 seconds
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  return () => listener.subscription.unsubscribe();
}, []);


  if (loading) {
  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <img
        src={logo}
        alt="Loading..."
        className="w-80 h-80 animate-bounce "

      />
    </div>
  );
}




  if (!session) return <Login />;

  const user = session.user;

  // ✅ Admin Routes
  if (user.email === ADMIN_EMAIL) {
    return (
      <Router>
        <Routes>
          <Route path="/admin" element={<Admin />}>
            <Route path="teachers" element={<AdminTeachers />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="grades" element={<AdminGrades />} />
            {/* Default redirect when visiting /admin */}
            <Route index element={<Navigate to="teachers" replace />} />
          </Route>

          {/* Redirect root / to /admin for admins */}
          <Route path="/" element={<Navigate to="/admin/teachers" replace />} />
        </Routes>
      </Router>

    );
  }

  // ✅ Teacher Routes
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/records"
          element={
            <ProtectedRoute>
              <Records />
            </ProtectedRoute>
          }
        />
        <Route
          path="/SectionGrading"
          element={
            <ProtectedRoute>
              <SectionGrading />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        

      </Routes>
    </Router>
  );
}

export default App;
