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

    console.log("\x1b[94m%s\x1b[0m", `\n[ 𝚖𝚘𝚕𝚎𝚡.𝚌𝚕𝚘𝚞𝚍 ]`);

    try {
        try {
            const fileData = await fs.readFile(sessionFile, "utf-8");
            sessionData = JSON.parse(fileData);
            const decodedToken = jwt.decode(sessionData.token);

            if (sessionData.token && sessionData.userId) {
                console.log(`\nWelcome back, \x1b[92m${decodedToken.username}\x1b[0m!\n----------------------\n`);

                return;
            }

        } catch (error) {
            console.log("Session file not found.");
            await fs.writeFile(sessionFile, JSON.stringify({}));
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
// ? A file record is created in the backend to store the file details.
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

//! Get User's Files
// ? Fetches the files of the user from the backend
 async function getFiles() {
    try {
        const sessionData = await fs.readFile('session.json', 'utf-8');
        const { token, userId } = JSON.parse(sessionData);

        const response = await api.get(`/files`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        let _files = {};

        _files.userFiles = response.data.userFiles;
        _files.userFileTypeCounts = response.data.userFileTypeCounts;
        _files.publicFiles = response.data.publicFiles;
        _files.publicFileTypeCounts = response.data.publicFileTypeCounts;
        _files.privateFiles = response.data.privateFiles;
        _files.privateFileTypeCounts = response.data.privateFileTypeCounts;


        return _files;

    } catch (err) {
        console.error(err);
    }
};

// ! prompt user input
async function promptInput(prompt) {
    return readlineSync.question(prompt);
}

// ? helper - get user details from the session file
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
    getFiles,
    promptInput
};
