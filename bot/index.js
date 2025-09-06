const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, ChannelType } = require('discord.js');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
const apiKey = process.env.API_KEY;
const PORT = process.env.PORT || 3000;

// =================================================================
// Express 앱 설정 (API 서버)
// =================================================================
const app = express();
app.use(cors());
app.use(express.json());

const apiKeyAuth = (req, res, next) => {
    const providedApiKey = req.headers['x-api-key'];
    if (providedApiKey && providedApiKey === apiKey) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
};
app.use(apiKeyAuth);

// =================================================================
// Discord 클라이언트 설정 (봇)
// =================================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.gameSessions = new Map();
client.setupSessions = new Map(); // 설정 과정을 추적하기 위한 Map

// --- 설정 파일 관리 ---
const CONFIG_FILE_PATH = path.join(__dirname, 'server-configs.json');
let serverConfigs = new Map();

function loadServerConfigs() {
    try {
        if (fs.existsSync(CONFIG_FILE_PATH)) {
            const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
            const parsedData = JSON.parse(data);
            serverConfigs = new Map(parsedData);
            console.log(`✅ ${serverConfigs.size}개의 서버 설정을 파일에서 불러왔습니다.`);
        }
    } catch (error) {
        console.error('서버 설정 파일을 불러오는 데 실패했습니다:', error);
    }
}

function saveServerConfigs() {
    try {
        const dataToSave = JSON.stringify(Array.from(serverConfigs.entries()));
        fs.writeFileSync(CONFIG_FILE_PATH, dataToSave, 'utf8');
        console.log('✅ 서버 설정이 파일에 저장되었습니다.');
    } catch (error) {
        console.error('서버 설정 파일을 저장하는 데 실패했습니다:', error);
    }
}

loadServerConfigs(); // 봇 시작 시 설정 불러오기

// --- 이벤트 핸들러 설정 ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, serverConfigs, client.setupSessions, saveServerConfigs));
    } else {
        client.on(event.name, (...args) => event.execute(...args, serverConfigs, client.setupSessions, saveServerConfigs));
    }
}

