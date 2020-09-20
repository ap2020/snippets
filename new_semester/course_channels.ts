import { promises as fs } from 'fs';
import path from 'path';
import { webClient } from '../utils/slack';
import { sleep, splitString, z2h } from '../utils/utils';

const shouldSkip = (course: Map<string, string>): boolean => {
    if (course.get('学年').includes('B2')) return true;
    const sem = course.get('開講区分');
    if ((sem.includes('S') || sem.includes('Ｓ')) && !(sem.includes('A') || sem.includes('Ａ'))) return true;
    if ((!course.get('共通科目コード').startsWith('FEN')) && course.get('他学部履修') !== '可') return true;

    return false;
}

const sanitizeChannelName = (name: string): string =>
    name
        .replace(/[(（)）・]/g, '-')

const resList: [string, string, string][] = [];
(async () => {
    try {
        const folder = path.join(__dirname, 'syllabus_data_secret');
        const files = await fs.readdir(folder);
        const skipList = ''.split(' ');
        for (const file of files) {
            try {
                if (skipList.includes(file.replace('.json', ''))) {continue;}
                const fullpath = path.join(folder,file);
                const data = new Map(JSON.parse(await fs.readFile(fullpath, {encoding: 'utf-8'}))) as Map<string, string>;
                if (shouldSkip(data)) {
                    console.log('skipping', data.get('開講科目名'), file)
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
                const name = data.get('開講科目名');
                const channelName = `1${"月火水木金集".indexOf(youList[0]) + 1}-${yougenString}${sanitizeChannelName(z2h(name))}`.toLowerCase();
                console.log(`${name}\t${channelName}`);
                try {
                    const res = await webClient.conversations.create({name: channelName});
                    resList.push([file.replace('.json', ''), (res.channel as {id: string}).id, channelName]);
                    await sleep(5000);
                } catch (e) {
                    if (e.data.error === 'name_taken') {
                        console.log('name taken', channelName);
                    } else {
                        throw e;
                    }
                }
            } catch (e) {
                console.error(`${file}: error`);
                console.error(e);
            }
        };
    } catch(e) {
        console.error(e);
    }
    console.log(resList.map(([a,b,c]) => `${a}\t${b}\t${c}`).join('\n'));
    await fs.writeFile(path.join(__dirname, 'course_channels_result.secret.json'), JSON.stringify(resList));

})().catch(e => console.error(e));
