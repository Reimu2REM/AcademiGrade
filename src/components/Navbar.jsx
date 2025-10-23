// Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { FaUpload, FaSignOutAlt, FaTimes } from "react-icons/fa";
import supabase from "../config/supabaseclient";

const Navbar = ({ setVisible, user, profilePic, setProfilePic }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userFullname, setUserFullname] = useState(""); // 👈 NEW STATE
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch teacher's fullname when user loads
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("teachers")
          .select("fullname")
          .eq("auth_id", user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          setUserFullname(data.fullname);
        }
      } catch (error) {
        console.error("Error fetching teacher data:", error);
        // Fallback to email if fullname not found
        setUserFullname(user.email);
      }
    };

    fetchTeacherData();
  }, [user]); // 👈 RUNS WHEN USER CHANGES

  // Logout function
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = "/login";
  };

  // Handle profile picture upload
  const handleUpload = async (event) => {
    if (!user) {
      alert("User not found");
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, WebP)");
      return;
    }

    if (file.size > maxSize) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    try {
      // Upload to public bucket "teacherpfp"
      const { error: uploadError } = await supabase.storage
        .from("teacherpfp")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("teacherpfp")
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // Save the URL in teachers table
      const { error: dbError } = await supabase
        .from("teachers")
        .update({ profile_pic: publicUrl })
        .eq("auth_id", user.id);
      if (dbError) throw dbError;

      setProfilePic(publicUrl);
      setShowMenu(false);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      event.target.value = ""; // Reset file input
    }
  };

  return (
    <>
      <nav className="bg-blue-700 border-b border-gray-200 flex items-center justify-between px-6 py-2">
        {/* Left Section - Hamburger Menu */}
        <div className="flex items-center gap-4">
          <GiHamburgerMenu
            className="text-xl text-white  cursor-pointer  transition-transform hover:scale-105 "
            onClick={() => setVisible(true)}
          />
          <div className="hidden md:block">
            <h1 className="text-white font-semibold">Teacher Portal</h1>
          </div>
        </div>

        {/* Right Section - Profile */}
        <div className="relative" ref={menuRef}>
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="text-right hidden sm:block">
              {/* 👇 UPDATED TO SHOW FULLNAME */}
              <p className="text-white text-sm font-semibold">
                {userFullname || "Loading..."}
              </p>
              {/* Optional: Show email as subtitle */}
              <p className="text-blue-200 text-xs">
                {user?.email}
              </p>
            </div>
            <div className="relative">
              <img
                className="border border-gray-300 rounded-full h-10 w-10 object-cover cursor-pointer hover:border-gray-400 transition-colors"
                src={profilePic || "/default-avatar.png"}
                alt="Profile"
                onError={(e) => {
                  e.target.src = "/default-avatar.png";
                }}
                onClick={() => setShowMenu(!showMenu)}
              />
              {uploading && (
                <div className="absolute inset-0 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                </div>
              )}
            </div>
          </div>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              {/* Menu Items */}
              <div className="py-1">
                <label className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100">
                  <FaUpload className="text-gray-500 text-sm" />
                  <span className="text-sm">Change Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>

                <button
                  onClick={() => {
                    setShowLogoutConfirm(true);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FaSignOutAlt className="text-gray-500 text-sm" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            {/* Body */}
            <div className="p-6">
              <div className="text-center mb-4">
                <FaSignOutAlt className="text-blue-600 text-2xl mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Sign Out
                </h3>
                <p className="text-gray-600 text-sm">
                  Are you sure you want to sign out?
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-500 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploading Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-xs w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-3"></div>
              <p className="text-gray-700 text-sm">
                Updating profile...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;