const express = require(`express`);
const app = express();
const { Telegraf } = require(`telegraf`);
const { message } = require(`telegraf/filters`);
require(`dotenv`).config();

const port = process.env.PORT;

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
let msgId;

// Bot settings
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply(`Bot started!`);
});

bot.hears(/\.мут (.+)/, async (ctx) => {
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

bot.hears(/\.размут/, async (ctx) => {
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
        
            ctx.telegram.sendMessage(chatId, `🍵<a href="tg://user?id=${userId}">${userName}</a>, <b>ты выпил(-а) ${drank} литров чая</b>.\n\n<i>Выпито всего - ${user.total.toFixed(2)} литров.</i>`, {
                parse_mode: 'HTML'
            });

            if (user.attempt == 3) {
                const untilDate = Math.floor((Date.now() + 7200000) / 1000);

                await Tea.updateOne({ auroraID: userId }, { $set: { untilDate: untilDate, attempt: 0 } });

                let until = untilDate - thisTime;
                let hours = Math.floor(until / 3600);
                let minutes = Math.round(until / 120);

                ctx.telegram.sendMessage(chatId, `<b>❗Вы исчерпали свой лимит глотков чая.</b>\nСледующий глоток можно будет сделать через ${hours} часа 00 минут`, {
                    parse_mode: 'HTML'
                }); 

            }
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
        top += `\n${i+1}. ${tea.username} - ${tea.total.toFixed(2)} литров`;
    }
    top += `\n\n<i>Всего литров выпито - ${total.toFixed(2)}</i>`;

    ctx.telegram.sendMessage(chatId, top, {
        parse_mode: 'HTML'
    });
});

bot.hears(/\.варн (.+)/, async (ctx) => {
    warn(ctx);
})

bot.hears(/\.вареник (.+)/, async (ctx) => {
    warn(ctx);
});

bot.hears(/\.снять варны/, async (ctx) => {
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

bot.hears(/\/send/, async (ctx) => {
    if (ctx.message.reply_to_message && ctx.message.text == `/send`) {
        const chatId = -1001482254693;
        const resp = ctx.message.reply_to_message.text;

        const admin = await Users.findOne({ auroraID: ctx.message.from.id });

        if (admin && (admin.role == `owner` || admin.role == `deputy`)) {
            ctx.telegram.sendMessage(chatId, resp);
        } else {
            ctx.telegram.sendMessage(chatId, `❌<b>У вас нет полномочий на использование данной команды. Пожалуйста, обратитесь к администрации.</b>`, {
                parse_mode: 'HTML'
            });
        }
    }
});

bot.hears(/\.бан (.+)/, async (ctx) => {
    if (ctx.message.reply_to_message) {
        const chatId = ctx.message.chat.id;
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name;
        const resp = ctx.match[1];

        const admin = await Users.findOne({ auroraID: ctx.message.from.id });

        if (admin && (admin.role == `owner` || admin.role == `deputy`)) {
            if (userId != admin.auroraID) {
                ctx.telegram.banChatMember(chatId, userId);

                ctx.telegram.sendMessage(chatId, `⛔Участник <i>${userName}</i> [${userId}] <b>был исключен с последующим занесением в Черный список Хауса.</b>\nВыдано администратором Хауса - ${ctx.message.from.first_name}\n\n<i>Причина: ${resp}</i>`, {
                    parse_mode: 'HTML'
                });
            } else {
                ctx.telegram.sendMessage(chatId, `<b>❌Вы не можете исключить пользователя, состоящего в Администрации чата. Пожалуйста, обратитесь к Создателю Хауса.</b>`, {
                    parse_mode: 'HTML'
                })
            }
        } else {
            ctx.telegram.sendMessage(chatId, `❌<b>У вас нет полномочий на использование данной команды. Пожалуйста, обратитесь к администрации.</b>`, {
                parse_mode: 'HTML'
            });
        }
    }
});

bot.hears(/\/pin/, async (ctx) => {
    if (ctx.message.reply_to_message) {
        const chatId = -1001482254693;
        const text = ctx.message.reply_to_message.text;

        const messageId = msgId + 1;

        const admin = await Users.findOne({ auroraID: ctx.message.from.id});

        if (admin && admin.role == `owner`) {
            ctx.telegram.sendMessage(chatId, text);
            ctx.telegram.pinChatMessage(chatId, messageId);
        }
    }
});

bot.hears(/\.закрепб/, async (ctx) => {
    if (ctx.message.reply_to_message) {
        const chatId = -1001482254693;
        const text = ctx.message.reply_to_message.text;

        const messageId = ctx.message.reply_to_message.message_id;
        const admin = await Users.findOne({ auroraID: ctx.message.from.id });

        if (admin && (admin.role == `owner` || admin.role == `deputy`)) {
            ctx.telegram.pinChatMessage(chatId, messageId, {
                disable_notification: true
            });
        } else {
            ctx.telegram.sendMessage(chatId, `❌<b>У вас нет полномочий на использование данной команды. Пожалуйста, обратитесь к администрации.</b>`, {
                parse_mode: 'HTML'
            });
        }
    }
});

bot.command('staff', async (ctx) => {
    const chatId = ctx.message.chat.id;
    const admins = await Users.find({});

    let owner;
    let deputies = [];
    let spectator;

    let adminList = `<b>АДМИНИСТРАЦИЯ ХАУСА</b>\n\n`;

    for (let i = 0; i < admins.length; i++) {
        let admin = admins[i];

        if (admin.role == `owner`) {
            owner = admin;
        } else if (admin.role == `deputy`) {
            deputies.push(admin);
        } else if (admin.role == `spectator`) {
            spectator = admin;
        }
    }

    const ownerRole = await ctx.telegram.getChatMember(chatId, owner.auroraID);
    const deputyRole = await ctx.telegram.getChatMember(chatId, deputies[0].auroraID);

    adminList += `👑<b>Создатель Хауса</b>\n└ ${owner.name} » <i>${ownerRole.custom_title}</i>\n\n👮⚜Заместители\n└ ${deputies[0].name} » <i>${deputyRole.custom_title}</i>\n\n👮‍♂️Следящий Хауса\n└ ${spectator.name}`;

    ctx.telegram.sendMessage(chatId, adminList, {
        parse_mode: 'HTML'
    });
});

bot.on('new_chat_member', async (ctx) => {
    const chatId = ctx.message.chat.id;
    const userId = ctx.message.new_chat_members[0].id;
    const userName = ctx.message.new_chat_members[0].first_name;
    const chat = await ctx.telegram.getChat(chatId);
  
    if (!ctx.message.new_chat_members[0].is_bot) {
        ctx.telegram.sendMessage(
            chatId,
            `<b>Привет, <a href="tg://user?id=${userId}">${userName}</a>, добро пожаловать в ${chat.title}</b>\n\nДобро пожаловать в нашу команду!\nПожалуйста, ознакомься с правилами нашего Хауса. Со всеми вопросами ты всегда можешь обратиться к нашим многоуважаемым администраторам. \n\n<i>Надеемся, что тебе тут будет комфортно и весело❤</i>`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "ℹПравила Хауса",
                      url: "https://rbxaurora.github.io/for-members/rules.html"
                    },
                  ],
                ],
              },
              parse_mode: 'HTML'
            }
          );
    }
});
  
bot.on('left_chat_member', async (ctx) => {
    const chatId = ctx.message.chat.id;
    const userId = ctx.message.left_chat_member.id;
    const userName = ctx.message.left_chat_member.first_name;
  
    ctx.telegram.sendMessage(
      chatId,
      `🙅🏿‍♂️ <a href="tg://user?id=${userId}">${userName}</a> покинул(-а) чат.`,
      {
        parse_mode: 'HTML',
      }
    );
});

bot.on(message('text'), (ctx) => {
    const chatId = ctx.message.chat.id;
    const text = ctx.message.text.toLowerCase();
    
    if (chatId == -1001482254693) {
        msgId = ctx.message.message_id;
    }

    if (text == `бот`) {
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