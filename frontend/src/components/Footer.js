import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Leaf, TrendingUp, Cloud, ThermometerSun, 
  Droplets, Shield, FileText, HelpCircle, 
  BookOpen, BarChart3, Smartphone, Globe,
  ChevronRight, ChevronDown, Zap, Target,
  MapPin, Wind, Sun, CloudRain,
  Users, Award, Calendar, CheckCircle
} from "lucide-react";

export const AgroFooter = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoverState, setHoverState] = useState({});
  const [weatherData, setWeatherData] = useState({
    temp: 28,
    humidity: 65,
    condition: "Sunny",
    windSpeed: 12,
    precipitation: 10,
    location: "Farmington, CA"
  });

  // Simulate weather updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      // Simulate slight weather changes
      setWeatherData(prev => ({
        ...prev,
        temp: prev.temp + (Math.random() > 0.5 ? 0.1 : -0.1),
        humidity: Math.max(60, Math.min(70, prev.humidity + (Math.random() > 0.5 ? 0.5 : -0.5)))
      }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleHover = (element) => (isHovering) => {
    setHoverState(prev => ({ ...prev, [element]: isHovering }));
  };

  const getWeatherIcon = (condition) => {
    switch(condition.toLowerCase()) {
      case 'sunny': return '☀️';
      case 'partly cloudy': return '⛅';
      case 'cloudy': return '☁️';
      case 'rainy': return '🌧️';
      default: return '🌤️';
    }
  };

  const getGrowthCondition = (temp, humidity) => {
    if (temp >= 20 && temp <= 30 && humidity >= 60 && humidity <= 70) {
      return { status: "Ideal", color: "text-green-400", icon: "🌱" };
    } else if (temp >= 15 && temp <= 35) {
      return { status: "Good", color: "text-yellow-400", icon: "👍" };
    } else {
      return { status: "Monitor", color: "text-orange-400", icon: "⚠️" };
    }
  };

  const growthCondition = getGrowthCondition(weatherData.temp, weatherData.humidity);

  return (
    <footer className="relative bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-gray-300 border-t border-gray-700/50 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Top Section with Brand and Weather */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Brand Section */}
          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
                <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-2xl shadow-2xl group-hover:scale-105 transition-transform duration-300">
                  <Leaf className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">CropSync AI</h1>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400 animate-bounce" />
                  <p className="text-lg text-green-400 font-semibold">Precision Farming Intelligence</p>
                </div>
              </div>
            </div>

            <p className="text-gray-300 leading-relaxed text-lg max-w-2xl">
              Empowering farmers with real-time AI insights for sustainable agriculture.
              Join 50,000+ growers making data-driven decisions.
            </p>

            {/* Interactive Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              {[
                { value: "52,847", label: "Active Farms", icon: <Users className="w-6 h-6" />, color: "text-blue-400" },
                { value: "96.7%", label: "AI Accuracy", icon: <Award className="w-6 h-6" />, color: "text-green-400" },
                { value: "24/7", label: "Live Support", icon: <CheckCircle className="w-6 h-6" />, color: "text-yellow-400" },
                { value: "1.2M", label: "Acres Monitored", icon: <Globe className="w-6 h-6" />, color: "text-purple-400" }
              ].map((stat, idx) => (
                <div 
                  key={idx}
                  className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/60 hover:scale-105 transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => handleHover(`stat-${idx}`)(true)}
                  onMouseLeave={() => handleHover(`stat-${idx}`)(false)}
                >
                  <div className={`flex justify-center mb-2 ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Weather Widget */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative group w-full max-w-md">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 p-6 rounded-2xl border border-gray-700/50 shadow-2xl backdrop-blur-sm">
                {/* Weather Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Cloud className="w-7 h-7 text-blue-400" />
                      <Sun className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Farm Weather</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {weatherData.location}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-lg">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    {currentTime.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>

                {/* Current Conditions */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <ThermometerSun className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                        <span className="text-gray-400">Temperature</span>
                      </div>
                      <div className="text-3xl font-bold text-white">
                        {weatherData.temp.toFixed(1)}°C
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <Droplets className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="text-gray-400">Humidity</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-300">
                        {weatherData.humidity.toFixed(0)}%
                      </div>
                    </div>

                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <Wind className="w-5 h-5 text-gray-300 group-hover:scale-110 transition-transform" />
                        <span className="text-gray-400">Wind</span>
                      </div>
                      <div className="text-xl font-bold text-gray-300">
                        {weatherData.windSpeed} km/h
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-5 rounded-xl text-center">
                      <div className="text-5xl mb-3 animate-pulse">
                        {getWeatherIcon(weatherData.condition)}
                      </div>
                      <div className="text-xl font-bold text-white mb-1">
                        {weatherData.condition}
                      </div>
                      <div className="text-sm text-gray-300">
                        Feels like {(weatherData.temp + 2).toFixed(1)}°C
                      </div>
                    </div>
                  </div>
                </div>

                {/* Growth Conditions */}
                <div className="pt-5 border-t border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{growthCondition.icon}</div>
                      <div>
                        <div className="text-sm text-gray-400">Crop Growth</div>
                        <div className={`font-bold ${growthCondition.color}`}>
                          {growthCondition.status} Conditions
                        </div>
                      </div>
                    </div>
                    <button 
                      className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 rounded-lg text-sm font-medium hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300"
                      onClick={() => alert("Detailed growth analysis report opened")}
                    >
                      View Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-12 border-t border-gray-700/50">
          {/* Quick Links */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-green-400 animate-pulse" />
              <h3 className="text-lg font-bold text-white">Explore</h3>
            </div>
            <ul className="space-y-3">
              {[
                { label: "Farm Dashboard", icon: "📊", path: "/dashboard" },
                { label: "Crop Insights", icon: "🌽", path: "/insights" },
                { label: "Soil Analysis", icon: "🧪", path: "/soil" },
                { label: "Weather Forecast", icon: "🌤️", path: "/weather" },
                { label: "Market Prices", icon: "💹", path: "/market" }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.path}
                    className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-all duration-300 group"
                    onMouseEnter={() => handleHover(`quick-${idx}`)(true)}
                    onMouseLeave={() => handleHover(`quick-${idx}`)(false)}
                  >
                    <span className="text-xl group-hover:scale-125 transition-transform">{link.icon}</span>
                    <span className="group-hover:translate-x-2 transition-transform duration-300">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Solutions</h3>
            </div>
            <ul className="space-y-3">
              {[
                { label: "CropGuard Pro", desc: "Disease Detection", icon: "🛡️" },
                { label: "YieldOptimizer", desc: "Predictive Analytics", icon: "📈" },
                { label: "SoilSense AI", desc: "Nutrient Analysis", icon: "🌱" },
                { label: "IrriSmart", desc: "Water Management", icon: "💧" },
                { label: "FarmFlow", desc: "Operations Suite", icon: "🏡" }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={`/products/${link.label.toLowerCase()}`}
                    className="block p-3 rounded-lg hover:bg-gray-800/50 transition-all duration-300 group"
                    onMouseEnter={() => handleHover(`product-${idx}`)(true)}
                    onMouseLeave={() => handleHover(`product-${idx}`)(false)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:rotate-12 transition-transform">{link.icon}</span>
                      <div>
                        <div className="font-medium text-white group-hover:text-emerald-400">
                          {link.label}
                        </div>
                        <div className="text-sm text-gray-500">{link.desc}</div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Learn</h3>
            </div>
            <ul className="space-y-3">
              {[
                { label: "Farmers Guide", icon: "📖", badge: "New" },
                { label: "Video Tutorials", icon: "🎥", badge: "20+" },
                { label: "Research Papers", icon: "📄", badge: "AI" },
                { label: "Case Studies", icon: "🏆", badge: "Success" },
                { label: "Webinars", icon: "🎤", badge: "Live" }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={`/learn/${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/50 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{link.icon}</span>
                      <span className="text-gray-300 group-hover:text-blue-400">
                        {link.label}
                      </span>
                    </div>
                    <span className="text-xs bg-gray-700/50 px-2 py-1 rounded-full text-gray-400">
                      {link.badge}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">Support</h3>
            </div>
            <ul className="space-y-3">
              {[
                { label: "Help Center", icon: "❓", available: true },
                { label: "Community Forum", icon: "💬", available: true },
                { label: "Contact Support", icon: "📞", available: true },
                { label: "System Status", icon: "📡", available: true },
                { label: "Feedback", icon: "💡", available: true }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={`/support/${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className="flex items-center gap-3 text-gray-400 hover:text-purple-400 transition-all duration-300 group"
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span className="group-hover:translate-x-2 transition-transform">
                      {link.label}
                    </span>
                    {link.available && (
                      <span className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            
            {/* Support Button */}
            <button 
              className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white rounded-lg font-medium hover:from-purple-500/30 hover:to-blue-500/30 transition-all duration-300 border border-purple-500/30 hover:border-purple-500/50"
              onClick={() => alert("Connecting to support...")}
            >
              Get Instant Help
            </button>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 mt-8 border-t border-gray-700/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-gray-500 text-sm">
                © {new Date().getFullYear()} CropSync AI. Precision farming for a better tomorrow.
              </p>
              <p className="text-gray-600 text-sm mt-1">
                Certified ISO 27001 • GDPR Compliant • Carbon Neutral
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-300">All Systems Operational</span>
              </div>
              <div className="text-sm text-gray-400">
                v2.8.3 • Last updated: Today, {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Bottom Border */}
      <div className="h-1 bg-gradient-to-r from-transparent via-green-500/50 to-transparent animate-pulse" />
    </footer>
  );
};