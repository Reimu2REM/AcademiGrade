import React, { useState, useEffect } from "react";
import supabase from "../config/supabaseclient";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";

export default function AdminGrades() {
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSY, setSelectedSY] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [manageSY, setManageSY] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [viewSection, setViewSection] = useState(null); // New state for viewing

  const [newSY, setNewSY] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [sectionName, setSectionName] = useState("");
  const [adviser, setAdviser] = useState(null);
  const [gradeLevel, setGradeLevel] = useState(null);
  const [subjectAssignments, setSubjectAssignments] = useState({});

  const gradeLevels = [
    { id: 4, name: "4" }, { id: 5, name: "5" }, { id: 6, name: "6" },
    { id: 7, name: "7" }, { id: 8, name: "8" }, { id: 9, name: "9" }, { id: 10, name: "10" }
  ];

  const subjects = ["English","Science","Mathematics","Filipino","AP","ESP","TLE","MAPEH"];

  useEffect(() => {
    fetchSchoolYears();
    fetchTeachers();
    fetchSections();
  }, []);

  const fetchSchoolYears = async () => {
    const { data, error } = await supabase.from("school_years").select("*").order("start_date");
    if (error) return alert("Error loading school years: " + error.message);
    setSchoolYears(data || []);
    if (data?.length) setSelectedSY(data.find(sy => sy.is_active) || data[data.length - 1]);
  };

  const fetchTeachers = async () => {
    const { data, error } = await supabase.from("teachers").select("id, fullname");
    if (error) return alert("Error fetching teachers: " + error.message);
    setTeachers(data.map(t => ({ id: t.id, name: t.fullname })));
  };

  const fetchSections = async () => {
    try {
      const { data: sectionsData, error: secErr } = await supabase.from("sections").select("*");
      if (secErr) throw secErr;

      const { data: assignmentsData, error: assignErr } = await supabase.from("subject_assignments").select("*");
      if (assignErr) throw assignErr;

      const sectionsWithAssignments = sectionsData.map(section => {
        const assignments = {};
        assignmentsData.filter(sa => sa.section_id === section.id)
          .forEach(sa => { assignments[sa.subject_name] = sa.teacher_id; });
        return { ...section, subjects: assignments };
      });

      setSections(sectionsWithAssignments);
    } catch (err) {
      alert("Error fetching sections: " + err.message);
    }
  };

  const addSchoolYear = async () => {
    if (!newSY || !startDate || !endDate) return alert("Fill all fields");
    const { error } = await supabase.from("school_years")
      .insert([{ sy_label: newSY, start_date: startDate, end_date: endDate, is_active: false }]);
    if (error) return alert("Insert failed: " + error.message);
    setNewSY(""); setStartDate(""); setEndDate("");
    await fetchSchoolYears();
  };

  const setActiveSY = async (id) => {
    await supabase.from("school_years").update({ is_active: false }).neq("id", id);
    const { error } = await supabase.from("school_years").update({ is_active: true }).eq("id", id);
    if (error) return alert("Failed to set active: " + error.message);
    await fetchSchoolYears();
  };

  const resetForm = () => {
    setSectionName(""); setAdviser(null); setGradeLevel(null); setSubjectAssignments({});
    setEditingSectionId(null);
  };

  const handleSave = async () => {
    if (!sectionName || !adviser || !gradeLevel || !selectedSY) return alert("Please complete all fields.");

    try {
      let sectionId = editingSectionId;

      if (editingSectionId) {
        // Update existing section
        const { error } = await supabase.from("sections")
          .update({ name: sectionName, grade_level: gradeLevel.name, adviser_id: adviser.id, school_year_id: selectedSY.id })
          .eq("id", editingSectionId);
        if (error) throw error;

        // Delete old subject assignments
        await supabase.from("subject_assignments").delete().eq("section_id", editingSectionId);
      } else {
        const { data: newSection, error } = await supabase.from("sections")
          .insert([{ name: sectionName, grade_level: gradeLevel.name, adviser_id: adviser.id, school_year_id: selectedSY.id }])
          .select().single();
        if (error) throw error;
        sectionId = newSection.id;
      }

      const assignmentsToInsert = Object.entries(subjectAssignments)
        .filter(([subj, teacherId]) => teacherId)
        .map(([subj, teacherId]) => ({
          section_id: sectionId,
          teacher_id: teacherId,
          school_year_id: selectedSY.id,
          subject_name: subj
        }));

      if (assignmentsToInsert.length) {
        const { error } = await supabase.from("subject_assignments").insert(assignmentsToInsert);
        if (error) throw error;
      }

      await fetchSections();
      resetForm();
      setShowModal(false);
      alert("Section saved successfully!");
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  };

  const teacherTemplate = (opt, props) =>
    opt ? (<div className="flex items-center"><i className="pi pi-user mr-2 text-blue-500"></i>{opt.name}</div>)
        : <span>{props.placeholder}</span>;

  return (
    <div className="p-6">
      <div className="border border-black p-6 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="font-semibold text-2xl">Section Management</h1>
          <Dropdown value={selectedSY} onChange={(e) => setSelectedSY(e.value)}
            options={schoolYears} optionLabel="sy_label" placeholder="School Year"
            className="bg-yellow2 p-2 rounded-lg font-semibold w-44" />
          <div className="flex">
            <Button label="Manage S.Y" onClick={() => setManageSY(true)}
              className="bg-yellow2 hover:bg-Blue2 hover:text-white p-2 rounded-lg font-semibold m-1" />
            <Button label="Add Section" icon="pi pi-plus" onClick={() => setShowModal(true)}
              className="bg-yellow2 hover:bg-Blue2 hover:text-white p-2 rounded-lg font-semibold m-1" />
          </div>
        </div>

        {/* Section Cards */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {sections.map(section => {
            const adviserName = teachers.find(t => t.id === section.adviser_id)?.name || "N/A";
            return (
              <div key={section.id} className="border p-4 rounded shadow cursor-pointer hover:bg-gray-100"
                onClick={() => setViewSection(section)} // Open view modal
              >
                <div className="font-semibold">{section.grade_level} - {section.name}</div>
                <div className="text-sm text-gray-600 mt-1">Adviser: {adviserName}</div>
              </div>
            );
          })}
        </div>

        {/* View Section Modal */}
        <Dialog header={viewSection ? `Section: ${viewSection.name}` : ""} visible={!!viewSection} onHide={() => setViewSection(null)}
          className="bg-white shadow-2xl p-5 rounded-xl font-semibold" style={{ width: "40vw" }}>
          {viewSection && (
            <div className="space-y-4">
              <div>Grade Level: {viewSection.grade_level}</div>
              <div>Adviser: {teachers.find(t => t.id === viewSection.adviser_id)?.name || "N/A"}</div>
              <div className="space-y-2">
                {subjects.map(subj => (
                  <div key={subj} className="flex justify-between border p-2 rounded">
                    <span>{subj}</span>
                    <span>{teachers.find(t => t.id === viewSection.subjects?.[subj])?.name || "Unassigned"}</span>
                  </div>
                ))}
              </div>
              <Button label="Edit" icon="pi pi-pencil" className="mt-4 bg-yellow2 hover:bg-Blue2 hover:text-white"
                onClick={() => {
                  setSectionName(viewSection.name);
                  setGradeLevel(gradeLevels.find(gl => gl.name === viewSection.grade_level));
                  setAdviser(teachers.find(t => t.id === viewSection.adviser_id));
                  setSubjectAssignments(viewSection.subjects || {});
                  setEditingSectionId(viewSection.id);
                  setShowModal(true);
                  setViewSection(null);
                }}
              />
            </div>
          )}
        </Dialog>

        {/* Manage School Years Modal */}
        <Dialog header="Manage School Years" visible={manageSY} onHide={() => setManageSY(false)}
          className="bg-white p-5 rounded-lg shadow-xl" style={{ width: "auto" }}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 border p-2 rounded">
              <label>S.Y:</label>
              <input type="text" value={newSY} onChange={(e) => setNewSY(e.target.value)}
                placeholder="2025-2026" className="border px-2 py-1 rounded" />
              <label>Start:</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="border px-2 py-1 rounded" />
              <label>End:</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="border px-2 py-1 rounded" />
              <Button label="Add" icon="pi pi-plus" onClick={addSchoolYear}
                className="bg-yellow2 hover:bg-Blue2 hover:text-white p-2 rounded-lg font-semibold" />
            </div>

            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-Blue2 text-white">
                  <th className="border px-3 py-2">S.Y</th>
                  <th className="border px-3 py-2">Start</th>
                  <th className="border px-3 py-2">End</th>
                  <th className="border px-3 py-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {schoolYears.map((sy) => (
                  <tr key={sy.id} className="text-center">
                    <td className="border px-3 py-2">{sy.sy_label}</td>
                    <td className="border px-3 py-2">{sy.start_date}</td>
                    <td className="border px-3 py-2">{sy.end_date}</td>
                    <td className="border px-3 py-2">
                      {sy.is_active
                        ? <span className="text-green-600 font-semibold">Active</span>
                        : <span className="text-blue-600 cursor-pointer underline"
                            onClick={() => setActiveSY(sy.id)}>Set Active</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Dialog>

        {/* Add/Edit Section Modal */}
        <Dialog header="Add/Edit Section" visible={showModal} onHide={() => { resetForm(); setShowModal(false); }}
          className="bg-white shadow-2xl p-5 rounded-xl font-semibold" style={{ width: "40vw" }}>
          <div className="space-y-4">
            <div className="flex">
              <input type="text" placeholder="Section Name" value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="w-full p-2 border rounded" />
              <Dropdown value={gradeLevel} options={gradeLevels} onChange={(e) => setGradeLevel(e.value)}
                optionLabel="name" placeholder="Grade Level" className="border p-2 ml-2 w-full rounded" showClear />
            </div>
            <Dropdown value={adviser} options={teachers} onChange={(e) => setAdviser(e.value)}
              optionLabel="name" placeholder="Select Adviser"
              className="w-full border p-4 rounded bg-yellow2 font-semibold"
              valueTemplate={teacherTemplate} itemTemplate={teacherTemplate} showClear filter />

            {/* Assign subjects */}
            {subjects.map(subj => (
              <div key={subj} className="flex justify-between items-center border p-2 rounded">
                <span className="font-medium">{subj}</span>
                <Dropdown value={teachers.find(t => t.id === subjectAssignments[subj]) || null} options={teachers}
                  onChange={(e) => setSubjectAssignments({ ...subjectAssignments, [subj]: e.value?.id })}
                  optionLabel="name" placeholder="Assign Teacher"
                  className="w-1/2 border p-2 rounded bg-white" showClear filter />
              </div>
            ))}

            <Button label="Save" onClick={handleSave}
              className="bg-yellow2 p-2 rounded-lg font-semibold" />
          </div>
        </Dialog>
      </div>
    </div>
  );
}
