import {promises as fs} from 'fs';
import path from 'path';

const text = `Paste CSV here`

const data = text.split('\n').map(
    line => line.split('\t')
).map(
    ([gakubu, gakka, courseName, suri, system, bukko]) => ({
        gakubu, gakka, courseName, suri, system, bukko
    })
);

fs.writeFile(path.join(__dirname, 'courses.secret.json'), JSON.stringify(data));
