import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { 
  User, Mail, Lock, Eye, EyeOff, Phone, 
  MapPin, Crop, CheckCircle, AlertCircle, 
  ArrowRight, Shield, Camera
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API || "http://127.0.0.1:5000";

const SignupPage = () => {
  const { login } = useContext(AppContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    location: "",
    farmSize: "",
    crops: ""
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ text: "Photo size should be less than 5MB", type: "error" });
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setMessage({ text: "Please upload an image file", type: "error" });
        return;
      }
      
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: "Passwords do not match", type: "error" });
      return;
    }
    
    if (formData.password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters", type: "error" });
      return;
    }

    if (!formData.name.trim()) {
      setMessage({ text: "Please enter your name", type: "error" });
      return;
    }

    if (!formData.email.trim()) {
      setMessage({ text: "Please enter your email", type: "error" });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      console.log("Creating form data for signup...");
      
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("email", formData.email.trim());
      formDataToSend.append("password", formData.password);
      
      // Optional fields
      if (formData.phone.trim()) formDataToSend.append("phone", formData.phone.trim());
      if (formData.location.trim()) formDataToSend.append("location", formData.location.trim());
      if (formData.farmSize.trim()) formDataToSend.append("farmSize", formData.farmSize.trim());
      if (formData.crops.trim()) formDataToSend.append("crops", formData.crops.trim());
      
      if (photo) {
        formDataToSend.append("photo", photo);
      }

      console.log("Sending signup request...");
      
      const response = await fetch(`${API_BASE}/api/signup`, {
        method: "POST",
        body: formDataToSend,
      });

      const data = await response.json();
      console.log("Signup response:", data);

      if (response.status === 201) {
        // Signup successful
        const userData = data.user;
        
        // Call login function from AppContext
        login(userData);
        
        setMessage({ 
          text: `✅ Account created successfully! Welcome ${userData.name}.`, 
          type: "success" 
        });

        // Redirect to home after delay
        setTimeout(() => {
          navigate("/");
        }, 2000);

      } else {
        // Signup failed
        const errorMsg = data.error || "Signup failed. Please try again.";
        setMessage({ 
          text: `❌ ${errorMsg}`, 
          type: "error" 
        });
      }
    } catch (error) {
      console.error("Signup error:", error);
      setMessage({ 
        text: "❌ Network error. Please check your connection and try again.", 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-2xl">
        {/* Card Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-cyan-500 rounded-3xl blur-xl opacity-30"></div>
        
        <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50">
          
          {/* Header */}
          <div className="p-8 text-center border-b border-gray-700/50">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  Agro-Optics
                </h1>
                <p className="text-sm text-gray-400">Create Your Farming Account</p>
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Join Our Farming Community</h2>
            <p className="text-gray-400 text-sm">
              Sign up to access AI-powered soil and plant analysis
            </p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                    <User className="w-4 h-4" />
                    <span>Full Name *</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                    <Mail className="w-4 h-4" />
                    <span>Email Address *</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                    <Phone className="w-4 h-4" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                {/* Photo Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Profile Photo (Optional)</label>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-20 h-20 rounded-xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center overflow-hidden group">
                      {photoPreview ? (
                        <img 
                          src={photoPreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <Camera className="w-8 h-8 text-gray-500 mb-1" />
                          <span className="text-xs text-gray-400">No photo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                        id="photo-upload"
                        disabled={isLoading}
                      />
                      <label 
                        htmlFor="photo-upload" 
                        className="block px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 hover:text-white cursor-pointer transition-colors text-center"
                      >
                        Choose Photo
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG/WebP</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Password */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                    <Lock className="w-4 h-4" />
                    <span>Password *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create a password (min 6 characters)"
                      required
                      minLength="6"
                      className="w-full px-4 py-3 pl-11 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
                      disabled={isLoading}
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-400"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      required
                      className="w-full px-4 py-3 pl-11 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
                      disabled={isLoading}
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-400"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                    <MapPin className="w-4 h-4" />
                    <span>Farm Location</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Enter your farm location"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                {/* Farm Size */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Farm Size</label>
                  <input
                    type="text"
                    name="farmSize"
                    value={formData.farmSize}
                    onChange={handleChange}
                    placeholder="e.g., 50 acres"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                {/* Crops */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                    <Crop className="w-4 h-4" />
                    <span>Primary Crops</span>
                  </label>
                  <input
                    type="text"
                    name="crops"
                    value={formData.crops}
                    onChange={handleChange}
                    placeholder="e.g., Wheat, Corn, Soybeans"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Required fields note */}
            <div className="text-xs text-gray-400">
              * Required fields
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl font-bold text-white transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-green-500/25"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Create Account</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </button>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700/50"></div>
                </div>
                <div className="relative px-4 bg-gray-800/90 text-sm text-gray-400">
                  Already have an account?
                </div>
              </div>

              <Link to="/login">
                <button
                  type="button"
                  className="w-full py-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-xl font-medium text-gray-300 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/25"
                >
                  Sign In Instead
                </button>
              </Link>
            </div>

            {/* Terms & Privacy */}
            <div className="pt-4 border-t border-gray-700/50">
              <p className="text-center text-gray-400 text-xs">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </form>
        </div>

        {/* Status Message */}
        {message.text && (
          <div className={`mt-6 p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-300' 
              : message.type === 'warning'
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <div className="flex items-center space-x-3">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : message.type === 'warning' ? (
                <AlertCircle className="w-5 h-5 text-yellow-300" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-300" />
              )}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          </div>
        )}

        {/* Security Note */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-500 text-xs bg-gray-800/30 px-4 py-2 rounded-full">
            <Shield className="w-3 h-3" />
            <span>Your data is securely encrypted and private</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;