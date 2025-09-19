import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function PasswordInput({ label, value, onChange }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col p-2.5 relative">
      <label className="font-semibold">{label}</label>
      <input
        type={showPassword ? "text" : "password"}
        placeholder={label}
        required
        value={value}
        onChange={onChange}
        className="w-full p-2 border-2 border-blue-400 rounded mt-1 focus:outline-none focus:border-Blue2 focus:ring-1 focus:ring-Blue2"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-9 text-gray-600"
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  );
}
