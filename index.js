const { Telegram } = require("puregram")
const { KeyboardBuilder } = require("puregram")
const fs = require("fs")
const { SessionManager } = require("@puregram/session")
const { SceneManager, StepScene } = require("@puregram/scenes")
const { HearManager } = require("@puregram/hear")

const config = require("./config.json")
const shopapi = require("./src/shop")
const shop = new shopapi()

if (!fs.existsSync("./data.json")) {
    fs.writeFileSync("./data.json", JSON.stringify({ payed: 0, paysum: 0 }))
}
if (!fs.existsSync("./usersdata.json")) {
    fs.writeFileSync("./usersdata.json", JSON.stringify({}))
}
const data = require("./data.json")
const users = require("./usersdata.json")

const products = [
    { id: "lic_m", title: "🔑 Лицензия · Месяц", price: 50, key: "month" },
    { id: "lic_y", title: "🔑 Лицензия · Год", price: 300, key: "year" },
    { id: "gift", title: "🎁 Подарочный код · 100", price: 100, key: "gift" },
]

let payok = null
if (config.payok && config.payok.apiKey) {
    const { PAYOK } = require("payok")
    payok = new PAYOK({
        apiId: config.payok.apiId,
        apiKey: config.payok.apiKey,
        secretKey: config.payok.secretKey,
        shop: config.payok.shop,
    })
}

const bot = new Telegram({
    token: config.token,
})

const sessionManager = new SessionManager()
const sceneManager = new SceneManager()
const hearManager = new HearManager()

let catalog = products.map((p) => `  • ${p.title} — *${p.price}₽*`).join("\n")
const stext = `*🛒 Магазин цифровых кодов* \n\nВыберите товар, оплатите с баланса — и код придёт сразу в чат.\n\n*В наличии:*\n${catalog}`

bot.updates.on("message", sessionManager.middleware)
bot.updates.on("message", sceneManager.middleware)
bot.updates.on("message", sceneManager.middlewareIntercept)
bot.updates.on("message", hearManager.middleware)

async function savedata() {
    fs.writeFileSync("./data.json", JSON.stringify(data))
}
setInterval(async () => {
    await savedata()
}, 90 * 1000)

async function saveUsers() {
    fs.writeFileSync("./usersdata.json", JSON.stringify(users))
}
setInterval(async () => {
    await saveUsers()
}, 10 * 1000)

function isAdmin(user_id) {
    return ~config.admin_list.indexOf(Number(user_id))
}
function adbal(uuid, sum) {
    let id = uuid.toString()
    let user = users[id]
    user["balance"] += Number.parseInt(sum, 10)
    console.log(user["balance"])
}
function getbal(uuid) {
    let id = uuid.toString()
    let user = users[id]
    return user["balance"]
}
function stats(num, sum) {
    data.payed += num
    data.paysum += sum
}
async function payl(uid, sum) {
    let id = uid.toString()
    return payok.getPaymentLink({ amount: sum, desc: "Пополнение баланса", id: id })
}

let ptime = Date.now()

if (payok) {
    payok.createWebhook(process.env.PORT || 3000, (payment) => {
        console.log(payment)
        let sum = Number.parseInt(payment.amount, 10)
        let uid = payment.custom.id || payment.id
        adbal(uid, sum)
        stats(1, sum)
        users[uid]["history"].push({ date: payment.date, type: "Пополнение", amount: sum })
    })
}

const keyboard = new KeyboardBuilder()
    .textButton("💲Профиль")
    .row()
    .textButton("🛒Купить код")
    .textButton("📜Мои покупки")
    .row()
    .textButton("💰Пополнить")
    .textButton("❓Инфо")
    .resize()
const bback = new KeyboardBuilder().textButton("◀️Назад").resize()
const acco = new KeyboardBuilder()
    .textButton("💰Пополнить")
    .row()
    .textButton("◀️Назад")
    .resize()
const Accept = new KeyboardBuilder()
    .textButton("✅Купить")
    .row()
    .textButton("◀️Назад")
    .resize()
const adminkeyboard = new KeyboardBuilder()
    .textButton("Статистика")
    .row()
    .textButton("◀️Назад")
    .resize()

let shopkb = new KeyboardBuilder()
products.forEach((p) => {
    shopkb.textButton(p.title).row()
})
shopkb.textButton("◀️Назад").resize()

