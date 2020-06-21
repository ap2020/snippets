import {folderIds, users, emails} from './course_folders_permission.secret';
import ora from 'ora';
import {google} from 'googleapis';
import {getGoogleClient} from '../utils/google';

import path from 'path';

(async () => {
    let sp = ora('Checking missing data... ').start();
    const missing = {folder: [], email: []};
    const queries: {folder: string, name: string, folderId: string, email: string}[] = [];
    for (const [folder, names] of users) {
        if (!folderIds.has(folder)) {
            missing.folder.push(folder)
        }
        const folderId = folderIds.get(folder);
        for (const name of names) {
            if (!emails.has(name)) {
                missing.email.push(name);
            }
            const email = emails.get(name);
            queries.push({folder, name, folderId, email});
        
        }
    }
    if (missing.email.length !== 0 || missing.folder.length !== 0) {
        sp.fail('Data missing in course_folders_permission.ts')
        console.log('missing folder:', missing.folder.join(' '));
        console.log('missing email:', missing.email.join(' '))
        return;
    }
    sp.succeed('No missing data');
    console.log(queries.map(({folder, name, folderId, email})=>[folder, name, folderId, email]).join('\n'));
    const failed = [];

    const auth = await getGoogleClient();
    const drive = google.drive({version: 'v3', auth});
    const folder = path.join(__dirname, 'syllabus_data_secret');
    sp = ora('Adding permissions... ').start();
    let i = 0;
    for (const query of queries) { // リクエスト数にもよるが，別にPromise.allでいい
        try {
            await drive.permissions.create({
                fileId: query.folderId,
                sendNotificationEmail: false,
                requestBody: {
                    role: 'writer',
                    type: 'user',
                    emailAddress: query.email,
                }
            });
            sp.text = `Adding permissions...\t${i}/${queries.length}`
        } catch (e) {
            console.error(e)
            console.error(query);
            failed.push(query);
        }
        ++i;
    };
    if (failed.length > 0) {
        sp.fail('Some requests failed:')
        console.log(failed);
    } else {
        sp.succeed('All requests succeeded!')
    }

})().catch(e => console.error(e));
