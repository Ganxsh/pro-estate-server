import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pool from "./config/database_pg.js";
import createTables from "./sql/schema.js";
import Routes from "./routes/auth.js"; 
import PropertyRoutes from "./routes/properties.js";
import InquiryRoutes from "./routes/inquiries.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

// 1. Initialize Express App
export const app = express();

// 2. Apply Middlewares
app.use(helmet());
const allowedOrigins = [
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser()); // Required to read refresh token cookies!


//Register Routes
app.use("/api/auth", Routes);

//CRUD - Property Routes
app.use("/api/properties", PropertyRoutes);

//Inquiry Routes
app.use("/api/inquiries", InquiryRoutes);


app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api-docs.json", (_req, res) => {
  res.json(swaggerSpec);
});


// 4. Port Configuration
const PORT = Number(process.env.PORT) || 5000;

// 5. Start Server & Database Initialization
async function startServer() {
  try {
    // Run database migrations/table creation
    await createTables();
    // console.log("PostgreSQL connected and tables verified successfully");

    app.listen(PORT, () => {
      // console.log(`Server running at: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    await pool.end();
    process.exit(1);
  }
}

startServer();