import React, { useState } from "react";
import { 
  auth, 
  provider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  db, 
  doc, 
  setDoc 
} from "../firebase";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FaPiggyBank, FaChartLine, FaCoins, FaMoneyCheckAlt, FaEye, FaEyeSlash, FaEnvelope, FaLock, FaUser, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

function Auth({ setUser }) {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // Strong password: min 6 chars, upper, lower, number, special
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  };

  const validateForm = () => {
    const newErrors = {};

    if (isSignUp && !formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!showForgotPassword) {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (!validatePassword(formData.password)) {
        newErrors.password = "Password must include uppercase, lowercase, number, and special character";
      }

      if (isSignUp && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    
    // Real-time password match validation for confirm password
    if (name === "confirmPassword" && isSignUp) {
      if (value && formData.password && value !== formData.password) {
        setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
      } else if (value && formData.password && value === formData.password) {
        setErrors(prev => ({ ...prev, confirmPassword: "" }));
      }
    }
    
    // Also check when password changes and confirm password is already filled
    if (name === "password" && isSignUp && formData.confirmPassword) {
      if (formData.confirmPassword && value && formData.confirmPassword !== value) {
        setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
      } else if (formData.confirmPassword && value && formData.confirmPassword === value) {
        setErrors(prev => ({ ...prev, confirmPassword: "" }));
      }
    }
    
    setSuccessMessage("");
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: new Date().toISOString(),
        budgetPreferences: {},
        financialGoals: [],
      }, { merge: true });

      setUser(user);
      navigate("/");
    } catch (error) {
      console.error("Google sign-in error:", error);
      setErrors({ general: "Failed to sign in with Google. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setErrors({});
      
      // Prevent duplicate sign-up if email already exists
      const existingMethods = await fetchSignInMethodsForEmail(auth, formData.email);
      if (existingMethods.length > 0) {
        const isGoogleOnly = existingMethods.includes("google.com") && !existingMethods.includes("password");
        const duplicateMessage = isGoogleOnly
          ? "🔵 Google Sign-In Required\nThis email is already registered using Google Sign-In.\nPlease continue by signing in with Google."
          : "This email is already registered. Please sign in instead.";
        setErrors({ general: duplicateMessage });
        setLoading(false);
        return;
      }

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;

      // Update user profile with display name
      await updateProfile(user, {
        displayName: formData.name
      });

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: formData.name,
        email: formData.email,
        photoURL: null,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        budgetPreferences: {},
        financialGoals: [],
      });

      // Send email verification with continue URL to redirect back to our app
      const actionCodeSettings = {
        url: window.location.origin + '/verify-email',
        handleCodeInApp: true
      };
      await sendEmailVerification(user, actionCodeSettings);

      setSuccessMessage("✅ Account created! Verification email sent. Please check your inbox.");
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setIsSignIn(true);
      navigate("/verify-email", { state: { email: formData.email, userId: user.uid, from: "/" } });
    } catch (error) {
      console.error("Sign-up error:", error);
      let errorMessage = "Failed to create account. Please try again.";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please sign in instead.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setErrors({});
      
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        setErrors({ general: "📧 Please verify your email to access the app. Check your inbox for the verification link." });
        navigate("/verify-email", { state: { email: user.email, userId: user.uid, from: "/" } });
        setLoading(false);
        return;
      }

      setUser(user);
      navigate("/");
    } catch (error) {
      console.error("Sign-in error:", error);
      let errorMessage = "Failed to sign in. Please check your credentials.";
      
      if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please sign up first.";
      } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, formData.email);
          const isGoogleOnly = methods.includes("google.com") && !methods.includes("password");
          if (isGoogleOnly) {
            errorMessage = "🔵 Google Sign-In Required\nThis email is already registered using Google Sign-In.\nPlease continue by signing in with Google.";
          } else {
            errorMessage = "Invalid credentials. Please check your email and password.";
          }
        } catch (methodError) {
          console.error("Fetch sign-in methods error:", methodError);
          errorMessage = "Invalid credentials. Please check your email and password.";
        }
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      setErrors({ email: "Please enter your email address" });
      return;
    }
    
    if (!validateEmail(formData.email)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      
      await sendPasswordResetEmail(auth, formData.email);
      setSuccessMessage("Password reset email sent! Please check your inbox.");
      
      // Switch back to sign in after 3 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send reset email. Please try again.";
      
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
    setErrors({});
    setSuccessMessage("");
    setShowForgotPassword(false);
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-emerald-50 to-green-100 flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 opacity-20">
        <FaCoins className="text-amber-400 text-6xl" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-20">
        <FaMoneyCheckAlt className="text-amber-400 text-6xl" />
      </div>
      
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xl w-full relative overflow-hidden">
        {/* Header section */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-4">
            <div className="bg-emerald-100 p-4 rounded-full">
              <FaPiggyBank className="text-amber-500 text-4xl" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-emerald-800 mb-2">AI Smart Spend</h1>
          <p className="text-emerald-600 text-sm">
            {showForgotPassword 
              ? "Reset your password" 
              : isSignUp 
                ? "Create your account to get started" 
                : "Welcome back! Sign in to continue"
            }
          </p>
        </div>

        {/* Tab Toggle for Sign In / Sign Up */}
        {!showForgotPassword && (
          <div className="flex mb-4 bg-emerald-50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => !isSignUp && toggleMode()}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                isSignUp 
                  ? "bg-white text-emerald-700 shadow-md" 
                  : "text-emerald-600 hover:text-emerald-800"
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => isSignUp && toggleMode()}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                !isSignUp 
                  ? "bg-white text-emerald-700 shadow-md" 
                  : "text-emerald-600 hover:text-emerald-800"
              }`}
            >
              Sign In
            </button>
          </div>
        )}

        {/* Error Message */}
        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm whitespace-pre-line">{errors.general}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Forgot Password Form */}
        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <div>
              <label className="block text-emerald-700 text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all text-gray-900 ${
                    errors.email 
                      ? "border-red-300 focus:ring-red-200" 
                      : "border-emerald-200 focus:ring-emerald-200"
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setErrors({});
                setFormData({ name: "", email: "", password: "", confirmPassword: "" });
              }}
              className="w-full text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          /* Sign Up / Sign In Form */
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-3">
            {/* Name Field (Sign Up only) */}
            {isSignUp && (
              <div>
                <label className="block text-emerald-700 text-sm font-medium mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all text-gray-900 ${
                      errors.name 
                        ? "border-red-300 focus:ring-red-200" 
                        : "border-emerald-200 focus:ring-emerald-200"
                    }`}
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-emerald-700 text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all text-gray-900 ${
                    errors.email 
                      ? "border-red-300 focus:ring-red-200" 
                      : "border-emerald-200 focus:ring-emerald-200"
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-emerald-700 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all text-gray-900 ${
                    errors.password 
                      ? "border-red-300 focus:ring-red-200" 
                      : "border-emerald-200 focus:ring-emerald-200"
                  }`}
                  placeholder={isSignUp ? "Create a password (min. 6 characters)" : "Enter your password"}
                />
                {formData.password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-400 hover:text-emerald-600"
                  >
                    <FaEye />
                  </button>
                )}
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field (Sign Up only) */}
            {isSignUp && (
              <div>
                <label className="block text-emerald-700 text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all text-gray-900 ${
                      errors.confirmPassword 
                        ? "border-red-300 focus:ring-red-200" 
                        : "border-emerald-200 focus:ring-emerald-200"
                    }`}
                    placeholder="Confirm your password"
                  />
                  {formData.confirmPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-400 hover:text-emerald-600"
                    >
                      <FaEye />
                    </button>
                  )}
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <FaTimesCircle /> {errors.confirmPassword}
                  </p>
                )}
                {!errors.confirmPassword && formData.confirmPassword && formData.password && formData.confirmPassword === formData.password && (
                  <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                    <FaCheckCircle /> Passwords match
                  </p>
                )}
              </div>
            )}

            {/* Forgot Password Link (Sign In only) */}
            {!isSignUp && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setErrors({});
                  }}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-emerald-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-emerald-600">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-emerald-200 rounded-xl text-emerald-800 font-medium hover:bg-emerald-50 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FcGoogle className="text-xl" />
              Sign {isSignUp ? "up" : "in"} with Google
            </button>
          </form>
        )}

        {/* Features list (only show on sign up) */}
        {isSignUp && !showForgotPassword && (
          <div className="mt-6 pt-6 border-t border-emerald-100">
            <p className="text-emerald-700 font-medium text-sm mb-3">What you'll get:</p>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="bg-emerald-100 p-1.5 rounded-full mr-2">
                  <FaChartLine className="text-amber-500 text-xs" />
                </div>
                <span className="text-emerald-600 text-xs">Track expenses effortlessly</span>
              </div>
              <div className="flex items-center">
                <div className="bg-emerald-100 p-1.5 rounded-full mr-2">
                  <FaCoins className="text-amber-500 text-xs" />
                </div>
                <span className="text-emerald-600 text-xs">AI-powered budget planning</span>
              </div>
              <div className="flex items-center">
                <div className="bg-emerald-100 p-1.5 rounded-full mr-2">
                  <FaMoneyCheckAlt className="text-amber-500 text-xs" />
                </div>
                <span className="text-emerald-600 text-xs">Smart financial insights</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-emerald-600 text-xs mt-6">
          By continuing, you agree to our Terms and Privacy Policy
        </p>
      </div>

      {/* Animated circles in background */}
      <div className="absolute bottom-5 left-5 w-32 h-32 rounded-full bg-amber-200 opacity-30 animate-pulse"></div>
      <div className="absolute top-5 right-5 w-32 h-32 rounded-full bg-emerald-200 opacity-30 animate-pulse"></div>
    </div>
  );
}

export default Auth;
