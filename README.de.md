[🇬🇧 English](README.md) · [🇨🇿 Čeština](README.cs.md) · [🇸🇰 Slovenčina](README.sk.md) · [🇭🇺 Magyar](README.hu.md) · **🇩🇪🇦🇹 Deutsch**

# Alza Benefit Prices

Userscript für Alza.cz, Alza.sk, Alza.hu, Alza.de und Alza.at, das direkt auf der Produktseite die Preise der Preislisten Gold, Silver, ISIC, Bronze, B2B und Basic samt prozentualen Rabatten anzeigt.

> **Hinweis:** Alza.hu und Alza.at haben keine ISIC-Preisliste, deshalb wird sie nicht angezeigt.

## Vorschau

**Alza.de**

<img src="./photos/photo.de.png" alt="Vorschau von Alza Benefit Prices – Alza.de" width="500">

**Alza.at**

<img src="./photos/photo.at.png" alt="Vorschau von Alza Benefit Prices – Alza.at" width="500">

## Installation

[Alza Benefit Prices installieren](https://raw.githubusercontent.com/dexnis-dev/Alza-Benefit-Prices/main/alza-benefit-prices.user.js)

### Chromium und Firefox

1. Installiere den Userscript-Manager **Violentmonkey**:
   - [Chrome, Opera und andere Chromium-Browser](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)
   - [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao)
   - [Firefox](https://addons.mozilla.org/firefox/addon/violentmonkey/)
2. Öffne in Chromium-basierten Browsern die Erweiterungsverwaltung, suche **Violentmonkey**, öffne die **Details** und aktiviere **Benutzerskripte zulassen**, falls diese Option verfügbar ist. In Chrome erreichst du die Erweiterungsverwaltung über `chrome://extensions`, in Edge über `edge://extensions`. In Firefox ist dieser Schritt nicht nötig.
3. Öffne den obigen Installationslink und bestätige die Installation in Violentmonkey.
4. Öffne eine Produktseite auf Alza oder lade sie neu.

**Benutzerskripte zulassen** ist eine Berechtigung des Browsers, die der Erweiterung erlaubt, eigene Skripte auszuführen. Verlangt der Browser sie und bleibt sie ausgeschaltet, funktioniert das Userscript nicht.

### Safari

1. Installiere [Userscripts aus dem App Store](https://apps.apple.com/app/userscripts/id1463298887).
2. Aktiviere Userscripts in den Safari-Erweiterungseinstellungen und erlaube den Zugriff auf Alza und webapi.alza.cz.
3. Öffne den Installationslink in Safari, klicke auf das Userscripts-Symbol und bestätige die Installation.
4. Lade die Produktseite auf Alza neu.

Wird die Installation nicht angeboten, kopiere den gesamten Inhalt des Skripts als neues JavaScript in den Userscripts-Editor und speichere es.

## Einstellungen

- **Preislisten:** einzelne Preislisten ein- und ausschalten.
- **Aktionen:** AlzaPlus+, Cashback und Inzahlungnahme getrennt ein- und ausschalten.
- **Anzeige:** Die Option **Preislisten immer anzeigen** zeigt alle aktivierten Preislisten an, auch wenn sie keinen Rabatt haben oder alle denselben Preis haben.
  Am Computer gibt es außerdem **Preisliste nach links verschieben**, wodurch das Panel unter die Miniaturen der Galerie wandert (auf dem Handy nicht verfügbar).
- **Affiliate:** Die Nummer wird dem kopierten Link als `?idp=Nummer` hinzugefügt (z. B. `?idp=1234`).

Die Einstellungen werden automatisch gespeichert. Das Skript wählt den niedrigsten Preis der aktivierten Aktionen. Haben alle geladenen Preislisten denselben Preis, zeigt es statt der Tabelle eine kurze Meldung.

## Kopieren

Die Schaltfläche neben dem Zahnrad kopiert das Angebot (Name, ursprünglichen Preis, Preislisten mit Rabatt und den Link zum Produkt) als Text zum Einfügen in einen Chat oder eine E-Mail. Es werden immer alle Preislisten mit Rabatt kopiert, unabhängig davon, was in den Einstellungen aktiviert ist. Gibt es keinen Rabatt, wird der einfache Preis (oder eine Preisliste) kopiert. Silver mit ISIC und Bronze mit B2B werden bei gleichem Preis in einer Zeile zusammengefasst (`SILVER/ISIC`, `BRONZE/B2B`). Preislisten mit unterschiedlichen Aktionen werden in Blöcke geteilt, jeweils mit eigener Aktionszeile.

Mobile Versionen werden ebenfalls unterstützt (`m.alza.cz`, `m.alza.sk`, `m.alza.hu`, `m.alza.de`, `m.alza.at`).

Enthält die Adresse `/EN/` (zum Beispiel `alza.at/EN/…`), werden Panel und kopierter Text in jedem Shop auf Englisch angezeigt. Meldungen in der Browser-Konsole sind immer auf Englisch.

Erstellt von [Dexnis](https://github.com/dexnis-dev)
