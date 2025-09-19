import React, { useState } from "react";
import supabase from "../config/supabaseclient";

export default function AdminAnnouncements() {
  const [announcement, setAnnouncement] = useState("");
  const [allAnnouncements, setAllAnnouncements] = useState([]);

  const postAnnouncement = async () => {
    if (!announcement.trim()) return;
    const { error } = await supabase
      .from("announcements")
      .insert([{ message: announcement }]);
    if (!error) {
      setAllAnnouncements([...allAnnouncements, { message: announcement }]);
      setAnnouncement("");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Post Announcements</h1>
      <textarea
        value={announcement}
        onChange={(e) => setAnnouncement(e.target.value)}
        className="w-full border rounded p-2 mb-2"
        placeholder="Enter announcement..."
      />
      <button
        onClick={postAnnouncement}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        Post
      </button>

      <h3 className="text-lg font-semibold mb-2">Previous Announcements</h3>
      <ul className="list-disc ml-6">
        {allAnnouncements.map((a, i) => (
          <li key={i}>{a.message}</li>
        ))}
      </ul>
    </div>
  );
}
