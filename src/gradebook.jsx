import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "./config/supabaseclient";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { ProgressSpinner } from "primereact/progressspinner";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";

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
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

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

      // Auto-select current section's school year
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
        .eq("school_year_id", selectedSchoolYear)
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

  // 🧮 Compute averages - only if all 4 quarters exist
  const calculateAverage = (gradesArr) => {
    const valid = gradesArr.filter((g) => !isNaN(g));
    // Only calculate if all 4 quarters have valid grades
    if (valid.length !== 4) return "-";
    return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
  };

  // 🧮 Calculate general average - only if ALL subjects have complete grades
  const calculateGeneralAverage = (student) => {
    const subjectFinalGrades = subjects.map(subject => {
      const subjectGrades = quarters.map(q => {
        const record = grades.find(
          g =>
            g.student_id === student.id &&
            g.subject_assignment_id === subject.id &&
            g.quarter === q
        );
        return record ? parseFloat(record.final_grade) : NaN;
      });
      
      // Check if all 4 quarters have valid grades for this subject
      const hasCompleteGrades = subjectGrades.every(grade => !isNaN(grade));
      if (!hasCompleteGrades) return NaN;
      
      // Calculate subject final grade
      return subjectGrades.reduce((a, b) => a + b, 0) / 4;
    });

    // Check if ALL subjects have complete grades
    const allSubjectsComplete = subjectFinalGrades.every(grade => !isNaN(grade));
    
    if (!allSubjectsComplete) return "-";
    
    // Calculate general average
    const generalAverage = subjectFinalGrades.reduce((a, b) => a + b, 0) / subjects.length;
    return generalAverage.toFixed(1);
  };

  // 🎨 Grade color styling
  const getGradeColor = (grade) => {
    if (grade === "-") return "text-gray-400";
    const numericGrade = parseFloat(grade);
    if (numericGrade >= 98) return "text-green-700 font-semibold";
    if (numericGrade >= 95) return "text-green-600 font-medium";
    if (numericGrade >= 90) return "text-green-500";
    if (numericGrade >= 85) return "text-blue-600";
    if (numericGrade >= 80) return "text-gray-700";
    if (numericGrade >= 75) return "text-orange-600";
    return "text-red-600";
  };

  // ✅ Student selection handlers
  const handleStudentSelect = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
    setSelectAll(newSelected.size === filteredStudents.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
    setSelectAll(!selectAll);
  };

  // ✅ Print function
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const selectedStudentsData = filteredStudents.filter(student =>
      selectedStudents.has(student.id)
    );

    if (selectedStudentsData.length === 0) {
      alert("Please select at least one student to print.");
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report Card - ${sectionInfo?.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 30px;
            color: #000;
          }
          h2, h3, h4 {
            text-align: center;
            margin: 0;
          }
          .page {
            page-break-after: always;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #000;
            padding: 4px 6px;
            vertical-align: middle;
          }
          th {
            background-color: #f0f0f0;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .section-title {
            font-weight: bold;
            text-align: left;
            margin-top: 10px;
          }
          .descriptor-table th, .descriptor-table td {
            border: none;
            padding: 2px 4px;
          }
          .values-table {
            width: 100%;
            margin-top: 15px;
          }
          .values-table th, .values-table td {
            font-size: 11px;
          }
          .page-break {
            page-break-after: always;
          }
          .no-border td {
            border: none;
          }
          .remarks-note {
            margin-top: 10px;
            font-size: 11px;
          }
          @media print {
            .no-print {
              display: none;
            }
            body {
              margin: 0;
            }
          }
          .no-print {
            text-align: center;
            margin-top: 20px;
          }
          .no-print button {
            padding: 8px 16px;
            margin: 5px;
            font-size: 14px;
            cursor: pointer;
          }
          .text-center { text-align: center; }
        </style>
      </head>
      <body>
        ${selectedStudentsData
          .map(student => {
            const studentGrades = {};
            subjects.forEach(subject => {
              quarters.forEach(quarter => {
                const gradeRecord = grades.find(
                  g =>
                    g.student_id === student.id &&
                    g.subject_assignment_id === subject.id &&
                    g.quarter === quarter
                );
                studentGrades[`${subject.id}-${quarter}`] = gradeRecord
                  ? parseFloat(gradeRecord.final_grade).toFixed(1)
                  : "-";
              });
            });

            // Calculate general average only if ALL subjects have complete grades
            const generalAverage = calculateGeneralAverage(student);

            return `
            <div class="page">
              <div class="header">
                <h2>REPORT CARD</h2>
                <h4>${sectionInfo?.name} — Grade ${sectionInfo?.grade_level}</h4>
                <p>School Year: ${
                  schoolYears.find(sy => sy.id === selectedSchoolYear)?.sy_label || "N/A"
                }</p>
              </div>

              <table class="no-border">
                <tr>
                  <td><strong>Student:</strong> ${student.name}</td>
                  <td><strong>LRN:</strong> ${student.lrn}</td>
                  <td><strong>Gender:</strong> ${student.gender}</td>
                </tr>
              </table>

              <h4 class="section-title">REPORT ON LEARNING PROGRESS AND ACHIEVEMENT</h4>
              <table>
                <thead>
                  <tr>
                    <th rowspan="2">Learning Areas</th>
                    <th colspan="4">Quarter</th>
                    <th rowspan="2">Final Grade</th>
                    <th rowspan="2">Remarks</th>
                  </tr>
                  <tr>
                    <th>1</th><th>2</th><th>3</th><th>4</th>
                  </tr>
                </thead>
                <tbody>
                  ${subjects
                    .map(subject => {
                      const subjectGrades = quarters.map(q => studentGrades[`${subject.id}-${q}`]);
                      const numericGrades = subjectGrades
                        .map(g => (g === "-" ? NaN : parseFloat(g)))
                        .filter(n => !isNaN(n));

                      // Compute only if all 4 quarters have valid grades
                      let finalGrade = "-";
                      let remarks = "";
                      if (numericGrades.length === 4) {
                        const avg = numericGrades.reduce((a, b) => a + b, 0) / 4;
                        finalGrade = avg.toFixed(1);
                        remarks = avg >= 75 ? "Passed" : "Failed";
                      }

                      return `
                        <tr>
                          <td>${subject.subject_name}</td>
                          ${subjectGrades
                            .map(g => `<td class="text-center">${g}</td>`)
                            .join("")}
                          <td class="text-center">${finalGrade}</td>
                          <td class="text-center">${remarks}</td>
                        </tr>
                      `;
                    })
                    .join("")}
                  <tr>
                    <td colspan="5"><strong>General Average</strong></td>
                    <td colspan="2" class="text-center">
                      ${generalAverage}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table class="descriptor-table">
                <tr>
                  <td><strong>Descriptors</strong></td>
                  <td><strong>Grading Scale</strong></td>
                  <td><strong>Remarks</strong></td>
                </tr>
                <tr><td>Outstanding</td><td>90 - 100</td><td>Passed</td></tr>
                <tr><td>Very Satisfactory</td><td>85 - 89</td><td>Passed</td></tr>
                <tr><td>Satisfactory</td><td>80 - 84</td><td>Passed</td></tr>
                <tr><td>Fairly Satisfactory</td><td>75 - 79</td><td>Passed</td></tr>
                <tr><td>Did Not Meet Expectations</td><td>Below 75</td><td>Failed</td></tr>
              </table>

              <h4 class="section-title">REPORT ON LEARNER'S OBSERVED VALUES</h4>
              <table class="values-table">
                <thead>
                  <tr>
                    <th rowspan="2">Core Values</th>
                    <th rowspan="2">Behavior Statements</th>
                    <th colspan="4">Quarter</th>
                  </tr>
                  <tr>
                    <th>1</th><th>2</th><th>3</th><th>4</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td rowspan="2">1. Maka-Diyos</td>
                    <td>Expresses one's spiritual beliefs while respecting the spiritual beliefs of others</td>
                    <td></td><td></td><td></td><td></td>
                  </tr>
                  <tr>
                    <td>Shows adherence to ethical principles by upholding truth</td>
                    <td></td><td></td><td></td><td></td>
                  </tr>
                  <tr>
                    <td rowspan="2">2. Makatao</td>
                    <td>Is sensitive to individual, social, and cultural differences</td>
                    <td></td><td></td><td></td><td></td>
                  </tr>
                  <tr>
                    <td>Demonstrates contributions toward solidarity</td>
                    <td></td><td></td><td></td><td></td>
                  </tr>
                  <tr>
                    <td>3. Makakalikasan</td>
                    <td>Cares for the environment and utilizes resources wisely, judiciously, and economically</td>
                    <td></td><td></td><td></td><td></td>
                  </tr>
                  <tr>
                    <td rowspan="2">4. Makabansa</td>
                    <td>Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen</td>
                    <td></td><td></td><td></td><td></td>
                  </tr>
                  <tr>
                    <td>Demonstrates appropriate behavior in carrying out activities in the school, community, and country</td>
                    <td></td><td></td><td></td><td></td>
                  </tr>
                </tbody>
              </table>

              <div class="remarks-note">
                <strong>Marking:</strong> AO - Always Observed | SO - Sometimes Observed | RO - Rarely Observed | NO - Not Observed
              </div>

              <div class="no-print">
                <button onclick="window.print()">🖨 Print Report</button>
                <button onclick="window.close()">Close</button>
              </div>
            </div>
            `;
          })
          .join("")}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
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
            className="w-64 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Dropdown
            value={sortOption}
            options={sortOptions}
            onChange={(e) => setSortOption(e.value)}
            placeholder="Sort by"
            className="w-40 border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            panelClassName="bg-gray-50 p-2 rounded"
          />
          <Dropdown
            value={selectedSchoolYear}
            options={schoolYears.map((sy) => ({
              label: sy.sy_label,
              value: sy.id,
            }))}
            onChange={(e) => setSelectedSchoolYear(e.value)}
            placeholder="Select School Year"
            className="w-52 border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            panelClassName="bg-gray-50 p-2 rounded"
          />
          
          {/* Print Controls */}
          <div className="flex items-center gap-2 ml-auto">
            <Checkbox
              inputId="selectAll"
              checked={selectAll}
              onChange={handleSelectAll}
              disabled={filteredStudents.length === 0}
              
            />
            <label htmlFor="selectAll" className="text-sm p-2 bg-blue-500 text-white rounded-xl">
              Select All ({selectedStudents.size} selected)
            </label>
            
            <Button
              label="Print Selected"
              icon="pi pi-print"
              onClick={handlePrint}
              disabled={selectedStudents.size === 0}
              className="p-button-success p-2 bg-blue-500 text-white rounded-lg "
            />
          </div>
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
                    colSpan={5}
                    className="p-3 text-center border-l border-gray-600"
                  >
                    <div className="font-bold">{subject.subject_name}</div>
                    <div className="text-xs text-gray-300">
                      {subject.teachers?.fullname}
                    </div>
                  </th>
                ))}
                <th className="p-3 text-center border-l border-gray-600 bg-gray-700">
                  General Average
                </th>
              </tr>
              <tr className="bg-gray-700 text-white">
                <th className="p-2 sticky left-0 bg-gray-700 z-10">
                  <div className="flex items-center gap-2">
                    <span>Select</span>
                  </div>
                </th>
                {subjects.map((subject) =>
                  [...quarters, "Final"].map((header) => (
                    <th 
                      key={`${subject.id}-${header}`} 
                      className="p-2 text-xs font-medium"
                    >
                      {header}
                    </th>
                  ))
                )}
                <th className="p-2 text-xs font-medium border-l border-gray-600">Avg</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => {
                const isSelected = selectedStudents.has(student.id);
                const generalAverage = calculateGeneralAverage(student);

                return (
                  <tr
                    key={student.id}
                    className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <td className="p-3 sticky left-0 bg-inherit z-10">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          inputId={`student-${student.id}`}
                          checked={isSelected}
                          onChange={() => handleStudentSelect(student.id)}
                        />
                        <div>
                          <div className="font-semibold">{student.name}</div>
                          <div className="text-xs text-gray-500">
                            LRN: {student.lrn} • {student.gender}
                          </div>
                        </div>
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

                      const finalGrade = calculateAverage(
                        gradesArr.map((g) => (g === "-" ? NaN : g))
                      );

                      return (
                        <React.Fragment key={subject.id}>
                          {gradesArr.map((grade, i) => (
                            <td
                              key={`${student.id}-${subject.id}-${i}`}
                              className={`p-3 text-center border-l border-gray-300 ${
                                grade !== "-" ? getGradeColor(grade) : "text-gray-400"
                              }`}
                            >
                              {grade}
                            </td>
                          ))}
                          <td
                            className={`p-3 text-center border-l border-gray-300 font-bold ${
                              getGradeColor(finalGrade)
                            }`}
                          >
                            {finalGrade}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    <td className="p-3 text-center border-l border-gray-300 font-bold bg-gray-100">
                      <div className={getGradeColor(generalAverage)}>
                        {generalAverage}
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