/**
 * TexVision API client
 */

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const getApiBaseUrl = () => {
  if (Platform.OS === "web") {
    return "http://localhost:8000";
  }

  // তোমার PC-এর LAN IP
  return "http://192.168.1.166:8000";
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("texvision_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const authApi = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  me: () => api.get("/api/auth/me"),
};

export const inspectionApi = {
  predictDefect: async (formData) => {
    const token = await AsyncStorage.getItem("texvision_token");

    const response = await fetch(
      `${API_BASE_URL}/api/predict-defect`,
      {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/json",
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(
        data?.detail || "Request failed"
      );

      error.response = {
        data,
        status: response.status,
      };

      throw error;
    }

    return {
      data,
      status: response.status,
    };
  },

  history: () =>
    api.get("/api/inspection-history"),

  getOne: (id) =>
    api.get(`/api/inspection/${id}`),

  // Inspector → Project Manager
  submit: (inspectionId) =>
    api.post(`/api/inspections/${inspectionId}/submit`),

  // Project Manager
  getPendingForManager: () =>
    api.get("/api/inspections/pending/manager"),

  submitDecision: (inspectionId, decision, reason) =>
    api.post(
      `/api/inspections/${inspectionId}/decision`,
      {
        decision,
        reason,
      }
    ),

  startReinspection: (inspectionId, reason) =>
    api.post(
      `/api/inspections/${inspectionId}/reinspect`,
      { reason }
    ),

  getComparison: (inspectionId) =>
    api.get(
      `/api/inspections/${inspectionId}/comparison`
    ),

  getAuditTrail: (inspectionId) =>
    api.get(
      `/api/inspections/${inspectionId}/audit-trail`
    ),
};

export const dashboardApi = {
  statistics: () =>
    api.get("/api/statistics"),

  reports: () =>
    api.get("/api/reports"),

  generateReport: () =>
    api.post("/api/reports/generate"),

  workflowStatus: () =>
    api.get("/api/workflow-status"),
};

export default api;