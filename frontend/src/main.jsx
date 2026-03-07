import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ActivePairProvider, useActivePair } from "./context/ActivePairContext.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./index.css";

function ActivePairBootstrap({ children }) {
  const { loading } = useActivePair();

  // Temporary root fallback while active pair state boots.
  if (loading) return <div aria-busy="true" />;

  return children;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ActivePairProvider>
          <ActivePairBootstrap>
            <App />
          </ActivePairBootstrap>
        </ActivePairProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
