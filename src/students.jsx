import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "./config/supabaseclient";
import Papa from "papaparse";
import { IoClose, IoSearch, IoAdd, IoDownload, IoCloudUpload, IoBook, IoArrowBack, IoFilter, IoCaretUp, IoCaretDown } from "react-icons/io5";
import * as XLSX from "xlsx";

export default function Students() {
  const { section_id } = useParams();
  const navigate = useNavigate();
  const datePickerRef = useRef(null);

  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState({ gender: "", name: "" });
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sectionName, setSectionName] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    lrn: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    gender: "",
    date_of_birth: "",
    contact_number: "",
    address: "",
    father_name: "",
    father_contact: "",
    mother_name: "",
    mother_contact: "",
  });

  useEffect(() => {
    if (section_id) {
      fetchSectionName();
      fetchStudents();
    }
  }, [section_id]);

  const handleViewGradebook = () => {
    navigate(`/gradebook/${section_id}`);
  };

  const fetchSectionName = async () => {
    const { data, error } = await supabase
      .from("sections")
      .select("name")
      .eq("id", section_id)
      .maybeSingle();

    if (error) {
      console.error(error);
      setSectionName("Unknown Section");
    } else {
      setSectionName(data?.name || "Unknown Section");
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("section_id", section_id);

    if (error) console.error(error);
    else {
      setStudents(data || []);
      setFiltered(data || []);
    }
    setLoading(false);
  };

  // Format name for database storage
  const formatNameForDatabase = () => {
    return `${form.last_name}, ${form.first_name} ${form.middle_name || ""}`.trim();
  };

  // 🔍 Filtering and sorting
  useEffect(() => {
    let filteredData = [...students];
    if (search.trim() !== "") {
      filteredData = filteredData.filter(
        (s) =>
          s.lrn?.toLowerCase().includes(search.toLowerCase()) ||
          s.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sortBy.gender && sortBy.gender !== "All") {
      filteredData = filteredData.filter(
        (s) => s.gender.toLowerCase() === sortBy.gender.toLowerCase()
      );
    }

    if (sortBy.name === "asc") {
      filteredData.sort((a, b) => a.name?.localeCompare(b.name));
    } else if (sortBy.name === "desc") {
      filteredData.sort((a, b) => b.name?.localeCompare(a.name));
    }

    setFiltered(filteredData);
  }, [search, sortBy, students]);

  // Handle gender sort toggle
  const handleGenderSort = () => {
    if (sortBy.gender === "") {
      setSortBy({ ...sortBy, gender: "Male" });
    } else if (sortBy.gender === "Male") {
      setSortBy({ ...sortBy, gender: "Female" });
    } else if (sortBy.gender === "Female") {
      setSortBy({ ...sortBy, gender: "All" });
    } else {
      setSortBy({ ...sortBy, gender: "" });
    }
  };

  // 📝 Form input handler
  const handleInputChange = (key, value) => {
    if (key === "lrn") {
      if (!/^\d{0,12}$/.test(value)) return;
    } else if (
      key === "contact_number" ||
      key === "father_contact" ||
      key === "mother_contact"
    ) {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 0 && !value.startsWith("09")) value = "09";
      if (value.length > 11) value = value.slice(0, 11);
    } else if (key === "last_name" || key === "first_name" || key === "middle_name" || 
               key === "father_name" || key === "mother_name") {
      // Only allow letters and spaces
      if (!/^[A-Za-z\s]*$/.test(value)) return;
    }
    setForm({ ...form, [key]: value });
  };

  // 📅 Date input handler
  const handleDateChange = (val) => {
    const cleaned = val.replace(/[^\d]/g, "");
    if (cleaned.length === 8) {
      const year = cleaned.slice(4);
      const month = cleaned.slice(0, 2);
      const day = cleaned.slice(2, 4);
      setForm({ ...form, date_of_birth: `${year}-${month}-${day}` });
    } else {
      setForm({ ...form, date_of_birth: val });
    }
  };

  // ✅ Validation
  const validateForm = () => {
    if (!form.lrn || form.lrn.length !== 12) {
      alert("LRN must be 12 digits");
      return false;
    }
    if (!form.last_name || !form.first_name) {
      alert("Last name and first name are required");
      return false;
    }
    if (!form.gender) {
      alert("Gender is required");
      return false;
    }
    if (!form.date_of_birth) {
      alert("Date of birth is required");
      return false;
    }
    
    // Check if LRN already exists (only for new students)
    if (!isEditing) {
      const existingStudent = students.find(student => student.lrn === form.lrn);
      if (existingStudent) {
        alert(`LRN ${form.lrn} already exists for student: ${existingStudent.name}`);
        return false;
      }
    }
    
    return true;
  };

  // ➕ Add / Edit student
  const handleSubmitStudent = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const studentData = { 
      lrn: form.lrn,
      name: formatNameForDatabase(), // Combine names for database
      gender: form.gender,
      date_of_birth: form.date_of_birth,
      contact_number: form.contact_number,
      address: form.address,
      father_name: form.father_name,
      father_contact: form.father_contact,
      mother_name: form.mother_name,
      mother_contact: form.mother_contact,
      section_id,
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("students")
          .update(studentData)
          .eq("id", editId);
        if (error) throw error;
        alert("Student updated!");
        setShowModal(false);
        setIsEditing(false);
        fetchStudents();
      } else {
        const { error } = await supabase.from("students").insert([studentData]);
        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            alert(`Error: LRN ${form.lrn} already exists in the system. Please use a different LRN.`);
          } else {
            throw error;
          }
        } else {
          alert("Student added!");
          setShowModal(false);
          fetchStudents();
        }
      }
    } catch (error) {
      console.error("Database error:", error);
      if (error.code !== '23505') { // Don't show generic alert for duplicate LRN
        alert(`Error ${isEditing ? 'updating' : 'adding'} student: ${error.message}`);
      }
    }
  };

  // 📄 CSV Import with Upsert (avoid duplicates by LRN)
  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) =>
        header.trim().toLowerCase().replace(/\s+/g, "_").replace(/\ufeff/g, ""),
      complete: async function (results) {
        try {
          const rows = results.data;
          if (!rows || !rows.length) {
            alert("❌ CSV file is empty!");
            return;
          }

          const data = rows
            .map((r) => {
              const lrn = r.lrn?.trim();
              const name = r.name?.trim();
              const gender = r.gender?.trim();
              
              if (!lrn || !gender || !name) return null;

              let dob = r.date_of_birth?.trim();
              if (dob && dob.includes("/")) {
                const [m, d, y] = dob.split("/");
                dob = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
              }

              return {
                lrn,
                name: name, // Use the name as it is in CSV
                gender,
                date_of_birth: dob || null,
                contact_number: r.contact_number?.trim() || "",
                address: r.address?.trim() || "",
                father_name: r.father_name?.trim() || "",
                father_contact: r.father_contact?.trim() || "",
                mother_name: r.mother_name?.trim() || "",
                mother_contact: r.mother_contact?.trim() || "",
                section_id,
              };
            })
            .filter(Boolean);

          if (!data.length) {
            alert("❌ No valid rows found in CSV.");
            return;
          }

          console.log("📤 Uploading to Supabase:", data);

          const { error } = await supabase
            .from("students")
            .upsert(data, { onConflict: "lrn" }); // ✅ Upsert by LRN to handle duplicates

          if (error) {
            console.error("Supabase upsert error:", error);
            alert("❌ Error importing data into Supabase!");
          } else {
            alert("✅ CSV imported successfully! Existing records were updated, new records were added.");
            fetchStudents();
          }
        } catch (err) {
          console.error("CSV Import Error:", err);
          alert("❌ Failed to process CSV!");
        }
      },
    });
  };

  // 📊 Export to Excel with RE-IMPORTABLE formatting
  const handleExportToExcel = () => {
    if (filtered.length === 0) {
      alert("No data to export!");
      return;
    }

    try {
      // Prepare data for Excel export - use import-compatible format
      const excelData = filtered.map(student => ({
        "lrn": student.lrn,
        "name": student.name, // Use exact same field names as import
        "gender": student.gender,
        "date_of_birth": student.date_of_birth, // Keep in database format (YYYY-MM-DD)
        "contact_number": student.contact_number,
        "address": student.address,
        "father_name": student.father_name,
        "father_contact": student.father_contact,
        "mother_name": student.mother_name,
        "mother_contact": student.mother_contact,
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths for better readability
      const colWidths = [
        { wch: 15 }, // lrn
        { wch: 25 }, // name
        { wch: 10 }, // gender
        { wch: 12 }, // date_of_birth
        { wch: 15 }, // contact_number
        { wch: 30 }, // address
        { wch: 20 }, // father_name
        { wch: 15 }, // father_contact
        { wch: 20 }, // mother_name
        { wch: 15 }, // mother_contact
      ];
      ws['!cols'] = colWidths;

      // Add header styling
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Students");

      // Generate filename with section name and date
      const fileName = `Students_${sectionName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export the file
      XLSX.writeFile(wb, fileName);
      
      alert(`✅ Excel file "${fileName}" downloaded successfully!`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("❌ Failed to export Excel file!");
    }
  };

  const handleEdit = (student) => {
    // Parse the combined name back into separate fields for editing
    const parseName = (combinedName) => {
      if (!combinedName) return { last_name: "", first_name: "", middle_name: "" };
      
      const parts = combinedName.split(',').map(part => part.trim());
      if (parts.length === 2) {
        const last_name = parts[0];
        const firstMiddleParts = parts[1].split(' ').filter(part => part.trim() !== '');
        const first_name = firstMiddleParts[0] || "";
        const middle_name = firstMiddleParts.slice(1).join(' ') || "";
        
        return { last_name, first_name, middle_name };
      }
      
      return { last_name: combinedName, first_name: "", middle_name: "" };
    };

    const nameParts = parseName(student.name);
    
    setForm({
      ...student,
      last_name: nameParts.last_name,
      first_name: nameParts.first_name,
      middle_name: nameParts.middle_name,
    });
    setEditId(student.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Error deleting student!");
    } else {
      alert("Student deleted!");
      fetchStudents();
    }
  };

  // Get gender filter indicator
  const getGenderFilterIndicator = () => {
    if (sortBy.gender === "") return <IoFilter className="inline ml-1" />;
    if (sortBy.gender === "All") return "• All";
    return `• ${sortBy.gender}`;
  };

  // Get name sort indicator
  const getNameSortIndicator = () => {
    if (sortBy.name === "asc") return <IoCaretUp className="inline" />;
    if (sortBy.name === "desc") return <IoCaretDown className="inline" />;
    return <IoFilter className="inline ml-1" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="p-10">
        {/* 🔹 Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
              <p className="text-gray-600 mt-1">
                {sectionName || "Loading..."} • {filtered.length} students
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleViewGradebook}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <IoBook size={18} />
                View Gradebook
              </button>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-sm"
              >
                <IoArrowBack size={18} />
                Back
              </button>
            </div>
          </div>
        </div>

        {/* 🔹 Action Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleCSVImport}
                className="hidden"
                id="csvInput"
              />
              <label
                htmlFor="csvInput"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 transition-colors shadow-sm"
              >
                <IoCloudUpload size={18} />
                Import CSV
              </label>
              <button
                onClick={handleExportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <IoDownload size={18} />
                Export To Excel
              </button>
              <button
                onClick={() => {
                  setForm({
                    lrn: "",
                    last_name: "",
                    first_name: "",
                    middle_name: "",
                    gender: "",
                    date_of_birth: "",
                    contact_number: "",
                    address: "",
                    father_name: "",
                    father_contact: "",
                    mother_name: "",
                    mother_contact: "",
                  });
                  setIsEditing(false);
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <IoAdd size={18} />
                Add Student
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by LRN or Name..."
                className="pl-10 pr-4 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 🔹 Students Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="bg-yellow-100 px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      LRN
                    </th>
                    <th 
                      className="bg-yellow-100 px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => setSortBy({...sortBy, name: sortBy.name === "asc" ? "desc" : "asc"})}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {getNameSortIndicator()}
                      </div>
                    </th>
                    <th 
                      className="bg-yellow-100 px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={handleGenderSort}
                    >
                      <div className="flex items-center gap-1">
                        Gender
                        {getGenderFilterIndicator()}
                      </div>
                    </th>
                    <th className="bg-yellow-100 px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date of Birth
                    </th>
                    {/* <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Contact
                    </th> */}
                    <th className="bg-yellow-100 px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="bg-yellow-100 px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Father
                    </th>
                    <th className="bg-yellow-100 px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Father Contact
                    </th>
                    <th className="bg-yellow-100 px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Mother
                    </th>
                    <th className="bg-yellow-100 px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Mother Contact
                    </th>
                    <th className="bg-yellow-100 px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4  whitespace-nowrap text-sm font-medium text-gray-900">
                        {s.lrn}
                      </td>
                      <td className="px-6 py-4  whitespace-nowrap text-sm text-gray-900">
                        {s.name}
                      </td>
                      <td className="px-6 py-4  whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          s.gender === 'Male' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-pink-100 text-pink-800'
                        }`}>
                          {s.gender}
                        </span>
                      </td>
                      <td className="px-6 py-4  whitespace-nowrap text-sm text-gray-900">
                        {s.date_of_birth
                          ? new Date(s.date_of_birth).toLocaleDateString("en-US")
                          : "-"}
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {s.contact_number || "-"}
                      </td> */}
                      <td className="px-6 py-4 text-sm  text-gray-900 max-w-xs truncate">
                        {s.address || "-"}
                      </td>
                      <td className="px-6 py-4  whitespace-nowrap text-sm text-gray-900">
                        {s.father_name || "-"}
                      </td>
                      <td className="px-6 py-4  whitespace-nowrap text-sm text-gray-900">
                        {s.father_contact || "-"}
                      </td>
                      <td className="px-6 py-4  whitespace-nowrap text-sm text-gray-900">
                        {s.mother_name || "-"}
                      </td>
                      <td className="px-6 py-4  whitespace-nowrap text-sm text-gray-900">
                        {s.mother_contact || "-"}
                      </td>
                      <td className="px-6 py-4  whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(s)}
                            className="text-yellow-600 hover:text-yellow-900 transition-colors p-1 rounded hover:bg-yellow-50"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="text-red-600 hover:text-red-900 transition-colors p-1 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg">No students found</div>
                  <p className="text-gray-500 mt-2">
                    {search ? "Try adjusting your search terms" : "Add your first student to get started"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🔹 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {isEditing ? "Edit Student" : "Add New Student"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <IoClose size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitStudent} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LRN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="12 digits"
                    value={form.lrn}
                    onChange={(e) => handleInputChange("lrn", e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={form.last_name}
                    onChange={(e) => handleInputChange("last_name", e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={form.first_name}
                    onChange={(e) => handleInputChange("first_name", e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    placeholder="Middle Name"
                    value={form.middle_name}
                    onChange={(e) => handleInputChange("middle_name", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date_of_birth || ""}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="Complete Address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    placeholder="09XXXXXXXXX"
                    value={form.contact_number}
                    onChange={(e) => handleInputChange("contact_number", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div> */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Father's Name
                  </label>
                  <input
                    type="text"
                    placeholder="Father's Name"
                    value={form.father_name}
                    onChange={(e) => handleInputChange("father_name", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Father's Contact
                  </label>
                  <input
                    type="text"
                    placeholder="09XXXXXXXXX"
                    value={form.father_contact}
                    onChange={(e) => handleInputChange("father_contact", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mother's Name
                  </label>
                  <input
                    type="text"
                    placeholder="Mother's Name"
                    value={form.mother_name}
                    onChange={(e) => handleInputChange("mother_name", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mother's Contact
                  </label>
                  <input
                    type="text"
                    placeholder="09XXXXXXXXX"
                    value={form.mother_contact}
                    onChange={(e) => handleInputChange("mother_contact", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {isEditing ? "Update Student" : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}