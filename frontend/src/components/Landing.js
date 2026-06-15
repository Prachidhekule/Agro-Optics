import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SoilDiagnostics } from "./SoilDiagnostics";
import PlantDiagnostics from './PlantDiagnostics';
import DeveloperSection from "./DeveloperSection";
import { AgroFooter as Footer } from './Footer';
import { ArrowRight, Play, Sparkles, Leaf, Globe, Zap, ChevronDown, X, Target, TrendingUp, Shield, Menu, X as Close } from "lucide-react";

export const Landing = ({ sections = {} }) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [counters, setCounters] = useState({ farmers: 0, accuracy: 0, plants: 0 });
  const [currentNumber, setCurrentNumber] = useState(1);
  const [showAgroOptics, setShowAgroOptics] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [countdownComplete, setCountdownComplete] = useState(false);
  const [aiVideoLoaded, setAiVideoLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const numbersContainerRef = useRef(null);
  const aiVideoRef = useRef(null);

  // Countdown animation from 1-12
  useEffect(() => {
    if (!countdownComplete) {
      const interval = setInterval(() => {
        setCurrentNumber(prev => {
          if (prev >= 12) {
            clearInterval(interval);
            setTimeout(() => {
              setShowAgroOptics(true);
              setTimeout(() => {
                setShowContent(true);
                setCountdownComplete(true);
              }, 1500);
            }, 500);
            return 12;
          }
          return prev + 1;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [countdownComplete]);

  // Counter animation
  useEffect(() => {
    if (countdownComplete) {
      const targetValues = { farmers: 10000, accuracy: 95, plants: 50000 };
      const duration = 2000;
      const step = 20;

      const animateCounter = (key, target) => {
        let current = 0;
        const increment = target / (duration / step);

        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          setCounters(prev => ({ ...prev, [key]: Math.floor(current) }));
        }, step);
      };

      Object.keys(targetValues).forEach(key => {
        animateCounter(key, targetValues[key]);
      });
    }
  }, [countdownComplete]);

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const progress = (scrollY / maxScroll) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  // Preload AI video
  useEffect(() => {
    if (aiVideoRef.current) {
      aiVideoRef.current.load();
    }
  }, []);

  // Define scrollToSection with useCallback
  const scrollToSection = useCallback((section) => {
    setMobileMenuOpen(false); // Close mobile menu when scrolling
    if (section === "home") {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
      
      if (heroRef.current) {
        heroRef.current.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }
    
    if (sections[section]?.current) {
      sections[section].current.scrollIntoView({ behavior: "smooth" });
    }
  }, [sections]);

  // Update the global function when scrollToSection changes
  useEffect(() => {
    window.scrollToSectionGlobal = scrollToSection;
    
    return () => {
      window.scrollToSectionGlobal = undefined;
    };
  }, [scrollToSection]);

  const handleModalSignup = () => {
    const name = document.getElementById("modal-name")?.value || "";
    const email = document.getElementById("modal-email")?.value || "";
    const password = document.getElementById("modal-password")?.value || "";
    
    if (!name || !email || !password) {
      alert("Please fill all fields!");
      return;
    }
    
    setAuthModalOpen(false);
    navigate("/signup");
  };

  // Stats data
  const stats = [
    { 
      value: counters.farmers.toLocaleString(), 
      label: "Farmers Empowered", 
      icon: "👨‍🌾", 
      color: "from-green-500 to-emerald-400" 
    },
    { 
      value: `${counters.accuracy}%`, 
      label: "Accuracy", 
      icon: "🤖", 
      color: "from-blue-500 to-cyan-400" 
    },
    { 
      value: counters.plants.toLocaleString(), 
      label: "Plants Diagnosed", 
      icon: "🌿", 
      color: "from-emerald-500 to-green-400" 
    },
  ];

  // Features data
  const features = [
    {
      icon: Globe,
      title: "Soil Vision",
      description: "Advanced soil analysis using deep learning",
      color: "from-amber-600 to-yellow-400",
      delay: "100"
    },
    {
      icon: Leaf,
      title: "Plant Health",
      description: "Instant disease detection and treatment recommendations",
      color: "from-emerald-600 to-green-400",
      delay: "200"
    },
    {
      icon: Zap,
      title: "Smart Analytics",
      description: "Real-time farming insights and predictions",
      color: "from-violet-600 to-purple-400",
      delay: "300"
    },
  ];

  // Numbers 1-12 with their meanings
  const numberMeanings = [
    { number: 1, meaning: "Vision" },
    { number: 2, meaning: "Precision" },
    { number: 3, meaning: "Innovation" },
    { number: 4, meaning: "Growth" },
    { number: 5, meaning: "Sustainability" },
    { number: 6, meaning: "Technology" },
    { number: 7, meaning: "Accuracy" },
    { number: 8, meaning: "Efficiency" },
    { number: 9, meaning: "Intelligence" },
    { number: 10, meaning: "Transformation" },
    { number: 11, meaning: "Excellence" },
    { number: 12, meaning: "Revolution" },
  ];

  return (
    <div className="text-white bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-800 z-50">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-cyan-500 transition-all duration-300"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Mobile Navigation */}
      {showContent && (
        <nav className="fixed top-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 z-40 md:hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Agro-Optics
              </span>
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-gray-800/50 rounded-lg border border-gray-700/50"
            >
              {mobileMenuOpen ? <Close className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 animate-slideDown">
              <div className="flex flex-col p-4 space-y-3">
                <button
                  onClick={() => scrollToSection("home")}
                  className="px-4 py-3 text-left hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection("soil")}
                  className="px-4 py-3 text-left hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
                >
                  Soil Vision
                </button>
                <button
                  onClick={() => scrollToSection("plant")}
                  className="px-4 py-3 text-left hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
                >
                  Plant Diagnostics
                </button>
                <button
                  onClick={() => scrollToSection("developers")}
                  className="px-4 py-3 text-left hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
                >
                  Developers
                </button>
                <div className="pt-3 border-t border-gray-700/50 mt-3">
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-lg font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all duration-300"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>
      )}

      {/* Countdown Animation Section */}
      {!countdownComplete && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-6xl px-4">
            {/* AI Video Background */}
            <div className="absolute inset-0 overflow-hidden">
              <video
                ref={aiVideoRef}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-30"
                onLoadedData={() => setAiVideoLoaded(true)}
              >
                <source 
                  src="https://assets.mixkit.co/videos/preview/mixkit-abstract-geometric-ai-video-14106-large.mp4" 
                  type="video/mp4" 
                />
                <source 
                  src="/videos/ai-tech-background.mp4" 
                  type="video/mp4" 
                />
              </video>
              <div className={`absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/70 to-gray-900/90 transition-opacity duration-1000 ${aiVideoLoaded ? 'opacity-100' : 'opacity-0'}`} />
              
              {/* Floating AI particles */}
              <div className="absolute inset-0">
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-gradient-to-r from-blue-400/30 to-emerald-400/30 rounded-full animate-float"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 5}s`,
                      animationDuration: `${2 + Math.random() * 4}s`,
                      width: `${4 + Math.random() * 8}px`,
                      height: `${4 + Math.random() * 8}px`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Numbers Container */}
            <div 
              ref={numbersContainerRef}
              className="relative grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12"
            >
              {Array.from({ length: currentNumber }, (_, i) => i + 1).map((num) => (
                <div
                  key={num}
                  className={`relative aspect-square w-full max-w-16 sm:max-w-20 md:max-w-24 flex items-center justify-center rounded-xl sm:rounded-2xl border-2 ${
                    num === currentNumber
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-500/30 to-green-500/20 shadow-lg shadow-emerald-500/30 animate-pulse backdrop-blur-sm'
                      : 'border-gray-700/50 bg-gray-900/50 backdrop-blur-sm'
                  } transition-all duration-300`}
                >
                  <span className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black ${
                    num === currentNumber 
                      ? 'text-emerald-400 animate-bounce' 
                      : 'text-gray-300'
                  }`}>
                    {num}
                  </span>
                  
                  {/* Meaning Tooltip */}
                  {num === currentNumber && numberMeanings[num-1] && (
                    <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 backdrop-blur-sm px-2 py-1 sm:px-3 sm:py-1 rounded-lg border border-emerald-500/30">
                        <span className="text-xs sm:text-sm text-emerald-400 font-medium">
                          {numberMeanings[num-1].meaning}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* AgroOptics Reveal with AI Video Background */}
            {showAgroOptics && (
              <div className="relative z-10 text-center animate-fadeInUp">
                {/* AI Pattern Background */}
                <div className="absolute inset-0 -z-10 overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900/0 via-gray-900/70 to-gray-900" />
                  
                  {/* Animated Neural Network Lines */}
                  <div className="absolute inset-0">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute h-0.5 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent animate-neuralLine"
                        style={{
                          top: `${(i + 1) * 12}%`,
                          left: '-10%',
                          width: '120%',
                          animationDelay: `${i * 0.2}s`,
                          animationDuration: `${3 + Math.random() * 2}s`
                        }}
                      />
                    ))}
                  </div>
                </div>

                <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-tight mb-4 sm:mb-6">
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                      Agro-Optics
                    </span>
                    {/* Animated glow effect */}
                    <div className="absolute -inset-2 sm:-inset-3 md:-inset-4 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-cyan-500/10 blur-2xl sm:blur-3xl animate-pulse" />
                  </span>
                </h1>
                
                {/* AI Tagline with Tech Elements */}
                <div className="relative mb-4 sm:mb-6">
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-300 max-w-3xl mx-auto px-4">
                    <span className="relative">
                      Revolutionizing Agriculture with
                      <span className="ml-1 sm:ml-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent font-bold">
                        AI Intelligence
                      </span>
                      <div className="absolute -right-4 sm:-right-6 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full animate-ping opacity-70" />
                      </div>
                    </span>
                  </p>
                  
                  {/* Tech Badges */}
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4 sm:mt-6 px-4">
                    <span className="px-2 sm:px-3 py-1 bg-gradient-to-r from-blue-500/20 to-blue-600/10 rounded-full border border-blue-500/30 text-blue-300 text-xs sm:text-sm">
                      Deep Learning
                    </span>
                    <span className="px-2 sm:px-3 py-1 bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 rounded-full border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm">
                      Neural Networks
                    </span>
                    <span className="px-2 sm:px-3 py-1 bg-gradient-to-r from-purple-500/20 to-purple-600/10 rounded-full border border-purple-500/30 text-purple-300 text-xs sm:text-sm">
                      Computer Vision
                    </span>
                    <span className="px-2 sm:px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 rounded-full border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm">
                      Analytics
                    </span>
                  </div>
                </div>

                {/* Animated AI Visualization */}
                <div className="max-w-4xl mx-auto mb-6 sm:mb-8 relative px-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { icon: "🧠", label: "AI Models", color: "from-blue-500 to-cyan-400" },
                      { icon: "👁️", label: "Vision AI", color: "from-emerald-500 to-green-400" },
                      { icon: "📊", label: "Analytics", color: "from-violet-500 to-purple-400" },
                      { icon: "🤖", label: "Automation", color: "from-amber-500 to-yellow-400" }
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="bg-gray-900/40 backdrop-blur-sm p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-500 group"
                      >
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          <span className="text-xl sm:text-2xl animate-bounce" style={{ animationDelay: `${index * 0.2}s` }}>
                            {item.icon}
                          </span>
                          <span className={`text-sm sm:text-base md:text-lg font-semibold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                            {item.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Loading Bar */}
            {!showAgroOptics && (
              <div className="relative z-10 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-2 bg-gray-800/50 backdrop-blur-sm rounded-full overflow-hidden mt-8 sm:mt-12">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-cyan-500 transition-all duration-100"
                  style={{ width: `${(currentNumber / 12) * 100}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              </div>
            )}
          </div>

          {/* Skip Button */}
          {!showAgroOptics && (
            <button
              onClick={() => {
                setCurrentNumber(12);
                setTimeout(() => {
                  setShowAgroOptics(true);
                  setTimeout(() => {
                    setShowContent(true);
                    setCountdownComplete(true);
                  }, 1500);
                }, 100);
              }}
              className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-lg sm:rounded-xl text-gray-400 hover:text-white hover:border-gray-600/50 transition-all duration-300 text-xs sm:text-sm z-20"
            >
              Skip Intro
            </button>
          )}
        </div>
      )}

      {/* Hero Section */}
      {showContent && (
        <section
          ref={heroRef}
          className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 md:pt-0"
          id="home"
        >
          {/* Background Video with Overlay */}
          <div className="absolute inset-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              onLoadedData={() => setVideoLoaded(true)}
            >
              <source src="/videos/landing_video.mp4" type="video/mp4" />
            </video>
            <div className={`absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/70 to-gray-900/80 transition-opacity duration-1000 ${videoLoaded ? 'opacity-50' : 'opacity-0'}`} />
            
            {/* Animated Particles */}
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${3 + Math.random() * 7}s`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 text-center px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
            {/* Animated Welcome Text */}
            <div className="mb-6 sm:mb-8 animate-fadeIn">
              <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded-full border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-medium">
                🚀 Where Precision Meets Agriculture
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-tight mb-4 sm:mb-6 animate-fadeInUp px-4">
              <span className="block bg-gradient-to-r from-blue-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                Agro-Optics
              </span>
              <span className="block text-lg sm:text-2xl md:text-4xl font-normal text-gray-300 mt-2 sm:mt-4">
                Intelligent Farming Solutions
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed animate-fadeInUp delay-200 px-4">
              A Deep Learning Framework for Integrated Pedology and Phytopathological Diagnostics
            </p>

            {/* Stats Counter */}
            {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto mb-8 sm:mb-10 md:mb-12 animate-fadeInUp delay-300 px-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-gray-900/30 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-700/30 hover:border-gray-600/50 transition-all duration-500 hover:scale-105 group"
                >
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <span className="text-xl sm:text-2xl">{stat.icon}</span>
                    <div className={`text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                      {stat.value}
                    </div>
                  </div>
                  <div className="text-gray-300 font-medium text-xs sm:text-sm md:text-base">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div> */}

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 animate-fadeInUp delay-400 px-4">
              <button
                onMouseEnter={() => setHoveredButton("soil")}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={() => scrollToSection("soil")}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-lg sm:rounded-xl font-bold hover:from-blue-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-[1.05] flex items-center gap-2 sm:gap-3 group relative overflow-hidden text-sm sm:text-base"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Soil Vision</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              <button
                onMouseEnter={() => setHoveredButton("plant")}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={() => scrollToSection("plant")}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg sm:rounded-xl font-bold hover:from-emerald-700 hover:to-green-700 transition-all duration-300 transform hover:scale-[1.05] flex items-center gap-2 sm:gap-3 group relative overflow-hidden text-sm sm:text-base"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <Leaf className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Plant Diagnostics</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              <button
                onMouseEnter={() => setHoveredButton("start")}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={() => setAuthModalOpen(true)}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg sm:rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-[1.05] flex items-center gap-2 sm:gap-3 group relative overflow-hidden text-sm sm:text-base"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Get Started</span>
              </button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto mb-12 sm:mb-16 md:mb-20 animate-fadeInUp delay-500 px-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`bg-gray-900/40 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-500 delay-${feature.delay} hover:scale-[1.02] group`}
                >
                  <div className={`inline-flex p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${feature.color} mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-500`}>
                    <feature.icon className="w-4 h-4 sm:w-5 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm md:text-base">{feature.description}</p>
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-700/50">
                    <button
                      onClick={() => scrollToSection(feature.title.includes("Soil") ? "soil" : "plant")}
                      className="text-xs sm:text-sm text-gray-300 hover:text-white flex items-center gap-1 sm:gap-2 group/button"
                    >
                      Learn More
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover/button:translate-x-1 transition-transform duration-300" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Scroll Down Indicator */}
            <button
              onClick={() => scrollToSection("soil")}
              className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce group"
            >
              <div className="flex flex-col items-center">
                <span className="text-xs sm:text-sm text-gray-400 mb-1 sm:mb-2">Explore Features</span>
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-6 md:w-6 md:h-6 text-gray-400 group-hover:text-white transition-colors duration-300" />
              </div>
            </button>
          </div>
        </section>
      )}

      {/* Soil Diagnostics */}
      {showContent && (
        <section ref={sections?.soil} id="soil" className="pt-16 md:pt-0">
          <SoilDiagnostics />
        </section>
      )}

      {/* Plant Diagnostics */}
      {showContent && (
        <section ref={sections?.plant} id="plant" className="pt-16 md:pt-0">
          <PlantDiagnostics />
        </section>
      )}

      {/* Developer Section */}
      {showContent && (
        <DeveloperSection ref={sections?.developers} id="developers" className="pt-16 md:pt-0" />
      )}

      {/* Footer */}
      {showContent && (
        <Footer />
      )}

      {/* Auth Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={() => setAuthModalOpen(false)}
          />
          
          {/* Modal */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl md:rounded-3xl w-full max-w-sm sm:max-w-md overflow-hidden border border-gray-700/50 shadow-2xl animate-modalIn">
              {/* Animated Border */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-emerald-500/20 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              {/* Modal Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700/50">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">Start Your Journey</h2>
                      <p className="text-xs sm:text-sm text-gray-400">Join thousands of smart farmers</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAuthModalOpen(false)}
                    className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-lg sm:rounded-xl transition-all duration-300 group"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-white" />
                  </button>
                </div>

                {/* Form */}
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Full Name</label>
                      <input
                        id="modal-name"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-800/50 border border-gray-700 rounded-lg sm:rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                        placeholder="Enter your name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Email Address</label>
                      <input
                        id="modal-email"
                        type="email"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-800/50 border border-gray-700 rounded-lg sm:rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">Password</label>
                      <input
                        id="modal-password"
                        type="password"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-800/50 border border-gray-700 rounded-lg sm:rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                        placeholder="••••••••"
                      />
                    </div>

                    <button
                      onClick={handleModalSignup}
                      className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg hover:from-blue-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-[1.02] mt-4 sm:mt-6"
                    >
                      Create Free Account
                    </button>

                    <div className="text-center pt-3 sm:pt-4">
                      <p className="text-gray-400 text-xs sm:text-sm">
                        Already have an account?{" "}
                        <button
                          onClick={() => { setAuthModalOpen(false); navigate("/login"); }}
                          className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                          Sign In
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInDown {
          from { 
            opacity: 0;
            transform: translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes modalIn {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes neuralLine {
          0% {
            transform: translateX(-100%) scaleX(0.5);
            opacity: 0;
          }
          50% {
            transform: translateX(0) scaleX(1);
            opacity: 0.5;
          }
          100% {
            transform: translateX(100%) scaleX(0.5);
            opacity: 0;
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 1s ease-out;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-fadeInDown {
          animation: fadeInDown 0.8s ease-out forwards;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-modalIn {
          animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .animate-neuralLine {
          animation: neuralLine 3s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
        
        .delay-100 {
          animation-delay: 100ms;
        }
        .delay-200 {
          animation-delay: 200ms;
        }
        .delay-300 {
          animation-delay: 300ms;
        }
        .delay-400 {
          animation-delay: 400ms;
        }
        .delay-500 {
          animation-delay: 500ms;
        }

        /* Ensure the hero section is properly spaced on mobile */
        @media (max-width: 768px) {
          section {
            scroll-margin-top: 64px;
          }
        }
      `}</style>
    </div>
  );
};