const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    Events,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');


const { token, clientId, guildId } = require('./config.json');
const fs = require('fs').promises; // 파일 입출력을 위한 모듈
const path = require('path');  // path 모듈

const userFortuneCount = new Map(); // 사용자 ID와 사용 횟수를 저장하는 Map
const openModals = new Map(); // 사용자 ID와 모달 상태를 관리하는 Map
const DAILY_LIMIT = 3;

// fibonacciCooldown
const userCooldowns = new Map(); // 유저별 대기시간 저장

// 접두사 '$' 설정
const prefix = '$';

// 이미지 저장용 파일 경로
const galleryFolder = './resources/images/gallery';


// 상태 메시지 목록
const activities = [
    '저공 비행',
    '고공 비행',
    '먹이 탐색',
    '서른 마흔 다섯 번째 둥지 짓기',
    '전 디스코드 서버를 감시',
    '트윗을 쓸 준비',
    '인류를 지배하기 위한 밑작업',
    '부리로 나무 쪼기',
    '사악한 계획',
    '리그 오브 레전드',
    '다이아몬드 행동',
    '마흔 두 번째 음모를 계획',
    '끼에에에에에에에에에에에ㅔㅔ엑',
    '무엇인가',
    '더 나은 내일을 위한 준비',
    '전 인류를 지배할 계획 구상',
    '본인도 무엇인지 모르는 행동',
    '누군가를 열심히 쪼기',
];

// hangman 게임
const hangman = () => {
    console.log('hangman called');
};

// 클라이언트 객체 생성 (Guilds관련, 메시지관련 인텐트 추가)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,  // Privileged Intent
        GatewayIntentBits.MessageContent,
    ],
});

const fibonacci = (n) => {
    if (n <= 2) return 1;
    let a = 1, b = 1;
    for (let i = 3; i <= n; i++) {
        [a, b] = [b, a + b]; // 구조 분해 할당을 이용한 업데이트
    }
    return b;
}

// $getZodiacSign
// 생일을 바탕으로 별자리를 계산하고 추가 정보를 반환하는 함수
async function getZodiacSign(birthday) {
    const birthDate = new Date(birthday);
    const month = birthDate.getMonth() + 1; // 월 (1부터 시작)
    const day = birthDate.getDate(); // 일
    const zodiacFilePath = './resources/jsons/zodiac.json';

    try {
        // JSON 파일을 비동기적으로 읽어서 zodiacData에 저장
        const zodiacDataRaw = await fs.readFile(zodiacFilePath, 'utf8');
        const zodiacData = JSON.parse(zodiacDataRaw);

        // 별자리 계산
        let zodiacSign = '';
        if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) zodiacSign = '양자리(Aries)'; // Aries
        else if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) zodiacSign = '황소자리(Taurus)'; // Taurus
        else if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) zodiacSign = '쌍둥이자리(Gemini)'; // Gemini
        else if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) zodiacSign = '게자리(Cancer)'; // Cancer
        else if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) zodiacSign = '사자자리(Leo)'; // Leo
        else if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) zodiacSign = '처녀자리(Virgo)'; // Virgo
        else if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) zodiacSign = '천칭자리(Libra)'; // Libra
        else if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) zodiacSign = '전갈자리(Scorpio)'; // Scorpio
        else if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) zodiacSign = '사수자리(Sagittarius)'; // Sagittarius
        else if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) zodiacSign = '염소자리(Capricorn)'; // Capricorn
        else if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) zodiacSign = '물병자리(Aquarius)'; // Aquarius
        else if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) zodiacSign = '물고기자리(Pisces)'; // Pisces

        // 별자리 계산 후 해당 별자리 정보 반환
        if (zodiacSign && zodiacData[zodiacSign]) {
            const zodiacInfo = zodiacData[zodiacSign]; // 직접 값을 가져옴
            return {
                name: zodiacInfo['별자리 이름'],
                traits: zodiacInfo['특징'],
                fortune: zodiacInfo['운세']
            };
        } else {
            return null; // 해당 날짜에 맞는 별자리 정보가 없으면 null 반환
        }
    } catch (error) {
        console.error("파일 읽기 또는 JSON 파싱 중 오류 발생:", error);
        return null;
    }
}




// 매일 자정에 데이터 초기화
setInterval(() => {
    userFortuneCount.clear(); // 포춘 쿠키 기능 초기화
    userCooldowns.clear(); // /물어의 피보나치 쿨다운 초기화 
    console.log('userFortuneCount, userCooldowns 초기화 !');
}, 24 * 60 * 60 * 1000); // 24시간마다 실행

// 1시간에 한 번씩 상태 메시지 변경
setInterval(() => {
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];

    client.user.setPresence({
        activities: [{ name: randomActivity }],
        status: 'online',  // 봇 상태 (offline, idle, do not disturb, online)
    });
    console.log(`상태 메시지 변경성공! 현재 상태: ${randomActivity}`);
}, 1 * 60 * 60 * 1000); // 24시간마다 실행



