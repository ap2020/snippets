import readline_ from 'readline';

export const z2h = s => s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

export const splitString = (s, n) => {
    const l=[];
    for(let i = 0; i < s.length; i+=2) {
        l.push(s.slice(i, i+2)); 
    }
    return l;
}

export const readline = (): Promise<string> => new Promise((resolve, reject) => {
    const rl = readline_.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.once('line',  async (code) => {
        resolve(code);
    });
});
