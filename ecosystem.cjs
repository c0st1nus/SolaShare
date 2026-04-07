module.exports = {
  apps: [
    {
      name: "solashare-api",
      cwd: "/home/const/solashare",
      script: "bun",
      args: "--cwd apps/api run start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
    {
      name: "solashare-web",
      cwd: "/home/const/solashare",
      script: "bun",
      args: "--cwd apps/web run start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        NEXT_PUBLIC_API_URL: "http://127.0.0.1:3000",
      },
    },
  ],
};
