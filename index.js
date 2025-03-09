// Backend: Node.js + Express + MongoDB + NLP (ML-based Search)
// Frontend: React.js
// Database: MongoDB Atlas

// 1. Install dependencies
// Run in terminal: npm install express mongoose cors dotenv natural axios react react-dom

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

const insertDummyData = async () => {
    try {
        const count = await Employee.countDocuments();
        if (count === 0) {
            const employees = Array.from({ length: 50 }, (_, i) => ({
                name: `Employee ${i + 1}`,
                email: `employee${i + 1}@company.com`,
                phone: `98765432${(i % 10) + 1}`,
                state: ['California', 'Texas', 'New York', 'Florida'][i % 4],
                city: ['Los Angeles', 'Houston', 'New York City', 'Miami'][i % 4],
                department: ['Engineering', 'HR', 'Marketing', 'Sales'][i % 4],
                salary: Math.floor(Math.random() * 50000) + 50000,
                joinDate: new Date(2020 + (i % 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
                gender: i % 2 === 0 ? 'Male' : 'Female',
                skillSet: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL'].slice(0, (i % 5) + 1),
                age: Math.floor(Math.random() * 20) + 22,
                education: ['B.Tech', 'M.Tech', 'MBA', 'B.Sc'][i % 4]
            }));
            await Employee.insertMany(employees);
            console.log("50 Sample Employee Data Inserted!");
        }
    } catch (err) {
        console.error("Error inserting dummy data:", err);
    }
};

// Run this function after DB connection
mongoose.connection.once("open", insertDummyData);

mongoose
    .connect(process.env.MONGO_URI, { dbName: "Employee" })
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log("MongoDB Connection Error:", err));

// NLP-based Search Functionality
app.post("/employees/search", async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Search query required" });

    const tokenizer = new natural.WordTokenizer();
    const words = tokenizer.tokenize(query.toLowerCase());

    let filter = {};

    if (words.includes("mba")) {
        filter.education = "MBA";
    }
    if (words.includes("salary")) {
        const salaryMatch = query.match(/\d+/);
        if (salaryMatch) {
            const salaryValue = parseInt(salaryMatch[0]);
            if (
                words.includes("more") ||
                words.includes("above") ||
                words.includes("greater")
            ) {
                filter.salary = { $gte: salaryValue };
            } else if (
                words.includes("less") ||
                words.includes("below") ||
                words.includes("lower")
            ) {
                filter.salary = { $lte: salaryValue };
            } else {
                filter.salary = salaryValue;
            }
        }
    }
    if (words.includes("age")) {
        const ageMatch = query.match(/\d+/);
        if (ageMatch) {
            const ageValue = parseInt(ageMatch[0]);
            if (
                words.includes("more") ||
                words.includes("above") ||
                words.includes("older")
            ) {
                filter.age = { $gte: ageValue };
            } else if (
                words.includes("less") ||
                words.includes("below") ||
                words.includes("younger")
            ) {
                filter.age = { $lte: ageValue };
            } else {
                filter.age = ageValue;
            }
        }
    }
    if (words.includes("joined") || words.includes("before")) {
        const date = new Date();
        if (words.includes("year") || words.includes("years")) {
            const yearsMatch = query.match(/\d+/);
            if (yearsMatch) {
                const yearsAgo = parseInt(yearsMatch[0]);
                date.setFullYear(date.getFullYear() - yearsAgo);
                filter.joinDate = { $lt: date };
            }
        }
    }

    const employees = await Employee.find(filter);
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
    console.log(`Server running on port ${PORT}`),
);
