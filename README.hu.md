[🇬🇧 English](README.md) · [🇨🇿 Čeština](README.cs.md) · [🇸🇰 Slovenčina](README.sk.md) · **🇭🇺 Magyar** · [🇩🇪🇦🇹 Deutsch](README.de.md)

# Alza Benefit Prices

Userscript az Alza.cz, Alza.sk, Alza.hu, Alza.de és Alza.at oldalakhoz, amely közvetlenül a termékoldalon megjeleníti a Gold, Silver, ISIC, Bronze, B2B és Basic árlisták árait, százalékos kedvezményekkel együtt.

> **Megjegyzés:** Az Alza.hu és az Alza.at nem rendelkezik ISIC árlistával, ezért nem jelenik meg.

## Előnézet

<img src="./photos/photo.hu.png" alt="Alza Benefit Prices előnézet" width="500">

## Telepítés

[Alza Benefit Prices telepítése](https://raw.githubusercontent.com/dexnis-dev/Alza-Benefit-Prices/main/alza-benefit-prices.user.js)

### Chromium és Firefox

1. Telepítsd a **Violentmonkey** userscript-kezelőt:
   - [Chrome, Opera és más Chromium-alapú böngészők](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)
   - [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao)
   - [Firefox](https://addons.mozilla.org/firefox/addon/violentmonkey/)
2. Chromium-alapú böngészőkben nyisd meg a bővítménykezelőt, keresd meg a **Violentmonkey**-t, nyisd meg a **Részletek** oldalát, és kapcsold be a **Felhasználói szkriptek engedélyezése** opciót, ha elérhető. Chrome-ban a bővítménykezelő a `chrome://extensions`, Edge-ben az `edge://extensions` címen van. Firefoxban erre a lépésre nincs szükség.
3. Nyisd meg a fenti telepítési linket, és erősítsd meg a telepítést a Violentmonkey-ben.
4. Nyiss meg vagy frissíts egy termékoldalt az Alzán.

A **Felhasználói szkriptek engedélyezése** egy böngészőengedély, amely lehetővé teszi, hogy a bővítmény saját szkripteket futtasson. Ha a böngésző megköveteli, és kikapcsolva marad, a userscript nem fog működni.

### Safari

1. Telepítsd a [Userscripts alkalmazást az App Store-ból](https://apps.apple.com/app/userscripts/id1463298887).
2. Kapcsold be a Userscripts-et a Safari bővítménybeállításaiban, és engedélyezd a hozzáférést az Alzához és a webapi.alza.cz címhez.
3. Nyisd meg a telepítési linket Safariban, kattints a Userscripts ikonra, és erősítsd meg a telepítést.
4. Frissítsd a termékoldalt az Alzán.

Ha a telepítést nem ajánlja fel, másold be a szkript teljes tartalmát a Userscripts szerkesztőjébe új JavaScriptként, és mentsd el.

## Beállítások

- **Árlisták:** az egyes árlisták be- és kikapcsolása.
- **Akciók:** az AlzaPlus+, a Cashback és a Beszámítás külön be- és kikapcsolása.
- **Megjelenítés:** az **Árlisták mindig megjelenítése** opció az összes bekapcsolt árlistát megjeleníti, akkor is, ha nincs kedvezményük, vagy mindnek ugyanaz az ára.
  Számítógépen megjelenik az **Árlista áthelyezése balra** opció is, amely a panelt a galéria bélyegképei alá helyezi (mobilon nem érhető el).
- **Affiliate:** a szám `?idp=szám` formában kerül a másolt linkhez (pl. `?idp=1234`).

A beállítások automatikusan mentődnek. A szkript a bekapcsolt akciók közül a legalacsonyabb árat választja. Ha az összes betöltött árlistának ugyanaz az ára, a táblázat helyett rövid üzenetet jelenít meg.

## Másolás

A fogaskerék melletti gomb szövegként másolja az ajánlatot (név, eredeti ár, kedvezményes árlisták és a termék linkje), amelyet chatbe vagy e-mailbe illeszthetsz. Mindig az összes olyan árlistát másolja, amelynek van kedvezménye, függetlenül attól, mi van bekapcsolva a beállításokban. Ha nincs kedvezmény, az egyszerű árat (vagy az árak listáját) másolja. A Silver az ISIC-kel és a Bronze a B2B-vel azonos ár esetén egy sorba kerül (`SILVER/ISIC`, `BRONZE/B2B`). A különböző akciójú árlisták blokkokra oszlanak, mindegyik saját akciósorral.

A mobil verziók is támogatottak (`m.alza.cz`, `m.alza.sk`, `m.alza.hu`, `m.alza.de`, `m.alza.at`).

Ha a címben `/EN/` szerepel (például `alza.at/EN/…`), a panel és a másolt szöveg angolul jelenik meg, bármelyik üzletben. A böngészőkonzol üzenetei mindig angolul vannak.

Készítette [Dexnis](https://github.com/dexnis-dev)
