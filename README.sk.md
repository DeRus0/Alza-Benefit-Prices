[🇬🇧 English](README.md) · [🇨🇿 Čeština](README.cs.md) · **🇸🇰 Slovenčina** · [🇭🇺 Magyar](README.hu.md) · [🇩🇪🇦🇹 Deutsch](README.de.md)

# Alza Benefit Prices

Userscript pre Alza.cz, Alza.sk, Alza.hu, Alza.de a Alza.at, ktorý priamo na stránke produktu zobrazí ceny cenníkov Gold, Silver, ISIC, Bronze, B2B a Basic vrátane percentuálnych zliav.

> **Poznámka:** Alza.hu a Alza.at cenník ISIC nemajú, preto sa nezobrazuje.

## Ukážka

<img src="./photos/photo.sk.png" alt="Ukážka Alza Benefit Prices" width="500">

## Inštalácia

[Nainštalovať Alza Benefit Prices](https://raw.githubusercontent.com/dexnis-dev/Alza-Benefit-Prices/main/alza-benefit-prices.user.js)

### Chromium a Firefox

1. Nainštaluj správcu userscriptov **Violentmonkey**:
   - [Chrome, Opera a ďalšie prehliadače Chromium](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)
   - [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao)
   - [Firefox](https://addons.mozilla.org/firefox/addon/violentmonkey/)
2. V prehliadačoch založených na Chromiu otvor správu rozšírení, nájdi **Violentmonkey**, otvor jeho **Podrobnosti** a zapni **Povoliť používateľské skripty**, ak je táto voľba dostupná. Napríklad v Chrome otvoríš správu rozšírení cez `chrome://extensions`, v Edge cez `edge://extensions`. Vo Firefoxe tento krok nie je potrebný.
3. Otvor inštalačný odkaz vyššie a potvrď inštaláciu vo Violentmonkey.
4. Otvor alebo obnov stránku produktu na Alze.

Voľba **Povoliť používateľské skripty** je oprávnenie prehliadača, ktoré rozšíreniu umožní spúšťať vlastné skripty. Ak ju prehliadač vyžaduje a zostane vypnutá, userscript nebude fungovať.

### Safari

1. Nainštaluj [Userscripts z App Store](https://apps.apple.com/app/userscripts/id1463298887).
2. Zapni Userscripts v nastaveniach rozšírení Safari a povoľ prístup k Alze a webapi.alza.cz.
3. Otvor inštalačný odkaz v Safari, klikni na ikonu Userscripts a potvrď inštaláciu.
4. Obnov stránku produktu na Alze.

Ak sa inštalácia neponúkne, skopíruj celý obsah skriptu do editora Userscripts ako nový JavaScript a ulož ho.

## Nastavenia

- **Cenníky:** zapnutie a vypnutie jednotlivých cenníkov.
- **Akcie:** samostatné zapnutie a vypnutie AlzaPlus+, Cashbacku a Výkupu.
- **Zobrazenie:** voľba **Vždy zobraziť cenníky** ukáže všetky zapnuté cenníky, aj keď pri nich nie je zľava alebo majú všetky rovnakú cenu.
  Na počítači pribudne aj voľba **Presunúť cenník doľava**, ktorá panel presunie pod miniatúry galérie (na mobile nie je dostupná).
- **Affiliate:** číslo sa pridá do kopírovaného odkazu ako `?idp=číslo` (napr. `?idp=1234`).

Nastavenia sa ukladajú automaticky. Skript vyberie najnižšiu cenu z povolených akcií. Ak majú všetky načítané cenníky rovnakú cenu, zobrazí namiesto tabuľky krátku správu.

## Kopírovanie

Tlačidlo vedľa ozubeného kolieska skopíruje ponuku (názov, pôvodnú cenu, cenníky so zľavou a odkaz na produkt) ako text na vloženie do chatu alebo e-mailu. Kopíruje vždy všetky cenníky, pri ktorých je zľava, bez ohľadu na to, čo máš v nastaveniach zapnuté. Keď žiadna zľava nie je, skopíruje sa obyčajná cena (alebo zoznam cien). Silver s ISIC a Bronze s B2B sa pri rovnakej cene spoja do jedného riadku (`SILVER/ISIC`, `BRONZE/B2B`). Cenníky s rôznou akciou sa rozdelia do blokov, každý s vlastným riadkom akcie.

Podporované sú aj mobilné verzie (`m.alza.cz`, `m.alza.sk`, `m.alza.hu`, `m.alza.de`, `m.alza.at`).

Keď je v adrese `/EN/` (napríklad `alza.at/EN/…`), zobrazí sa panel aj kopírovaný text po anglicky, a to v ktoromkoľvek obchode. Správy v konzole prehliadača sú vždy po anglicky.

Vytvoril [Dexnis](https://github.com/dexnis-dev)
