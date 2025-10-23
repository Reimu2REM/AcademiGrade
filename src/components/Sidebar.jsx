import React from "react";
import { Sidebar } from "primereact/sidebar";
import { Link } from "react-router-dom";
import { MdOutlineDashboard, MdClose } from "react-icons/md";
import { CiFileOn } from "react-icons/ci";
import Slogo from "../assets/MWCISlogo.png";
import { MdOutlineClass } from "react-icons/md";

const SidebarMenu = ({ visible, setVisible }) => {
  return (
    <Sidebar
      className="w-[220px] h-screen bg-Blue2 bg-clip-padding backdrop-filter backdrop-blur-lg bg-opacity-50 rounded-lg shadow-xl"
      visible={visible}
      onHide={() => setVisible(false)}
      showCloseIcon={false} // Disable default close icon
      icons={
        <button 
          onClick={() => setVisible(false)}
          className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all duration-200 absolute right-3 top-3 group"
          aria-label="Close sidebar"
        >
          <MdClose className="text-white text-xl group-hover:text-blue-100 group-hover:scale-110 transition-all duration-200" />
        </button>
      }
    >
      <div className="flex flex-col items-center h-full pt-8">
        {/* Logo */}
        <div className="flex flex-col items-center p-4 mb-4">
          <img className="h-16 w-auto mb-2" src={Slogo} alt="MWCIS Logo" />
          <h3 className="text-white font-bold text-lg tracking-wide">MWCIS</h3>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col w-full space-y-3 mt-4 px-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 p-3 w-full hover:bg-blue-600 hover:bg-opacity-50 rounded-xl transition-all duration-200 group"
            onClick={() => setVisible(false)}
          >
            <MdOutlineDashboard className="text-white text-2xl group-hover:scale-110 transition-transform duration-200" />
            <h3 className="text-lg text-white font-semibold">Dashboard</h3>
          </Link>
          
          <Link
            to="/records"
            className="flex items-center gap-3 p-3 w-full hover:bg-blue-600 hover:bg-opacity-50 rounded-xl transition-all duration-200 group"
            onClick={() => setVisible(false)}
          >
            <MdOutlineClass className="text-white text-2xl group-hover:scale-110 transition-transform duration-200" />
            <h3 className="text-lg text-white font-semibold">My Sections</h3>
          </Link>
          
          <Link 
            to="/SectionGrading"
            className="flex items-center gap-3 p-3 w-full hover:bg-blue-600 hover:bg-opacity-50 rounded-xl transition-all duration-200 group"
            onClick={() => setVisible(false)}
          >
            <CiFileOn className="text-white text-2xl group-hover:scale-110 transition-transform duration-200" />
            <h3 className="text-lg text-white font-semibold">Records</h3>
          </Link>
        </div>

        {/* Bottom spacer */}
        <div className="flex-1"></div>
        
        {/* Optional: Footer */}
        <div className="p-4 text-center">
          <p className="text-white text-opacity-70 text-sm">MWCIS System</p>
        </div>
      </div>
    </Sidebar>
  );
};

export default SidebarMenu;