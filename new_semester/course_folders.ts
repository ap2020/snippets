import {google} from 'googleapis';
import {getGoogleClient} from '../utils/google';

import { promises as fs } from 'fs';
import path from 'path';
import { z2h, splitString, sleep } from '../utils/utils';
import { alias, groupEmailAddress, rootFolderId } from './course_folders_secret';

const shouldSkip = (course: Map<string, string>): boolean => {
    if (course.get('学年').includes('B2')) return true;
    const sem = course.get('開講区分');
    if ((sem.includes('S') || sem.includes('Ｓ')) && !(sem.includes('A') || sem.includes('Ａ'))) return true;
    if ((!course.get('共通科目コード').startsWith('FEN')) && course.get('他学部履修') !== '可') return true;

    return false;
}

(async () => {
    const auth = await getGoogleClient();
    const drive = google.drive({version: 'v3', auth});
    const res = [];
    const folder = path.join(__dirname, 'syllabus_data_secret');
    const files = await fs.readdir(folder);
    const skipList = ''.split(' ');

    const existingFolders = (await drive.files.list({
        q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
    })).data.files;
    const existingFolderNames = new Set(existingFolders.map(({name}) => name));

    for (const file of files) {
        try {
            if (skipList.includes(file.replace('.json', ''))) {continue;}
            const fullpath = path.join(folder,file);
            const folderMimeType = 'application/vnd.google-apps.folder';
            const data = new Map(JSON.parse(await fs.readFile(fullpath, {encoding: 'utf-8'}))) as Map<string, string>;
            if (shouldSkip(data)) {
                // console.log('skipping', data.get('開講科目名'), file)
                continue;
            }
            const yougens = splitString(data.get('曜限').split(/,\s+/g).join('').replace(/\s/g,''), 2);
            const yougenMap = new Map<string, string[]>();
            for (const yougen of yougens) {
                const you = yougen[0];
                const gen = yougen[1];
                const youData = yougenMap.get(you) || [];
                youData.push(gen);
                yougenMap.set(you, youData);
            }
            const youList = '月火水木金集'.split('')
                .filter(you => yougenMap.has(you));
            const yougenString = youList
                .map(you => `${you}${yougenMap.get(you).sort().join('')}`)
                .join('');
            const name = z2h(data.get('開講科目名'));
            // create course folder
            const folderName = `${"月火水木金集".indexOf(youList[0]) + 1}-${yougenString}${z2h(name)}`
            if (existingFolderNames.has(folderName)) {continue;}
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
            res.push([file.replace('.json', ''), courseFolderId]);
            await sleep(5000);
        } catch (e) {
            console.error('Error in', file)
            console.error(e);
        }
    }
    await fs.writeFile(path.join(__dirname, 'course_folders.secret.json'), JSON.stringify(res));

})().catch(e => console.error(e));
