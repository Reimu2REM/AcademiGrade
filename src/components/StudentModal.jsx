import React from "react";

const StudentModal = ({
  selectedSection,
  newStudent,
  setNewStudent,
  addStudent,
  deleteStudent,
  onClose,
}) => {
  const handleInputChange = (field, value) => {
    let formatted = value;
    if (field === "lrn" || field === "contact") {
      formatted = value.replace(/\D/g, "");
      if (field === "lrn") formatted = formatted.slice(0, 12);
      if (field === "contact") formatted = formatted.slice(0, 11);
    }
    if (["firstname", "middlename", "lastname"].includes(field)) {
      formatted = value.replace(/[^A-Za-z\s]/g, "");
    }
    setNewStudent({ ...newStudent, [field]: formatted });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded w-[500px]">
        <h2 className="text-xl font-bold mb-4">{selectedSection.name} – Students</h2>

        {/* Form */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="LRN"
            value={newStudent.lrn}
            onChange={(e) => handleInputChange("lrn", e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="First Name"
            value={newStudent.firstname}
            onChange={(e) => handleInputChange("firstname", e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Middle Name"
            value={newStudent.middlename}
            onChange={(e) => handleInputChange("middlename", e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={newStudent.lastname}
            onChange={(e) => handleInputChange("lastname", e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="date"
            value={newStudent.birthdate}
            onChange={(e) => handleInputChange("birthdate", e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Contact Number"
            value={newStudent.contact}
            onChange={(e) => handleInputChange("contact", e.target.value)}
            className="border p-2 rounded"
          />
        </div>

        <button
          onClick={addStudent}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mt-4 w-full"
        >
          Add Student
        </button>

        {/* Student List */}
        <ul className="mt-4 space-y-2">
          {(selectedSection.students || []).map((stu) => (
            <li
              key={stu.id}
              className="flex justify-between items-center border-b pb-1"
            >
              {stu.name} — {stu.lrn}
              <button
                onClick={() => deleteStudent(stu.id)}
                className="text-red-500 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded w-full mt-4"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default StudentModal;