client.once('ready', async () => {
    // 랜덤으로 새가 할 법한 일 중 하나 선택
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];

    // 상태 메시지 변경
    client.user.setPresence({
        activities: [{ name: randomActivity }],
        status: 'online',  // 봇 상태 (offline, idle, do not disturb, online)
    });
    console.log('Bot ready!');

    try {
        // zodiac.json 파일을 읽어서 데이터를 불러옵니다.
        const zodiacData = JSON.parse(await fs.readFile('./resources/jsons/zodiac.json', 'utf8'));
        const fortuneMessages = zodiacData["오늘의 운세"];  // 오늘의 운세 메시지 풀

        // 사용된 운세를 추적하는 배열
        let usedFortunes = [];

        // 각 별자리마다 운세를 뽑을 함수
        const getUniqueFortunes = () => {
            // 운세가 전부 다 사용되었다면, 다시 초기화
            if (usedFortunes.length === fortuneMessages.length) {
                usedFortunes = [];
            }

            // 운세를 섞어서 겹치지 않게 랜덤으로 선택
            let fortunesForZodiacs = {};
            const availableFortunes = [...fortuneMessages];  // 운세 메시지 복사본을 만듭니다.

            for (const zodiac in zodiacData) {
                if (zodiac !== "오늘의 운세") {
                    // 운세가 남아있는 경우, 하나씩 랜덤으로 고릅니다.
                    const randomIndex = Math.floor(Math.random() * availableFortunes.length);
                    const selectedFortune = availableFortunes.splice(randomIndex, 1)[0]; // 고른 운세는 삭제

                    fortunesForZodiacs[zodiac] = selectedFortune;
                }
            }

            return fortunesForZodiacs;
        };

        // 각 별자리마다 고유한 운세를 랜덤으로 뽑습니다.
        const fortunesForZodiacs = getUniqueFortunes();

        // 별자리 운세를 갱신합니다.
        const updatedZodiacData = { ...zodiacData };  // 복사본을 만듭니다.

        for (const zodiac in updatedZodiacData) {
            if (zodiac !== "오늘의 운세") {
                updatedZodiacData[zodiac].운세 = fortunesForZodiacs[zodiac];
            }
        }

        // zodiac.json 파일에 갱신된 내용 저장
        await fs.writeFile('./resources/jsons/zodiac.json', JSON.stringify(updatedZodiacData, null, 2), 'utf8');

        console.log('모든 별자리 운세가 업데이트되었습니다.');
    } catch (error) {
        console.error("운세 업데이트 중 오류가 발생했습니다:", error);
    }
});



client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
    const commands = [
        new SlashCommandBuilder().setName('hello').setDescription('안녕?'),
        new SlashCommandBuilder().setName('포춘쿠키').setDescription('포춘 쿠키를 한 개 엽니다, 하루에 세 개 까지만 열 수 있습니다.'),
        new SlashCommandBuilder().setName('오목눈이').setDescription('귀여운 오목눈이를 보여줍니다'),
        new SlashCommandBuilder().setName('고양이').setDescription('30% 확률로 고양이가 할큅니다'),
        new SlashCommandBuilder().setName('금붕어').setDescription('처럼 살고 싶다'),
        new SlashCommandBuilder().setName('뱁새').setDescription('하루 경고 API 어떻게 쓰는 건지 모르겠다 접두사가 겹처서 그런가?'),
        new SlashCommandBuilder().setName('점심').setDescription('ChatGPT 리서치를 기반으로 한 20~30대 한국인이 선호하는 메뉴를 추천합니다'),
        new SlashCommandBuilder().setName('저녁').setDescription('메뉴를 추천합니다, 점심 메뉴와 다른 풀을 사용합니다.'),
        new SlashCommandBuilder()
            .setName('물어')
            .setDescription('지정된 유저를 오목눈이가 물어 버립니다.')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('반복 언급할 대상')
                    .setRequired(true)
            )
            /* 시간 선택 기능 비활성화(항상 500ms)
            .addIntegerOption(option =>
                option.setName('time')
                    .setDescription('언급 간 반복 시간 (최소 500ms)')
                    .setRequired(true)
                    .setMinValue(500)  // 최소값 500ms
            )
                    */
            .addIntegerOption(option =>
                option.setName('count')
                    .setDescription('반복할 횟수 (최대 10회)')
                    .setRequired(true)
                    .setMaxValue(10)  // 최대 10회

            ),
        new SlashCommandBuilder().setName('물').setDescription('셀프입니다.'),
        new SlashCommandBuilder().setName('별자리').setDescription('사용자의 생일을 입력받고, 별자리를 보여주는 기능을 제공합니다.'),
        new SlashCommandBuilder()
            .setName('김재만')
            .setDescription('이모지를 삼각형/마름모 모양으로 출력합니다.')
            .addIntegerOption(option =>
                option.setName('count')
                    .setDescription('개수(최대 10회)')
                    .setRequired(true)
            ),

        // 모든 SlashCommand 여기에 추가!!
        new SlashCommandBuilder().setName('gui').setDescription('a test tool for gui'),
        new SlashCommandBuilder().setName('ping').setDescription('returns pong'),
        new SlashCommandBuilder().setName('t').setDescription('a tool for testing bot\'s health, returns \'est\''),
        new SlashCommandBuilder().setName('hangman').setDescription('incomplete version'),
        new SlashCommandBuilder().setName('hell').setDescription('world!'),

        // hello world 명령어 더 있는데 뺌, 정확한 목록은 hello.json 참고
        new SlashCommandBuilder().setName('파이썬').setDescription('Prints Hello, World! in Python'),
        new SlashCommandBuilder().setName('자바스크립트').setDescription('Prints Hello, World! in JavaScript'),
        new SlashCommandBuilder().setName('자바').setDescription('Prints Hello, World! in Java'),
        new SlashCommandBuilder().setName('c').setDescription('Prints Hello, World! in C'),
        new SlashCommandBuilder().setName('cpp').setDescription('Prints Hello, World! in C++'),
        new SlashCommandBuilder().setName('루비').setDescription('Prints Hello, World! in Ruby'),
        new SlashCommandBuilder().setName('ruby').setDescription('Prints Hello, World! in Ruby'),
        new SlashCommandBuilder().setName('php').setDescription('Prints Hello, World! in PHP'),
        new SlashCommandBuilder().setName('아희').setDescription('Prints Hello, World! in Aheui'),
        new SlashCommandBuilder().setName('엄랭').setDescription('Prints Hello, World! in umlang'),
        new SlashCommandBuilder().setName('zig').setDescription('Prints Hello, World! in Zig')
            .addStringOption(option =>
                option.setName('name').setDescription('Your name').setRequired(false)),
    ];

    const rest = new REST({ version: '10' }).setToken(token);


    try {
        console.log('Started refreshing application (/) commands.');

        // $봇 시작 시 고정 서버 주소(흰머리오목눈이)에 슬래쉬 명령어 등록, 개발 완료 후 디스코드 서버에 업로드하도록 변경 필요
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId), // guildId로 서버별 명령어 등록
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Failed to register slash commands:', error);
    }

});





