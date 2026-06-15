import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { 
  Leaf, Globe, Calendar, Filter, Download, 
  RefreshCw, AlertCircle, User, X, Eye,
  ChevronRight, BarChart3, Thermometer,
  Droplets, CheckCircle, Clock
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API || "http://127.0.0.1:5000";

const HistoryPage = () => {
  const { user, isAuthenticated } = useContext(AppContext);
  const [history, setHistory] = useState({
    plant: [],
    soil: []
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all", "plant", "soil"
  const [error, setError] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/login");
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch history when user or filter changes
  useEffect(() => {
    if (user?.email) {
      fetchHistory();
      fetchUserStats();
    }
  }, [user?.email, filter]);

  const fetchHistory = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = `${API_BASE}/api/history?email=${encodeURIComponent(user.email)}`;
      if (filter !== "all") {
        endpoint += `&type=${filter}`;
      }
      
      console.log("📋 Fetching history for user:", user.email);
      console.log("🔗 API endpoint:", endpoint);
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      console.log("📊 History response:", data);
      
      if (response.ok) {
        setHistory({
          plant: data.plant_history || [],
          soil: data.soil_history || []
        });
      } else {
        setError(data.error || "Failed to fetch history");
      }
    } catch (error) {
      console.error("❌ Error fetching history:", error);
      setError("Could not connect to server. Please make sure Flask backend is running.");
      
      // Show demo data for development
      if (process.env.NODE_ENV === 'development') {
        console.log("🔄 Using demo data for development");
        setHistory({
          plant: [
            {
              id: 1,
              predicted_label: "Tomato___Early_blight",
              confidence: 92.5,
              image_name: "demo_plant.jpg",
              created_at: new Date().toISOString(),
              solution: "Apply fungicides containing chlorothalonil or copper fungicide weekly. Remove infected leaves and improve air circulation."
            },
            {
              id: 2,
              predicted_label: "Apple___healthy",
              confidence: 98.2,
              image_name: "demo_apple.jpg",
              created_at: new Date(Date.now() - 86400000).toISOString(),
              solution: "No disease detected. Plant appears healthy. Maintain current care practices."
            }
          ],
          soil: [
            {
              id: 1,
              predicted_soil: "Alluvial soil",
              soil_info: {
                soil_type: "Alluvial soil",
                ph: "6.0-8.4",
                npk: { N: "25-30", P: "15-20", K: "20-25" },
                recommended_crops: "Rice, Wheat, Sugarcane, Cotton, Jute, Maize",
                recommended_fertilizers: "Compost, Farm Yard Manure, NPK fertilizers"
              },
              weather_info: {
                current_temperature: 28,
                current_humidity: 65,
                weather_description: "Partly cloudy",
                city: "Belagavi"
              },
              image_name: "demo_soil.jpg",
              created_at: new Date().toISOString()
            },
            {
              id: 2,
              predicted_soil: "Black Soil",
              soil_info: {
                soil_type: "Black Soil",
                ph: "7.0-8.5",
                npk: { N: "20-25", P: "10-15", K: "15-20" },
                recommended_crops: "Cotton, Soybean, Sugarcane, Wheat, Groundnut",
                recommended_fertilizers: "Farm Yard Manure, Compost, NPK fertilizers"
              },
              weather_info: {
                current_temperature: 30,
                current_humidity: 60,
                weather_description: "Sunny",
                city: "Belagavi"
              },
              image_name: "demo_soil2.jpg",
              created_at: new Date(Date.now() - 172800000).toISOString()
            }
          ]
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!user?.email) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/user/stats?email=${encodeURIComponent(user.email)}`);
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
      // Use default stats
      setUserStats({
        soil_tests: history.soil.length,
        plant_scans: history.plant.length,
        active_days: 1,
        total_analyses: history.plant.length + history.soil.length
      });
    }
  };

  const handleViewDetails = (analysis) => {
    setSelectedAnalysis(analysis);
    setDetailModalOpen(true);
  };

  const handleExportHistory = () => {
    const allHistory = [...history.plant, ...history.soil];
    const historyData = {
      user: {
        email: user.email,
        name: user.name
      },
      timestamp: new Date().toISOString(),
      total_analyses: allHistory.length,
      plant_analyses: history.plant.length,
      soil_analyses: history.soil.length,
      analyses: allHistory
    };
    
    const dataStr = JSON.stringify(historyData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `agro-optics-history-${user.email}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatDiseaseName = (diseaseName) => {
    if (!diseaseName) return "Unknown Disease";
    
    // Handle the format: "Plant___Disease" or "Plant___healthy"
    if (diseaseName.includes("___")) {
      const [plant, condition] = diseaseName.split("___");
      let formattedPlant = plant.replace(/_/g, " ");
      let formattedCondition = condition.replace(/_/g, " ");
      
      // Capitalize first letters
      formattedPlant = formattedPlant
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
        
      formattedCondition = formattedCondition
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return `${formattedPlant} - ${formattedCondition}`;
    }
    
    // For other formats
    return diseaseName
      .replace(/_/g, " ")
      .replace(/\(including\s+sour\)/gi, "")
      .replace(/\(including\s+sweet\)/gi, "")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  };

  const getAnalysisCount = () => {
    if (filter === "all") return history.plant.length + history.soil.length;
    if (filter === "plant") return history.plant.length;
    if (filter === "soil") return history.soil.length;
    return 0;
  };

  // If not authenticated, show login prompt
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-gray-800/40 backdrop-blur-sm rounded-3xl border border-gray-700 max-w-md">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-300 mb-6">
            Please log in to view your analysis history.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl font-bold hover:scale-105 transform transition-all duration-300"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 pt-20 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with User Info */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl">
                <User className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-1">
                  Analysis History
                </h1>
                <p className="text-gray-400">
                  Welcome back, <span className="text-blue-300 font-medium">{user.name}</span>
                </p>
              </div>
            </div>
            <p className="text-gray-500 text-sm">
              View your past soil and plant analyses
            </p>
          </div>
          
          {/* User Stats and Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Stats badge */}
            <div className="bg-gray-800/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-700">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs text-gray-400">Plant Scans</div>
                    <div className="text-lg font-bold text-emerald-300">{userStats?.plant_scans || history.plant.length}</div>
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-700"></div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs text-gray-400">Soil Tests</div>
                    <div className="text-lg font-bold text-amber-300">{userStats?.soil_tests || history.soil.length}</div>
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-700"></div>
                <div>
                  <div className="text-xs text-gray-400">Total</div>
                  <div className="text-lg font-bold text-white">{getAnalysisCount()}</div>
                </div>
              </div>
            </div>
            
            {/* Export button */}
            {getAnalysisCount() > 0 && (
              <button
                onClick={handleExportHistory}
                className="px-4 py-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 hover:from-blue-600/30 hover:to-cyan-600/30 border border-blue-500/30 rounded-xl font-medium text-blue-300 hover:text-white transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export History
              </button>
            )}
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
              filter === "all" 
                ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/10" 
                : "bg-gray-800/40 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-700/40"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            All Analyses ({history.plant.length + history.soil.length})
          </button>
          <button
            onClick={() => setFilter("plant")}
            className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
              filter === "plant" 
                ? "bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10" 
                : "bg-gray-800/40 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-700/40"
            }`}
          >
            <Leaf className="w-4 h-4" />
            Plant Analyses ({history.plant.length})
          </button>
          <button
            onClick={() => setFilter("soil")}
            className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
              filter === "soil" 
                ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/10" 
                : "bg-gray-800/40 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-700/40"
            }`}
          >
            <Globe className="w-4 h-4" />
            Soil Analyses ({history.soil.length})
          </button>
          
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="ml-auto px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 border border-gray-700 rounded-xl font-medium text-gray-300 hover:text-white transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-300 font-medium">{error}</p>
                <p className="text-red-300/70 text-sm mt-1">
                  Showing demo data. Make sure your Flask backend is running at {API_BASE}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-800/20 rounded-2xl border border-gray-700">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-300">Loading your analysis history...</p>
            <p className="text-gray-500 text-sm mt-2">Fetching data for {user.email}</p>
          </div>
        ) : getAnalysisCount() === 0 ? (
          <div className="text-center py-20 bg-gray-800/20 rounded-2xl border border-gray-700 backdrop-blur-sm">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No analysis history yet</h3>
            <p className="text-gray-500 mb-6">
              Complete your first soil or plant analysis to see results here
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => navigate("/soil-analysis")}
                className="px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl font-bold hover:scale-105 transform transition-all duration-300"
              >
                Start Soil Analysis
              </button>
              <button
                onClick={() => navigate("/plant-diagnostics")}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl font-bold hover:scale-105 transform transition-all duration-300"
              >
                Start Plant Analysis
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plant Analyses */}
            {(filter === "all" || filter === "plant") && history.plant.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-green-500/20 shadow-lg shadow-emerald-500/10">
                    <Leaf className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Plant Disease Analyses</h2>
                    <p className="text-gray-400 text-sm">Your plant health analysis history</p>
                  </div>
                  <span className="ml-auto px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
                    {history.plant.length} analyses
                  </span>
                </div>
                
                <div className="space-y-4">
                  {history.plant.map((item, index) => (
                    <div
                      key={`plant-${item.id || index}`}
                      className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-5 hover:border-emerald-500/50 hover:bg-gray-800/50 transition-all duration-300 cursor-pointer group"
                      onClick={() => handleViewDetails({...item, type: 'plant'})}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${item.confidence > 80 ? 'bg-emerald-500' : item.confidence > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                            <h3 className="font-bold text-white truncate">
                              {formatDiseaseName(item.predicted_label)}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                            {item.confidence ? `${item.confidence.toFixed(1)}%` : "N/A"}
                          </div>
                          <div className="text-xs text-gray-400">Confidence</div>
                        </div>
                      </div>
                      
                      {item.solution && (
                        <div className="text-gray-300 text-sm line-clamp-2 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                          {typeof item.solution === 'string' ? 
                            (item.solution.length > 150 ? item.solution.substring(0, 150) + '...' : item.solution) 
                            : "Treatment available"}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Leaf className="w-3 h-3" />
                          <span>Plant Disease Analysis</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
                          <span>View Details</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Soil Analyses */}
            {(filter === "all" || filter === "soil") && history.soil.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 shadow-lg shadow-amber-500/10">
                    <Globe className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Soil Analyses</h2>
                    <p className="text-gray-400 text-sm">Your soil composition analysis history</p>
                  </div>
                  <span className="ml-auto px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
                    {history.soil.length} analyses
                  </span>
                </div>
                
                <div className="space-y-4">
                  {history.soil.map((item, index) => (
                    <div
                      key={`soil-${item.id || index}`}
                      className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-5 hover:border-amber-500/50 hover:bg-gray-800/50 transition-all duration-300 cursor-pointer group"
                      onClick={() => handleViewDetails({...item, type: 'soil'})}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <h3 className="font-bold text-white truncate">
                              {item.predicted_soil || "Soil Analysis"}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {item.weather_info?.current_temperature && (
                            <div className="text-xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                              {item.weather_info.current_temperature}°C
                            </div>
                          )}
                          <div className="text-xs text-gray-400">Temperature</div>
                        </div>
                      </div>
                      
                      {item.soil_info && (
                        <div className="flex items-center gap-4 text-sm text-gray-300 mb-3">
                          <span className="px-3 py-1 bg-gray-800/50 rounded-full">
                            pH: {item.soil_info.ph || "N/A"}
                          </span>
                          <span className="px-3 py-1 bg-gray-800/50 rounded-full">
                            Type: {item.soil_info.soil_type || "N/A"}
                          </span>
                        </div>
                      )}
                      
                      {item.soil_info?.recommended_crops && (
                        <div className="text-gray-300 text-sm bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                          <span className="font-medium">Crops: </span>
                          {typeof item.soil_info.recommended_crops === 'string' && item.soil_info.recommended_crops.length > 100 
                            ? item.soil_info.recommended_crops.substring(0, 100) + '...'
                            : item.soil_info.recommended_crops}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Globe className="w-3 h-3" />
                          <span>Soil Composition Analysis</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                          <span>View Details</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailModalOpen && selectedAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    selectedAnalysis.type === 'plant' 
                      ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400' 
                      : 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400'
                  }`}>
                    {selectedAnalysis.type === 'plant' ? <Leaf className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {selectedAnalysis.type === 'plant' 
                        ? formatDiseaseName(selectedAnalysis.predicted_label)
                        : selectedAnalysis.predicted_soil
                      }
                    </h2>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(selectedAnalysis.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="p-2 hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  selectedAnalysis.type === 'plant' 
                    ? 'bg-emerald-500/20 text-emerald-300' 
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {selectedAnalysis.type === 'plant' ? 'Plant Disease Analysis' : 'Soil Analysis'}
                </span>
                {selectedAnalysis.confidence && (
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 rounded-full text-sm">
                    Confidence: {selectedAnalysis.confidence.toFixed(1)}%
                  </span>
                )}
                {selectedAnalysis.id && (
                  <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm font-mono">
                    ID: {selectedAnalysis.id}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Plant Analysis Details */}
              {selectedAnalysis.type === 'plant' && (
                <>
                  {selectedAnalysis.solution && (
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-5 rounded-xl border border-gray-700">
                      <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        Treatment Recommendation
                      </h3>
                      <p className="text-gray-300 whitespace-pre-line leading-relaxed">
                        {typeof selectedAnalysis.solution === 'string' 
                          ? selectedAnalysis.solution 
                          : "No specific treatment details available."
                        }
                      </p>
                    </div>
                  )}
                  
                  {/* Image if available */}
                  {selectedAnalysis.image_name && (
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-5 rounded-xl border border-gray-700">
                      <h3 className="font-bold text-white mb-3">Analysis Image</h3>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
                        <img 
                          src={`${API_BASE}/uploads/${selectedAnalysis.image_name}`}
                          alt="Analysis result"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1598301257982-0cf014dabbcd?auto=format&fit=crop&w=800&q=80";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Soil Analysis Details */}
              {selectedAnalysis.type === 'soil' && (
                <>
                  {selectedAnalysis.soil_info && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-5 rounded-xl border border-gray-700">
                        <h3 className="font-bold text-white mb-4">Soil Properties</h3>
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm text-gray-400">Soil Type</div>
                            <div className="text-white font-semibold text-lg">{selectedAnalysis.soil_info.soil_type || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400">pH Level</div>
                            <div className="text-white font-semibold text-lg">{selectedAnalysis.soil_info.ph || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-2">NPK Values</div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-500/20">
                                <div className="text-sm text-gray-400">N</div>
                                <div className="text-white font-bold text-xl">{selectedAnalysis.soil_info.npk?.N || "N/A"}</div>
                              </div>
                              <div className="text-center p-3 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg border border-purple-500/20">
                                <div className="text-sm text-gray-400">P</div>
                                <div className="text-white font-bold text-xl">{selectedAnalysis.soil_info.npk?.P || "N/A"}</div>
                              </div>
                              <div className="text-center p-3 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-lg border border-orange-500/20">
                                <div className="text-sm text-gray-400">K</div>
                                <div className="text-white font-bold text-xl">{selectedAnalysis.soil_info.npk?.K || "N/A"}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Weather Info */}
                      {selectedAnalysis.weather_info && (
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-5 rounded-xl border border-gray-700">
                          <h3 className="font-bold text-white mb-4">Weather Conditions</h3>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-500/20">
                              <Thermometer className="w-5 h-5 text-blue-400" />
                              <div>
                                <div className="text-sm text-gray-400">Temperature</div>
                                <div className="text-white font-bold text-xl">
                                  {selectedAnalysis.weather_info.current_temperature || "N/A"}°C
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 rounded-lg border border-cyan-500/20">
                              <Droplets className="w-5 h-5 text-cyan-400" />
                              <div>
                                <div className="text-sm text-gray-400">Humidity</div>
                                <div className="text-white font-bold text-xl">
                                  {selectedAnalysis.weather_info.current_humidity || "N/A"}%
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-400 mb-1">Location</div>
                              <div className="text-white font-semibold">
                                {selectedAnalysis.weather_info.city || "Unknown Location"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Recommendations */}
                  {selectedAnalysis.soil_info && (selectedAnalysis.soil_info.recommended_crops || selectedAnalysis.soil_info.recommended_fertilizers) && (
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-5 rounded-xl border border-gray-700">
                      <h3 className="font-bold text-white mb-4">Recommendations</h3>
                      <div className="space-y-4">
                        {selectedAnalysis.soil_info.recommended_crops && (
                          <div>
                            <div className="text-sm text-gray-400 mb-2">Recommended Crops</div>
                            <div className="text-white font-semibold bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-3 rounded-lg border border-amber-500/20">
                              {selectedAnalysis.soil_info.recommended_crops}
                            </div>
                          </div>
                        )}
                        {selectedAnalysis.soil_info.recommended_fertilizers && (
                          <div>
                            <div className="text-sm text-gray-400 mb-2">Recommended Fertilizers</div>
                            <div className="text-white font-semibold bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-3 rounded-lg border border-green-500/20">
                              {selectedAnalysis.soil_info.recommended_fertilizers}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Image if available */}
                  {selectedAnalysis.image_name && (
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-5 rounded-xl border border-gray-700">
                      <h3 className="font-bold text-white mb-3">Soil Sample Image</h3>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
                        <img 
                          src={`${API_BASE}/uploads/${selectedAnalysis.image_name}`}
                          alt="Soil sample"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* User Info */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-5 rounded-xl border border-gray-700">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  Analysis Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Analyzed By</div>
                    <div className="text-white font-semibold">{user.name}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">User Email</div>
                    <div className="text-white font-semibold truncate">{user.email}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Analysis Type</div>
                    <div className="text-white font-semibold capitalize">{selectedAnalysis.type}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Date Analyzed</div>
                    <div className="text-white font-semibold">{formatDate(selectedAnalysis.created_at)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <button
                  onClick={() => {
                    if (selectedAnalysis.type === 'plant') {
                      navigate("/plant-diagnostics");
                    } else {
                      navigate("/soil-analysis");
                    }
                    setDetailModalOpen(false);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 rounded-xl font-semibold text-white transition-all w-full sm:w-auto"
                >
                  New {selectedAnalysis.type === 'plant' ? 'Plant' : 'Soil'} Analysis
                </button>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-semibold text-white transition-all w-full sm:w-auto"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;