const express = require(`express`);
const app = express();
const { Telegraf } = require(`telegraf`);
const { message } = require(`telegraf/filters`);
require(`dotenv`).config();

const port = Number(process.env.PORT) + 1;

app.listen(port, () => console.log(`Bot launched successfully.`));

const bot = new Telegraf(process.env.CHAT_BOT_TOKEN);

// Mongoose
const mongoose = require(`mongoose`);
mongoose.connect(process.env.BD_TOKEN);

const Black = require(`./models/black`);
const Users = require(`./models/users`);
const Ankets = require(`./models/ankets`);
// --------

bot.command('start', async (ctx) => {
    const chatId = ctx.message.chat.id;
    const userId = ctx.message.from.id;
    const userName = ctx.message.from.first_name;

    const user = await Black.findOne({ userId: userId });

    if (!user && chatId != process.env.AURORA_TEAM_CHAT_ID && chatId != process.env.ADMIN_CHAT_ID) {
        ctx.telegram.sendMessage(chatId, `
        <b>Здравствуйте, ${userName}👋</b>\nВас приветствует ${ctx.botInfo.first_name} для обратной связи с администрацией AURORA TEAM. Здесь Вы можете обратиться по любому вопросу или попасть в Хаус.\n\nℹЧтобы начать анкетирование, нажмите на кнопку "Вступить в Хаус", которая появится ниже.\n\n<i>‼Важно: Анкеты, содержание которых носит оскорбительный характер, или не имеет никакого отношения к анкетированию, рассмотрению не подлежат и будут отклонены администрацией Хауса.</i>`, {
            parse_mode: 'HTML'
        });

        ctx.telegram.sendMessage(chatId, `✨Для того, чтобы начать заполение анкеты, пожалуйста, нажмите на кнопку ниже. \n\nВажно: Пожалуйста, нажмите на кнопку только 1 раз!`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: "Начать заполнение анкеты",
                        callback_data: "anketa"
                    }]
                ]
            },
            parse_mode: 'HTML'
        });
    } else if (user) {
        ctx.telegram.sendMessage(chatId, `❌Вы находитесь в Черном списке Хауса и потенциально опасных пользователей.\n\nДоступ к чат-боту <b>запрещен</b>.`, {
            parse_mode: 'HTML'
        });
    }
});

