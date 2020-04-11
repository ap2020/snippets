import {WebClient} from "@slack/web-api";

const sleep = async (millis: number) => await new Promise(resolve => setTimeout(resolve, millis));

// tab-separated channel names of three columns:
// channel ID, original channel name, new channel name
const dataStr = `
`;
const data = dataStr.trim().split("\n").map(s => s.split("\t"));

(async () => {
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);

    for (const row of data) {
        let [channelID, originalName, aliasName] = row;

        let channel = (await client.conversations.info({
            channel: channelID,
        })).channel as {is_member: boolean};
        console.log(channel);
        await sleep(1000);

        const joined = channel.is_member;

        if (!joined) await client.conversations.join({
            channel: channelID,
        });
        await sleep(1000);

        await client.conversations.rename({
            channel: channelID,
            name: aliasName,
        });
        await sleep(1000);

        await client.conversations.rename({
            channel: channelID,
            name: originalName,
        });
        await sleep(1000);

        if (!joined) await client.conversations.leave({
            channel: channelID,
        });
        await sleep(7000);

        break;
    }
})();

// noinspection BadExpressionStatementJS
(async () => {
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);

    const channels = (await client.conversations.list({
        token: process.env.SLACK_BOT_TOKEN,
        limit: 1000,
    })).channels as { name: String, id: String, is_archived: boolean, is_private: boolean }[];
    // console.log(channels);

    for (const channel of channels) {
        if (!channel.is_archived) {
            console.log([channel.id, channel.name].join("\t"));
        }
    }
});

