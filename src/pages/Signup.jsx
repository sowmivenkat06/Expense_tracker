import React from "react";
import { useNavigate } from "react-router-dom";
import { FaPiggyBank } from "react-icons/fa";

/**
 * DEPRECATED: This file is kept for backward compatibility only.
 * Please use Auth.jsx instead, which provides:
 * - Email/Password Sign Up
 * - Email/Password Sign In
 * - Google Sign-In
 * - Password Reset
 * 
 * This component is no longer used in the app.
 * See src/pages/Auth.jsx for the complete authentication system.
 */

function Signup({ setUser }) {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Redirect to Auth page
    console.warn("Signup.jsx is deprecated. Use Auth.jsx instead.");
    navigate("/");
  }, [navigate]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-emerald-50 to-green-100 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <div className="bg-emerald-100 p-4 rounded-full inline-block mb-4">
          <FaPiggyBank className="text-amber-500 text-4xl" />
        </div>
        <p className="text-emerald-600">Redirecting to authentication...</p>
      </div>
    </div>
  );
}

export default Signup;     