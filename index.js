const express = require(`express`);
const app = express();
const { Telegraf } = require(`telegraf`);
const { message } = require(`telegraf/filters`);
require(`dotenv`).config();

const port = process.env.PORT || 3001;

app.listen(port, () => console.log(`Bot started!`));

// Mongoose
const mongoose = require(`mongoose`);
mongoose.connect(process.env.BD_TOKEN);

const Users = require(`./models/users`);
const Tea = require(`./models/tea`);
const Warns = require(`./models/warns`);
// -----------------

let time;
let textMessage;

// Bot settings
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply(`Bot started!`);
});

bot.hears(/\мут (.+)/, async (ctx) => {
    if (ctx.message.reply_to_message) {
        const chatId = ctx.message.chat.id;
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name;
        const resp = ctx.match[1];
        minToUnix(resp);
        const untilDate = Math.floor((Date.now() + time) / 1000);

        const admin = Users.findOne({ auroraID: ctx.message.from.id });

        if (admin && (admin.role == `owner` || admin.role == `deputy`)) {
            if (time) {
                ctx.telegram.sendMessage(chatId, `Участник <i>${userName}</i> [${userId}] <b>был обеззвучен 🔇 на ${time / 60000} минут администратором Хауса ${ctx.message.from.first_name}</b>. \n\n<i>Причина: ${textMessage}</i>`, {
                    parse_mode: 'HTML'
                });
            } else {
                ctx.telegram.sendMessage(chatId, `Участник <i>${userName}</i> [${userId}] <b>был обеззвучен 🔇 администратором Хауса ${ctx.message.from.first_name}</b>. \n\n<i>Причина: ${textMessage}</i>`, {
                    parse_mode: 'HTML'
                });
            }

            ctx.telegram.restrictChatMember(chatId, userId, {
                can_send_message: false,
                until_date: untilDate
            });
        } else {
            ctx.telegram.sendMessage(chatId, `❌<b>У вас нет полномочий на использование данной команды. Пожалуйста, обратитесь к администрации.</b>`, {
                parse_mode: 'HTML'
            });
        }
    }
});

bot.hears(/\размут/, async (ctx) => {
    if (ctx.message.reply_to_message) {
        const chatId = ctx.message.chat.id;
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name;

        const admin = await Users.findOne({ auroraID: ctx.message.from.id });

        if (admin && (admin.role == `owner` || admin.role == `deputy`)) {
            ctx.telegram.sendMessage(chatId, `✅Участник <i>${userName}</i> [${userId}] <b>получил право говорить в беседе.</b>\n\n<i>Пожалуйста, впредь не нарушайте правила Хауса😉</i>`, {
                parse_mode: 'HTML'
            });

            ctx.telegram.restrictChatMember(chatId, userId, {
                can_send_message: true,
                can_send_audios: true,
                can_send_documents: true,
                can_send_photos: true,
                can_send_videos: true,
                can_send_video_notes: true,
                can_send_voice_notes: true,
                can_send_polls: true,
                can_send_other_messages: true,
                can_add_web_page_previews: true
            });
        } else {
            ctx.telegram.sendMessage(chatId, `❌<b>У вас нет полномочий на использование данной команды. Пожалуйста, обратитесь к администрации.</b>`, {
                parse_mode: 'HTML'
            });
        }
    }
});

bot.hears(/\выпить чаю/, async (ctx) => {
    const chatId = ctx.message.chat.id;
    const userId = ctx.message.from.id;
    const userName = ctx.message.from.first_name;
    const thisTime = Math.floor(Date.now() / 1000);

    const drank = randomTea();

    let user = await Tea.findOne({ auroraID: userId });

    if (!user) {
        const tea = new Tea({
            username: userName,
            auroraID: userId,
            attempt: 1,
            untilDate: 0,
            total: drank
        });

        await tea.save();
    } else {
        if (user.attempt < 3 && thisTime >= user.untilDate) {
            await Tea.updateOne({ auroraID: userId }, { $set: { username: userName, untilDate: 0 } });
            await Tea.updateOne({ auroraID: userId }, { $inc: { total: drank, attempt: 1 } });

            user = await Tea.findOne({ auroraID: userId });
        
            ctx.telegram.sendMessage(chatId, `🍵${userName}, <b>ты выпил(-а) ${drank} литров чая</b>.\n\n<i>Выпито всего - ${user.total.toFixed(2)} литров.</i>`, {
                parse_mode: 'HTML'
            });
        } else if (user.attempt == 3) {
            const untilDate = Math.floor((Date.now() + 7200000) / 1000);

            await Tea.updateOne({ auroraID: userId }, { $set: { untilDate: untilDate, attempt: 0 } });

            let until = untilDate - thisTime;
            let hours = Math.floor(until / 3600);
            let minutes = Math.round(until / 120);

            ctx.telegram.sendMessage(chatId, `<b>❗Вы исчерпали свой лимит глотков чая.</b>\nСледующий глоток можно будет сделать через ${hours} часа 00 минут`, {
                parse_mode: 'HTML'
            }); 

        } else if (user.untilDate > 0) {
            let until = user.untilDate - thisTime;
            let hours = Math.floor(until / 3600);
            let minutes = Math.round(until / 120);

            if (hours == 1) {
                ctx.telegram.sendMessage(chatId, `<b>❗Вы исчерпали свой лимит глотков чая.</b>\nСледующий глоток можно будет сделать через ${hours} час ${minutes} минут`, {
                    parse_mode: 'HTML'
                });
            } else if (hours == 0) {
                ctx.telegram.sendMessage(chatId, `<b>❗Вы исчерпали свой лимит глотков чая.</b>\nСледующий глоток можно будет сделать через ${minutes} минут`, {
                    parse_mode: 'HTML'
                });
            } 
        }
    }

});

