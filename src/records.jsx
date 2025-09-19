import React, { useState, useEffect } from "react";
import supabase from "./config/supabaseclient";

// Components
import Navbar from "./components/Navbar";
import ProfileMenu from "./components/ProfileMenu";
import Sidebar from "./components/Sidebar";
import SectionCard from "./components/SectionCard";
import SectionModal from "./components/SectionModal";
import StudentModal from "./components/StudentModal";

const Records = () => {
  const [visible, setVisible] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [user, setUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);

  // Sections
  const [sections, setSections] = useState([]);
  const [sectionName, setSectionName] = useState("");
  const [currentSection, setCurrentSection] = useState(null);

  // Students
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    lrn: "",
    firstname: "",
    middlename: "",
    lastname: "",
    birthdate: "",
    contact_number: "",
  });

  // ✅ Fetch current user and their sections + profile pic
  useEffect(() => {
    const fetchData = async () => {
      const { data: userData, error } = await supabase.auth.getUser();
      if (!error && userData?.user) {
        setUser(userData.user);
        await loadSections(userData.user.id);

        // 🔑 Load profile picture from teachers table
        const { data: teacher, error: teacherError } = await supabase
          .from("teachers")
          .select("profile_pic")
          .eq("auth_id", userData.user.id)
          .single();

        if (!teacherError && teacher?.profile_pic) {
          setProfilePic(teacher.profile_pic);
        }
      }
    };
    fetchData();
  }, []);

  // ✅ Load sections and student counts
  const loadSections = async (teacherId) => {
    const { data: sectionsData, error } = await supabase
      .from("sections")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: true });

    if (!error) {
      const sectionsWithCounts = await Promise.all(
        sectionsData.map(async (section) => {
          const { data: studentsData, error: studentError } = await supabase
            .from("students")
            .select("id")
            .eq("section_id", section.id);
          return {
            ...section,
            studentCount: studentError ? 0 : studentsData.length,
          };
        })
      );
      setSections(sectionsWithCounts);
    } else {
      console.error("Error loading sections:", error.message);
    }
  };

  // ✅ Load students for a section
  const loadStudents = async (sectionId) => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("section_id", sectionId)
      .order("lastname", { ascending: true });

    if (!error) {
      const studentsWithDisplay = data.map((s) => ({
        ...s,
        displayName: `${s.firstname} ${
          s.middlename ? s.middlename.charAt(0).toUpperCase() + "." : ""
        } ${s.lastname}`,
      }));

      setCurrentSection((prev) => ({
        ...prev,
        students: studentsWithDisplay,
        studentCount: studentsWithDisplay.length,
      }));

      setSections((prev) =>
        prev.map((sec) =>
          sec.id === sectionId
            ? { ...sec, studentCount: studentsWithDisplay.length }
            : sec
        )
      );
    } else {
      console.error("Error loading students:", error.message);
    }
  };

  // ✅ Add Section
  const addSection = async () => {
    if (!sectionName.trim() || !user) return;
    const { data, error } = await supabase
      .from("sections")
      .insert([
        {
          name: sectionName.trim(),
          teacher_id: user.id,
          teacher_email: user.email,
        },
      ])
      .select();

    if (!error && data?.length) {
      const newSec = { ...data[0], studentCount: 0 };
      setSections((prev) => [...prev, newSec]);
      setSectionName("");
    } else {
      console.error("Error adding section:", error?.message);
    }
  };

  // ✅ Add Student
  const addStudent = async () => {
    if (!newStudent.lrn || !newStudent.firstname || !newStudent.lastname) return;

    const { data, error } = await supabase
      .from("students")
      .insert([
        {
          lrn: newStudent.lrn,
          firstname: newStudent.firstname.trim(),
          middlename: newStudent.middlename.trim() || null,
          lastname: newStudent.lastname.trim(),
          birthdate: newStudent.birthdate || null,
          contact_number: newStudent.contact_number || null,
          section_id: currentSection.id,
          teacher_id: user.id,
          teacher_email: user.email,
        },
      ])
      .select();

    if (!error && data?.length) {
      console.log("New student added:", data[0]);
      await loadStudents(currentSection.id);
      setNewStudent({
        lrn: "",
        firstname: "",
        middlename: "",
        lastname: "",
        birthdate: "",
        contact_number: "",
      });
      setShowStudentModal(false);
    } else {
      alert("Error adding student: " + error.message);
    }
  };

  // ✅ Delete Section
  const deleteSection = async (id) => {
    if (window.confirm("Are you sure you want to delete this section?")) {
      const { error } = await supabase.from("sections").delete().eq("id", id);
      if (!error) {
        setSections((prev) => prev.filter((sec) => sec.id !== id));
        if (currentSection?.id === id) setCurrentSection(null);
      } else {
        console.error("Error deleting section:", error.message);
      }
    }
  };

  // ✅ Update Section
  const updateSection = async (id, newName) => {
    console.log("Updating section:", id, "to name:", newName);
    const { error } = await supabase
      .from("sections")
      .update({ name: newName })
      .eq("id", id);
    if (error) {
      console.error("Error updating section:", error.message);
    } else {
      await loadSections(user.id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar with profilePic support */}
      <Navbar
        setVisible={setVisible}
        user={user}
        profilePic={profilePic}
        setProfilePic={setProfilePic}
      />

      <Sidebar visible={visible} setVisible={setVisible} />

      {showMenu && (
        <ProfileMenu
          profilePic={profilePic}
          userEmail={user?.email}
          setShowLogout={setShowLogout}
        />
      )}

      {showLogout && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border p-6 rounded shadow z-50">
          <h1 className="font-bold mb-4">Do you want to log out?</h1>
          <div className="flex justify-end gap-2">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
              className="bg-yellow2 px-3 py-1 rounded"
            >
              Yes
            </button>
            <button
              onClick={() => setShowLogout(false)}
              className="border px-3 py-1 rounded"
            >
              No
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 p-6 bg-gray-50">
        <h1 className="text-3xl font-bold mb-6">Sections</h1>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            placeholder="Enter section name"
            className=" outline outline-Blue2 p-2 rounded w-64"
          />
          <button
            onClick={addSection}
            className="bg-yellow2 text-black font-semibold px-4 py-2 rounded hover:bg-Blue2 hover:text-white transition"
          >
            Add Section
          </button>
        </div>

        {sections.length === 0 ? (
          <p className="text-gray-500">No sections yet. Add one above!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                onClick={async () => {
                  setCurrentSection(section);
                  await loadStudents(section.id);
                }}
                onDelete={() => deleteSection(section.id)}
                onUpdate={(newName) => updateSection(section.id, newName)}
              />
            ))}
          </div>
        )}
      </div>

      {currentSection && (
        <SectionModal
          section={currentSection}
          onClose={() => setCurrentSection(null)}
          onAddStudent={() => setShowStudentModal(true)}
          students={currentSection.students || []}
          selectedIds={selectedIds}
          onSelect={() => {}}
          onSelectAll={() => {}}
        />
      )}

      {showStudentModal && currentSection && (
        <StudentModal
          selectedSection={currentSection}
          newStudent={newStudent}
          setNewStudent={setNewStudent}
          addStudent={addStudent}
          onClose={() => setShowStudentModal(false)}
        />
      )}
    </div>
  );
};

export default Records;
