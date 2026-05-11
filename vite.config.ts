import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function normalizeBasePath(basePath: string) {
  if (!basePath || basePath === "/") {
    return "/";
  }

  const trimmedBasePath = basePath.replace(/^\/+|\/+$/g, "");
  return `/${trimmedBasePath}/`;
}

export default defineConfig({
  base: normalizeBasePath(process.env.VITE_BASE_PATH ?? "/"),
  plugins: [react()],
});
