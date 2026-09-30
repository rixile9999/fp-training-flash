import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { loadApiFactory } from "./api/client.ts";
import { browserStore } from "./storage.ts";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing");

const mount = root;
void loadApiFactory(import.meta.env).then((apiFactory) => {
  createRoot(mount).render(
    <StrictMode>
      <App apiFactory={apiFactory} store={browserStore()} now={() => Date.now()} />
    </StrictMode>,
  );
});
