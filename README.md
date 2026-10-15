**🇬🇧 English** · [🇨🇿 Čeština](README.cs.md) · [🇸🇰 Slovenčina](README.sk.md) · [🇭🇺 Magyar](README.hu.md) · [🇩🇪🇦🇹 Deutsch](README.de.md)

# Alza Benefit Prices

Userscript for Alza.cz, Alza.sk, Alza.hu, Alza.de and Alza.at that shows the prices of the Gold, Silver, ISIC, Bronze, B2B and Basic price lists, including percentage discounts, right on the product page.

> **Note:** Alza.hu and Alza.at do not have the ISIC price list, so it is not shown.

## Preview

<img src="./photos/photo.png" alt="Alza Benefit Prices preview" width="500">

## Installation

[Install Alza Benefit Prices](https://raw.githubusercontent.com/dexnis-dev/Alza-Benefit-Prices/main/alza-benefit-prices.user.js)

### Chromium and Firefox

1. Install the **Violentmonkey** userscript manager:
   - [Chrome, Opera and other Chromium browsers](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)
   - [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao)
   - [Firefox](https://addons.mozilla.org/firefox/addon/violentmonkey/)
2. In Chromium-based browsers open the extension management, find **Violentmonkey**, open its **Details** and turn on **Allow user scripts** if this option is available. For example in Chrome the extension management is at `chrome://extensions`, in Edge at `edge://extensions`. This step is not needed in Firefox.
3. Open the installation link above and confirm the installation in Violentmonkey.
4. Open or reload a product page on Alza.

**Allow user scripts** is a browser permission that lets the extension run custom scripts. If your browser requires it and it stays off, the userscript will not work.

### Safari

1. Install [Userscripts from the App Store](https://apps.apple.com/app/userscripts/id1463298887).
2. Turn on Userscripts in the Safari extension settings and allow access to Alza and webapi.alza.cz.
3. Open the installation link in Safari, click the Userscripts icon and confirm the installation.
4. Reload the product page on Alza.

If the installation is not offered, copy the whole content of the script into the Userscripts editor as a new JavaScript and save it.

## Settings

- **Price lists:** turn individual price lists on and off.
- **Promotions:** separately turn AlzaPlus+, Cashback and Trade-in on and off.
- **Display:** the **Always show price lists** option shows all enabled price lists even when they have no discount or all have the same price.
  On desktop there is also **Move the price list to the left**, which moves the panel below the gallery thumbnails (not available on mobile).
- **Affiliate:** the number is added to the copied link as `?idp=number` (e.g. `?idp=1234`).

Settings are saved automatically. The script picks the lowest price from the enabled promotions. If all loaded price lists have the same price, a short message is shown instead of the table.

## Copying

The button next to the gear copies the offer (name, original price, price lists with a discount and the product link) as text you can paste into a chat or an e-mail. It always copies every price list that has a discount, regardless of what is switched on in the settings. When there is no discount, the plain price (or a list of prices) is copied. Silver with ISIC and Bronze with B2B share one line when their prices match (`SILVER/ISIC`, `BRONZE/B2B`). Price lists with different promotions are split into blocks, each with its own promotion line.

Mobile versions are supported too (`m.alza.cz`, `m.alza.sk`, `m.alza.hu`, `m.alza.de`, `m.alza.at`).

When the address contains `/EN/` (for example `alza.at/EN/…`), the panel and the copied text are shown in English, in any shop. Messages in the browser console are always in English.

Created by [Dexnis](https://github.com/dexnis-dev)
