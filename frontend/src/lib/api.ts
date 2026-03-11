import axios from "axios";

export const API_URL = (() => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

  // Check for window to support SSR
  if (typeof window === "undefined") {
    console.error("can not use api.ts in SSR!");
    return "http://localhost:20000"; // Fallback for SSR
  }

  // In development, Next.js runs on 3000, while Go API runs on 20000.
  // We use the same hostname as the UI to support both localhost and IP-based access.
  if (window.location.port === "3000") {
    return `http://${window.location.hostname}:20000`;
  }

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
