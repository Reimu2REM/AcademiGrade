import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminNavbar from "./components/AdminNavBar";
import SidebarAdmin from "./components/Sidebaradmin";

export default function Admin() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <SidebarAdmin visible={visible} setVisible={setVisible} />

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        <AdminNavbar setVisible={setVisible} />
        <div className="p-6 overflow-y-auto">
          {/* Nested Routes */}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
