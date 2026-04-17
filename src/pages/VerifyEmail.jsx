import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { applyActionCode } from "firebase/auth";
import { auth, sendEmailVerification } from "../firebase";
import { FaEnvelope, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

function VerifyEmail() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [resendCount, setResendCount] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  const email = location.state?.email || auth.currentUser?.email;

  // Check current verification status on mount
  useEffect(() => {
    const checkInitialVerification = async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setVerified(true);
          setRequiresSignIn(false);
          setLoading(false);
          setTimeout(() => {
            window.location.replace("/");
          }, 1000);
          return;
        }
      }
      setLoading(false);
    };

    checkInitialVerification();
  }, []);

  // Handle Firebase email verification action from email link
  useEffect(() => {
    const handleEmailVerificationLink = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const oobCode = params.get("oobCode");
        const mode = params.get("mode");

        if (mode === "verifyEmail" && oobCode) {
          await applyActionCode(auth, oobCode);

          await new Promise((resolve) => setTimeout(resolve, 1000));

          if (auth.currentUser) {
            await auth.currentUser.reload();
          }

          const isSignedIn = !!auth.currentUser;
          setVerified(isSignedIn);
          setRequiresSignIn(!isSignedIn);
          setError("");
          setLoading(false);

          setTimeout(() => {
            window.location.replace("/");
          }, 1500);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error("Email verification error:", err);
        setError("Verification link is invalid or expired. Please request a new one.");
        setLoading(false);
      }
    };

    handleEmailVerificationLink();
  }, []);

  // Auto-redirect when email is verified
  useEffect(() => {
    if (verified) {
      const redirectTimer = setTimeout(() => {
        window.location.replace("/");
      }, 1500);

      return () => clearTimeout(redirectTimer);
    }
  }, [verified]);

  // Poll for verification status
  useEffect(() => {
    if (verified || loading) return;

    const pollInterval = setInterval(async () => {
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setVerified(true);
          clearInterval(pollInterval);
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [verified, loading]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendCount > 0) {
      setCanResend(true);
    }
  }, [countdown, resendCount]);

  const handleResendEmail = async () => {
    try {
      setLoading(true);
      setError("");

      if (auth.currentUser) {
        const actionCodeSettings = {
          url: window.location.origin + "/verify-email",
          handleCodeInApp: true,
        };
        await sendEmailVerification(auth.currentUser, actionCodeSettings);
        setResendCount(resendCount + 1);
        setCanResend(false);
        setCountdown(60);
      }
    } catch (err) {
      console.error("Resend email error:", err);
      setError("Failed to resend verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    setError("");
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setVerified(true);
          setRequiresSignIn(false);
          setTimeout(() => {
            window.location.replace("/");
          }, 1000);
        } else {
          setError("Email not verified yet. Please check your inbox and click the verification link.");
        }
      } else {
        setRequiresSignIn(true);
        setError("Email verified, but you're not signed in. Please sign in to continue.");
      }
    } catch (err) {
      console.error("Check verification error:", err);
      setError("Failed to check verification status. Please try again.");
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleSignIn = () => {
    window.location.href = "/";
  };

  const handleGoToDashboard = () => {
    window.location.href = "/";
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <FaCheckCircle className="text-5xl text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-800 mb-4">✅ Email Verified!</h1>
          <p className="text-gray-600 mb-6">Your email has been successfully verified. Redirecting to dashboard...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-200 border-t-amber-500 mx-auto mb-6"></div>
          <button
            onClick={handleGoToDashboard}
            className="w-full py-3 px-4 rounded-lg font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-300"
          >
            Go to Dashboard Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <FaEnvelope className="text-6xl text-emerald-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Verify Your Email</h1>
          <p className="text-gray-600">
            We've sent a verification link to <strong>{email}</strong>
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            📧 <strong>Check your inbox</strong> and click the verification link to confirm your email address.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 flex items-center">
              <FaTimesCircle className="mr-2" />
              {error}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleResendEmail}
            disabled={!canResend || loading}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
              canResend && !loading
                ? "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            {loading ? "Sending..." : canResend ? "Resend Verification Email" : `Resend in ${countdown}s`}
          </button>

          <button
            onClick={handleCheckVerification}
            disabled={checkingVerification}
            className="w-full py-3 px-4 rounded-lg font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-all duration-300 disabled:bg-gray-300 disabled:text-gray-600"
          >
            {checkingVerification ? "Checking..." : "I've Verified - Check Status"}
          </button>

          {requiresSignIn && (
            <button
              onClick={handleSignIn}
              className="w-full py-3 px-4 rounded-lg font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 transition-all duration-300"
            >
              Sign In to Continue
            </button>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-3">
            💡 <strong>Tip:</strong> Check your spam folder if you don't see the email within 5 minutes.
          </p>
          <p className="text-xs text-gray-500 text-center">
            🔄 We're automatically checking your verification status every few seconds...
          </p>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> Email verification is required to access the full app. Once verified, you'll have complete access to all features.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
