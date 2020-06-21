/**
 * This script is a temporary script to backup files uploaded to Slack.
 * This should move to ap2020bot soon.
 */ 

import axios from 'axios';
import type {Readable} from 'stream';
import {promises as fs} from 'fs';
import path from 'path';
import ora from 'ora'
import {webClient} from '../utils/slack';
import {google} from 'googleapis';
import {getGoogleClient} from '../utils/google';
import {driveFolderId} from './backup-files.secret';

type File = {
    id: string;
    name: string;
    mimetype: string;
    url_private_download: string;
};

const objToMap = <T>(obj: {[key: string]: T}): Map<string, T> => new Map(Object.entries(obj));
const mapToObj = <T>(map: Map<string, T>): {[key: string]: T} => Object.fromEntries(map.entries());

const resPath = path.join(__dirname, 'backup-files-res.secret.json');

const main = async () => {
    const auth = await getGoogleClient();
    const drive = google.drive({version: 'v3', auth});
    const fileIdMap = objToMap(JSON.parse(await fs.readFile(resPath, {encoding: 'utf-8'})));
    
    const {files}: {files: File[]} = await webClient.files.list({
        count: 1,
    }) as any;
    const file = files[0];
    console.log(file.url_private_download);
    const fileStream: Readable = (await axios.get(
        file.url_private_download,
        {
            headers: {
                'Authorization': `Bearer ${process.env.SLACK_TOKEN_BOT}`
            },
            responseType: 'stream',
        }
    )).data;
    const driveFile = (await drive.files.create({
        requestBody: {
            name: file.name,
            mimeType: file.mimetype,
            parents: [driveFolderId],
        },
        media: {
            mimeType: file.mimetype,
            body: fileStream,
        },
    })).data;
    fileIdMap.set(file.id, driveFile.id);

    await fs.writeFile(resPath, JSON.stringify(mapToObj(fileIdMap), undefined, 2));
    console.log('done!');
};

main().catch(console.error);
