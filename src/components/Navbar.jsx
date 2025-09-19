// Navbar.jsx
import React, { useState } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import supabase from "../config/supabaseclient";

const Navbar = ({ setVisible, user, profilePic, setProfilePic }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Logout function
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = "/login";
  };

  // Handle profile picture upload
  const handleUpload = async (event) => {
    if (!user) return alert("User not found");
    const file = event.target.files[0];
    if (!file) return;

    const filePath = `${user.id}/${file.name}`;

    try {
      // ✅ Upload to your public bucket "teacherpfp"
      const { error: uploadError } = await supabase.storage
        .from("teacherpfp")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // ✅ Get public URL
      const { data: urlData } = supabase.storage
        .from("teacherpfp")
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // ✅ Save the URL in teachers table
      const { error: dbError } = await supabase
        .from("teachers")
        .update({ profile_pic: publicUrl })
        .eq("auth_id", user.id);
      if (dbError) throw dbError;

      setProfilePic(publicUrl);
      alert("Profile picture uploaded successfully!");
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
  };

  return (
    <nav className="bg-Blue2 flex items-center justify-between px-4 py-2 col-span-2 relative">
      <GiHamburgerMenu
        className="text-xl text-white cursor-pointer"
        onClick={() => setVisible(true)}
      />

      {/* Profile picture dropdown */}
      <div className="relative">
        <img
          className="border-2 rounded-full h-10 w-10 object-cover cursor-pointer"
          src={profilePic || "/default-avatar.png"}
          alt="Profile"
          onClick={() => setShowMenu(!showMenu)}
        />
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
            <label className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-200">
              Upload Profile Picture
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
            <button
              onClick={() => {
                setShowLogoutConfirm(true);
                setShowMenu(false);
              }}
              className="w-full text-left p-2 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4">
              Are you sure you want to logout?
            </h2>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Yes
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="border px-3 py-1 rounded hover:bg-gray-100"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
