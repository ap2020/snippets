/**
 * This script is a temporary script to backup files uploaded to Slack.
 * This should move to ap2020bot soon.
 */ 

import axios from 'axios';
import type {Readable} from 'stream';
import {webClient} from '../utils/slack';
import fs from 'fs';

const main = async () => {
    const {files}: {files: {url_private_download: string, name: string}[]} = await webClient.files.list({
        count: 1,
    }) as any;
    const file = files[0];
    console.log(file.url_private_download);
    const res: Readable = (await axios.get(
        file.url_private_download,
        {
            headers: {
                'Authorization': `Bearer ${process.env.SLACK_TOKEN_BOT}`
            },
            responseType: 'stream',
        }
    )).data;
    const local_file = fs.createWriteStream(file.name);
    res.pipe(local_file);
    
};

main().catch(console.error);
