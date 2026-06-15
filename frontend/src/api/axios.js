import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:5000",
});

// For debugging
api.interceptors.request.use((req) => {
  console.log("➡ API Request:", req.method, req.url, req.data);
  return req;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.log("❌ API Error:", err.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default api;