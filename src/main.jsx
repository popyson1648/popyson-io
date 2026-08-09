import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "virtual:theme.css"; // color tokens generated from src/content/theme.toml
import "./app.css";
import "./data.js";
import "./i18n.js";
import App from "./app.jsx";

// Keep prerendered Blog/article HTML visible while its lazy route chunk loads on
// a direct visit. Other entry routes avoid downloading that chunk altogether.
if (/^\/(?:en\/)?blog(?:\/|$)/.test(window.location.pathname)) {
  await import("./blogRoute.jsx").catch(() => {});
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
