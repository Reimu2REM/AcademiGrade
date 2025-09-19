import React from "react";

const ProfileMenu = ({ profilePic, userEmail, handleUpload, setShowLogout }) => {
  return (
    <div className="motion-preset-expand motion-duration-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-black bg-white flex z-50 shadow-xl rounded-xl w-[30vw] max-w-[400px] h-[70vh] max-h-[500px] flex-col justify-start p-5">
      {/* Profile Image */}
      <div className="m-2 flex self-center">
        <img
          className="border-2 rounded-full border-black h-16 w-16 object-cover"
          src={profilePic || "/default-avatar.png"}
          alt="Profile"
        />
      </div>

      {/* Upload */}
      <div className="flex justify-center">
        <input
          type="file"
          accept="image/*"
          id="upload"
          className="hidden"
          onChange={handleUpload}
        />
        <label
          htmlFor="upload"
          className="h-8 w-14 flex items-center justify-center cursor-pointer bg-yellow2 hover:text-white text-black rounded hover:bg-Blue2 p-1 m-1 font-semibold"
        >
          Upload
        </label>
        <button className="h-8 w-14 bg-yellow2 hover:text-white text-black rounded hover:bg-Blue2 p-1 m-1 font-semibold">
          Edit
        </button>
      </div>

      {/* Info */}
      <div className="p-2">
        <h1 className="mb-5 underline">Information</h1>
        <div className="flex justify-between">
          <label className="font-semibold">Email:</label>
          <h3 className="font-medium">{userEmail}</h3>
        </div>
        <div className="flex justify-between">
          <label className="font-semibold">Password:</label>
          <h3 className="font-medium">********</h3>
        </div>
      </div>

      {/* Logout */}
      <div className="flex justify-center mt-20">
        <button
          onClick={() => setShowLogout(true)}
          className="h-8 w-32 bg-yellow2 hover:text-white text-black rounded hover:bg-Blue2 p-1 font-semibold"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfileMenu;
