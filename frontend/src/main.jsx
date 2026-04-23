// main.jsx — Application entry point
// Mounts the React app into the #root div defined in index.html

import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import "./index.css"; // Global Tailwind styles

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Toast notification system — positioned top-right with custom style */}
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 5000,
        style: {
          background: "#1a1a2e",
          color: "#fff",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "12px",
          fontFamily: "Inter, sans-serif",
          fontSize: "14px",
        },
        success: {
          iconTheme: { primary: "#10b981", secondary: "#fff" },
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#fff" },
        },
      }}
    />
    <App />
  </React.StrictMode>
);
