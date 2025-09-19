// AdminTeachers.jsx
import React, { useEffect, useState } from "react";
import supabase from "../config/supabaseclient";

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) return alert("Error fetching teachers: " + error.message);
      setTeachers(data);
    };
    fetchTeachers();
  }, []);

  // Filter teachers based on search term
  const filteredTeachers = teachers.filter(
    (t) =>
      t.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle records_submitted
  const toggleRecords = async (id, value) => {
    const { error } = await supabase
      .from("teachers")
      .update({ records_submitted: value })
      .eq("id", id);

    if (error) return alert("Failed to update: " + error.message);

    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, records_submitted: value } : t))
    );
  };

  // Reset password
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });
    if (error) return alert("Error sending reset email: " + error.message);
    alert("Password reset email sent to " + email);
  };

  // Remove teacher
  const removeTeacher = async (id) => {
    if (!confirm("Are you sure you want to remove this teacher?")) return;

    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) return alert("Error removing teacher: " + error.message);

    setTeachers((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manage Teachers</h1>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full border border-gray-300 divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border text-left">Profile</th>
              <th className="px-4 py-2 border text-left">Full Name</th>
              <th className="px-4 py-2 border text-left">Email</th>
              <th className="px-4 py-2 border text-center">Records Submitted</th>
              <th className="px-4 py-2 border text-left">Created At</th>
              <th className="px-4 py-2 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTeachers.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">
                  <img
                    src={t.profile_pic || "/default-avatar.png"}
                    alt="Profile"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                </td>
                <td className="px-4 py-2 border">{t.fullname}</td>
                <td className="px-4 py-2 border">{t.email}</td>
                <td className="px-4 py-2 border text-center">
                  <input
                    type="checkbox"
                    checked={t.records_submitted || false}
                    onChange={() =>
                      toggleRecords(t.id, !(t.records_submitted || false))
                    }
                    className="cursor-pointer"
                  />
                </td>
                <td className="px-4 py-2 border">
                  {new Date(t.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 border text-center flex gap-2 justify-center">
                  <button
                    onClick={() => resetPassword(t.email)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => removeTeacher(t.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}

            {filteredTeachers.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-2 text-center text-gray-500">
                  No teachers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
