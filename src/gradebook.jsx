import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "./config/supabaseclient";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { ProgressSpinner } from "primereact/progressspinner";

export default function Gradebook() {
  const { section_id } = useParams();
  const navigate = useNavigate();

  const [sectionInfo, setSectionInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("name");

  const sortOptions = [
    { label: "Name A-Z", value: "name" },
    { label: "Name Z-A", value: "name_desc" },
    { label: "LRN", value: "lrn" },
  ];

  const quarters = ["Q1", "Q2", "Q3", "Q4"];

  // Load section, students, subjects, and school years
  useEffect(() => {
    if (section_id) fetchInitialData();
  }, [section_id]);

  // Load grades whenever subjects or selected school year changes
  useEffect(() => {
    if (subjects.length && selectedSchoolYear) {
      fetchGrades();
    }
  }, [subjects, selectedSchoolYear]);

  // ✅ Fetch section info, students, subjects, and school years
  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // 1️⃣ Section details
      const { data: section, error: sectionError } = await supabase
        .from("sections")
        .select(
          "id, name, grade_level, school_id, school_year_id, school_years(sy_label)"
        )
        .eq("id", section_id)
        .single();

      if (sectionError) throw sectionError;
      setSectionInfo(section);

      // 2️⃣ Students in section
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, lrn, name, gender")
        .eq("section_id", section_id)
        .order("name", { ascending: true });

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // 3️⃣ Subjects (via subject_assignments)
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subject_assignments")
        .select(`id, subject_name, teacher_id, teachers:teacher_id(fullname)`)
        .eq("section_id", section_id);

      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);

      // 4️⃣ All school years
      const { data: syData, error: syError } = await supabase
        .from("school_years")
        .select("*")
        .order("sy_label", { ascending: true });

      if (syError) throw syError;
      setSchoolYears(syData || []);

      // Auto-select current section’s school year
      setSelectedSchoolYear(section.school_year_id);
    } catch (err) {
      console.error("Error loading data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch grades based on school year + subjects
  const fetchGrades = async () => {
    try {
      setLoading(true);

      const subjectIds = subjects.map((s) => s.id);
      if (!subjectIds.length) return;

      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*")
        .eq("school_id", sectionInfo.school_id)
        .eq("school_year_id", selectedSchoolYear) // ✅ added support
        .in("subject_assignment_id", subjectIds);

      if (gradesError) throw gradesError;
      console.log("Fetched Grades:", gradesData);
      setGrades(gradesData || []);
    } catch (err) {
      console.error("Error fetching grades:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filter and sort students
  const filteredStudents = students
    .filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.lrn.includes(searchTerm)
    )
    .sort((a, b) => {
      switch (sortOption) {
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "lrn":
          return a.lrn.localeCompare(b.lrn);
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // 🧮 Compute averages
  const calculateAverage = (gradesArr) => {
    const valid = gradesArr.filter((g) => !isNaN(g));
    if (valid.length === 0) return "-";
    return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
  };

  // 🎨 Grade color styling
  const getGradeColor = (grade) => {
    if (grade >= 98) return "text-green-700 font-semibold";
    if (grade >= 95) return "text-green-600 font-medium";
    if (grade >= 90) return "text-green-500";
    if (grade >= 85) return "text-blue-600";
    if (grade >= 80) return "text-gray-700";
    if (grade >= 75) return "text-orange-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ProgressSpinner style={{ width: "50px", height: "50px" }} />
          <p className="mt-4 text-gray-600">Loading gradebook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Gradebook - {sectionInfo?.name}
            </h1>
            <p className="text-gray-600">
              Grade {sectionInfo?.grade_level} • {students.length} Students
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow">
          <InputText
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            className="w-64"
          />
          <Dropdown
            value={sortOption}
            options={sortOptions}
            onChange={(e) => setSortOption(e.value)}
            placeholder="Sort by"
            className="w-40"
          />
          <Dropdown
            value={selectedSchoolYear}
            options={schoolYears.map((sy) => ({
              label: sy.sy_label,
              value: sy.id,
            }))}
            onChange={(e) => setSelectedSchoolYear(e.value)}
            placeholder="Select School Year"
            className="w-52"
          />
        </div>
      </div>

      {/* Grade Table */}
      <div className="bg-white rounded-lg shadow overflow-auto">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No students found.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-4 sticky left-0 bg-gray-800 z-10 text-left">
                  Student Information
                </th>
                {subjects.map((subject) => (
                  <th
                    key={subject.id}
                    colSpan={4}
                    className="p-3 text-center border-l border-gray-600"
                  >
                    <div className="font-bold">{subject.subject_name}</div>
                    <div className="text-xs text-gray-300">
                      {subject.teachers?.fullname}
                    </div>
                  </th>
                ))}
                <th className="p-3 text-center border-l border-gray-600 bg-gray-700">
                  Final Average
                </th>
              </tr>
              <tr className="bg-gray-700 text-white">
                <th className="p-2 sticky left-0 bg-gray-700 z-10"></th>
                {subjects.map((subject) =>
                  quarters.map((q) => (
                    <th key={`${subject.id}-${q}`} className="p-2 text-xs font-medium">
                      {q}
                    </th>
                  ))
                )}
                <th className="p-2 text-xs font-medium border-l border-gray-600">Avg</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => {
                const subjectAverages = [];

                return (
                  <tr
                    key={student.id}
                    className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <td className="p-3 sticky left-0 bg-inherit z-10">
                      <div className="font-semibold">{student.name}</div>
                      <div className="text-xs text-gray-500">
                        LRN: {student.lrn} • {student.gender}
                      </div>
                    </td>

                    {subjects.map((subject) => {
                      const gradesArr = quarters.map((q) => {
                        const record = grades.find(
                          (g) =>
                            g.student_id === student.id &&
                            g.subject_assignment_id === subject.id &&
                            g.quarter === q
                        );
                        return record ? parseFloat(record.final_grade) : "-";
                      });

                      const avg = calculateAverage(
                        gradesArr.map((g) => (g === "-" ? NaN : g))
                      );
                      subjectAverages.push(parseFloat(avg) || 0);

                      return gradesArr.map((grade, i) => (
                        <td
                          key={`${student.id}-${subject.id}-${i}`}
                          className={`p-3 text-center border-l border-gray-300 ${
                            grade !== "-" ? getGradeColor(grade) : "text-gray-400"
                          }`}
                        >
                          {grade}
                        </td>
                      ));
                    })}

                    <td className="p-3 text-center border-l border-gray-300 font-bold bg-gray-100">
                      <div
                        className={getGradeColor(
                          subjectAverages.reduce((a, b) => a + b, 0) /
                            subjectAverages.length
                        )}
                      >
                        {(
                          subjectAverages.reduce((a, b) => a + b, 0) /
                          subjectAverages.length
                        ).toFixed(1)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
