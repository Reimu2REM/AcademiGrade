import React, { useEffect, useState } from "react";
import supabase from "../config/supabaseclient";
import { useNavigate } from "react-router-dom";

export default function PowerUserDashboard({ powerUser, onLogout }) {
  const [schools, setSchools] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showCreateSchool, setShowCreateSchool] = useState(false);
  const [showEditAdmin, setShowEditAdmin] = useState(false);
  const [showEditSchool, setShowEditSchool] = useState(false);
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [createSchoolLoading, setCreateSchoolLoading] = useState(false);
  const [editAdminLoading, setEditAdminLoading] = useState(false);
  const [editSchoolLoading, setEditSchoolLoading] = useState(false);
  const [createAdminError, setCreateAdminError] = useState("");
  const [createAdminSuccess, setCreateAdminSuccess] = useState("");
  const [createSchoolError, setCreateSchoolError] = useState("");
  const [createSchoolSuccess, setCreateSchoolSuccess] = useState("");
  const [editAdminError, setEditAdminError] = useState("");
  const [editAdminSuccess, setEditAdminSuccess] = useState("");
  const [editSchoolError, setEditSchoolError] = useState("");
  const [editSchoolSuccess, setEditSchoolSuccess] = useState("");
  const [schoolTeachers, setSchoolTeachers] = useState({});
  const [selectedAdmins, setSelectedAdmins] = useState([]);
  const navigate = useNavigate();

  // Admin creation form state
  const [adminForm, setAdminForm] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
    school_id: ""
  });

  // Admin edit form state
  const [editAdminForm, setEditAdminForm] = useState({
    id: "",
    fullname: "",
    email: "",
    school_id: ""
  });

  // School creation form state
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    address: "",
    code: ""
  });

  // School edit form state
  const [editSchoolForm, setEditSchoolForm] = useState({
    id: "",
    name: "",
    address: "",
    code: ""
  });

  // Teacher creation form state
  const [teacherForm, setTeacherForm] = useState({
    fullname: "",
    email: "",
    school_id: ""
  });

  useEffect(() => {
    if (!powerUser) {
      navigate("/super-access");
      return;
    }
    fetchData();
  }, [powerUser]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch schools with admins
    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .select(`id, name, code, address, admins(fullname, email)`);

    if (!schoolError) setSchools(schoolData || []);

    // Fetch all admins
    const { data: adminData } = await supabase.from("admins").select("*");
    setAdmins(adminData || []);

    // Fetch all teachers
    const { data: teacherData } = await supabase.from("teachers").select("*");
    setTeachers(teacherData || []);

    // Fetch audit logs
    const { data: logData } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setAuditLogs(logData || []);

    setLoading(false);
  };

  const handleLogout = () => {
    onLogout();
    navigate("/super-access");
  };

  // 1. Quick School-Admin Linking
  const handleQuickLinkAdmin = async (adminId, schoolId) => {
    const { error } = await supabase
      .from("admins")
      .update({ school_id: schoolId })
      .eq("id", adminId);

    if (!error) {
      await fetchData();
      // Create audit log
      await supabase.from("audit_logs").insert([{
        action: `Linked admin to school`,
        user: powerUser?.email || "system",
        created_at: new Date().toISOString()
      }]);
    }
  };

  // 2. View Teachers Under Each School
  const fetchTeachersBySchool = async (schoolId) => {
    const { data } = await supabase
      .from("teachers")
      .select("*")
      .eq("school_id", schoolId);
    return data || [];
  };

  const toggleSchoolTeachers = async (schoolId) => {
    if (schoolTeachers[schoolId]) {
      // Close if already open
      setSchoolTeachers(prev => {
        const newState = { ...prev };
        delete newState[schoolId];
        return newState;
      });
    } else {
      // Open and fetch teachers
      const teachers = await fetchTeachersBySchool(schoolId);
      setSchoolTeachers(prev => ({
        ...prev,
        [schoolId]: teachers
      }));
    }
  };

  // 3. Quick Create Teacher
  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!teacherForm.fullname || !teacherForm.email || !teacherForm.school_id) {
      alert("Please fill all fields");
      return;
    }

    const { error } = await supabase
      .from("teachers")
      .insert([{
        ...teacherForm,
        created_at: new Date().toISOString()
      }]);

    if (!error) {
      setShowCreateTeacher(false);
      setTeacherForm({ fullname: "", email: "", school_id: "" });
      await fetchData();
      // Create audit log
      await supabase.from("audit_logs").insert([{
        action: `Created teacher: ${teacherForm.fullname}`,
        user: powerUser?.email || "system",
        created_at: new Date().toISOString()
      }]);
    }
  };

  // 4. Export Data
  const handleExportData = () => {
    const data = {
      schools: schools,
      admins: admins,
      teachers: teachers,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // 5. Quick Unlink Admin from School
  const handleUnlinkAdmin = async (adminId, adminName) => {
    if (window.confirm(`Unlink ${adminName} from their school?`)) {
      const { error } = await supabase
        .from("admins")
        .update({ school_id: null })
        .eq("id", adminId);

      if (!error) {
        await fetchData();
        // Create audit log
        await supabase.from("audit_logs").insert([{
          action: `Unlinked admin: ${adminName} from school`,
          user: powerUser?.email || "system",
          created_at: new Date().toISOString()
        }]);
      }
    }
  };

  // 6. Bulk Actions
  const handleBulkDeleteAdmins = async () => {
    if (selectedAdmins.length === 0) return;
    if (window.confirm(`Delete ${selectedAdmins.length} selected admins?`)) {
      for (const id of selectedAdmins) {
        await supabase.from("admins").delete().eq("id", id);
      }
      setSelectedAdmins([]);
      setTimeout(fetchData, 1000);
      // Create audit log
      await supabase.from("audit_logs").insert([{
        action: `Bulk deleted ${selectedAdmins.length} admins`,
        user: powerUser?.email || "system",
        created_at: new Date().toISOString()
      }]);
    }
  };

  // 7. Delete individual admin/school
  const handleDeleteAdmin = async (adminId, adminName) => {
    if (window.confirm(`Delete admin ${adminName}?`)) {
      await supabase.from("admins").delete().eq("id", adminId);
      await fetchData();
      // Create audit log
      await supabase.from("audit_logs").insert([{
        action: `Deleted admin: ${adminName}`,
        user: powerUser?.email || "system",
        created_at: new Date().toISOString()
      }]);
    }
  };

  const handleDeleteSchool = async (schoolId, schoolName) => {
    if (window.confirm(`Delete school ${schoolName}? This will unlink all admins and teachers.`)) {
      await supabase.from("schools").delete().eq("id", schoolId);
      await fetchData();
      // Create audit log
      await supabase.from("audit_logs").insert([{
        action: `Deleted school: ${schoolName}`,
        user: powerUser?.email || "system",
        created_at: new Date().toISOString()
      }]);
    }
  };

  // Your existing functions (keep all your original handleCreateAdmin, handleEditAdmin, etc.)
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreateAdminLoading(true);
    setCreateAdminError("");
    setCreateAdminSuccess("");

    try {
      // Validate form
      if (!adminForm.fullname || !adminForm.email || !adminForm.password || !adminForm.school_id) {
        setCreateAdminError("All fields are required");
        setCreateAdminLoading(false);
        return;
      }

      // Password confirmation
      if (adminForm.password !== adminForm.confirmPassword) {
        setCreateAdminError("Passwords do not match");
        setCreateAdminLoading(false);
        return;
      }

      // Password length check
      if (adminForm.password.length < 6) {
        setCreateAdminError("Password must be at least 6 characters long");
        setCreateAdminLoading(false);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminForm.email)) {
        setCreateAdminError("Please enter a valid email address");
        setCreateAdminLoading(false);
        return;
      }

      // Check if admin already exists
      const { data: existingAdmin, error: checkError } = await supabase
        .from("admins")
        .select("email")
        .eq("email", adminForm.email.trim())
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingAdmin) {
        setCreateAdminError("An admin with this email already exists");
        setCreateAdminLoading(false);
        return;
      }

      // 1️⃣ Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminForm.email.trim(),
        password: adminForm.password,
      });
      if (authError) throw authError;

      const authId = authData.user.id;

      // 2️⃣ Insert admin record into admins table
      const { data: newAdmin, error: adminError } = await supabase
        .from("admins")
        .insert([{
          fullname: adminForm.fullname.trim(),
          email: adminForm.email.trim(),
          auth_id: authId,
          password: adminForm.password,
          school_id: adminForm.school_id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      if (adminError) throw adminError;

      // 3️⃣ Optional: audit log
      await supabase
        .from("audit_logs")
        .insert([{
          action: `Created admin: ${adminForm.fullname}`,
          user: powerUser?.email || "system",
          created_at: new Date().toISOString()
        }]);

      // Reset form
      setAdminForm({
        fullname: "",
        email: "",
        password: "",
        confirmPassword: "",
        school_id: ""
      });
      setCreateAdminSuccess(`Admin ${adminForm.fullname} created successfully!`);

      // Refresh data / close modal
      await fetchData();
      setTimeout(() => setShowCreateAdmin(false), 2000);

    } catch (err) {
      console.error("Create admin error:", err);
      setCreateAdminError(err.message || "Failed to create admin. Please try again.");
    } finally {
      setCreateAdminLoading(false);
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    setEditAdminLoading(true);
    setEditAdminError("");
    setEditAdminSuccess("");

    try {
      // Validate form
      if (!editAdminForm.fullname || !editAdminForm.email || !editAdminForm.school_id) {
        setEditAdminError("All fields are required");
        setEditAdminLoading(false);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editAdminForm.email)) {
        setEditAdminError("Please enter a valid email address");
        setEditAdminLoading(false);
        return;
      }

      // Check if email already exists (excluding current admin)
      const { data: existingAdmin, error: checkError } = await supabase
        .from("admins")
        .select("email")
        .eq("email", editAdminForm.email.trim())
        .neq("id", editAdminForm.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingAdmin) {
        setEditAdminError("An admin with this email already exists");
        setEditAdminLoading(false);
        return;
      }

      // Update admin
      const { data: updatedAdmin, error: adminError } = await supabase
        .from("admins")
        .update({
          fullname: editAdminForm.fullname.trim(),
          email: editAdminForm.email.trim(),
          school_id: editAdminForm.school_id,
          updated_at: new Date().toISOString()
        })
        .eq("id", editAdminForm.id)
        .select()
        .single();

      if (adminError) throw adminError;

      // Create audit log
      await supabase
        .from("audit_logs")
        .insert([
          {
            action: `Updated admin: ${editAdminForm.fullname}`,
            user: powerUser.email,
            created_at: new Date().toISOString()
          }
        ]);

      // Refresh data
      await fetchData();

      setEditAdminSuccess(`Admin ${editAdminForm.fullname} updated successfully!`);
      setTimeout(() => {
        setShowEditAdmin(false);
      }, 2000);

    } catch (err) {
      console.error("Edit admin error:", err);
      setEditAdminError("Failed to update admin. Please try again.");
    } finally {
      setEditAdminLoading(false);
    }
  };

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    setCreateSchoolLoading(true);
    setCreateSchoolError("");
    setCreateSchoolSuccess("");

    try {
      // Validate form
      if (!schoolForm.name || !schoolForm.address || !schoolForm.code) {
        setCreateSchoolError("All fields are required");
        setCreateSchoolLoading(false);
        return;
      }

      // Check if school code already exists
      const { data: existingSchool } = await supabase
        .from("schools")
        .select("code")
        .eq("code", schoolForm.code.trim())
        .maybeSingle();

      if (existingSchool) {
        setCreateSchoolError("A school with this code already exists");
        setCreateSchoolLoading(false);
        return;
      }

      // Create school
      const { data: newSchool, error: schoolError } = await supabase
        .from("schools")
        .insert([
          {
            name: schoolForm.name.trim(),
            address: schoolForm.address.trim(),
            code: schoolForm.code.trim().toUpperCase()
          }
        ])
        .select()
        .single();

      if (schoolError) throw schoolError;

      // Create audit log
      await supabase
        .from("audit_logs")
        .insert([
          {
            action: `Created school: ${schoolForm.name} (${schoolForm.code})`,
            user: powerUser.email,
            created_at: new Date().toISOString()
          }
        ]);

      // Refresh data to include the new school
      await fetchData();

      // Reset form and show success
      setSchoolForm({
        name: "",
        address: "",
        code: ""
      });
      setCreateSchoolSuccess(`School ${schoolForm.name} created successfully!`);

      // Auto-select the new school in admin form if it's open
      if (showCreateAdmin) {
        setAdminForm(prev => ({
          ...prev,
          school_id: newSchool.id
        }));
      }

    } catch (err) {
      console.error("Create school error:", err);
      setCreateSchoolError("Failed to create school. Please try again.");
    } finally {
      setCreateSchoolLoading(false);
    }
  };

  const handleEditSchool = async (e) => {
    e.preventDefault();
    setEditSchoolLoading(true);
    setEditSchoolError("");
    setEditSchoolSuccess("");

    try {
      // Validate form
      if (!editSchoolForm.name || !editSchoolForm.address || !editSchoolForm.code) {
        setEditSchoolError("All fields are required");
        setEditSchoolLoading(false);
        return;
      }

      // Check if school code already exists (excluding current school)
      const { data: existingSchool } = await supabase
        .from("schools")
        .select("code")
        .eq("code", editSchoolForm.code.trim())
        .neq("id", editSchoolForm.id)
        .maybeSingle();

      if (existingSchool) {
        setEditSchoolError("A school with this code already exists");
        setEditSchoolLoading(false);
        return;
      }

      // Update school
      const { data: updatedSchool, error: schoolError } = await supabase
        .from("schools")
        .update({
          name: editSchoolForm.name.trim(),
          address: editSchoolForm.address.trim(),
          code: editSchoolForm.code.trim().toUpperCase(),
          updated_at: new Date().toISOString()
        })
        .eq("id", editSchoolForm.id)
        .select()
        .single();

      if (schoolError) throw schoolError;

      // Create audit log
      await supabase
        .from("audit_logs")
        .insert([
          {
            action: `Updated school: ${editSchoolForm.name} (${editSchoolForm.code})`,
            user: powerUser.email,
            created_at: new Date().toISOString()
          }
        ]);

      // Refresh data
      await fetchData();

      setEditSchoolSuccess(`School ${editSchoolForm.name} updated successfully!`);
      setTimeout(() => {
        setShowEditSchool(false);
      }, 2000);

    } catch (err) {
      console.error("Edit school error:", err);
      setEditSchoolError("Failed to update school. Please try again.");
    } finally {
      setEditSchoolLoading(false);
    }
  };

  const handleFormChange = (form, field, value) => {
    if (form === 'admin') {
      setAdminForm(prev => ({
        ...prev,
        [field]: value
      }));
    } else if (form === 'editAdmin') {
      setEditAdminForm(prev => ({
        ...prev,
        [field]: value
      }));
    } else if (form === 'school') {
      setSchoolForm(prev => ({
        ...prev,
        [field]: value
      }));
    } else if (form === 'editSchool') {
      setEditSchoolForm(prev => ({
        ...prev,
        [field]: value
      }));
    } else if (form === 'teacher') {
      setTeacherForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const openEditAdmin = (admin) => {
    setEditAdminForm({
      id: admin.id,
      fullname: admin.fullname,
      email: admin.email,
      school_id: admin.school_id
    });
    setShowEditAdmin(true);
  };

  const openEditSchool = (school) => {
    setEditSchoolForm({
      id: school.id,
      name: school.name,
      address: school.address,
      code: school.code
    });
    setShowEditSchool(true);
  };

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatCard = ({ title, value, icon, color, onClick }) => (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${color} hover:shadow-md transition-all duration-200 ${
        onClick ? "cursor-pointer hover:scale-105" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color.replace('border-l-', 'bg-').split('-')[0] + '-50'}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-4 mb-4 lg:mb-0">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Power User Dashboard</h1>
              <p className="text-gray-600">System Overview & Administration</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome back</p>
              <p className="font-semibold text-gray-900">{powerUser?.fullname}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:from-red-600 hover:to-red-700 focus:ring-2 focus:ring-red-200 transition-all duration-200 shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-sm p-2 mb-6 border border-gray-100">
        <div className="flex space-x-1">
          {["overview", "schools", "admins", "audit"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab === "overview" && "Overview"}
              {tab === "schools" && "Schools"}
              {tab === "admins" && "Admins"}
              {tab === "audit" && "Audit Logs"}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Schools"
              value={schools.length}
              color="border-l-blue-500"
              icon={
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
              onClick={() => setActiveTab("schools")}
            />
            <StatCard
              title="Total Admins"
              value={admins.length}
              color="border-l-green-500"
              icon={
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              }
              onClick={() => setActiveTab("admins")}
            />
            <StatCard
              title="Total Teachers"
              value={teachers.length}
              color="border-l-purple-500"
              icon={
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l9-5m-9 5v10" />
                </svg>
              }
            />
          </div>

          {/* School Statistics */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">School Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schools.slice(0, 6).map(school => {
                const schoolAdmins = admins.filter(a => a.school_id === school.id);
                const schoolTeachers = teachers.filter(t => t.school_id === school.id);
                
                return (
                  <div key={school.id} className="bg-gray-50 p-4 rounded-lg border hover:shadow-md transition-shadow duration-200">
                    <h4 className="font-semibold text-gray-900">{school.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{school.code}</p>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Admins: {schoolAdmins.length}</span>
                      <span>Teachers: {schoolTeachers.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowCreateAdmin(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-green-700 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create New Admin</span>
              </button>
              <button
                onClick={() => setShowCreateSchool(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create New School</span>
              </button>
              <button
                onClick={handleExportData}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 focus:ring-2 focus:ring-purple-200 transition-all duration-200 shadow-sm flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export Data</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    <p className="text-xs text-gray-500">By {log.user}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Schools Tab */}
      {activeTab === "schools" && (
        <div className="space-y-6">
          {/* Header with Create Button */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Registered Schools</h2>
                <p className="text-gray-600">Manage all schools in the system</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search schools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => setShowCreateSchool(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add School</span>
                </button>
              </div>
            </div>
          </div>

          {/* Schools Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading schools...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admins</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quick Link</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSchools.map((school) => (
                      <React.Fragment key={school.id}>
                        <tr className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{school.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {school.code}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">{school.address}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {school.admins?.map((admin) => admin.fullname).join(", ") || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select 
                              onChange={(e) => handleQuickLinkAdmin(e.target.value, school.id)}
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              defaultValue=""
                            >
                              <option value="" disabled>Link Admin</option>
                              {admins.filter(admin => !admin.school_id).map(admin => (
                                <option key={admin.id} value={admin.id}>
                                  {admin.fullname}
                                </option>
                              ))}
                              {admins.filter(admin => !admin.school_id).length === 0 && (
                                <option disabled>No unlinked admins</option>
                              )}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap space-x-2">
                            <button
                              onClick={() => openEditSchool(school)}
                              className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSchool(school.id, school.name)}
                              className="text-red-600 hover:text-red-900 font-medium text-sm"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => toggleSchoolTeachers(school.id)}
                              className="text-green-600 hover:text-green-900 font-medium text-sm"
                            >
                              {schoolTeachers[school.id] ? 'Hide' : 'View'} Teachers
                            </button>
                          </td>
                        </tr>
                        {schoolTeachers[school.id] && (
                          <tr>
                            <td colSpan="6" className="bg-gray-50 px-6 py-4">
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-semibold text-gray-900">Teachers at {school.name}</h4>
                                <button
                                  onClick={() => {
                                    setTeacherForm({ fullname: "", email: "", school_id: school.id });
                                    setShowCreateTeacher(true);
                                  }}
                                  className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                                >
                                  + Add Teacher
                                </button>
                              </div>
                              {schoolTeachers[school.id].length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {schoolTeachers[school.id].map(teacher => (
                                    <div key={teacher.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                      <div className="flex items-center">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                        <span className="text-sm">{teacher.fullname}</span>
                                        <span className="text-xs text-gray-500 ml-2">({teacher.email})</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm">No teachers assigned to this school yet.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admins Tab */}
      {activeTab === "admins" && (
        <div className="space-y-6">
          {/* Header with Create Button */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">System Administrators</h2>
                <p className="text-gray-600">Manage school administrators</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {selectedAdmins.length > 0 && (
                  <button
                    onClick={handleBulkDeleteAdmins}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Selected ({selectedAdmins.length})</span>
                  </button>
                )}
                <button
                  onClick={() => setShowCreateAdmin(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-green-700 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create New Admin</span>
                </button>
              </div>
            </div>
          </div>

          {/* Admins Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading admins...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input 
                          type="checkbox" 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAdmins(admins.map(a => a.id));
                            } else {
                              setSelectedAdmins([]);
                            }
                          }}
                          checked={selectedAdmins.length === admins.length && admins.length > 0}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {admins.map((admin) => {
                      const school = schools.find(s => s.id === admin.school_id);
                      return (
                        <tr key={admin.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <input 
                              type="checkbox" 
                              checked={selectedAdmins.includes(admin.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAdmins([...selectedAdmins, admin.id]);
                                } else {
                                  setSelectedAdmins(selectedAdmins.filter(id => id !== admin.id));
                                }
                              }}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{admin.fullname}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{admin.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {school?.name || "No school assigned"}
                              {school?.code && (
                                <span className="text-xs text-gray-500 ml-2">({school.code})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap space-x-2">
                            <button
                              onClick={() => openEditAdmin(admin)}
                              className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                            >
                              Edit
                            </button>
                            {admin.school_id && (
                              <button
                                onClick={() => handleUnlinkAdmin(admin.id, admin.fullname)}
                                className="text-orange-600 hover:text-orange-900 font-medium text-sm"
                              >
                                Unlink
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAdmin(admin.id, admin.fullname)}
                              className="text-red-600 hover:text-red-900 font-medium text-sm"
                            >
                              Delete
                            </button>
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
      )}

      {/* Audit Logs Tab */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">System Audit Logs</h2>
            <p className="text-gray-600">Recent system activities and user actions</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading audit logs...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{log.id}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.action.includes('created') ? 'bg-green-100 text-green-800' :
                            log.action.includes('deleted') ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{log.user}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(log.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Create New Admin</h3>
                <button
                  onClick={() => setShowCreateAdmin(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {createAdminError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 text-sm">{createAdminError}</span>
                </div>
              )}

              {createAdminSuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-700 text-sm">{createAdminSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={adminForm.fullname}
                    onChange={(e) => handleFormChange("admin", "fullname", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter admin's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => handleFormChange("admin", "email", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter admin's email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => handleFormChange("admin", "password", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Set a password (min. 6 characters)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={adminForm.confirmPassword}
                    onChange={(e) => handleFormChange("admin", "confirmPassword", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm password"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Assign to School
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateAdmin(false);
                        setShowCreateSchool(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Create New School
                    </button>
                  </div>
                  <select
                    value={adminForm.school_id}
                    onChange={(e) => handleFormChange("admin", "school_id", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a school</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name} ({school.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateAdmin(false)}
                    className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAdminLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800 focus:ring-2 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50"
                  >
                    {createAdminLoading ? "Creating..." : "Create Admin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Edit Admin</h3>
                <button
                  onClick={() => setShowEditAdmin(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {editAdminError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 text-sm">{editAdminError}</span>
                </div>
              )}

              {editAdminSuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-700 text-sm">{editAdminSuccess}</span>
                </div>
              )}

              <form onSubmit={handleEditAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editAdminForm.fullname}
                    onChange={(e) => handleFormChange("editAdmin", "fullname", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editAdminForm.email}
                    onChange={(e) => handleFormChange("editAdmin", "email", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to School
                  </label>
                  <select
                    value={editAdminForm.school_id}
                    onChange={(e) => handleFormChange("editAdmin", "school_id", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a school</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name} ({school.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditAdmin(false)}
                    className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editAdminLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800 focus:ring-2 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50"
                  >
                    {editAdminLoading ? "Updating..." : "Update Admin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create School Modal */}
      {showCreateSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Create New School</h3>
                <button
                  onClick={() => setShowCreateSchool(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {createSchoolError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 text-sm">{createSchoolError}</span>
                </div>
              )}

              {createSchoolSuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-700 text-sm">{createSchoolSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateSchool} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Name
                  </label>
                  <input
                    type="text"
                    value={schoolForm.name}
                    onChange={(e) => handleFormChange("school", "name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter school name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Code
                  </label>
                  <input
                    type="text"
                    value={schoolForm.code}
                    onChange={(e) => handleFormChange("school", "code", e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter school code (e.g., SCH001)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Address
                  </label>
                  <textarea
                    value={schoolForm.address}
                    onChange={(e) => handleFormChange("school", "address", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter school address"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateSchool(false)}
                    className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSchoolLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800 focus:ring-2 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50"
                  >
                    {createSchoolLoading ? "Creating..." : "Create School"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {showEditSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Edit School</h3>
                <button
                  onClick={() => setShowEditSchool(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {editSchoolError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 text-sm">{editSchoolError}</span>
                </div>
              )}

              {editSchoolSuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-700 text-sm">{editSchoolSuccess}</span>
                </div>
              )}

              <form onSubmit={handleEditSchool} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Name
                  </label>
                  <input
                    type="text"
                    value={editSchoolForm.name}
                    onChange={(e) => handleFormChange("editSchool", "name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Code
                  </label>
                  <input
                    type="text"
                    value={editSchoolForm.code}
                    onChange={(e) => handleFormChange("editSchool", "code", e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Address
                  </label>
                  <textarea
                    value={editSchoolForm.address}
                    onChange={(e) => handleFormChange("editSchool", "address", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditSchool(false)}
                    className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSchoolLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800 focus:ring-2 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50"
                  >
                    {editSchoolLoading ? "Updating..." : "Update School"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Teacher Modal */}
      {showCreateTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Add Teacher to School</h3>
                <button
                  onClick={() => setShowCreateTeacher(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateTeacher} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teacher Name
                  </label>
                  <input
                    type="text"
                    value={teacherForm.fullname}
                    onChange={(e) => handleFormChange("teacher", "fullname", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter teacher's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={teacherForm.email}
                    onChange={(e) => handleFormChange("teacher", "email", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter teacher's email"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateTeacher(false)}
                    className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                  >
                    Add Teacher
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}