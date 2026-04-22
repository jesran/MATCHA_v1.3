import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001/api",
});

const authClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001/api",
});

function clearStoredTokens() {
  // Keep every part of the app in sync when a token expires or refresh fails.
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.dispatchEvent(new Event("profile:updated"));
  window.dispatchEvent(new Event("auth:expired"));
}

apiClient.interceptors.request.use((config) => {
  // Auth endpoints must stay token-free; an old token should never block login,
  // registration, or token refresh.
  const authFreePaths = ["/auth/login/", "/auth/register/", "/auth/refresh/"];
  if (authFreePaths.some((path) => config.url?.endsWith(path))) {
    return config;
  }

  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = localStorage.getItem("refreshToken");
    const status = error.response?.status;

    if (status === 401 && refreshToken && !originalRequest._retry) {
      // Retry once with a fresh access token so normal page requests recover
      // quietly after the short-lived JWT expires.
      originalRequest._retry = true;

      try {
        const refreshResponse = await authClient.post("/auth/refresh/", {
          refresh: refreshToken,
        });
        localStorage.setItem("accessToken", refreshResponse.data.access);
        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearStoredTokens();
        return Promise.reject(refreshError);
      }
    }

    if (status === 401) {
      clearStoredTokens();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
