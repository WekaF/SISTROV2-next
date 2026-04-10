import axios from "axios";

/**
 * Basic API client configured to talk to the .NET backend.
 * In a real-world scenario, the base URL should be environment-specific.
 */
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api", // Adjust according to .NET backend port
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
