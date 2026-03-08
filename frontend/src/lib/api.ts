import axios from "axios";

const isBrowser = typeof window !== "undefined";

export const API_URL = (() => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (!isBrowser) return "http://localhost:20000";

  // In development, Next.js runs on 3000, while Go API runs on 20000.
  // We use the same hostname as the UI to support both localhost and IP-based access.
  if (window.location.port === "3000") {
    return `http://${window.location.hostname}:20000`;
  }

  // In production/standalone mode, the Go server serves both UI and API from the same origin.
  return window.location.origin;
})();

export const GET_WS_URL = () => {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/api/ws";
  return url.toString();
};

export const api = axios.create({
  baseURL: API_URL,
});

export const fetcher = (url: string) => api.get(url).then((res) => res.data);
