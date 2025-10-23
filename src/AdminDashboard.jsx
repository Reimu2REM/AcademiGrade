import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from "./components/AdminNavBar";
import Sidebaradmin from "./components/Sidebaradmin";
import {
  FiCalendar,
  FiBook,
  FiUsers,
  FiUserCheck,
  FiClipboard,
  FiPercent,
  FiAlertTriangle,
  FiCheckCircle,
  FiSettings,
  FiArrowRight
} from 'react-icons/fi';
import supabase from "./config/supabaseclient";

const AdminDashboard = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  // Dynamic data states
  const [activeSY, setActiveSY] = useState(null);
  const [curriculums, setCurriculums] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjectAssignments, setSubjectAssignments] = useState([]);
  const [gradeSettings, setGradeSettings] = useState([]);

  // Alerts
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch active school year
      const { data: syData, error: syError } = await supabase
        .from("school_years")
        .select("*")
        .eq("is_active", true)
        .single();
      if (syError) console.error("Error fetching school year:", syError);
      else setActiveSY(syData);

      // Fetch curriculums
      const { data: curriculumData, error: curriculumError } = await supabase
        .from("curriculums")
        .select("*");
      if (curriculumError) console.error(curriculumError);
      else setCurriculums(curriculumData || []);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("sections")
        .select("id, name, adviser_id");
      if (sectionsError) console.error(sectionsError);
      else setSections(sectionsData || []);

      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("*");
      if (teachersError) console.error(teachersError);
      else setTeachers(teachersData || []);

      // Fetch subject assignments
      const { data: subjectAssignData, error: subjectAssignError } = await supabase
        .from("subject_assignments")
        .select("*");
      if (subjectAssignError) console.error(subjectAssignError);
      else setSubjectAssignments(subjectAssignData || []);

      // Fetch grading settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("school_settings")
        .select("*");
      if (settingsError) console.error(settingsError);
      else setGradeSettings(settingsData || []);

      // Prepare alerts
      const sectionsNoAdviser = (sectionsData || []).filter(sec => !sec.adviser_id).length;
      const totalSubjects = (subjectAssignData || []).length;
      const assignedSubjects = (subjectAssignData || []).filter(s => s.teacher_id).length;

      const newAlerts = [];
      if (sectionsNoAdviser > 0) {
        newAlerts.push({
          type: "warning",
          icon: <FiAlertTriangle className="text-amber-500" />,
          message: `${sectionsNoAdviser} Sections have no assigned adviser`,
          color: "text-amber-600"
        });
      }
      if (totalSubjects > assignedSubjects) {
        newAlerts.push({
          type: "warning",
          icon: <FiAlertTriangle className="text-amber-500" />,
          message: `${totalSubjects - assignedSubjects} Subjects have no assigned teacher`,
          color: "text-amber-600"
        });
      }
      newAlerts.push({
        type: "success",
        icon: <FiCheckCircle className="text-green-500" />,
        message: "All grade percentages configured",
        color: "text-green-600"
      });
      setAlerts(newAlerts);
    } catch (err) {
      console.error("Dashboard data load failed:", err);
    }
  };

  // Navigation functions
  const handleNavigateToGrades = () => {
    navigate('/admin/grades');
  };

  const handleNavigateToTeachers = () => {
    navigate('/admin/teachers');
  };

  // Computed data - UPDATED: Use is_archived instead of status
  const totalSections = sections.length;
  const assignedAdvisers = sections.filter(s => s.adviser_id).length;
  
  // ✅ UPDATED: Active teachers are those NOT archived (is_archived = false)
  const activeTeachers = teachers.filter(t => !t.is_archived).length;
  
  // ✅ UPDATED: Inactive teachers are those archived (is_archived = true)
  const inactiveTeachers = teachers.filter(t => t.is_archived).length;
  
  const totalSubjects = subjectAssignments.length;
  const assignedSubjects = subjectAssignments.filter(s => s.teacher_id).length;
  const completionRate = totalSubjects > 0 ? Math.round((assignedSubjects / totalSubjects) * 100) : 0;

  const statCards = [
    {
      title: "Active School Year",
      value: activeSY ? activeSY.sy_label : "Loading...",
      description: activeSY
        ? `Start: ${activeSY.start_date} • End: ${activeSY.end_date}`
        : "Fetching...",
      icon: <FiCalendar className="text-2xl text-blue-600" />,
      buttonText: "Manage",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      onClick: handleNavigateToGrades
    },
    {
      title: "Curriculum",
      value: `${curriculums.length} Total Curriculums`,
      description: curriculums.length > 0
        ? curriculums.map(c => c.name)
        : ["No curriculums found"],
      icon: <FiBook className="text-2xl text-green-600" />,
      buttonText: "View All",
      buttonColor: "bg-green-600 hover:bg-green-700",
      onClick: handleNavigateToGrades
    },
    {
      title: "Sections Overview",
      value: `${totalSections} Sections`,
      description: `Advisers Assigned: ${assignedAdvisers}/${totalSections}`,
      icon: <FiUsers className="text-2xl text-purple-600" />,
      buttonText: "Manage Sections",
      buttonColor: "bg-purple-600 hover:bg-purple-700",
      onClick: handleNavigateToGrades
    },
    {
      title: "Teachers",
      value: `${teachers.length} Teachers`,
      description: `Active: ${activeTeachers} • Inactive: ${inactiveTeachers}`,
      icon: <FiUserCheck className="text-2xl text-indigo-600" />,
      buttonText: "Manage Teachers",
      buttonColor: "bg-indigo-600 hover:bg-indigo-700",
      onClick: handleNavigateToTeachers
    },
    {
      title: "Subject Assignment",
      value: `${assignedSubjects}/${totalSubjects} Subjects Assigned`,
      description: `${completionRate}% completion rate`,
      icon: <FiClipboard className="text-2xl text-teal-600" />,
      buttonText: "Assign Teachers",
      buttonColor: "bg-teal-600 hover:bg-teal-700",
      progress: completionRate,
      onClick: handleNavigateToGrades
    },
    {
      title: "Grading Percentage Setup",
      value: gradeSettings.length > 0 ? `Grade ${gradeSettings[0].grade_level}` : "Loading...",
      description:
        gradeSettings.length > 0
          ? [
              `Written Works (WW): ${gradeSettings[0].written_work_percent}%`,
              `Performance Task (PT): ${gradeSettings[0].performance_task_percent}%`,
              `Quarterly Assessment (QA): ${gradeSettings[0].quarterly_assessment_percent}%`
            ]
          : ["No settings configured"],
      icon: <FiPercent className="text-2xl text-amber-600" />,
      buttonText: "Edit Percentages",
      buttonColor: "bg-amber-500 hover:bg-amber-600",
      onClick: handleNavigateToGrades
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar setVisible={setVisible} />
      <Sidebaradmin visible={visible} setVisible={setVisible} />

      <main className=" p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500 mt-2">
            {activeSY ? `School Year ${activeSY.sy_label} (Active)` : "Loading school year..."}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-700 text-lg mb-2">{stat.title}</h3>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                {stat.icon}
              </div>
              {Array.isArray(stat.description) ? (
                <ul className="mt-3 text-sm text-gray-600 space-y-1">
                  {stat.description.map((item, idx) => (
                    <li key={idx} className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-sm mt-2">{stat.description}</p>
              )}
              {stat.progress && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{stat.progress}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 w-full">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stat.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              <button
                onClick={stat.onClick}
                className={`mt-4 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${stat.buttonColor}`}
              >
                {stat.buttonText}
                <FiArrowRight className="text-sm" />
              </button>
            </div>
          ))}
        </div>

        {/* Alerts Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700 text-lg">Alerts & Notifications</h2>
            <FiSettings className="text-gray-400 cursor-pointer hover:text-gray-600" />
          </div>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                {alert.icon}
                <span className={`text-sm font-medium ${alert.color}`}>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;