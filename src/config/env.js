const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyawk1-JpgItC-zk6iOWap8fd-FzZ0NRFuEUKiMQAYxW9RbKI_Mxfdhd8zeXp0d-8LpMg/exec";

const DEFAULT_CALENDAR_URL =
  "https://drive.google.com/file/d/1pH_GKS_rmPAIRI1viXJ1b-DGHj2AWz5a/view?usp=sharing";

function envValue(name, fallback) {
  const value = import.meta.env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export const APPS_SCRIPT_URL = envValue(
  "VITE_APPS_SCRIPT_URL",
  DEFAULT_APPS_SCRIPT_URL,
);

export const CALENDAR_URL = envValue(
  "VITE_CALENDAR_URL",
  DEFAULT_CALENDAR_URL,
);
