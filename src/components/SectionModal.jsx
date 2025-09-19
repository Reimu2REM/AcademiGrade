import React, { useState } from "react";
import { IoClose } from "react-icons/io5";

const SectionModal = ({
  section,
  onClose,
  onAddStudent,
  onDeleteSelected,
  students,
  selectedIds,
  onSelect,
  onSelectAll,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  //  Filter students by LRN or Name
  const filteredStudents = students.filter(
    (s) =>
      s.lrn.toString().includes(searchTerm) ||
      s.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  //  Check if all filtered students are selected
  const allSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedIds.has(s.id));

  //  Delete only filtered + selected students
  const handleDeleteFilteredSelected = () => {
    const toDelete = filteredStudents
      .filter((s) => selectedIds.has(s.id))
      .map((s) => s.id);

    onDeleteSelected(toDelete);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="motion-preset-expand motion-duration-100 bg-white p-6 rounded-lg w-full h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold mb-4">{section.name}</h2>
          <IoClose
            onClick={onClose}
            className="text-black text-4xl cursor-pointer"
          />
        </div>

        {/* Actions */}
        <div className="mb-4 flex items-center gap-2">
          <button
            className="bg-yellow2 text-black px-4 py-2 rounded-lg hover:bg-Blue2 hover:text-white font-semibold"
            onClick={onAddStudent}
          >
            + Add Student
          </button>
          <button
            className="px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-600"
            onClick={handleDeleteFilteredSelected}
            disabled={
              !filteredStudents.some((s) => selectedIds.has(s.id))
            }
          >
            Delete Selected
          </button>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search by LRN or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border p-2 rounded w-64 ml-auto"
          />
        </div>

        {/* Table */}
        <div className="overflow-auto">
          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) =>
                      onSelectAll(filteredStudents, e.target.checked)
                    }
                  />
                </th>
                <th className="border px-2 py-1 text-center">LRN</th>
                <th className="border px-2 py-1 text-center">Name</th>
                <th className="border px-2 py-1 text-center">Birthdate</th>
                <th className="border px-2 py-1 text-center">Contact</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.id}>
                  <td className="border px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => onSelect(s.id)}
                    />
                  </td>
                  <td className="border px-2 py-1 text-center">{s.lrn}</td>
                  <td className="border px-2 py-1 text-center">{s.displayName}</td>
                  <td className="border px-2 py-1 text-center">{s.birthdate || "-"}</td>
                  <td className="border px-2 py-1 text-center">{s.contact_number || "-"}</td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-500">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SectionModal;
