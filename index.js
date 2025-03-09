// Backend: Node.js + Express + MongoDB + NLP (ML-based Search)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const natural = require("natural");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type"],
    }),
);

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

app.post("/employees/search", async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Search query required" });

    const tokenizer = new natural.WordTokenizer();
    const words = tokenizer.tokenize(query.toLowerCase());

    let filter = {};

    // Define valid filters
    const states = ["california", "texas", "new york", "florida"];
    const departments = ["it", "hr", "finance", "marketing"];
    const skills = ["react", "node.js", "python", "java", "communication"];
    const educationLevels = ["mba", "bba", "b.tech", "m.tech"];
    const badWords = ["badword1", "badword2"]; // Add inappropriate words

    // Check for bad words
    if (words.some(word => badWords.includes(word))) {
        return res.status(400).json({ error: "Please ask a valid question." });
    }

    // State Filtering
    const matchedState = states.find(state => words.includes(state));
    if (matchedState) filter.state = new RegExp(matchedState, "i");

    // City Filtering
    if (query.includes("city")) {
        const cityMatch = query.match(/city\s+([\w\s]+)/);
        if (cityMatch) filter.city = new RegExp(cityMatch[1], "i");
    }

    // Department Filtering
    const matchedDepartment = departments.find(dept => words.includes(dept));
    if (matchedDepartment) filter.department = new RegExp(matchedDepartment, "i");

    // Skill Filtering
    const matchedSkill = skills.find(skill => words.includes(skill));
    if (matchedSkill) filter.skillSet = new RegExp(matchedSkill, "i");

    // Education Filtering
    const matchedEducation = educationLevels.find(edu => words.includes(edu));
    if (matchedEducation) filter.education = new RegExp(matchedEducation, "i");

    // Salary Filtering
    const salaryMatch = query.match(/\d+/);
    if (salaryMatch) {
        const salaryValue = parseInt(salaryMatch[0]);
        if (words.includes("more") || words.includes("above")) {
            filter.salary = { $gte: salaryValue };
        } else if (words.includes("less") || words.includes("below")) {
            filter.salary = { $lte: salaryValue };
        } else {
            filter.salary = salaryValue;
        }
    }

    // Age Filtering
    const ageMatch = query.match(/\d+/);
    if (ageMatch && words.includes("age")) {
        const ageValue = parseInt(ageMatch[0]);
        if (words.includes("older") || words.includes("above")) {
            filter.age = { $gte: ageValue };
        } else if (words.includes("younger") || words.includes("below")) {
            filter.age = { $lte: ageValue };
        } else {
            filter.age = ageValue;
        }
    }

    // Fetch Employees from MongoDB
    const employees = await Employee.find(filter);

    // Handle cases where no employees match the query
    if (employees.length === 0) {
        return res.status(404).json({ error: "Please ask a valid question." });
    }

    res.json(employees);
});


app.get("/employees", async (req, res) => {
    try {
        const employees = await Employee.find();
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: "Error fetching employees" });
    }
});

mongoose
    .connect(process.env.MONGO_URI, { dbName: "Employee" })
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log("MongoDB Connection Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
    console.log(`Server running on port ${PORT}`),
);
