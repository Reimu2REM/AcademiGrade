import React from "react";
import { MdEdit, MdDelete } from "react-icons/md";

const SectionCard = ({ section, onClick, onDelete, onUpdate }) => {
  return (
    <div
      className="bg-white p-5 rounded-lg shadow-2xl text-black flex justify-between items-center cursor-pointer hover:bg-gray-100 transition"
      onClick={() => onClick(section)} // open modal on click
    >
      {/* Section Info */}
      <div>
        <strong className="text-lg">{section.name}</strong>
        <br />
        <span className="text-gray-600">
          {section.studentCount ?? (section.students?.length || 0)} students
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {/* ✏️ Edit Button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // prevent opening modal
            const newName = prompt("Enter new section name:", section.name);
            if (newName && newName.trim()) {
             onUpdate(newName.trim());// ✅ send ID and NAME separately
            }
          }}
          className="bg-yellow2 px-3 py-1 rounded hover:bg-Blue2 hover:text-white"
        >
          <MdEdit />
        </button>

        {/*Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm("Delete this section?")) {
              onDelete(section.id);
            }
          }}
          className="bg-yellow2 text-black px-3 py-1 rounded hover:bg-Blue2 hover:text-white"
        >
          <MdDelete />
        </button>
      </div>
    </div>
  );
};

export default SectionCard;