bot.hears(/\чайный топ/, async (ctx) => {
    const chatId = ctx.message.chat.id;
    let top = `<b>📊Статистика по количеству выпитого чая в чате</b>\n`;
    let total = 0;
    const teas = await Tea.find({}).sort({ total: -1 });

    for (let i = 0; i < teas.length; i++) {
        const tea = teas[i];
        total = total + Number(tea.total.toFixed(2));
        top += `\n${i+1}. <b>${tea.username}</b> - ${tea.total.toFixed(2)} литров`;
    }
    top += `\n\n<i>Всего литров выпито - ${total.toFixed(2)}</i>`;

    ctx.telegram.sendMessage(chatId, top, {
        parse_mode: 'HTML'
    });
});

bot.hears(/\варн (.+)/, async (ctx) => {
    warn(ctx);
})

bot.hears(/\вареник (.+)/, async (ctx) => {
    warn(ctx);
});

bot.hears(/\снять варны/, async (ctx) => {
    if (ctx.message.reply_to_message) {
        const chatId = ctx.message.chat.id;
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name;

        const admin = await Users.findOne({ auroraID: userId });

        if (admin) {
            await Warns.deleteOne({ auroraID: userId });
            ctx.telegram.sendMessage(chatId, `✅Администратор <i>${ctx.message.from.first_name}</i> <b>снял все предупреждения с участника Хауса - ${userName}</b>`, {
                parse_mode: 'HTML'
            });
        } else {
            ctx.telegram.sendMessage(chatId, `❌<b>У вас нет полномочий на использование данной команды. Пожалуйста, обратитесь к администрации.</b>`, {
                parse_mode: 'HTML'
            });
        }
    }
});

bot.hears(/\изнасиловать/, (ctx) => {
    if (ctx.message.reply_to_message) {
        const chatId = ctx.message.chat.id;
        const userName = ctx.message.reply_to_message.from.first_name;
        const ispName = ctx.message.from.first_name;

        ctx.telegram.sendMessage(chatId, `🥵 | <b>${ispName}</b> жеско изнасиловал(-а) <b>${userName}</b>`, {
            parse_mode: 'HTML'
        });
    }
})

bot.on(message('text'), (ctx) => {
    const chatId = ctx.message.chat.id;
    const text = ctx.message.text;

    if (text == `бот` || text == `Бот`) {
        ctx.telegram.sendMessage(chatId, `✅Бот на месте!`)
    }
});


bot.launch();
// ---------------------

// STOP
process.once('SIGINT', () => {
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
});
// -------------------------

// Functions
function minToUnix(resp) {
    if (resp.includes('10м') || resp.includes('15м')) {
        time = Number(resp.slice(0, 2) * 60000);
        textMessage = resp.slice(4);
    } else if (resp.includes('5м')) {
        time = Number(resp.slice(0, 1) * 60000);
        textMessage = resp.slice(3);
    } else {
        textMessage = resp;
    }
}

function randomTea(){
    let drink = Math.random() * 10;
    return drink.toFixed(2);
}

async function warn(ctx){
    if (ctx.message.reply_to_message) {
        const chatId = ctx.message.chat.id;
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name;
        const resp = ctx.match[1];

        const admin = await Users.findOne({ auroraID: ctx.message.from.id });

        if (admin && (admin.role == `owner` || admin.role == `deputy`)) {
            let user = await Warns.findOne({ auroraID: userId });

            if (!user) {
                const warn = new Warns({
                    username: userName,
                    auroraID: userId,
                    total: 1
                });

                await warn.save();
            } else {
                await Warns.updateOne({ auroraID: userId }, { $inc: { total: 1 } });
            }

            user = await Warns.findOne({ auroraID: userId });

            if (user.total <= 5) {
                ctx.telegram.sendMessage(chatId, `❗Участник <i>${userName}</i> [${userId}] <b>получил ${user.total}</b> предупреждение из 6.\nВыдано администратором Хауса ${ctx.message.from.first_name}\n\n<i>Причина: ${resp}</i>`, {
                    parse_mode: 'HTML'
                });
            } else if (user.total = 6) {
                ctx.telegram.banChatMember(chatId, userId);
                ctx.telegram.sendMessage(chatId, `⛔Участник <i>${userName}</i> [${userId}] <b>был исключен из Хауса с последующим занесением в Черный список администратором ${ctx.message.from.first_name}</b>\n\n<i>Причина: Превышено количество предупреждений</i>`, {
                    parse_mode: 'HTML'
                });

                await Warns.deleteOne({ auroraId: userId });
            }
        } else {
            ctx.telegram.sendMessage(chatId, `❌<b>У вас нет полномочий на использование данной команды. Пожалуйста, обратитесь к администрации.</b>`, {
                parse_mode: 'HTML'
            });
        }
    }
}

app.get(`/`, (req, res) => {
    res.send(`Bot launched successfully.`);
});