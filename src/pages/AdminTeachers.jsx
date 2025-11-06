import React, { useState, useEffect } from "react";
import supabase from "../config/supabaseclient";
import { IoClose, IoSearch, IoAdd, IoArchive, IoRefresh, IoKey } from "react-icons/io5";
import { FiUser, FiMail, FiKey, FiUserCheck } from "react-icons/fi";

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [archivedTeachers, setArchivedTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [schoolId, setSchoolId] = useState(null);
  const [schoolCode, setSchoolCode] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // ✅ Fetch admin's school info
  useEffect(() => {
    const fetchAdminSchool = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: adminData } = await supabase
          .from("admins")
          .select("school_id")
          .eq("email", user.email)
          .single();

        if (!adminData) return;

        setSchoolId(adminData.school_id);

        const { data: schoolData } = await supabase
          .from("schools")
          .select("code")
          .eq("id", adminData.school_id)
          .single();

        setSchoolCode(schoolData?.code || "school");
      } catch (error) {
        console.error("Error fetching school info:", error);
      }
    };

    fetchAdminSchool();
  }, []);

  // ✅ Fetch teachers
  const fetchTeachers = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      const [activeResponse, archivedResponse] = await Promise.all([
        supabase
          .from("teachers")
          .select("*")
          .eq("school_id", schoolId)
          .eq("is_archived", false)
          .order("created_at", { ascending: true }),
        supabase
          .from("teachers")
          .select("*")
          .eq("school_id", schoolId)
          .eq("is_archived", true)
          .order("created_at", { ascending: true })
      ]);

      setTeachers(activeResponse.data || []);
      setArchivedTeachers(archivedResponse.data || []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setSuccessMessage("❌ Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [schoolId]);

  // ✅ Helper functions
  const generate4DigitNumber = () => Math.floor(1000 + Math.random() * 9000);
  
  const formatFullName = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    const [last, first, middle] = parts;
    const middleInitial = middle ? `${middle.charAt(0).toUpperCase()}.` : "";
    return `${last || ""}, ${first || ""} ${middleInitial}`.trim().replace(/\s+/g, " ");
  };

  // ✅ Generate username
  const generateUsername = () => {
    if (!firstName && !lastName) return "";
    
    const first = firstName.toLowerCase().replace(/\s+/g, "");
    const last = lastName.toLowerCase().replace(/\s+/g, "");
    const randomDigits = generate4DigitNumber();
    
    return `${first}.${last}${randomDigits}`;
  };

  const handleGenerateUsername = () => {
    const generatedUsername = generateUsername();
    setUsername(generatedUsername);
  };

  // ✅ Create teacher with Supabase Auth
  const handleCreate = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Validation
    if (!lastName.trim() || !firstName.trim()) {
      setSuccessMessage("❌ Last name and first name are required.");
      return;
    }
    if (!username.trim()) {
      setSuccessMessage("❌ Username is required.");
      return;
    }
    if (password.length < 6) {
      setSuccessMessage("❌ Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setSuccessMessage("❌ Passwords do not match!");
      return;
    }
    if (!schoolId) {
      setSuccessMessage("❌ Missing school ID.");
      return;
    }

    // Combine names for database storage
    const fullName = `${lastName.trim()}, ${firstName.trim()} ${middleName.trim()}`.trim();

    // Create email from username and school code
    const email = `${username}@academigrade.${schoolCode}`;

    setCreating(true);
    setSuccessMessage("");

    try {
      // ✅ Step 1: Create Supabase Auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password,
      });

      if (signUpError) throw signUpError;

      const authUserId = signUpData?.user?.id;
      if (!authUserId) {
        throw new Error("No auth user ID returned from signup.");
      }

      // ✅ Step 2: Insert into teachers table
      const { error: teacherError } = await supabase
        .from("teachers")
        .insert([{
          auth_id: authUserId,
          fullname: fullName,
          email: email,
          school_id: schoolId,
          profile_pic: null,
          is_archived: false,
          created_at: new Date().toISOString(),
        }]);

      if (teacherError) throw teacherError;

      const successMsg = `✅ Teacher created successfully! Username: ${username}`;
      setSuccessMessage(successMsg);

      // ✅ Reset form and close modal
      setShowModal(false);
      resetForm();
      await fetchTeachers();

      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("❌ Error creating teacher:", err);
      setSuccessMessage("❌ " + (err.message || "Failed to create teacher"));
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setLastName("");
    setFirstName("");
    setMiddleName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  // ✅ Archive teacher
  const handleArchive = async (teacherId, teacherName) => {
    const confirm = window.confirm(`Are you sure you want to archive ${teacherName}?`);
    if (!confirm) return;

    const { error } = await supabase
      .from("teachers")
      .update({ is_archived: true })
      .eq("id", teacherId);

    if (error) {
      console.error("Error archiving teacher:", error);
      setSuccessMessage("❌ Failed to archive teacher.");
    } else {
      setSuccessMessage(`✅ ${teacherName} archived successfully.`);
      fetchTeachers();
    }
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  // ✅ Restore teacher
  const handleRestore = async (teacherId, teacherName) => {
    const confirm = window.confirm(`Restore ${teacherName}?`);
    if (!confirm) return;

    const { error } = await supabase
      .from("teachers")
      .update({ is_archived: false })
      .eq("id", teacherId);

    if (error) {
      console.error("Error restoring teacher:", error);
      setSuccessMessage("❌ Failed to restore teacher.");
    } else {
      setSuccessMessage(`✅ ${teacherName} restored successfully.`);
      fetchTeachers();
    }
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  // ✅ Filter teachers based on search
  const filteredTeachers = teachers.filter(
    (t) =>
      t.fullname?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredArchivedTeachers = archivedTeachers.filter(
    (t) =>
      t.fullname?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {showArchive ? "Archived Teachers" : "Teacher Management"}
            </h1>
            <p className="text-gray-600 mt-2">
              {showArchive 
                ? `Viewing ${filteredArchivedTeachers.length} archived teachers`
                : `Managing ${filteredTeachers.length} active teachers`
              }
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowArchive(!showArchive)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                showArchive 
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
            >
              <IoArchive className="text-lg" />
              {showArchive ? "View Active" : "View Archive"}
            </button>
            
            {!showArchive && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all"
              >
                <IoAdd className="text-lg" />
                Add Teacher
              </button>
            )}
            
            <button
              onClick={fetchTeachers}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-50"
            >
              <IoRefresh className={`text-lg ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Success/Error Message */}
        {successMessage && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              successMessage.includes("❌")
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative max-w-md">
            <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Search teachers by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : showArchive ? (
            <TeacherTable
              data={filteredArchivedTeachers}
              formatFullName={formatFullName}
              onRestore={handleRestore}
              archived
            />
          ) : (
            <TeacherTable
              data={filteredTeachers}
              formatFullName={formatFullName}
              onArchive={handleArchive}
            />
          )}
        </div>

        {/* Add Teacher Modal */}
        {showModal && (
          <AddTeacherModal
            onClose={() => {
              setShowModal(false);
              setSuccessMessage("");
              resetForm();
            }}
            onSubmit={handleCreate}
            {...{
              lastName,
              firstName,
              middleName,
              username,
              password,
              confirmPassword,
              creating,
              setLastName,
              setFirstName,
              setMiddleName,
              setUsername,
              setPassword,
              setConfirmPassword,
              handleGenerateUsername,
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ✅ Reusable Table Component */
function TeacherTable({ data, formatFullName, onArchive, onRestore, archived = false }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <FiUser className="mx-auto text-4xl text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900">No teachers found</h3>
        <p className="text-gray-500 mt-1">
          {archived 
            ? "No archived teachers match your search criteria."
            : "Get started by adding your first teacher."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Profile
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Full Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((teacher) => (
              <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex justify-center">
                    {teacher.profile_pic ? (
                      <img
                        src={teacher.profile_pic}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover border border-gray-300"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border border-gray-300">
                        <FiUser className="text-blue-600 text-lg" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{formatFullName(teacher.fullname)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiMail className="text-gray-400" />
                    {teacher.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {teacher.created_at ? new Date(teacher.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {archived ? (
                    <button
                      onClick={() => onRestore(teacher.id, formatFullName(teacher.fullname))}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <FiUserCheck className="text-sm" />
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => onArchive(teacher.id, formatFullName(teacher.fullname))}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <IoArchive className="text-sm" />
                      Archive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ✅ Add Teacher Modal Component */
function AddTeacherModal({
  onClose,
  onSubmit,
  lastName,
  firstName,
  middleName,
  username,
  password,
  confirmPassword,
  creating,
  setLastName,
  setFirstName,
  setMiddleName,
  setUsername,
  setPassword,
  setConfirmPassword,
  handleGenerateUsername,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSubmit(e);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add New Teacher</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <IoClose className="text-2xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Last Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FiUser className="text-gray-400" />
              Last Name
            </label>
            <input
              type="text"
              placeholder="Enter last name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* First Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FiUser className="text-gray-400" />
              First Name
            </label>
            <input
              type="text"
              placeholder="Enter first name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Middle Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FiUser className="text-gray-400" />
              Middle Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter middle name"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Username */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FiUser className="text-gray-400" />
              Username
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter username or generate one"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <button
                type="button"
                onClick={handleGenerateUsername}
                disabled={!firstName || !lastName}
                className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IoKey className="text-lg" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {firstName && lastName ? "Click the key icon to generate username" : "Enter first and last name to generate username"}
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FiKey className="text-gray-400" />
              Password
            </label>
            <input
              type="password"
              placeholder="Enter password (min. 6 characters)"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FiKey className="text-gray-400" />
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={creating}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
              creating
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            }`}
          >
            {creating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating Teacher...
              </div>
            ) : (
              "Create Teacher Account"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}