import { promises as fs } from 'fs';
import path from 'path';
import { webClient } from '../utils/slack';
import { sleep } from '../utils/utils';

const resList: [string, string][] = [];
(async () => {
    try {
        for await (const page of webClient.paginate('conversations.list', {types: 'public_channel'})) {
            for (const channel of page.channels as {id: string; name: string; is_archived: boolean}[]) {
                if (channel.is_archived || !channel.name.startsWith('1')) continue;
                await webClient.conversations.join({channel: channel.id});
                await webClient.conversations.archive({channel: channel.id});
                await sleep(5000);
            }
        }
    } catch(e) {
        console.error(e);
    }
    console.log(resList.map(([a,b]) => `${a}\t${b}`).join('\n'));
})().catch(e => console.error(e));
