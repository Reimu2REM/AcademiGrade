import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import supabase from "./config/supabaseclient";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";

const SectionGrading = () => {
  const [visible, setVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSY, setSelectedSY] = useState(null);
  const [filterGrade, setFilterGrade] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sections, setSections] = useState([]);

  const navigate = useNavigate();

  const [gradeLevels] = useState(
    Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: (i + 1).toString() }))
  );

  // --- Fetch current user + teacher info ---
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();
      if (error) return console.error("Error fetching user:", error.message);
      setUser(authUser);

      // 🔹 Get teacher details using auth_id
      const { data: teacher, error: teacherError } = await supabase
        .from("teachers")
        .select("id, school_id, profile_pic")
        .eq("auth_id", authUser.id)
        .single();

      if (teacherError) {
        console.error("Error fetching teacher info:", teacherError.message);
        return;
      }

      if (teacher) {
        setSchoolId(teacher.school_id);
        setProfilePic(teacher.profile_pic || null);

        // Fetch assigned sections using the correct teacher ID
        fetchTeacherAssignments(teacher.id, teacher.school_id);
      }
    };

    fetchUser();
  }, []);

  // --- Fetch School Years ---
  useEffect(() => {
    if (!schoolId) return;

    const fetchSY = async () => {
      const { data, error } = await supabase
        .from("school_years")
        .select("*")
        .order("start_date");

      if (error) return console.error("Error fetching school years:", error.message);

      setSchoolYears(data);
      if (data?.length) {
        setSelectedSY(data.find((sy) => sy.is_active) || data[data.length - 1]);
      }
    };

    fetchSY();
  }, [schoolId]);

  // --- Fetch Sections + Assignments for logged-in teacher ---
  const fetchTeacherAssignments = async (teacherId, schoolId) => {
    try {
      const { data: assignments, error: assignError } = await supabase
        .from("subject_assignments")
        .select(`
          id,
          section_id,
          subject_name,
          section:sections (
            id,
            name,
            grade_level,
            school_year_id,
            school_year:school_years(*),
            students:students(*)
          )
        `)
        .eq("teacher_id", teacherId)
        .eq("school_id", schoolId);

      if (assignError) throw assignError;

      if (!assignments?.length) {
        setSections([]);
        return;
      }

      // Group by section
      const grouped = assignments.reduce((acc, a) => {
        if (!a.section) return acc;
        if (!acc[a.section.id]) {
          acc[a.section.id] = { ...a.section, subjects: [] };
        }
        acc[a.section.id].subjects.push(a.subject_name);
        return acc;
      }, {});

      setSections(Object.values(grouped));
    } catch (err) {
      console.error("Error fetching teacher sections:", err.message);
    }
  };

  // --- Filters ---
  const filteredSections = sections.filter((sec) => {
    const matchesSY = !selectedSY || sec.school_year_id === selectedSY.id;
    const matchesGrade = !filterGrade || sec.grade_level === filterGrade.name;
    const matchesSearch = sec.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSY && matchesGrade && matchesSearch;
  });

  return (
    <div className="bg-gray-50">
      <Navbar setVisible={setVisible} user={user} profilePic={profilePic} />
      <Sidebar visible={visible} setVisible={setVisible} />

      <main className="p-4 transition-all duration-300">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Section Grading</h1>
          <p className="text-gray-600">Manage grades for your assigned sections</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Section
              </label>
              <input
                type="text"
                placeholder="Enter section name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <Dropdown
                value={filterGrade}
                options={gradeLevels}
                onChange={(e) => setFilterGrade(e.value)}
                optionLabel="name"
                placeholder="All Grades"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 "
                panelClassName="bg-white p-2 shadow-lg border border-gray-200 rounded-lg"
                showClear
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School Year
              </label>
              <Dropdown
                value={selectedSY}
                options={schoolYears}
                onChange={(e) => setSelectedSY(e.value)}
                optionLabel="sy_label"
                placeholder="Select School Year"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 "
                panelClassName="bg-white p-2 shadow-lg border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-gray-600">
            Showing {filteredSections.length} section{filteredSections.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Sections Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 14v6l9-5m-9 5l-9-5" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg mb-2">No sections found</p>
              <p className="text-gray-400 text-sm">
                {sections.length === 0
                  ? "You don't have any assigned sections yet."
                  : "Try adjusting your filters to see more results."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Section
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subjects
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      School Year
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Students
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSections.map((sec) => (
                    <tr key={sec.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Grade {sec.grade_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                        {sec.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {sec.subjects?.length > 0 ? (
                            sec.subjects.map((subj) => (
                              <button
                                key={subj}
                                onClick={() => navigate(`/subjectgrade/${sec.id}`)}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                              >
                                {subj}
                              </button>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">No subjects</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {sec.school_year?.sy_label || "N/A"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-gray-400 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                            />
                          </svg>
                          <span className="text-sm text-gray-600">{sec.students?.length || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">
                        <Button
                          label="View Grades"
                          icon="pi pi-table"
                          className="underline"
                          onClick={() => navigate(`/subjectgrade/${sec.id}`)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SectionGrading;
