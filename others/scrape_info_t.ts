// 学生向けポータルサイトのスクレイピング方法

import axios, {AxiosRequestConfig} from 'axios';
import iconv from 'iconv-lite';

const url = "https://info.t.u-tokyo.ac.jp"
const config: AxiosRequestConfig = {
    proxy: {
        host: process.env.UTOKYO_PROXY_HOST,
        port: Number(process.env.UTOKYO_PROXY_PORT),
        auth: {
            username: process.env.UTOKYO_PROXY_USERNAME,
            password: process.env.UTOKYO_PROXY_PASSWORD,
        }
    },
    responseType: 'arraybuffer'
};

(async () => {
    console.log(iconv.decode(Buffer.from((await axios.get(url, config)).data), 'euc-jp'));
})().catch(e=>{console.log(e)})