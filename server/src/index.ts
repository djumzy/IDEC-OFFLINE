import screeningsRouter from "./routes/screenings";
import triersRouter from "./routes/triers";

// Routes
app.use("/api/screenings", screeningsRouter);
app.use("/api/triers", triersRouter); 