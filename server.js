dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // ✅ fixed __path__
const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    "http://localhost:8080",
    "http://localhost:5173",
    "https://frolicking-sherbet-aee998.netlify.app" // ✅ removed trailing slash
  ],
  credentials: true,
}));

app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // ✅ fixed __path__

// Routes
app.get("/", (req, res) => {
  res.json({ message: "API is running ✅" });
});

app.use("/api/auth", authRoutes);
// ... rest of your routes

mongoose  // ✅ fixed __mongoose__
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch((err) => console.error("DB connection error:", err));