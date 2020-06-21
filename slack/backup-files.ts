/**
 * This script is a temporary script to backup files uploaded to Slack.
 * This should move to ap2020bot soon.
 */ 

import axios from 'axios';
import type {Readable} from 'stream';
import {webClient} from '../utils/slack';
import fs from 'fs';
import {google} from 'googleapis';
import {getGoogleClient} from '../utils/google';
import {driveFolderId} from './backup-files.secret';

type File = {
    name: string;
    mimetype: string;
    url_private_download: string;
};

const main = async () => {
    const auth = await getGoogleClient();
    const drive = google.drive({version: 'v3', auth});
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
    const driveFile = await drive.files.create({
        requestBody: {
            name: file.name,
            mimeType: file.mimetype,
            parents: [driveFolderId],
        },
        media: {
            mimeType: file.mimetype,
            body: fileStream,
        },
    });
    console.log('done!');
};

main().catch(console.error);
