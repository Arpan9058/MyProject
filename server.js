require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const Register = require("./RegisterSchema"); // Assuming RegisterSchema is your user schema
const ats = require('./ats'); // Require the ATS module
const marked = require('marked');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const { executeCode } = require('./codeExecutor');
// const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000; // Use .env or default

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/prepto")
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log("Error connecting to MongoDB", err));

// Session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // In production, make sure this is true (for HTTPS)
}));

// View engine setup
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

// Register route (for new users)
app.post("/save", async (req, res) => {
    const { fullName, email, mobile, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        return res.send("Passwords do not match!");
    }
    try {
        const existingUser = await Register.findOne({ email });
        if (existingUser) {
            return res.send("User with this email already exists!");
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new Register({
            fullName,
            email,
            mobile,
            password: hashedPassword,
        });
        await newUser.save();
        res.send("Registration successful! You can now log in.");
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).send("Server error!");
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await Register.findOne({ email });

        if (!user) {
            return res.status(401).send('Incorrect email or password.');
        }

        // Compare the entered password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).send('Incorrect email or password.');
        }

        // If password matches, store user data in session and redirect to dashboard
        req.session.user = user;
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Server error!');
    }
});

// Dashboard route (protected)
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Error during logout');
        }
        res.redirect('/');
    });
});

// ATS Resume Analysis Route (Protected)
app.post('/analyze', ensureAuthenticated, ats.upload.single('resume'), async (req, res) => {
    try {
        const resumeFile = req.file;
        const jobDescriptionText = req.body.jobDescription;

        if (!resumeFile || !jobDescriptionText) {
            return res.status(400).send('Please upload a resume and enter a job description.');
        }

        const resumeText = await ats.extractTextFromFile(resumeFile);
        const analysisResult = await ats.analyzeWithGemini(resumeText, jobDescriptionText);

        const htmlResult = marked.parse(analysisResult);
        const sanitizedHtml = sanitizeHtml(htmlResult, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'p']),
            allowedAttributes: {},
        });

        res.render('ATSResult', { analysis: sanitizedHtml });
    } catch (error) {
        console.error("Error during analysis:", error);
        res.status(500).send(`An error occurred: ${error.message}`);
    }
});

app.get('/analyze', ensureAuthenticated, (req, res) => {
    res.render('ATS_JDandResume'); // Or wherever your ATS input form is
});

// In your app.js

app.get('/mock-interviews', ensureAuthenticated, (req, res) => {
    res.render('mockInterviews'); // Render the mockInterviews.ejs file
});

app.get('/technical-round-1', ensureAuthenticated, (req, res) => {
    res.redirect('https://technicalround1-2.onrender.com');
});

app.get('/technical-round-2', ensureAuthenticated, (req, res) => {
    res.redirect('https://coding-test-cr0y.onrender.com');
});

app.get('/hrround', ensureAuthenticated, (req,res)=>{
    res.redirect("https://hrround.onrender.com")
});



app.get('/mocktest', ensureAuthenticated, (req,res)=>{
    res.redirect("https://mocktest-three.vercel.app/")
});






// Authentication Middleware
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/login');
    }
}



// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});