// $handleCommand
// 명령어 처리 함수
async function handleCommand(command, userTag, interactionOrMessage) {
    try {
        // hello_world.json 파일 읽기
        const helloWorlddata = await fs.readFile('./resources/jsons/hello.json', 'utf-8');
        const helloWorldData = JSON.parse(helloWorlddata) || 'NONE';
        // userId 처리
        const isMessage = interactionOrMessage.content ? true : false; // message 객체를 확인
        const isCommand = interactionOrMessage.isCommand ? true : false;

        const userId = isMessage ? interactionOrMessage.author.id : interactionOrMessage.user.id; // userId 처리
        switch (command) {
            case 't':
                await interactionOrMessage.reply('est');
                break;

            case '안녕':
            case 'hi':
                await interactionOrMessage.reply(`반가워, ${userTag}!`);
                break;

            case 'hello':
            case 'hell':
                await interactionOrMessage.reply('world!');
                break;

            case 'ping':
                await interactionOrMessage.reply('Pong!');
                break;

            case '고양이':
                const cat = Math.random();
                if (cat <= 0.3) {
                    await interactionOrMessage.reply('크르렁');
                } else {
                    await interactionOrMessage.reply('야옹');
                }
                break;

            case '오목눈이':
                try {
                    console.log(galleryFolder);
                    const files = await fs.readdir(galleryFolder); // 비동기적으로 파일 목록을 읽어옵니다.

                    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

                    if (imageFiles.length === 0) {
                        await interactionOrMessage.reply('서버에 이미지가 없습니다!');
                        return;
                    }

                    const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
                    const imagePath = path.join(galleryFolder, randomImage);
                    await interactionOrMessage.reply({ files: [imagePath] });

                } catch (err) {
                    console.error('폴더 읽기 실패:', err);
                    await interactionOrMessage.reply('이미지 폴더를 읽을 수 없습니다.');
                }
                break;

            case '박영준':
            case '금붕어':
                const fish = Math.random();
                if (fish <= 0.1) {
                    await interactionOrMessage.reply('뻐끔');
                } else {
                    const numberOfEs = Math.floor(Math.random() * 200) + 5;
                    const messageContent = '끼' + '에'.repeat(numberOfEs) + '엑';
                    await interactionOrMessage.reply(messageContent);
                }
                break;

            case '뱁새':
                await interactionOrMessage.reply(`${userTag}가 오목눈이를 모독함!`);
                await interactionOrMessage.channel.send('하루야 물어!');
                // 이거 안 됨, 왜냐면 하루가 bot에 의한 메시지는 무시하기 때문이 아니고 
                // 커맨드 명령어(인터렉션)은 메시지 형태로 사용이 불가능.
                //await interactionOrMessage.channel.send(`!경고 @${userTag} 1 오목눈이는 뱁새가 아니야!`);
                break;

            case '김재만': {
                let num = 5; // 기본값 5
                // 슬래시 커맨드와 메시지 명령 구분
                if (interactionOrMessage.isCommand && interactionOrMessage.options) {
                    num = interactionOrMessage.options.getInteger('count') ?? 5;
                } else if (interactionOrMessage.content) {
                    const args = interactionOrMessage.content.split(' ');
                    if (args.length >= 2) {
                        const parsed = parseInt(args[1]);
                        if (!isNaN(parsed)) num = parsed;
                    }
                }
                if (num > 10) num = 10;
                if (num < 1) {
                    await interactionOrMessage.reply("⚠️ 1 미만의 수는 입력할 수 없습니다. ⚠️");
                    break;
                }

                // 이모지 풀에서 랜덤 선택 (여기서는 '#' 역할의 이모지를 emoji에 담음)
                const emojiPool1 = ['<:emojiName:1230152813993267272>', '<:emojiName:1343955543546527794>'];
                const emoji = emojiPool1[Math.floor(Math.random() * emojiPool1.length)];

                let result = "";

                if (num % 2 === 0) {
                    // 짝수: 삼각형 모양
                    let pattern = [];
                    if (num === 2) {
                        pattern = [1, 1];
                    } else {
                        let count = 0;
                        let row = 0;
                        while (true) {
                            if (count + (row + 1) > num) break;
                            pattern.push(row + 1);
                            count += (row + 1);
                            row++;
                        }
                        if (count < num) {
                            pattern[pattern.length - 1] += (num - count);
                        }
                    }
                    result = pattern.map(n => emoji.repeat(n)).join("\n");
                } else {
                    // 홀수: 다이아몬드 모양
                    let pattern = [];
                    if (num === 1) {
                        pattern = [1];
                    } else if (num === 3) {
                        // n=3: 3줄 모두 1개씩
                        pattern = [1, 1, 1];
                    } else {
                        // n>=5인 경우
                        // "기본 다이아몬드"는 3줄: [1, 2, 1]의 합이 4,
                        // 또는 5줄: [1,2,3,2,1]의 합이 9, 등으로 구성되는데,
                        // n가 5~8이면 floor(sqrt(n)) = 2, base diamond = [1,2,1] (합 4)
                        // n가 9~15이면 floor(sqrt(n)) = 3, base diamond = [1,2,3,2,1] (합 9)
                        // 그 외 n에 대해서도 floor(sqrt(n))를 base로 사용
                        let base = Math.floor(Math.sqrt(num));
                        if (base < 2) base = 2;
                        const baseSum = base * base; // 기본 다이아몬드의 합: (2*base - 1)행의 합은 base^2
                        const remainder = num - baseSum;
                        // 기본 다이아몬드 패턴: [1, 2, ..., base-1, base, base-1, ..., 2, 1]
                        for (let i = 1; i < base; i++) {
                            pattern.push(i);
                        }
                        pattern.push(base);
                        for (let i = base - 1; i >= 1; i--) {
                            pattern.push(i);
                        }
                        // 중간 행에 부족분(remainder)을 추가
                        const midIndex = Math.floor(pattern.length / 2);
                        pattern[midIndex] += remainder;
                    }
                    result = pattern.map(n => emoji.repeat(n)).join("\n");
                }

                await interactionOrMessage.reply(result);
                break;
            }



            // 언젠가 만들 기능
            case 'hangman':
                await hangman();
                break;

            case 'gui':
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('startButton')
                            .setLabel('Primary')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('successButton')
                            .setLabel('Success')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('dangerButton')
                            .setLabel('Danger')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('secondaryButton')
                            .setLabel('Secondary')
                            .setStyle(ButtonStyle.Secondary),
                    );

                await interactionOrMessage.reply({
                    content: '여기 여러 버튼이 있는 패널이 있습니다:',
                    components: [row], // 버튼 추가
                });
                break;

            case '야옹':
                await interactionOrMessage.reply('고양이!');
                break;

            // $점심, 저녁과 로직 동일
            case '점심':
                try {
                    const data = await fs.readFile('./resources/jsons/lunch.json', 'utf-8');
                    const menuData = JSON.parse(data);
                    const randomMenu = menuData[Math.floor(Math.random() * menuData.length)];

                    const menuName = randomMenu.name;
                    const recipe = randomMenu.recipe;

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('agree')
                                .setLabel('좋아')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('disagree')
                                .setLabel('싫어')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await interactionOrMessage.reply({
                        content: `${menuName}은(는) 어떠세요?`,
                        components: [row]
                    });

                    const filter = (i) => i.user.id === userId;
                    const collector = interactionOrMessage.channel.createMessageComponentCollector({ filter, time: 15000 });

                    collector.on('collect', async (i) => {
                        const disabledRow = i.message.components.map((row) => {
                            const actionRow = ActionRowBuilder.from(row);
                            actionRow.components.forEach((component) => {
                                component.setDisabled(true); // 모든 버튼 비활성화
                            });
                            return actionRow;
                        });

                        if (i.customId === 'agree') {
                            await i.update({
                                components: disabledRow // 버튼만 비활성화
                            });

                            // 새로운 메시지로 레시피 제공
                            await i.followUp({
                                content: `레시피: ${recipe}`
                            });
                            collector.stop('agree'); // 수집 종료 (이유: 'agree')

                        } else if (i.customId === 'disagree') {
                            // "싫어" 버튼 클릭 시: 메시지 유지, 버튼만 제거
                            await i.update({
                                components: disabledRow // 버튼만 비활성화
                            });

                            // 새로운 메뉴 추천
                            const newRandomMenu = menuData[Math.floor(Math.random() * menuData.length)]; // 여기서 다시 선언
                            const newRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('agree')
                                        .setLabel('좋아')
                                        .setStyle(ButtonStyle.Primary),
                                    new ButtonBuilder()
                                        .setCustomId('disagree')
                                        .setLabel('싫어')
                                        .setStyle(ButtonStyle.Danger)
                                );

                            // 새 메시지로 추천
                            await i.followUp({
                                content: `${newRandomMenu.name}은(는) 어떠세요?`,
                                components: [newRow]
                            });
                        }
                    });

                    collector.on('end', async (_, reason) => {
                        if (reason === 'time') {
                            await interactionOrMessage.editReply({
                                content: '시간 초과로 메뉴 선택이 종료되었습니다.',
                                components: [] // 버튼 제거
                            });
                        }
                    });

                } catch (err) {
                    console.error('menu.json 파일을 읽을 수 없습니다.', err);
                    await interactionOrMessage.reply('메뉴 파일을 읽을 수 없습니다.');
                }
                break;

            //$저녁, 점심과 로직 동일일 
            case '저녁':
                try {
                    const data = await fs.readFile('./resources/jsons/dinner.json', 'utf-8');
                    const menuData = JSON.parse(data);
                    const randomMenu = menuData[Math.floor(Math.random() * menuData.length)];

                    const menuName = randomMenu.name;
                    const recipe = randomMenu.recipe;

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('agree')
                                .setLabel('좋아')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('disagree')
                                .setLabel('싫어')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await interactionOrMessage.reply({
                        content: `${menuName}은(는) 어떠세요?`,
                        components: [row]
                    });

                    const filter = (i) => i.user.id === userId;
                    const collector = interactionOrMessage.channel.createMessageComponentCollector({ filter, time: 15000 });

                    collector.on('collect', async (i) => {
                        const disabledRow = i.message.components.map((row) => {
                            const actionRow = ActionRowBuilder.from(row);
                            actionRow.components.forEach((component) => {
                                component.setDisabled(true); // 모든 버튼 비활성화
                            });
                            return actionRow;
                        });

                        if (i.customId === 'agree') {
                            await i.update({
                                components: disabledRow // 버튼만 비활성화
                            });

                            // 새로운 메시지로 레시피 제공
                            await i.followUp({
                                content: `레시피: ${recipe}`
                            });
                            collector.stop('agree'); // 수집 종료 (이유: 'agree')

                        } else if (i.customId === 'disagree') {
                            // "싫어" 버튼 클릭 시: 메시지 유지, 버튼만 제거
                            await i.update({
                                components: disabledRow // 버튼만 비활성화
                            });

                            // 새로운 메뉴 추천
                            const newRandomMenu = menuData[Math.floor(Math.random() * menuData.length)]; // 여기서 다시 선언
                            const newRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('agree')
                                        .setLabel('좋아')
                                        .setStyle(ButtonStyle.Primary),
                                    new ButtonBuilder()
                                        .setCustomId('disagree')
                                        .setLabel('싫어')
                                        .setStyle(ButtonStyle.Danger)
                                );

                            // 새 메시지로 추천
                            await i.followUp({
                                content: `${newRandomMenu.name}은(는) 어떠세요?`,
                                components: [newRow]
                            });
                        }
                    });

                    collector.on('end', async (_, reason) => {
                        if (reason === 'time') {
                            await interactionOrMessage.editReply({
                                content: '시간 초과로 메뉴 선택이 종료되었습니다.',
                                components: [] // 버튼 제거
                            });
                        }
                    });

                } catch (err) {
                    console.error('menu.json 파일을 읽을 수 없습니다.', err);
                    await interactionOrMessage.reply('메뉴 파일을 읽을 수 없습니다.');
                }
                break;

            // $포춘 쿠키 기능, 포춘 쿠키 내용은 fortune.json 참고
            case '포춘쿠키':
            case '포춘':
            case 'fortune':
            case 'Fortune':
                if (!userFortuneCount.has(userId)) {
                    userFortuneCount.set(userId, 0);  // 사용 횟수 0으로 초기화
                }

                const remainingUses = DAILY_LIMIT - userFortuneCount.get(userId);  // 남은 횟수 계산

                if (remainingUses <= 0) {
                    await interactionOrMessage.channel.send("⏳ 오늘의 운세는 하루 3번까지만 볼 수 있어요! 내일 다시 시도해 주세요.");
                    return;  // 사용 횟수가 없으면 바로 종료
                }

                try {
                    const fortunedata = await fs.readFile('./resources/jsons/fortune.json', 'utf-8');
                    const fortuneData = JSON.parse(fortunedata);
                    const randomFortune = fortuneData[Math.floor(Math.random() * fortuneData.length)];

                    let remainingEmoji = '🥠'.repeat(remainingUses);  // 남은 횟수에 맞게 이모지 출력 (1회 사용했으므로 -1)

                    await interactionOrMessage.reply(remainingEmoji);  // 이모지 출력
                    await interactionOrMessage.channel.send(`${randomFortune.message}`);  // 운세 메시지 출력
                    userFortuneCount.set(userId, userFortuneCount.get(userId) + 1);  // 사용 횟수 증가


                } catch (error) {
                    console.error("fortune.json 파일을 읽는 중 오류 발생:", error);
                    await interactionOrMessage.reply("운세를 불러오는 중 오류가 발생했습니다. 나중에 다시 시도해주세요.");
                }
                break;

            // $물
            case '물':
                await interactionOrMessage.reply("**Self**");
                break;

            // $물어
            // 반복 멘션 기능, $멈춰로 누구나 중단 가능
            case '물어': {
                if (!isCommand) return; // 슬래시 커맨드에서만 동작

                const user = interactionOrMessage.options.getUser('user'); // 선택된 유저
                // const time = interactionOrMessage.options.getInteger('time'); // 반복 시간 (ms)
                const count = interactionOrMessage.options.getInteger('count'); // 반복 횟수
                const requesterID = interactionOrMessage.user.id; // 요청자 ID
                const requesterTag = interactionOrMessage.user.tag; // 요청자 태그

                if (!user) {
                    await interactionOrMessage.reply("유저를 선택해주세요.");
                    return;
                }

                if (count < 1 || count > 100) {
                    await interactionOrMessage.reply("반복 횟수는 1에서 100 사이여야 합니다.");
                    return;
                }

                // 쿨다운 체크: 기존 쿨다운 정보가 있으면 남은 시간을 확인
                const now = Date.now();
                const userData = userCooldowns.get(requesterID) || { count: 1, lastUsed: 0 };
                const cooldownDuration = fibonacci(userData.count) * 60 * 1000; // 피보나치 값(분) -> ms로 변환

                // 남은 시간을 초 단위로 계산
                if (now - userData.lastUsed < cooldownDuration) {
                    const remainingSeconds = Math.ceil((cooldownDuration - (now - userData.lastUsed)) / 1000);
                    await interactionOrMessage.reply(`⏳ ${requesterTag}님, ${remainingSeconds}초 기다리세요.`);
                    return;
                }

                // 쿨다운 적용: /물어 실행 시 쿨다운 단계 증가 및 업데이트 (중간에 $멈춰로 중단해도 적용)
                userCooldowns.set(requesterID, { count: userData.count + 1, lastUsed: now });

                // 메시지 수집기로 "$멈춰" 감지 (시간 제한은 충분히 길게 설정)
                let stopFlag = false;
                let stopperTag = "";
                const filter = msg => msg.content === "$멈춰";
                const collector = interactionOrMessage.channel.createMessageCollector({ filter, time: 60 * 60 * 1000 });

                collector.on('collect', msg => {
                    stopFlag = true;
                    stopperTag = msg.author.tag;
                    collector.stop();
                });

                // 반복 시작 알림
                // ${time} -> 500으로 하드코딩
                await interactionOrMessage.reply(`📢 ${requesterTag}님이 지정한 유저(${user.tag})를 500ms 간격으로 ${count}번 언급합니다.`);
                for (let i = 0; i < count; i++) {
                    if (stopFlag) {
                        await interactionOrMessage.channel.send(`⛔ ${stopperTag}님의 요청으로 반복이 중단되었습니다.`);
                        return;
                    }
                    // 항상 500ms 대기
                    await new Promise(resolve => setTimeout(resolve, 500));
                    // 반복 사이 최소 500ms 대기 (time 값보다 작으면 500ms 대기)
                    //await new Promise(resolve => setTimeout(resolve, Math.max(time, 500)));
                    await interactionOrMessage.channel.send(`<@${user.id}>`);
                }

                if (!stopFlag) {
                    await interactionOrMessage.channel.send(`✅ ${user.tag}님, 반복 언급이 종료되었습니다.`);
                }

                collector.stop();
                break;
            }

            // $별자리
            // * 슬래쉬 명령어는 modal 창을 띄울 수 있지만, 그냥 메시지는 인터렉션을 띄우지 못 하기 때문에(생일 입력창),
            // ** isMessage가 참일 경우, 빈 인터렉션을 띄우고 해당 인터렉션 창에서 Modal을 생성할 수 있는 줄 알았는데 없다 시발
            // *** 따라서, $별자리 일때의 처리와 /별자리일 때의 입력은 다르지만 처리는 같아야 한다.
            // **** 그러나 이것은 discord.js 자체의 한계로 불가능하고, 결국 case 문 안에 interaction 처리 서술 불가, client.on(interactioncreate)에 분리해서 작성함.
            case '별자리':
            case 'horoscope':
            case 'zodiac':
                if (openModals.has(userId)) {
                    await interactionOrMessage.reply("현재 생일 입력 모달이 열려있습니다. 잠시 후 다시 시도해주세요.");
                    return;
                }
                if (isMessage) {
                    if (!interactionOrMessage.replied) {
                        await interactionOrMessage.reply({
                            content: "생일을 입력해 주세요. (예: 1972-11-21)",
                            ephemeral: true
                        });
                    }

                    // openModals를 사용해 진행 중임을 기록
                    openModals.set(userId, Date.now());

                    // 메세지 컬렉터를 사용하여 사용자의 응답을 대기 (1분 제한)
                    const filter = m => m.author.id === userId;
                    const collector = interactionOrMessage.channel.createMessageCollector({ filter, time: 60000, max: 1 });

                    collector.on('collect', async (m) => {
                        const input = m.content.trim();
                        // 생일 형식 검증 (YYYY-MM-DD)
                        const regex = /^\d{4}-\d{2}-\d{2}$/;
                        if (!regex.test(input)) {
                            if (!m.replied) {
                                await m.reply("입력 형식이 올바르지 않습니다. 예: 1972-01-21 형식으로 입력해주세요.");
                            }
                            openModals.delete(userId);
                            return;
                        }
                        // 날짜 유효성 검사
                        const date = new Date(input);
                        if (isNaN(date.getTime())) {
                            if (!m.replied) {
                                await m.reply("입력한 날짜가 유효하지 않습니다.");
                            }
                            openModals.delete(userId);
                            return;
                        }

                        // getZodiacSign을 사용하여 별자리 계산
                        const zodiacSign = await getZodiacSign(input); // 별자리 계산


                        if (!zodiacSign) {
                            if (!m.replied) {
                                await m.reply("해당 날짜에 맞는 별자리를 찾을 수 없습니다.");
                            }
                            openModals.delete(userId);
                            return;
                        }

                        // 별자리 출력
                        if (!m.replied) {
                            await m.reply(`**별자리: ${zodiacSign.name}**\n\n` +
                                `**특징:** ${zodiacSign.traits}\n` +
                                `**운세:** ${zodiacSign.fortune}`);
                        }

                        // 모달 종료
                        openModals.delete(userId);
                    });
                    break;
                }

            // $밥줘 이건 어떡하지 하루처럼 간단한 AI로 대답하도록 하는 것도 재밌을듯
            case '밥줘':
                await interactionOrMessage.reply('몰?루');
                break;


            // $$ 이곳에 새 기능 추가 , / 명령어는 .reply 사용 시 주의 필요


            // $Hello World!
            // $$ 언어 별 Hello world 출력 기능, 자세한 내용은 hello.json 참고
            case '파이썬':
            case 'python':
                await interactionOrMessage.reply(`${helloWorldData.python}`);
                break;

            case '자바스크립트':
            case 'javascript':
                await interactionOrMessage.reply(`${helloWorldData.javascript}`);
                break;

            case '자바':
            case 'java':
                await interactionOrMessage.reply(`${helloWorldData.java}`);
                break;

            case '씨':
            case 'C':
            case 'c':
                await interactionOrMessage.reply(`${helloWorldData.c}`);
                break;

            case 'C++':
            case 'c++':
                await interactionOrMessage.reply(`${helloWorldData['c++']}`);
                break;

            case '루비':
            case 'ruby':
                await interactionOrMessage.reply(`${helloWorldData.ruby}`);
                break;

            case 'PHP':
                await interactionOrMessage.reply(`${helloWorldData.php}`);
                break;

            case 'Swift':
                await interactionOrMessage.reply(`${helloWorldData.swift}`);
                break;

            case 'Go':
            case 'go':
                await interactionOrMessage.reply(`${helloWorldData.go}`);
                break;

            case 'Rust':
                await interactionOrMessage.reply(`${helloWorldData.rust}`);
                break;

            case 'Kotlin':
                await interactionOrMessage.reply(`${helloWorldData.kotlin}`);
                break;

            case 'TypeScript':
                await interactionOrMessage.reply(`${helloWorldData.typescript}`);
                break;

            case 'Shell':
            case 'bash':
                await interactionOrMessage.reply(`${helloWorldData.shell}`);
                break;

            case 'Lua':
                await interactionOrMessage.reply(`${helloWorldData.lua}`);
                break;

            case 'Haskell':
                await interactionOrMessage.reply(`${helloWorldData.haskell}`);
                break;

            case 'Perl':
                await interactionOrMessage.reply(`${helloWorldData.perl}`);
                break;

            case 'Scala':
                await interactionOrMessage.reply(`${helloWorldData.scala}`);
                break;

            case 'R':
                await interactionOrMessage.reply(`${helloWorldData.r}`);
                break;

            case 'MATLAB':
                await interactionOrMessage.reply(`${helloWorldData.matlab}`);
                break;

            case 'Elixir':
                await interactionOrMessage.reply(`${helloWorldData.elixir}`);
                break;

            case 'Clojure':
                await interactionOrMessage.reply(`${helloWorldData.clojure}`);
                break;

            case 'Objective-C':
                await interactionOrMessage.reply(`${helloWorldData['objective-c']}`);
                break;

            case 'Assembly x86':
            case 'assembly_x86':
                await interactionOrMessage.reply(`${helloWorldData.assembly_x86}`);
                break;

            case 'Assembly MIPS':
            case 'assembly_mips':
                await interactionOrMessage.reply(`${helloWorldData.assembly_mips}`);
                break;

            case 'Brainfuck':
                await interactionOrMessage.reply(`${helloWorldData.brainfuck}`);
                break;

            case 'Malbolge':
                await interactionOrMessage.reply(`${helloWorldData.malbolge}`);
                break;

            case 'Whitespace':
                await interactionOrMessage.reply(`${helloWorldData.whitespace}`);
                break;

            case 'ELF':
                await interactionOrMessage.reply(`${helloWorldData.elf}`);
                break;

            case 'INTERCAL':
                await interactionOrMessage.reply(`${helloWorldData.intercal}`);
                break;

            case 'Piet':
                await interactionOrMessage.reply(`${helloWorldData.piet}`);
                break;

            case 'Befunge':
                await interactionOrMessage.reply(`${helloWorldData.befunge}`);
                break;

            case '아희':
            case 'Aheui':
                await interactionOrMessage.reply(`${helloWorldData.aheui}`);
                break;

            case '엄랭':
            case 'Umlang':
                await interactionOrMessage.channel.send(`가천대 컴퓨터공학과 10학번 엄준식 선배님 화이팅`);
                await interactionOrMessage.reply(`${helloWorldData.umlang}`);
                break;

            case 'Glossolalia':
                await interactionOrMessage.reply(`${helloWorldData.glossolalia}`);
                break;

            case 'Arrow':
                await interactionOrMessage.reply(`${helloWorldData.arrow}`);
                break;

            case 'VML':
                await interactionOrMessage.reply(`${helloWorldData.vml}`);
                break;

            case 'Shakespeare':
                await interactionOrMessage.reply(`${helloWorldData.shakespeare}`);
                break;

            case 'Rocks':
                await interactionOrMessage.reply(`${helloWorldData.rocks}`);
                break;

            case 'FALSE':
                await interactionOrMessage.reply(`${helloWorldData.FALSE}`);
                break;

            case 'Paradigms':
                await interactionOrMessage.reply(`${helloWorldData.paradigms}`);
                break;

            case 'Overtone':
                await interactionOrMessage.reply(`${helloWorldData.overtone}`);
                break;

            case 'Zig':
            case 'zig':
                await interactionOrMessage.reply(`${helloWorldData.zig}`);
                break;

        } // end of function

    } catch (error) {
        console.error('명령어 처리 중 오류 발생:', error);
        await interactionOrMessage.reply('명령어 처리 중 오류가 발생했습니다.');
    }
}

