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
            const fullpath = path.join(folder,file);
            const data = new Map(JSON.parse(await fs.readFile(fullpath, {encoding: 'utf-8'}))) as Map<string, string>;
            if (shouldSkip(data)) {continue;}
            console.log([data.get('時間割コード'), data.get('共通科目コード'), data.get('開講科目名'), data.get('曜限'), data.get('学年')].join('\t'))
        }
    } catch(e) {
        console.error(e);
    }
    console.log(resList.map(([a,b,c]) => `${a}\t${b}\t${c}`).join('\n'));
    await fs.writeFile(path.join(__dirname, 'course_channels_result.secret.json'), resList);

})().catch(e => console.error(e));
