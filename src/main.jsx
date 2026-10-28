import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
const appElement = (
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
        <Analytics />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);

if (rootElement && rootElement.hasChildNodes()) {
  ReactDOM.hydrateRoot(rootElement, appElement);
} else if (rootElement) {
  ReactDOM.createRoot(rootElement).render(appElement);
}