// messageCreate 이벤트
client.on('messageCreate', async (message) => {
    // 봇의 메시지는 무시
    if (message.author.bot) return;

    // 접두사로 시작하지 않으면 무시('$'), return 대신 prefix로 시작하는 메시지에만 반응하도록 해야 봇에 부하가 덜 감.
    if (!message.content.startsWith(prefix)) return;

    // 접두사 제거 후 명령어와 인자를 분리
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userTag = message.author.tag;

    // 공통된 명령어 처리 함수 호출
    await handleCommand(command, userTag, message);
});

// interactionCreate 이벤트, 현재 Case 문에서 별자리 기능 구현이 불가능하므로, 부득이하게 별자리 기능을 여기에 서술함.
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() && !interaction.isModalSubmit()) return;

    const userTag = interaction.user.tag;
    const commandName = interaction.commandName;
    const userId = interaction.user.id;


    // 슬래시 명령어로 모달 띄우기 (case문에서 구현해야 하는 내용)
    if (interaction.isCommand()) {
        if (commandName === '별자리') {
            if (openModals.has(userId)) {
                await interaction.reply("현재 생일 입력 모달이 열려있습니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            // interaction 객체에서만 showModal을 사용하도록 체크
            const birthdayModal = new ModalBuilder()
                .setCustomId('birthdayModal')
                .setTitle('생일 입력');

            const birthdayInput = new TextInputBuilder()
                .setCustomId('birthdayInput')
                .setLabel('생일을 입력해주세요 (YYYY-MM-DD)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('예: 1990-05-12')
                .setRequired(true);

            const modalRow = new ActionRowBuilder().addComponents(birthdayInput);
            birthdayModal.addComponents(modalRow);

            // 모달을 사용자에게 표시
            await interaction.showModal(birthdayModal);

            // 모달을 열었다는 기록 저장
            openModals.set(userId, Date.now());

            // 1분 후 모달 자동 종료
            setTimeout(async () => {
                if (openModals.has(userId)) {
                    openModals.delete(userId); // 모달 종료
                    if (!interaction.replied) {
                        await interaction.followUp("시간이 초과되었습니다. 생일을 다시 입력해주세요.");
                    }
                }
            }, 60000);
        }
        else {
            await handleCommand(commandName, userTag, interaction);
        }
    }

    // 모달 제출 처리
    if (interaction.isModalSubmit()) {
        const { customId } = interaction;
        const userId = interaction.user.id;

        if (customId === 'birthdayModal') {
            const birthday = interaction.fields.getTextInputValue('birthdayInput'); // 모달에서 입력된 값 가져오기

            // getZodiacSign 함수 호출
            const zodiacSign = await getZodiacSign(birthday);

            // 별자리 결과 출력
            if (zodiacSign) {
                await interaction.reply(`**별자리: ${zodiacSign.name}**\n\n` +
                    `**특징:** ${zodiacSign.traits}\n` +
                    `**운세:** ${zodiacSign.fortune}`);
            } else {
                await interaction.reply("해당 날짜에 맞는 별자리를 찾을 수 없습니다.");
            }

            // 모달 종료 후, 진행중 기록 삭제
            openModals.delete(userId);
        }
    }
});

// config.json에 있는 token 내용(token, clientid, guildid)를 읽어 와 로그인
client.login(token);
