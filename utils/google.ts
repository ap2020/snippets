import {promises as fs} from 'fs';
import {google} from 'googleapis';
import {scopes} from './google_scopes';
import {readline} from './utils';

export type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

const TOKEN_PATH = 'token.json';

const authorize = async (credentials): Promise<OAuth2Client> => {
    const {client_secret, client_id, redirect_uris} = credentials.installed;  
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    
    try {
        const tokens = JSON.parse(await fs.readFile(TOKEN_PATH, {encoding: 'utf-8'}));
        oAuth2Client.setCredentials(tokens);
        return oAuth2Client;
    } catch (err) {
        return await getAccessToken(oAuth2Client);
    }
};

const getAccessToken = async (oAuth2Client): Promise<OAuth2Client> =>  {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    console.log('Enter the code from that page here: ');
    const code = await readline();
    let tokens: unknown;
    try {
        ({tokens} = await oAuth2Client.getToken(code));
    } catch (err) {
        throw Error(`Error retrieving access token: ${err}`);
    }

    try {
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    } catch (err) {
        throw Error(err);
    }
    console.log('Token stored to', TOKEN_PATH);
    console.log('Do not commit this file.');
    oAuth2Client.setCredentials(tokens);
    return oAuth2Client;
};

export const getGoogleClient = async (): Promise<OAuth2Client> => {
    let clientSecrets: string;
    try {
        clientSecrets = JSON.parse(await fs.readFile('credentials.json', {encoding: 'utf-8'}));
    } catch (err) {
        throw Error(`Error loading client secret file: ${err}`);
    }

    return await authorize(clientSecrets);
}

