import React from "react";
import { createRoot } from "react-dom/client";

import EditorRoot from "./EditorRoot.jsx";

document.title = "Content Editor | popyson.io";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EditorRoot />
  </React.StrictMode>,
);
