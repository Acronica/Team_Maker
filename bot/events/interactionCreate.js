const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

async function generateControlPanelContent(interactionOrGuild, config, session) {
    const guild = interactionOrGuild.guild || interactionOrGuild;
    let content = `## 🚩 내전 제어판 (${guild.name})\n\n`;

    if (session && (session.team1.length > 0 || session.team2.length > 0)) {
        content += `**1팀**: ${session.team1.join(', ') || ' '}\n**2팀**: ${session.team2.join(', ') || ' '}\n\n`;
    } else {
        content += '프로그램에서 팀을 구성하고 결과를 전송해주세요.\n\n';
    }

    if (config) {
        try {
            // 채널 ID가 유효한지 확인하고 채널을 가져옵니다.
            const lobbyChannel = config.lobbyId ? await guild.channels.fetch(config.lobbyId).catch(() => null) : null;
            const team1Channel = config.team1Id ? await guild.channels.fetch(config.team1Id).catch(() => null) : null;
            const team2Channel = config.team2Id ? await guild.channels.fetch(config.team2Id).catch(() => null) : null;

            content += `**[현재 설정된 채널]**\n> **대기:** ${lobbyChannel || '`삭제된 채널`'}\n> **1팀:** ${team1Channel || '`삭제된 채널`'}\n> **2팀:** ${team2Channel || '`삭제된 채널`'}`;
        } catch (e) {
            console.error("제어판 채널 정보를 가져오는 중 오류 발생:", e);
            content += "**[현재 설정된 채널]**\n> 채널 정보를 불러오는 데 실패했습니다.";
        }
    }
    return content;
}

const createControlPanel = () => {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('move_teams').setLabel('이동').setStyle(ButtonStyle.Success).setEmoji('⚔️'),
        new ButtonBuilder().setCustomId('swap_teams').setLabel('스왑').setStyle(ButtonStyle.Secondary).setEmoji('🔁'),
        new ButtonBuilder().setCustomId('input_players').setLabel('인원 입력').setStyle(ButtonStyle.Primary).setEmoji('📝'),
        new ButtonBuilder().setCustomId('setup_channels').setLabel('설정').setStyle(ButtonStyle.Primary).setEmoji('⚙️')
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('return_team_1').setLabel('1팀 복귀').setStyle(ButtonStyle.Secondary).setEmoji('1️⃣'),
        new ButtonBuilder().setCustomId('return_team_2').setLabel('2팀 복귀').setStyle(ButtonStyle.Secondary).setEmoji('2️⃣'),
        new ButtonBuilder().setCustomId('end_game').setLabel('종료').setStyle(ButtonStyle.Danger).setEmoji('🔚')
    );
    return [row1, row2];
};

const replyAndClear = async (interaction, content, isFollowUp = false) => {
    try {
        const replyOptions = { content, ephemeral: true };
        if (isFollowUp) {
            await interaction.followUp(replyOptions);
        } else {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(replyOptions);
            } else {
                await interaction.reply(replyOptions);
            }
        }
        const message = await interaction.fetchReply();
        setTimeout(() => message.delete().catch(console.error), 5000);
    } catch (error) {
        if (error.code === 'InteractionNotReplied' || error.code === 'UnknownInteraction') {
             console.log("상호작용에 대한 응답이 이미 전송되었거나 너무 오래되었습니다.");
        } else {
             console.error("replyAndClear 함수 오류:", error);
        }
    }
};

async function startChannelSetup(interaction, setupSessions) {
    const { guild } = interaction;
    const setupId = `${guild.id}-${interaction.user.id}`;

    const channels = await guild.channels.fetch();
    const categories = channels
        .filter(c => c.type === ChannelType.GuildCategory && c.children.cache.filter(child => child.type === ChannelType.GuildVoice).size >= 3)
        .map(c => ({ label: c.name, value: c.id }));

    if (categories.length === 0) {
        const replyOptions = { content: '⚠️ 3개 이상의 음성 채널을 포함한 카테고리가 없습니다.', ephemeral: true, components: [] };
        if (interaction.replied || interaction.deferred) {
            return interaction.followUp(replyOptions);
        }
        return interaction.reply(replyOptions);
    }

    setupSessions.set(setupId, { step: 1, guildId: guild.id });

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`setup_category_${setupId}`)
            .setPlaceholder('음성 채널이 있는 카테고리를 선택하세요.')
            .addOptions(categories),
    );

    const replyOptions = {
        content: '⚙️ **채널 설정 (1/2): 카테고리 선택**\n\n내전에 사용할 대기실, 1팀, 2팀 음성 채널이 포함된 카테고리를 선택해주세요.',
        components: [row],
        ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
    } else {
        await interaction.reply(replyOptions);
    }
}


