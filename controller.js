const Delmess = require('./models/delmess');
let delmess;
let counter = 1;

class controller {
    async delmsg (ctx, chatId, msgId, channelName) {
        await ctx.telegram.deleteMessage(chatId, msgId);

        if (!delmess) {
            delmess = await Delmess.find().sort({ msgId: -1 }).limit(1);

            try {
                setTimeout(() => {
                    delmess = null;
                    this.msgDeleted(ctx, chatId, channelName);
                }, 1200);
            } catch (e) {
            
            }
        } 
    }

    async msgDeleted (ctx, chatId, channelName) {
        if (!delmess && counter != 0) {
            ctx.telegram.sendMessage(chatId, `<b>❌Сообщения из телеграм-канала ${channelName} запрещены в данном чате по правилам Хауса.</b>\n\n<i>Сообщение было удалено.</i>`, {
                parse_mode: 'HTML'
            });
            await Delmess.deleteMany();
            counter--;
        }
    }
}


module.exports = new controller()