import React, { useState } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { useNavigate } from "react-router-dom"; // ✅ Use React Router for navigation
import supabase from "../config/supabaseclient"; // ✅ Ensure path is correct

const AdminNavBar = ({ setVisible }) => {
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error.message);
      return;
    }
    // ✅ Redirect to login page after logout
    navigate("/login");
  };

  return (
    <div className="relative">
      <nav className="bg-Blue2 flex items-center justify-between px-4 py-2 col-span-2">
        {/* Hamburger */}
        <GiHamburgerMenu
          className="text-xl text-white cursor-pointer"
          onClick={() => setVisible(true)}
        />

        {/* Right side: Logout Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowLogout(true)}
            className="bg-yellow2 text-black font-semibold px-3 py-1 rounded hover:bg-yellow-500 hover:text-black"
          >
            Log-out
          </button>
        </div>
      </nav>

      {/* ✅ Logout Confirmation Modal */}
      {showLogout && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="bg-white border p-6 rounded-xl shadow-lg w-80 text-center">
            <h1 className="font-bold mb-4">Do you want to log out?</h1>
            <div className="flex justify-center gap-4 mt-4">
                <button
                onClick={handleLogout}
                className="bg-yellow-400 hover:bg-yellow-600 px-4 py-2 rounded font-medium"
                >
                Yes
                </button>
                <button
                onClick={() => setShowLogout(false)}
                className="border px-4 py-2 rounded hover:bg-gray-100 font-medium"
                >
                No
                </button>
            </div>
            </div>
        </div>
        )}

    </div>
  );
};

export default AdminNavBar;