module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, serverConfigs, setupSessions, saveServerConfigs) {
        const { customId, channelId, guild, member, client } = interaction;
        const { gameSessions } = client;

        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === '내전생성') {
                const initialButton = new ButtonBuilder().setCustomId('start_game_button').setLabel('내전 시작').setStyle(ButtonStyle.Primary).setEmoji('🚀');
                const row = new ActionRowBuilder().addComponents(initialButton);
                await interaction.reply({ content: "## 🚩 내전 관리 시스템\n\n내전을 시작하려면 아래 버튼을 눌러주세요.", components: [row] });
            }
            return;
        }

        if (interaction.isButton()) {
            const config = serverConfigs.get(guild.id);

            if (customId === 'start_game_button') {
                if (!config) {
                    await interaction.reply({ content: '⚠️ **채널 설정이 필요합니다!**\n자동으로 설정을 시작합니다...', ephemeral: true });
                    return startChannelSetup(interaction, setupSessions);
                }
                const initialSession = { team1: [], team2: [] };
                const content = await generateControlPanelContent(interaction, config, initialSession);
                await interaction.update({
                    content,
                    components: createControlPanel(),
                });
                const controlPanelMessage = await interaction.fetchReply();
                gameSessions.set(channelId, { 
                    ...initialSession,
                    messageId: controlPanelMessage.id 
                });
            } else if (customId === 'setup_channels') {
                return startChannelSetup(interaction, setupSessions);
            } else if (customId === 'input_players') {
                const session = gameSessions.get(channelId);
                if (!session) {
                    return interaction.reply({ content: '⚠️ 먼저 내전을 시작해주세요.', ephemeral: true });
                }
                const modal = new ModalBuilder().setCustomId('player_input_modal').setTitle('참가자 명단 입력');
                const playerListInput = new TextInputBuilder().setCustomId('player_list_input').setLabel('프로그램의 클립보드 내용을 붙여넣으세요.').setStyle(TextInputStyle.Paragraph).setPlaceholder('1팀\t2팀\n멤버1 : 멤버6\n멤버2 : 멤버7\n...');
                const actionRow = new ActionRowBuilder().addComponents(playerListInput);
                modal.addComponents(actionRow);
                await interaction.showModal(modal);
            } else if (customId === 'move_teams' || customId === 'swap_teams') {
                if (!config) return await replyAndClear(interaction, '⚠️ 채널 설정이 완료되지 않았습니다.');
                const session = gameSessions.get(channelId);
                if (!session || !session.team1 || session.team1.length === 0) return await replyAndClear(interaction, '⚠️ 팀 정보가 없습니다. 먼저 프로그램을 통해 팀을 전송해주세요.');

                await interaction.deferReply({ ephemeral: true });
                
                const sourceChannel = guild.channels.cache.get(config.lobbyId);
                const team1Channel = guild.channels.cache.get(config.team1Id);
                const team2Channel = guild.channels.cache.get(config.team2Id);
                
                if (!sourceChannel || !team1Channel || !team2Channel) {
                    return await replyAndClear(interaction, '⚠️ 설정된 채널 중 일부를 찾을 수 없습니다! \'봇 설정\'을 다시 확인해주세요.', true);
                }

                if (customId === 'move_teams') {
                    const membersToMove = [...sourceChannel.members.values()];
                    const movePromises = membersToMove.map(m => {
                        if (session.team1.includes(m.displayName)) return m.voice.setChannel(team1Channel);
                        if (session.team2.includes(m.displayName)) return m.voice.setChannel(team2Channel);
                    }).filter(p => p);
                    await Promise.all(movePromises);
                    await replyAndClear(interaction, `✅ ${movePromises.length}명의 멤버 이동을 완료했습니다.`, true);
                } else if (customId === 'swap_teams') {
                    [session.team1, session.team2] = [session.team2, session.team1];
                    gameSessions.set(channelId, session);
                    
                    const membersInT1 = [...team1Channel.members.values()];
                    const membersInT2 = [...team2Channel.members.values()];
                    const swapPromises = [
                        ...membersInT1.map(m => m.voice.setChannel(team2Channel)),
                        ...membersInT2.map(m => m.voice.setChannel(team1Channel))
                    ];
                    await Promise.all(swapPromises);
                    
                    const content = await generateControlPanelContent(interaction, config, session);
                    await interaction.message.edit({ content });
                    await replyAndClear(interaction, '✅ 팀 스왑을 완료했습니다.', true);
                }
            } else if (customId === 'return_team_1' || customId === 'return_team_2') {
                if (!config) return await replyAndClear(interaction, '⚠️ 채널 설정이 완료되지 않았습니다.');
                const session = gameSessions.get(channelId);
                if (!session) return await replyAndClear(interaction, '⚠️ 팀 정보가 없습니다.');

                await interaction.deferReply({ ephemeral: true });
                const returnChannel = guild.channels.cache.get(config.lobbyId);
                const teamChannelId = (customId === 'return_team_1') ? config.team1Id : config.team2Id;
                const teamChannel = guild.channels.cache.get(teamChannelId);
                
                if (!returnChannel || !teamChannel) return await replyAndClear(interaction, '⚠️ 복귀 채널 또는 팀 채널을 찾을 수 없습니다.', true);

                const membersToReturn = [...teamChannel.members.values()];
                const returnPromises = membersToReturn.map(m => m.voice.setChannel(returnChannel));
                await Promise.all(returnPromises);
                await replyAndClear(interaction, `✅ ${customId === 'return_team_1' ? '1팀' : '2팀'} 멤버 ${membersToReturn.length}명이 복귀했습니다.`, true);
            } else if (customId === 'end_game') {
                gameSessions.delete(channelId);
                const initialButton = new ButtonBuilder().setCustomId('start_game_button').setLabel('내전 시작').setStyle(ButtonStyle.Primary).setEmoji('🚀');
                const row = new ActionRowBuilder().addComponents(initialButton);
                await interaction.update({ content: "## 🚩 내전 관리 시스템\n\n내전을 시작하려면 아래 버튼을 눌러주세요.", components: [row] });
            } else if (customId.startsWith('setup_save')) {
                const setupIdSave = customId.substring('setup_save_'.length);
                const setupDataSave = setupSessions.get(setupIdSave);
                if (!setupDataSave) {
                    return interaction.update({ content: '⚠️ 설정 세션이 만료되었습니다. 다시 시도해주세요.', components: [] });
                }
                if (!setupDataSave.lobbyId || !setupDataSave.team1Id || !setupDataSave.team2Id) {
                    return interaction.update({ content: '⚠️ 모든 채널(대기, 1팀, 2팀)을 선택해야 저장이 가능합니다.', components: interaction.message.components});
                }
                const idSet = new Set([setupDataSave.lobbyId, setupDataSave.team1Id, setupDataSave.team2Id]);
                if (idSet.size < 3) {
                    return interaction.update({ content: '⚠️ 대기, 1팀, 2팀 채널은 모두 다른 채널이어야 합니다.', components: interaction.message.components});
                }
                const newConfig = {
                    lobbyId: setupDataSave.lobbyId,
                    team1Id: setupDataSave.team1Id,
                    team2Id: setupDataSave.team2Id,
                };
                serverConfigs.set(guild.id, newConfig);
                
                saveServerConfigs(); 

                // [수정됨] 제어판 실시간 업데이트 로직 추가
                let activeSession = null;
                let activeChannelId = null;

                for (const [chId, session] of gameSessions.entries()) {
                    try {
                        const ch = await client.channels.fetch(chId);
                        if (ch.guildId === guild.id) {
                            activeSession = session;
                            activeChannelId = chId;
                            break;
                        }
                    } catch {}
                }

                if (activeSession && activeSession.messageId) {
                    try {
                        const controlPanelChannel = await client.channels.fetch(activeChannelId);
                        const controlPanelMessage = await controlPanelChannel.messages.fetch(activeSession.messageId);
                        const newContent = await generateControlPanelContent(guild, newConfig, activeSession);
                        await controlPanelMessage.edit({ content: newContent });
                    } catch (e) {
                        console.error("설정 저장 후 제어판 업데이트 실패:", e);
                    }
                }
                
                setupSessions.delete(setupIdSave);
                await interaction.update({ content: '✅ 채널 설정이 성공적으로 저장되었습니다!', components: [] });
            }
        }
        
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'player_input_modal') {
                const session = gameSessions.get(channelId);
                const config = serverConfigs.get(guild.id);
                if (!session) {
                    return interaction.reply({ content: '⚠️ 내전 세션을 찾을 수 없습니다.', ephemeral: true });
                }
                
                const playerListText = interaction.fields.getTextInputValue('player_list_input');
                const lines = playerListText.split('\n').filter(line => line.includes(':'));

                const team1 = [];
                const team2 = [];

                lines.forEach(line => {
                    const parts = line.split(':');
                    if (parts.length === 2) {
                        const player1 = parts[0].trim();
                        const player2 = parts[1].trim();
                        if (player1 && player1 !== '-') team1.push(player1);
                        if (player2 && player2 !== '-') team2.push(player2);
                    }
                });
                
                if (team1.length === 0 && team2.length === 0) {
                    return interaction.reply({ content: '⚠️ 인식할 수 있는 참가자가 없습니다. `이름 : 이름` 형식인지 확인해주세요.', ephemeral: true });
                }

                session.team1 = team1;
                session.team2 = team2;
                gameSessions.set(channelId, session);

                try {
                    const message = await interaction.channel.messages.fetch(session.messageId);
                    const content = await generateControlPanelContent(interaction, config, session);
                    await message.edit({ content, components: createControlPanel() });
                    await interaction.reply({ content: `✅ ${team1.length + team2.length}명의 참가자를 성공적으로 등록했습니다.`, ephemeral: true });
                } catch (error) {
                    console.error("메시지 수정 오류:", error);
                    await interaction.reply({ content: '⚠️ 제어판 메시지를 업데이트하는 데 실패했습니다.', ephemeral: true });
                }
            }
        }

        if (interaction.isStringSelectMenu()) {
            const parts = customId.split('_');
            if (parts[0] !== 'setup') return;

            const action = parts[1];
            const setupId = parts.slice(2).join('_');
            const setupData = setupSessions.get(setupId);
            
            if (!setupData) {
                return interaction.update({ content: '⚠️ 설정 세션이 만료되었거나 올바르지 않습니다. `/내전생성`부터 다시 시작해주세요.', components: [] });
            }

            const { guild } = interaction;
            const channels = await guild.channels.fetch();

            if (action === 'category') {
                const categoryId = interaction.values[0];
                setupData.step = 2;
                setupData.categoryId = categoryId;

                const voiceChannels = channels
                    .filter(c => c.parentId === categoryId && c.type === ChannelType.GuildVoice)
                    .map(c => ({ label: c.name, value: c.id }));
                
                if (voiceChannels.length < 3) {
                     return interaction.update({ content: '⚠️ 선택한 카테고리에 음성 채널이 3개 미만입니다. 다른 카테고리를 선택해주세요.', components: [] });
                }

                const menus = ['lobby', 'team1', 'team2'].map(type => 
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`setup_${type}_${setupId}`)
                            .setPlaceholder(`${type === 'lobby' ? '대기' : type === 'team1' ? '1팀' : '2팀'} 채널을 선택하세요.`)
                            .addOptions(voiceChannels)
                    )
                );
                
                const saveButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`setup_save_${setupId}`)
                        .setLabel('설정 저장')
                        .setStyle(ButtonStyle.Success)
                );

                await interaction.update({
                    content: '⚙️ **채널 설정 (2/2): 채널 지정**\n\n각 용도에 맞는 음성 채널을 선택하고 저장해주세요.',
                    components: [...menus, saveButton]
                });
            } else if (['lobby', 'team1', 'team2'].includes(action)) {
                setupData[action + 'Id'] = interaction.values[0];
                setupSessions.set(setupId, setupData);
                await interaction.deferUpdate();
            }
        }
    },
    createControlPanel,
    generateControlPanelContent,
};

