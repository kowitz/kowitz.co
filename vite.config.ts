import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { inkWebPlugin } from "ink-web/vite";

export default defineConfig({
  plugins: [react(), inkWebPlugin()],
});
