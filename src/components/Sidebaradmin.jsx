import React from 'react';
import { Sidebar } from "primereact/sidebar";
import Slogo from "../assets/MWCISlogo.png";
import { Link } from "react-router-dom";
import { GrUserManager } from "react-icons/gr";
import { HiSpeakerphone } from "react-icons/hi";
import { FaFolderPlus } from "react-icons/fa6";

const Sidebaradmin = ({ visible, setVisible }) => {
  return (
    <div>
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
            {/* Manage Teachers */}
            <Link
              to="/admin/teachers"
              className="flex items-center gap-3 p-3 w-full hover:bg-blue-700 rounded-xl"
            >
              <GrUserManager className="text-white text-3xl" />
              <h3 className="text-lg text-white font-bold">Manage Teachers</h3>
            </Link>

            {/* Announcements */}
            <Link
              to="/admin/announcements"
              className="flex items-center gap-3 p-3 w-full hover:bg-blue-700 rounded-xl"
            >
              <HiSpeakerphone className="text-white text-3xl" />
              <h3 className="text-lg text-white font-bold">Announcements</h3>
            </Link>

            {/* Grades Percentage */}
            <Link
              to="/admin/grades"
              className="flex items-center gap-3 p-3 w-full hover:bg-blue-700 rounded-xl"
            >
              <FaFolderPlus  className="text-white text-3xl" />
              <h3 className="text-lg text-white font-bold">Sections Management</h3>
            </Link>
          </div>
        </div>
      </Sidebar>
    </div>
  );
};

export default Sidebaradmin;
