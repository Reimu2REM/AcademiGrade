// Signup.jsx
import React, { useState } from "react";
import { IoClose } from "react-icons/io5";
import supabase from "./config/supabaseclient";
import Slogo from "./assets/MWCISlogo.png";

export default function Signup({ onClose }) {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // 1️⃣ Sign up user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    if (!data.user) {
      alert("User created. Please check your email to confirm the account.");
      return;
    }

    const authId = data.user.id;

    // 2️⃣ Insert into teachers table
    const { error: teacherError } = await supabase.from("teachers").insert([
      {
        auth_id: authId,
        fullname,
        email,
      },
    ]);

    if (teacherError) {
      alert("Error saving teacher info: " + teacherError.message);
      return;
    }

    alert("Account created! Check your email for confirmation.");
    onClose();
  };

  return (
    <div className="absolute h-[500px] w-[800px] bg-white flex flex-col rounded-2xl shadow-lg motion-preset-expand">
      <IoClose
        onClick={onClose}
        className="absolute text-black text-4xl p-1 self-end cursor-pointer"
      />

      <div className="flex flex-row h-full">
        {/* Signup form */}
        <div className="w-96 shadow-2xl rounded-3xl h-full p-5">
          <h1 className="font-bold text-3xl mb-5">Create an Account</h1>
          <form onSubmit={handleSignUp} className="flex flex-col gap-3">
            <div className="flex flex-col">
              <label className="font-semibold">Full Name</label>
              <input
                type="text"
                placeholder="Enter full name"
                required
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className="w-full p-2 border-2 border-blue-400 rounded mt-1"
              />
            </div>

            <div className="flex flex-col">
              <label className="font-semibold">Email</label>
              <input
                type="text"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border-2 border-blue-400 rounded mt-1"
              />
            </div>

            <div className="flex flex-col">
              <label className="font-semibold">Password</label>
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border-2 border-blue-400 rounded mt-1"
              />
            </div>

            <div className="flex flex-col">
              <label className="font-semibold">Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm your password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border-2 border-blue-400 rounded mt-1"
              />
            </div>

            <button
              type="submit"
              className="bg-yellow2 text-black font-semibold w-full p-2 rounded hover:bg-Blue2 hover:text-white"
            >
              Sign Up
            </button>
          </form>
        </div>

        {/* Logo */}
        <div className="flex justify-center items-center ml-12 rounded-2xl">
          <img className="h-80" src={Slogo} alt="MWCIS Logo" />
        </div>
      </div>
    </div>
  );
}
