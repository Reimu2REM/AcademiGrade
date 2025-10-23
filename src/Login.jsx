// Login.jsx
import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash, FaUser, FaLock, FaExclamationTriangle } from "react-icons/fa";
import supabase from "./config/supabaseclient";
import Slogo from "./assets/MWCISlogo.png";
import acalogo from "./assets/acalogowhite.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);

  // Check for saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});

    try {
      // 1️⃣ Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to log in. User not found.");

      const auth_id = data.user.id;

      // Handle remember me functionality
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // 2️⃣ Check user role and redirect
      const [adminResponse, teacherResponse] = await Promise.all([
        supabase.from("admins").select("*").eq("auth_id", auth_id).maybeSingle(),
        supabase.from("teachers").select("*").eq("auth_id", auth_id).maybeSingle()
      ]);

      if (adminResponse.data) {
        window.location.href = "/AdminDashboard";
        return;
      }

      if (teacherResponse.data) {
        window.location.href = "/dashboard";
        return;
      }

      // 4️⃣ Not found in either table
      throw new Error("Your account is not registered as Admin or Teacher.");

    } catch (err) {
      console.error("Login error:", err);
      
      // Handle specific error cases
      let errorMessage = err.message;
      if (err.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (err.message.includes("Email not confirmed")) {
        errorMessage = "Please verify your email address before logging in.";
      } else if (err.message.includes("Too many requests")) {
        errorMessage = "Too many login attempts. Please try again later.";
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleInputFocus = (field) => {
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="flex bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 min-h-screen justify-center items-center p-4">
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm flex flex-col lg:flex-row rounded-3xl shadow-2xl overflow-hidden border border-white/20 transform transition-all duration-300 hover:shadow-3xl">
        
        {/* Login Form Section */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
          <div className="text-center lg:text-left mb-8">
            <div className="flex items-center justify-center lg:justify-start mb-4">
              <img 
                src={Slogo} 
                alt="MWCIS Logo" 
                className="h-10 w-10 mr-3"
              />
              <h1 className="font-bold text-4xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                Welcome Back!
              </h1>
            </div>
            <p className="text-gray-600 text-sm">Sign in to access your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="font-semibold text-gray-700 text-sm flex items-center">
                <FaUser className="mr-2 text-blue-600" />
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => handleInputFocus("email")}
                className={`w-full p-4 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 pl-12 ${
                  errors.email 
                    ? "border-red-500 focus:ring-red-500 bg-red-50" 
                    : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm flex items-center">
                  <FaExclamationTriangle className="mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="font-semibold text-gray-700 text-sm flex items-center">
                <FaLock className="mr-2 text-blue-600" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => handleInputFocus("password")}
                  className={`w-full p-4 border rounded-xl focus:outline-none focus:ring-2 pr-12 transition-all duration-200 pl-12 ${
                    errors.password 
                      ? "border-red-500 focus:ring-red-500 bg-red-50" 
                      : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
                <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm flex items-center">
                  <FaExclamationTriangle className="mr-1" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Remember me</span>
              </label>
              
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                onClick={() => alert("Forgot password functionality to be implemented")}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                  Logging in...
                </div>
              ) : (
                "Login"
              )}
            </button>

            {/* Error Message */}
            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
                <FaExclamationTriangle className="text-red-500 mr-3 flex-shrink-0" />
                <p className="text-red-700 text-sm">{errors.submit}</p>
              </div>
            )}
          </form>

          {/* Demo Credentials Hint */}
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-blue-800 text-sm text-center">
              <strong>Demo Access:</strong> Use your registered email and password to login
            </p>
          </div>
        </div>

        {/* Banner Section */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 flex flex-col justify-center items-center p-8 lg:p-12 text-white relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-xl"></div>
          </div>
          
          <div className="relative z-10 text-center">
            <img 
  className="h-[250px] w-[400px]  mx-auto"
  src={acalogo} 
  alt="AcademiGrade Logo" 
/>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 bg-white/10 backdrop-blur-sm p-4 rounded-2xl transform hover:scale-[1.02] transition-transform duration-300">
              AcademiGrade
            </h2>
            <p className="text-blue-100 text-sm lg:text-base max-w-md mx-auto leading-relaxed">
              Access your educational dashboard and manage your teaching activities with ease and security.
            </p>
            
            {/* Feature List */}
            <div className="mt-8 space-y-3 text-left">
              <div className="flex items-center text-blue-100">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span className="text-sm">Secure authentication</span>
              </div>
              <div className="flex items-center text-blue-100">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span className="text-sm">Role-based access control</span>
              </div>
              <div className="flex items-center text-blue-100">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span className="text-sm">Real-time data synchronization</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}