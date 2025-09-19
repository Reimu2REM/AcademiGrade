import React from "react";
import { Sidebar } from "primereact/sidebar";
import { Link } from "react-router-dom";
import { MdOutlineDashboard } from "react-icons/md";
import { CiFileOn } from "react-icons/ci";
import Slogo from "../assets/MWCISlogo.png";
import { PiStudent } from "react-icons/pi";

const SidebarMenu = ({ visible, setVisible }) => {
  return (
    <Sidebar
      className="w-[200px] h-screen bg-Blue2 bg-clip-padding backdrop-filter backdrop-blur-lg bg-opacity-50 rounded-lg"
      visible={visible}
      onHide={() => setVisible(false)}
    >
      <div className="flex flex-col items-center h-full">
        {/* Logo */}
        <div className="flex flex-col items-center p-4">
          <img className="h-16 w-auto" src={Slogo} alt="Logo" />
          <h3 className="text-white font-bold mt-2">MWCIS</h3>
        </div>

        {/* Links */}
        <div className="flex flex-col w-full space-y-2 mt-6 px-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 p-3 w-full hover:bg-blue-700 rounded-xl"
          >
            <MdOutlineDashboard className="text-white text-2xl" />
            <h3 className="text-lg text-white font-bold">Dashboard</h3>
          </Link>
          <Link
            to="/records"
            className="flex items-center gap-3 p-3 w-full hover:bg-blue-700 rounded-xl"
          >
            <PiStudent  className="text-white text-2xl" />
            <h3 className="text-lg text-white font-bold">Add Student</h3>
          </Link>
          <Link 
            to="/SectionGrading"
            className="flex items-center gap-3 p-3 w-full hover:bg-blue-700 rounded-xl"
          >
          <CiFileOn  className="text-white text-2xl" />
          <h3 className="text-lg text-white font-bold">Records</h3>
          </Link>
        </div>
      </div>
    </Sidebar>
  );
};

export default SidebarMenu;
