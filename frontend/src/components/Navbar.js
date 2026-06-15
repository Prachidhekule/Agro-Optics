import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { 
  Menu, X, Home, Globe, Leaf, Users, 
  User, LogOut, History, BarChart3,
  ChevronDown, Settings, HelpCircle,
  Search, Bell, Sun, Moon
} from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useContext(AppContext);
  const [active, setActive] = useState("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Update active state based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === "/") setActive("home");
    else if (path.includes("profile")) setActive("profile");
    else if (path.includes("login")) setActive("login");
    else if (path.includes("signup")) setActive("signup");
    else if (path.includes("history")) setActive("history");
    else if (path.includes("soil")) setActive("soil");
    else if (path.includes("plant")) setActive("plant");
    else if (path.includes("developer")) setActive("developers");
    else if (path.includes("dashboard")) setActive("dashboard");
  }, [location.pathname]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle navigation
  const handleNav = (target) => {
    setActive(target);
    setIsMenuOpen(false);
    setDropdownOpen(false);
    
    switch(target) {
      case "home":
        navigate("/");
        break;
      case "soil":
        navigate("/soil-analysis");
        break;
      case "plant":
        navigate("/plant-diagnostics");
        break;
      case "developers":
        navigate("/developers");
        break;
      case "history":
        if (isAuthenticated) {
          navigate("/history");
        } else {
          alert("Please sign in to view your history");
          navigate("/login");
        }
        break;
      case "profile":
        if (isAuthenticated) {
          navigate("/profile");
        } else {
          navigate("/login");
        }
        break;
      case "login":
        navigate("/login");
        break;
      case "signup":
        navigate("/signup");
        break;
      case "logout":
        logout();
        navigate("/");
        break;
      default:
        navigate("/");
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Navigation items for all users
  const navItems = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "soil", label: "Soil Analysis", icon: Globe, path: "/soil-analysis" },
    { id: "plant", label: "Plant Health", icon: Leaf, path: "/plant-diagnostics" },
    { id: "developers", label: "Developers", icon: Users, path: "/developers" },
  ];

  // Add history item if logged in
  if (isAuthenticated) {
    navItems.push({ id: "history", label: "History", icon: History, path: "/history" });
  }

  // User dropdown items
  const userDropdownItems = isAuthenticated ? [
    { id: "profile", label: "My Profile", icon: User, action: () => handleNav("profile") },
    { id: "history", label: "Analysis History", icon: History, action: () => handleNav("history") },
    { type: "divider" },
    { id: "settings", label: "Settings", icon: Settings, action: () => alert("Settings coming soon!") },
    { id: "help", label: "Help & Support", icon: HelpCircle, action: () => alert("Help coming soon!") },
    { type: "divider" },
    { id: "logout", label: "Logout", icon: LogOut, action: () => handleNav("logout") }
  ] : [];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-gray-900/95 backdrop-blur-xl border-b border-gray-700/50 shadow-2xl py-0' 
          : 'bg-gray-900/80 backdrop-blur-lg border-b border-gray-700/30 py-2'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            
            {/* Logo */}
            <div className="flex items-center">
              <div 
                onClick={() => handleNav("home")}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Leaf className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-gray-900"></div>
                </div>
                <div className="hidden sm:flex flex-col">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    Agro-Optics
                  </h1>
                  <p className="text-xs text-gray-400">AI-Powered Farming</p>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    active === item.id 
                      ? "bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border border-green-500/30" 
                      : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right side - Actions & User */}
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-xl hover:bg-gray-800/50 transition-colors duration-300"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-gray-400 hover:text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-400 hover:text-blue-400" />
                )}
              </button>

              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => handleNav("login")}
                    className="hidden lg:block px-4 py-2 text-gray-300 hover:text-white font-medium transition-colors duration-300"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleNav("signup")}
                    className="hidden lg:block px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl font-semibold text-white shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
                  >
                    Get Started
                  </button>
                </>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800/50 transition-all duration-300 group"
                  >
                    <div className="relative">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg overflow-hidden">
                        {user?.photo ? (
                          <img 
                            src={user.photo} 
                            alt={user.name || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-900"></div>
                    </div>
                    <div className="hidden lg:flex flex-col items-start">
                      <span className="text-sm font-semibold text-white max-w-[120px] truncate">
                        {user?.name || user?.email?.split('@')[0] || "User"}
                      </span>
                      <span className="text-xs text-gray-400">Farmer</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl z-50 py-2 animate-fadeIn">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-gray-700/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center overflow-hidden">
                              {user?.photo ? (
                                <img 
                                  src={user.photo} 
                                  alt={user.name || "User"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-6 h-6 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white truncate">
                                {user?.name || "User"}
                              </h3>
                              <p className="text-sm text-gray-400 truncate">
                                {user?.email || "user@example.com"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        {userDropdownItems.map((item, index) => (
                          item.type === "divider" ? (
                            <div key={`divider-${index}`} className="my-2 border-t border-gray-700/50" />
                          ) : (
                            <button
                              key={item.id}
                              onClick={() => {
                                setDropdownOpen(false);
                                item.action?.();
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors duration-300"
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </button>
                          )
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-800/50 transition-colors duration-300"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6 text-gray-300" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/50 shadow-2xl animate-slideDown">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                      active === item.id 
                        ? "bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400" 
                        : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                    }`}
                  >
                    {item.icon && <item.icon className="w-5 h-5" />}
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}

                {/* Mobile Auth Buttons */}
                {!isAuthenticated ? (
                  <div className="pt-4 space-y-2">
                    <button
                      onClick={() => handleNav("login")}
                      className="w-full px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-xl font-medium transition-colors duration-300"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => handleNav("signup")}
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl font-semibold text-white transition-all duration-300"
                    >
                      Get Started Free
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 space-y-2">
                    <div className="px-4 py-3 border-t border-gray-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center overflow-hidden">
                          {user?.photo ? (
                            <img 
                              src={user.photo} 
                              alt={user.name || "User"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">
                            {user?.name || "User"}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {user?.email || "user@example.com"}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {userDropdownItems.map((item, index) => (
                      item.type === "divider" ? (
                        <div key={`mobile-divider-${index}`} className="border-t border-gray-700/50 my-2" />
                      ) : (
                        <button
                          key={item.id}
                          onClick={() => {
                            setIsMenuOpen(false);
                            item.action?.();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-xl transition-colors duration-300"
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </button>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Add space for fixed navbar */}
      <div className="h-14"></div>

      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default Navbar;