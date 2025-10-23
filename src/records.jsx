import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "./config/supabaseclient";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ProfileMenu from "./components/ProfileMenu";

const Records = () => {
  const [visible, setVisible] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [user, setUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [sections, setSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [schoolYears, setSchoolYears] = useState([]);
  const [schoolYearFilter, setSchoolYearFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [studentCounts, setStudentCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  // Memoized data fetching
  const fetchData = useCallback(async () => {
  try {
    setLoading(true);
    setError("");

    // Get logged-in user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      setError("Unable to fetch user data");
      return;
    }
    setUser(user);

    // Get teacher profile
    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("id, profile_pic, school_id")
      .eq("auth_id", user.id)
      .single();

    if (teacherError || !teacher) {
      setError("Teacher profile not found");
      return;
    }

    if (teacher.profile_pic) setProfilePic(teacher.profile_pic);
    console.log("👤 Auth user:", user);
console.log("📚 Teacher record:", teacher);
console.log("🏫 School ID:", teacher?.school_id);


    const mySchoolId = teacher.school_id;
    const teacherId = teacher.id; // ✅ This is the correct teacher ID to use

    // Fetch school years and sections in parallel
    const [syResponse, sectionsResponse] = await Promise.all([
      supabase
        .from("school_years")
        .select("*")
        .order("start_date", { ascending: false }),
      supabase
        .from("sections")
        .select("id, name, grade_level, school_year_id")
        .eq("school_id", mySchoolId)
        .eq("adviser_id", teacherId) // ✅ Use teacher.id, not user.id
    ]);

    if (syResponse.error) console.error("School years error:", syResponse.error);
    if (sectionsResponse.error) console.error("Sections error:", sectionsResponse.error);

    if (syResponse.data) {
      setSchoolYears(syResponse.data);
      const activeSY = syResponse.data.find((sy) => sy.is_active);
      if (activeSY) setSchoolYearFilter(activeSY.id);
    }

    if (sectionsResponse.data) {
      setSections(sectionsResponse.data);

      // Fetch student counts for all sections
      const sectionIds = sectionsResponse.data.map((s) => s.id);
      if (sectionIds.length > 0) {
        const { data: studentsData, error: studErr } = await supabase
          .from("students")
          .select("section_id, gender")
          .in("section_id", sectionIds);

        if (studErr) console.error("Students error:", studErr);

        if (studentsData) {
          const counts = {};
          sectionIds.forEach((sid) => {
            const studentsInSection = studentsData.filter(
              (st) => st.section_id === sid
            );
            counts[sid] = {
              total: studentsInSection.length,
              male: studentsInSection.filter((st) => st.gender === "Male").length,
              female: studentsInSection.filter((st) => st.gender === "Female").length,
            };
          });
          setStudentCounts(counts);
        }
      }
    }

    setSuccess("Data loaded successfully");
    setTimeout(() => setSuccess(""), 3000);
  } catch (err) {
    setError("Failed to load data");
    console.error("Fetch error:", err);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Enhanced filtering with gender support
  useEffect(() => {
    let result = sections;

    if (gradeFilter) {
      result = result.filter((s) => Number(s.grade_level) === Number(gradeFilter));
    }

    if (schoolYearFilter) {
      result = result.filter((s) => s.school_year_id === schoolYearFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(term) ||
        s.grade_level.toString().includes(term)
      );
    }

    // Apply gender filter to count display
    if (genderFilter) {
      result = result.filter(section => {
        const count = studentCounts[section.id] || { total: 0, male: 0, female: 0 };
        return genderFilter === "Male" ? count.male > 0 : 
               genderFilter === "Female" ? count.female > 0 : true;
      });
    }

    setFilteredSections(result);
  }, [sections, gradeFilter, schoolYearFilter, searchTerm, genderFilter, studentCounts]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setGradeFilter("");
    setSchoolYearFilter("");
    setGenderFilter("");
  };

  // Get active filters count
  const activeFiltersCount = [searchTerm, gradeFilter, schoolYearFilter, genderFilter].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar setVisible={setVisible} user={user} profilePic={profilePic} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your sections...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar setVisible={setVisible} user={user} profilePic={profilePic} />
      <Sidebar visible={visible} setVisible={setVisible} />
      {showMenu && <ProfileMenu profilePic={profilePic} userEmail={user?.email} />}

      {showLogout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Confirm Logout</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogout(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/");
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-gray-800">My Sections</h1>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          
          {/* Status Messages */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Filters</h2>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                Clear all ({activeFiltersCount})
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Sections
              </label>
              <input
                type="text"
                placeholder="Search by name or grade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value ? Number(e.target.value) : "")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Grades</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    Grade {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School Year
              </label>
              <select
                value={schoolYearFilter}
                onChange={(e) => setSchoolYearFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Years</option>
                {schoolYears.map((sy) => (
                  <option key={sy.id} value={sy.id}>
                    {sy.start_date?.slice(0, 4)}-{sy.end_date?.slice(0, 4)}
                    {sy.is_active && " (Current)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Students</option>
                <option value="Male">Male Only</option>
                <option value="Female">Female Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">
            Showing {filteredSections.length} of {sections.length} sections
          </p>
          {filteredSections.length > 0 && (
            <div className="text-sm text-gray-500">
              Total Students: {Object.values(studentCounts).reduce((sum, count) => sum + count.total, 0)}
            </div>
          )}
        </div>

        {/* Sections Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-8V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v1M9 7h6" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sections found</h3>
              <p className="text-gray-500 mb-4">
                {sections.length === 0 
                  ? "You don't have any sections assigned yet." 
                  : "Try adjusting your filters to see more results."}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["Grade Level", "Section", "School Year", "Students", "Gender Distribution", "Actions"].map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSections.map((section) => {
                    const sy = schoolYears.find((s) => s.id === section.school_year_id);
                    const count = studentCounts[section.id] || { total: 0, male: 0, female: 0 };
                    
                    return (
                      <tr key={section.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Grade {section.grade_level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {section.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {sy ? `${sy.start_date?.slice(0, 4)}-${sy.end_date?.slice(0, 4)}` : "N/A"}
                          {sy?.is_active && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                          {count.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-blue-600">♂ {count.male}</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-pink-600">♀ {count.female}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/students/${section.id}`)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                              Students
                            </button>
                            <button
                              onClick={() => navigate(`/gradebook/${section.id}`)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                            >
                              Grades
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Records;