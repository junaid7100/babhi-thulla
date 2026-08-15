import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { GameProvider } from "./state/GameContext";
import { installErrorReporter } from "./errorReporter";
import "./index.css";

installErrorReporter();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </React.StrictMode>
);
