import { promises as fs } from 'fs';
import { stripIndents } from 'common-tags';
import path from 'path';
import {courses} from './scrape_syllabus.secret';

(async () => {
    const manualMap = new Map(courses.map(item => [item.courseName, item]));
    const res: [string, string][] = [];
    try {
        const folder = path.join(__dirname, 'syllabus_data_secret');
        const files = await fs.readdir(folder);
        const skipList = ''.split(' ');
        for (const file of files) {
            const basename = file.replace('.json', '');
            const manualdata = manualMap.get(basename);
            if (skipList.includes(basename)) {continue;}
            
            const fullpath = path.join(folder,file);
            const m = new Map(JSON.parse(await fs.readFile(fullpath, {encoding: 'utf-8'}))) as Map<string, string>;

            // 工学部用
            res.push([m.get("開講科目名"), stripIndents`
            #授業 #3S ${[0,2].map(x => (m.get('開講区分')||'').slice(x,x+2)).filter(s=>s).map(s=>`#3${s}`).join(' ')} ${m.get("曜限").split(/,\s+/g).map(s=> `#${s.trim()}`).join(' ')}
            #計数数理${manualdata.suri||'?'} #計数システム${manualdata.system||'?'} #物工${manualdata.bukko||'?'}
            
            教員: [${m.get("主担当教員").replace(/\s/g,'')}]
            教室: ${m.get("教室")}
            
            [*** 概要]
            ${m.get('講義の目的')||''}
            ${m.get('理解すべき事項')?`
            [** 理解すべき事項]
            ${m.get('理解すべき事項')}`:''}
            
            [*** 講義ページ]
            ${
            [
                ["オンライン授業ページ", m.get("オンライン授業URL")],
                ...['講義ノートのリンク先','教員のリンク先','その他のリンク先'].map(k => [k,m.get(k)]),
                ["授業カタログ", m.get("シラバスURL")]
            ].filter(([k,s])=>s).map(([k,s])=>` [${k} ${s}]`).join('\n')
            }
            
            [*** 評価方法]
             ${m.get('成績評価方法')||''}
            
            [*** 授業予定・休講情報]
            ${m.get('講義項目')||''}
            
            [*** 教科書・参考書]
            ${['テキスト', '演習書'].filter(k => m.get(`参考書(${k})`)).map(k => ` ${k}
            ${m.get(`参考書(${k})`).split('\n').map(l => `  ${l}`).join('\n')}`).join('\n')}
            
            [*** 参考になる資料]
            
            [*** 試験対策]
            
            [*** フリースペース]
            `])
        };
    } catch(e) {
        console.error(e);
    }
    await fs.writeFile(path.join(__dirname, 'course_scrapbox.res.secret.json'), JSON.stringify(res));
 })().catch(e => console.error(e));


/*
Execute code below in a browser logged in.
You need to allow pop-ups.

l= // paste content of course_scrapbox.res.secret.json
for(const [title, body] of l) {
window.open(`https://scrapbox.io/pizzacat83/${title}?body=${encodeURIComponent(body)}`)
await new Promise(res=>setTimeout(res, 5*1000));
}
*/