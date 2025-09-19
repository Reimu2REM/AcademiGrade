import React, { useState, useEffect, useRef } from 'react';
import { CiFileOn } from "react-icons/ci";
import { MdOutlineClass, MdOutlineDashboard, MdOutlineFolderShared } from "react-icons/md";
import Slogo from './assets/MWCISlogo.png'
import { Link } from 'react-router-dom';
import { Sidebar } from 'primereact/sidebar';
import { GiHamburgerMenu } from "react-icons/gi";

const Record_table = () => {
const [showMenu, setShowMenu] = useState(false);
          const menuRef = useRef(null);
      
          useEffect(() => {
          const handleClickOutside = (event) => {
              if (menuRef.current && !menuRef.current.contains(event.target)) {
              setShowMenu(false);
              }
          };
      
          document.addEventListener("mousedown", handleClickOutside);
          return () => {
              document.removeEventListener("mousedown", handleClickOutside);
          };
          }, []);
           const [visible, setVisible] = useState(false);

    return (
        <div ref={menuRef} className="lg:grid lg:grid-cols-[1fr] lg:grid-rows-[60px_70px_1fr] lg:gap-0  ">
          <nav className="bg-Blue2  flex items-center   justify-between h-20  ">
            <div className="flex items-center">
                <GiHamburgerMenu className='mb-5 ml-5 bg-transparent h-28 text-2xl text-white cursor-pointer' onClick={() => setVisible(true)}/>
            </div>
              <div onClick={() => setShowMenu(!showMenu)} className="sm:flex sm:items-end sm:justify-center sm:ml-14   lg:flex lg:flex-row lg:items-center lg:justify-center lg:m-10">
                   <img className=" sm:border-solid sm:border-2 sm:rounded-full sm:h-5 sm:w-9 lg:border-solid lg:border-2 lg:rounded-full lg:h-10 lg:w-10 mb-5" src="" alt="" />
                   {/* <h4 className="sm:invisible         lg:visible lg:font-bold lg:text-white cursor-pointer mb-5 p-2">username</h4> */}
              </div>
              {showMenu && ( 
                      <div className="motion-preset-expand motion-duration-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-500 border-2 border-black bg-white bg-opacity-100 flex z-50   shadow-xl rounded-xl w-[30vw] max-w-[400px] h-[70vh] max-h-[500px] flex flex-col justify-start p-5 ">
                          <div className='m-2 flex self-center '>
                              <img className='border-solid border-2 rounded-full border-black h-16 w-16' src="" alt="" />
                          </div>
                          <div className='flex justify-center'>
                              <button className="h-8 w-14 bg-yellow2 hover:text-white text-black rounded hover:bg-blue-600 p-1 m-1">Upload</button>
                              <button className="h-8 w-14 bg-yellow2 hover:text-white text-black rounded hover:bg-blue-600 p-1 m-1">Edit</button>
                          </div>
                          <div className='p-2'>
                            <h1 className='mb-5 underline'>Information</h1>
                            <div className='flex flex-row justify-between'>
                              <label className='font-semibold' htmlFor="">Name:</label>
                              <h3 className='font-medium'>Fullname</h3>
                            </div>
                            <div className='flex flex-row justify-between'>
                              <label htmlFor="">Age</label>
                              <h3>28</h3>
                            </div>
                            <div className='flex flex-row justify-between'>
                              <label htmlFor="">Birthday</label>
                              <h3>00/00/0000</h3>
                            </div>
                            <div className='flex flex-row justify-between'>
                              <label htmlFor="">Address</label>
                              <h3>(sample address)</h3>
                            </div>
                            <div className='flex flex-row justify-between'>
                              <label htmlFor="">Contact No.</label>
                              <h3>09000000000</h3>
                            </div>
                            <div className='flex flex-row justify-between'>
                              <label htmlFor="">Email:</label>
                              <h3>@teacher.com</h3>
                            </div>
                          </div>
                          <div className='flex justify-center'>
                            <button className="h-8 w-32 bg-yellow2 hover:text-white text-black rounded hover:bg-blue-600 p-1 m-1">Log out</button>
                          </div>
                      </div>
                      )}  
          </nav>
          <Sidebar className='w-[200px] h-screen bg-Blue2 bg-clip-padding backdrop-filter backdrop-blur-lg bg-opacity-50 rounded-lg' visible={visible} onHide={() => setVisible(false)}> 
                <div className=" sm:flex sm:flex-row sm:items-center sm:justify-between                   lg:flex lg:flex-col lg:items-center lg:justify-between lg:h-full">
                  <div className="sm:flex sm:flex-row sm:items-center  lg:flex lg:flex-col lg:items-center  lg:h-screen z-1">
                      <div className="sm:flex sm:flex-col sm:items-center sm:p-2               lg:flex lg:items-center lg:flex-col lg:justify-center lg:mb-10"> 
                        <img className="sm:h-7 sm:w-auto               lg:h-16 lg:w-auto" src={Slogo} alt="" /> 
                        <h3 className="text-white font-bold">MWCIS</h3>
                      </div>
                      <div className="sm:flex sm:flex-row sm:items-center sm:justify-center                            lg:flex lg:flex-col lg:items-center lg:justify-center lg:space-y-4 lg:rounded-3xl lg:w-full">
                        <Link to="/dashboard" className="sm:flex sm:flex-row sm:items-center sm:p-1  sm:m-1   lg:flex lg:flex-row lg:items-center lg:justify-start lg:space-x-3 lg:p-4 lg:w-full hover:bg-blue-700 rounded-xl">
                          <MdOutlineDashboard  className="text-white text-4xl"/>
                          <h3 className=" text-lg text-white font-bold ">Dashboard</h3>
                        </Link>
                          <Link to="/records"  className="sm:flex sm:flex-row sm:items-center  sm:p-1 sm:m-1    lg:flex lg:flex-row lg:items-center lg:justify-start lg:space-x-3 lg:p-4 lg:w-full hover:bg-blue-700 rounded-xl">
                            <CiFileOn className="text-white text-4xl " />
                            <h3 className="text-lg text-white font-bold ">Records</h3>
                          </Link>
                          <Link to="/advisory" className="sm:flex sm:flex-row sm:items-center  sm:p-1 sm:m-1     lg:flex lg:flex-row lg:items-center lg:justify-start lg:space-x-3 lg:p-4 lg:w-full hover:bg-blue-700  rounded-xl">
                            <MdOutlineFolderShared className="text-white text-4xl " />
                            <h3 className="text-l whitespace-nowrap text-white font-bold ">Advisory Class</h3>
                          </Link>
                      </div>
                    </div>          
                </div>
          </Sidebar>
          {/* labels & btn */}
          <div className='flex justify-between items-center bg-gray-200'>
            <h1 className='p-10 font-bold text-4xl'>Student Records</h1>
            <div className='flex flex-row items-center'>
              <h1 className='p-2 font-semibold text-lg'>Section:</h1>
              <h1 className='p-2 font-semibold text-lg underline'>sample section</h1>
            </div>
          </div>
          {/* Record_table */}
          <div>
                <table>
                  <thead className='bg-pink-500'>
                    <tr>
                      <th>Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
          </div>
      </div> 
    );
};
export default Record_table;