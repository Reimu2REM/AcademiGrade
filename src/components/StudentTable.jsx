import React, { useState } from "react";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from 'primereact/inputtext';
        

const initialStudents = [
  { id: "1", name: "Alice Johnson", scores: {} },
  { id: "2", name: "Bob Smith", scores: {} },
  { id: "3", name: "Charlie Brown", scores: {} },
  { id: "4", name: "Diana Williams", scores: {} },
  { id: "5", name: "Eva Martinez", scores: {} },
  { id: "6", name: "Frank 1", scores: {} },
  { id: "7", name: "Frank 2", scores: {} },
  { id: "8", name: "Frank 3", scores: {} },
  { id: "9", name: "Frank 4", scores: {} },
  { id: "10", name: "John edric del poso", scores: {} },
];

export const StudentTable = () => {
  const [students, setStudents] = useState(initialStudents);
  const [activities, setActivities] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: "",
    type: "Quiz",
    maxScore: 100,
  });

  const handleAddActivity = () => {
    if (!newActivity.title.trim()) return;

    const newAct = { ...newActivity, id: Date.now().toString() };
    setActivities((prev) => [...prev, newAct]);

    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        scores: { ...s.scores, [newAct.id]: null },
      }))
    );

    setNewActivity({ title: "", type: "Quiz", maxScore: 100 });
    setIsModalOpen(false);
  };

  const handleScoreChange = (studentId, activityId, value) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, scores: { ...s.scores, [activityId]: value } }
          : s
      )
    );
  };

  const calculateFinalGrade = (student) => {
    const scores = Object.values(student.scores).filter(
      (v) => v !== null && v !== undefined
    );
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / scores.length) * 100) / 100;
  };

  return (
    <div className="p-5 bg-white shadow rounded-lg  w-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Student Activities</h1>
          <p className="text-gray-500">Track and manage student performance</p>
        </div>
        <Button
          icon="pi pi-plus"
          label="New Activity"
          className="p-button-primary bg-yellow2 p-2 rounded-xl font-semibold hover:bg-Blue2 hover:text-white"
          onClick={() => setIsModalOpen(true)}
        />
      </div>

      <div className="overflow-auto max-h-[700px]">
        <table className="w-full border-collapse text-sm overflow-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left border text-center text-white text-nowrap bg-Blue2  ">Student Name</th>
              {activities.map((act) => (
                <th key={act.id} className="p-2 bg-Blue2 text-white  border text-center w-10">
                  {act.title} ({act.maxScore} pts)
                </th>
              ))}
              <th className="bg-Blue2 text-white p-2 border border-gray-200 text-center w-20">Final Grade</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr
                key={student.id}
                className="bg-white"
              >
                <td className="p-2 border  font-medium w-auto text-nowrap text-center">{student.name}</td>
                {activities.map((act) => (
                  <td key={act.id} className="p-2 border text-center">
                    <InputNumber
                      min={0}
                      max={act.maxScore}
                      value={student.scores[act.id]}
                      onValueChange={(e) =>
                        handleScoreChange(student.id, act.id, e.value)
                      }
                      showButtons
                      className="w-auto text-center "
                      inputClassName="w-10"
                    />
                  </td>
                ))}
                <td className="p-2 border text-center font-semibold">
                  {calculateFinalGrade(student) || "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Activity Modal */}
      <Dialog
        header="Add New Activity"
        visible={isModalOpen}
        style={{ width: "30vw" }}
        modal
        onHide={() => setIsModalOpen(false)}
        className="bg-white border  p-5 rounded-xl text-black font-semibold"
        
      >
        <br />
        <div className="flex flex-col gap-4">
          <input type="date" className="border rounded p-2" />
          <h2>Title</h2>
          <input
            type="text"
            value={newActivity.title}
            onChange={(e) =>
              setNewActivity({ ...newActivity, title: e.target.value })
            }
            placeholder="Activity Title"
            className="border  p-2 rounded"
          />
          <h2>Activity Type</h2>
          <Dropdown
            value={newActivity.type}
            options={[
              "Quiz",
              "Performance Task",
              "Exam",
              "Other Activity",
            ].map((t) => ({ label: t, value: t }))}
            onChange={(e) => setNewActivity({ ...newActivity, type: e.value })}
            placeholder="Select Type"
            className="w-full p-2 bg-yellow2 rounded"
            itemTemplate={(option) => {
              const isSelected = option.value === newActivity.type;
              return (
                <div
                  className={`
                    px-2 py-1 rounded cursor-pointer font-semibold
                    ${isSelected ? "bg-Blue2 font-semibold text-white" : "bg-white"}
                    hover:bg-gray-200
                  `}
                >
                  {option.label}
                </div>
              );
            }}
          />
          <h2>Max Score</h2>
          <InputNumber
            min={1}
            max={1000}
            value={newActivity.maxScore}
            onValueChange={(e) =>
              setNewActivity({ ...newActivity, maxScore: e.value })
            }
            className="w-full "
            inputClassName="p-2 rounded border"
          />

          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              className="p-button-text bg-yellow2 p-1 rounded-md hover:bg-Blue2 hover:text-white font-semibold"
              onClick={() => setIsModalOpen(false)}
              
            />
            <Button
              label="Save"
              className="p-button-primary bg-yellow2 p-1 rounded-md hover:bg-Blue2 hover:text-white font-semibold"
              onClick={handleAddActivity}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};
