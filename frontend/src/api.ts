//frontend/src/api.ts
import axios from "axios";
import { isDT } from "./hooks/useIsDT";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7777";
axios.defaults.withCredentials = true;
axios.interceptors.request.use(
  (config) => {
    if (isDT()) {
      throw new axios.Cancel("DT");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export const api = {
  auth: {
    me: () => axios.get(`${BACKEND_URL}/api/auth/me`),
    loginUrl: `${BACKEND_URL}/api/auth/login`,
    logout: (userId: number) =>
      axios.post(
        `${BACKEND_URL}/api/auth/logout`,
        {},
        {
          headers: { "X-Character-ID": userId.toString() },
        },
      ),
  },
  map: {
    getAll: () => axios.get(`${BACKEND_URL}/api/map/all`),
  },
  routes: {
    calc: (from: number, to: number) =>
      axios.get(`${BACKEND_URL}/api/routes/calc?from=${from}&to=${to}`),
  },
  systems: {
    pin: (id: number) => axios.post(`${BACKEND_URL}/api/systems/${id}/pin`),
    unpin: (id: number) => axios.post(`${BACKEND_URL}/api/systems/${id}/unpin`),
  },
  tags: {
    getAll: () => axios.get(`${BACKEND_URL}/api/tags`),
    add: (systemId: number, tag: string) =>
      axios.post(`${BACKEND_URL}/api/systems/${systemId}/tags`, { tag }),
    delete: (tagId: number) => axios.delete(`${BACKEND_URL}/api/tags/${tagId}`),
  },
  connections: {
    update: (id: string, payload: { wh_size: string; expires_at: string }) =>
      axios.patch(`${BACKEND_URL}/api/connections/${id}`, payload),
    delete: (id: string) =>
      axios.delete(`${BACKEND_URL}/api/connections/${id}`),
  },
  waypoints: {
    set: (targetId: number, userId: number) =>
      axios.post(
        `${BACKEND_URL}/api/waypoint/${targetId}`,
        {},
        {
          headers: { "X-Character-ID": userId.toString() },
        },
      ),
  },
};
