const ftp = require("basic-ftp");
const fileRecords = require('./molexCloud');
const fs = require('fs');
const mime = require('mime-types');
require('dotenv').config();
const _host = process.env.FTP_HOST;
const _username = process.env.FTP_USERNAME;
const _password = process.env.FTP_PASSWORD;

let client = null;

const createConnection = async () => {
    const newClient = new ftp.Client();
    newClient.ftp.verbose = true;
    return newClient;
};

const login = async () => {
    if (!client) {
        client = await createConnection();
        await client.access({
            host: _host,
            user: _username,
            password: _password,
            port: 21
        });
    }
};

const trackProgress = () => {
    client.trackProgress(info => {
        console.log("File", info.name);
        console.log("Type", info.type);
        console.log("Transferred", info.bytes);
        console.log("Transferred Overall", info.bytesOverall);
    });
};

const init = async () => {
    await login();
    return client;
};

const upload = async (client, localDir, remoteDir, isPrivate) => {
    trackProgress();

    await client.ensureDir(remoteDir);
    await client.uploadFromDir(localDir);

    const files = fs.readdirSync(localDir);
    for (const file of files) {
        const filePath = `${localDir}/${file}`;
        const stats = fs.statSync(filePath);
        const mimeType = mime.lookup(filePath);
        const fileSize = stats.size;
        fileRecords.createRecord(file, `${remoteDir}/${file}`, isPrivate, mimeType, fileSize);
        console.log(`Record created for ${file} at ${remoteDir}/${file} with isPrivate: ${isPrivate}, mimeType: ${mimeType}, fileSize: ${fileSize} bytes`);
    }

    try {
        fs.rmdirSync(localDir, { recursive: true });
        fs.mkdirSync(localDir);
    } catch (err) {
        console.error(err);
    }
};

module.exports = {
    upload,
    init
};
