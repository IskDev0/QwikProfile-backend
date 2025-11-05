import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import authIndex from "./routes/auth";

const app = new Hono();
app.use(logger());

app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL!,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

app.route("/auth", authIndex);

export default {
  fetch: app.fetch,
  port: process.env.PORT! || 8000,
};
