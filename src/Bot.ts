import { Client, Intents, GuildTextBasedChannel, Message } from "discord.js";
import { readFileSync, writeFileSync } from "fs";
import {token} from "./config.json"

interface Stats {
    name: string;
    id: string;
    count: number;
}


function updateStats(message: Message) {
    let rawdata = readFileSync("stats.json");
    let data = JSON.parse(rawdata.toString()) as Array<Stats>;

    const index = data.findIndex(s => {
        return s.id === message.author.id;
    });
    if(index !== -1) {
        let s = data.at(index)!;
        s.count = s?.count + 1;
        data[index] = s;
    } else {
        let s: Stats = {
            name: message.author.username,
            id: message.author.id,
            count: 1
        }
        data.push(s);
    }

    const toFile = JSON.stringify(data);
    writeFileSync("stats.json", toFile)
}

async function fetchAllMessages(channel: GuildTextBasedChannel): Promise<Array<Message>> {
    let messages: Array<Message> = [];

    let message = await channel.messages.fetch({limit: 1})
    .then(messgePage => (messgePage.size == 1 ? messgePage.at(0): null));

    while(message) {
        await channel.messages.fetch({limit: 100, before: message.id})
        .then(messagePage => {
            messagePage.forEach(msg => messages.push(msg))
            message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
        })
    }

    return messages;
}

const bot = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES]
});

bot.on('ready', ()=> {
    console.log(`Bot ${bot.user?.tag} is logged in!`);
});

bot.on('messageCreate', (message) => {
    if(message.content.toLocaleLowerCase() == "!stats") {
        let rawdata = readFileSync("stats.json");
        let data =  JSON.parse(rawdata.toString()) as Array<Stats>;
        //message.reply(JSON.stringify(data));

        data.sort((a, b) => b.count - a.count);
        console.log(data);
        let s = data.map((s, i) => {
            return `${i + 1}. ${s.name}: ${s.count}`
        })
        
        if (s.length > 10) {
            s = s.slice(0, 10);
        }

        message.reply("Top 10 lamo typers:\n" + s.join("\n"));

    }
    /* if(message.content.toLocaleLowerCase() == "!count") {
        let channels = message.guild?.channels.cache;

        channels = channels?.filter((c) => c.type == "GUILD_TEXT")!

        console.log(channels.size)
        let runs = 0
        let size = channels.size;

        channels.forEach( async (c, index) => {
            const ch = c as GuildTextBasedChannel
            let m = await fetchAllMessages(ch);
            let i = 0;
            m.forEach(ms => {
                if (ms.content.toLowerCase().includes("lmao")) {
                    i++;
                    updateStats(ms);
                }
            })

            console.log(c.name + ": " + i)
            console.log(runs);
            runs++;
            if(runs === size-1) {
                console.log("DONE");
            }
            if(runs === size) {
                console.log("Mega Done")
            }
        })

    } */
    if(message.content.toLowerCase().includes("lmao")) {
        if (message.author.id == bot.user?.id) return;
        message.react("⬆")
        updateStats(message);
    }
})

bot.login(token);