const { upload, init } = require('./clients/ftp');
const { v4: uuidv4 } = require('uuid');
const ncp = require("copy-paste");
const readlineSync = require('readline-sync');
const { login, promptInput, getFiles } = require('./clients/molexCloud');
const fs = require('fs').promises;
const sessionFile = "session.json";
const { exec } = require('child_process');

//! Upload
//? Uploads a file to the server and provides a link to the file
async function Upload() {
    let isPrivate = false;
    try {
        isPrivate = await askForPrivacy();
    } catch (error) {
        console.error('Error:', error);
        return;
    }

    const client = await init();
    const id = uuidv4();
    let uploadDir = `/public_html/files/${id.substring(0, 8)}`;
    const localDir = '_uploads/';

    try {
        await upload(client, localDir, uploadDir, isPrivate);
        console.log('Upload complete!');
        const share_dir_url = `https://molex.cloud/${id.substring(0, 8)}`;
        console.log('\x1b[32m%s\x1b[0m', `Direct link to upload directory:`);
        console.log(`\x1b[30m\x1b[42m\x1b[4m%s\x1b[0m`, `${share_dir_url}`);
        ncp.copy(share_dir_url, function () {
            openBrowser(share_dir_url)
        })
    } catch (error) {
        console.error('Upload failed:', error);
    }
}

//! Ask for privacy
//? Prompts the user to select if the upload should be private
async function askForPrivacy() {
    const answer = readlineSync.question('Do you want this upload to be private? (y/n): ');
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        return true;
    } else if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no' || answer === '') {
        return false;
    } else {
        throw new Error('Invalid input. Please enter y or n.');
    }
}

//! View user files
//? Fetches the user's files and displays them in a table
//? Select a file to download by index input
async function viewUserFiles() {
    try {
        let filesArray = await getFiles();
        console.log('\nUser files:');
        console.log('--------------------------------------------------------------------------------');
        console.log('| Index  | Filename                                  | Type          | Private |');
        console.log('--------------------------------------------------------------------------------');
        filesArray.userFiles.forEach((file, index) => {
            let color = file.isPrivate ? '\x1b[31m' : '\x1b[32m';
            let privateStatus = file.isPrivate ? 'Yes' : 'No';
            let filename = file.filename.length > 40 ? file.filename.slice(0, 37) + '...' : file.filename.padEnd(40);
            let fileType = file.fileType.length > 12 ? file.fileType.slice(0, 9) + '...' : file.fileType.padEnd(12);
            console.log(`| ${index + 1 < 10 ? ' ' : ''}${index + 1}     | ${filename} | ${fileType} | ${color}${privateStatus.padEnd(7)}\x1b[0m |`);
        });
        console.log('--------------------------------------------------------------------------------');

        const option = readlineSync.question('\nEnter the index to download the file in your web browser, or press Enter to go back to the menu: ');

        if (option.trim() !== '') {
            const selectedFileIndex = parseInt(option) - 1;
            if (!isNaN(selectedFileIndex) && selectedFileIndex >= 0 && selectedFileIndex < filesArray.userFiles.length) {
                const selectedFile = filesArray.userFiles[selectedFileIndex];
                const downloadLink = `https://molex.cloud/api/files/${selectedFile.id}`;

                console.log('\x1b[32m%s\x1b[0m', `Direct link to download file:`);
                console.log(`\x1b[30m\x1b[42m\x1b[4m%s\x1b[0m`, `${downloadLink}`);

                openBrowser(downloadLink);

                const goBack = readlineSync.question('\nPress Enter to go back to the menu...');
                if (goBack.trim() !== '') {
                    console.log('Invalid input. Going back to the main menu...');
                }
            } else {
                console.log('Invalid index. Please enter a valid index.');
            }
        } else {
            console.log('Going back to the main menu...');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

//! Logout
//? Clears the session file
async function logout() {
    try {
        await fs.writeFile(sessionFile, JSON.stringify({}));
        console.log('Logged out successfully.');
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

//! Main
//? Provides the main menu for the user to interact with the program
async function main() {
    try {
        await login();
        let option;
        let isLoggedIn = true;

        try {
            const sessionData = await fs.readFile(sessionFile, 'utf-8');
            const { token } = JSON.parse(sessionData);
            if (!token) {
                console.log('Token not found in session. Logging out...');
                await logout();
                isLoggedIn = false;
            }
        } catch (error) {
            console.log('Session file not found or invalid. Logging out...');
            await logout();
            isLoggedIn = false;
        }

        if (!isLoggedIn) {
            console.log('Login failed. Exiting program...');
            return; 
        }

        do {
            console.log('1. Upload a file');
            console.log('2. View user\'s files');
            console.log('3. Logout');
            console.log('4. Exit program');
            console.log(' ');
            option = readlineSync.question('Select an option: ');

            switch (option) {
                case '1':
                    await Upload();
                    break;
                case '2':
                    await viewUserFiles();
                    break;
                case '3':
                    console.log('Logging out...');
                    await logout();
                    isLoggedIn = false;
                    break;
                case '4':
                    console.log('Exiting program...');
                    break;
                default:
                    console.log('Invalid option. Please select again.');
            }
        } while (option !== '4');

    } catch (error) {
        console.error('Error:', error);
    }
}

//? Helper - Open browser
async function openBrowser(url) {
    return new Promise((resolve, reject) => {
        const child = exec(`start ${url}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error opening browser: ${error.message}`);
                reject(error);
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                reject(stderr);
            }
            console.log(`Browser opened at ${url}`);
        });

        child.on('exit', (code, signal) => {
            console.log('Browser process closed.');
            resolve();
        });
    });
}

//! Init main();
main();