bot.on('callback_query', async (ctx) => {
    const chatId = ctx.callbackQuery.message.chat.id;
    const msgId = ctx.callbackQuery.message.message_id;
    const msgText = ctx.callbackQuery.message.text;
    const data = ctx.callbackQuery.data;
    const userId = ctx.callbackQuery.from.id;
    const userName = ctx.callbackQuery.from.first_name;
    const queryId = ctx.callbackQuery.id;
    
    const user = await  Ankets.findOne({ userId: userId });
    
    if (data == `anketa` && !user) {
        ctx.telegram.sendMessage(chatId, `✅<b>Готовим форму для заполнения анкеты!</b>\n<i>Пожалуйста, заполняйте форму внимательно и без ошибок, иначе бот отклонит Вашу анкету и Вы не сможете перезаполнить анкету.</i>\n\n💌В ответах не должно быть стикеров, фото, видео и GIF-картинок.`, {
            parse_mode: 'HTML'
        });

        let question = `💌Вопрос || 1\n\nВведите Ваше имя.`;

        const user = new Ankets({
            userId: userId,
            question: 1
        });

        await user.save();

        setTimeout(async () => {
            ctx.telegram.sendMessage(chatId, question);
        }, 5000);
    } else if (data == `anketa` && user) {
        ctx.telegram.answerCbQuery(queryId, `⛔Вы уже заполняли анкету!`);
    }
    
    if (data.includes(`accept`)) {
        const anketaId = data.slice(7);
        const admin = await Users.findOne({ auroraID: userId });
        
        if (admin && (admin.role == `owner` || admin.role == `deputy`)) {
            await Ankets.updateOne({ userId: anketaId }, { $set: { status: `Одобрено` } });

            const auroraChat = process.env.AURORA_TEAM_CHAT_ID;
            const joinLink = await ctx.telegram.createChatInviteLink(auroraChat, {
                member_limit: 1
            });

            let messageText = msgText.slice(0, -49);
            messageText += `\n✅Анкета была <b>одобрена</b>`;

            ctx.telegram.editMessageReplyMarkup(chatId, msgId);
            ctx.telegram.editMessageText(chatId, msgId, undefined, messageText, {
                parse_mode: 'HTML'
            });

            ctx.telegram.sendPhoto(anketaId, `https://em-content.zobj.net/socialmedia/apple/81/party-popper_1f389.png`, {
                caption: `🎉Поздравляем! <b>Ваша анкета была одобрена Администратором Хауса</b> - ${userName}.\nВы приняты в AURORA TEAM. Ждем Вас с нетерпением в нашем уютном чате!\n\n<i>Пожалуйста, вступите в чат для участников Хауса по кнопке ниже:</i>`,
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: "💎AURORA TEAM💎",
                            url: `${joinLink.invite_link}`
                        }]
                    ]
                },
                parse_mode: 'HTML'
            });
        } else {
            ctx.telegram.answerCbQuery(queryId, `❌У вас нет полномочий на использование данной команды.`);
        }
    } else if (data.includes(`decline`)) {
        const anketaId = data.slice(8);
        const admin = await Users.findOne({ auroraID: userId });

        if (admin && (admin.role == `owner` || admin.role == `deputy`)) {

            let messageText = msgText.slice(0, -49);
            messageText += `\n<i>ℹУкажите причину отказа:</i>`;

            ctx.telegram.editMessageText(chatId, msgId, undefined, messageText, {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: "🔞Несоответствие возрасту",
                            callback_data: "notage_" + anketaId
                        }],
                        [{
                            text: "❌Анкета не заполнена",
                            callback_data: "noanket_" + anketaId
                        }],
                        [{
                            text: "⛔Черный список Хауса",
                            callback_data: "blacklist_" + anketaId
                        }]
                    ]
                },
                parse_mode: 'HTML'
            });

        } else {
            ctx.telegram.answerCbQuery(queryId, `❌У вас нет полномочий на использование данной команды.`);
        }

    } else if (data.includes(`notage`)) {
        const anketaId = data.slice(7);
        const admin = await Users.findOne({ auroraID: userId });

        if (admin && (admin.role == `owner` || admin.role == `deputy`)) {
            await Ankets.updateOne({ userId: anketaId }, { $set: { status: `Отклонено` } });

            let messageText = msgText.slice(0, -49);
            messageText += `\n\n⛔Анкета была <b>отклонена</b>.`;

            ctx.telegram.editMessageReplyMarkup(chatId, msgId);
            ctx.telegram.editMessageText(chatId, msgId, undefined, messageText, {
                parse_mode: 'HTML'
            });
            
            ctx.telegram.sendPhoto(anketaId, `https://em-content.zobj.net/socialmedia/apple/81/cross-mark_274c.png`, {
                caption: `❌К сожалению, <b>Вы нам не подходите из-за возрастных ограничений</b>. Ваш возраст должен быть <i>от 11 до 15 лет включительно</i>.\nВы больше не можете заполнить анкету, однако если Вы не согласны с решением администрации или это произошло ошибочно, то Вы можете обратиться в чат для подписчиков по кнопке ниже\n\n<i>ℹВаша анкета была проверена Администратором Хауса - ${userName}</i>`,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: "💌Чат для подписчиков",
                            url: "https://t.me/+12XF5x1u-gc1MDAy"
                        }]
                    ]
                }
            });
        } else {
            ctx.telegram.answerCbQuery(queryId, `❌У вас нет полномочий на использование данной команды.`);
        }

    } else if (data.includes(`noanket`)) {
        const anketaId = data.slice(8);
        const admin = await Users.findOne({ auroraID: userId });

        if (admin && (admin.role == `owner` || admin.role == `deputy`)) {
            await Ankets.updateOne({ userId: anketaId }, { $set: { status: `Отклонено` } });

            let messageText = msgText.slice(0, -49);
            messageText += `\n\n⛔Анкета была <b>отклонена</b>.`;

            ctx.telegram.editMessageReplyMarkup(chatId, msgId);
            ctx.telegram.editMessageText(chatId, msgId, undefined, messageText, {
                parse_mode: 'HTML'
            });

            const black = new Black({
                userId: anketaId,
                reason: `Некорректно заполненная анкета`
            });

            await black.save();
            
            ctx.telegram.sendPhoto(anketaId, `https://em-content.zobj.net/socialmedia/apple/81/cross-mark_274c.png`, {
                caption: `❌Администрация Хауса <b>посчитала Вашу анкету некорректно заполненную, Вам запрещен вход в AURORA TEAM</b>.\nВы больше не можете заполнить анкету, однако если Вы не согласны с решением администрации или это произошло ошибочно, то Вы можете обратиться в чат для подписчиков по кнопке ниже\n\n<i>ℹВаша анкета была проверена Администратором Хауса - ${userName}</i>`,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: "💌Чат для подписчиков",
                            url: "https://t.me/+12XF5x1u-gc1MDAy"
                        }]
                    ]
                }
            });
        } else {
            ctx.telegram.answerCbQuery(queryId, `❌У вас нет полномочий на использование данной команды.`);
        }
    } else if (data.includes(`blacklist`)) {
        const anketaId = data.slice(10);
        const admin = await Users.findOne({ auroraID: userId });

        if (admin && (admin.role == `owner` || admin.role == `deputy`)) {
            await Ankets.updateOne({ userId: anketaId }, { $set: { status: `Отклонено` } });

            let messageText = msgText.slice(0, -49);
            messageText += `\n\n⛔Анкета была <b>отклонена</b>.`;

            ctx.telegram.editMessageReplyMarkup(chatId, msgId);
            ctx.telegram.editMessageText(chatId, msgId, undefined, messageText, {
                parse_mode: 'HTML'
            });

            const black = new Black({
                userId: anketaId,
                reason: `Черный список Хауса`
            });

            await black.save();
            
            ctx.telegram.sendPhoto(anketaId, `https://em-content.zobj.net/socialmedia/apple/81/cross-mark_274c.png`, {
                caption: `❌<b>Вы находитесь в Черном списке Хауса</b>. Доступ к чатам AURORA TEAM и чат-боту <i>запрещен</i>.\n\n<i>ℹВаша анкета была проверена Администратором Хауса - ${userName}</i>`,
                parse_mode: 'HTML'
            });
        } else {
            ctx.telegram.answerCbQuery(queryId, `❌У вас нет полномочий на использование данной команды.`);
        }
    }
});

