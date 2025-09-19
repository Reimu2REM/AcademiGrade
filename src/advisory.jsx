
import React, { useState, useEffect, useRef } from 'react';
import { CiFileOn } from "react-icons/ci";
import { MdOutlineClass, MdOutlineDashboard, MdOutlineFolderShared } from "react-icons/md";
import Slogo from './assets/MWCISlogo.png'
import { Link } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tooltip } from 'primereact/tooltip';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { IoIosClose } from "react-icons/io";
import { Sidebar } from 'primereact/sidebar';
import { GiHamburgerMenu } from "react-icons/gi";

export default function Advisory() {
  //-----------------------------------------------------//
  const [students, setStudents] = useState([]);  //This will come from your database. louie kay chatgpt to
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    lrn: '',
    firstname: '',
    lastname: '',
    middlename: '',
    gender: '',
    birthdate: '',
    religion: '',
    contact: '',
    
  });

  const computeAge = (birthdate) => {
    const diff = Date.now() - new Date(birthdate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(students.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id) => {
    const updated = new Set(selectedIds);
    updated.has(id) ? updated.delete(id) : updated.add(id);
    setSelectedIds(updated);
  };

  const handleDeleteSelected = () => {
    setStudents(prev => prev.filter(s => !selectedIds.has(s.id)));
    setSelectedIds(new Set());
  };

  const handleSave = () => {
    const name = `${formData.lastname}, ${formData.firstname}, ${formData.middlename}`; // Combine lastname + firstname

  const newStudent = {
    id: Date.now(),
    lrn: formData.lrn,
    name, // Use combined name
    gender: formData.gender,
    birthdate: formData.birthdate,
    religion: formData.religion,
    contact: formData.contact,
    };
    setStudents(prev => [...prev, newStudent]);
    setShowModal(false);
    setFormData({ lrn: '', name: '', gender: '', birthdate: '', religion: '', contact: '' });
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.lrn.includes(search)
  );

 //------------------------------------------------------// 
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

   const exportExcel = () => {
  import('exceljs').then((ExcelJS) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    // Add header row based on keys from the first object
    if (students.length > 0) {
      const headers = Object.keys(students[0]);
      worksheet.columns = headers.map((key) => ({ header: key, key: key }));
    }

    // Add all student rows
    students.forEach((student) => {
      worksheet.addRow(student);
    });

    // Write to buffer and save
    workbook.xlsx.writeBuffer().then((buffer) => {
      saveAsExcelFile(buffer, 'Exelcopy');
    });
  });
};

const saveAsExcelFile = (buffer, fileName) => {
  import('file-saver').then((module) => {
    if (module && module.default) {
      const EXCEL_TYPE =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
      const EXCEL_EXTENSION = '.xlsx';

      const data = new Blob([buffer], { type: EXCEL_TYPE });
      module.default.saveAs(
        data,
        fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION
      );
    }
  });
};

  
  // for AddStudent-btn pop-up function
  const [showAdd,setshowadd] = useState(false);
  const showclickadd = () =>{
    if(showAdd == false){
      setshowadd(true);
    }else {setshowadd(false);}
  }
  const [showLogout, setShowLogout] = useState(false);
      const handleLogoutClick = () => {
          setShowLogout(!showLogout);
      };  
  const [visible, setVisible] = useState(false);
  return (
    <div className="lg:grid lg:grid-cols-1 lg:grid-rows-[60px_90px_1fr] lg:gap-0 ">
  
    <nav ref={menuRef} className="bg-Blue2  flex items-center   justify-between col-span-2">
      <div className="flex items-center">
        <GiHamburgerMenu className=' ml-5 bg-transparent h-28 text-white cursor-pointer' onClick={() => setVisible(true)}/>
      </div>
       <div onClick={() => setShowMenu(!showMenu)} className="sm:flex sm:items-end sm:justify-center sm:ml-14                           lg:flex lg:flex-col lg:items-center lg:justify-center lg:m-10">
                      <img className=" sm:border-solid sm:border-2 sm:rounded-full sm:h-9 sm:w-9                      lg:border-solid lg:border-2 lg:rounded-full lg:h-10 lg:w-10 m-5" src="" alt="" />
                      {/* <h4 className="sm:invisible         lg:visible lg:font-bold lg:text-white">username</h4> */}
                    </div>
                   
                    {showMenu && ( 
                 <div className="motion-preset-expand motion-duration-300
                 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2  border-2 border-black bg-white bg-opacity-100  z-50   shadow-xl rounded-xl w-[30vw] max-w-[400px] h-[70vh] max-h-[500px] flex flex-col justify-start p-5 ">
                    <div className='m-2 flex self-center '>
                        <img className='border-solid border-2 rounded-full border-black h-16 w-16' src="" alt="" />
                    </div>
                    <div className='flex justify-center'>
                        <button className="h-8 w-14 bg-yellow2 hover:text-white text-black rounded hover:bg-Blue2 p-1 m-1 font-semibold">upload</button>
                        <button className="h-8 w-14 bg-yellow2 hover:text-white text-black rounded hover:bg-Blue2 p-1 m-1 font-semibold">Edit</button>
                    </div>
                    <div className='p-2'>
                      <h1 className='mb-5 underline'>Information</h1>
                      <div className='flex flex-row justify-between'>
                        <label className='font-semibold' htmlFor="">Name:</label>
                        <h3 className='font-medium'>Fullname</h3>
                      </div>
                      <div className='flex flex-row justify-between'>
                        <label className='font-semibold' htmlFor="">Age</label>
                        <h3 className='font-medium'>28</h3>
                      </div>
                      <div className='flex flex-row justify-between'>
                        <label className='font-semibold' htmlFor="">Birthday</label>
                        <h3 className='font-medium'>00/00/0000</h3>
                      </div>
                      <div className='flex flex-row justify-between'>
                        <label className='font-semibold' htmlFor="">Address</label>
                        <h3 className='font-medium'>(sample address)</h3>
                      </div>
                      <div className='flex flex-row justify-between'>
                        <label className='font-semibold' htmlFor="">Contact No.</label>
                        <h3 className='font-medium'>09000000000</h3>
                      </div>
                      <div className='flex flex-row justify-between'>
                        <label className='font-semibold' htmlFor="">Email:</label>
                        <h3 className='font-medium'>@teacher.com</h3>
                      </div>
                    </div>
                    <div className='flex justify-center'>
                      <button onClick={() => setShowLogout(!showLogout)} className="h-8 w-32 bg-yellow2 hover:text-white text-black rounded hover:bg-Blue2 p-1 m-1 font-semibold">Logout</button>
                    </div>
                </div>
                )}   
                {/* logout-popup */}
                          {showLogout && (
                          <div className='motion-preset-expand motion-duration-100 bg-white  absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2  border-[1px] border-black  bg-opacity-100  z-50   shadow-xl rounded-xl w-[20vw] max-w-[250px] h-[15vh] max-h-[100px] flex flex-col justify-center p-5 '>
                            <h1 className='font-bold'>Do you want to log out?</h1>
                            <div className='self-end'>
                              <Link to="/"><button className='bg-yellow2 p-1 m-1 font-semibold rounded-lg hover:underline'>Yes</button></Link>
                              <button onClick={() => setShowLogout(false)} className=' p-1 m-1 font-semibold rounded-lg hover:underline'>No</button> 
                            </div>
                          </div>
                          )}    
    </nav>
       {/* sidebar */}
       <Sidebar className='w-[200px] h-screen bg-Blue2  bg-clip-padding backdrop-filter backdrop-blur-lg bg-opacity-50 rounded-lg' visible={visible} onHide={() => setVisible(false)}>
                <div className=" sm:flex sm:flex-row sm:items-center sm:justify-between                   lg:flex lg:flex-col lg:items-center lg:justify-between lg:h-full">
                  <div className="sm:flex sm:flex-row sm:items-center  lg:flex lg:flex-col lg:items-center  lg:h-screen">
                      <div className="sm:flex sm:flex-col sm:items-center sm:p-2               lg:flex lg:items-center lg:flex-col lg:justify-center lg:mb-10"> 
                        <img className="sm:h-7 sm:w-auto               lg:h-16 lg:w-auto" src={Slogo} alt="" /> 
                        <h3 className="text-white font-bold">MWCIS</h3>
                      </div>
                      <div className="sm:flex sm:flex-row sm:items-center sm:justify-center                            lg:flex lg:flex-col lg:items-center lg:justify-center lg:space-y-4 lg:rounded-3xl lg:w-full">
                        <Link to="/dashboard" className="sm:flex sm:flex-row sm:items-center sm:p-1  sm:m-1                            lg:flex lg:flex-row lg:items-center lg:justify-start lg:space-x-3 lg:p-4 lg:w-full hover:bg-blue-700 rounded-xl">
                          <MdOutlineDashboard  className="text-white text-4xl"/>
                          <h3 className="text-lg text-white font-bold ">Dashboard</h3>
                        </Link>
                          <Link to="/records"  className="sm:flex sm:flex-row sm:items-center  sm:p-1 sm:m-1                            lg:flex lg:flex-row lg:items-center lg:justify-start lg:space-x-3 lg:p-4 lg:w-full hover:bg-blue-700 rounded-xl">
                            <CiFileOn className="text-white text-4xl" />
                            <h3 className="text-lg text-white font-bold ">Records</h3>
                          </Link>
                          <Link to="/advisory" className="sm:flex sm:flex-row sm:items-center  sm:p-1 sm:m-1                lg:flex lg:flex-row lg:items-center lg:justify-start lg:space-x-3 lg:p-4 lg:w-full hover:bg-blue-700 rounded-xl">
                            <MdOutlineFolderShared className="text-white text-4xl" />
                            <h3 className="text-l text-white font-bold ">Advisory Class</h3>
                          </Link>    
                      </div>
                    </div>     
                </div>    
          </Sidebar>  
            {/* labels */}
            <div className='motion-preset-fade motion-duration-500 flex items-center justify-between'>
              <div className=''>
                <h1 className='text-5xl font-semibold p-2 '>Advisory Section</h1>
              </div>
              <div className='flex  justify-end p-2'>
                <div className=''>
                  {/* <button className='h-10 w-32 bg-yellow2 rounded-xl font-semibold mr-2 hover:text-white hover:bg-Blue2'>Remove</button> */}
                  <Button  className='h-10 w-32 bg-yellow2 rounded-xl font-semibold mr-2 hover:text-white hover:bg-Blue2' type="button"  severity="success" rounded onClick={exportExcel} data-pr-tooltip="XLS"  label="Save Copy" />
                  <button onClick={showclickadd} className='h-10 w-32 bg-yellow2 rounded-xl font-semibold mr-2 hover:text-white hover:bg-Blue2 '>Add Students</button>
                  <button className='h-10 w-32 bg-yellow2 rounded-xl font-semibold mr-2 hover:text-white hover:bg-Blue2'>Grades</button>
                </div>
              </div>
            </div>
            {/* tables */}
                <div className="p-1  row-start-3 ">
                  <div className="p-6 shadow-xl">
                    <div className="mt-4 flex gap-2 items-center">
                      <button
                        disabled={selectedIds.size === 0}
                        onClick={handleDeleteSelected}
                        className="bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        Delete Selected
                      </button>
                      
                      <input
                        type="text"
                        placeholder="Search by Name or LRN"
                        className="border px-2 py-1 ml-auto"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <table className="w-full border border-black mt-4">
                      <thead>
                        <tr className="bg-blue-700 text-white text-center">
                          <th className="border border-black p-2 w-5">
                            <input
                              type="checkbox"
                              checked={selectedIds.size === students.length && students.length > 0}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th className="border border-black p-2">LRN</th>
                          <th className="border border-black p-2">Name</th>
                          <th className="border border-black p-2">Gender</th>
                          <th className="border border-black p-2">Age</th>
                          <th className="border border-black p-2">Birthdate</th>
                          <th className="border border-black p-2">Religion</th>
                          <th className="border border-black p-2">Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s) => (
                          <tr key={s.id} className="text-center">
                            <td className="border border-black p-1">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(s.id)}
                                onChange={() => handleSelect(s.id)}
                              />
                            </td>
                            <td className="border border-black p-1">{s.lrn}</td>
                            <td className="border border-black p-1">{s.name}</td>
                            <td className="border border-black p-1">{s.gender}</td>
                            <td className="border border-black p-1">{computeAge(s.birthdate)}</td>
                            <td className="border border-black p-1">{s.birthdate}</td>
                            <td className="border border-black p-1">{s.religion}</td>
                            <td className="border border-black p-1">{s.contact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Modal */}
                    {showModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded w-80 space-y-2">
                          <h4 className="text-lg font-semibold">Add Student</h4>
                          {['lrn', 'name', 'gender', 'birthdate', 'religion', 'contact','magulang'].map((field) => (
                            <input
                              key={field}
                              type={field === 'birthdate' ? 'date' : 'text'}
                              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                              className="w-full border px-2 py-1"
                              value={formData[field]}
                              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                            />
                          ))}
                          <div className="text-right space-x-2 mt-2">
                            <button onClick={() => setShowModal(false)} className="px-3 py-1 border rounded">
                              Cancel
                            </button>
                            <button onClick={handleSave} className="bg-blue-600 text-white px-3 py-1 rounded">
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            {/* Add Student btn fnctn*/}
            {showAdd && ( 
             <div className="motion-scale-in-[0.5] motion-translate-x-in-[0%] motion-translate-y-in-[-25%] motion-opacity-in-[0%] motion-blur-in-[5px] motion-duration-[0.25s] motion-duration-[0.38s]/scale motion-duration-[0.38s]/translate
                                        absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                                        bg-white border-2 border-black z-50 shadow-xl rounded-xl 
                                        w-[70vw] max-w-[900px] h-[90vh] max-h-[600px] flex flex-col justify-start overflow-auto p-4">
                <h1 className='font-semibold ml-1 text-4xl self-center'>Add Student</h1>
                <div className="absolute top-2 right-2 cursor-pointer">
                  <IoIosClose className="text-black text-5xl" onClick={() => setshowadd(false)}/>
                </div>
                
                {/* grid-positioning */}
                <div className='grid grid-cols-3 gap-2  ml-2 p-5'>
                    <div>
                      <h3 className='font-semibold ml-1 '>LRN</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2'
                        type="text" value={formData.lrn}  onChange={(e) => setFormData({ ...formData, lrn: e.target.value })} />
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>Lastname</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2'
                       type="text" value={formData.lastname} onChange={(e) => setFormData({ ...formData, lastname: e.target.value })} />
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>Firstname</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2'
                       type="text" value={formData.firstname} onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}  />
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>Middlename</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2' 
                      type="text" value={formData.middlename} onChange={(e) => setFormData({ ...formData, middlename: e.target.value })} />
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>Gender</h3>
                      <select
                        className='rounded-lg h-8 w-full border-2 border-blue-400 focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2'
                        value={formData.gender} 
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })} 
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>Birthdate</h3>
                      <input className='rounded-lg h-8 w-full p-1 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2'
                       type="date" value={formData.birthdate} onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}  />
                    </div>
                    
                    <div> 
                      <h3 className='font-semibold ml-1'>Mother Tongue</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2' type="text" />
                    </div>
                      <div><h3>IP</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2' type="text"  placeholder='Ethnic group'/>
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>Religion</h3>
                      <select className='rounded-lg h-8 w-full p-1  border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2'
                        value={formData.religion}
                        onChange={(e) => setFormData({ ...formData, religion: e.target.value })}>
                        <option value="">Select Religion</option>
                        <option value="Christianity">Christianity</option>
                        <option value="Islam">Islam</option>
                        <option value="Others">Others</option>
                     </select>
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>House / Street / Sitio / Purok</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2' type="text"  placeholder=' '/>
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>Barangay</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2' type="text"  placeholder=' '/>
                    </div>
                    <div className='font-semibold ml-1'> 
                      <h3>Municipality</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2' type="text"  placeholder=' '/>
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>Province</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2' type="text"  placeholder=' '/>
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>Father's name</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2' type="text"  placeholder=' '/>
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>Mothers's name</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2' type="text"  placeholder='Mothers maiden name '/>
                    </div>
                    <div>
                      <h3 className='font-semibold ml-1'>Contact No.</h3>
                      <input className='rounded-lg h-8 w-full p-2 border-2 border-blue-400   focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2'
                       type="text"  placeholder=' ' value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })}/>
                    </div>
                </div> 
                <button onClick={handleSave} className=' h-10 w-32 bg-yellow2 rounded-xl font-semibold p-2   hover:text-white hover:bg-Blue2 self-center'>Add</button>
              </div>
            )}
    </div>
  );
}