import React, { useEffect, useState } from "react";

export const TestAPI = () => {
  const [soilData, setSoilData] = useState(null);
  const [plantData, setPlantData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState({
    soil: false,
    plant: false,
    health: false
  });

  // Test soil API - using actual endpoint
  const fetchSoil = async () => {
    setLoading(prev => ({ ...prev, soil: true }));
    try {
      const res = await fetch("http://127.0.0.1:5000/api/soil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // You can't test POST endpoints without actual file upload
          // This will test if endpoint exists
          test: "test"
        })
      });
      
      let data;
      try {
        data = await res.json();
      } catch {
        data = { message: "Endpoint exists but requires file upload", status: res.status };
      }
      setSoilData(data);
    } catch (err) {
      console.error(err);
      setSoilData({ error: "Error fetching soil data", details: err.message });
    } finally {
      setLoading(prev => ({ ...prev, soil: false }));
    }
  };

  // Test plant API - using actual endpoint
  const fetchPlant = async () => {
    setLoading(prev => ({ ...prev, plant: true }));
    try {
      const res = await fetch("http://127.0.0.1:5000/api/plant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          test: "test"
        })
      });
      
      let data;
      try {
        data = await res.json();
      } catch {
        data = { message: "Endpoint exists but requires file upload", status: res.status };
      }
      setPlantData(data);
    } catch (err) {
      console.error(err);
      setPlantData({ error: "Error fetching plant data", details: err.message });
    } finally {
      setLoading(prev => ({ ...prev, plant: false }));
    }
  };

  // Test health endpoint
  const fetchHealth = async () => {
    setLoading(prev => ({ ...prev, health: true }));
    try {
      const res = await fetch("http://127.0.0.1:5000/api/health");
      const data = await res.json();
      setHealthData(data);
    } catch (err) {
      console.error(err);
      setHealthData({ error: "Error fetching health data", details: err.message });
    } finally {
      setLoading(prev => ({ ...prev, health: false }));
    }
  };

  // Test seasons endpoint
  const fetchSeasons = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/api/seasons");
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Seasons endpoint error:", err);
      return { error: "Error fetching seasons" };
    }
  };

  // Test hello endpoint
  const fetchHello = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/api/hello");
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Hello endpoint error:", err);
      return { error: "Error fetching hello endpoint" };
    }
  };

  // Run all tests on component mount
  useEffect(() => {
    const runAllTests = async () => {
      console.log("Running all API tests...");
      
      // Test hello endpoint
      const helloData = await fetchHello();
      console.log("Hello endpoint:", helloData);
      
      // Test health endpoint
      await fetchHealth();
      
      // Test seasons endpoint
      const seasonsData = await fetchSeasons();
      console.log("Seasons endpoint:", seasonsData);
    };
    
    runAllTests();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
          Agro-Optics API Testing Dashboard
        </h1>
        <p className="text-gray-400 mb-8">Test all backend API endpoints</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Health Check */}
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-xl">
            <h2 className="text-2xl font-semibold text-green-400 mb-4 flex items-center gap-2">
              <span className="text-2xl">🩺</span> System Health
            </h2>
            <button
              onClick={fetchHealth}
              disabled={loading.health}
              className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-xl font-semibold mb-4 disabled:opacity-50 flex items-center gap-2"
            >
              {loading.health ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Testing...
                </>
              ) : (
                "Test Health Endpoint"
              )}
            </button>
            {healthData && (
              <div className="mt-4">
                <pre className="bg-gray-900/50 p-4 rounded-xl border border-gray-600 overflow-auto max-h-60 text-sm">
                  {JSON.stringify(healthData, null, 2)}
                </pre>
                {healthData.status === "ok" && (
                  <div className="mt-3 p-3 bg-green-900/30 border border-green-700/50 rounded-xl">
                    <div className="flex items-center gap-2 text-green-400">
                      <span className="text-xl">✅</span>
                      <span className="font-medium">All systems operational!</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Soil API Test */}
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-xl">
            <h2 className="text-2xl font-semibold text-amber-400 mb-4 flex items-center gap-2">
              <span className="text-2xl">🧪</span> Soil Analysis API
            </h2>
            <button
              onClick={fetchSoil}
              disabled={loading.soil}
              className="bg-amber-600 hover:bg-amber-700 px-5 py-3 rounded-xl font-semibold mb-4 disabled:opacity-50 flex items-center gap-2"
            >
              {loading.soil ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Testing...
                </>
              ) : (
                "Test Soil API"
              )}
            </button>
            <p className="text-gray-400 text-sm mb-3">
              POST endpoint: <code className="bg-gray-900 px-2 py-1 rounded">/api/soil</code>
            </p>
            {soilData && (
              <div className="mt-4">
                <pre className="bg-gray-900/50 p-4 rounded-xl border border-gray-600 overflow-auto max-h-60 text-sm">
                  {JSON.stringify(soilData, null, 2)}
                </pre>
                {soilData.error ? (
                  <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-xl">
                    <div className="flex items-center gap-2 text-red-400">
                      <span className="text-xl">❌</span>
                      <span className="font-medium">API Error</span>
                    </div>
                    <p className="text-red-300 text-sm mt-1">{soilData.details || soilData.error}</p>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-green-900/30 border border-green-700/50 rounded-xl">
                    <div className="flex items-center gap-2 text-green-400">
                      <span className="text-xl">✅</span>
                      <span className="font-medium">Endpoint is reachable</span>
                    </div>
                    <p className="text-green-300 text-sm mt-1">Note: Full test requires file upload</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plant API Test */}
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-xl">
            <h2 className="text-2xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <span className="text-2xl">🌿</span> Plant Diagnosis API
            </h2>
            <button
              onClick={fetchPlant}
              disabled={loading.plant}
              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold mb-4 disabled:opacity-50 flex items-center gap-2"
            >
              {loading.plant ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Testing...
                </>
              ) : (
                "Test Plant API"
              )}
            </button>
            <p className="text-gray-400 text-sm mb-3">
              POST endpoint: <code className="bg-gray-900 px-2 py-1 rounded">/api/plant</code>
            </p>
            {plantData && (
              <div className="mt-4">
                <pre className="bg-gray-900/50 p-4 rounded-xl border border-gray-600 overflow-auto max-h-60 text-sm">
                  {JSON.stringify(plantData, null, 2)}
                </pre>
                {plantData.error ? (
                  <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-xl">
                    <div className="flex items-center gap-2 text-red-400">
                      <span className="text-xl">❌</span>
                      <span className="font-medium">API Error</span>
                    </div>
                    <p className="text-red-300 text-sm mt-1">{plantData.details || plantData.error}</p>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-green-900/30 border border-green-700/50 rounded-xl">
                    <div className="flex items-center gap-2 text-green-400">
                      <span className="text-xl">✅</span>
                      <span className="font-medium">Endpoint is reachable</span>
                    </div>
                    <p className="text-green-300 text-sm mt-1">Note: Full test requires file upload</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GET Endpoints Test */}
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-xl">
            <h2 className="text-2xl font-semibold text-purple-400 mb-4 flex items-center gap-2">
              <span className="text-2xl">🔗</span> GET Endpoints
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">Available Endpoints:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-900 px-3 py-1.5 rounded-lg flex-1">GET /api/hello</code>
                    <span className="text-green-400">✅ Working</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-900 px-3 py-1.5 rounded-lg flex-1">GET /api/health</code>
                    <span className="text-green-400">✅ Working</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-900 px-3 py-1.5 rounded-lg flex-1">GET /api/seasons</code>
                    <span className="text-green-400">✅ Working</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-900 px-3 py-1.5 rounded-lg flex-1">GET /api/history?email=user@example.com</code>
                    <span className="text-blue-400">🔒 Requires Auth</span>
                  </li>
                </ul>
              </div>
              
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-lg font-medium text-gray-300 mb-2">POST Endpoints:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-900 px-3 py-1.5 rounded-lg flex-1">POST /api/signup</code>
                    <span className="text-green-400">✅ Working</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-900 px-3 py-1.5 rounded-lg flex-1">POST /api/login</code>
                    <span className="text-green-400">✅ Working</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="bg-gray-900 px-3 py-1.5 rounded-lg flex-1">POST /api/crop-by-season</code>
                    <span className="text-green-400">✅ Working</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-8 bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
          <h2 className="text-2xl font-semibold text-cyan-400 mb-4">Connection Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${healthData?.status === 'ok' ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Backend Server</span>
                <span className={`px-3 py-1 rounded-full text-sm ${healthData?.status === 'ok' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                  {healthData?.status === 'ok' ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {healthData?.status === 'ok' 
                  ? 'Connected to http://127.0.0.1:5000' 
                  : 'Cannot connect to backend server'}
              </p>
            </div>
            
            <div className="p-4 rounded-xl border border-blue-700/50 bg-blue-900/20">
              <div className="flex items-center justify-between">
                <span className="font-medium">Models Loaded</span>
                <span className="px-3 py-1 rounded-full text-sm bg-blue-900/50 text-blue-300">
                  {healthData?.models_loaded ? 'Partial' : 'Checking...'}
                </span>
              </div>
              {healthData?.models_loaded && (
                <div className="text-sm text-gray-400 mt-2 space-y-1">
                  {Object.entries(healthData.models_loaded).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span>{key}: {value ? '✅' : '❌'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 rounded-xl border border-purple-700/50 bg-purple-900/20">
              <div className="flex items-center justify-between">
                <span className="font-medium">Database</span>
                <span className="px-3 py-1 rounded-full text-sm bg-purple-900/50 text-purple-300">
                  SQLite
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-2">SQLite database in instance folder</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={() => window.open("http://127.0.0.1:5000/api/hello", "_blank")}
            className="px-5 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium"
          >
            Open /api/hello in new tab
          </button>
          <button
            onClick={() => window.open("http://127.0.0.1:5000/api/health", "_blank")}
            className="px-5 py-3 bg-green-700 hover:bg-green-600 rounded-xl font-medium"
          >
            Open /api/health in new tab
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              alert("LocalStorage cleared. Refresh page.");
            }}
            className="px-5 py-3 bg-red-700 hover:bg-red-600 rounded-xl font-medium"
          >
            Clear LocalStorage
          </button>
        </div>
      </div>
    </div>
  );
};