bot.on(message('text'), async (ctx) => {
    const chatId = ctx.message.chat.id;
    const userId = ctx.message.from.id;

    const user = await Ankets.findOne({ userId: userId });

    if (chatId != process.env.AURORA_TEAM_CHAT_ID && chatId != process.env.ADMIN_CHAT_ID) {
        if (user.question == 1) {
            let name = ctx.message.text;
            let question = `💌Вопрос || 2\n\nВведите Ваш возраст.`;
    
            await Ankets.updateOne({ userId: userId }, { $set: { question: 2, name: name } });
            ctx.telegram.sendMessage(chatId, question);
    
        } else if (user.question == 2) {
            if (!isNaN(ctx.message.text)) {
                let age = ctx.message.text;
                let question = `💌Вопрос || 3\n\nНа сколько Вы готовы проявлять активность в нашем Хаусе?`;
    
                await Ankets.updateOne({ userId: userId }, { $set: { question: 3, age: age } });
                ctx.telegram.sendMessage(chatId, question);
    
            } else {
                ctx.telegram.sendMessage(chatId, `<b>❌Введеный ответ является некорректным. Пожалуйста, введите возраст цифрами.</b>`, {
                    parse_mode: 'HTML'
                });
            }
    
        } else if (user.question == 3) {
            let activity = ctx.message.text;
            let question = `💌Вопрос || 4\n\nВведите Ваш ник в TikTok.`;
    
            await Ankets.updateOne({ userId: userId }, { $set: { question: 4, activity: activity } });
            ctx.telegram.sendMessage(chatId, question);
        } else if (user.question == 4) {
            let tiktok = ctx.message.text;
            let question = `💌Вопрос || 5\n\nВведите Ваш ник в Roblox.`;
    
            await Ankets.updateOne({ userId: userId }, { $set: { question: 5, tiktok: tiktok } });
            ctx.telegram.sendMessage(chatId, question);
        } else if (user.question == 5) {
            let roblox = ctx.message.text;
            let question = `💌Вопрос || 6\n\nВведите Ваш стиль скина.`;
    
            await Ankets.updateOne({ userId: userId }, { $set: { question: 6, roblox: roblox } });
            ctx.telegram.sendMessage(chatId, question);
        } else if (user.question == 6) {
            let skin = ctx.message.text;
            let question = `💌Вопрос || 6\n\nВведите Вашу марку телефона.`;
    
            await Ankets.updateOne({ userId: userId }, { $set: { question: 7, skin: skin } });
            ctx.telegram.sendMessage(chatId, question);
        } else if (user.question == 7) {
            let phone = ctx.message.text;
            let question = `💌Вопрос || 7\n\nПочему Вы решили выбрать именно нашу команду?`;
    
            await Ankets.updateOne({ userId: userId }, { $set: { question: 8, phone: phone } });
            ctx.telegram.sendMessage(chatId, question);
        } else if (user.question == 8) {
            let whyus = ctx.message.text;
    
            await Ankets.updateOne({ userId: userId }, { $set: { whyus: whyus, status: `На рассмотрении`, question: 0 } });
            ctx.telegram.sendMessage(chatId, `✅<b>Поздравляем, Ваша анкета успешно заполнена и отправлена</b> администраторам Хауса для дальнейшего рассмотрения.\n\n<i>О результатах рассмотрения мы сообщим Вам в этом чате, пожалуйста, не удаляйте переписку с данным ботом.</i>`, {
                parse_mode: 'HTML'
            });
    
            sendToAdmins(ctx, userId);
        }
    }
});

bot.launch();

app.get(`/`, (req, res) => {
    res.send(`Bot launched successfully!`);
});

async function sendToAdmins(ctx, userId) {
    const adminChatId = process.env.ADMIN_CHAT_ID;

    const anketa = await Ankets.findOne({ userId: userId });

    ctx.telegram.sendMessage(adminChatId, `❗<b>В базу данных поступила новая анкета:</b>\n\nИмя: <a href="tg://user?id=${anketa.userId}">${anketa.name}</a>\nВозраст: ${anketa.age}\nАктивность: ${anketa.activity}\nTikTok: ${anketa.tiktok}\nRoblox: ${anketa.roblox}\nСтиль скина: ${anketa.skin}\nМарка телефона: ${anketa.phone}\nПочему решили выбрать нас: ${anketa.whyus}\n\n<i>Выберите, что Вы хотите сделать с данной анкетой:</i>`, {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: "❌Отклонить",
                    callback_data: "decline_" + anketa.userId
                }, {
                    text: "✅Принять",
                    callback_data: "accept_" + anketa.userId
                }]
            ]
        },
        parse_mode: 'HTML'
    });
}

process.once('SIGINT', () => {
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    bor.stop('SIGTERM');
});