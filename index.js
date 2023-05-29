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
// -----------------

let time;
let textMessage;

// Bot settings
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply(`Bot started!`);
});

bot.hears(/\мут (.+)/, async (ctx) => {
    const chatId = ctx.message.chat.id;
    const userId = ctx.message.reply_to_message.from.id;
    const userName = ctx.message.reply_to_message.from.first_name;
    const resp = ctx.match[1];
    minToUnix(resp);
    const untilDate = Math.floor((Date.now() + time) / 1000);

    const admin = Users.findOne({ auroraID: ctx.message.from.id });

    if (admin) {
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
});

bot.hears(/\размут/, async (ctx) => {
    const chatId = ctx.message.chat.id;
    const userId = ctx.message.reply_to_message.from.id;
    const userName = ctx.message.reply_to_message.from.first_name;

    const admin = await Users.findOne({ auroraID: ctx.message.from.id });

    if (admin) {
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
});

bot.hears(/\выпить чаю/, async (ctx) => {
    const chatId = ctx.message.chat.id;
    const userId = ctx.message.from.id;
    const userName = ctx.message.from.first_name;

    const drank = randomTea();

    let user = await Tea.findOne({ auroraID: userId });

    if (!user) {
        const tea = new Tea({
            auroraID: userId,
            total: drank
        });

        await tea.save();
    } else {
        await Tea.updateOne({ auroraID: userId }, { $inc: { total: drank } });
    }

    user = await Tea.findOne({ auroraID: userId });

    ctx.telegram.sendMessage(chatId, `🍵${userName}, <b>ты выпил(-а) ${drank} литров чая</b>.\n\n<i>Выпито всего - ${user.total} литров.</i>`, {
        parse_mode: 'HTML'
    });
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