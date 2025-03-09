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

const insertDummyData = async () => {
    try {
        const count = await Employee.countDocuments();
        if (count === 0) {
            await Employee.insertMany([
                {
                    name: "John Doe",
                    email: "john@example.com",
                    phone: "9876543210",
                    state: "California",
                    city: "Los Angeles",
                    department: "IT",
                    salary: 50000,
                    joinDate: new Date("2020-01-01"),
                    gender: "Male",
                    skillSet: ["React", "Node.js"],
                    age: 30,
                    education: "MBA",
                },
                {
                    name: "Jane Smith",
                    email: "jane@example.com",
                    phone: "9123456789",
                    state: "Texas",
                    city: "Houston",
                    department: "HR",
                    salary: 40000,
                    joinDate: new Date("2019-06-15"),
                    gender: "Female",
                    skillSet: ["Communication", "Recruitment"],
                    age: 28,
                    education: "BBA",
                },
            ]);
            console.log("Sample employee data inserted!");
        }
    } catch (err) {
        console.error("Error inserting dummy data:", err);
    }
};

// Run this function after DB connection
mongoose.connection.once("open", insertDummyData);

mongoose
    .connect(process.env.MONGO_URI, { dbName: "Employee" }) // Add your actual database name
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log("MongoDB Connection Error:", err));

// mongoose
//     .connect(process.env.MONGO_URI, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//     })
//     .then(() => console.log("MongoDB Connected"))
//     .catch((err) => console.log(err));

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
