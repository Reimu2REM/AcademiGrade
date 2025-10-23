// Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import supabase from "./config/supabaseclient";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { FaRankingStar, FaUsers, FaChartBar } from "react-icons/fa6";

// Components
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

// Chart.js registration
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [visible, setVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [missingActivities, setMissingActivities] = useState([]);
  const [loadingMissing, setLoadingMissing] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);
  const [studentRankings, setStudentRankings] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [averageGrade, setAverageGrade] = useState(0);

  const navigate = useNavigate();

  // Load Supabase user + profile pic
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error && user) setUser(user);

      if (user) {
        const { data: teacherData } = await supabase
          .from("teachers")
          .select("profile_pic")
          .eq("auth_id", user.id)
          .single();

        if (teacherData?.profile_pic) setProfilePic(teacherData.profile_pic);
      }
    };
    fetchUser();
  }, []);

  // ✅ Fetch active school year + total students
  const fetchTotalStudents = async () => {
    try {
      // 1️⃣ Get active school year
      const { data: activeYear, error: yearError } = await supabase
        .from("school_years")
        .select("id, sy_label")
        .eq("is_active", true)
        .single();

      if (yearError) {
        console.error("Error fetching school year:", yearError);
        setTotalStudents(0);
        return;
      }

      if (!activeYear) {
        console.warn("No active school year found");
        setTotalStudents(0);
        return;
      }

      setActiveSchoolYear(activeYear);

      const activeYearId = activeYear.id;

      // 2️⃣ Get teacher record
      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (teacherError || !teacherData) {
        console.warn("Teacher not found for this user");
        setTotalStudents(0);
        return;
      }

      const teacherId = teacherData.id;

      // 3️⃣ Get sections assigned to this teacher for active school year
      const { data: assignments, error: assignmentsError } = await supabase
        .from("subject_assignments")
        .select("section_id")
        .eq("teacher_id", teacherId)
        .eq("school_year_id", activeYearId);

      if (assignmentsError) throw assignmentsError;

      const sectionIds = [...new Set(assignments.map((a) => a.section_id))];

      if (sectionIds.length === 0) {
        setTotalStudents(0);
        return;
      }

      // 4️⃣ Count students from those sections
      const { count, error: studentCountError } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .in("section_id", sectionIds);

      if (studentCountError) throw studentCountError;

      setTotalStudents(count || 0);
    } catch (err) {
      console.error("Error fetching total students:", err.message);
    }
  };

  // ✅ FIXED: Fetch missing activities data (only null scores)
