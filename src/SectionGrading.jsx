import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { StudentTable } from "./components/StudentTable"; // ✅ integrated here

const SectionGrading = () => {
  const [visible, setVisible] = useState(false);

  const [user] = useState({ name: "Teacher" });
  const [profilePic, setProfilePic] = useState(null);

  return (
    <div className="min-h-screen bg-pink-200">
      <Navbar
        setVisible={setVisible}
        user={user}
        profilePic={profilePic}
        setProfilePic={setProfilePic}
        
      />
      <Sidebar visible={visible} setVisible={setVisible} />

      <main className="p-6 ">
        <StudentTable className="" />
      </main>
    </div>
  );
};

export default SectionGrading;
