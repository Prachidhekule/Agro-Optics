import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { 
  Leaf, Mail, Lock, Eye, EyeOff, 
  CheckCircle, AlertCircle, ArrowRight, Shield,
  User
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API || "http://127.0.0.1:5000";

const LoginPage = () => {
  const { login } = useContext(AppContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();

  // Update the handleSubmit function in LoginPage.js:
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Basic validation
  if (!email || !password) {
    setMessage({ 
      text: "Please enter both email and password", 
      type: "error" 
    });
    return;
  }
  
  setIsLoading(true);
  setMessage({ text: "", type: "" });

  try {
    // Use the correct API endpoint (remove /auth if not in your backend)
    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email.trim(), 
        password: password 
      })
    });

    const data = await response.json();
    
    if (data.success && data.user) {
      // Use the login function from context
      const loginSuccess = login(data.user);
      
      if (loginSuccess) {
        setMessage({ 
          text: "✅ Login successful! Redirecting...", 
          type: "success" 
        });
        
        // Remember me logic
        if (rememberMe) {
          localStorage.setItem('remember_me', 'true');
        }
        
        // Redirect to profile page
        setTimeout(() => {
          navigate("/profile");
        }, 1500);
      } else {
        setMessage({ 
          text: "❌ Failed to save login session. Please try again.", 
          type: "error" 
        });
      }
    } else {
      setMessage({ 
        text: data.error || data.message || 'Login failed. Please try again.', 
        type: "error" 
      });
    }
    
  } catch (error) {
    console.error('Login error:', error);
    setMessage({ 
      text: "⚠️ Cannot connect to server. Please try Demo Login or check backend.", 
      type: "warning" 
    });
  } finally {
    setIsLoading(false);
  }
};

  const handleDemoLogin = () => {
    // Create demo user data matching your context's expected structure
    const demoUser = {
      id: 999,
      name: "Demo Farmer",
      email: "demo@agrooptics.com",
      phone: "+1234567890",
      location: "Demo Farm, Agriculture Valley",
      farmSize: "50 acres",
      crops: ["Wheat", "Corn", "Soybeans"],
      photo: null,
      created_at: new Date().toISOString(),
      isDemo: true // Flag to identify demo users
    };

    // Use the context login function
    const loginSuccess = login(demoUser);

    if (loginSuccess) {
      setMessage({ 
        text: "✅ Demo login successful! Welcome Demo Farmer.", 
        type: "success" 
      });

      // Redirect after delay
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } else {
      setMessage({ 
        text: "❌ Failed to create demo session. Please try again.", 
        type: "error" 
      });
    }
  };

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      setMessage({ 
        text: "Testing backend connection...", 
        type: "info" 
      });
      
      const response = await fetch(`${API_BASE}/api/health`);
      if (response.ok) {
        setMessage({ 
          text: "✅ Backend is running and accessible", 
          type: "success" 
        });
      } else {
        setMessage({ 
          text: `⚠️ Backend responded with status: ${response.status}`, 
          type: "warning" 
        });
      }
    } catch (error) {
      setMessage({ 
        text: "❌ Cannot connect to backend server. Please start the Flask server.", 
        type: "error" 
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-md">
        {/* Card Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 rounded-3xl blur-xl opacity-30"></div>
        
        <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50">
          
          {/* Header */}
          <div className="p-8 text-center border-b border-gray-700/50">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <Leaf className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Agro-Optics
                </h1>
                <p className="text-sm text-gray-400">AI-Powered Farming Platform</p>
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 text-sm">
              Sign in to access your farming analytics
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                <Mail className="w-4 h-4" />
                <span>Email Address</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  required
                  className="w-full px-4 py-3 pl-11 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
                  disabled={isLoading}
                  autoComplete="email"
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                <Lock className="w-4 h-4" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength="6"
                  className="w-full px-4 py-3 pl-11 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-400 transition-colors"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-400">Remember me</span>
              </label>
              <button 
                type="button"
                onClick={() => setMessage({ 
                  text: "Please contact support at support@agro-optics.com to reset your password", 
                  type: "info" 
                })}
                className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-bold text-white transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </button>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700/50"></div>
                </div>
                <div className="relative px-4 bg-gray-800/90 text-sm text-gray-400">
                  or
                </div>
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full py-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-xl font-medium text-gray-300 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/25 active:scale-[0.98]"
              >
                Use Demo Account
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="pt-4 border-t border-gray-700/50">
              <p className="text-center text-gray-400 text-sm">
                Don't have an account?{" "}
                <Link 
                  to="/signup" 
                  className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Status Message */}
        {message.text && (
          <div className={`mt-6 p-4 rounded-xl border animate-pulse-once ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-300' 
              : message.type === 'warning'
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
              : message.type === 'info'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <div className="flex items-center space-x-3">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : message.type === 'warning' ? (
                <AlertCircle className="w-5 h-5 text-yellow-300" />
              ) : message.type === 'info' ? (
                <User className="w-5 h-5 text-blue-300" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-300" />
              )}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          </div>
        )}

        {/* Security Note & Connection Test */}
        <div className="mt-6 space-y-3">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-gray-500 text-xs bg-gray-800/30 px-4 py-2 rounded-full">
              <Shield className="w-3 h-3" />
              <span>Your data is securely encrypted and private</span>
            </div>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={testBackendConnection}
              className="text-xs text-gray-500 hover:text-gray-400 hover:underline transition-colors"
            >
              Test Backend Connection
            </button>
          </div>
        </div>
      </div>

      {/* Add CSS for animation */}
      <style jsx="true">{`
        @keyframes pulse-once {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-once {
          animation: pulse-once 2s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;