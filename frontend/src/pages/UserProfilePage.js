import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { 
  User, LogOut, Mail, Calendar, 
  Globe, Leaf, BarChart3, Thermometer,
  Droplets, MapPin, Edit2, ShieldCheck,
  CheckCircle, AlertCircle, Clock, RefreshCw,
  ChevronRight, Activity, Database
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API || "http://127.0.0.1:5000";

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    soilTests: 0,
    plantScans: 0,
    accuracy: 0,
    activeDays: 0,
    totalAnalyses: 0,
    registrationDate: null
  });
  const [historyData, setHistoryData] = useState({
    plant_history: [],
    soil_history: [],
    total_plant: 0,
    total_soil: 0
  });
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    farm_size: "",
    crops: ""
  });
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || user.username || "Farmer User",
        email: user.email || "No email set",
        phone: user.phone || "+1 234 567 8900",
        location: user.location || "Farmland, Agriculture Zone",
        farm_size: user.farm_size || user.farmSize || "50 acres",
        crops: user.crops || "Wheat, Corn, Soybeans"
      });
      fetchUserStats();
      fetchUserHistory();
      setLoading(false);
    } else {
      navigate("/login");
    }
  }, [user, navigate]);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  const fetchUserStats = async () => {
    if (!user?.email) return;

    try {
      const response = await fetch(`${API_BASE}/api/user/stats?email=${user.email}`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          soilTests: data.soil_tests || 0,
          plantScans: data.plant_scans || 0,
          accuracy: 95,
          activeDays: data.active_days || 0,
          totalAnalyses: data.total_analyses || 0,
          registrationDate: data.registration_date
        });
      } else {
        // Fallback to realistic mock data
        setStats({
          soilTests: 12,
          plantScans: 8,
          accuracy: 95,
          activeDays: 45,
          totalAnalyses: 20,
          registrationDate: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      showNotification("Failed to fetch statistics. Using offline data.", "warning");
      setStats({
        soilTests: 12,
        plantScans: 8,
        accuracy: 95,
        activeDays: 45,
        totalAnalyses: 20,
        registrationDate: new Date().toISOString()
      });
    }
  };

  const fetchUserHistory = async () => {
    if (!user?.email) return;

    try {
      const response = await fetch(`${API_BASE}/api/history?email=${user.email}&type=all`);
      if (response.ok) {
        const data = await response.json();
        setHistoryData({
          plant_history: data.plant_history || [],
          soil_history: data.soil_history || [],
          total_plant: data.total_plant || 0,
          total_soil: data.total_soil || 0
        });
      } else {
        // Fallback to mock history data
        setHistoryData({
          plant_history: [],
          soil_history: [],
          total_plant: 0,
          total_soil: 0
        });
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      showNotification("Failed to fetch history. Please try again later.", "warning");
    }
  };

  const handleLogout = () => {
    logout();
    showNotification("Logged out successfully", "info");
    navigate("/login");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/user/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          ...formData
        })
      });

      if (response.ok) {
        const updatedUser = { ...user, ...formData };
        updateUser(updatedUser);
        setEditing(false);
        showNotification("Profile updated successfully!", "success");
      } else {
        const data = await response.json();
        showNotification(data.error || "Failed to update profile", "error");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showNotification("Failed to update profile. Please try again.", "error");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const refreshProfile = () => {
    setLoading(true);
    fetchUserStats();
    fetchUserHistory();
    setTimeout(() => {
      setLoading(false);
      showNotification("Profile data refreshed!", "info");
    }, 500);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center p-8 bg-gray-800/50 rounded-2xl border border-gray-700">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No User Found</h2>
          <p className="text-gray-300 mb-6">Please log in to access your profile</p>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-semibold text-white transition-all duration-300"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const getRecentActivities = () => {
    const allActivities = [
      ...historyData.soil_history.slice(0, 3).map(item => ({
        ...item,
        type: 'soil',
        action: `Soil Analysis: ${item.predicted_soil || 'Unknown Soil'}`,
        status: 'completed',
        time: formatDateTime(item.created_at)
      })),
      ...historyData.plant_history.slice(0, 3).map(item => ({
        ...item,
        type: 'plant',
        action: `Plant Scan: ${item.predicted_label || 'Unknown Disease'}`,
        status: 'analyzed',
        time: formatDateTime(item.created_at)
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);

    return allActivities.length > 0 ? allActivities : [
      { id: 1, action: "No recent activity", time: "Start analyzing to see history", type: "info", status: "pending" }
    ];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 pt-20 pb-10 px-4">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-xl z-50 animate-fadeIn flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' :
          notification.type === 'error' ? 'bg-red-600 text-white' :
          notification.type === 'warning' ? 'bg-amber-600 text-white' :
          'bg-blue-600 text-white'
        }`}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'warning' && <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="relative mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 rounded-3xl blur-xl opacity-20 animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50 p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {/* User Info Section */}
              <div className="flex items-center gap-8">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl">
                    {user.photo ? (
                      <img 
                        src={user.photo} 
                        alt={user.name} 
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    ) : (
                      <User className="w-16 h-16 text-white" />
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>

                {/* User Details */}
                <div className="text-center md:text-left">
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {user.name || "Farmer User"}
                  </h1>
                  <div className="flex flex-col md:flex-row items-center gap-4 text-gray-300 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Member since {formatDate(stats.registrationDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={refreshProfile}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-semibold text-gray-300 hover:text-white flex items-center gap-2 transition-all duration-300"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-semibold text-white flex items-center gap-2 transition-all duration-300"
                >
                  Back to Home
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 rounded-xl font-semibold text-white flex items-center gap-2 transition-all duration-300"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* REMOVED: Stats Grid section with 4 squares */}
        
        {/* User Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Account Details */}
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <User className="w-6 h-6 text-blue-400" />
                Account Details
              </h2>
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-semibold text-gray-300 hover:text-white flex items-center gap-2 transition-all duration-300"
              >
                <Edit2 className="w-4 h-4" />
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Enter your name"
                  />
                ) : (
                  <div className="text-white text-lg font-semibold">{user.name}</div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email Address
                </label>
                {editing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Enter your email"
                  />
                ) : (
                  <div className="text-white text-lg font-semibold">{user.email}</div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Phone Number
                </label>
                {editing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <div className="text-white text-lg font-semibold">{user.phone || "Not set"}</div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Account Type
                </label>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Premium Farmer</span>
                  <span className="text-gray-400 text-sm ml-auto">Valid until 12/2024</span>
                </div>
              </div>
            </div>
            
            {editing && (
              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <button
                  onClick={handleSaveProfile}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.02]"
                >
                  <CheckCircle className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Farm Information */}
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <MapPin className="w-6 h-6 text-emerald-400" />
              Farm Information
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Farm Location
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Enter farm location"
                  />
                ) : (
                  <div className="text-white text-lg font-semibold">{user.location || "Not set"}</div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Farm Size
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="farm_size"
                    value={formData.farm_size}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Enter farm size"
                  />
                ) : (
                  <div className="text-white text-lg font-semibold">{user.farm_size || user.farmSize || "Not set"}</div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Primary Crops
                </label>
                {editing ? (
                  <textarea
                    name="crops"
                    value={formData.crops}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px]"
                    placeholder="List your primary crops"
                  />
                ) : (
                  <div className="text-white text-lg font-semibold">{user.crops || "Not set"}</div>
                )}
              </div>
            </div>
            
            {/* Farm Stats */}
            <div className="mt-8 pt-6 border-t border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Farm Conditions</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:scale-[1.05] transition-transform duration-300">
                  <Thermometer className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <div className="text-white font-bold text-2xl">28°C</div>
                  <div className="text-gray-400 text-sm">Temperature</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 hover:scale-[1.05] transition-transform duration-300">
                  <Droplets className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <div className="text-white font-bold text-2xl">65%</div>
                  <div className="text-gray-400 text-sm">Humidity</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-400" />
              Recent Activity
            </h2>
            <span className="text-sm text-gray-400">
              Total: {historyData.total_plant + historyData.total_soil} analyses
            </span>
          </div>
          
          <div className="space-y-4">
            {getRecentActivities().map((activity) => (
              <div key={activity.id || activity.created_at} className="flex items-center justify-between p-4 rounded-xl bg-gray-800/30 hover:bg-gray-700/30 transition-all duration-300 group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    activity.type === 'soil' ? 'bg-blue-500/20' :
                    activity.type === 'plant' ? 'bg-emerald-500/20' :
                    'bg-gray-500/20'
                  }`}>
                    {activity.type === 'soil' && <Globe className="w-5 h-5 text-blue-400" />}
                    {activity.type === 'plant' && <Leaf className="w-5 h-5 text-emerald-400" />}
                    {activity.type === 'info' && <Activity className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{activity.action}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">{activity.time}</span>
                      {activity.confidence && (
                        <span className="text-xs text-emerald-400">
                          Confidence: {(activity.confidence * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                <div className="text-white font-bold text-xl">{historyData.total_soil}</div>
                <div className="text-gray-400 text-sm">Soil Tests</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                <div className="text-white font-bold text-xl">{historyData.total_plant}</div>
                <div className="text-gray-400 text-sm">Plant Scans</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UserProfilePage;