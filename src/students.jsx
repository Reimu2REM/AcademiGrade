import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "./config/supabaseclient";
import Papa from "papaparse";
import { IoClose } from "react-icons/io5";
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
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("section_id", section_id);

    if (error) console.error(error);
    else {
      setStudents(data || []);
      setFiltered(data || []);
    }
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
    if (sortBy.gender === "") return "";
    if (sortBy.gender === "All") return "• All";
    return `• ${sortBy.gender}`;
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow">
      {/* 🔹 Header Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          Students — {sectionName || "Loading..."}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={handleViewGradebook}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            📘 View Gradebook
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleCSVImport}
            className="hidden"
            id="csvInput"
          />
          <label
            htmlFor="csvInput"
            className="px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700"
          >
            Import CSV/Excel
          </label>
          <button
            onClick={handleExportToExcel}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            📊 Export To Excel
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Student
          </button>
        </div>
        <input
          type="text"
          placeholder="Search LRN or Name"
          className="border rounded-lg p-2 w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">LRN</th>
              <th className="p-2 border cursor-pointer" onClick={() => setSortBy({...sortBy, name: sortBy.name === "asc" ? "desc" : "asc"})}>
                Name {sortBy.name && (sortBy.name === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="p-2 border cursor-pointer" 
                onClick={handleGenderSort}
              >
                Gender {getGenderFilterIndicator()}
              </th>
              <th className="p-2 border">Date of Birth</th>
              <th className="p-2 border">Contact</th>
              <th className="p-2 border">Address</th>
              <th className="p-2 border">Father</th>
              <th className="p-2 border">Father Contact</th>
              <th className="p-2 border">Mother</th>
              <th className="p-2 border">Mother Contact</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="p-2 border">{s.lrn}</td>
                <td className="p-2 border">{s.name}</td>
                <td className="p-2 border">{s.gender}</td>
                <td className="p-2 border">
                  {s.date_of_birth
                    ? new Date(s.date_of_birth).toLocaleDateString("en-US")
                    : ""}
                </td>
                <td className="p-2 border">{s.contact_number}</td>
                <td className="p-2 border">{s.address}</td>
                <td className="p-2 border">{s.father_name}</td>
                <td className="p-2 border">{s.father_contact}</td>
                <td className="p-2 border">{s.mother_name}</td>
                <td className="p-2 border">{s.mother_contact}</td>
                <td className="p-2 border text-center space-x-2">
                  <button
                    onClick={() => handleEdit(s)}
                    className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-[600px] relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              <IoClose size={24} />
            </button>
            <h3 className="text-lg font-semibold mb-4">
              {isEditing ? "Edit Student" : "Add Student"}
            </h3>

            <form onSubmit={handleSubmitStudent} className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="LRN (12 digits)"
                value={form.lrn}
                onChange={(e) => handleInputChange("lrn", e.target.value)}
                required
                className="border rounded p-2"
              />
              <input
                type="text"
                placeholder="LAST NAME"
                value={form.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                required
                className="border rounded p-2"
              />
              <input
                type="text"
                placeholder="FIRST NAME"
                value={form.first_name}
                onChange={(e) => handleInputChange("first_name", e.target.value)}
                required
                className="border rounded p-2"
              />
              <input
                type="text"
                placeholder="MIDDLE NAME"
                value={form.middle_name}
                onChange={(e) => handleInputChange("middle_name", e.target.value)}
                className="border rounded p-2"
              />
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                required
                className="border rounded p-2"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <input
                type="date"
                className="border rounded p-2 w-full"
                value={form.date_of_birth || ""}
                onChange={(e) =>
                  setForm({ ...form, date_of_birth: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="CONTACT NUMBER (09XXXXXXXXX)"
                value={form.contact_number}
                onChange={(e) =>
                  handleInputChange("contact_number", e.target.value)
                }
                required
                className="border rounded p-2"
              />
              <input
                type="text"
                placeholder="ADDRESS"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="border rounded p-2 col-span-2"
              />
              <input
                type="text"
                placeholder="FATHER'S NAME"
                value={form.father_name}
                onChange={(e) => handleInputChange("father_name", e.target.value)}
                required
                className="border rounded p-2"
              />
              <input
                type="text"
                placeholder="FATHER'S CONTACT (09XXXXXXXXX)"
                value={form.father_contact}
                onChange={(e) =>
                  handleInputChange("father_contact", e.target.value)
                }
                required
                className="border rounded p-2"
              />
              <input
                type="text"
                placeholder="MOTHER'S NAME"
                value={form.mother_name}
                onChange={(e) => handleInputChange("mother_name", e.target.value)}
                required
                className="border rounded p-2"
              />
              <input
                type="text"
                placeholder="MOTHER'S CONTACT (09XXXXXXXXX)"
                value={form.mother_contact}
                onChange={(e) =>
                  handleInputChange("mother_contact", e.target.value)
                }
                required
                className="border rounded p-2"
              />
              <div className="col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {isEditing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}