// =================================================================
// 봇 준비 완료 시 API 서버 실행
// =================================================================
client.once(Events.ClientReady, readyClient => {
    console.log(`✅ ${readyClient.user.tag} 봇이 준비되었습니다.`);

    // --- API 엔드포인트 정의 ---

    // [수정됨] 클라이언트의 요청 주소에 맞게 '/api/server/:guildId'로 변경
    app.get('/api/server/:guildId', async (req, res) => {
        try {
            const guild = await client.guilds.fetch(req.params.guildId);
            if (guild) {
                res.json({ id: guild.id, name: guild.name });
            } else {
                res.status(404).json({ error: '서버를 찾을 수 없습니다.' });
            }
        } catch (error) {
            console.error('API Error (/server/:guildId):', error);
            res.status(500).json({ error: '서버 정보를 가져오는 데 실패했습니다.' });
        }
    });
    
    app.get('/api/servers/:guildId/config', async (req, res) => {
        const { guildId } = req.params;
        const config = serverConfigs.get(guildId);
        
        if (!config) {
            return res.status(404).json({ error: '해당 서버의 채널 설정이 디스코드에서 완료되지 않았습니다. /내전생성 후 설정을 먼저 진행해주세요.' });
        }

        try {
            const guild = await client.guilds.fetch(guildId);
            const lobby = await client.channels.fetch(config.lobbyId);
            const team1 = await client.channels.fetch(config.team1Id);
            const team2 = await client.channels.fetch(config.team2Id);

            res.json({
                guild: { id: guild.id, name: guild.name },
                lobby: { id: lobby.id, name: lobby.name },
                team1: { id: team1.id, name: team1.name },
                team2: { id: team2.id, name: team2.name },
            });
        } catch (error) {
            console.error('API Error (/servers/:guildId/config):', error);
            res.status(500).json({ error: '설정된 채널 정보를 가져오는 데 실패했습니다. 채널이 삭제되었을 수 있습니다.' });
        }
    });


    app.get('/api/servers/:guildId/channels', async (req, res) => {
        try {
            const guild = await client.guilds.fetch(req.params.guildId);
            const channels = await guild.channels.fetch();
            
            const categories = channels
                .filter(c => c.type === ChannelType.GuildCategory)
                .map(category => ({
                    id: category.id,
                    name: category.name,
                    channels: channels
                        .filter(c => c.parentId === category.id && c.type === ChannelType.GuildVoice)
                        .map(vc => ({ id: vc.id, name: vc.name }))
                }))
                .filter(category => category.channels.length > 0); 

            res.json(categories);
        } catch (error) {
            console.error('API Error (/servers/:guildId/channels):', error);
            res.status(500).json({ error: '채널 목록을 가져오는 데 실패했습니다.' });
        }
    });

    app.get('/api/channel-members/:channelId', async (req, res) => {
        try {
            const channel = await client.channels.fetch(req.params.channelId);
            if (!channel || channel.type !== ChannelType.GuildVoice) {
                return res.status(404).json({ error: '음성 채널을 찾을 수 없습니다.' });
            }
            const members = Array.from(channel.members.values()).map(m => ({ id: m.id, name: m.displayName }));
            res.json(members);
        } catch (error) {
            console.error('API Error (/channel-members):', error);
            res.status(500).json({ error: '멤버 목록을 가져오는 데 실패했습니다.' });
        }
    });
    
    app.post('/api/update-config', (req, res) => {
        const { guild, channels } = req.body;
        if (!guild || !channels || !channels.lobby || !channels.team1 || !channels.team2) {
            return res.status(400).json({ error: '필수 설정 데이터가 누락되었습니다.' });
        }
        serverConfigs.set(guild.id, {
            lobbyId: channels.lobby.id,
            team1Id: channels.team1.id,
            team2Id: channels.team2.id,
        });
        saveServerConfigs();
        res.json({ success: true, message: '봇 서버에 설정이 성공적으로 업데이트되었습니다.' });
    });

    app.post('/api/submit-teams', async (req, res) => {
        const { createControlPanel, generateControlPanelContent } = require('./events/interactionCreate.js');
        const { guildId, team1, team2 } = req.body;
        if (!guildId || !team1 || !team2) {
            return res.status(400).json({ error: '필수 데이터(guildId, team1, team2)가 누락되었습니다.' });
        }
    
        let sessionInfo = null;
        for (const [channelId, gameSession] of client.gameSessions.entries()) {
            try {
                const channel = await client.channels.fetch(channelId);
                if (channel?.guildId === guildId) {
                    sessionInfo = { channelId, session: gameSession };
                    break;
                }
            } catch { continue; }
        }

        if (!sessionInfo) {
            return res.status(404).json({ error: '해당 서버에서 시작된 게임 세션을 찾을 수 없습니다. /내전생성 명령어를 먼저 사용해주세요.' });
        }
    
        const { channelId, session } = sessionInfo;
        session.team1 = team1;
        session.team2 = team2;
        client.gameSessions.set(channelId, session);
        
        try {
            if (session.messageId) {
                const channel = await client.channels.fetch(channelId);
                const message = await channel.messages.fetch(session.messageId);
                const guild = await client.guilds.fetch(guildId);
                const config = serverConfigs.get(guildId);
                const content = await generateControlPanelContent(guild, config, session);
                
                await message.edit({ content, components: createControlPanel() });
            }
            res.json({ success: true, message: '팀 구성이 봇에 성공적으로 업데이트되었습니다.' });
        } catch(error) {
            console.error('API Error (/submit-teams):', error);
            res.status(500).json({ error: '디스코드 메시지를 수정하는 데 실패했습니다.' });
        }
    });

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 API 서버가 모든 네트워크의 ${PORT} 포트에서 실행 중입니다.`);
    });
});

client.login(token);

