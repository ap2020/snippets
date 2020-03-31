import { webClient } from '../utils/slack';
import { z2h } from '../utils/utils';

const classes = [
    ['月1', '人生論第一']
].map(([a,b]) => [z2h(a),b]).map(([a,b]) => [a.charAt(0), a.charAt(1), b]);

const resList = [];
(async () => { 
    for (const [day, time, name] of classes) {
        const channelName = `1${"月火水木金".indexOf(day) + 1}-${day}${time}${name}`;
        const res = await webClient.channels.create({name: channelName});
        resList.push((res.channel as {id: string}).id);
    };

    console.log(resList.map(([a,b]) => `${a}\t${b}`).join('\n'));
})().catch(e => console.error(e));
