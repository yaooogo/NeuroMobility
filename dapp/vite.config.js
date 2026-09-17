import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const isProdBuild = mode === "prod";
  // const keyPath = path.resolve(__dirname, "cert/localhost.key");
  // const certPath = path.resolve(__dirname, "cert/localhost.crt");
  // const hasHttpsCert = fs.existsSync(keyPath) && fs.existsSync(certPath);

  return {
    plugins: [vue()],
    build: {
      assetsDir: "_assets"
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler"
        },
        sass: {
          api: "modern-compiler"
        }
      }
    },
    esbuild: {
      drop: isProdBuild ? ["console"] : []
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@api": path.resolve(__dirname, "src/api"),
        "@assets": path.resolve(__dirname, "src/assets"),
        "@images": path.resolve(__dirname, "src/assets/images"),
        "@components": path.resolve(__dirname, "src/components"),
        "@composables": path.resolve(__dirname, "src/composables"),
        "@fonts": path.resolve(__dirname, "src/fonts"),
        "@i18n": path.resolve(__dirname, "src/i18n"),
        "@lib": path.resolve(__dirname, "src/lib"),
        "@pages": path.resolve(__dirname, "src/pages"),
        "@plugins": path.resolve(__dirname, "src/plugins"),
        "@router": path.resolve(__dirname, "src/router"),
        "@stores": path.resolve(__dirname, "src/stores")
      }
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      // https: hasHttpsCert
      //   ? {
      //       key: fs.readFileSync(keyPath),
      //       cert: fs.readFileSync(certPath)
      //     }
      //   : undefined
    }
  };
});
