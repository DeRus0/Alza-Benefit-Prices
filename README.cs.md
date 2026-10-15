[🇬🇧 English](README.md) · **🇨🇿 Čeština** · [🇸🇰 Slovenčina](README.sk.md) · [🇭🇺 Magyar](README.hu.md) · [🇩🇪🇦🇹 Deutsch](README.de.md)

# Alza Benefit Prices

Userscript pro Alza.cz, Alza.sk, Alza.hu, Alza.de a Alza.at, který přímo na stránce produktu zobrazí ceny ceníků Gold, Silver, ISIC, Bronze, B2B a Basic včetně procentuálních slev.

> **Poznámka:** Alza.hu a Alza.at ceník ISIC nemají, proto se nezobrazuje.

## Ukázka

<img src="./photos/photo.cs.png" alt="Ukázka Alza Benefit Prices" width="500">

## Instalace

[Nainstalovat Alza Benefit Prices](https://raw.githubusercontent.com/dexnis-dev/Alza-Benefit-Prices/main/alza-benefit-prices.user.js)

### Chromium a Firefox

1. Nainstaluj správce userscriptů **Violentmonkey**:
   - [Chrome, Opera a další prohlížeče Chromium](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)
   - [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao)
   - [Firefox](https://addons.mozilla.org/firefox/addon/violentmonkey/)
2. V prohlížečích založených na Chromiu otevři správu rozšíření, najdi **Violentmonkey**, otevři jeho **Podrobnosti** a zapni **Povolit uživatelské skripty**, pokud je tato volba dostupná. Například v Chromu otevřeš správu rozšíření přes `chrome://extensions`, v Edge přes `edge://extensions`. Ve Firefoxu tento krok není potřeba.
3. Otevři instalační odkaz výše a potvrď instalaci ve Violentmonkey.
4. Otevři nebo obnov stránku produktu na Alze.

Volba **Povolit uživatelské skripty** je oprávnění prohlížeče, které rozšíření umožní spouštět vlastní skripty. Pokud ji prohlížeč vyžaduje a zůstane vypnutá, userscript nebude fungovat.

### Safari

1. Nainstaluj [Userscripts z App Store](https://apps.apple.com/cz/app/userscripts/id1463298887?l=cs).
2. Zapni Userscripts v nastavení rozšíření Safari a povol přístup k Alze a webapi.alza.cz.
3. Otevři instalační odkaz v Safari, klikni na ikonu Userscripts a potvrď instalaci.
4. Obnov stránku produktu na Alze.

Pokud se instalace nenabídne, zkopíruj celý obsah skriptu do editoru Userscripts jako nový JavaScript a ulož ho.

## Nastavení

- **Ceníky:** zapnutí a vypnutí jednotlivých ceníků.
- **Akce:** samostatné zapnutí a vypnutí AlzaPlus+, Cashbacku a Výkupu.
- **Zobrazení:** volba **Vždy zobrazit ceníky** ukáže všechny zapnuté ceníky, i když u nich není sleva nebo mají všechny stejnou cenu.
  Na počítači přibude i volba **Přesunout ceník doleva**, která panel přesune pod miniatury galerie (na mobilu není dostupná).
- **Affiliate:** číslo se přidá do kopírovaného odkazu jako `?idp=číslo` (např. `?idp=1234`).

Nastavení se ukládá automaticky. Skript vybere nejnižší cenu z povolených akcí. Pokud mají všechny načtené ceníky stejnou cenu, zobrazí místo tabulky krátkou zprávu.

## Kopírování

Tlačítko vedle ozubeného kola zkopíruje nabídku (název, původní cenu, ceníky se slevou a odkaz na produkt) jako text pro vložení do chatu nebo e-mailu. Kopíruje vždy všechny ceníky, u kterých je sleva, bez ohledu na to, co máš v nastavení zapnuté. Když žádná sleva není, zkopíruje se prostá cena (nebo seznam cen). Silver s ISIC a Bronze s B2B se při stejné ceně spojí do jednoho řádku (`SILVER/ISIC`, `BRONZE/B2B`). Ceníky s různou akcí se rozdělí do bloků, každý s vlastním řádkem akce.

Podporované jsou i mobilní verze (`m.alza.cz`, `m.alza.sk`, `m.alza.hu`, `m.alza.de`, `m.alza.at`).

Když je v adrese `/EN/` (například `alza.at/EN/…`), zobrazí se panel i kopírovaný text anglicky, a to na kterémkoli obchodě. Zprávy v konzoli prohlížeče jsou vždy anglicky.

Vytvořil [Dexnis](https://github.com/dexnis-dev)
