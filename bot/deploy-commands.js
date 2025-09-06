const { REST, Routes, ChannelType } = require('discord.js');
require('dotenv').config();

const commands = [
    {
        name: '내전생성',
        description: '팀 구성 프로그램을 사용할 수 있는 제어판을 생성합니다.',
    },
    // 이전 /채널설정 명령어는 제거되었습니다.
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('(/) 애플리케이션 명령어 등록을 시작합니다.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('(/) 애플리케이션 명령어가 성공적으로 등록되었습니다.');
    } catch (error) {
        console.error(error);
    }
})();
