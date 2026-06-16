import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "virtual:theme.css"; // color tokens generated from src/content/theme.toml
import "./app.css";
import "./data.js";
import "./i18n.js";
import "./articleBody.js";
import App from "./app.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
