/**
 * This script is a temporary script to backup files uploaded to Slack using Slack export.
 * This should move to ap2020bot soon.
 */ 

import axios from 'axios';
import type {Readable} from 'stream';
import {promises as fs} from 'fs';
import path from 'path';
import ora from 'ora'
import {webClient} from '../utils/slack';
import {drive_v3, google} from 'googleapis';
import {getGoogleClient} from '../utils/google';
import {driveFolderId} from './backup-files.secret';
import type { WebAPICallResult } from '@slack/web-api';

type File = {
    id: string;
    name: string;
    mimetype: string;
    url_private_download?: string; // some don't have (ex. Google Drive file previews)
};

type Paging = {
    count: number,
    total: number,
    page: number,
    pages: number,
}

const objToMap = <T>(obj: {[key: string]: T}): Map<string, T> => new Map(Object.entries(obj));
const mapToObj = <T>(map: Map<string, T>): {[key: string]: T} => Object.fromEntries(map.entries());

const resPath = path.join(__dirname, 'backup-files-res.secret.json');
const fileListPath = path.join(__dirname, 'files.secret.json');

const downupload = async (file: File, drive: drive_v3.Drive) => {
    const fileStream: Readable = (await axios.get(
        file.url_private_download,
        {
            headers: {
                'Authorization': `Bearer ${process.env.SLACK_TOKEN_BOT}`
            },
            responseType: 'stream',
        }
    )).data;
    return (await drive.files.create({
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
}

const main = async () => {
    const auth = await getGoogleClient();
    const drive = google.drive({version: 'v3', auth});
    const fileIdMap = objToMap(JSON.parse(await fs.readFile(resPath, {encoding: 'utf-8'})));
    const files: File[] = JSON.parse(await fs.readFile(fileListPath, {encoding: 'utf-8'}));
    // let spinner = ora('Fetching file list ...').start();
    // let res = await webClient.files.list({
    //     count: 100,
    // }) as WebAPICallResult & {files: File[], paging: Paging};
    // spinner.succeed(`Fetched ${res.files.length} file metadatas (${res.paging.page}/${res.paging.pages})`);
    // while (true) {
        let i = 0;
        let spinner = ora(`Uploading ${i}/${/*res.*/files.length} files ...`).start();
        for (const file of files/*res.files*/) {
            spinner.text = `Uploading ${i}/${files.length/*res.files.length*/} files: ${file.name} ...`;
            if (fileIdMap.has(file.id)) {
                // already uploaded
                ++i;
                continue;
            } 
            if (!file.url_private_download) {
                // cannot download
                // ex. Google Drive file previews
                ++i;
                continue;
            }
            try {
                const driveFile = await downupload(file, drive);
                fileIdMap.set(file.id, driveFile.id);
                await fs.writeFile(resPath, JSON.stringify(mapToObj(fileIdMap), undefined, 2));
                ++i;
            } catch (e) {
                console.error('error in ', file.id);
                console.error(e);
            }
        }
    //     spinner.succeed(`Uploaded ${i} files`);
    //     if (res.paging.page === res.paging.pages) {
    //         break;
    //     }
    //     spinner = ora('Fetching file list ...').start();
    //     res = await webClient.files.list({
    //         count: 100,
    //         page: res.paging.page + 1,
    //     }) as any;
    //     spinner.succeed(`Fetched ${res.files.length} file metadatas (${res.paging.page}/${res.paging.pages})`);
    // }
    await fs.writeFile(resPath, JSON.stringify(mapToObj(fileIdMap), undefined, 2));
    console.log('done!');
};

main().catch(console.error);
