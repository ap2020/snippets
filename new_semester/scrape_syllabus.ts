import puppeteer from 'puppeteer';
import {execFile} from 'child_process';
import {promisify} from 'util';
import ora from 'ora';
import {gakkas, gakubuCode} from './scrape_syllabus.secret'
import {promises as fs} from 'fs';
import path from 'path';

const getInnerText = async (e: puppeteer.ElementHandle<any>): Promise<string> => 
    await (await e.getProperty('innerText')).jsonValue() as string;

const getPassword = async (): Promise<string> =>
    (await promisify(execFile)('security', ['find-generic-password', '-s', process.env.KEYCHAIN_UTAS ,'-w'])).stdout.replace(/\n$/, '');

const fileExists = async (filepath: string): Promise<boolean> => {
    try {
        await fs.access(filepath);
        return true;
    } catch (e) {
        return false;
    }
}

(async () => {
    const browser = await puppeteer.launch({headless: false, slowMo: 0});
    const page = await browser.newPage();
    
    let sp1 = ora('Logging in').start();
    await page.goto('https://utas.adm.u-tokyo.ac.jp/campusweb/campusportal.do', {waitUntil: "domcontentloaded"});
    page.click('#wf_PTW0000011_20120827233559-form > p > button');

    await page.waitFor('#userNameInput', {timeout: 60 * 1000});

    const username = process.env.UTAS_USERNAME;
    const password = await getPassword();
    await page.type('#userNameInput', username);
    await page.type('#passwordInput', password);
    await page.click('#submitButton');

    // go to page
    await page.waitFor('#tab-sy', {timeout: 60 * 1000});
    sp1.succeed('Logged in');

    for (const {gakubu, gakka} of gakkas) {
        let sp2 = ora({text: 'opening syllabus page', indent: 1}).start();
        try {
            await page.waitFor(1000);
            await page.click('#tab-sy');
            
            await page.waitFor(1000);
            sp2.text = 'Opening department list';
            await page.waitFor('#tabmenu-ul > li:nth-child(3) > span', {timeout: 60 * 1000});
            await page.waitFor(1000);
            await page.click('#tabmenu-ul > li:nth-child(3) > span')
            
            sp2.text = 'Select department';
            await page.waitFor('#main-frame-if', {timeout: 60 * 1000}); 
            const frame = page.frames().find(frame => frame.name() === 'portlet-body');
            await page.waitFor(1000);
            await frame.waitFor('#gakubuCode', {timeout: 60 * 1000});
            await page.waitFor(1000);
            await frame.select('#gakubuCode', gakubuCode[gakubu]);
            
            await page.waitFor(1000);
            await frame.waitFor('#gakkaCourseDataForm', {timeout: 60 * 1000});
            await page.waitFor(1000);
            sp2.text = 'Selecting department';
            await (await frame.$x(`//*[@id="gakkaCourseDataForm"]/table/tbody/tr/td/a[contains(text(), "${gakka}")]`))[0].click();

            
            // @ts-ignore
            await frame.evaluate(() => {
                'use strict';
                // @ts-ignore
                const title = $("#main-portlet-title").text();
                if (!title.includes('学科・コース別検索（シラバス参照）') || !title.includes('検索結果') ) return;
                // @ts-ignore
                console.log($('td > a[onclick^="refer(\'"]').attr('onclick'));
                const refer=(year, shozokuCd, _, lang) => ({year, shozokuCd, lang});
                // @ts-ignore
                const {year, shozokuCd, lang} = eval($('td > a[onclick^="refer(\'"]').attr('onclick'));
                // @ts-ignore
                const table = $('body > table:last-of-type');
                const jCdIndex = table.find('thead > tr').find('th:contains("時間割コード")').index();
                const courses=table.find('tbody > tr').not(':has(a)');
                const codes = courses.find(`td:nth-of-type(${jCdIndex+1})`);
                const links = courses.find('td:nth-last-of-type(2)').wrapInner('<a></a>').children('a');
                links.attr({onclick: (i) => `refer('${year}','${shozokuCd}','${codes[i].innerText}','${lang}');`}).css({'color': '#027075'});
            });

            await frame.waitForNavigation({waitUntil: "domcontentloaded"});
            await frame.waitFor(1000);
            
            sp2.succeed('Opened course list');

            for (const courselink of (await frame.$$('td > a'))/*.slice(0, 3)*/) {
                let sp3 = ora({text: 'Opening course page', indent: 2}).start();
                let courseName: string = null;
                try {
                    courseName = await (await courselink.getProperty('innerText')).jsonValue() as string;
                    console.log(`Scraping ${gakubu} > ${gakka} > ${courseName}`);

                    const coursePagePromise: Promise<puppeteer.Page> = new Promise((resolve, reject) => {
                        browser.once('targetcreated', async target => resolve(await target.page()));
                    });

                    await courselink.click();
                    const coursePage = await coursePagePromise;

                    sp3.text = 'Collecting data';
                    
                    await coursePage.waitFor(`#tabs-1 > table > tbody > tr`);
                    await coursePage.waitFor(`#tabs-2 > table > tbody > tr`);
                    await page.waitFor(1000);
                    const data: string[][]  = (await Promise.all(
                        (await Promise.all([1,2].map(async (i) => await coursePage.$$(`#tabs-${i} > table > tbody > tr`)))).flat()
                        .map(async e =>
                            await Promise.all(
                                (await Promise.all(
                                    ['th', 'td'].map(async tag => await e.$(tag))
                                ))
                                .map(async e => e === null ? '': await getInnerText(e))
                            )
                        )
                    )).map(l => l.map(s => s.trim().replace(/／.+?(　|$)/g, '').trim()));
                
                    await coursePage.waitFor('#referInputForm');
                    await page.waitFor(1000);
                    const {code, nendo}: {code: string, nendo: string} = await coursePage.$eval('#referInputForm', (form) => {
                        const formData = form.elements;
                        return {
                            code: formData.jikanwaricd.value,
                            nendo: formData.nendo.value,
                        }
                    }) as any;
                    const permalink =  `https://catalog.he.u-tokyo.ac.jp/detail?code=${code}&year=${nendo}`;
                    
                    data.push(['シラバスURL', permalink]);

                    sp3.text = 'Saving data';
                    await fs.writeFile(path.join(__dirname, 'syllabus_data_secret', `${code}.json`), JSON.stringify(data));

                    sp3.succeed('Saved!');
                    
                    await coursePage.close();
                } catch (e) {
                    sp3.fail(`\nFailed to scrape ${gakubu} > ${gakka} > ${courseName}`);
                    console.error(e);
                }
            }
        } catch (e) {
            sp2.fail(`\nFailed to scrape ${gakubu} > ${gakka}`);
            console.error(e);
        }
    }
    await browser.close();
})().catch(e => console.error(e));
