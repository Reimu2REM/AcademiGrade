import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import supabase from "./config/supabaseclient";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { InputNumber } from "primereact/inputnumber";
import { Tooltip } from "primereact/tooltip";
import { ProgressSpinner } from "primereact/progressspinner";

const SubjectGrade = () => {
  const { section_id } = useParams();
  const [visible, setVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const toast = React.useRef(null);
  const [editingCell, setEditingCell] = useState(null);
  const inputRefs = useRef({});
  const [initializing, setInitializing] = useState(true);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState(null);

  const [subjectAssignments, setSubjectAssignments] = useState([]);
  const [selectedSubjectAssignmentId, setSelectedSubjectAssignmentId] = useState(null);

  const [sectionInfo, setSectionInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("asc");
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");

  // Activity management
  const [activityModal, setActivityModal] = useState(false);
  const [newActivity, setNewActivity] = useState({ type: "written", name: "", maxScore: 100 });

  // Activity detail modal
  const [activityDetailModal, setActivityDetailModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [bulkScoreValue, setBulkScoreValue] = useState(0);

  // Database integration state
  const [schoolSettings, setSchoolSettings] = useState({
    written_work_percent: 30,
    performance_task_percent: 50,
    quarterly_assessment_percent: 20
  });

  // Track which student/activity cell is being edited
  const [editingScore, setEditingScore] = useState({
    studentId: null,
    activityId: null,
    categoryType: null
  });

  const [subjectAssignmentId, setSubjectAssignmentId] = useState(null);
  const [existingGrades, setExistingGrades] = useState({});
  const [existingActivityScores, setExistingActivityScores] = useState({});

  // Initialize categories with proper structure
  const [categories, setCategories] = useState({
    written: {
      label: "WRITTEN WORKS",
      weight: 30,
      color: "blue",
      items: []
    },
    performance: {
      label: "PERFORMANCE TASKS",
      weight: 50,
      color: "green",
      items: []
    },
    quarterly: {
      label: "QUARTERLY ASSESSMENT",
      weight: 20,
      color: "purple",
      items: []
    }
  });

  const mapDBNameToShort = (dbName) => {
    if (dbName?.startsWith("Written Work")) return "WW" + dbName.split(" ")[2];
    if (dbName?.startsWith("Performance Task")) return "PT" + dbName.split(" ")[3];
    if (dbName?.startsWith("Quarterly Assessment")) return "QA" + dbName.split(" ")[3];
    return dbName;
  };

  // ✅ Reusable reload function for modal and quarter change
  const reloadData = async () => {
    if (!selectedSubjectAssignmentId || students.length === 0) return;
    setLoading(true);
    try {
      await loadActivityScores(students, selectedSubjectAssignmentId);
      await loadExistingGrades(students, selectedSubjectAssignmentId);
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch (error) {
      console.error("Error reloading data:", error.message);
      toast.current?.show({
        severity: "warn",
        summary: "Reload Failed",
        detail: "Could not refresh data after saving.",
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScores = async () => {
    if (!selectedActivity) return;

    const validScores = Object.entries(selectedActivity.scores || {})
      .filter(([_, score]) => score !== "" && score !== null && !isNaN(score))
      .map(([studentId, score]) => ({
        student_id: studentId,
        subject_assignment_id: selectedSubjectAssignmentId,
        activity_type: selectedActivity.categoryType,
        activity_name: selectedActivity.name,
        score,
        max_score: selectedActivity.maxScore,
        quarter: selectedQuarter,
        updated_at: new Date().toISOString(),
      }));

    if (validScores.length === 0) {
      alert("⚠️ No valid scores entered. Blank fields will not be saved.");
      return;
    }

    const { error } = await supabase.from("activity_scores").upsert(validScores, {
      onConflict: [
        "student_id",
        "subject_assignment_id",
        "activity_name",
        "quarter",
      ],
    });

    if (error) {
      console.error("Save failed:", error);
      alert("❌ Error saving scores.");
    } else {
      alert("✅ Scores saved successfully!");
      setActivityDetailModal(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setInitializing(true);
      try {
        // ... all your fetchData logic
      } finally {
        setInitializing(false);
      }
    };

    if (user) fetchData();
  }, [section_id, user]);

  useEffect(() => {
    const fetchCurrentSchoolYear = async () => {
      try {
        const { data, error } = await supabase
          .from("school_years")
          .select("id")
          .eq("is_active", true)
          .single();

        if (error) throw error;
        setSelectedSchoolYearId(data?.id || null);
      } catch (err) {
        console.error("Error fetching active school year:", err);
      }
    };

    fetchCurrentSchoolYear();
  }, []);

  // Fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error) return console.error("Error fetching user:", error.message);
      setUser(authUser);

      const { data: teacher } = await supabase
        .from("teachers")
        .select("profile_pic")
        .eq("auth_id", authUser.id)
        .single();

      if (teacher) setProfilePic(teacher.profile_pic || null);
    };
    fetchUser();
  }, []);

  // NEW: Convert quarter name to database format
  const getQuarterCode = () => {
    return selectedQuarter.replace(' Quarter', 'Q').replace('1st', '1').replace('2nd', '2').replace('3rd', '3').replace('4th', '4');
  };

  // ✅ FIXED: Load activity scores and MERGE with default activities
  const loadActivityScores = async (students, subjectAssignmentId) => {
    try {
      console.log("Loading activity scores for:", subjectAssignmentId, "quarter:", selectedQuarter);
      
      const { data: scoresData, error } = await supabase
        .from("activity_scores")
        .select("*")
        .eq("subject_assignment_id", subjectAssignmentId)
        .eq("quarter", selectedQuarter);

      if (error) throw error;

      console.log("Raw scores data from database:", scoresData);

      // Create default activities structure
      const defaultActivities = createDefaultActivities(students);

      // If no scores found, use defaults
      if (!scoresData || scoresData.length === 0) {
        console.log("No activity scores found in database, using defaults");
        setCategories(prev => ({
          written: { ...prev.written, items: defaultActivities.written },
          performance: { ...prev.performance, items: defaultActivities.performance },
          quarterly: { ...prev.quarterly, items: defaultActivities.quarterly },
        }));
        return;
      }

      // Create structure to organize activities by category from database
      const dbActivities = {
        written: [],
        performance: [], 
        quarterly: []
      };

      // Group scores by activity from database
      const activityMap = {};
      
      scoresData.forEach(score => {
        const activityKey = `${score.activity_type}-${score.activity_name}`;
        
        if (!activityMap[activityKey]) {
          activityMap[activityKey] = {
            id: `${score.activity_type}-${score.activity_name}`.toLowerCase().replace(/\s+/g, '-'),
            name: score.activity_name,
            maxScore: score.max_score,
            scores: {},
            categoryType: score.activity_type
          };
        }
        
        // Store the score for this student (handle null scores)
        activityMap[activityKey].scores[score.student_id] = score.score !== null ? Number(score.score) : null;
      });

      // Organize into categories from database
      Object.values(activityMap).forEach(activity => {
        if (activity.categoryType === 'written') {
          dbActivities.written.push(activity);
        } else if (activity.categoryType === 'performance') {
          dbActivities.performance.push(activity);
        } else if (activity.categoryType === 'quarterly') {
          dbActivities.quarterly.push(activity);
        }
      });

      console.log("Database activities:", dbActivities);
      console.log("Default activities:", defaultActivities);

      // ✅ FIXED: Merge database activities with default activities
      // This ensures default activities stay AND custom activities are added
      const mergedActivities = {
        written: mergeActivities(defaultActivities.written, dbActivities.written, students),
        performance: mergeActivities(defaultActivities.performance, dbActivities.performance, students),
        quarterly: mergeActivities(defaultActivities.quarterly, dbActivities.quarterly, students)
      };

      console.log("Merged activities:", mergedActivities);

      // Update the categories state with the merged data
      setCategories(prev => ({
        written: {
          ...prev.written,
          items: mergedActivities.written
        },
        performance: {
          ...prev.performance, 
          items: mergedActivities.performance
        },
        quarterly: {
          ...prev.quarterly,
          items: mergedActivities.quarterly
        }
      }));

    } catch (err) {
      console.error("Error loading activity scores:", err.message);
      // Fallback to default activities if loading fails
      const defaultActivities = createDefaultActivities(students);
      setCategories(prev => ({
        written: { ...prev.written, items: defaultActivities.written },
        performance: { ...prev.performance, items: defaultActivities.performance },
        quarterly: { ...prev.quarterly, items: defaultActivities.quarterly },
      }));
      
      toast.current?.show({
        severity: "error",
        summary: "Load Failed",
        detail: "Could not load activity scores, using defaults",
        life: 3000
      });
    }
  };

  // ✅ NEW: Function to create default activities
  const createDefaultActivities = (students) => {
    const defaultCounts = {
      written: 5,
      performance: 4,
      quarterly: 1,
    };

    return Object.entries(defaultCounts).reduce((acc, [type, count]) => {
      const prefix = type === "written" ? "WW" : type === "performance" ? "PT" : "QA";
      acc[type] = Array.from({ length: count }, (_, i) => ({
        id: `${type}-${i + 1}`,
        name: `${prefix}${i + 1}`,
        maxScore: 100,
        scores: students.reduce((a, s) => ({ ...a, [s.id]: null }), {}),
      }));
      return acc;
    }, { written: [], performance: [], quarterly: [] });
  };

  // ✅ FIXED: Function to merge database activities with default activities AND include custom activities
  const mergeActivities = (defaultActivities, dbActivities, students) => {
    // Create a map of database activities for easy lookup
    const dbActivityMap = {};
    dbActivities.forEach(activity => {
      dbActivityMap[activity.name] = activity;
    });

    // Start with default activities
    const mergedActivities = [...defaultActivities];

    // Add database activities that are NOT in defaults (custom activities)
    dbActivities.forEach(dbActivity => {
      const isDefaultActivity = defaultActivities.some(
        defaultActivity => defaultActivity.name === dbActivity.name
      );
      
      if (!isDefaultActivity) {
        // This is a custom activity from database, add it
        mergedActivities.push({
          ...dbActivity,
          id: `${dbActivity.categoryType}-${dbActivity.name}`.toLowerCase().replace(/\s+/g, '-')
        });
      }
    });

    // Now update scores for all activities (both default and custom)
    return mergedActivities.map(activity => {
      const dbActivity = dbActivityMap[activity.name];
      
      if (dbActivity) {
        // Merge scores: use database scores where available, otherwise use default (null)
        const mergedScores = { ...activity.scores };
        students.forEach(student => {
          if (dbActivity.scores[student.id] !== undefined) {
            mergedScores[student.id] = dbActivity.scores[student.id];
          }
        });

        return {
          ...activity,
          maxScore: dbActivity.maxScore, // Use database maxScore
          scores: mergedScores // Use merged scores
        };
      }
      
      // No database activity found, use as-is
      return activity;
    });
  };

  // NEW: Load existing grades from database
  const loadExistingGrades = async (students, assignmentId) => {
    try {
      const quarterCode = selectedQuarter;

      const { data: gradesData, error } = await supabase
        .from("grades")
        .select("*")
        .eq("subject_assignment_id", assignmentId)
        .eq("quarter", quarterCode);

      if (error) throw error;

      const gradesMap = {};
      if (gradesData) {
        gradesData.forEach(grade => {
          gradesMap[grade.student_id] = grade;
        });
      }
      
      setExistingGrades(gradesMap);
      return gradesMap;

    } catch (error) {
      console.error("Error loading grades:", error.message);
      return {};
    }
  };

  // ✅ FIXED: Proper data fetching sequence
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch section info first
        const { data: sectionData, error: sectionError } = await supabase
          .from("sections")
          .select("id, name, grade_level, school_year:school_years(sy_label, school_id)")
          .eq("id", section_id)
          .single();

        if (sectionError) throw sectionError;

        const schoolYearObj = Array.isArray(sectionData.school_year) ? sectionData.school_year[0] : sectionData.school_year;
        setSectionInfo({ 
          ...sectionData, 
          school_year: schoolYearObj, 
          school_id: schoolYearObj?.school_id || null 
        });

        // 2. Fetch students BEFORE loading scores
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, lrn, name")
          .eq("section_id", section_id)
          .order("name", { ascending: true });

        if (studentsError) throw studentsError;
        setStudents(studentsData);

        console.log("Loaded students:", studentsData);

        // 3. Get teacher ID
        const { data: teacherData, error: teacherError } = await supabase
          .from("teachers")
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (teacherError || !teacherData) {
          console.warn("Teacher not found for current user");
          setSubjectAssignments([]);
          setSelectedSubjectAssignmentId(null);
          return;
        }

        // 4. Fetch subject assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("subject_assignments")
          .select("id, subject_name")
          .eq("section_id", section_id)
          .eq("teacher_id", teacherData.id);

        if (assignmentsError) {
          console.warn("Error fetching subject assignments:", assignmentsError.message);
          setSubjectAssignments([]);
          setSelectedSubjectAssignmentId(null);
        } else if (!assignmentsData || assignmentsData.length === 0) {
          console.warn("No subjects assigned to this teacher for this section");
          setSubjectAssignments([]);
          setSelectedSubjectAssignmentId(null);
        } else {
          setSubjectAssignments(assignmentsData);
          setSelectedSubjectAssignmentId(assignmentsData[0].id);
          
          // 5. NOW load activity scores and grades (we have students data)
          console.log("Loading data for subject:", assignmentsData[0].id);
          await loadActivityScores(studentsData, assignmentsData[0].id);
          await loadExistingGrades(studentsData, assignmentsData[0].id);
        }

        // 6. Fetch school settings
        if (sectionData.school_year?.school_id) {
          const { data: settingsData, error: settingsError } = await supabase
            .from("school_settings")
            .select("written_work_percent, performance_task_percent, quarterly_assessment_percent")
            .eq("school_id", sectionData.school_year.school_id)
            .single();

          if (settingsError) console.warn("Using default settings:", settingsError.message);
          
          if (settingsData) {
            setSchoolSettings(settingsData);
          }
        }

      } catch (error) {
        console.error("Error fetching data:", error.message);
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load class data',
          life: 3000
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchData();
  }, [section_id, user]);

  // ✅ FIXED: Reload data when quarter changes
  useEffect(() => {
    if (students.length > 0 && selectedSubjectAssignmentId) {
      console.log("Quarter changed to:", selectedQuarter, "reloading data...");
      const reloadData = async () => {
        setLoading(true);
        try {
          await loadActivityScores(students, selectedSubjectAssignmentId);
          await loadExistingGrades(students, selectedSubjectAssignmentId);
        } catch (error) {
          console.error("Error reloading data on quarter change:", error);
        } finally {
          setLoading(false);
        }
      };
      reloadData();
    }
  }, [selectedQuarter]);

  // ✅ FIXED: Reload data when subject changes
  useEffect(() => {
    if (students.length > 0 && selectedSubjectAssignmentId) {
      console.log("Subject changed to:", selectedSubjectAssignmentId, "reloading data...");
      const reloadData = async () => {
        setLoading(true);
        try {
          await loadActivityScores(students, selectedSubjectAssignmentId);
          await loadExistingGrades(students, selectedSubjectAssignmentId);
        } catch (error) {
          console.error("Error reloading data on subject change:", error);
        } finally {
          setLoading(false);
        }
      };
      reloadData();
    }
  }, [selectedSubjectAssignmentId]);

  const handleSaveFinalGrades = async () => {
    try {
      // Build grade entries from what's shown in the table
      const gradeEntries = filteredStudents.map((student) => {
        const finalGradeValue = calculateFinalGrade(student.id);
        const parsed = finalGradeValue === null || isNaN(finalGradeValue)
          ? null
          : parseFloat(Number(finalGradeValue).toFixed(2));

        return {
          student_id: student.id,
          subject_assignment_id: selectedSubjectAssignmentId,
          quarter: selectedQuarter,
          school_year_id: selectedSchoolYearId || null,
          final_grade: parsed,
          school_id: sectionInfo?.school_id || null,
          updated_at: new Date().toISOString(),
        };
      });

      // Keep only usable numeric final grades
      const validGrades = gradeEntries.filter(
        (g) => g.final_grade !== null && !isNaN(g.final_grade)
      );

      if (validGrades.length === 0) {
        toast.current.show({
          severity: "warn",
          summary: "No Grades Found",
          detail: "No valid final grades to save.",
          life: 3000,
        });
        return;
      }

      // Upsert using the 4-column unique key
      const { error } = await supabase
        .from("grades")
        .upsert(validGrades, {
          onConflict: ["student_id", "subject_assignment_id", "quarter", "school_year_id"],
        });

      if (error) throw error;

      toast.current.show({
        severity: "success",
        summary: "Saved",
        detail: "Final grades saved successfully.",
        life: 2500,
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.current.show({
        severity: "error",
        summary: "Save Failed",
        detail: "Could not save final grades.",
        life: 3000,
      });
    }
  };

  // NEW: Function to handle activity click
  const handleActivityClick = (activity, categoryType) => {
    setSelectedActivity({
      ...activity,
      categoryType: categoryType
    });
    setActivityDetailModal(true);
  };

  // NEW: Function to apply bulk score
  const applyBulkScore = () => {
    if (selectedActivity) {
      handleBulkScore(selectedActivity.id, selectedActivity.categoryType, bulkScoreValue);
      setBulkScoreValue(0);
      toast.current.show({
        severity: 'info',
        summary: 'Bulk Score Applied',
        detail: `All students received ${bulkScoreValue} for ${selectedActivity.name}`,
        life: 3000
      });
    }
  };

  // Sorting and filtering
  const sortOptions = [
    { label: "A → Z", value: "asc" },
    { label: "Z → A", value: "desc" },
    { label: "By LRN", value: "lrn" },
  ];

  const quarterOptions = [
    { label: "1st Quarter", value: "Q1" },
    { label: "2nd Quarter", value: "Q2" },
    { label: "3rd Quarter", value: "Q3" },
    { label: "4th Quarter", value: "Q4" },
  ];

  const filteredStudents = students
    .filter((s) => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.lrn.includes(searchTerm)
    )
    .sort((a, b) => {
      switch (sortOption) {
        case "desc":
          return b.name.localeCompare(a.name);
        case "lrn":
          return a.lrn.localeCompare(b.lrn);
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // Score calculations
  const calculateCategoryTotal = (studentId, category) => {
    const scores = category.items.map(item => 
      item.scores[studentId] || 0
    );
    return scores.reduce((sum, score) => sum + score, 0);
  };

  const calculateCategoryPercentage = (studentId, category) => {
    const totalScore = calculateCategoryTotal(studentId, category);
    const maxPossible = category.items.reduce((sum, item) => sum + item.maxScore, 0);
    return maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;
  };

  const calculateFinalGrade = (studentId) => {
    const writtenPct = calculateCategoryPercentage(studentId, categories.written);
    const performancePct = calculateCategoryPercentage(studentId, categories.performance);
    const quarterlyPct = calculateCategoryPercentage(studentId, categories.quarterly);

    return (
      writtenPct * schoolSettings.written_work_percent +
      performancePct * schoolSettings.performance_task_percent +
      quarterlyPct * schoolSettings.quarterly_assessment_percent
    );
  };

  const getGradeRemarks = (grade) => {
    if (grade >= 98) return { text: "With Highest Honors", color: "text-yellow-800", bg: "bg-yellow-100" };
    if (grade >= 95) return { text: "With High Honors", color: "text-blue-800", bg: "bg-blue-100" };
    if (grade >= 90) return { text: "With Honors", color: "text-green-800", bg: "bg-green-100" };
    if (grade >= 85) return { text: "Passed", color: "text-blue-600", bg: "bg-blue-50" };
    if (grade >= 80) return { text: "Passed", color: "text-indigo-600", bg: "bg-indigo-50" };
    if (grade >= 75) return { text: "Passed", color: "text-yellow-600", bg: "bg-yellow-50" };
    return { text: "Failed", color: "text-red-600", bg: "bg-red-50" };
  };

  // ✅ FIXED: Add Activity function to immediately show the new activity
  const addActivity = async () => {
    if (!newActivity.type) return;

    const existingItems = categories[newActivity.type]?.items?.length || 0;
    const prefix =
      newActivity.type === "written"
        ? "WW"
        : newActivity.type === "performance"
        ? "PT"
        : "QA";
    const nextNumber = existingItems + 1;
    const autoName = `${prefix}${nextNumber}`;

    const activityName = newActivity.name.trim() || autoName;

    if (!activityName || newActivity.maxScore <= 0) {
      toast.current.show({
        severity: "warn",
        summary: "Validation Error",
        detail: "Please enter a valid name and max score",
        life: 3000,
      });
      return;
    }

    if (!selectedSubjectAssignmentId) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No subject assignment found",
        life: 3000,
      });
      return;
    }

    try {
      // Duplicate check
      const { data: existing, error: checkError } = await supabase
        .from("activity_scores")
        .select("activity_name")
        .eq("subject_assignment_id", selectedSubjectAssignmentId)
        .eq("quarter", selectedQuarter)
        .eq("activity_type", newActivity.type)
        .eq("activity_name", activityName)
        .limit(1);

      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        toast.current.show({
          severity: "warn",
          summary: "Duplicate Activity",
          detail: `${activityName} already exists.`,
          life: 3000,
        });
        return;
      }

      // Insert per student
      const insertRows = students.map((student) => ({
        student_id: student.id,
        subject_assignment_id: selectedSubjectAssignmentId,
        activity_type: newActivity.type,
        activity_name: activityName,
        score: null,
        max_score: newActivity.maxScore,
        quarter: selectedQuarter,
        school_id: sectionInfo?.school_id || null,
      }));

      const { error: insertError } = await supabase
        .from("activity_scores")
        .insert(insertRows);

      if (insertError) throw insertError;

      // ✅ FIXED: Immediately add the new activity to the state instead of just reloading
      const newActivityItem = {
        id: `${newActivity.type}-${activityName}`.toLowerCase().replace(/\s+/g, '-'),
        name: activityName,
        maxScore: newActivity.maxScore,
        scores: students.reduce((acc, student) => ({ ...acc, [student.id]: null }), {}),
        categoryType: newActivity.type
      };

      setCategories(prev => ({
        ...prev,
        [newActivity.type]: {
          ...prev[newActivity.type],
          items: [...prev[newActivity.type].items, newActivityItem]
        }
      }));

      setActivityModal(false);
      setNewActivity({ type: "written", name: "", maxScore: 100 });

      toast.current.show({
        severity: "success",
        summary: "Activity Added",
        detail: `${activityName} added successfully.`,
        life: 2500,
      });
    } catch (err) {
      console.error("Error adding activity:", err.message);
      toast.current.show({
        severity: "error",
        summary: "Add Failed",
        detail: "Unable to add new activity.",
        life: 3000,
      });
    }
  };

  const removeActivity = async (categoryType, activityId, activityName) => {
    confirmDialog({
      message: `Are you sure you want to remove "${activityName}"? All related student scores will be permanently deleted.`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      accept: async () => {
        try {
          // 1️⃣ Remove from Supabase
          const { error } = await supabase
            .from("activity_scores")
            .delete()
            .eq("subject_assignment_id", selectedSubjectAssignmentId)
            .eq("activity_type", categoryType)
            .eq("activity_name", activityName)
            .eq("quarter", selectedQuarter);

          if (error) throw error;

          // 2️⃣ Remove locally from state
          setCategories((prev) => ({
            ...prev,
            [categoryType]: {
              ...prev[categoryType],
              items: prev[categoryType].items.filter(
                (item) => item.id !== activityId
              ),
            },
          }));

          toast.current.show({
            severity: "success",
            summary: "Activity Removed",
            detail: `${activityName} was deleted successfully.`,
            life: 3000,
          });

          // 3️⃣ Optional: Reload to ensure sync
          await loadActivityScores(students, selectedSubjectAssignmentId);
        } catch (err) {
          console.error("Error deleting activity:", err.message);
          toast.current.show({
            severity: "error",
            summary: "Delete Failed",
            detail: "Unable to delete the activity from database.",
            life: 3000,
          });
        }
      },
    });
  };

  const handleScoreChange = async (studentId, activityId, categoryType, value) => {
    if (initializing) return;

    const numericValue = value === null ? 0 : value;

    setCategories(prev => ({
      ...prev,
      [categoryType]: {
        ...prev[categoryType],
        items: prev[categoryType].items.map(item =>
          item.id === activityId
            ? {
                ...item,
                scores: {
                  ...item.scores,
                  [studentId]: numericValue
                }
              }
            : item
        )
      }
    }));

    if (numericValue === 0) return;

    const activity = categories[categoryType]?.items?.find(i => i.id === activityId);
    if (!activity || !selectedSubjectAssignmentId) return;

    try {
      const { error } = await supabase
        .from("activity_scores")
        .upsert(
          {
            student_id: studentId,
            subject_assignment_id: selectedSubjectAssignmentId,
            activity_type: categoryType,
            activity_name: activity.name,
            score: numericValue,
            max_score: activity.maxScore,
            quarter: selectedQuarter,
            updated_at: new Date().toISOString(),
          },
          { onConflict: ['student_id', 'subject_assignment_id', 'activity_name', 'quarter'] }
        );
      if (error) throw error;
    } catch (err) {
      console.error("Error saving score:", err.message);
      toast.current?.show({
        severity: "error",
        summary: "Save Failed",
        detail: "Unable to update score in Supabase",
        life: 2500
      });
    }
  };

  const handleBulkScore = (activityId, categoryType, value) => {
    const numericValue = value === null ? 0 : value;
    
    setCategories(prev => ({
      ...prev,
      [categoryType]: {
        ...prev[categoryType],
        items: prev[categoryType].items.map(item =>
          item.id === activityId
            ? {
                ...item,
                scores: students.reduce((acc, student) => ({
                  ...acc,
                  [student.id]: numericValue
                }), {})
              }
            : item
        )
      }
    }));
  };

  // UPDATED: Save grades to database
  const saveGrades = async () => {
    if (!selectedSubjectAssignmentId) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No subject assignment found',
        life: 3000
      });
      return;
    }

    setSaving(true);

    try {
      const quarterCode = selectedQuarter;

      // 1️⃣ Prepare all activity scores for upsert
      const activityScoreRows = [];

      Object.entries(categories).forEach(([categoryType, category]) => {
        category.items.forEach(activity => {
          students.forEach(student => {
            const score = activity.scores[student.id] ?? 0;
            activityScoreRows.push({
              student_id: student.id,
              subject_assignment_id: selectedSubjectAssignmentId,
              activity_type: categoryType,
              activity_name: activity.name,
              score,
              max_score: activity.maxScore,
              quarter: quarterCode,
              school_id: sectionInfo?.school_id || null
            });
          });
        });
      });

      // Bulk upsert all activity scores at once
      if (activityScoreRows.length > 0) {
        const { error: activityError } = await supabase
          .from('activity_scores')
          .upsert(activityScoreRows, {
            onConflict: ['student_id', 'subject_assignment_id', 'activity_name', 'quarter']
          });
        if (activityError) throw activityError;
      }

      // 2️⃣ Prepare final grades
      const gradesToSave = students.map(student => {
        const writtenPct = calculateCategoryPercentage(student.id, categories.written);
        const performancePct = calculateCategoryPercentage(student.id, categories.performance);
        const quarterlyPct = calculateCategoryPercentage(student.id, categories.quarterly);

        const finalGrade =
          writtenPct * (schoolSettings.written_work_percent / 100) +
          performancePct * (schoolSettings.performance_task_percent / 100) +
          quarterlyPct * (schoolSettings.quarterly_assessment_percent / 100);

        return {
          student_id: student.id,
          subject_assignment_id: selectedSubjectAssignmentId,
          quarter: quarterCode,
          written_work: writtenPct,
          performance_task: performancePct,
          quarterly_assessment: quarterlyPct,
          final_grade: finalGrade,
          school_id: sectionInfo?.school_id || null
        };
      });

      // Upsert final grades
      if (gradesToSave.length > 0) {
        const { error: gradeError } = await supabase
          .from('grades')
          .upsert(gradesToSave, {
            onConflict: ['student_id', 'subject_assignment_id', 'quarter']
          });
        if (gradeError) throw gradeError;
      }

      toast.current.show({
        severity: 'success',
        summary: 'Grades Saved',
        detail: 'All grades have been saved successfully',
        life: 3000
      });

    } catch (error) {
      console.error('Error saving grades:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Save Failed',
        detail: 'Failed to save grades to database',
        life: 3000
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ProgressSpinner style={{ width: '50px', height: '50px' }} />
          <p className="mt-4 text-gray-600">Loading class data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar setVisible={setVisible} user={user} profilePic={profilePic} />
      <Sidebar visible={visible} setVisible={setVisible} />
      <Toast ref={toast} />
      <ConfirmDialog />

      <main className="p-6">
        {/* Header Section */}
        {sectionInfo && (
          <div className="mb-6 bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Grade {sectionInfo.grade_level} - {sectionInfo.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  School Year: {sectionInfo.school_year?.sy_label || "N/A"} • 
                  Students: {students.length} • 
                  Quarter: {quarterOptions.find(q => q.value === selectedQuarter)?.label || selectedQuarter}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Weights: Written {schoolSettings.written_work_percent * 100}% • 
                  Performance {schoolSettings.performance_task_percent * 100}% • 
                  Quarterly {schoolSettings.quarterly_assessment_percent * 100}%
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  label="Add Activity"
                  icon="pi pi-plus"
                  className="p-button-success"
                  onClick={() => setActivityModal(true)}
                />
                <Button
                  label={saving ? "Saving..." : "Save Grades"}
                  icon="pi pi-save"
                  className="p-button-primary"
                  onClick={handleSaveFinalGrades}
                  disabled={saving}
                />
                <Button
                  label="Print"
                  icon="pi pi-print"
                  className="p-button-help"
                  onClick={() => window.print()}
                />
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 p-4 bg-white rounded-lg shadow">
          <div className="flex flex-wrap items-center gap-3">
            <span className="p-input-icon-left">
              <i className="pi pi-search" />
              <InputText
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or LRN..."
                className="w-64"
              />
            </span>
            <Dropdown
              value={sortOption}
              options={sortOptions}
              onChange={(e) => setSortOption(e.value)}
              placeholder="Sort by"
              className="w-32"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Subject:</span>
            <Dropdown
              value={selectedSubjectAssignmentId}
              options={subjectAssignments.map(sa => ({ label: sa.subject_name, value: sa.id }))}
              onChange={(e) => setSelectedSubjectAssignmentId(e.value)}
              placeholder="Select Subject"
              className="w-48"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Quarter:</span>
            <Dropdown
              value={selectedQuarter}
              options={quarterOptions}
              onChange={(e) => setSelectedQuarter(e.value)}
              className="w-40"
            />
          </div>
        </div>

        {/* Grade Table - FIXED: Added null checks for categories */}
        <div className="bg-white shadow-xl rounded-xl border border-gray-200 overflow-auto">
          <table className="w-full border-collapse text-sm min-w-[1200px]">
            <thead>
              <tr className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                <th rowSpan="2" className="border border-gray-600 px-4 py-3 text-left sticky left-0 bg-gray-700 z-10 min-w-60">
                  STUDENT NAME
                </th>
                
                {/* FIXED: Added null checks for categories */}
                {categories && Object.entries(categories).map(([key, category]) => {
                  const categoryPercent =
                    key === "written"
                      ? schoolSettings?.written_work_percent
                      : key === "performance"
                      ? schoolSettings?.performance_task_percent
                      : schoolSettings?.quarterly_assessment_percent;

                  return (
                    <th
                      key={key}
                      colSpan={(category?.items?.length || 0) + 2}
                      className={`border border-gray-600 px-3 py-3 bg-${category?.color}-600`}
                    >
                      {category?.label} ({(categoryPercent * 100).toFixed(0)}%)
                    </th>
                  );
                })}
                
                <th rowSpan="2" className="border border-gray-600 px-3 py-3 bg-gray-600">
                  FINAL GRADE
                </th>
                <th rowSpan="2" className="border border-gray-600 px-3 py-3 bg-gray-600">
                  REMARKS
                </th>
              </tr>
              
              <tr className="bg-gray-600 text-white">
                {/* FIXED: Added null checks for categories */}
                {categories && Object.entries(categories).map(([key, category]) => (
                  <React.Fragment key={key}>
                    {category?.items?.map((item) => (
                      <th key={item.id} className="border border-gray-500 px-2 py-2">
                        <div className="flex items-center justify-between cursor-pointer hover:bg-gray-100 rounded p-1">
                          <div onClick={() => handleActivityClick(item, key)}>
                            <span className="font-medium mr-2">{item.name}</span>
                            <span className="text-xs opacity-80">({item.maxScore})</span>
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="border border-gray-500 px-2 py-2 font-semibold bg-gray-500">
                      Total
                    </th>
                    <th className="border border-gray-500 px-2 py-2 font-semibold bg-gray-500">
                      %
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {filteredStudents.map((student, index) => {
                const finalGrade = calculateFinalGrade(student.id);
                const remarks = getGradeRemarks(finalGrade);

                return (
                  <tr
                    key={student.id}
                    className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                  >
                    {/* Student Info */}
                    <td className="border border-gray-300 px-2 py-1 text-left font-medium sticky left-0 bg-white">
                      <div>
                        <div className="font-semibold text-sm">{student.name}</div>
                        <div className="text-xs text-gray-500">LRN: {student.lrn}</div>
                      </div>
                    </td>

                    {/* Category Columns - FIXED: Added null checks */}
                    {categories && Object.entries(categories).map(([key, category]) => {
                      const total = calculateCategoryTotal(student.id, category);
                      const percentage = calculateCategoryPercentage(student.id, category);

                      return (
                        <React.Fragment key={key}>
                          {category?.items?.map((item) => {
                            const score = item.scores?.[student.id];
                            const isBlank = score === undefined || score === null || score === "";

                            return (
                              <td
                                key={`${student.id}-${item.id}`}
                                className={`border border-gray-300 px-2 py-1 text-center text-sm ${
                                  isBlank ? "bg-red-100 text-red-600 font-semibold" : "text-gray-800"
                                }`}
                                title={isBlank ? "No score recorded" : ""}
                              >
                                {isBlank ? "—" : score}
                              </td>
                            );
                          })}

                          {/* Totals */}
                          <td className="border border-gray-300 px-2 py-1 font-semibold text-center bg-gray-100 text-sm">
                            {total.toFixed(1)}
                          </td>
                          <td className="border border-gray-300 px-2 py-1 font-semibold text-center bg-gray-100 text-sm">
                            {percentage.toFixed(1)}%
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {/* Final Grade & Remarks */}
                    <td
                      className={`border border-gray-300 px-2 py-1 text-center font-bold text-sm ${remarks.bg}`}
                    >
                      {isNaN(finalGrade) ? "0.00" : finalGrade.toFixed(2)}
                    </td>
                    <td
                      className={`border border-gray-300 px-2 py-1 text-center font-semibold text-sm ${remarks.color} ${remarks.bg}`}
                    >
                      {remarks.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quick Stats */}
        {filteredStudents.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 font-medium">Class Average</div>
              <div className="text-2xl font-bold text-blue-800">
                {(
                  filteredStudents.reduce((sum, student) => sum + calculateFinalGrade(student.id), 0) / 
                  filteredStudents.length
                ).toFixed(2)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-medium">Highest Grade</div>
              <div className="text-2xl font-bold text-green-800">
                {Math.max(...filteredStudents.map(student => calculateFinalGrade(student.id))).toFixed(2)}
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-600 font-medium">Lowest Grade</div>
              <div className="text-2xl font-bold text-yellow-800">
                {Math.min(...filteredStudents.map(student => calculateFinalGrade(student.id))).toFixed(2)}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-600 font-medium">Passing Rate</div>
              <div className="text-2xl font-bold text-purple-800">
                {(
                  (filteredStudents.filter(student => calculateFinalGrade(student.id) >= 75).length / 
                  filteredStudents.length) * 100
                ).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Activity Modal */}
      <Dialog
        header="Add New Activity"
        visible={activityModal}
        onHide={() => setActivityModal(false)}
        className="w-11/12 md:w-1/2 lg:w-1/3"
        contentClassName="bg-gray-900 text-white border border-gray-700"
        headerClassName="bg-gray-800 text-white border-b border-gray-700"
      >
        <div className="flex flex-col gap-4 p-4">
          <div>
            <label className="block font-medium mb-2 text-gray-300">Activity Type:</label>
            <Dropdown
              value={newActivity.type}
              options={[
                { label: "Written Work", value: "written" },
                { label: "Performance Task", value: "performance" },
                { label: "Quarterly Assessment", value: "quarterly" }
              ]}
              onChange={(e) => setNewActivity(prev => ({ ...prev, type: e.value }))}
              className="w-full"
              panelClassName="bg-gray-800 border border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block font-medium mb-2 text-gray-300">Activity Name:</label>
            <InputText
              value={newActivity.name}
              onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Quiz 1, Project Presentation"
              className="w-full bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block font-medium mb-2 text-gray-300">Maximum Score:</label>
            <InputNumber
              value={newActivity.maxScore}
              onValueChange={(e) => setNewActivity(prev => ({ ...prev, maxScore: e.value }))}
              min={1}
              max={1000}
              className="w-full"
              inputClassName="bg-gray-800 border-gray-600 text-white"
              incrementButtonClassName="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
              decrementButtonClassName="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
            />
          </div>
          <Button 
            label="Add Activity" 
            onClick={addActivity} 
            className="p-button-primary bg-blue-600 hover:bg-blue-700 border-blue-600"
            disabled={!newActivity.name.trim() || newActivity.maxScore <= 0}
          />
        </div>
      </Dialog>

      {/* Activity Detail Modal */}
      <Dialog
        header={selectedActivity ? `${selectedActivity.name} - Student Scores` : "Activity Details"}
        visible={activityDetailModal}
        onHide={() => {
          setActivityDetailModal(false);
          setBulkScoreValue(0);
        }}
        className="w-11/12 md:w-3/4 lg:w-2/3"
        contentClassName="bg-white"
        headerClassName="bg-gray-800 text-white"
      >
        {selectedActivity && (
          <div className="p-4">
            {/* Activity Information */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedActivity.name}</h3>
                  <p className="text-gray-600">
                    Category: {categories[selectedActivity.categoryType]?.label}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Max Score:</span>
                  <InputNumber
                    value={selectedActivity.maxScore}
                    onValueChange={(e) =>
                      setSelectedActivity((prev) => ({
                        ...prev,
                        maxScore: e.value,
                      }))
                    }
                    min={1}
                    max={1000}
                    className="w-24"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Score Section */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">Apply score to all students:</span>
                <InputNumber
                  value={bulkScoreValue}
                  onValueChange={(e) => setBulkScoreValue(e.value)}
                  min={0}
                  max={selectedActivity.maxScore}
                  className="w-24"
                />
                <Button
                  label={bulkScoreValue ? "Apply to All" : "Clear All"}
                  icon={bulkScoreValue ? "pi pi-check" : "pi pi-times"}
                  className={bulkScoreValue ? "p-button-primary" : "p-button-danger"}
                  onClick={() => {
                    setSelectedActivity((prev) => ({
                      ...prev,
                      scores: filteredStudents.reduce(
                        (acc, s) => ({
                          ...acc,
                          [s.id]: bulkScoreValue ?? "",
                        }),
                        {}
                      ),
                    }));
                  }}
                />
              </div>
            </div>

            {/* Student Scores Table */}
            <div className="overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 px-4 py-2 text-left">Student</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Score</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const score = selectedActivity?.scores?.[student.id] ?? "";
                    const isBlank = score === "" || score === null;

                    return (
                      <tr key={student.id}>
                        <td className="border border-gray-300 px-4 py-2 text-left">
                          {student.name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <InputText
                            value={
                              score === null || score === "" ? "" : score
                            }
                            onChange={(e) => {
                              const val = e.target.value.trim();

                              // Handle "M" or "m" for missing
                              let newScore;
                              if (val.toLowerCase() === "m") {
                                newScore = null;
                              } else if (val === "") {
                                newScore = "";
                              } else {
                                const num = parseFloat(val);
                                newScore = isNaN(num) ? "" : num;
                              }

                              setSelectedActivity((prev) => ({
                                ...prev,
                                scores: { ...(prev.scores || {}), [student.id]: newScore },
                              }));
                            }}
                            placeholder="Enter score or 'M'"
                            className={`w-24 text-center ${
                              score === null ? "border-red-500 bg-red-50 text-red-700 font-semibold" : ""
                            }`}
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {selectedActivity.maxScore
                            ? ((score / selectedActivity.maxScore) * 100).toFixed(1) + "%"
                            : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            {filteredStudents.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="text-sm text-green-600 font-medium">Average</div>
                  <div className="text-xl font-bold text-green-800">
                    {(
                      filteredStudents.reduce(
                        (sum, s) => sum + (selectedActivity.scores?.[s.id] ?? 0),
                        0
                      ) / filteredStudents.length
                    ).toFixed(1)}
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">Highest</div>
                  <div className="text-xl font-bold text-blue-800">
                    {Math.max(
                      ...filteredStudents.map(
                        (s) => selectedActivity.scores?.[s.id] ?? 0
                      )
                    )}
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-600 font-medium">Lowest</div>
                  <div className="text-xl font-bold text-yellow-800">
                    {Math.min(
                      ...filteredStudents.map(
                        (s) => selectedActivity.scores?.[s.id] ?? 0
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Save & Cancel Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                label="Cancel"
                icon="pi pi-times"
                className="p-button-text p-button-secondary"
                onClick={() => {
                  setActivityDetailModal(false);
                  setBulkScoreValue(0);
                }}
              />
              
              <Button
                label="Save Grades"
                icon="pi pi-save"
                className="p-button-primary"
                onClick={async () => {
                  try {
                    const updates = filteredStudents.map((student) => ({
                      student_id: student.id,
                      subject_assignment_id: selectedSubjectAssignmentId,
                      activity_type: selectedActivity.categoryType,
                      activity_name: selectedActivity.name,
                      score:
                        selectedActivity.scores?.[student.id] === "" ||
                        selectedActivity.scores?.[student.id] === undefined
                          ? null
                          : selectedActivity.scores?.[student.id],
                      max_score: selectedActivity.maxScore,
                      quarter: selectedQuarter,
                      school_id: sectionInfo?.school_id || null,
                    }));

                    const { error } = await supabase
                      .from("activity_scores")
                      .upsert(updates, {
                        onConflict: [
                          "student_id",
                          "subject_assignment_id",
                          "activity_name",
                          "quarter",
                        ],
                      });

                    if (error) throw error;

                    // ✅ Refresh the main table immediately after saving
                    await reloadData();
                    await new Promise((r) => setTimeout(r, 200));

                    toast.current.show({
                      severity: "success",
                      summary: "Saved",
                      detail: "All scores saved successfully.",
                      life: 2500,
                    });

                    setActivityDetailModal(false);
                    setBulkScoreValue(0);
                  } catch (err) {
                    console.error("Error saving activity:", err.message);
                    toast.current.show({
                      severity: "error",
                      summary: "Save Failed",
                      detail: "Could not save scores to database.",
                      life: 3000,
                    });
                  }
                }}
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default SubjectGrade;