const fetchMissingActivities = async () => {
  try {
    setLoadingMissing(true);
    
    // Get teacher ID first
    const { data: teacherData, error: teacherError } = await supabase
      .from("teachers")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (teacherError || !teacherData) {
      console.warn("Teacher not found");
      setMissingActivities([]);
      return;
    }

    const teacherId = teacherData.id;

    // Get active school year
    const { data: activeYear } = await supabase
      .from("school_years")
      .select("id")
      .eq("is_active", true)
      .single();

    if (!activeYear) {
      console.warn("No active school year");
      setMissingActivities([]);
      return;
    }

    // Get subject assignments for this teacher
    const { data: assignments, error: assignmentsError } = await supabase
      .from("subject_assignments")
      .select("id, section_id, sections(name, grade_level)")
      .eq("teacher_id", teacherId)
      .eq("school_year_id", activeYear.id);

    if (assignmentsError) throw assignmentsError;

    if (!assignments || assignments.length === 0) {
      setMissingActivities([]);
      return;
    }

    const assignmentIds = assignments.map(a => a.id);
    const sectionMap = {};
    assignments.forEach(assignment => {
      sectionMap[assignment.section_id] = assignment.sections;
    });

    // ✅ CHANGED: Only detect NULL scores (removed 0 and empty string)
    const { data: missingScores, error: scoresError } = await supabase
      .from("activity_scores")
      .select(`
        id,
        score,
        student_id,
        subject_assignment_id,
        students!inner(
          id,
          section_id,
          name
        )
      `)
      .in("subject_assignment_id", assignmentIds)
      .is("score", null); // ✅ Only NULL scores

    if (scoresError) throw scoresError;

    // Group by section
    const grouped = {};

    missingScores?.forEach((item) => {
      const sectionId = item.students.section_id;
      const sectionInfo = sectionMap[sectionId];
      
      if (!sectionInfo) return;

      if (!grouped[sectionId]) {
        grouped[sectionId] = {
          sectionId,
          sectionName: sectionInfo.name,
          gradeLevel: sectionInfo.grade_level,
          missingCount: 0,
        };
      }
      grouped[sectionId].missingCount += 1;
    });

    const result = Object.values(grouped).sort(
      (a, b) => b.missingCount - a.missingCount
    );

    setMissingActivities(result);
  } catch (err) {
    console.error("Error fetching missing activities:", err);
  } finally {
    setLoadingMissing(false);
  }
};
  // ✅ NEW: Fetch student rankings and average grade
  const fetchStudentRankings = async () => {
    try {
      // Get teacher ID
      const { data: teacherData } = await supabase
        .from("teachers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (!teacherData) return;

      // Get active school year
      const { data: activeYear } = await supabase
        .from("school_years")
        .select("id")
        .eq("is_active", true)
        .single();

      if (!activeYear) return;

      // Get subject assignments
      const { data: assignments } = await supabase
        .from("subject_assignments")
        .select("id")
        .eq("teacher_id", teacherData.id)
        .eq("school_year_id", activeYear.id);

      if (!assignments || assignments.length === 0) return;

      const assignmentIds = assignments.map(a => a.id);

      // Get grades for these assignments
      const { data: grades, error } = await supabase
        .from("grades")
        .select(`
          final_grade,
          students!inner(
            id,
            name,
            section_id,
            sections(name)
          )
        `)
        .in("subject_assignment_id", assignmentIds)
        .not("final_grade", "is", null)
        .order("final_grade", { ascending: false });

      if (error) throw error;

      // Process rankings
      const rankings = grades.map((grade, index) => ({
        rank: index + 1,
        name: grade.students.name,
        grade: grade.final_grade ? grade.final_grade.toFixed(2) : "N/A",
        section: grade.students.sections.name
      }));

      setStudentRankings(rankings.slice(0, 10)); // Top 10 students

      // Calculate average grade
      if (grades.length > 0) {
        const total = grades.reduce((sum, grade) => sum + (grade.final_grade || 0), 0);
        const average = total / grades.length;
        setAverageGrade(average);
      }

      // Calculate grade distribution
      const distribution = calculateGradeDistribution(grades);
      setGradeDistribution(distribution);

    } catch (err) {
      console.error("Error fetching student rankings:", err);
    }
  };

  // ✅ NEW: Calculate grade distribution
  const calculateGradeDistribution = (grades) => {
    const ranges = [
      { label: "75-79", min: 75, max: 79, count: 0 },
      { label: "80-84", min: 80, max: 84, count: 0 },
      { label: "85-89", min: 85, max: 89, count: 0 },
      { label: "90-94", min: 90, max: 94, count: 0 },
      { label: "95-100", min: 95, max: 100, count: 0 },
    ];

    grades.forEach(grade => {
      const finalGrade = grade.final_grade;
      if (finalGrade) {
        const range = ranges.find(r => finalGrade >= r.min && finalGrade <= r.max);
        if (range) range.count++;
      }
    });

    return ranges;
  };

  useEffect(() => {
    if (user) {
      fetchMissingActivities();
      fetchTotalStudents();
      fetchStudentRankings();
    }
  }, [user]);

  const handleSectionClick = (sectionId) => {
    navigate(`/subjectgrade/${sectionId}`);
  };

  // Chart data based on actual grade distribution
  const chartData = {
    labels: gradeDistribution.map(item => item.label),
    datasets: [
      {
        label: "Number of Students",
        data: gradeDistribution.map(item => item.count),
        backgroundColor: [
          "#ef4444", // 75-79: Red
          "#f59e0b", // 80-84: Yellow
          "#10b981", // 85-89: Green
          "#3b82f6", // 90-94: Blue
          "#8b5cf6", // 95-100: Purple
        ],
        borderColor: [
          "#dc2626",
          "#d97706",
          "#047857",
          "#1d4ed8",
          "#7c3aed",
        ],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: { padding: 20, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            return `Students: ${context.parsed.y}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.1)" },
        ticks: { stepSize: 1 },
        title: {
          display: true,
          text: 'Number of Students'
        }
      },
      x: { 
        grid: { display: false },
        title: {
          display: true,
          text: 'Grade Ranges'
        }
      },
    },
  };

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar setVisible={setVisible} user={user} profilePic={profilePic} />
      <Sidebar visible={visible} setVisible={setVisible} />

      <main className="p-4 lg:p-6 transition-all duration-300">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            Teacher's Dashboard
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            Welcome back, {user.email}
          </p>

          {/* 🔽 View-only dropdown for active school year */}
          <div className="flex justify-center">
            <Dropdown
              value={activeSchoolYear}
              options={
                activeSchoolYear
                  ? [{ label: activeSchoolYear.sy_label, value: activeSchoolYear }]
                  : []
              }
              optionLabel="label"
              placeholder="Active School Year"
              className="w-64"
              disabled
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 max-w-6xl mx-auto">
          {/* ✅ Total Students Card */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg transition-transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 font-semibold mb-2">
                  Total Students
                </h3>
                <h2 className="text-4xl font-bold text-gray-800">
                  {totalStudents ?? 0}
                </h2>
              </div>
              <FaUsers className="text-3xl text-blue-600" />
            </div>
          </div>

          {/* Incomplete Students Styled Like Assignments Due */}
          <div className="bg-[#1E1E2F] text-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-400">
                {missingActivities.reduce(
                  (acc, cur) => acc + cur.missingCount,
                  0
                )}{" "}
                Incomplete Activities
              </h3>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[200px]">
              {loadingMissing ? (
                <p className="text-gray-400 text-sm text-center py-2">
                  Loading...
                </p>
              ) : missingActivities.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-2">
                  No incomplete tasks 🎉
                </p>
              ) : (
                missingActivities.map((item) => (
                  <div
                    key={item.sectionId}
                    onClick={() => handleSectionClick(item.sectionId)}
                    className="flex justify-between items-center bg-[#2A2A3D] hover:bg-[#33334D] transition rounded-lg px-3 py-2 cursor-pointer"
                  >
                    <span className="text-sm truncate max-w-[180px]">
                      Grade {item.gradeLevel} - {item.sectionName}
                    </span>
                    <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.missingCount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Average Grade Card */}
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg transition-transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 font-semibold mb-2">
                  Average Grade
                </h3>
                <h2 className="text-4xl font-bold text-gray-800">
                  {averageGrade ? averageGrade.toFixed(1) + '%' : 'N/A'}
                </h2>
              </div>
              <FaChartBar className="text-3xl text-green-600" />
            </div>
          </div>
        </div>

        {/* Charts + Ranking */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaChartBar className="text-blue-600" />
                Student Grades Distribution
              </h2>
            </div>
            <div className="h-80">
              {gradeDistribution.some(item => item.count > 0) ? (
                <Bar data={chartData} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No grade data available yet
                </div>
              )}
            </div>
          </div>

          {/* Ranking Table */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
              <FaRankingStar className="text-yellow-500" />
              Top Students Ranking
            </h2>

            <div className="overflow-x-auto overflow-y-auto max-h-96">
              <DataTable 
                value={studentRankings} 
                emptyMessage="No student data available yet"
                className="p-datatable-sm"
              >
                <Column field="rank" header="Rank" style={{ width: '80px' }} />
                <Column field="name" header="Student Name" />
                <Column field="section" header="Section" />
                <Column field="grade" header="Grade" />
              </DataTable>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;