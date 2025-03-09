const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const natural = require("natural");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"], allowedHeaders: ["Content-Type"] }));

const EmployeeSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    state: String,
    city: String,
    department: String,
    salary: Number,
    joinDate: Date,
    gender: String,
    skillSet: [String],
    age: Number,
    education: String,
});

const Employee = mongoose.model("Employee", EmployeeSchema);

// NLP-based search route
app.post("/employees/search", async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Search query is required." });

    const tokenizer = new natural.WordTokenizer();
    const stemmer = natural.PorterStemmer;
    const words = tokenizer.tokenize(query.toLowerCase()).map(word => stemmer.stem(word));

    let filter = {};

    // Define valid filters
    const states = ["california", "texas", "new york", "florida"];
    const departments = ["it", "hr", "engineering", "marketing", "sales"];
    const skills = ["react", "node.js", "python", "java", "javascript", "sql", "communication"];
    const educationLevels = ["mba", "bba", "b.tech", "m.tech", "b.sc"];
    const badWords = ["badword1", "badword2"];

    // Bad Words Filtering
    if (words.some(word => badWords.includes(word))) {
        return res.status(400).json({ error: "Please ask a valid question." });
    }

    // State Filtering
    const matchedState = states.find(state => words.includes(state));
    if (matchedState) filter.state = new RegExp(matchedState, "i");

    // City Filtering
    const cityMatch = query.match(/city\s+([\w\s]+)/i);
    if (cityMatch) filter.city = new RegExp(cityMatch[1], "i");

    // Department Filtering
    const matchedDepartment = departments.find(dept => words.includes(dept));
    if (matchedDepartment) filter.department = new RegExp(matchedDepartment, "i");

    // Skill Filtering
    const matchedSkills = skills.filter(skill => words.includes(stemmer.stem(skill)));
    if (matchedSkills.length > 0) filter.skillSet = { $in: matchedSkills };

    // Education Filtering
    const matchedEducation = educationLevels.find(edu => words.includes(edu));
    if (matchedEducation) filter.education = new RegExp(matchedEducation, "i");

    // Salary Filtering
    const salaryMatch = query.match(/\d+/);
    if (salaryMatch) {
        const salaryValue = parseInt(salaryMatch[0], 10);
        if (words.includes("more") || words.includes("above") || words.includes("higher")) {
            filter.salary = { $gte: salaryValue };
        } else if (words.includes("less") || words.includes("below") || words.includes("lower")) {
            filter.salary = { $lte: salaryValue };
        } else {
            filter.salary = salaryValue;
        }
    }

    // Age Filtering
    const ageMatch = query.match(/age\s*(\d+)/);
    if (ageMatch) {
        const ageValue = parseInt(ageMatch[1], 10);
        if (words.includes("older") || words.includes("above") || words.includes("greater")) {
            filter.age = { $gte: ageValue };
        } else if (words.includes("younger") || words.includes("below") || words.includes("less")) {
            filter.age = { $lte: ageValue };
        } else {
            filter.age = ageValue;
        }
    }

    try {
        // Fetch Employees from MongoDB
        const employees = await Employee.find(filter);

        if (employees.length === 0) {
            return res.status(404).json({ error: "No matching employees found." });
        }

        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: "Server error while fetching employees." });
    }
});

// Get all employees
app.get("/employees", async (req, res) => {
    try {
        const employees = await Employee.find();
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: "Error fetching employees" });
    }
});

// Database Connection
mongoose
    .connect(process.env.MONGO_URI, { dbName: "Employee" })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("MongoDB Connection Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
