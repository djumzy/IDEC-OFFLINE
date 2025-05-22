import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { indexedDBService } from "./lib/indexedDB";
import { syncService } from "./lib/syncService";

// Initialize IndexedDB for offline support
indexedDBService.initDatabase().catch(error => {
  console.error("Failed to initialize IndexedDB:", error);
});

// Create a root and render the app
const root = createRoot(document.getElementById("root")!);

// Set document title
document.title = "IDEC - Integrated Data for Early Childhood";

// Add meta description for SEO
const metaDescription = document.createElement('meta');
metaDescription.name = 'description';
metaDescription.content = 'IDEC - Data collection tool for child health monitoring with integrated screening and reporting capabilities for early childhood development.';
document.head.appendChild(metaDescription);

// Render the app
root.render(<App />);
