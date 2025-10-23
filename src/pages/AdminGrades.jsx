import React, { useState, useEffect } from "react";
import supabase from "../config/supabaseclient";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Badge } from "primereact/badge";
import { ProgressSpinner } from "primereact/progressspinner";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { InputNumber } from "primereact/inputnumber";

export default function AdminGrades() {
  // --- Refs ---
  const toast = useRef(null);

  // --- Existing States ---
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSY, setSelectedSY] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [manageSY, setManageSY] = useState(false);
  const [viewSection, setViewSection] = useState(null);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [newSY, setNewSY] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [adviser, setAdviser] = useState(null);
  const [gradeLevel, setGradeLevel] = useState(null);
  const [subjectAssignments, setSubjectAssignments] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- New State for Room Number ---
  const [roomNumber, setRoomNumber] = useState("");

  // --- Curriculum States ---
  const [curriculums, setCurriculums] = useState([]);
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [curriculumName, setCurriculumName] = useState("");
  const [editingCurriculum, setEditingCurriculum] = useState(null);
  const [curriculumGradeLevel, setCurriculumGradeLevel] = useState(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState("");

  // --- Enhanced Curriculum States ---
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [currentGradeSubject, setCurrentGradeSubject] = useState("");
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceGrade, setCopySourceGrade] = useState(null);
  const [copyTargetGrades, setCopyTargetGrades] = useState([]);

  // --- Grades Weight Modal State ---
  const [showGradesWeightModal, setShowGradesWeightModal] = useState(false);

  // --- Grades Weight States ---
  const [weightForm, setWeightForm] = useState({
    written_work: 40,    // Display as 40%
    performance_task: 50, // Display as 50%
    quarterly_assessment: 20 // Display as 20%
  });
  const [currentWeights, setCurrentWeights] = useState(null);
  const [changeLog, setChangeLog] = useState([]);

  // --- Section Modal Subjects based on Grade Level ---
  const [curriculumSubjectsForSection, setCurriculumSubjectsForSection] = useState([]);

  // --- Modal Mode: "add" or "edit" ---
  const [modalMode, setModalMode] = useState("add");

  const gradeLevels = [
    { id: 1, name: "1" }, { id: 2, name: "2" }, { id: 3, name: "3" }, { id: 4, name: "4" },
    { id: 5, name: "5" }, { id: 6, name: "6" }, { id: 7, name: "7" }, { id: 8, name: "8" },
    { id: 9, name: "9" }, { id: 10, name: "10" }
  ];

  // Calculate total percentage for grades weight
  const totalPercentage = weightForm.written_work + weightForm.performance_task + weightForm.quarterly_assessment;

  const handleStartDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    setStartDate(e.target.value);

    if (!isNaN(selectedDate)) {
      const calculatedEndDate = new Date(selectedDate);
      calculatedEndDate.setDate(calculatedEndDate.getDate() + 220);

      const yyyy = calculatedEndDate.getFullYear();
      const mm = String(calculatedEndDate.getMonth() + 1).padStart(2, "0");
      const dd = String(calculatedEndDate.getDate()).padStart(2, "0");
      const formattedEndDate = `${yyyy}-${mm}-${dd}`;

      setEndDate(formattedEndDate);
    }
  };

  // --- Toast Helper ---
  const showToast = (severity, summary, detail) => {
    toast.current.show({ severity, summary, detail, life: 3000 });
  };

  // Fetch current weights
  const fetchCurrentWeights = async () => {
    if (!schoolId) return;

    try {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // Convert from decimal (0.40) to percentage (40) for display
        setCurrentWeights({
          written_work_percent: data.written_work_percent,
          performance_task_percent: data.performance_task_percent,
          quarterly_assessment_percent: data.quarterly_assessment_percent
        });

        setWeightForm({
          written_work: data.written_work_percent * 100, // Convert 0.40 → 40
          performance_task: data.performance_task_percent * 100, // Convert 0.50 → 50
          quarterly_assessment: data.quarterly_assessment_percent * 100 // Convert 0.20 → 20
        });
      } else {
        // Set default display values
        const defaultWeights = {
          written_work: 40,
          performance_task: 50,
          quarterly_assessment: 20
        };
        setWeightForm(defaultWeights);
        setCurrentWeights({
          written_work_percent: 0.40,
          performance_task_percent: 0.50,
          quarterly_assessment_percent: 0.20
        });
      }
    } catch (error) {
      console.error('Error fetching weights:', error);
      showToast('error', 'Error', 'Failed to load grade weights');
    }
  };

  // Handle weight changes
  const handleWeightChange = (field, value) => {
    setWeightForm(prev => ({
      ...prev,
      [field]: value || 0
    }));
  };

  // Save weights to database
  const handleSaveWeights = async () => {
    if (totalPercentage !== 100) {
      showToast('warn', 'Warning', 'Total must equal 100%');
      return;
    }

    try {
      setSaving(true);

      // Convert from percentage (40) to decimal (0.40) for database
      const weightsData = {
        written_work_percent: weightForm.written_work / 100, // Convert 40 → 0.40
        performance_task_percent: weightForm.performance_task / 100, // Convert 50 → 0.50
        quarterly_assessment_percent: weightForm.quarterly_assessment / 100, // Convert 20 → 0.20
        school_id: schoolId,
        updated_at: new Date().toISOString()
      };

      // Upsert to school_settings table
      const { data, error } = await supabase
        .from('school_settings')
        .upsert(weightsData, { onConflict: 'school_id' });

      if (error) throw error;

      // Add to change log (use display values)
      const logMessage = `Weights updated: Written Work ${weightForm.written_work}%, Performance Task ${weightForm.performance_task}%, Quarterly Assessment ${weightForm.quarterly_assessment}%`;
      setChangeLog(prev => [{
        timestamp: new Date().toISOString(),
        message: logMessage
      }, ...prev.slice(0, 4)]);

      // Update current weights (store database values)
      setCurrentWeights(weightsData);

      showToast('success', 'Success', 'Grades weights saved successfully!');
      setShowGradesWeightModal(false);

    } catch (error) {
      console.error('Error saving weights:', error);
      showToast('error', 'Error', 'Failed to save weights configuration: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Add this useEffect for grades weight modal
  useEffect(() => {
    if (showGradesWeightModal) {
      fetchCurrentWeights();
      setChangeLog([]); // Clear log when reopening
    }
  }, [showGradesWeightModal, schoolId]);

  // --- Fetch Data ---
  useEffect(() => {
    if (!schoolId) return;
    fetchSchoolYears();
    fetchTeachers();
    fetchSections();
    fetchCurriculums();
    fetchCurrentWeights(); // 👈 Add this line
  }, [schoolId]);

  useEffect(() => {
    const fetchSchoolId = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          showToast('error', 'Error', 'No logged-in user found');
          return;
        }

        const { data, error } = await supabase
          .from("admins")
          .select("school_id")
          .eq("auth_id", user.id)
          .single();

        if (error) throw error;
        setSchoolId(data.school_id);
      } catch (error) {
        showToast('error', 'Error', 'Failed to fetch school ID: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSchoolId();
  }, []);

  // --- Fetch Data ---
  useEffect(() => {
    if (!schoolId) return;
    fetchSchoolYears();
    fetchTeachers();
    fetchSections();
    fetchCurriculums();
  }, [schoolId]);

  useEffect(() => {
    const fetchSubjectsForGrade = async () => {
      if (!gradeLevel) {
        setCurriculumSubjectsForSection([]);
        return;
      }
      try {
        const { data: activeCurriculum, error } = await supabase
          .from("curriculums")
          .select("id")
          .eq("is_active", true)
          .eq("school_id", schoolId)
          .single();

        if (error || !activeCurriculum) {
          setCurriculumSubjectsForSection([]);
          return;
        }

        const { data: subjectsData } = await supabase
          .from("curriculum_subjects")
          .select("subject_name")
          .eq("curriculum_id", activeCurriculum.id)
          .eq("grade_level", gradeLevel.name);

        setCurriculumSubjectsForSection(subjectsData || []);
      } catch (error) {
        console.error("Error fetching subjects:", error);
        setCurriculumSubjectsForSection([]);
      }
    };
    fetchSubjectsForGrade();
  }, [gradeLevel, schoolId]);

  const fetchSchoolYears = async () => {
    try {
      const { data, error } = await supabase
        .from("school_years")
        .select("*")
        .eq("school_id", schoolId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setSchoolYears(data || []);
      if (data?.length) setSelectedSY(data.find(sy => sy.is_active) || data[0]);
    } catch (error) {
      showToast('error', 'Error', 'Failed to load school years: ' + error.message);
    }
  };

  const fetchTeachers = async () => {
  try {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, fullname, auth_id") // Make sure to select the actual id
      .eq("school_id", schoolId);

    if (error) throw error;
    
    // Use the actual teacher id, not auth_id
    setTeachers(data.map(t => ({ 
      id: t.id, // Use the teacher table id, not auth_id
      name: t.fullname,
      auth_id: t.auth_id // Keep this for reference if needed
    })));
  } catch (error) {
    showToast('error', 'Error', 'Failed to fetch teachers: ' + error.message);
  }
};

  const fetchSections = async () => {
  try {
    const { data: sectionsData, error: secErr } = await supabase
      .from("sections")
      .select("*")
      .eq("school_id", schoolId);

    if (secErr) throw secErr;

    // Try to fetch assignments without school_id filter first
    let assignmentsData;
    try {
      // First try with school_id filter
      const { data, error } = await supabase
        .from("subject_assignments")
        .select("*")
        .eq("school_id", schoolId);
      
      if (error) throw error;
      assignmentsData = data;
    } catch (assignErr) {
      console.warn("School_id filter failed, trying without:", assignErr);
      
      // Fallback: try without school_id filter
      const { data, error } = await supabase
        .from("subject_assignments")
        .select("*");
      
      if (error) throw error;
      assignmentsData = data;
    }

    const sectionsWithAssignments = sectionsData.map(section => {
      const assignments = {};
      assignmentsData
        ?.filter(sa => sa.section_id === section.id)
        .forEach(sa => { assignments[sa.subject_name] = sa.teacher_id; });
      return { ...section, subjects: assignments };
    });
    
    setSections(sectionsWithAssignments);
  } catch (err) {
    console.error("Error fetching sections:", err);
    showToast('error', 'Error', 'Failed to fetch sections: ' + err.message);
  }
};

  const fetchCurriculums = async () => {
    try {
      const { data, error } = await supabase
        .from("curriculums")
        .select(`id, name, is_active, curriculum_subjects(*)`)
        .eq("school_id", schoolId);

      if (error) throw error;
      setCurriculums(data || []);
    } catch (error) {
      showToast('error', 'Error', 'Failed to fetch curriculums: ' + error.message);
    }
  };

  // --- Curriculum Functions ---
  const addCurriculum = async () => {
    if (!curriculumName) {
      showToast('warn', 'Warning', 'Please enter curriculum name');
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.from("curriculums").insert([{
        name: curriculumName,
        is_active: false,
        school_id: schoolId
      }]);
      if (error) throw error;
      setCurriculumName("");
      showToast('success', 'Success', 'Curriculum added successfully!');
      await fetchCurriculums();
    } catch (error) {
      showToast('error', 'Error', 'Failed to add curriculum: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const setActiveCurriculum = async (id) => {
    try {
      setSaving(true);
      await supabase
        .from("curriculums")
        .update({ is_active: false })
        .eq("school_id", schoolId)
        .neq("id", id);

      const { error } = await supabase
        .from("curriculums")
        .update({ is_active: true })
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      showToast('success', 'Success', 'Curriculum activated successfully!');
      await fetchCurriculums();
    } catch (error) {
      showToast('error', 'Error', 'Failed to set active curriculum: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const editCurriculum = (cur) => {
    setEditingCurriculum(cur);
    setCurriculumSubjects(cur.curriculum_subjects || []);
    setCurriculumGradeLevel(null);
    setSelectedGrades([]);
    setCurrentGradeSubject("");
    setShowCurriculumModal(true);
  };

  const saveCurriculumSubjects = async () => {
    if (!editingCurriculum) {
      showToast('warn', 'Warning', 'No curriculum selected');
      return;
    }

    try {
      setSaving(true);
      
      // Delete all existing subjects for this curriculum
      await supabase.from("curriculum_subjects")
        .delete()
        .eq("curriculum_id", editingCurriculum.id);

      // Insert all subjects
      const toInsert = curriculumSubjects.map(s => ({
        curriculum_id: editingCurriculum.id,
        subject_name: s.subject_name,
        grade_level: s.grade_level
      }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from("curriculum_subjects").insert(toInsert);
        if (error) throw error;
      }

      await fetchCurriculums();
      setEditingCurriculum(null);
      setCurriculumGradeLevel(null);
      setCurriculumSubjects([]);
      showToast('success', 'Success', 'Curriculum updated successfully!');
    } catch (err) {
      showToast('error', 'Error', 'Failed to save curriculum: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Enhanced Curriculum Functions ---
  const handleQuickAddSubject = () => {
    if (!newSubject.trim()) {
      showToast('warn', 'Warning', 'Please enter a subject name');
      return;
    }

    if (selectedGrades.length === 0) {
      showToast('warn', 'Warning', 'Please select at least one grade level');
      return;
    }

    const newSubjects = [];
    selectedGrades.forEach(grade => {
      const exists = curriculumSubjects.find(
        s => s.subject_name.toLowerCase() === newSubject.toLowerCase() &&
             s.grade_level === grade
      );
      if (!exists) {
        newSubjects.push({ subject_name: newSubject, grade_level: grade });
      }
    });

    if (newSubjects.length > 0) {
      setCurriculumSubjects([...curriculumSubjects, ...newSubjects]);
      showToast('success', 'Success', `Added "${newSubject}" to ${newSubjects.length} grade(s)`);
      setNewSubject("");
      setSelectedGrades([]);
    } else {
      showToast('info', 'Info', 'Subject already exists in all selected grades');
    }
  };

  const handleAddToCurrentGrade = () => {
    if (!currentGradeSubject.trim() || !curriculumGradeLevel) return;

    const exists = curriculumSubjects.find(
      s => s.subject_name.toLowerCase() === currentGradeSubject.toLowerCase() &&
           s.grade_level === curriculumGradeLevel.name
    );

    if (exists) {
      showToast('warn', 'Warning', 'Subject already exists for this grade level');
      return;
    }

    setCurriculumSubjects([
      ...curriculumSubjects,
      { subject_name: currentGradeSubject, grade_level: curriculumGradeLevel.name }
    ]);
    setCurrentGradeSubject("");
    showToast('success', 'Success', `Added "${currentGradeSubject}" to Grade ${curriculumGradeLevel.name}`);
  };

  const handleCopySubjectToGrades = (subjectName) => {
    const availableGrades = gradeLevels.filter(grade => 
      !curriculumSubjects.find(s => 
        s.subject_name === subjectName && s.grade_level === grade.name
      )
    ).map(g => g.name);

    if (availableGrades.length === 0) {
      showToast('info', 'Info', 'This subject already exists in all grades');
      return;
    }

    setSelectedGrades(availableGrades);
    setNewSubject(subjectName);
    showToast('info', 'Info', `Ready to copy "${subjectName}" to other grades`);
  };

  const handleImportFromTemplate = () => {
    // Common subject templates by grade level
    const commonTemplates = {
      elementary: ['Mathematics', 'English', 'Science', 'Filipino', 'Araling Panlipunan', 'MAPEH', 'EPP', 'EsP'],
      juniorHigh: ['Mathematics', 'English', 'Science', 'Filipino', 'Araling Panlipunan', 'MAPEH', 'TLE', 'EsP'],
      seniorHigh: ['Core Mathematics', 'Oral Communication', 'General Biology', 'Earth Science', 'PE and Health']
    };

    // Auto-fill based on grade level
    if (curriculumGradeLevel) {
      let template = [];
      const gradeNum = parseInt(curriculumGradeLevel.name);
      
      if (gradeNum <= 6) template = commonTemplates.elementary;
      else if (gradeNum <= 10) template = commonTemplates.juniorHigh;
      else template = commonTemplates.seniorHigh;

      const newSubjects = template.map(subject => ({
        subject_name: subject,
        grade_level: curriculumGradeLevel.name
      })).filter(newSubj => 
        !curriculumSubjects.find(existing => 
          existing.subject_name === newSubj.subject_name && 
          existing.grade_level === newSubj.grade_level
        )
      );

      if (newSubjects.length > 0) {
        setCurriculumSubjects([...curriculumSubjects, ...newSubjects]);
        showToast('success', 'Success', `Added ${newSubjects.length} common subjects for Grade ${curriculumGradeLevel.name}`);
      } else {
        showToast('info', 'Info', 'All common subjects already exist for this grade');
      }
    }
  };

  const handleCopyFromGrade = () => {
    if (!copySourceGrade) {
      showToast('warn', 'Warning', 'Please select source grade');
      return;
    }

    if (copyTargetGrades.length === 0) {
      showToast('warn', 'Warning', 'Please select target grades');
      return;
    }

    const sourceSubjects = curriculumSubjects.filter(s => s.grade_level === copySourceGrade.name);
    if (sourceSubjects.length === 0) {
      showToast('info', 'Info', 'No subjects found in source grade');
      return;
    }

    const newSubjects = [];
    copyTargetGrades.forEach(targetGrade => {
      sourceSubjects.forEach(sourceSubject => {
        const exists = curriculumSubjects.find(
          s => s.subject_name === sourceSubject.subject_name && s.grade_level === targetGrade
        );
        if (!exists) {
          newSubjects.push({
            subject_name: sourceSubject.subject_name,
            grade_level: targetGrade
          });
        }
      });
    });

    if (newSubjects.length > 0) {
      setCurriculumSubjects([...curriculumSubjects, ...newSubjects]);
      showToast('success', 'Success', `Copied ${newSubjects.length} subjects to ${copyTargetGrades.length} grade(s)`);
      setShowCopyModal(false);
      setCopySourceGrade(null);
      setCopyTargetGrades([]);
    } else {
      showToast('info', 'Info', 'All subjects already exist in target grades');
    }
  };

  // --- Section Functions ---
  const resetForm = () => {
    setSectionName("");
    setAdviser(null);
    setGradeLevel(null);
    setSubjectAssignments({});
    setEditingSectionId(null);
    setCurriculumSubjectsForSection([]);
    setViewSection(null);
    setModalMode("add");
    setRoomNumber(""); // Reset room number
    setShowModal(false);
  };

  const handleSave = async () => {
  if (!sectionName || !adviser || !gradeLevel || !selectedSY) {
    showToast('warn', 'Warning', 'Please complete all required fields');
    return;
  }

  try {
    setSaving(true);
    let sectionId = editingSectionId;

    // Prepare section data
    const sectionData = {
      name: sectionName.trim(),
      grade_level: gradeLevel.name,
      adviser_id: adviser.id, // This should be the teacher's id (from teachers table)
      school_year_id: selectedSY.id,
      school_id: schoolId,
      room_number: roomNumber || null
    };

    console.log('Saving section with adviser ID:', adviser.id);

    if (editingSectionId) {
      // Update existing section
      const { data, error } = await supabase
        .from("sections")
        .update(sectionData)
        .eq("id", editingSectionId)
        .select()
        .single();

      if (error) throw error;
      sectionId = data.id;
      
      // Delete existing subject assignments
      const { error: deleteError } = await supabase
        .from("subject_assignments")
        .delete()
        .eq("section_id", editingSectionId);
      
      if (deleteError) throw deleteError;
    } else {
      // Create new section
      const { data, error } = await supabase
        .from("sections")
        .insert([sectionData])
        .select()
        .single();

      if (error) throw error;
      sectionId = data.id;
    }

    // Handle subject assignments - FIXED: Use teacher IDs correctly
    const assignmentsToInsert = Object.entries(subjectAssignments)
      .filter(([_, teacherId]) => teacherId) // teacherId should be from teachers table
      .map(([subject_name, teacher_id]) => ({
        section_id: sectionId,
        teacher_id: teacher_id, // This should be the teacher's id (from teachers table)
        school_year_id: selectedSY.id,
        subject_name: subject_name,
        school_id: schoolId
      }));

    console.log('Assignments to insert:', assignmentsToInsert);

    if (assignmentsToInsert.length > 0) {
      const { error: assignmentError } = await supabase
        .from("subject_assignments")
        .insert(assignmentsToInsert);

      if (assignmentError) throw assignmentError;
    }

    await fetchSections();
    resetForm();
    showToast('success', 'Success', `Section ${editingSectionId ? 'updated' : 'created'} successfully!`);

  } catch (err) {
    console.error('Save failed:', err);
    showToast('error', 'Error', `Save failed: ${err.message}`);
  } finally {
    setSaving(false);
  }
};

  const confirmArchive = (section) => {
    confirmDialog({
      message: `Are you sure you want to archive "${section.name}"? This action cannot be undone.`,
      header: 'Confirm Archive',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => archiveSection(section.id),
    });
  };

  const archiveSection = async (sectionId) => {
    try {
      // Implement your archive logic here
      showToast('success', 'Success', 'Section archived successfully!');
      await fetchSections();
    } catch (error) {
      showToast('error', 'Error', 'Failed to archive section: ' + error.message);
    }
  };

  const teacherTemplate = (opt) => opt ? (
    <div className="flex items-center gap-2">
      <i className="pi pi-user text-blue-500"></i>
      <span>{opt.name}</span>
    </div>
  ) : <span>Select Teacher</span>;

  const filteredSections = sections.filter(sec =>
    (!selectedSY || sec.school_year_id === selectedSY.id) &&
    (!filterGrade || sec.grade_level === filterGrade.name) &&
    (sec.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openAddModal = () => { resetForm(); setModalMode("add"); setShowModal(true); };
  const openViewModal = (sec) => {
    setViewSection(sec);
    setSectionName(sec.name);
    setGradeLevel(gradeLevels.find(gl => gl.name === sec.grade_level));
    setAdviser(teachers.find(t => t.id === sec.adviser_id));
    setSubjectAssignments(sec.subjects || {});
    setEditingSectionId(sec.id);
    setRoomNumber(sec.room_number || ""); // Set room number when editing
    setModalMode("edit");
    setShowModal(true);
  };

  const getGradeColor = (grade) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-red-100 text-red-800 border-red-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200'
    ];
    return colors[(grade - 1) % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ProgressSpinner style={{ width: '50px', height: '50px' }} />
          <p className="mt-4 text-gray-600">Loading section management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 ">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Section Management</h1>
            <p className="text-gray-600 mt-2">Manage sections, curriculum, and school years</p>
          </div>
          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            <Dropdown
              value={selectedSY}
              onChange={(e) => setSelectedSY(e.value)}
              options={schoolYears}
              optionLabel="sy_label"
              placeholder="Select School Year"
              className="w-64 bg-white shadow-2xl p-2 rounded-md font-semibold "
            />
            <Badge value={filteredSections.length} className="bg-blue-500 text-white ml-2 p-1" />
          </div>
        </div>

        {/* Action Buttons */}
        <Card className="shadow-sm border-0 mb-6">
          <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
            <Button
              label="Manage School Years"
              icon="pi pi-calendar"
              onClick={() => setManageSY(true)}
              className="bg-blue-600 hover:bg-blue-700 border-0 shadow-sm text-gray-50 p-2 rounded-md font-semibold"
            />
            <Button
              label="Add Section"
              icon="pi pi-plus"
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 border-0 shadow-sm text-gray-50 p-2 rounded-md font-semibold"
            />
            <Button
              label="Manage Curriculum"
              icon="pi pi-book"
              onClick={() => setShowCurriculumModal(true)}
              className="bg-blue-600 hover:bg-blue-700 border-0 shadow-sm text-gray-50 p-2 rounded-md font-semibold"
            />
            {/* New Grades Weight Button */}
            <Button
              label="Grades Weight"
              icon="pi pi-percentage"
              onClick={() => setShowGradesWeightModal(true)}
              className="bg-blue-600 hover:bg-blue-700 border-0 shadow-sm text-gray-50 p-2 rounded-md font-semibold"
            />
          </div>
        </Card>

        {/* Filters */}
        <Card className="shadow-sm border-0 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="pi pi-search mr-2"></i>
                Search Sections
              </label>
              <InputText
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter section name..."
                className="w-full p-2 rounded-md font-semibold border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="pi pi-filter mr-2"></i>
                Filter by Grade
              </label>
              <Dropdown
                value={filterGrade}
                options={gradeLevels}
                onChange={(e) => setFilterGrade(e.value)}
                optionLabel="name"
                placeholder="All Grades"
                className="w-full p-2 rounded-md font-semibold border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                panelClassName="bg-gray-50 p-2"
                showClear
              />
            </div>
            <div className="flex items-end">
              <Button
                label="Clear Filters"
                icon="pi pi-refresh"
                className="w-full bg-blue-600 hover:bg-blue-700 border-0 shadow-sm text-gray-50 p-2 rounded-md font-semibold"
                onClick={() => { setSearchTerm(""); setFilterGrade(null); }}
                disabled={!searchTerm && !filterGrade}
              />
            </div>
          </div>
        </Card>

        {/* Sections Table */}
        <Card className="shadow-sm border-0">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12">
              <i className="pi pi-inbox text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-500 mb-2">
                {sections.length === 0 ? "No Sections Found" : "No Matching Sections"}
              </h3>
              <p className="text-gray-400 mb-6">
                {sections.length === 0
                  ? "Get started by creating your first section."
                  : "Try adjusting your search criteria."}
              </p>
              <Button
                label="Add First Section"
                icon="pi pi-plus"
                className="bg-blue-600 hover:bg-blue-700 border-0 p-2 rounded-md text-gray-50 font-semibold"
                onClick={openAddModal}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade Level
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Section Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room Number
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adviser
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subjects
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSections.map(sec => (
                    <tr key={sec.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getGradeColor(parseInt(sec.grade_level))}`}>
                          <i className="pi pi-graduation-cap mr-2"></i>
                          Grade {sec.grade_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                        {sec.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {sec.room_number || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {teachers.find(t => t.id === sec.adviser_id)?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(sec.subjects || {}).length > 0 ? (
                            Object.keys(sec.subjects).map(subj => (
                              <span key={subj} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                                {subj}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">No subjects</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Button
                            icon="pi pi-eye"
                            className="p-button-info p-button-sm text-blue-600"
                            tooltip="View Section Details"
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => openViewModal(sec)}
                          />
                          <Button
                            icon="pi pi-pencil"
                            className="p-button-warning p-button-sm text-blue-600"
                            tooltip="Edit Section"
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => openViewModal(sec)}
                          />
                          <Button
                            icon="pi pi-archive"
                            className="p-button-danger p-button-sm"
                            tooltip="Archive Section"
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => confirmArchive(sec)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* --- Manage School Year Modal --- */}
        <Dialog
          header={
            <div className="flex items-center gap-2">
              <i className="pi pi-calendar text-blue-500"></i>
              <span className="font-semibold">Manage School Years</span>
            </div>
          }
          visible={manageSY}
          onHide={() => setManageSY(false)}
          className="w-11/12 md:w-8/12 lg:w-6/12 bg-white p-4 rounded-md shadow-2xl"
          modal
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">School Year</label>
                <InputText
                  value={newSY}
                  onChange={(e) => {
                    // Only allow numbers and dash, enforce format like 2020-2021
                    const value = e.target.value.replace(/[^0-9-]/g, '');
                    
                    // Auto-format: add dash after 4 digits
                    if (value.length === 4 && !value.includes('-')) {
                      setNewSY(value + '-');
                    } else {
                      setNewSY(value);
                    }
                  }}
                  placeholder="2024-2025"
                  className="w-full p-2 rounded-md font-semibold border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  maxLength={9} // 2024-2025 = 9 characters
                />
                <p className="text-xs text-gray-500 mt-1">Format: YYYY-YYYY</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <InputText
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="w-full p-2 rounded-md font-semibold border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <InputText
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 rounded-md font-semibold border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>

            <Button
              label="Add School Year"
              icon="pi pi-plus"
              className="w-full bg-blue-600 hover:bg-blue-700 border-0 shadow-sm text-gray-50 p-2 rounded-md font-semibold"
              onClick={async () => {
                // Validation
                if (!newSY || !startDate || !endDate) {
                  showToast('warn', 'Warning', 'Please complete all fields');
                  return;
                }

                // Validate SY format (must be like 2024-2025)
                const syRegex = /^\d{4}-\d{4}$/;
                if (!syRegex.test(newSY)) {
                  showToast('warn', 'Warning', 'School year must be in format: YYYY-YYYY (e.g., 2024-2025)');
                  return;
                }

                // Check if years are sequential
                const [startYear, endYear] = newSY.split('-').map(Number);
                if (endYear - startYear !== 1) {
                  showToast('warn', 'Warning', 'School year must be sequential (e.g., 2024-2025)');
                  return;
                }

                // Check for duplicate school year
                const isDuplicate = schoolYears.some(sy => sy.sy_label === newSY);
                if (isDuplicate) {
                  showToast('warn', 'Warning', `School year "${newSY}" already exists`);
                  return;
                }

                try {
                  setSaving(true);
                  const { error } = await supabase.from("school_years").insert([{
                    sy_label: newSY,
                    start_date: startDate,
                    end_date: endDate,
                    is_active: false,
                    school_id: schoolId
                  }]);
                  if (error) throw error;
                  
                  // Reset form
                  setNewSY("");
                  setStartDate("");
                  setEndDate("");
                  
                  showToast('success', 'Success', 'School year added successfully!');
                  await fetchSchoolYears();
                } catch (error) {
                  showToast('error', 'Error', 'Failed to add school year: ' + error.message);
                } finally {
                  setSaving(false);
                }
              }}
              loading={saving}
            />

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium bg-yellow-300 text-black">School Year</th>
                    <th className="px-4 py-3 text-left text-sm font-medium bg-yellow-300 text-black">Start Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium bg-yellow-300 text-black">End Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium bg-yellow-300 text-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {schoolYears.map((sy) => (
                    <tr key={sy.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{sy.sy_label}</td>
                      <td className="px-4 py-3 text-sm">{new Date(sy.start_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">{new Date(sy.end_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">
                        {sy.is_active ? (
                          <Badge value="Active" severity="success" className="text-blue-600"/>
                        ) : (
                          <Button
                            label="Set Active"
                            className="p-button-text p-button-sm text-blue-600 underline"
                            onClick={async () => {
                              try {
                                setSaving(true);
                                await supabase
                                  .from("school_years")
                                  .update({ is_active: false })
                                  .eq("school_id", schoolId)
                                  .neq("id", sy.id);

                                const { error } = await supabase
                                  .from("school_years")
                                  .update({ is_active: true })
                                  .eq("id", sy.id)
                                  .eq("school_id", schoolId);

                                if (error) throw error;
                                showToast('success', 'Success', 'School year activated!');
                                await fetchSchoolYears();
                              } catch (error) {
                                showToast('error', 'Error', error.message);
                              } finally {
                                setSaving(false);
                              }
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Dialog>

        {/* --- Add/Edit Section Modal --- */}
        <Dialog
          header={
            <div className="flex items-center gap-2">
              <i className="pi pi-bookmark text-blue-500"></i>
              <span className="font-semibold">{modalMode === "edit" ? `Edit Section: ${sectionName}` : "Add New Section"}</span>
            </div>
          }
          visible={showModal}
          onHide={resetForm}
          className="w-11/12 md:w-8/12 lg:w-6/12 bg-white shadow-2xl p-4 rounded-lg"
          modal
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section Name</label>
                <InputText
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="Enter section name"
                  className="w-full p-2 rounded-md font-semibold border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                <Dropdown
                  value={gradeLevel}
                  options={gradeLevels}
                  onChange={(e) => setGradeLevel(e.value)}
                  optionLabel="name"
                  placeholder="Select grade level"
                  className="w-full p-2 rounded-md font-semibold bg-blue-600 text-gray-50"
                  panelClassName="bg-gray-50 p-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adviser</label>
                <Dropdown
                  value={adviser}
                  options={teachers}
                  onChange={(e) => setAdviser(e.value)}
                  optionLabel="name"
                  placeholder="Select adviser"
                  className="w-full p-2 rounded-md font-semibold bg-blue-600 text-gray-50"
                  panelClassName="bg-gray-50 p-2"
                  valueTemplate={teacherTemplate}
                  itemTemplate={teacherTemplate}
                  filter
                  showClear
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                <InputText
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="Enter room number"
                  className="w-full p-2 rounded-md font-semibold border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>

            {curriculumSubjectsForSection.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Subject Assignments</label>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {curriculumSubjectsForSection.map(subj => (
                    <div key={subj.subject_name} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <span className="font-medium text-gray-700">{subj.subject_name}</span>
                      <Dropdown
                        value={teachers.find(t => t.id === subjectAssignments[subj.subject_name]) || null}
                        options={teachers}
                        onChange={(e) => setSubjectAssignments({
                          ...subjectAssignments,
                          [subj.subject_name]: e.value?.id
                        })}
                        optionLabel="name"
                        placeholder="Assign teacher"
                        className="w-48 p-2 rounded-md font-semibold bg-blue-600 text-gray-50"
                        panelClassName="p-2 bg-gray-50"
                        showClear
                        filter
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                label="Cancel"
                icon="pi pi-times"
                className="flex-1 bg-white  p-2 text-black font-semibold rounded-md shadow-2xl border border-gray-2000"
                onClick={resetForm}
              />
              <Button
                label={modalMode === "edit" ? "Update Section" : "Create Section"}
                icon="pi pi-check"
                className="flex-1 bg-blue-600 hover:bg-blue-700 border-0 p-2 text-gray-50 font-semibold rounded-md"
                onClick={handleSave}
                loading={saving}
              />
            </div>
          </div>
        </Dialog>

        {/* --- Enhanced Curriculum Management Modal --- */}
        <Dialog
          header={
            <div className="flex items-center gap-2">
              <i className="pi pi-book text-purple-500"></i>
              <span>{editingCurriculum ? `Edit Curriculum: ${editingCurriculum.name}` : "Curriculum Management"}</span>
            </div>
          }
          visible={showCurriculumModal}
          onHide={() => { setShowCurriculumModal(false); setEditingCurriculum(null); setCurriculumSubjects([]); }}
          className="w-11/12 md:w-10/12 lg:w-9/12 bg-white p-4 rounded-xl shadow-2xl"
          modal
        >
          {!editingCurriculum ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <InputText
                  value={curriculumName}
                  onChange={(e) => setCurriculumName(e.target.value)}
                  placeholder="Enter curriculum name (e.g., K-12 Basic Education)"
                  className="w-full p-2 rounded-md font-semibold border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                />
                <Button
                  label="Add Curriculum"
                  icon="pi pi-plus"
                  className="w-48 bg-blue-600 hover:bg-blue-700 border-0 p-2 text-gray-50 font-semibold rounded-md"
                  onClick={addCurriculum}
                  loading={saving}
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium bg-yellow-300 text-black">Curriculum Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium bg-yellow-300 text-black">Total Subjects</th>
                      <th className="px-4 py-3 text-left text-sm font-medium bg-yellow-300 text-black">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium bg-yellow-300 text-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {curriculums.map((cur) => (
                      <tr key={cur.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{cur.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{cur.curriculum_subjects?.length || 0} subjects</td>
                        <td className="px-4 py-3 text-sm">
                          {cur.is_active ? (
                            <Badge value="Active" severity="success" />
                          ) : (
                            <Button
                              label="Set Active"
                              className="p-button-text p-button-sm text-blue-600"
                              onClick={() => setActiveCurriculum(cur.id)}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Button
                            icon="pi pi-pencil"
                            className="p-button-warning p-button-sm text-blue-600"
                            tooltip="Edit Curriculum Subjects"
                            onClick={() => editCurriculum(cur)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Enhanced Edit Curriculum View
            <div className="space-y-4">
              {/* Quick Actions Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-blue-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-blue-800">Grade Level Subject Management</h3>
                  <p className="text-sm text-blue-600">Add subjects efficiently across multiple grades</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    label="Back to List"
                    icon="pi pi-arrow-left"
                    className="bg-white text-blue-700 border border-blue-300 p-2 rounded-md"
                    onClick={() => setEditingCurriculum(null)}
                  />
                  <Button
                    label="Save All Changes"
                    icon="pi pi-save"
                    className="bg-blue-600 hover:bg-blue-700 border-0 p-2 text-gray-50 rounded-md"
                    onClick={saveCurriculumSubjects}
                    loading={saving}
                  />
                </div>
              </div>

              {/* Bulk Subject Addition */}
              <Card className="shadow-sm border-0">
                <div className="p-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Quick Add Subjects to Multiple Grades</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <InputText
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="Enter subject name (e.g., Mathematics, Science)"
                        className="w-full p-2 rounded-md border border-gray-300 focus:border-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newSubject.trim()) {
                            handleQuickAddSubject();
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        label="Add to Selected"
                        icon="pi pi-plus"
                        className="flex-1 bg-green-600 hover:bg-green-700 border-0 p-2 text-white rounded-md"
                        onClick={handleQuickAddSubject}
                        disabled={!newSubject.trim() || !selectedGrades.length}
                      />
                    </div>
                  </div>
                  
                  {/* Grade Level Selection for Bulk Add */}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Grade Levels for Bulk Addition:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {gradeLevels.map(grade => (
                        <div key={grade.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`grade-${grade.id}`}
                            checked={selectedGrades.includes(grade.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGrades([...selectedGrades, grade.name]);
                              } else {
                                setSelectedGrades(selectedGrades.filter(g => g !== grade.name));
                              }
                            }}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`grade-${grade.id}`} className="text-sm text-gray-700">
                            Grade {grade.name}
                          </label>
                        </div>
                      ))}
                      <Button
                        label="Select All"
                        className="p-button-text p-button-sm text-blue-600 text-xs"
                        onClick={() => setSelectedGrades(gradeLevels.map(g => g.name))}
                      />
                      <Button
                        label="Clear All"
                        className="p-button-text p-button-sm text-gray-600 text-xs"
                        onClick={() => setSelectedGrades([])}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Grade Level Tabs for Individual Management */}
              <Card className="shadow-sm border-0">
                <div className="border-b">
                  <div className="flex overflow-x-auto">
                    {gradeLevels.map(grade => (
                      <button
                        key={grade.id}
                        className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                          curriculumGradeLevel?.id === grade.id
                            ? 'border-blue-500 text-blue-600 bg-blue-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => setCurriculumGradeLevel(grade)}
                      >
                        Grade {grade.name}
                        <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                          {curriculumSubjects.filter(s => s.grade_level === grade.name).length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject Management for Selected Grade */}
                {curriculumGradeLevel && (
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-700">
                        Subjects for Grade {curriculumGradeLevel.name}
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({curriculumSubjects.filter(s => s.grade_level === curriculumGradeLevel.name).length} subjects)
                        </span>
                      </h4>
                      
                      {/* Quick Actions for Current Grade */}
                      <div className="flex gap-2">
                        <Button
                          icon="pi pi-download"
                          className="p-button-outlined p-button-sm"
                          tooltip="Import from template"
                          onClick={handleImportFromTemplate}
                        />
                        <Button
                          icon="pi pi-copy"
                          className="p-button-outlined p-button-sm"
                          tooltip="Copy from another grade"
                          onClick={() => setShowCopyModal(true)}
                        />
                      </div>
                    </div>

                    {/* Subject List with Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                      {curriculumSubjects
                        .filter(s => s.grade_level === curriculumGradeLevel.name)
                        .map((subj, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 group"
                          >
                            <span className="font-medium text-gray-700 flex items-center">
                              <i className="pi pi-book mr-2 text-blue-500"></i>
                              {subj.subject_name}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                icon="pi pi-copy"
                                className="p-button-text p-button-sm text-blue-600"
                                tooltip="Copy to other grades"
                                onClick={() => handleCopySubjectToGrades(subj.subject_name)}
                              />
                              <Button
                                icon="pi pi-times"
                                className="p-button-text p-button-sm text-red-600"
                                onClick={() => setCurriculumSubjects(curriculumSubjects.filter(s => s !== subj))}
                              />
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {curriculumSubjects.filter(s => s.grade_level === curriculumGradeLevel.name).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <i className="pi pi-inbox text-4xl mb-3"></i>
                        <p>No subjects added for this grade level</p>
                        <p className="text-sm">Use the bulk add above or add individually below</p>
                      </div>
                    )}

                    {/* Quick Add for Current Grade Only */}
                    <div className="flex gap-2 mt-4">
                      <InputText
                        value={currentGradeSubject}
                        onChange={(e) => setCurrentGradeSubject(e.target.value)}
                        placeholder={`Add subject for Grade ${curriculumGradeLevel.name}...`}
                        className="flex-1 p-2 rounded-md border border-gray-300 focus:border-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && currentGradeSubject.trim()) {
                            handleAddToCurrentGrade();
                          }
                        }}
                      />
                      <Button
                        label="Add to This Grade"
                        icon="pi pi-plus"
                        className="bg-blue-600 hover:bg-blue-700 border-0 p-2 text-white rounded-md"
                        onClick={handleAddToCurrentGrade}
                        disabled={!currentGradeSubject.trim()}
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {curriculumSubjects.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Subjects</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {new Set(curriculumSubjects.map(s => s.subject_name)).size}
                  </div>
                  <div className="text-sm text-gray-600">Unique Subjects</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {gradeLevels.filter(grade => 
                      curriculumSubjects.some(s => s.grade_level === grade.name)
                    ).length}
                  </div>
                  <div className="text-sm text-gray-600">Grades Covered</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.max(...gradeLevels.map(grade => 
                      curriculumSubjects.filter(s => s.grade_level === grade.name).length
                    ), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Most in One Grade</div>
                </div>
              </div>
            </div>
          )}
        </Dialog>

        {/* Copy Subjects Modal */}
        <Dialog
          header="Copy Subjects Between Grades"
          visible={showCopyModal}
          onHide={() => { setShowCopyModal(false); setCopySourceGrade(null); setCopyTargetGrades([]); }}
          className="w-11/12 md:w-6/12"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Copy From Grade:</label>
              <Dropdown
                value={copySourceGrade}
                options={gradeLevels}
                onChange={(e) => setCopySourceGrade(e.value)}
                optionLabel="name"
                placeholder="Select source grade"
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Copy To Grades:</label>
              <div className="flex flex-wrap gap-2">
                {gradeLevels
                  .filter(grade => grade.name !== copySourceGrade?.name)
                  .map(grade => (
                    <div key={grade.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`copy-grade-${grade.id}`}
                        checked={copyTargetGrades.includes(grade.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCopyTargetGrades([...copyTargetGrades, grade.name]);
                          } else {
                            setCopyTargetGrades(copyTargetGrades.filter(g => g !== grade.name));
                          }
                        }}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`copy-grade-${grade.id}`} className="text-sm text-gray-700">
                        Grade {grade.name}
                      </label>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                label="Cancel"
                className="p-button-text"
                onClick={() => setShowCopyModal(false)}
              />
              <Button
                label="Copy Subjects"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleCopyFromGrade}
                disabled={!copySourceGrade || copyTargetGrades.length === 0}
              />
            </div>
          </div>
        </Dialog>

        {/* --- Grades Weight Modal --- */}
        <Dialog
          header={
            <div className="flex items-center gap-2">
              <i className="pi pi-percentage text-orange-500"></i>
              <span>Grades Weight Management</span>
            </div>
          }
          visible={showGradesWeightModal}
          onHide={() => setShowGradesWeightModal(false)}
          className="w-11/12 md:w-8/12 lg:w-6/12 bg-white shadow-2xl p-4 rounded-lg"
          modal
        >
          <div className="space-y-4">
            <div className="text-center py-4">
              <i className="pi pi-cog text-4xl text-orange-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Grades Weight Configuration</h3>
              <p className="text-gray-500">
                Configure the weight percentages for different grading components. Total must equal 100%.
              </p>
            </div>
           
            {/* Current Weights Display */}
            {currentWeights && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-semibold text-blue-700 mb-2">Current Weights</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>Written Work: <span className="font-semibold">{weightForm.written_work}%</span></div>
                  <div>Performance Task: <span className="font-semibold">{weightForm.performance_task}%</span></div>
                  <div>Quarterly Assessment: <span className="font-semibold">{weightForm.quarterly_assessment}%</span></div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Database values: {currentWeights.written_work_percent}, {currentWeights.performance_task_percent}, {currentWeights.quarterly_assessment_percent}
                </div>
              </div>
            )}

            {/* Weight Inputs */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Written Work */}
                <div className="border rounded-lg p-4 bg-white">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Written Work (%)
                  </label>
                 <InputNumber
                    value={weightForm.written_work}
                    onValueChange={(e) => handleWeightChange('written_work', e.value)}
                    mode="decimal"
                    min={0}
                    max={100}
                    suffix="%"
                    className="w-full"
                    placeholder="e.g., 40"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Quizzes, Assignments, Written Tests
                  </p>
                </div>

                {/* Performance Task */}
                <div className="border rounded-lg p-4 bg-white">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Performance Task (%)
                  </label>
                  <InputNumber
                    value={weightForm.performance_task}
                    onValueChange={(e) => handleWeightChange('performance_task', e.value)}
                    mode="decimal"
                    min={0}
                    max={100}
                    suffix="%"
                    className="w-full"
                    placeholder="e.g., 40"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Projects, Activities, Practical Work
                  </p>
                </div>

                {/* Quarterly Assessment */}
                <div className="border rounded-lg p-4 bg-white">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quarterly Assessment (%)
                  </label>
                  <InputNumber
                    value={weightForm.quarterly_assessment}
                    onValueChange={(e) => handleWeightChange('quarterly_assessment', e.value)}
                    mode="decimal"
                    min={0}
                    max={100}
                    suffix="%"
                    className="w-full"
                    placeholder="e.g., 20"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Major Exams, Final Assessments
                  </p>
                </div>
              </div>

              {/* Total Validation */}
              <div className={`p-3 rounded-lg text-center font-semibold ${
                totalPercentage === 100
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                Total: {totalPercentage}% {totalPercentage === 100 ? '✓' : '✗'}
                {totalPercentage !== 100 && (
                  <p className="text-sm font-normal mt-1">
                    Total must equal exactly 100%
                  </p>
                )}
              </div>
            </div>

            {/* Change Log */}
            {changeLog.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50 max-h-40 overflow-y-auto">
                <h4 className="font-semibold text-gray-700 mb-2">Recent Changes</h4>
                <div className="space-y-2">
                  {changeLog.map((log, index) => (
                    <div key={index} className="text-xs text-gray-600 border-l-2 border-blue-500 pl-2">
                      <span className="font-medium">{new Date(log.timestamp).toLocaleString()}:</span>
                      {" "}{log.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                label="Close"
                icon="pi pi-times"
                className="p-button-text"
                onClick={() => setShowGradesWeightModal(false)}
              />
              <Button
                label="Save Changes"
                icon="pi pi-check"
                className="bg-blue-600 p-1 rounded-md text-gray-50 hover:bg-blue-700"
                onClick={handleSaveWeights}
                disabled={totalPercentage !== 100}
                tooltip={totalPercentage !== 100 ? "Total must equal 100%" : "Save weight configuration"}
              />
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  );
}