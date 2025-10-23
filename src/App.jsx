// App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import supabase from "./config/supabaseclient";
import 'primeicons/primeicons.css';
import './App.css';

// Auth Pages
import Login from "./Login";
import Signup from "./signup";

// Teacher Pages
import Dashboard from "./dashboard";
import Records from "./records";
import SectionGrading from "./SectionGrading";
import Students from "./students";
import SubjectGrade from "./subjectgrade";
import Gradebook from "./gradebook";

// Admin Pages
import Admin from "./Admin";
import AdminTeachers from "./pages/AdminTeachers";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminGrades from "./pages/AdminGrades";
import AdminDashboard from "./AdminDashboard";

// Power User Pages
import PowerUserLogin from "./pages/PowerUserLogin";
import PowerUserDashboard from "./pages/PowerUserDashboard";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null); // Supabase session
  const [role, setRole] = useState(null); // "admin" or "teacher"
  const [powerUser, setPowerUser] = useState(null); // Power User (local)

  useEffect(() => {
    const checkPowerUser = () => {
      const storedPowerUser = localStorage.getItem("powerUser");
      if (storedPowerUser) setPowerUser(JSON.parse(storedPowerUser));
    };

    const checkSupabaseSession = async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const activeSession = sessionData?.session;
        setSession(activeSession);

        // If no session, skip role check
        if (!activeSession) {
          setLoading(false);
          return;
        }

        // Try fetching user, but catch errors to prevent crash
        let auth_id = null;
        try {
          const { data: userData } = await supabase.auth.getUser();
          auth_id = userData?.user?.id;
        } catch {
          console.warn("Supabase user not found, skipping role check.");
        }

        // If we have auth_id, check role tables
        if (auth_id) {
          const { data: adminData } = await supabase
            .from("admins")
            .select("id")
            .eq("auth_id", auth_id)
            .maybeSingle();
          if (adminData) {
            setRole("admin");
            setLoading(false);
            return;
          }

          const { data: teacherData } = await supabase
            .from("teachers")
            .select("id")
            .eq("auth_id", auth_id)
            .maybeSingle();
          if (teacherData) {
            setRole("teacher");
            setLoading(false);
            return;
          }
        }

        // Not found or error, clear session
        setSession(null);
        setRole(null);
        setLoading(false);
      } catch (err) {
        console.error("Session check error:", err.message);
        setSession(null);
        setRole(null);
        setLoading(false);
      }
    };

    checkPowerUser();
    checkSupabaseSession();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkSupabaseSession();
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const handlePowerUserLogin = (userData) => {
    setPowerUser(userData);
    localStorage.setItem("powerUser", JSON.stringify(userData));
  };

  const handlePowerUserLogout = () => {
    setPowerUser(null);
    localStorage.removeItem("powerUser");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-700 bg-white text-lg font-medium">
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* POWER USER */}
        <Route
          path="/super-access"
          element={!powerUser ? <PowerUserLogin onLogin={handlePowerUserLogin} /> : <Navigate to="/poweruser/dashboard" replace />}
        />
        <Route
          path="/poweruser/dashboard"
          element={powerUser ? <PowerUserDashboard powerUser={powerUser} onLogout={handlePowerUserLogout} /> : <Navigate to="/super-access" replace />}
        />

        {/* AUTH ROUTES */}
        {!session && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}

        {/* ADMIN ROUTES */}
        {session && role === "admin" && (
          <>
            <Route path="/admin" element={<Admin />}>
              <Route path="teachers" element={<AdminTeachers />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="grades" element={<AdminGrades />} />
              <Route index element={<Navigate to="teachers" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/admin/teachers" replace />} />
            <Route path="AdminDashboard" element={<AdminDashboard />} />
          </>
        )}

        {/* TEACHER ROUTES */}
        {session && role === "teacher" && (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/records" element={<Records />} />
            <Route path="/sectiongrading" element={<SectionGrading />} />
            <Route path="/students/:section_id" element={<Students />} />
            <Route path="/subjectgrade/:section_id" element={<SubjectGrade />} />
            <Route path="/gradebook/:section_id" element={<Gradebook />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            
          </>
        )}

        {/* Fallback for any unknown session */}
        {!role && session && <Route path="*" element={<Navigate to="/login" replace />} />}
      </Routes>
    </Router>
  );
}