bot.updates.on("message", async (msg) => {
    let dt = new Date()
    console.log("[" + dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds() + "] " + msg.from.id + ": " + msg.text)
    let text = msg.text
    const id = msg.senderId.toString()
    let user = users[id]
    if (!user) {
        users[id] = {
            username: msg.from.username,
            balance: 0,
            time: ptime,
            history: [],
        }
        user = users[id]
    }

    if (text == "/start") {
        msg.send(stext, { reply_markup: keyboard, parse_mode: "markdown" })
    } else if (text == "💲Профиль") {
        if (msg.from.username !== user["username"]) {
            user["username"] = msg.from.username
        }
        return msg.send(`🔑 *Ваш айди:* ${id}\n💳 *Ваш баланс:* ${getbal(id)}₽\n🧾 *Покупок:* ${user["history"].length}`, {
            reply_markup: acco,
            parse_mode: "markdown",
        })
    } else if (text == "📜Мои покупки") {
        let buys = user["history"].filter((h) => h.code)
        if (buys.length == 0) {
            return msg.send("*У вас пока нет покупок.*", { parse_mode: "markdown" })
        }
        let list = buys.slice(-10).map((h) => `• ${h.title} — \`${h.code}\``).join("\n")
        return msg.send(`*🧾 Последние покупки:*\n\n${list}`, { parse_mode: "markdown" })
    } else if (text == "❓Инфо") {
        return msg.send("*❓ Как это работает:*\n\n1. Пополните баланс.\n2. Выберите товар в «🛒Купить код».\n3. Код придёт сразу в чат и сохранится в «📜Мои покупки».", {
            reply_markup: keyboard,
            parse_mode: "markdown",
        })
    } else if (text == "admin" && isAdmin(id)) {
        msg.send("*Админ-панель:*", { reply_markup: adminkeyboard, parse_mode: "markdown" })
    } else if (text == "Статистика" && isAdmin(id)) {
        let left = products.map((p) => `  • ${p.title}: ${shop.left(p.key)} шт.`).join("\n")
        msg.send(`*📊 Статистика:*\n\n*Продаж:* ${data.payed}\n*Оборот:* ${data.paysum}₽\n\n*Остаток на складе:*\n${left}`, {
            reply_markup: adminkeyboard,
            parse_mode: "markdown",
        })
    }
})

hearManager.hear("🛒Купить код", (context) => context.scene.enter("buy"))
hearManager.hear("💰Пополнить", (context) => context.scene.enter("pay"))

sceneManager.addScenes([
    new StepScene("buy", [
        async (context) => {
            if (context.scene.step.firstTime || !context.hasText) {
                return context.send("*Выберите товар:*", {
                    reply_markup: shopkb,
                    parse_mode: "markdown",
                })
            }
            if (context.text == "◀️Назад") {
                context.send(stext, { reply_markup: keyboard, parse_mode: "markdown" })
                return context.scene.leave()
            }
            let product = products.find((p) => p.title == context.text)
            if (!product) {
                return context.send("Выберите товар кнопкой ниже.")
            }
            if (shop.left(product.key) == 0) {
                return context.send("*😔 Этот товар закончился на складе.*", { parse_mode: "markdown" })
            }
            context.scene.state.product = product
            return context.scene.step.next()
        },
        async (context) => {
            const { product } = context.scene.state
            if (context.text == "◀️Назад") {
                await context.send(stext, { reply_markup: keyboard, parse_mode: "markdown" })
                return context.scene.leave()
            } else if (context.text == "✅Купить") {
                if (getbal(context.senderId) < product.price) {
                    await context.send(`*⚠️ Недостаточно средств.* Нужно ${product.price}₽, на балансе ${getbal(context.senderId)}₽. Пополните в профиле.`, {
                        reply_markup: keyboard,
                        parse_mode: "markdown",
                    })
                    return context.scene.leave()
                }
                let code = shop.take(product.key)
                if (!code) {
                    await context.send("*😔 Товар только что закончился.*", {
                        reply_markup: keyboard,
                        parse_mode: "markdown",
                    })
                    return context.scene.leave()
                }
                adbal(context.senderId, -product.price)
                let user = users[context.senderId.toString()]
                user["history"].push({
                    date: Date.now(),
                    title: product.title,
                    code: code,
                    amount: -product.price,
                })
                await context.send(`*✅ Готово!*\n\n${product.title}\n*Ваш код:* \`${code}\`\n\nОн сохранён в «📜Мои покупки».`, {
                    reply_markup: keyboard,
                    parse_mode: "markdown",
                })
                return context.scene.leave()
            }
            await context.send(`*❗Проверьте заказ:*\n\n${product.title}\n*Цена:* ${product.price}₽\n*Ваш баланс:* ${getbal(context.senderId)}₽`, {
                reply_markup: Accept,
                parse_mode: "markdown",
            })
        },
    ]),

    new StepScene("pay", [
        async (context) => {
            if (context.scene.step.firstTime || !context.hasText) {
                return context.send("*Введите сумму пополнения:*", {
                    reply_markup: bback,
                    parse_mode: "markdown",
                })
            }
            let xtext = Number.parseInt(context.text, 10)
            if (context.text == "◀️Назад") {
                context.send(stext, { reply_markup: keyboard, parse_mode: "markdown" })
                return context.scene.leave()
            } else if (xtext < 10 || isNaN(xtext) == true) {
                return context.send("Неверное число! Минимум 10₽")
            }
            context.scene.state.money = xtext
            return context.scene.step.next()
        },
        async (context) => {
            const { money } = context.scene.state
            if (payok) {
                let e = await payl(context.senderId, money)
                await context.send(`<b>👉 К оплате: ${money}₽</b>\n\n<a href="${e["payUrl"]}">🔗 Оплатить</a>`, { parse_mode: "html" })
            } else {
                adbal(context.senderId, money)
                stats(1, money)
                users[context.senderId.toString()]["history"].push({
                    date: Date.now(),
                    type: "Пополнение (демо)",
                    amount: money,
                })
                await context.send(`*✅ Баланс пополнен на ${money}₽* _(демо-режим, без реальной оплаты)_\n💳 Баланс: ${getbal(context.senderId)}₽`, {
                    reply_markup: keyboard,
                    parse_mode: "markdown",
                })
            }
            return context.scene.leave()
        },
    ]),
])

bot.updates.startPolling().then(() => console.log(`@${bot.bot.username} started polling!`))
