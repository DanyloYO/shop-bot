# Shop Bot

A small Telegram bot that works as a shop for digital codes. You top up a
balance, pick a product, and the bot delivers a one-time code straight into the
chat. Built with [puregram](https://github.com/nitreojs/puregram).

Live demo: not hosted — run it locally with your own bot token (see below).

## What it does

- **Catalog** built from a simple `products` list, with a keyboard generated from it.
- **Balance** per user, stored in JSON, with autosave.
- **Buy flow** using step scenes: pick product → confirm → the bot takes one code
  from the stock, removes it so it can't be sold twice, and saves it to the
  user's purchase history.
- **Top-up**: demo mode by default (the balance is credited instantly, no real
  money). If you add test PAYOK keys to `config.json`, it switches to a real
  payment link and credits the balance from a payment **webhook**.
- **Admin panel** (`admin` command for ids in `admin_list`): sales stats and
  remaining stock.

## Tech

- Node.js, puregram (Telegram Bot API)
- `@puregram/scenes`, `@puregram/session`, `@puregram/hear` for the dialogs
- JSON file storage
- PAYOK payment webhook (optional, test mode)

## Run it

```bash
npm install
cp config.example.json config.json   # then put your bot token inside
npm start
```

Get a bot token from [@BotFather](https://t.me/BotFather). Put your Telegram id
into `admin_list` to see the admin panel. Leave the `payok` block empty to keep
the demo payment mode.

## Project layout

```
index.js            bot logic: menu, scenes, balance, admin
src/shop.js         the stock: reads codes, hands one out, refills
stock.json          demo codes in stock
config.example.json copy to config.json and fill in your token
```

The codes in `stock.json` are demo placeholders. `config.json`, `usersdata.json`
and `data.json` are git-ignored, so no tokens or user data end up in the repo.
