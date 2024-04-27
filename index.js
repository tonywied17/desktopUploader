const { upload, init } = require('./clients/ftp');
const { v4: uuidv4 } = require('uuid');
const ncp = require("copy-paste");
const readline = require('readline');
const { login } = require('./clients/molexCloud');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function Upload() {
    let isPrivate = false;
    try {
        isPrivate = await askForPrivacy();
    } catch (error) {
        console.error('Error:', error);
        rl.close();
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
        ncp.copy(share_dir_url, () => {
            console.log('Link copied to clipboard!');
            rl.close();
        });
    } catch (error) {
        console.error('Upload failed:', error);
        rl.close();
    }
}

async function askForPrivacy() {
    return new Promise((resolve, reject) => {
        rl.question('Do you want this upload to be private? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'){
                resolve(true);
            } else if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no' || answer === ''){
                resolve(false);
            } else {
                reject('Invalid input. Please enter y or n.');
            }
        });
    });
}

async function main() {
    try {
        await login();
        await Upload();
    } catch (error) {
        console.error('Login failed:', error);
    } finally {
        rl.close(); 
    }
}

main();
