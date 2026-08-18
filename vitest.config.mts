import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      include: [
        "src/lib/auth/access.ts",
        "src/lib/auth/password.ts",
        "src/lib/auth/session-token.ts",
        "src/lib/auth/validation.ts",
        "src/lib/content/page-content.ts",
        "src/lib/http/request-body.ts",
        "src/lib/import/accounts.ts",
        "src/lib/db/schema.ts",
        "src/lib/db/users.ts",
        "src/lib/db/pages.ts",
        "src/lib/db/comments.ts",
        "src/lib/db/admin.ts",
        "src/lib/graph/knowledge-graph.ts",
        "src/lib/graph/force-simulation.ts",
        "src/lib/graph/graph-camera.ts",
        "src/components/knowledge-graph.tsx",
        "src/components/comments-section.tsx",
      ],
    },
  },
});
