export default {
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  clean: true,
  sourcemap: true,
  minify: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
};
