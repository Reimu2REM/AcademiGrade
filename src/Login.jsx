// Login.jsx
import React, { useState } from "react";
import { IoClose } from "react-icons/io5";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import supabase from "./config/supabaseclient";
import Slogo from "./assets/MWCISlogo.png";
import Signup from "./signup";

// ✅ Supabase Admin Email
const ADMIN_EMAIL = "admin@mwcis.ph";

export default function Login() {
  const [showsignup, setshowsignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
      return;
    }

    // ✅ Redirect based on email
    if (email === ADMIN_EMAIL) {
      window.location.href = "/admin/teachers";
    } else {
      window.location.href = "/dashboard";
    }
  };

  // FORGOT PASSWORD
  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/",
    });
    if (error) {
      alert(error.message);
    } else {
      alert("Password reset email sent! Check your inbox.");
    }
  };

  return (
    <div className="flex bg-gradient-to-bl from-[#0f172a] via-[#1e1a78] to-[#0f172a] h-screen justify-center items-center">
      <div className="h-[400px] w-[800px] bg-white flex flex-row rounded-2xl shadow-lg motion-preset-expand">
        {/* login form */}
        <div className="w-96 shadow-2xl rounded-3xl">
          <h1 className="font-bold text-3xl p-5 ml-14">Welcome Back!</h1>
          <form onSubmit={handleLogin}>
            {/* Email */}
            <div className="flex flex-col p-2.5">
              <label className="font-semibold">Email</label>
              <input
                type="text"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border-2 border-blue-400 rounded mt-1 focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2"
              />
            </div>

            {/* Password with show/hide */}
            <div className="flex flex-col p-2.5 relative">
              <label className="font-semibold">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border-2 border-blue-400 rounded mt-1 focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {/* Remember me + forgot password */}
            <div className="flex justify-between items-center">
              <div>
                <input type="checkbox" className="ml-2" />
                <label className="font-semibold text-blue-600 p-1">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-blue-600 p-2"
              >
                Forgot password?
              </button>
            </div>

            {/* Login button */}
            <div className="flex flex-col pl-2.5 pr-2.5">
              <button
                type="submit"
                className="bg-yellow2 text-black font-semibold w-full p-2 rounded hover:bg-Blue2 hover:text-white hover:font-semibold"
              >
                Login
              </button>
            </div>
          </form>

          {/* Signup link */}
          <div>
            <h3 className="text-blue-600 p-2">
              Don’t have an account?{" "}
              <span
                className="cursor-pointer underline"
                onClick={() => setshowsignup(true)}
              >
                Click here
              </span>
            </h3>
          </div>
        </div>

        {/* logo */}
        <div className="flex justify-center items-center ml-12 rounded-2xl">
          <img className="h-80" src={Slogo} alt="" />
        </div>
      </div>

      {/* signup modal */}
      {showsignup && <Signup onClose={() => setshowsignup(false)} />}
    </div>
  );
}
