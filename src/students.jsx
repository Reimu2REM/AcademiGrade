import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "./config/supabaseclient";
import Papa from "papaparse";
import { IoClose } from "react-icons/io5";

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
    name: "",
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

    if (sortBy.gender) {
      filteredData = filteredData.filter(
        (s) => s.gender.toLowerCase() === sortBy.gender.toLowerCase()
      );
    }

    if (sortBy.name === "asc") {
      filteredData.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy.name === "desc") {
      filteredData.sort((a, b) => b.name.localeCompare(a.name));
    }

    setFiltered(filteredData);
  }, [search, sortBy, students]);

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
    } else if (key === "name" || key === "father_name" || key === "mother_name") {
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
    if (!form.lrn || form.lrn.length !== 12) return alert("LRN must be 12 digits");
    if (!form.name) return alert("Name is required");
    if (!form.gender) return alert("Gender is required");
    if (!form.date_of_birth) return alert("Date of birth is required");
    return true;
  };

  // ➕ Add / Edit student
  const handleSubmitStudent = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const studentData = { ...form, section_id };

    if (isEditing) {
      const { error } = await supabase
        .from("students")
        .update(studentData)
        .eq("id", editId);
      if (error) {
        console.error(error);
        alert("Error updating student!");
      } else {
        alert("Student updated!");
        setShowModal(false);
        setIsEditing(false);
        fetchStudents();
      }
    } else {
      const { error } = await supabase.from("students").insert([studentData]);
      if (error) {
        console.error(error);
        alert("Error adding student!");
      } else {
        alert("Student added!");
        setShowModal(false);
        fetchStudents();
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
            if (!lrn || !name || !gender) return null;

            let dob = r.date_of_birth?.trim();
            if (dob && dob.includes("/")) {
              const [m, d, y] = dob.split("/");
              dob = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
            }

            return {
              lrn,
              name,
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
          .upsert(data, { onConflict: ["lrn"] }); // ✅ Upsert by LRN

        if (error) {
          console.error("Supabase upsert error:", error);
          alert("❌ Error importing data into Supabase!");
        } else {
          alert("✅ CSV imported successfully (duplicates ignored/updated)!");
          fetchStudents();
        }
      } catch (err) {
        console.error("CSV Import Error:", err);
        alert("❌ Failed to process CSV!");
      }
    },
  });
};


  const handleEdit = (student) => {
    setForm(student);
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
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
            id="csvInput"
          />
          <label
            htmlFor="csvInput"
            className="px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700"
          >
            Import CSV
          </label>
          <button
            onClick={() => {
              setForm({
                lrn: "",
                name: "",
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

      {/* Sorting Filters */}
      <div className="flex gap-3 mb-4">
        <select
          className="border rounded-lg p-2"
          onChange={(e) => setSortBy({ ...sortBy, gender: e.target.value })}
          value={sortBy.gender}
        >
          <option value="">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <select
          className="border rounded-lg p-2"
          onChange={(e) => setSortBy({ ...sortBy, name: e.target.value })}
          value={sortBy.name}
        >
          <option value="">Name Sort</option>
          <option value="asc">A → Z</option>
          <option value="desc">Z → A</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">LRN</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Gender</th>
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
                placeholder="NAME"
                value={form.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
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
