import React, { useState, useEffect, useContext, useRef } from "react";
import { AppContext } from "../context/AppContext";

const API_BASE = process.env.REACT_APP_API || "http://127.0.0.1:5000";

export const SoilDiagnostics = () => {
  const { user } = useContext(AppContext);
  
  // State Management
  const [showUpload, setShowUpload] = useState(false);
  const [selectedImg, setSelectedImg] = useState(null);
  const [selectedImgFile, setSelectedImgFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [seasonCrops, setSeasonCrops] = useState([]);
  const [city, setCity] = useState("Belagavi");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hoverState, setHoverState] = useState({});
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [analysisCancelled, setAnalysisCancelled] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs
  const abortControllerRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Mouse movement effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Fetch seasons on component mount
  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/seasons`);
      const data = await response.json();
      setSeasons(data.seasons || []);
    } catch (err) {
      console.error("Failed to fetch seasons:", err);
      // Fallback seasons
      setSeasons(["Summer", "Winter", "Rainy"]);
    }
  };

  // Handle file upload with drag & drop
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    if (!dragRef.current?.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    // Validate file type
    if (!file.type.match('image.*')) {
      setError("Please select an image file (JPEG, PNG, etc.)");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size too large. Please select an image under 10MB");
      return;
    }

    setError(null);
    const imageUrl = URL.createObjectURL(file);
    setSelectedImg(imageUrl);
    setSelectedImgFile(file);
    setResult(null);
    setAnalysisCancelled(false);
    setSeasonCrops([]);
  };

  // Analyze soil with progress and cancel option
  const handleAnalyze = async () => {
    if (!selectedImgFile) {
      setError("Please upload an image first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedImgFile);
    formData.append("city", city);
    if (user?.email) formData.append("user_email", user.email);

    // Create new AbortController for cancel option
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setAnalysisCancelled(false);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate progress (optional - remove if not needed)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Make API call
      const response = await fetch(`${API_BASE}/api/soil`, {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Soil analysis result:", data);
      setResult(data);
      setSeasonCrops([]);
      
      // Reset after successful analysis
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);

    } catch (err) {
      if (err.name === 'AbortError') {
        setError("Analysis was cancelled");
        setAnalysisCancelled(true);
      } else {
        setError(err.message || "Error analyzing soil. Please try again.");
        console.error("Analysis error:", err);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Cancel analysis
  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setUploadProgress(0);
      setAnalysisCancelled(true);
    }
  };

  // Get season-based crops
  const handleSeasonSelect = async () => {
    if (!selectedSeason) {
      setError("Please select a season!");
      return;
    }

    // Get soil type from result
    const soilType = result?.predicted_soil || 
                     result?.soil_info?.soil_type || 
                     "Alluvial soil";

    console.log("🌱 Requesting crops with:", {
      season: selectedSeason,
      soil_type: soilType,
      hasResult: !!result
    });

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/crop-by-season`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          season: selectedSeason,
          soil_type: soilType
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("🌾 Season crops response:", data);
      
      if (data.success) {
        setSeasonCrops(data.recommended_crops || []);
        setError(null);
      } else {
        setSeasonCrops([]);
        setError(data.message || "No crops found for this season and soil type");
      }
    } catch (err) {
      setError("Failed to fetch season crops. Please try again.");
      console.error("Error fetching season crops:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reset everything
  const handleReset = () => {
    setSelectedImg(null);
    setSelectedImgFile(null);
    setResult(null);
    setSeasonCrops([]);
    setUploadProgress(0);
    setError(null);
    setAnalysisCancelled(false);
    
    // Clean up object URL
    if (selectedImg) {
      URL.revokeObjectURL(selectedImg);
    }
    
    // Cancel any ongoing analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Close modal and reset
  const handleCloseModal = () => {
    setShowUpload(false);
    handleReset();
  };

  // Hover effects
  const handleMouseEnter = (element) => {
    setHoverState(prev => ({ ...prev, [element]: true }));
  };

  const handleMouseLeave = (element) => {
    setHoverState(prev => ({ ...prev, [element]: false }));
  };

  // Background effect component
  const BackgroundEffects = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(34, 197, 94, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(34, 197, 94, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }} />
    </div>
  );

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 md:px-10 pt-24 pb-20 overflow-hidden relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Animated Cursor Effect */}
      <div
        className="fixed pointer-events-none z-50 transition-transform duration-75"
        style={{
          left: `${cursorPosition.x}px`,
          top: `${cursorPosition.y}px`,
          transform: `translate(-50%, -50%) scale(${isHovering ? 1.2 : 1})`
        }}
      >
        <div className="w-4 h-4 bg-green-400/30 rounded-full animate-ping" />
        <div className="w-2 h-2 bg-green-400 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Background Effects */}
      <BackgroundEffects />

      {/* Floating Icons */}
      <div className="absolute top-10 left-10 text-3xl opacity-10 animate-bounce-slow">🌱</div>
      <div className="absolute bottom-20 right-10 text-4xl opacity-10 animate-bounce-delayed">🧪</div>
      <div className="absolute top-32 right-20 text-2xl opacity-5 animate-spin-slow">🌾</div>

      {/* MAIN GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
        
        {/* LEFT TEXT BLOCK */}
        <div className="space-y-8">
          {/* Main Card with Glass Effect */}
          <div className="relative group">
            <div className="absolute -inset-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-60 transition-all duration-500" />
            <div className="relative bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 shadow-2xl hover:border-green-500/30 transition-all duration-300">
              {/* Animated Border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-green-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              <div className="relative z-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-full border border-green-600/30">
                  <span className="text-xl animate-pulse">⚡</span>
                  <span className="text-sm font-bold text-green-300 tracking-wider">Deeplearning-POWERED ANALYSIS</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-green-300 via-emerald-200 to-teal-100 bg-clip-text text-transparent">
                    Soil Vision Prediction
                  </span>
                  <span className="ml-3 text-3xl">🧪</span>
                </h1>

                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                In Agro-Optics, the Soil Vision module analyzes soil images to classify soil type and 
                assess fertility using deep learning. The system studies visual features such as texture,
                 color, granularity, and moisture patterns to identify soil categories like Alluvial, Red, Black,
                  Clay, Silt, or Gravel. Along with classification, it estimates essential nutrient levels such as N,
                   P, and K, and evaluates pH using pre-processed dataset mappings. By combining CNN-based image analysis 
                   with real-time weather inputs, Soil Vision provides farmers with quick insights into soil health. This helps
                    them choose suitable crops and fertilizers, making soil management more accurate, faster, and more affordable 
                    than traditional laboratory testing.
                </p>

                {/* 3 SMALL BOXES ONLY - Like Plant Diagnostics */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { icon: "⚡", label: "NPK", value: "Analysis", color: "blue" },
                    { icon: "🌱", label: "Soil Type", value: "5+ Types", color: "emerald" },
                    { icon: "🧪", label: "pH", value: "6.5-7.5", color: "amber" },
                  ].map((feature, idx) => {
                    const colorClass = {
                      blue: "border-blue-500/30 hover:border-blue-500/50 text-blue-400",
                      emerald: "border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400",
                      amber: "border-amber-500/30 hover:border-amber-500/50 text-amber-400"
                    }[feature.color];
                    
                    return (
                      <div 
                        key={idx}
                        className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border ${colorClass} hover:transform hover:scale-105 transition-all duration-300 cursor-pointer`}
                        onMouseEnter={() => handleMouseEnter(`feature-${idx}`)}
                        onMouseLeave={() => handleMouseLeave(`feature-${idx}`)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{feature.icon}</span>
                          <span className="text-sm font-semibold text-gray-200">{feature.label}</span>
                        </div>
                        <div className="text-lg font-bold">{feature.value}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Technology Stack */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {["Deep Learning", "CNN", "Weather API", "Soil Science", "ML"].map((tech, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-full text-xs text-green-300 border border-green-600/30"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setShowUpload(true)}
            className="group relative w-full py-5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl font-bold text-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/30 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-400/20 to-green-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <span className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-2xl group-hover:animate-spin">🚀</span>
              <span className="text-gray-100">Start Soil Analysis</span>
            </span>
          </button>
        </div>

        {/* RIGHT IMAGE BLOCK */}
        <div className="flex justify-center items-center">
          <div 
            className="relative group cursor-pointer"
            onClick={() => setShowUpload(true)}
            onMouseEnter={() => handleMouseEnter('mainImage')}
            onMouseLeave={() => handleMouseLeave('mainImage')}
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
            
            <div className="relative w-full h-[600px] rounded-3xl shadow-2xl border-2 border-gray-700/50 overflow-hidden group-hover:border-green-500/50 transition-all duration-500">
              <img
                src="/images/soil-vision.jpg"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                alt="Soil Vision AI Analysis"
                onError={(e) => {
                  e.target.src = `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80`;
                }}
              />
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              
              {/* Overlay Content */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-gradient-to-t from-black/80 via-black/60 to-transparent p-6 rounded-2xl backdrop-blur-sm border border-green-500/20">
                  <p className="text-gray-100 font-semibold text-xl mb-2">Deeplearning Soil Analysis</p>
                  <p className="text-gray-300 text-sm">Click to analyze soil composition </p>
                </div>
              </div>
              
              {/* Tech Badge */}
              <div className="absolute top-6 right-6 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full border border-green-600/50 group-hover:bg-green-900/30 transition-all duration-300">
                <span className="text-sm text-green-300">Deep Learning</span>
              </div>
              
              {/* Hover Indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-black/50 backdrop-blur-sm p-6 rounded-full border-2 border-green-400/50 animate-pulse">
                  <span className="text-3xl">🔬</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL - Upload & Results */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl w-full max-w-6xl border border-gray-700/50 shadow-2xl my-8">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-6 right-6 p-3 hover:bg-gray-800 rounded-xl transition-all duration-300 text-gray-400 hover:text-gray-200 hover:rotate-90 z-50"
            >
              <span className="text-2xl">×</span>
            </button>

            {/* Modal Header */}
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-green-300 to-emerald-200 bg-clip-text text-transparent">
                  Soil Analysis Studio
                </span>
              </h2>
              <p className="text-gray-400">Upload soil image for comprehensive Deeplearning analysis</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* UPLOAD PANEL */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-xl border border-green-600/30">
                      <span className="text-2xl text-green-300">📸</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-200">Soil Sample Upload</h3>
                      <p className="text-sm text-gray-400">Upload clear image of soil sample</p>
                    </div>
                  </div>

                  {/* City Input */}
                  <div className="mb-6">
                    <label className="block text-gray-300 mb-2 font-medium">
                      Enter City for Weather Analysis
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all duration-300"
                      placeholder="e.g., Belagavi"
                    />
                  </div>

                  {/* Drag & Drop Area */}
                  <div
                    ref={dragRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
                      ${isDragging 
                        ? 'border-green-500 bg-green-900/20' 
                        : 'border-gray-700 hover:border-green-500/50 hover:bg-gray-800/30'
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    <div className={`text-6xl mb-4 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
                      {isDragging ? '📂' : '📁'}
                    </div>
                    
                    <p className="text-gray-300 mb-2 font-medium">
                      {isDragging ? 'Drop soil image here' : 'Click or drag & drop to upload'}
                    </p>
                    <p className="text-sm text-gray-500">Supported: JPG, PNG • Max 10MB</p>
                    
                    <div className="mt-4 text-xs text-gray-600 space-y-1">
                      <p>• Capture soil in natural daylight</p>
                      <p>• Include scale reference if possible</p>
                      <p>• Avoid shadows and glare</p>
                    </div>
                  </div>

                  {/* Image Preview */}
                  {selectedImg && (
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-300 font-medium">Selected Image</span>
                        <button
                          onClick={() => {
                            URL.revokeObjectURL(selectedImg);
                            setSelectedImg(null);
                            setSelectedImgFile(null);
                          }}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="relative group">
                        <img
                          src={selectedImg}
                          alt="Selected soil"
                          className="w-full h-48 object-cover rounded-xl border-2 border-gray-700 group-hover:border-green-500/50 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center">
                          <span className="text-green-300 font-medium">Click to analyze</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {error && (
                    <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-red-400">⚠️</span>
                        <span className="text-red-300 text-sm">{error}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 space-y-4">
                    <button
                      onClick={handleAnalyze}
                      disabled={loading || !selectedImgFile}
                      className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 relative overflow-hidden group
                        ${loading || !selectedImgFile
                          ? "bg-gray-700 cursor-not-allowed text-gray-500"
                          : "bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-500/30 text-gray-100"
                        }`}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                          Analyzing... {uploadProgress}%
                        </span>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-400/20 to-green-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                          <span className="relative z-10 flex items-center justify-center gap-3">
                            <span className="text-2xl">🔬</span>
                            Analyze Soil Sample
                          </span>
                        </>
                      )}
                    </button>

                    {/* Cancel Button */}
                    {loading && (
                      <button
                        onClick={handleCancelAnalysis}
                        className="w-full py-3 bg-gradient-to-r from-gray-700 to-gray-600 rounded-xl font-semibold text-gray-100 hover:bg-gray-600 transition-all duration-300"
                      >
                        Cancel Analysis
                      </button>
                    )}

                    {/* Progress Bar */}
                    {loading && uploadProgress > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>Processing</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RESULTS PANEL */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/50 overflow-auto max-h-[70vh]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 rounded-xl border border-emerald-600/30">
                    <span className="text-2xl text-emerald-300">📊</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-200">Analysis Results</h3>
                    <p className="text-sm text-gray-400">Deeplearning-powered soil health assessment</p>
                  </div>
                </div>

                {analysisCancelled ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 opacity-30">⏹️</div>
                    <p className="text-gray-300 font-medium mb-2">Analysis Cancelled</p>
                    <p className="text-gray-500 text-sm">The soil analysis was cancelled by the user.</p>
                    <button
                      onClick={() => setAnalysisCancelled(false)}
                      className="mt-4 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-gray-100 font-medium hover:shadow-lg transition-all duration-300"
                    >
                      Start New Analysis
                    </button>
                  </div>
                ) : !result ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 opacity-20 animate-pulse">🌱</div>
                    <p className="text-gray-300 font-medium mb-2">Awaiting Soil Analysis</p>
                    <p className="text-gray-500 text-sm">Upload a soil image to begin comprehensive analysis</p>
                    <div className="mt-6 text-xs text-gray-600 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span>Capture soil sample in natural light</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span>Include soil texture and color reference</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span>Avoid shadows and glare</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-slideIn">
                    {/* Soil Information - 3 small boxes like main page */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {/* Soil Type Box */}
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl text-emerald-400">🌱</span>
                          <span className="text-sm font-semibold text-gray-200">Soil Type</span>
                        </div>
                        <div className="text-lg font-bold text-emerald-300 truncate">
                          {result.predicted_soil || "N/A"}
                        </div>
                      </div>

                      {/* pH Box */}
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border border-amber-500/30 hover:border-amber-500/50 transition-all duration-300">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl text-amber-400">🧪</span>
                          <span className="text-sm font-semibold text-gray-200">pH Level</span>
                        </div>
                        <div className="text-lg font-bold text-amber-300">
                          {result.soil_info?.ph ? `pH ${result.soil_info.ph}` : "N/A"}
                        </div>
                      </div>

                      {/* NPK Box */}
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border border-blue-500/30 hover:border-blue-500/50 transition-all duration-300">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl text-blue-400">⚡</span>
                          <span className="text-sm font-semibold text-gray-200">NPK</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {result.soil_info?.npk ? (
                            <>
                              N: {result.soil_info.npk.N || "N/A"}<br/>
                              P: {result.soil_info.npk.P || "N/A"}<br/>
                              K: {result.soil_info.npk.K || "N/A"}
                            </>
                          ) : (
                            <div className="text-gray-500">No NPK data</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Detailed NPK Values */}
                    <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-700">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-green-400">⚡</span>
                        <p className="text-sm font-semibold text-gray-300">Detailed NPK Analysis</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { key: 'N', label: 'Nitrogen', color: 'from-blue-500 to-cyan-500' },
                          { key: 'P', label: 'Phosphorus', color: 'from-purple-500 to-pink-500' },
                          { key: 'K', label: 'Potassium', color: 'from-orange-500 to-red-500' },
                        ].map((nutrient, idx) => {
                          const value = result.soil_info?.npk?.[nutrient.key];
                          return (
                            <div key={idx} className="text-center">
                              <p className="text-sm text-gray-400 mb-2">{nutrient.label}</p>
                              <div className={`h-2 bg-gradient-to-r ${nutrient.color} rounded-full mb-1`} />
                              <p className="text-lg font-bold text-gray-100">{value ? `${value} ppm` : "N/A"}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recommended Crops */}
                    <div className="bg-gradient-to-br from-emerald-900/10 to-teal-900/10 p-4 rounded-xl border border-emerald-700/20">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-emerald-400">🌾</span>
                        <p className="text-sm font-semibold text-gray-300">Recommended Crops</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(result.soil_info?.recommended_crops) 
                          ? result.soil_info.recommended_crops 
                          : [result.soil_info?.recommended_crops || "No specific crop recommendations"]
                        ).slice(0, 5).map((crop, idx) => (
                          <span 
                            key={idx}
                            className="px-3 py-1.5 bg-gradient-to-r from-emerald-900/20 to-green-900/20 rounded-full text-sm text-emerald-300 border border-emerald-600/30"
                          >
                            {crop}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Fertilizer Recommendations */}
                    {result.soil_info?.recommended_fertilizers && (
                      <div className="bg-gradient-to-br from-amber-900/10 to-yellow-900/10 p-4 rounded-xl border border-amber-700/20">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-amber-400">🧪</span>
                          <p className="text-sm font-semibold text-gray-300">Fertilizer Recommendations</p>
                        </div>
                        <p className="text-gray-300 text-sm">
                          {result.soil_info.recommended_fertilizers}
                        </p>
                      </div>
                    )}

                    {/* Weather Information */}
                    <div className="bg-gradient-to-br from-blue-900/10 to-cyan-900/10 p-4 rounded-xl border border-blue-700/20">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-blue-400">🌤️</span>
                        <p className="text-sm font-semibold text-gray-300">
                          Weather in {city}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Temperature</p>
                          <p className="text-lg font-bold text-blue-300">
                            {result.weather?.current_temperature || "N/A"}°C
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Humidity</p>
                          <p className="text-lg font-bold text-blue-300">
                            {result.weather?.current_humidity || "N/A"}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Condition</p>
                          <p className="text-lg font-bold text-blue-300">
                            {result.weather?.weather_description || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Season-based Recommendations */}
                    <div className="bg-gradient-to-br from-purple-900/10 to-pink-900/10 p-4 rounded-xl border border-purple-700/20">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-purple-400">📅</span>
                        <p className="text-sm font-semibold text-gray-300">Season Based Recommendations</p>
                      </div>
                      
                      {/* Current Soil Type Display */}
                      {result.predicted_soil && (
                        <div className="mb-3 p-3 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl border border-purple-600/30">
                          <p className="text-xs text-gray-400">Detected Soil Type:</p>
                          <p className="text-sm font-medium text-purple-300">{result.predicted_soil}</p>
                        </div>
                      )}

                      <select
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300"
                      >
                        <option value="">Select a season</option>
                        {seasons.map((season) => (
                          <option key={season} value={season}>{season}</option>
                        ))}
                      </select>

                      {selectedSeason && (
                        <button
                          onClick={handleSeasonSelect}
                          disabled={loading || !result}
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium text-gray-100 hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? "Loading..." : !result ? "Analyze Soil First" : `Get ${selectedSeason} Crops`}
                        </button>
                      )}

                      {/* Show error if no soil analysis */}
                      {!result && selectedSeason && (
                        <p className="mt-2 text-xs text-red-400">
                          * Please analyze soil first to get accurate recommendations
                        </p>
                      )}

                      {/* Show crops if available */}
                      {seasonCrops.length > 0 && (
                        <div className="mt-4 p-3 bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl border border-purple-600/30">
                          <p className="text-sm text-gray-300 mb-2">
                            🌾 Recommended Crops for {result.predicted_soil} in {selectedSeason}:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {seasonCrops.map((crop, idx) => (
                              <span 
                                key={idx}
                                className="px-3 py-1.5 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-full text-sm text-purple-300 border border-purple-600/30 hover:scale-105 transition-transform duration-200"
                              >
                                {crop}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show error message */}
                      {error && seasonCrops.length === 0 && (
                        <div className="mt-3 p-3 bg-red-900/20 border border-red-700/30 rounded-xl">
                          <p className="text-sm text-red-300">{error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes bounce-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-bounce-delayed {
          animation: bounce-delayed 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 20s linear infinite;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.3);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 94, 0.5);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 197, 94, 0.7);
        }
      `}</style>
    </div>
  ); 
};