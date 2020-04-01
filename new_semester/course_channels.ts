import { promises as fs } from 'fs';
import path from 'path';
import { webClient } from '../utils/slack';
import { z2h } from '../utils/utils';

const resList: [string, string][] = [];
(async () => {
    try {
        const folder = path.join(__dirname, 'syllabus_data_secret');
        const files = await fs.readdir(folder);
        const skipList = ''.split(' ');
        for (const file of files) {
            if (skipList.includes(file.replace('.json', ''))) {continue;}
            const fullpath = path.join(folder,file);
            const data = new Map(JSON.parse(await fs.readFile(fullpath, {encoding: 'utf-8'}))) as Map<string, string>;
            const yougen = data.get('曜限').split(/,\s+/g).join('').replace(/\s/g,'');
            const name = data.get('開講科目名');
            const channelName = `1${"月火水木金".indexOf(yougen.charAt(0)) + 1}-${yougen}${name}`;
            console.log(`${name}\t${channelName}`);
            const res = await webClient.channels.create({name: channelName});
            resList.push([file.replace('.json', ''), (res.channel as {id: string}).id]);
        };
    } catch(e) {
        
    }
    console.log(resList.map(([a,b]) => `${a}\t${b}`).join('\n'));
})().catch(e => console.error(e));
