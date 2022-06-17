import { Client, Intents, GuildTextBasedChannel, Message } from "discord.js";
import { readFileSync, writeFileSync } from "fs";
import {token} from "./config.json"

import {Mutex} from "async-mutex"

const fileWriter = new Mutex()

interface Stats {
    name: string;
    id: string;
    lmao: number;
    tf: number;
}

enum WORD {
    LMAO,
    TF
}


function escapeMarkdown(text: string): string {
    var unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1'); // unescape any "backslashed" character
    var escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1'); // escape *, _, `, ~, \
    return escaped;
  }

async function updateStats(message: Message, word: WORD) {
    if(message.author.id === bot.user?.id) return;
    const release = await fileWriter.acquire()
    let rawdata = readFileSync("stats.json");
    let data = JSON.parse(rawdata.toString()) as Array<Stats>;

    const index = data.findIndex(s => {
        return s.id === message.author.id;
    });
    if(index !== -1) {
        let s = data.at(index)!;
        switch (word) {
            case WORD.LMAO:
                s.lmao += 1;
                break;
            case WORD.TF:
                s.tf += 1;
                break;
            default:
                break;
        }
        data[index] = s;
    } else {
        switch (word) {
            case WORD.LMAO:
                const newStat: Stats = {
                    name: message.author.username,
                    id: message.author.id,
                    lmao: 1,
                    tf: 0
                }
                data.push(newStat);
                break;
            case WORD.TF:
                const s: Stats = {
                    name: message.author.username,
                    id: message.author.id,
                    lmao: 0,
                    tf: 1
                }
                data.push(s);
            default:
                break;
        }  
    }

    const toFile = JSON.stringify(data);
    writeFileSync("stats.json", toFile)
    release();
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

        data.sort((a, b) => b.lmao - a.lmao);
        console.log(data);
        let lmao = data.map((s, i) => {
            return `${i + 1}. ${s.name}: ${s.lmao}`
        })
        
        if (lmao.length > 10) {
            lmao = lmao.slice(0, 10);
        }

        data.sort((a,b) => b.tf - a.tf);
        let tf = data.map((s, i) => {
            return `${i + 1}. ${s.name}: ${s.tf}`
        })

        if (tf.length > 10) {
            tf = tf.slice(0, 10);
        }

        const reply = escapeMarkdown("Top 10 lmao typers:\n" + lmao.join("\n") + "\n\nTop 10 tf typers:\n" + tf.join("\n"))

        message.reply(reply);

    }
    if(message.content.toLocaleLowerCase() == "!count") {

        if(message.author.id !== "133555220876623872") {
            message.reply("Not allowed!");
            return;
        }

        let channels = message.guild?.channels.cache;

        channels = channels?.filter((c) => c.type == "GUILD_TEXT")!

        console.log(channels.size)
        let runs = 0
        let size = channels.size;

        channels.forEach( async(c) => {
            const ch = c as GuildTextBasedChannel
            console.log(c.name)
            let m = await fetchAllMessages(ch);
            m.forEach(ms => {
                if (ms.content.toLowerCase().includes("lmao")) {
                    updateStats(ms, WORD.LMAO);
                }
                if (ms.content.toLowerCase().includes("tf")) {
                    updateStats(ms, WORD.TF);
                }
            })
            console.log(runs);
            runs++;
            if(runs === size) {
                console.log("Mega Done")
                message.reply("DONE")
            }
        })

    } 
    if(message.content.toLowerCase().includes("lmao")) {
        if (message.author.id == bot.user?.id) return;
        message.react("⬆")
        updateStats(message, WORD.LMAO);
    }

    if(message.content.toLowerCase().includes("tf")) {
        if (message.author.id == bot.user?.id) return;
        message.react("⬆")
        updateStats(message, WORD.TF);
    }
})

bot.login(token);