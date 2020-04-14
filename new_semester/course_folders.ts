import {google} from 'googleapis';
import {getGoogleClient} from '../utils/google';

import { promises as fs } from 'fs';
import path from 'path';
import { z2h, splitString } from '../utils/utils';
import { alias, groupEmailAddress, rootFolderId } from './course_folders.secret';

(async () => {
    const auth = await getGoogleClient();
    const drive = google.drive({version: 'v3', auth});
    const res = [];
    const folder = path.join(__dirname, 'syllabus_data_secret');
    const files = await fs.readdir(folder);
    const skipList = ''.split(' ');
    for (const file of files) {
        if (skipList.includes(file.replace('.json', ''))) {continue;}
        const fullpath = path.join(folder,file);
        const folderMimeType = 'application/vnd.google-apps.folder';
        const data = new Map(JSON.parse(await fs.readFile(fullpath, {encoding: 'utf-8'}))) as Map<string, string>;
        const yougen = z2h(data.get('曜限').split(/,\s+/g).join('').replace(/\s/g,''));
        const name = z2h(data.get('開講科目名'));
        const youSet = new Set(splitString(yougen, 2).map(s => s.charAt(0)));
        const you = '月火水木金集'.split('').filter(s => youSet.has(s)).join('');
        // create course folder
        const folderName = `${("月火水木金".indexOf(yougen.charAt(0)) + 1)||9}${/^[0-9]$/.test(yougen.charAt(1))?yougen.charAt(1):9}${you}-${alias.get(name)||name}`
        console.log(folderName);
        const courseFolderId = (await drive.files.create({
            requestBody: {
                name: folderName,
                parents: [rootFolderId],
                mimeType: folderMimeType,
            },
            fields: 'id'
        })).data.id;
        console.log('Folder Id: ', courseFolderId);
        
        // create everyone folder
        const everyoneFolderId = (await drive.files.create({
            requestBody: {
                name: '誰でも編集可',
                parents: [courseFolderId],
                mimeType: folderMimeType,
            },
            fields: 'id'
        })).data.id;
        await drive.permissions.create({
            fileId: everyoneFolderId,
            sendNotificationEmail: false,
            requestBody: {
                role: 'writer',
                type: 'group',
                emailAddress: groupEmailAddress,
            }
        });
        console.log(`${name}\t${courseFolderId}`);
    }

})().catch(e => console.error(e));
