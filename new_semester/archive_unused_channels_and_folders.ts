import { google } from 'googleapis';
import { getGoogleClient } from '../utils/google';
import { webClient } from '../utils/slack';
import { sleep } from '../utils/utils';
import { course_channel_str, course_folder_str, drive_archive_folder } from './archive_unused_channels_secret';
import { rootFolderId } from './course_folders_secret';

type Channel = {
    id: string;
    name: string;
    is_archived: boolean;
    num_members: number;
    is_member: boolean;
}

const channel2Course = new Map(
    course_channel_str
        .split('\n')
        .map(line => line.split('\t'))
        .map(([course, channel]) => ([channel, course]))
);

const course2Folder = new Map(
    course_folder_str
        .split('\n')
        .map(line => line.split('\t') as [string, string]) 
);

const resList: [string, string][] = [];
(async () => {
    try {
        const auth = await getGoogleClient();
        const drive = google.drive({version: 'v3', auth});
        for await (const page of webClient.paginate('conversations.list', {exclude_archived: true, types: 'public_channel'})) {
            for (const channel of page.channels as Channel[]) {
                if (!channel.name.startsWith('1')) continue;
                if (
                    (channel.is_member && channel.num_members === 1) ||
                    (!channel.is_member && channel.num_members === 0)
                ) {
                    if (!channel.is_member) {
                        await webClient.conversations.join({channel: channel.id});
                    }
                    await webClient.conversations.archive({channel: channel.id});
                    const folderId = course2Folder.get(channel2Course.get(channel.id));
                    if (!folderId) {
                        console.error('no folder found', channel);
                    }
                    await drive.files.update({
                        fileId: folderId,
                        removeParents: rootFolderId,
                        addParents: drive_archive_folder,
                    });
                }
                await sleep(5000);
            }
        }
    } catch(e) {
        console.error(e);
    }
    console.log(resList.map(([a,b]) => `${a}\t${b}`).join('\n'));
})().catch(e => console.error(e));
