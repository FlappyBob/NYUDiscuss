import "./config.mjs";
import "./db.mjs";
import express from "express";
import router from "./routes/userRoutes.mjs";
import logger from "morgan";
import cookieParser from "cookie-parser";
// const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();

// logger
app.use(logger("dev"));

app.set("view engine", "hbs");

// use session middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// routes
app.use("/", router);

app.listen(process.env.PORT ?? 3000);
