const axios = require("axios");
const jwt = require('jsonwebtoken');
const readlineSync = require("readline-sync");
const fs = require('fs').promises;
require("dotenv").config();
const sessionFile = "session.json";
const Bearer = process.env.JWT_SECRET;

const api = axios.create({
    baseURL: "https://molex.cloud/api",
    headers: {
        Authorization: `Bearer ${Bearer}`,
    },
});

//! Login function to authenticate the user
// ? Stores the token and userId in a session file
async function login() {
    try {
        let sessionData = {};
        try {
            const fileData = await fs.readFile(sessionFile, "utf-8");
            sessionData = JSON.parse(fileData);
        } catch (error) {
            console.log("Session file not found.");
            await fs.writeFile(sessionFile, JSON.stringify({}));
        }

        if (sessionData.token && sessionData.userId) {
            console.log("You are already logged in.");
            return;
        }

        const username = await promptInput("Enter your username: ");
        const password = await promptInput("Enter your password: ", true);

        const response = await api.post("/auth/login", {
            username,
            password,
        });

        const { token, userId } = response.data;

        if (!token || !userId) {
            console.log("Login failed.");
            return;
        }

        console.log("Login successful!");
        console.log("Token:", token);
        console.log("User ID:", userId);

        await fs.writeFile(sessionFile, JSON.stringify({ token, userId }));
    } catch (error) {
        console.error(
            "Login failed:",
            error.response ? error.response.data.error : error.message
        );
    }
}

//! Create a file record in the database.
const createRecord = async (filename, path, isPrivate, fileType, fileSize) => {
    try {
        const sessionData = await fs.readFile('session.json', 'utf-8');
        const { token, userId } = JSON.parse(sessionData);

        const decodedToken = jwt.decode(token);

        const author = decodedToken.username;
        const userIdFromToken = decodedToken.userId;

        if (userIdFromToken !== userId) {
            console.error('User ID mismatch');
            return;
        }
        
        const response = await api.post("/files/record", {
            filename: filename,
            path: path,
            isPrivate: isPrivate,
            fileType: fileType,
            fileSize: fileSize,
            author: author,
            downloads: 0,
            userId: Number(userId),
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log(response.data);
    } catch (err) {
        console.error(err);
    }
};

//? Helper function to prompt user input
async function promptInput(prompt, isPassword = false) {
    if (isPassword) {
        return readlineSync.question(prompt, {
            hideEchoBack: true,
            mask: "",
        });
    } else {
        return readlineSync.question(prompt);
    }
}

// ? Function to get user details from the session file
async function getUserDetails() {
    const sessionData = await fs.readFile('session.json', 'utf-8');
    const { token, userId } = JSON.parse(sessionData);

    const decodedToken = jwt.decode(token);
    const username = decodedToken.username;
    const author = username;
    const userIdFromToken = decodedToken.userId;

    if (userIdFromToken !== userId) {
        console.error('User ID mismatch');
        return;
    }

    return { author, userId };
}

module.exports = {
    createRecord,
    login,
    getUserDetails,
};
