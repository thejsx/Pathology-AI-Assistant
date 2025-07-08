import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

document.body.style.margin = "0"; // Reset body margin to avoid scrollbars

ReactDOM.createRoot(document.getElementById("root")).render(<App />);