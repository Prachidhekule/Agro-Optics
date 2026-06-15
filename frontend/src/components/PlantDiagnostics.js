import React, { useState, useEffect, useContext, useRef } from "react";
import { AppContext } from "../context/AppContext";
import { X, Upload, Leaf, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const API_BASE = process.env.REACT_APP_API || "http://127.0.0.1:5000";

const PlantDiagnostics = () => {
  const { user } = useContext(AppContext);
  
  // State Management
  const [showUpload, setShowUpload] = useState(false);
  const [image, setImage] = useState(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState({
    status: "idle",
    message: "Upload a leaf image to detect plant diseases",
    data: null
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hoverState, setHoverState] = useState({});
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const abortControllerRef = useRef(null);
  const fileInputRef = useRef(null); // Add ref for file input
  const analysisIdRef = useRef(0); // Add analysis ID to track current analysis

  // Disable scroll and mouse effects
  useEffect(() => {
    document.body.style.overflow = showUpload ? "hidden" : "auto";
    
    const handleMouseMove = (e) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showUpload]);

  // Background effect component
  const BackgroundEffects = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }} />
    </div>
  );

  // Cancel analysis
  const cancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAnalyzing(false);
      setResult({
        status: "cancelled",
        message: "Analysis cancelled",
        data: null
      });
    }
  };

  // Close modal handler
  const closeModal = () => {
    setShowUpload(false);
    setImage(null);
    setFile(null);
    setResult({
      status: "idle",
      message: "Upload a leaf image to detect plant diseases",
      data: null
    });
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (isAnalyzing) cancelAnalysis();
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setResult({
        status: "error",
        message: "Please upload a valid image (JPEG, PNG, or WebP)",
        data: null
      });
      e.target.value = ''; // Clear invalid file
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setResult({
        status: "error",
        message: "File size should be less than 5MB",
        data: null
      });
      e.target.value = ''; // Clear invalid file
      return;
    }

    // Revoke previous image URL to prevent memory leaks
    if (image) {
      URL.revokeObjectURL(image);
    }

    setFile(selectedFile);
    const newImageUrl = URL.createObjectURL(selectedFile);
    setImage(newImageUrl);
    setResult({
      status: "ready",
      message: "Ready to analyze",
      data: null
    });
  };

  // Analyze leaf function with backend connectivity
  const analyzeLeaf = async () => {
    if (!file) {
      setResult({
        status: "error",
        message: "Please upload an image first",
        data: null
      });
      return;
    }

    // Cancel any ongoing analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Generate new analysis ID
    const currentAnalysisId = Date.now();
    analysisIdRef.current = currentAnalysisId;

    setIsAnalyzing(true);
    setResult({
      status: "analyzing",
      message: "Analyzing your leaf image...",
      data: null
    });

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    const formData = new FormData();
    formData.append("file", file);
    if (user?.email) formData.append("user_email", user.email);

    try {
      console.log(`Starting analysis #${currentAnalysisId} for file:`, file.name);
      
      const res = await fetch(`${API_BASE}/api/plant`, {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      // Check if this is still the current analysis
      if (analysisIdRef.current !== currentAnalysisId) {
        console.log(`Analysis #${currentAnalysisId} was superseded, ignoring response`);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server responded with ${res.status}`);
      }

      console.log(`Analysis #${currentAnalysisId} response:`, data);
      
      // Format the response based on backend structure
      let confidence = 0;
      if (data.confidence) {
        // Convert to string and remove any percentage signs
        const confidenceStr = String(data.confidence).replace('%', '');
        confidence = parseFloat(confidenceStr) || 0;
        
        // Handle all possible cases:
        // 1. If confidence is between 0-1 (decimal like 0.8255, 1.0) → convert to percentage
        // 2. If confidence is between 1-100 → leave as is
        // 3. If confidence is > 100 → clamp to 100
        if (confidence > 0 && confidence <= 1) {
          confidence = confidence * 100;
        } else if (confidence > 100) {
          confidence = 100;
        }
      }
      
      const prediction = data.prediction || data.predicted_label || "Unknown Disease";
      
      // Use functional update to ensure state is updated correctly
      setResult(prev => ({
        ...prev,
        status: "success",
        message: "Analysis complete",
        data: {
          prediction: prediction,
          confidence: confidence,
          solution: data.solution || "No specific treatment recommendations available. Please consult with an agricultural expert.",
          severity: confidence > 80 ? "low" : confidence > 60 ? "moderate" : confidence > 40 ? "high" : "very high",
          image_name: data.image_name || "unknown.jpg"
        }
      }));
      
    } catch (err) {
      // Check if this is still the current analysis
      if (analysisIdRef.current !== currentAnalysisId) {
        console.log(`Analysis #${currentAnalysisId} was cancelled, ignoring error`);
        return;
      }
      
      if (err.name === 'AbortError') {
        console.log('Request was cancelled');
        setResult({
          status: "cancelled",
          message: "Analysis cancelled",
          data: null
        });
      } else {
        console.error("Analysis error:", err);
        setResult({
          status: "error",
          message: err.message || "Failed to analyze image. Please try again.",
          data: null
        });
      }
    } finally {
      // Only update isAnalyzing if this is still the current analysis
      if (analysisIdRef.current === currentAnalysisId) {
        setIsAnalyzing(false);
        abortControllerRef.current = null;
      }
    }
  };

  // Helper function to format plant names
  const formatPlantName = (plantName) => {
    if (!plantName) return "";
    return plantName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to format disease names only
  const formatDiseaseNameOnly = (diseaseName) => {
    if (!diseaseName) return "";
    
    // Remove plant name prefixes if present
    const cleanName = diseaseName
      .replace(/^Apple\s*-\s*/i, '')
      .replace(/^Corn\s*-\s*/i, '')
      .replace(/^Potato\s*-\s*/i, '')
      .replace(/^Tomato\s*-\s*/i, '')
      .replace(/^Grape\s*-\s*/i, '')
      .replace(/^Peach\s*-\s*/i, '')
      .replace(/^Strawberry\s*-\s*/i, '')
      .replace(/^Cherry\s*-\s*/i, '')
      .replace(/^[A-Za-z]+\s*-\s*/i, '') // Remove any plant name with dash
      .trim();
    
    // Capitalize properly
    return cleanName
      .split(' ')
      .map(word => {
        if (word.toLowerCase() === 'scab') return 'Scab';
        if (word.toLowerCase() === 'rust') return 'Rust';
        if (word.toLowerCase() === 'blight') return 'Blight';
        if (word.toLowerCase() === 'mildew') return 'Mildew';
        if (word.toLowerCase() === 'rot') return 'Rot';
        if (word.toLowerCase() === 'spot') return 'Spot';
        if (word.toLowerCase() === 'healthy') return 'Healthy';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Format disease name for display
  const formatDiseaseName = (diseaseName) => {
    if (!diseaseName) return "Unknown Disease";
    if (diseaseName === "Unknown") return "Unknown Disease - Image may be unclear";
    
    // First, clean up the string
    let formatted = diseaseName
      .replace(/_/g, " ")
      .replace(/\(including\s+sour\)/gi, "")
      .replace(/\(including\s+sweet\)/gi, "")
      .replace(/\(.*\)/g, "")
      .trim();
    
    // Handle specific patterns like "Apple - Apple Scab"
    if (formatted.includes("Apple - Apple Scab")) {
      return "Apple: Scab";
    }
    if (formatted.includes("Apple - Apple Rust")) {
      return "Apple: Rust";
    }
    if (formatted.includes("Apple - Black Rot")) {
      return "Apple: Black Rot";
    }
    
    // Handle all plant-disease patterns with dash
    if (formatted.includes(" - ")) {
      const parts = formatted.split(" - ").map(part => part.trim());
      if (parts.length === 2) {
        const plant = formatPlantName(parts[0]);
        const disease = formatDiseaseNameOnly(parts[1]);
        
        // Check if disease already contains plant name (like "Apple - Apple Scab")
        if (disease.toLowerCase().startsWith(plant.toLowerCase())) {
          // Remove duplicate plant name from disease
          const cleanDisease = disease.replace(new RegExp(`^${plant}\\s*`, 'i'), '');
          return `${plant}${cleanDisease ? ': ' + cleanDisease : ''}`;
        }
        
        return `${plant}: ${disease}`;
      }
    }
    
    // If it contains a dash without spaces (like "Apple-Apple_Scab")
    if (formatted.includes("-") && !formatted.includes(" - ")) {
      const parts = formatted.split("-").map(part => part.trim());
      if (parts.length >= 2) {
        const plant = formatPlantName(parts[0]);
        const disease = formatDiseaseNameOnly(parts.slice(1).join(" "));
        
        // Check for duplicate plant name
        if (disease.toLowerCase().includes(plant.toLowerCase())) {
          const cleanDisease = disease.replace(new RegExp(plant, 'gi'), '').trim();
          return `${plant}${cleanDisease ? ': ' + cleanDisease : ''}`;
        }
        
        return `${plant}: ${disease}`;
      }
    }
    
    // Final capitalization for other formats
    return formatted
      .split(' ')
      .map((word, index) => {
        const smallWords = ['and', 'or', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with'];
        if (index > 0 && smallWords.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Hover effects
  const handleMouseEnter = (element) => {
    setHoverState(prev => ({ ...prev, [element]: true }));
  };

  const handleMouseLeave = (element) => {
    setHoverState(prev => ({ ...prev, [element]: false }));
  };

  // Clear file and reset
  const clearFile = () => {
    if (image) {
      URL.revokeObjectURL(image);
    }
    setImage(null);
    setFile(null);
    setResult({
      status: "idle",
      message: "Upload a leaf image to detect plant diseases",
      data: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render result based on status
  const renderResult = () => {
    switch (result.status) {
      case "analyzing":
        return (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
              <div className="absolute inset-0 rounded-full border-t-2 border-blue-500/30 animate-ping"></div>
            </div>
            <p className="text-gray-300 text-lg mt-4">{result.message}</p>
            <div className="mt-8 space-y-4 w-full">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 animate-pulse rounded-full w-3/4"></div>
              </div>
              <p className="text-sm text-gray-400">Processing image with Deeplearning...</p>
            </div>
            <button
              onClick={cancelAnalysis}
              className="mt-6 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-all duration-300"
            >
              Cancel Analysis
            </button>
          </div>
        );

      case "success":
        const confidenceColor = result.data.confidence > 70 ? "text-green-400" : 
                               result.data.confidence > 50 ? "text-yellow-400" : "text-red-400";
        
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                result.data.confidence > 70 ? "bg-gradient-to-br from-green-500 to-emerald-500" :
                result.data.confidence > 50 ? "bg-gradient-to-br from-yellow-500 to-amber-500" :
                "bg-gradient-to-br from-red-500 to-pink-500"
              }`}>
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Analysis Complete</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 hover:border-green-500/30 transition-all duration-300">
                <p className="text-gray-400 text-sm mb-1">Disease Detected</p>
                <p className="text-2xl font-bold text-white">
                  {formatDiseaseName(result.data.prediction)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${
                  result.data.confidence > 70 ? "border-green-700/30 bg-gradient-to-br from-green-900/20 to-emerald-900/20" :
                  result.data.confidence > 50 ? "border-yellow-700/30 bg-gradient-to-br from-yellow-900/20 to-amber-900/20" :
                  "border-red-700/30 bg-gradient-to-br from-red-900/20 to-pink-900/20"
                } hover:border-blue-500/50 transition-all duration-300`}>
                  <p className="text-gray-400 text-sm mb-1">Confidence Level</p>
                  <p className={`text-2xl font-bold ${confidenceColor}`}>
                    {result.data.confidence.toFixed(1)}%
                  </p>
                  <div className="h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        result.data.confidence > 70 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                        result.data.confidence > 50 ? "bg-gradient-to-r from-yellow-500 to-amber-500" :
                        "bg-gradient-to-r from-red-500 to-pink-500"
                      }`}
                      style={{ width: `${Math.min(result.data.confidence, 100)}%` }}
                    />
                  </div>
                </div>
                <div className={`p-4 rounded-xl border ${
                  result.data.severity === 'low' ? "border-green-700/30 bg-gradient-to-br from-green-900/20 to-emerald-900/20" :
                  result.data.severity === 'moderate' ? "border-yellow-700/30 bg-gradient-to-br from-yellow-900/20 to-amber-900/20" :
                  result.data.severity === 'high' ? "border-orange-700/30 bg-gradient-to-br from-orange-900/20 to-red-900/20" :
                  "border-red-700/30 bg-gradient-to-br from-red-900/20 to-pink-900/20"
                } hover:border-blue-500/50 transition-all duration-300`}>
                  <p className="text-gray-400 text-sm mb-1">Severity Level</p>
                  <p className={`text-2xl font-bold ${
                    result.data.severity === 'low' ? 'text-green-400' :
                    result.data.severity === 'moderate' ? 'text-yellow-400' :
                    result.data.severity === 'high' ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    {result.data.severity.charAt(0).toUpperCase() + result.data.severity.slice(1)}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-900/10 to-teal-900/10 p-4 rounded-xl border border-emerald-700/20 hover:border-emerald-500/30 transition-all duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-400 text-lg">💡</span>
                  <p className="text-sm font-semibold text-gray-300">Recommended Treatment</p>
                </div>
                <p className="text-emerald-300 text-sm leading-relaxed whitespace-pre-line">
                  {result.data.solution}
                </p>
              </div>

              <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-700 hover:border-blue-500/20 transition-all duration-300">
                <p className="text-sm font-semibold text-gray-300 mb-3">📋 General Recommendations</p>
                <ul className="text-gray-400 text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 text-lg">•</span>
                    <span>Apply treatment within 24-48 hours for best results</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 text-lg">•</span>
                    <span>Monitor plant health daily after treatment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 text-lg">•</span>
                    <span>Take another clear photo if confidence is low</span>
                  </li>
                </ul>
              </div>

              {result.data.image_name && (
                <div className="text-xs text-gray-500 text-center">
                  Image saved as: {result.data.image_name}
                </div>
              )}
            </div>
          </div>
        );

      case "error":
        return (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-red-900/20 to-red-700/10 rounded-full flex items-center justify-center mb-4 border border-red-700/30">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-gray-300 text-lg text-center mb-4">{result.message}</p>
            <div className="flex gap-3">
              <button
                onClick={clearFile}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg text-gray-100 font-medium hover:shadow-lg transition-all duration-300"
              >
                Try Again
              </button>
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-100 font-medium transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        );

      case "cancelled":
        return (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-900/20 to-yellow-700/10 rounded-full flex items-center justify-center mb-4 border border-yellow-700/30">
              <AlertCircle className="w-10 h-10 text-yellow-500" />
            </div>
            <p className="text-gray-300 text-lg text-center">{result.message}</p>
            <button
              onClick={clearFile}
              className="mt-6 px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg text-gray-100 font-medium hover:shadow-lg transition-all duration-300"
            >
              Start New Analysis
            </button>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-24 h-24 text-gray-600 mb-6 opacity-20 animate-pulse">
              <Leaf className="w-full h-full" />
            </div>
            <p className="text-gray-400 text-lg text-center">{result.message}</p>
            <p className="text-gray-500 text-sm mt-4 text-center">
              Upload a clear image of a plant leaf for accurate diagnosis
            </p>
            <div className="mt-6 text-xs text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Capture leaf in natural daylight</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Focus on affected areas of the leaf</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Ensure image is clear and in focus</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Avoid shadows and glare</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div 
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
        <div className="w-4 h-4 bg-blue-400/30 rounded-full animate-ping" />
        <div className="w-2 h-2 bg-blue-400 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Background Effects */}
      <BackgroundEffects />

      {/* Floating Icons */}
      <div className="absolute top-10 left-10 text-3xl opacity-10 animate-bounce-slow">🌿</div>
      <div className="absolute bottom-20 right-10 text-4xl opacity-10 animate-bounce-delayed">🔬</div>
      <div className="absolute top-32 right-20 text-2xl opacity-5 animate-spin-slow">🌱</div>

      {/* MAIN GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
        
        {/* LEFT TEXT BLOCK */}
        <div className="space-y-8">
          {/* Main Card with Glass Effect */}
          <div className="relative group">
            <div className="absolute -inset-3 bg-gradient-to-r from-blue-600/20 to-emerald-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-60 transition-all duration-500" />
            <div className="relative bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 shadow-2xl hover:border-blue-500/30 transition-all duration-300">
              {/* Animated Border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-blue-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              <div className="relative z-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-gradient-to-r from-blue-900/20 to-emerald-900/20 rounded-full border border-blue-600/30">
                  <span className="text-xl animate-pulse">⚡</span>
                  <span className="text-sm font-bold text-blue-300 tracking-wider">Deeplearning-POWERED DIAGNOSIS</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-blue-300 via-emerald-200 to-teal-100 bg-clip-text text-transparent">
                    Plant Health Scanner
                  </span>
                  <span className="ml-3 text-3xl">🌿</span>
                </h1>

                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                In Agro-Optics, the phytopathology module plays a key role in identifying plant leaf diseases
                 using deep learning and computer vision. When a leaf image is uploaded, the system analyzes patterns such as
                  color distortion, lesions, spots, and texture changes to detect diseases like rust, blight, and mildew. By leveraging 
                  advanced transfer learning models like ResNet and EfficientNet, the module achieves accurate and consistent classification 
                  even with limited data. This allows farmers to quickly understand the health condition of their crops, take corrective measures at an early
                   stage, and prevent large-scale yield losses.
                </p>

                {/* Features Grid - ONLY 3 BOXES */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { icon: "🌿", label: "Plants", value: "30+" },
                    { icon: "🔬", label: "Diseases", value: "30+" },
                    { icon: "🌡️", label: "Severity", value: "Detection" },
                  ].map((feature, idx) => (
                    <div 
                      key={idx}
                      className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-4 rounded-xl border border-gray-700/50 hover:border-blue-500/30 hover:transform hover:scale-105 transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => handleMouseEnter(`feature-${idx}`)}
                      onMouseLeave={() => handleMouseLeave(`feature-${idx}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{feature.icon}</span>
                        <span className="text-sm font-semibold text-gray-200">{feature.label}</span>
                      </div>
                      <div className="text-lg font-bold text-blue-400">{feature.value}</div>
                    </div>
                  ))}
                </div>

                {/* Technology Stack */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {["Deep Learning", "CNN", "Image Processing", "Phytopathology", "ML"].map((tech, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-gradient-to-r from-blue-900/20 to-emerald-900/20 rounded-full text-xs text-blue-300 border border-blue-600/30"
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
            className="group relative w-full py-5 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl font-bold text-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/30 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/20 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <span className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-2xl group-hover:animate-spin">🚀</span>
              <span className="text-gray-100">Start Plant Diagnosis</span>
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
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-emerald-600/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
            
            <div className="relative w-full h-[600px] rounded-3xl shadow-2xl border-2 border-gray-700/50 overflow-hidden group-hover:border-blue-500/50 transition-all duration-500">
              <img
                src="/images/soil1-vision.jpg"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                alt="Plant Health AI Analysis"
                onError={(e) => {
                  e.target.src = `https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80`;
                }}
              />
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              
              {/* Overlay Content */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-gradient-to-t from-black/80 via-black/60 to-transparent p-6 rounded-2xl backdrop-blur-sm border border-blue-500/20">
                  <p className="text-gray-100 font-semibold text-xl mb-2">Deeplearning Plant Diagnosis</p>
                  <p className="text-gray-300 text-sm">Click to analyze plant health with Deeplearning</p>
                </div>
              </div>
              
              {/* Tech Badge */}
              <div className="absolute top-6 right-6 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full border border-blue-600/50 group-hover:bg-blue-900/30 transition-all duration-300">
                <span className="text-sm text-blue-300">Deep Learning</span>
              </div>
              
              {/* Hover Indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-black/50 backdrop-blur-sm p-6 rounded-full border-2 border-blue-400/50 animate-pulse">
                  <Leaf className="w-10 h-10 text-blue-400" />
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
              onClick={closeModal}
              className="absolute top-6 right-6 p-3 hover:bg-gray-800 rounded-xl transition-all duration-300 text-gray-400 hover:text-gray-200 hover:rotate-90 z-50"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Header */}
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-blue-300 to-emerald-200 bg-clip-text text-transparent">
                  Plant Diagnosis Studio
                </span>
              </h2>
              <p className="text-gray-400">Upload leaf image for comprehensive Deeplearning analysis</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* UPLOAD PANEL */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-blue-900/20 to-emerald-900/20 rounded-xl border border-blue-600/30">
                      <span className="text-2xl text-blue-300">📸</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-200">Leaf Sample Upload</h3>
                      <p className="text-sm text-gray-400">Upload clear image of plant leaf</p>
                    </div>
                  </div>

                  {/* Drag & Drop Area */}
                  <div
                    onClick={() => document.getElementById('fileInput')?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
                      hover:border-blue-500/50 hover:bg-gray-800/30 border-gray-700`}
                  >
                    <input
                      id="fileInput"
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      className="hidden"
                      disabled={isAnalyzing}
                    />
                    
                    <div className="text-6xl mb-4">
                      <Upload className="w-16 h-16 mx-auto text-gray-500" />
                    </div>
                    
                    <p className="text-gray-300 mb-2 font-medium">
                      Click or drag & drop to upload
                    </p>
                    <p className="text-sm text-gray-500">Supported: JPG, PNG • Max 5MB</p>
                    
                    <div className="mt-4 text-xs text-gray-600 space-y-1">
                      <p>• Capture leaf in natural daylight</p>
                      <p>• Focus on affected areas</p>
                      <p>• Avoid shadows and glare</p>
                    </div>
                  </div>

                  {/* Image Preview */}
                  {image && (
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-300 font-medium">Selected Image</span>
                        <button
                          onClick={clearFile}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          disabled={isAnalyzing}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="relative group">
                        <img
                          src={image}
                          alt="Selected leaf"
                          className="w-full h-48 object-cover rounded-xl border-2 border-gray-700 group-hover:border-blue-500/50 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center">
                          <span className="text-blue-300 font-medium">Ready to analyze</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 space-y-4">
                    <button
                      onClick={analyzeLeaf}
                      disabled={isAnalyzing || !file}
                      className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 relative overflow-hidden group
                        ${isAnalyzing || !file
                          ? "bg-gray-700 cursor-not-allowed text-gray-500"
                          : "bg-gradient-to-r from-blue-600 to-emerald-600 hover:shadow-lg hover:shadow-blue-500/30 text-gray-100"
                        }`}
                    >
                      {isAnalyzing ? (
                        <span className="flex items-center justify-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analyzing...
                        </span>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/20 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                          <span className="relative z-10 flex items-center justify-center gap-3">
                            <Leaf className="w-6 h-6" />
                            Analyze Leaf Sample
                          </span>
                        </>
                      )}
                    </button>
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
                    <h3 className="text-xl font-semibold text-gray-200">Diagnosis Results</h3>
                    <p className="text-sm text-gray-400">Deeplearning-powered plant health assessment</p>
                  </div>
                </div>

                <div className="h-[400px] overflow-y-auto custom-scrollbar">
                  {renderResult()}
                </div>
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
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
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
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
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
          background: rgba(59, 130, 246, 0.5);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #10b981);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default PlantDiagnostics;