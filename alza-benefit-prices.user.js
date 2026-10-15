// ==UserScript==
// @name         Alza Benefit Prices
// @icon         https://www.alza.cz/favicon-alza.ico
// @author       Dexnis
// @namespace    alza-benefit-prices
// @version      1.3.1
// @updateURL    https://raw.githubusercontent.com/DeRus0/Alza-Benefit-Prices/main/alza-benefit-prices.user.js
// @downloadURL  https://raw.githubusercontent.com/DeRus0/Alza-Benefit-Prices/main/alza-benefit-prices.user.js
// @description  Userscript for Alza.cz, Alza.sk, Alza.hu, Alza.de and Alza.at that shows the prices of the Gold, Silver, ISIC, Bronze, B2B and Basic price lists
// @description:cs  Userscript pro Alza.cz, Alza.sk, Alza.hu, Alza.de a Alza.at, který zobrazuje ceny ceníků Gold, Silver, ISIC, Bronze, B2B a Basic
// @description:sk  Userscript pre Alza.cz, Alza.sk, Alza.hu, Alza.de a Alza.at, ktorý zobrazuje ceny cenníkov Gold, Silver, ISIC, Bronze, B2B a Basic
// @description:hu  Userscript az Alza.cz, Alza.sk, Alza.hu, Alza.de és Alza.at oldalakhoz, amely megjeleníti a Gold, Silver, ISIC, Bronze, B2B és Basic árlisták árait
// @description:de  Userscript für Alza.cz, Alza.sk, Alza.hu, Alza.de und Alza.at, das die Preise der Preislisten Gold, Silver, ISIC, Bronze, B2B und Basic anzeigt
// @compatible   chrome
// @compatible   edge
// @compatible   firefox
// @compatible   opera
// @compatible   safari
// @match        https://www.alza.cz/*-d*.htm*
// @match        https://www.alza.cz/*?*dq=*
// @match        https://alza.cz/*-d*.htm*
// @match        https://alza.cz/*?*dq=*
// @match        https://m.alza.cz/*-d*.htm*
// @match        https://m.alza.cz/*?*dq=*
// @match        https://www.alza.sk/*-d*.htm*
// @match        https://www.alza.sk/*?*dq=*
// @match        https://alza.sk/*-d*.htm*
// @match        https://alza.sk/*?*dq=*
// @match        https://m.alza.sk/*-d*.htm*
// @match        https://m.alza.sk/*?*dq=*
// @match        https://www.alza.hu/*-d*.htm*
// @match        https://www.alza.hu/*?*dq=*
// @match        https://alza.hu/*-d*.htm*
// @match        https://alza.hu/*?*dq=*
// @match        https://m.alza.hu/*-d*.htm*
// @match        https://m.alza.hu/*?*dq=*
// @match        https://www.alza.de/*-d*.htm*
// @match        https://www.alza.de/*?*dq=*
// @match        https://alza.de/*-d*.htm*
// @match        https://alza.de/*?*dq=*
// @match        https://m.alza.de/*-d*.htm*
// @match        https://m.alza.de/*?*dq=*
// @match        https://www.alza.at/*-d*.htm*
// @match        https://www.alza.at/*?*dq=*
// @match        https://alza.at/*-d*.htm*
// @match        https://alza.at/*?*dq=*
// @match        https://m.alza.at/*-d*.htm*
// @match        https://m.alza.at/*?*dq=*
// @connect      webapi.alza.cz
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @inject-into  content
// @run-at       document-idle
// @noframes
// ==/UserScript==

(async () => {
  'use strict';

  // Do not initialize settings, requests or observers outside product pages.
  if (!productId(location.pathname, location.search)) return;

  // The shop by its domain; the price API is always webapi.alza.cz and takes the country as a parameter.
  const country = /(?:^|\.)alza\.sk$/i.test(location.hostname) ? 'SK'
    : /(?:^|\.)alza\.hu$/i.test(location.hostname) ? 'HU'
    : /(?:^|\.)alza\.de$/i.test(location.hostname) ? 'DE'
    : /(?:^|\.)alza\.at$/i.test(location.hostname) ? 'AT' : 'CZ';
  const locale = { SK: 'sk-SK', HU: 'hu-HU', DE: 'de-DE', AT: 'de-AT', CZ: 'cs-CZ' }[country];
  const euro = ['SK', 'DE', 'AT'].includes(country); // prices in euro, with cents
  const hasIsic = !['HU', 'AT'].includes(country); // these shops have no ISIC price list
  const discountFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const priceFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  // Euro cents always have two digits, as on Alza.sk: "54,90 €", not "54,9 €".
  const centsFormat = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const mobile = /^m\.alza\.(?:cz|sk|hu|de|at)$/i.test(location.hostname);

  // Texts shown to the user (panel, copied offer), one dictionary per language. Console messages are in
  // English only and live in LOG.
  const TEXTS = {
    cs: {
      others: 'OSTATNÍ',
      pricesWith: 'Ceny s ',
      priceWith: 'Cena s ',
      prices: 'Ceny ',
      price: 'Cena ',
      withWord: 'S ',
      withCode: 'S kódem ',
      promoDefault: 'Akční cena',
      tableLabel: 'Ceny ceníků: ',
      thTier: 'Ceník',
      thPrice: 'Cena',
      thDiscount: 'Sleva',
      originalPrice: 'Původní cena',
      settingsTitle: 'Nastavení ceníků',
      copyOffer: 'Kopírovat nabídku',
      equalNotice: 'Všechny ceníky mají stejnou cenu',
      loadError: 'Ceny se nepodařilo načíst. Zkus obnovit stránku.',
      createdBy: 'Vytvořil ',
      productFallback: 'Produkt Alza',
      originalColon: 'Původní cena: ',
      link: 'Odkaz ➤ ',
      copied: 'Zkopírováno',
      copyFailedTitle: 'Kopírování selhalo — zkus to znovu',
      groupTiers: 'Ceníky',
      groupPromos: 'Akce',
      tradeIn: 'Výkup',
      groupView: 'Zobrazení',
      helpAbout: 'Co dělá volba: ',
      optAlways: 'Vždy zobrazit ceníky',
      optAlwaysHint: 'Zobrazí Vaše zapnuté ceníky vždycky, i když není u ceníku sleva nebo jsou všechny ceníky se stejnou cenou.',
      optLeft: 'Přesunout ceník doleva',
      optLeftHint: 'Přesune ceník z pravého sloupce pod miniatury fotek vlevo.',
      clear: 'Smazat',
      clearAffiliate: 'Smazat affiliate',
      whatIsAffiliate: 'Co je affiliate',
      affiliateHint: 'Číslo partnera, které se přidá do kopírovaného odkazu jako ?idp=číslo.',
      version: 'Verze ',
      sourceCode: 'Zdrojový kód',
      loading: 'Načítání…',
      pricesLoaded: 'Ceny načteny: ',
    },
    sk: {
      others: 'OSTATNÉ',
      pricesWith: 'Ceny s ',
      priceWith: 'Cena s ',
      prices: 'Ceny ',
      price: 'Cena ',
      withWord: 'S ',
      withCode: 'S kódom ',
      promoDefault: 'Akčná cena',
      tableLabel: 'Ceny cenníkov: ',
      thTier: 'Cenník',
      thPrice: 'Cena',
      thDiscount: 'Zľava',
      originalPrice: 'Pôvodná cena',
      settingsTitle: 'Nastavenie cenníkov',
      copyOffer: 'Kopírovať ponuku',
      equalNotice: 'Všetky cenníky majú rovnakú cenu',
      loadError: 'Ceny sa nepodarilo načítať. Skús obnoviť stránku.',
      createdBy: 'Vytvoril ',
      productFallback: 'Produkt Alza',
      originalColon: 'Pôvodná cena: ',
      link: 'Odkaz ➤ ',
      copied: 'Skopírované',
      copyFailedTitle: 'Kopírovanie zlyhalo — skús to znova',
      groupTiers: 'Cenníky',
      groupPromos: 'Akcie',
      tradeIn: 'Výkup',
      groupView: 'Zobrazenie',
      helpAbout: 'Čo robí voľba: ',
      optAlways: 'Vždy zobraziť cenníky',
      optAlwaysHint: 'Zobrazí Vaše zapnuté cenníky vždy, aj keď pri cenníku nie je zľava alebo majú všetky cenníky rovnakú cenu.',
      optLeft: 'Presunúť cenník doľava',
      optLeftHint: 'Presunie cenník z pravého stĺpca pod miniatúry fotiek vľavo.',
      clear: 'Zmazať',
      clearAffiliate: 'Zmazať affiliate',
      whatIsAffiliate: 'Čo je affiliate',
      affiliateHint: 'Číslo partnera, ktoré sa pridá do kopírovaného odkazu ako ?idp=číslo.',
      version: 'Verzia ',
      sourceCode: 'Zdrojový kód',
      loading: 'Načítavam…',
      pricesLoaded: 'Ceny načítané: ',
    },
    en: {
      others: 'OTHERS',
      pricesWith: 'Prices with ',
      priceWith: 'Price with ',
      prices: 'Prices ',
      price: 'Price ',
      withWord: 'With ',
      withCode: 'With code ',
      promoDefault: 'Special price',
      tableLabel: 'Prices by price list: ',
      thTier: 'Price list',
      thPrice: 'Price',
      thDiscount: 'Discount',
      originalPrice: 'Original price',
      settingsTitle: 'Price list settings',
      copyOffer: 'Copy offer',
      equalNotice: 'All price lists have the same price',
      loadError: 'The prices could not be loaded. Try reloading the page.',
      createdBy: 'Created by ',
      productFallback: 'Alza product',
      originalColon: 'Original price: ',
      link: 'Link ➤ ',
      copied: 'Copied',
      copyFailedTitle: 'Copying failed — try again',
      groupTiers: 'Price lists',
      groupPromos: 'Promotions',
      tradeIn: 'Trade-in',
      groupView: 'Display',
      helpAbout: 'What the option does: ',
      optAlways: 'Always show price lists',
      optAlwaysHint: 'Always shows your enabled price lists, even when a price list has no discount or all price lists have the same price.',
      optLeft: 'Move the price list to the left',
      optLeftHint: 'Moves the price list from the right column to the left, below the product photo thumbnails.',
      clear: 'Clear',
      clearAffiliate: 'Clear affiliate',
      whatIsAffiliate: 'What is affiliate',
      affiliateHint: 'The partner number that is added to the copied link as ?idp=number.',
      version: 'Version ',
      sourceCode: 'Source code',
      loading: 'Loading…',
      pricesLoaded: 'Prices loaded: ',
    },
    de: {
      others: 'SONSTIGE',
      pricesWith: 'Preise mit ',
      priceWith: 'Preis mit ',
      prices: 'Preise ',
      price: 'Preis ',
      withWord: 'Mit ',
      withCode: 'Mit Code ',
      promoDefault: 'Aktionspreis',
      tableLabel: 'Preise der Preislisten: ',
      thTier: 'Preisliste',
      thPrice: 'Preis',
      thDiscount: 'Rabatt',
      originalPrice: 'Ursprünglicher Preis',
      settingsTitle: 'Einstellungen der Preislisten',
      copyOffer: 'Angebot kopieren',
      equalNotice: 'Alle Preislisten haben denselben Preis',
      loadError: 'Die Preise konnten nicht geladen werden. Versuche, die Seite neu zu laden.',
      createdBy: 'Erstellt von ',
      productFallback: 'Alza-Produkt',
      originalColon: 'Ursprünglicher Preis: ',
      link: 'Link ➤ ',
      copied: 'Kopiert',
      copyFailedTitle: 'Kopieren fehlgeschlagen — versuche es erneut',
      groupTiers: 'Preislisten',
      groupPromos: 'Aktionen',
      tradeIn: 'Inzahlungnahme',
      groupView: 'Anzeige',
      helpAbout: 'Was die Option bewirkt: ',
      optAlways: 'Preislisten immer anzeigen',
      optAlwaysHint: 'Zeigt deine aktivierten Preislisten immer an, auch wenn eine Preisliste keinen Rabatt hat oder alle Preislisten denselben Preis haben.',
      optLeft: 'Preisliste nach links verschieben',
      optLeftHint: 'Verschiebt die Preisliste aus der rechten Spalte nach links unter die Miniaturen der Produktfotos.',
      clear: 'Löschen',
      clearAffiliate: 'Affiliate löschen',
      whatIsAffiliate: 'Was ist Affiliate',
      affiliateHint: 'Die Partnernummer, die dem kopierten Link als ?idp=Nummer hinzugefügt wird.',
      version: 'Version ',
      sourceCode: 'Quellcode',
      loading: 'Wird geladen…',
      pricesLoaded: 'Preise geladen: ',
    },
    hu: {
      others: 'EGYÉB',
      pricesWith: 'Árak – ',
      priceWith: 'Ár – ',
      prices: 'Árak ',
      price: 'Ár ',
      withWord: '',
      withCode: 'kód ',
      promoDefault: 'Akciós ár',
      tableLabel: 'Az árlisták árai: ',
      thTier: 'Árlista',
      thPrice: 'Ár',
      thDiscount: 'Kedvezmény',
      originalPrice: 'Eredeti ár',
      settingsTitle: 'Az árlisták beállításai',
      copyOffer: 'Ajánlat másolása',
      equalNotice: 'Minden árlistának ugyanaz az ára',
      loadError: 'Az árakat nem sikerült betölteni. Próbáld újratölteni az oldalt.',
      createdBy: 'Készítette: ',
      productFallback: 'Alza termék',
      originalColon: 'Eredeti ár: ',
      link: 'Link ➤ ',
      copied: 'Másolva',
      copyFailedTitle: 'A másolás nem sikerült — próbáld újra',
      groupTiers: 'Árlisták',
      groupPromos: 'Akciók',
      tradeIn: 'Beszámítás',
      groupView: 'Megjelenítés',
      helpAbout: 'Mit csinál a beállítás: ',
      optAlways: 'Árlisták mindig megjelenítése',
      optAlwaysHint: 'A bekapcsolt árlistákat mindig megjeleníti, akkor is, ha egy árlistának nincs kedvezménye, vagy minden árlistának ugyanaz az ára.',
      optLeft: 'Árlista áthelyezése balra',
      optLeftHint: 'Az árlistát a jobb oszlopból balra, a termékfotók bélyegképei alá helyezi át.',
      clear: 'Törlés',
      clearAffiliate: 'Affiliate törlése',
      whatIsAffiliate: 'Mi az az affiliate',
      affiliateHint: 'A partnerszám, amely ?idp=szám formában kerül a másolt linkhez.',
      version: 'Verzió ',
      sourceCode: 'Forráskód',
      loading: 'Betöltés…',
      pricesLoaded: 'Árak betöltve: ',
    },
  };
  // Console messages (always English).
  const LOG = {
    noStorage: 'The extension does not provide settings storage. Check the script permissions.',
    noStorageWrite: 'The extension does not provide settings storage.',
    logSetting: 'Setting ',
    settingOn: 'set',
    settingOff: 'cleared',
    saveFailed: 'The setting could not be saved: ',
    logVersion: 'Version ',
    logMobile: ' (mobile version)',
    logCountry: ', country ',
    logSettings: 'Settings',
    cancelled: 'Loading cancelled.',
    requestError: 'The extension could not load the API. Check access to webapi.alza.cz.',
    timeout: 'Alza did not respond within 20 seconds.',
    noRequest: 'The extension does not provide API requests. Check the script permissions.',
    noClipboard: 'Clipboard API is not available.',
    placed: 'Panel placed ',
    placedGift: 'below the gift block',
    placedPhoto: 'below the product photo',
    placedTracker: 'before Hlídač shopů',
    placedModule: 'before the alternative pricing module',
    placedPrice: 'below the main price',
    pageChanged: 'The page changed in the meantime.',
    nothingToCopy: 'No price to copy.',
    copiedLog: 'Offer copied to the clipboard:',
    copyFailedLog: 'Copying failed: ',
    staleCache: ': older cache used (',
    tooLarge: 'The API response is too large.',
    blocked: 'HTTP 403: access blocked.',
    apiHttp: 'The API returned HTTP ',
    redirect: 'The API redirected to another domain.',
    noPrice: 'Price not found in the response.',
    noOwnPrice: ': no price of its own',
    standard: ' (standard ',
    product: 'Product ',
    logNoTier: ': no price list was loaded, the API is blocked or unavailable.',
    logEqual: ': all price lists have the same price',
    logNothing: 'no price list to show',
    colTier: 'price list',
    colPrice: 'price',
    colDiscount: 'discount',
    colPromo: 'promotion',
    logOriginal: 'Original price: ',
    logAlways: ' | mode: always show price lists',
    logLoading: ': loading price lists.',
    isicEstimate: 'ISIC: with cashback the API returns the same price as for Basic, price worked out (ISIC price − cashback): ',
  };
  // The language follows the address: "/EN/" in the path means English in every shop, otherwise the language
  // of the shop (Slovak, Hungarian, German for alza.de and alza.at, Czech). It is read again when the page
  // changes (see sync()).
  function pageLanguage() {
    if (/^\/en(?:\/|$)/i.test(location.pathname)) return 'en';
    return { SK: 'sk', HU: 'hu', DE: 'de', AT: 'de' }[country] || 'cs';
  }
  let activeLanguage = pageLanguage();
  let T = TEXTS[activeLanguage];
  const CACHE_TTL = 5 * 60 * 1000;
  const CACHE_LIMIT = 60;
  // Shared by all panels, so returning to a product reuses its prices.
  const cache = new Map();

  // Console output in the style of Hlídač shopů: a coloured prefix, then a short sentence.
  // "log" is the overview, "debug" (Verbose level) the per-request detail, "warn" a problem.
  const LOG_STYLE = 'background:#545fef;color:#fff;border-radius:3px;padding:1px 6px;font-weight:600';
  // The message is a separate argument, not part of the format string, so a "%" in it is harmless.
  const logHead = ['%cAlza Benefit Prices%c', LOG_STYLE, ''];
  const log = (message, ...details) => console.info(...logHead, message, ...details);
  const debug = (message, ...details) => console.debug(...logHead, message, ...details);
  const warn = (message, ...details) => console.warn(...logHead, message, ...details);

  function scriptVersion() {
    return (typeof GM_info !== 'undefined' && GM_info?.script?.version)
      || (typeof GM !== 'undefined' && GM.info?.script?.version) || '';
  }

  // Safari Userscripts exposes asynchronous GM.* storage APIs.
  async function getSetting(key, fallback) {
    if (typeof GM !== 'undefined' && typeof GM.getValue === 'function') return await GM.getValue(key, fallback);
    if (typeof GM_getValue === 'function') return await GM_getValue(key, fallback);
    throw new Error(LOG.noStorage);
  }

  async function setSetting(key, value) {
    if (typeof GM !== 'undefined' && typeof GM.setValue === 'function') return await GM.setValue(key, value);
    if (typeof GM_setValue === 'function') return await GM_setValue(key, value);
    throw new Error(LOG.noStorageWrite);
  }

  let settingWrites = Promise.resolve();
  function saveSetting(key, value) {
    log(LOG.logSetting + key + ' = ' + (key === 'affiliate-idp' ? (value ? LOG.settingOn : LOG.settingOff) : JSON.stringify(value)));
    settingWrites = settingWrites.then(() => setSetting(key, value))
      .catch(error => warn(LOG.saveFailed + error.message));
  }

  const ALL_TIERS = [
    { name: 'Gold', pgrik: 'p_pg4_e6c95' },
    { name: 'Silver', pgrik: 'p_pg3_36eef' },
    { name: 'ISIC', pgrik: 'p_pg3is1_2b2fc' },
    { name: 'Bronze', pgrik: 'p_pg5_44266' },
    { name: 'B2B', pgrik: 'p_pg6_6ce49' },
    { name: 'Basic', pgrik: 'p__26752', reference: true, badge: 'regular' },
  ];
  // Alza.hu and Alza.at have no ISIC price list, so ISIC is left out there completely (table, settings,
  // copying, requests).
  const TIERS = hasIsic ? ALL_TIERS : ALL_TIERS.filter(tier => tier.name !== 'ISIC');
  const [saved, savedPlus, savedCashback, savedTradeIn, savedAlways, savedBelowPhoto, savedIdp] = await Promise.all([
    getSetting('enabled-price-tiers', {}),
    getSetting('alza-plus-promos', true),
    getSetting('cashback-price-promos', true),
    getSetting('trade-in-promos', true),
    getSetting('always-show-tiers', false),
    getSetting('panel-below-photo', false),
    getSetting('affiliate-idp', ''),
  ]);
  const enabled = Object.fromEntries(TIERS.map(tier => [tier.name, saved?.[tier.name] !== false]));
  let alzaPlusPromos = savedPlus !== false;
  let cashbackPromos = savedCashback !== false;
  let tradeInPromos = savedTradeIn !== false;
  let alwaysShow = savedAlways === true;
  let belowPhoto = savedBelowPhoto === true;
  let belowPhotoOption = null;
  // Affiliate ID added to the copied link as ?idp=<number>; digits only.
  let affiliateId = String(savedIdp ?? '').replace(/\D/g, '').slice(0, 12);
  log(LOG.logVersion + (scriptVersion() || '?') + ' — ' + location.hostname + (mobile ? LOG.logMobile : '') + LOG.logCountry + country);
  // Keys are the storage keys of the settings, so the overview is the same in every shop.
  debug(LOG.logSettings, {
    'enabled-price-tiers': { ...enabled }, 'alza-plus-promos': alzaPlusPromos, 'cashback-price-promos': cashbackPromos,
    'trade-in-promos': tradeInPromos, 'always-show-tiers': alwaysShow, 'panel-below-photo': belowPhoto, 'affiliate-idp': Boolean(affiliateId),
  });
  let activeId = null;
  let generation = 0;
  let panel = null;
  let pending = [];

  function productId(pathname, search = '') {
    const variant = new URLSearchParams(search).get('dq');
    if (/^\d+$/.test(variant || '')) return variant;
    return pathname.match(/-d(\d+)(?:\.htm|\/|$)/i)?.[1] || null;
  }

  function apiUrl(id, tier) {
    const url = new URL(`https://webapi.alza.cz/api/commodity/v1/${id}/detailPriceInfoV3`);
    url.search = new URLSearchParams({ country, pgrik: tier.pgrik, ucik: 'null' });
    return url.href;
  }

  // The same API data is read by the table and by the copied offer, so each result is computed once.
  const priceMemo = new WeakMap();
  function extractPrice(data, reference = false, promos = { plus: alzaPlusPromos, cashback: cashbackPromos, tradeIn: tradeInPromos }) {
    if (!data || typeof data !== 'object') return computePrice(data, reference, promos);
    let byKey = priceMemo.get(data);
    if (!byKey) priceMemo.set(data, byKey = new Map());
    const key = [reference, promos.plus, promos.cashback, promos.tradeIn].map(Number).join('');
    if (!byKey.has(key)) byKey.set(key, computePrice(data, reference, promos));
    return byKey.get(key);
  }

  function computePrice(data, reference, promos) {
    function findPricing(value, depth = 0) {
      if (!value || typeof value !== 'object' || depth > 30) return null;
      if (value.mainPriceTag || Array.isArray(value.promoPrices)) return value;
      for (const child of Object.values(value)) {
        const result = findPricing(child, depth + 1);
        if (result) return result;
      }
      return null;
    }
    const pricing = findPricing(data);
    if (!pricing) return null;
    const main = pricing.mainPriceTag;
    // "Novinka" uses priceType 7 while its priceGroupType can remain zero.
    if (!reference && main?.priceGroupType === 0 && main.priceType !== 7) return { hidden: true };
    function candidate(value, promo = false) {
      if (!value || !['string', 'number'].includes(typeof value.primaryPrice)) return null;
      const price = String(value.primaryPrice).trim();
      let numeric = price.replace(/\s/g, '').replace(/(?:Kč|CZK|€|EUR|Ft|HUF)$/i, '').replace(/[,.][-–—]$/, '');
      if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(numeric)) numeric = numeric.replace(/\./g, '');
      if (!/^\d+(?:[,.]\d{1,2})?$/.test(numeric)) return null;
      const amount = Number(numeric.replace(',', '.'));
      if (!Number.isFinite(amount)) return null;
      return {
        price, amount, promo, priceType: value.priceType,
        name: promo && typeof value.name === 'string' ? value.name.trim() : '',
        coupon: promo && typeof value.discountCouponCode === 'string' ? value.discountCouponCode.trim() : '',
      };
    }
    // Prefer the main price on a tie, so a coupon is shown only if it saves money.
    const mainCandidate = candidate(main);
    let selected = mainCandidate;
    for (const promo of Array.isArray(pricing.promoPrices) ? pricing.promoPrices : []) {
      if (!promos.plus && promo?.priceType === 4) continue;
      if (!promos.cashback && promo?.priceType === 1) continue;
      if (!promos.tradeIn && promo?.priceType === 2) continue;
      const next = candidate(promo, true);
      if (next && (!selected || next.amount < selected.amount)) selected = next;
    }
    const compare = candidate({ primaryPrice: main?.comparePrice });
    // When the original comparison price is missing, measure the coupon saving
    // against the main price before applying the coupon.
    const discountBase = compare || (selected?.promo ? mainCandidate : null);
    if (!reference && (main?.priceType === 7 || main?.priceType === 4)) {
      if (!selected || !discountBase || selected.amount === discountBase.amount) return { hidden: true };
    }
    if (selected) {
      selected.discountPercent = discountBase && discountBase.amount > 0 && discountBase.amount > selected.amount
        ? (discountBase.amount - selected.amount) / discountBase.amount * 100 : null;
      selected.discountBaseAmount = discountBase?.amount ?? null;
      selected.mainAmount = mainCandidate?.amount ?? null;
    }
    return selected;
  }

  // Requests of the panel are tracked so a new load can cancel them; "track = false" is for the
  // copied offer, which must not be cut short by a reload.
  function request(url, track = true) {
    return new Promise((resolve, reject) => {
      let handle;
      let settled = false;
      const finish = callback => value => {
        if (settled) return;
        settled = true;
        pending = pending.filter(item => item !== tracked);
        callback(value);
      };
      const fail = finish(reject);
      const tracked = { abort() {
        fail(new Error(LOG.cancelled));
        try { handle?.abort?.(); } catch { /* The request may already be finished. */ }
      } };
      if (track) pending.push(tracked);
      const succeed = finish(response => resolve({
        status: response.status,
        responseText: typeof response.responseText === 'string' ? response.responseText : String(response.response ?? ''),
        finalUrl: response.finalUrl || response.responseURL || url,
      }));
      const details = {
        method: 'GET', url, timeout: 20000, responseType: 'text',
        headers: { Accept: 'application/json, text/html;q=0.9' },
        onload: succeed,
        onerror: () => fail(new Error(LOG.requestError)),
        ontimeout: () => fail(new Error(LOG.timeout)),
        onabort: () => fail(new Error(LOG.cancelled)),
      };
      try {
        if (typeof GM !== 'undefined' && typeof GM.xmlHttpRequest === 'function') {
          handle = GM.xmlHttpRequest(details);
        } else if (typeof GM_xmlhttpRequest === 'function') {
          handle = GM_xmlhttpRequest(details);
        } else {
          throw new Error(LOG.noRequest);
        }
        // Userscripts returns an abortable Promise; other managers can use callbacks.
        if (typeof handle?.then === 'function') handle.then(succeed, fail);
      } catch (error) { fail(error); }
    });
  }

  function cancel() {
    generation++;
    const requests = pending;
    pending = [];
    requests.forEach(handle => handle.abort());
  }

  function node(tag, text, parent) {
    const item = document.createElement(tag);
    if (text != null) item.textContent = text;
    if (parent) parent.append(item);
    return item;
  }

  function formatPrice(amount) {
    if (euro) return (Number.isInteger(amount) ? priceFormat : centsFormat).format(amount) + ' €';
    if (country === 'HU') return priceFormat.format(amount) + ' Ft';
    return priceFormat.format(amount) + ' Kč';
  }

  // Panel style of Alza's own prices, e.g. "549,-" on alza.cz; other shops keep their currency sign.
  function formatPanelPrice(amount) {
    return country === 'CZ' ? priceFormat.format(amount) + ',-' : formatPrice(amount);
  }

  function formatDiscount(percent) {
    return percent > 0 ? '−' + discountFormat.format(percent) + ' %' : '';
  }

  // Alza's API gives ISIC the very same cashback price as BASIC, so the ISIC discount is lost. When ISIC
  // has a discount of its own and its cashback price equals BASIC's, the price is worked out like for the
  // other tiers: ISIC's own price minus the cashback amount that BASIC gets (its price minus its cashback
  // price). Returns the same object when nothing applies.
  function estimateIsicCashback(isic, basic) {
    const cashback = result => result?.promo && result.priceType === 1;
    if (!cashback(isic) || !cashback(basic) || isic.amount !== basic.amount) return isic;
    if (!(isic.mainAmount > 0 && basic.mainAmount > 0 && isic.mainAmount < basic.mainAmount)) return isic;
    const cashbackAmount = basic.mainAmount - basic.amount;
    const raw = isic.mainAmount - cashbackAmount;
    if (!(cashbackAmount > 0 && raw > 0)) return isic;
    const amount = euro ? Math.round(raw * 100) / 100 : Math.round(raw);
    const base = isic.discountBaseAmount;
    const percent = base > amount ? (base - amount) / base * 100 : null;
    log(LOG.isicEstimate + formatPrice(amount) + (percent ? ' (' + formatDiscount(percent) + ')' : ''));
    return { ...isic, amount, price: formatPanelPrice(amount), discountPercent: percent, estimated: true };
  }

  // Tiers that share one row when their prices match: ISIC joins Silver, B2B joins Bronze.
  const TIER_PAIRS = [['ISIC', 'Silver'], ['B2B', 'Bronze']];
  function foldPairs(items, merge) {
    for (const [name, into] of TIER_PAIRS) {
      const source = items.find(item => item.tier.name === name);
      const target = items.find(item => item.tier.name === into);
      if (source && target && source.amount === target.amount) merge(target, source);
    }
  }

  // BASIC stands for all the other tiers (shown as OSTATNÍ) when every one of them has a known price
  // and exactly one differs from BASIC. Used by the table and by the copied offer; returns that tier.
  function onlyDifferent(basicAmount, others, amountOf) {
    if (basicAmount == null || others.length < 2) return null;
    const amounts = others.map(amountOf);
    if (amounts.some(amount => amount == null)) return null;
    const distinct = others.filter((item, index) => amounts[index] !== basicAmount);
    return distinct.length === 1 ? distinct[0] : null;
  }

  function visibleRows(rows) {
    return rows.filter(row => row.valid && !row.tr.hidden).sort((a, b) => a.amount - b.amount);
  }

  // The write has to start inside the click: Safari refuses it once the click is "used up" by waiting.
  // ClipboardItem takes the text as a promise, so the write starts at once and gets the text later.
  async function writeClipboard(textPromise) {
    const clipboard = navigator.clipboard;
    if (!clipboard) throw new Error(LOG.noClipboard);
    if (typeof ClipboardItem === 'function' && typeof clipboard.write === 'function') {
      try {
        await clipboard.write([new ClipboardItem({ 'text/plain': textPromise.then(text => new Blob([text], { type: 'text/plain' })) })]);
        return;
      } catch { /* Older ClipboardItem without promises: fall back to writeText below. */ }
    }
    if (typeof clipboard.writeText !== 'function') throw new Error(LOG.noClipboard);
    await clipboard.writeText(await textPromise);
  }

  // "S kódem X" -> "Ceny s kódem X" (or "Cena s kódem X" for a single price), "Cena s Cashback" -> "Ceny s Cashback".
  function pricesLabel(label, single = false) {
    if (label.startsWith(T.withWord)) label = (single ? T.priceWith : T.pricesWith) + label.slice(T.withWord.length);
    // Names that Alza sends ("Cena s Cashback") are turned into the same wording.
    return label.replace(/^Cena s /, single ? T.priceWith : T.pricesWith).replace(/^Cena /, single ? T.price : T.prices);
  }

  // The same promotion for the console, which is always English (no translated wording).
  function promoLogLabel(result) {
    if (!result.promo) return '';
    return result.priceType === 4 ? 'AlzaPlus+' : result.coupon ? 'code ' + result.coupon : result.name || 'promotion';
  }

  function promoLabel(result) {
    if (!result.promo) return '';
    return result.priceType === 4 ? T.withWord + 'AlzaPlus+' : result.coupon
      ? T.withCode + result.coupon : result.name || T.promoDefault;
  }

  function svgIcon(path, withCenter = false) {
    const namespace = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(namespace, 'svg');
    for (const [key, value] of Object.entries({
      viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none',
      stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linejoin': 'round',
      'aria-hidden': 'true', focusable: 'false',
    })) icon.setAttribute(key, value);
    const outline = document.createElementNS(namespace, 'path');
    outline.setAttribute('d', path);
    icon.append(outline);
    if (withCenter) {
      const center = document.createElementNS(namespace, 'circle');
      center.setAttribute('cx', '12');
      center.setAttribute('cy', '12');
      center.setAttribute('r', '3');
      icon.append(center);
    }
    return icon;
  }

  // Hlídač shopů is injected after the page loads; re-mount as soon as a sibling appears.
  let mountFrame = 0;
  const mountObserver = new MutationObserver(() => {
    if (mountFrame) return;
    mountFrame = requestAnimationFrame(() => { mountFrame = 0; if (panel) mount(panel.host); });
  });

  // The gallery can render after the panel; retry briefly until the photo strip exists.
  let stripRetries = 0;
  let stripTimer = 0;
  let observedParent = null;

  function mount(host) {
    place(host);
    clearTimeout(stripTimer);
    if (belowPhoto && !mobile && !photoStrip() && stripRetries++ < 12) {
      stripTimer = setTimeout(() => { if (panel) mount(panel.host); }, 250);
    }
    if (host.parentNode !== observedParent) {
      mountObserver.disconnect();
      observedParent = host.parentNode;
      // The parent and its parent: a block that renders next to the panel's wrapper (e.g. the gift) counts too.
      if (observedParent) mountObserver.observe(observedParent, { childList: true });
      if (observedParent?.parentNode) mountObserver.observe(observedParent.parentNode, { childList: true });
    }
  }

  // Alza's gallery classes are generated, so anchor on the stable #detailPicture wrapper.
  function photoStrip() {
    return document.querySelector('#detailPicture');
  }

  // Remembered so that the console says where the panel went only when that changes.
  let lastPlacement = '';
  function placed(where) {
    if (where === lastPlacement) return;
    lastPlacement = where;
    log(LOG.placed + where + '.');
  }

  function place(host) {
    // Hlídačshopů's content lives in a closed shadow root; use its outer host.
    const tracker = document.querySelector('[data-hs], #hlidacShopu');
    // Desktop only: offered whenever the photo strip is on the page.
    const strip = mobile ? null : photoStrip();
    if (belowPhotoOption) belowPhotoOption.hidden = !strip;
    if (strip && belowPhoto) {
      host.style.margin = '12px 0';
      host.style.order = '';
      // A gift block ("dárek") in the same column, after the photo, keeps its place above the panel.
      const gift = document.querySelector('[data-react-client-component="promoListModule"]');
      const anchor = gift && gift.parentNode.contains(strip) && !gift.contains(strip)
        && strip.compareDocumentPosition(gift) & Node.DOCUMENT_POSITION_FOLLOWING ? gift : strip;
      if (anchor.nextElementSibling !== host) anchor.after(host);
      placed(anchor === gift ? LOG.placedGift : LOG.placedPhoto);
      return;
    }
    host.style.margin = mobile ? '0' : '0 0 12px';
    const before = tracker || document.querySelector('[data-react-client-component="alternativePricingModule"]');
    if (before) {
      host.style.order = before.style.order || '';
      if (before.previousElementSibling !== host) before.before(host);
      placed(tracker ? LOG.placedTracker : LOG.placedModule);
      return;
    }
    const price = document.querySelector('.js-price-detail__main-price-box-wrapper, [data-testid="price-primary"]');
    const after = price?.closest('.price-detail__row') || price;
    if (after && after.nextElementSibling !== host) after.after(host);
    if (after) placed(LOG.placedPrice);
  }

  // Styles of the panel (it lives in a shadow root, so the page's CSS cannot touch it).
  const PANEL_CSS = `
  :host{--row-h:28px;text-align:left;display:block;clear:both;font:13px "IBM Plex Sans Var",system-ui,sans-serif;color:#000;line-height:1.4;font-kerning:normal;font-variant-numeric:lining-nums;-webkit-text-size-adjust:100%;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:geometricPrecision}
  :host([hidden]),[hidden]{display:none!important}
  *{box-sizing:border-box;font-family:inherit}
  .sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  section{position:relative;background:#fff;border:1px solid #e8e8e8;border-radius:14px;padding:8px}

  /* Table */
  table{border-collapse:collapse;table-layout:fixed;width:100%;margin:0}
  th:first-child{width:38%}th:nth-child(2){width:36%}th:last-child{width:26%}
  th,td{text-align:left;vertical-align:top;padding:10px 8px;border-bottom:1px solid #e8e8e8}
  th{font-size:14px;font-weight:500;color:#6b6b6b}
  thead th{padding-top:4px}
  td:nth-child(2){font-size:16px;font-weight:700;color:#ca0505;overflow-wrap:anywhere}
  tbody tr:last-child td{border-bottom:0}
  tbody td:nth-child(2){line-height:var(--row-h)}
  tfoot td{vertical-align:baseline;border-bottom:0;border-top:1px solid #e8e8e8;padding-top:14px;padding-bottom:8px;color:#6b6b6b;font-size:14px}
  tfoot td:nth-child(2){color:#6b6b6b;font-size:16px;font-weight:700}
  .discount{white-space:nowrap}
  .discount-value{display:inline-flex;align-items:center;justify-content:center;height:var(--row-h);min-width:5.6em;font-variant-numeric:tabular-nums;padding:0 8px;border-radius:4px;background:#5dbd2f;color:#fff;font-size:15px;font-weight:700}
  .th-note{display:block;margin-top:2px;font-size:12px;font-weight:400}
  .shared-promo .promo-label{display:none}
  .promo-label{display:block;margin-top:5px;font-size:12px;font-weight:400;color:#6b6b6b;line-height:1.4}

  /* Tier badges */
  .badges{display:flex;flex-wrap:wrap;gap:6px}
  .tier-badge{display:inline-flex;align-items:center;height:var(--row-h);padding:0 10px;border-radius:4px;font-size:14px;font-weight:600;line-height:1.2;text-transform:uppercase;background:#c2c2c2;color:#171717}
  .tier-gold{background:#ffd500;color:#171717}
  .tier-bronze{background:#d2822d;color:#fff}
  .tier-isic{background:#3cba9c;color:#fff}
  .tier-b2b{background:#3a349f;color:#fff}
  .tier-regular{background:#f0f0f0;color:#606060}

  /* Footer and buttons */
  .credit{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:10px;padding:0 8px 2px;font-size:12px;color:#6b6b6b}
  section:has(table:not([hidden]) tfoot tr:not([hidden])) .credit{margin-top:2px}
  .footer-buttons{display:flex;gap:6px;flex-shrink:0}
  .gear{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;color:#6b6b6b;cursor:pointer}
  .gear:hover,.gear[aria-expanded="true"]{background:#f5f5f5;color:#000}
  .gear.done{background:#e9f7e1;border-color:#5dbd2f;color:#2f7a12}
  .gear.failed{border-color:#ca0505;color:#ca0505}
  .gear:focus-visible,input:focus-visible,.settings-info a:focus-visible,.credit a:focus-visible{outline:2px solid #545fef;outline-offset:2px}
  .price-notice{flex:1;color:#606060;font-size:13px}
  .footer-message .credit{margin-top:0;padding:0 4px;justify-content:flex-start}
  .footer-message .gear{flex-shrink:0}
  .load-error{color:#ca0505}

  /* Settings */
  .settings{display:grid;gap:16px;padding:0 8px 12px;margin-top:8px}
  .settings label{display:flex;gap:7px;align-items:center;min-height:30px;cursor:pointer}
  .settings input{accent-color:#545fef;width:16px;height:16px;margin:0}
  .settings fieldset{width:100%;min-width:0;margin:0;padding:0;border:0}
  .settings legend{padding:0;margin-bottom:4px;color:#606060;font-size:12px;font-weight:600}
  .settings-options{display:grid;width:100%;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 16px}
  .view-options{display:flex;flex-wrap:wrap;gap:4px 20px}
  .view-options .option{display:contents}
  .option-row{display:flex;align-items:center;gap:8px}
  .idp-wrap{position:relative;display:inline-flex;align-items:center}
  .idp-clear{position:absolute;right:4px;width:22px;height:22px;padding:0;border:0;border-radius:50%;background:transparent;color:#6b6b6b;font-size:16px;line-height:1;cursor:pointer}
  .idp-clear:hover{background:#f0f0f0;color:#000}
  .idp-clear:focus-visible{outline:2px solid #545fef;outline-offset:1px}
  .settings .idp-input{width:110px;height:30px;padding:0 28px 0 8px;border:1px solid #c2c2c2;border-radius:8px;background:#fff;color:#000;font-size:13px}
  .help{flex-shrink:0;width:22px;height:22px;padding:0;border:1px solid #e8e8e8;border-radius:50%;background:#fff;color:#6b6b6b;font-size:12px;font-weight:600;line-height:1;cursor:pointer}
  .help:hover{background:#f5f5f5;color:#000}
  .help:focus-visible{outline:2px solid #545fef;outline-offset:2px}
  .tip{position:absolute;z-index:10;padding:8px 12px;border:1px solid #e8e8e8;border-radius:8px;background:#f5f5f5;color:#000;font-size:12px;line-height:1.5;pointer-events:none;text-wrap:pretty;box-shadow:0 4px 16px rgba(0,0,0,.12)}
  .settings-group{padding-top:12px!important;border-top:1px solid #e8e8e8!important}
  .settings-info{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px 16px;padding-top:12px;border-top:1px solid #e8e8e8;color:#6b6b6b;font-size:12px}
  .settings-info a,.credit a{color:inherit;text-decoration:underline;text-underline-offset:2px}
  .settings-only{border:0;padding:0}
  .settings-only .credit{margin-top:0;justify-content:flex-end}

  @media(max-width:420px){
    section{padding:6px}
    th,td{padding:10px 6px}
    th{font-size:13px}
    .gear{width:40px;height:40px}
    :host{--row-h:26px}
    .tier-badge{padding:0 7px;font-size:12px}
    .discount-value{padding:0 6px;font-size:13px}
    .promo-label{font-size:11px;overflow-wrap:anywhere}
    .settings-options{column-gap:8px}
    .settings label{gap:5px;font-size:12px}
    .settings input{flex-shrink:0}
  }
  `;

  function createPanel(id) {
    const host = node('div');
    host.id = 'local-alza-price-tiers';
    host.hidden = true;
    Object.assign(host.style, {
      position: 'relative', width: '100%', minWidth: '0',
      margin: mobile ? '0' : '0 0 12px', padding: mobile ? '4px 0 8px' : '0',
    });
    const shadow = host.attachShadow({ mode: 'open' });
    node('style', PANEL_CSS, shadow);
    const section = node('section', null, shadow);
    section.id = 'price-table';
    section.setAttribute('aria-label', T.tableLabel + TIERS.map(tier => tier.name).join(', '));
    // One shared live region announces the result instead of every price cell.
    const status = node('div', null, section);
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    const table = node('table', null, section);
    const heading = node('tr', null, node('thead', null, table));
    node('th', T.thTier, heading).scope = 'col';
    const priceHeader = node('th', T.thPrice, heading);
    priceHeader.scope = 'col';
    // Shown instead of the per-row labels when every visible row has the same promo.
    const priceNote = node('span', null, priceHeader);
    priceNote.className = 'th-note';
    priceNote.hidden = true;
    node('th', T.thDiscount, heading).scope = 'col';
    const tbody = node('tbody', null, table);
    const rows = TIERS.map(tier => {
      const tr = node('tr', null, tbody);
      const label = node('td', null, tr);
      const badges = node('div', null, label);
      badges.className = 'badges';
      const badge = node('div', tier.name.toUpperCase(), badges);
      badge.className = 'tier-badge tier-' + (tier.badge || tier.name.toLowerCase());
      const price = node('td', '—', tr);
      const discount = node('td', '—', tr);
      discount.className = 'discount';
      return { tier, price, discount, tr, badge, displayName: tier.name.toUpperCase() };
    });
    const originalRow = node('tr', null, node('tfoot', null, table));
    originalRow.hidden = true;
    node('td', T.originalPrice, originalRow);
    const originalPrice = node('s', null, node('td', null, originalRow));
    node('td', '', originalRow);
    const footer = node('footer', null, section);
    footer.className = 'credit';
    const buttons = node('div', null, footer);
    buttons.className = 'footer-buttons';
    const gear = node('button', null, buttons);
    gear.append(svgIcon('M19.42 9.59L21.85 10.26L21.85 13.74L19.42 14.41L18.95 15.54L20.19 17.74L17.74 20.19L15.54 18.95L14.41 19.42L13.74 21.85L10.26 21.85L9.59 19.42L8.46 18.95L6.26 20.19L3.81 17.74L5.05 15.54L4.58 14.41L2.15 13.74L2.15 10.26L4.58 9.59L5.05 8.46L3.81 6.26L6.26 3.81L8.46 5.05L9.59 4.58L10.26 2.15L13.74 2.15L14.41 4.58L15.54 5.05L17.74 3.81L20.19 6.26L18.95 8.46Z', true));
    gear.className = 'gear';
    gear.type = 'button';
    gear.title = T.settingsTitle;
    gear.setAttribute('aria-label', T.settingsTitle);
    gear.setAttribute('aria-expanded', 'false');
    const copy = node('button', null, buttons);
    copy.className = 'gear';
    copy.type = 'button';
    copy.title = T.copyOffer;
    copy.setAttribute('aria-label', T.copyOffer);
    copy.hidden = true;
    copy.append(svgIcon('M8 8H20V21H8Z M16 8V3H3V16H8'));
    const notice = node('span', T.equalNotice, footer);
    notice.className = 'price-notice';
    notice.hidden = true;
    // Shown when no tier could be loaded at all (blocked API, network error).
    const loadError = node('span', T.loadError, footer);
    loadError.className = 'price-notice load-error';
    loadError.hidden = true;
    const credit = node('span', T.createdBy, footer);
    const creditLink = node('a', 'Dexnis', credit);
    creditLink.href = 'https://github.com/dexnis-dev';
    creditLink.target = '_blank';
    creditLink.rel = 'noopener noreferrer';
    const settings = node('div', null, section);
    // Help for the "?" buttons: a bubble on hover or focus with a mouse; on touch it stays until
    // you tap elsewhere.
    const tip = node('div', null, section);
    tip.className = 'tip';
    tip.id = 'help-tip';
    tip.hidden = true;
    tip.setAttribute('role', 'tooltip');
    const touchOnly = () => mobile || matchMedia('(hover: none)').matches;
    let tipText = '';
    let tipButton = null;
    // The open bubble describes its button, so a screen reader reads it with the button.
    function hideTip() {
      tip.hidden = true;
      tipText = '';
      tipButton?.removeAttribute('aria-describedby');
      tipButton = null;
    }
    function showTip(button, text) {
      tipButton?.removeAttribute('aria-describedby');
      tipButton = button;
      button.setAttribute('aria-describedby', tip.id);
      tipText = text;
      tip.textContent = text;
      tip.hidden = false;
      const box = section.getBoundingClientRect();
      const target = button.getBoundingClientRect();
      const width = Math.min(260, box.width - 16);
      tip.style.width = width + 'px';
      const left = target.left - box.left + target.width / 2 - width / 2;
      tip.style.left = Math.max(8, Math.min(left, box.width - width - 8)) + 'px';
      const above = target.top - box.top - tip.offsetHeight - 8;
      tip.style.top = (above >= 0 ? above : target.bottom - box.top + 8) + 'px';
    }
    function attachHelp(button, text) {
      button.addEventListener('mouseenter', () => { if (!touchOnly()) showTip(button, text); });
      button.addEventListener('mouseleave', () => { if (!touchOnly()) hideTip(); });
      button.addEventListener('focus', () => { if (!touchOnly()) showTip(button, text); });
      button.addEventListener('blur', () => { if (!touchOnly()) hideTip(); });
      button.addEventListener('click', () => {
        if (touchOnly() && !tip.hidden && tipText === text) hideTip();
        else showTip(button, text);
      });
    }
    // A tap or click anywhere else, or the Escape key, closes the bubble.
    const outside = new AbortController();
    document.addEventListener('pointerdown', event => {
      if (!event.composedPath().some(element => element.classList?.contains('help'))) hideTip();
    }, { signal: outside.signal, capture: true });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !tip.hidden) hideTip();
    }, { signal: outside.signal, capture: true });
    settings.className = 'settings';
    settings.id = 'price-tier-settings';
    settings.hidden = true;
    gear.setAttribute('aria-controls', settings.id);
    const state = { dispose: () => outside.abort(), host, rows, table, section, status, priceNote, credit, notice, loadError, settings, copy, originalRow, originalPrice, loaded: false };
    let copyReset = 0;
    function setCopyState(label, className) {
      copy.className = className ? 'gear ' + className : 'gear';
      copy.title = label;
      copy.setAttribute('aria-label', label);
    }
    function resetCopy() {
      clearTimeout(copyReset);
      setCopyState(T.copyOffer);
    }
    function showCopyState(label, className) {
      clearTimeout(copyReset);
      setCopyState(label, className);
      copyReset = setTimeout(resetCopy, 2000);
    }
    state.resetCopy = resetCopy;
    // The copied offer ignores which tiers, promos and view are switched on in the panel. It uses the
    // prices already loaded for the panel (even if older than the cache time) so no network is awaited.
    async function offerText() {
      const offer = await buildOffer(id, true);
      if (id !== activeId) throw new Error(LOG.pageChanged);
      if (!offer) throw new Error(LOG.nothingToCopy);
      const title = document.querySelector('h1')?.textContent.trim() || T.productFallback;
      const lines = ['## ' + title, ''];
      const original = offer.original !== null ? T.originalColon + '~~' + formatPrice(offer.original) + '~~' : '';
      const priceText = entry => formatPrice(entry.amount)
        + (formatDiscount(entry.result.discountPercent) ? ' (' + formatDiscount(entry.result.discountPercent) + ')' : '');
      if (offer.single) {
        // Every tier costs the same and there is no discount: just the price.
        lines.push('- ' + formatPrice(offer.entries[0].amount));
      } else {
        // Rows with the same promo form one block. The original price stands once at the top;
        // every block with a promo has its own "**➔ Ceny s kódem X:**" line. Rows without a
        // promo come first, directly under the original price.
        const groups = [];
        for (const entry of offer.entries) {
          const label = promoLabel(entry.result);
          let group = groups.find(item => item.label === label);
          if (!group) groups.push(group = { label, entries: [] });
          group.entries.push(entry);
        }
        groups.sort((a, b) => Boolean(a.label) - Boolean(b.label));
        const blocks = groups.map((group, index) => {
          const block = [];
          let header = index === 0 ? original : '';
          if (group.label) {
            const arrow = index > 0 || header ? '➔ ' : '';
            const promo = '**' + arrow + pricesLabel(group.label, group.entries.length === 1) + ':**';
            header = header ? header + ' ' + promo : promo;
          }
          if (header) block.push(header);
          // A lone OSTATNÍ/BASIC under its own promo header is simply "the price of the others".
          const bare = Boolean(group.label) && group.entries.length === 1
            && [T.others, 'BASIC'].includes(group.entries[0].names[0]);
          for (const entry of group.entries) {
            block.push('- ' + (entry.names.length && !bare ? '**' + entry.names.join('/') + '**: ' : '') + priceText(entry));
          }
          return block.join('\n');
        });
        lines.push(blocks.join('\n'));
      }
      const url = new URL(location.href);
      // Always the desktop address (www.alza.cz), also when copied from m.alza.cz or the bare domain.
      url.hostname = url.hostname.replace(/^(?:m\.|www\.)?(alza\.(?:cz|sk|hu|de|at))$/i, 'www.$1');
      // The /EN/ language prefix is not part of the copied link.
      url.pathname = url.pathname.replace(/^\/en(?=\/)/i, '');
      const variant = url.searchParams.get('dq');
      url.search = '';
      if (variant !== null) url.searchParams.set('dq', variant);
      if (affiliateId) url.searchParams.set('idp', affiliateId);
      url.hash = '';
      lines.push('', T.link + url.href);
      return lines.join('\n');
    }
    copy.onclick = async () => {
      try {
        const text = offerText();
        await writeClipboard(text);
        showCopyState(T.copied, 'done');
        log(LOG.copiedLog, '\n' + await text);
      } catch (error) {
        showCopyState(T.copyFailedTitle, 'failed');
        warn(LOG.copyFailedLog + error.message);
      } finally { copy.focus({ preventScroll: true }); }
    };
    gear.onclick = () => {
      settings.hidden = !settings.hidden;
      gear.setAttribute('aria-expanded', String(!settings.hidden));
      section.classList.toggle('settings-only', table.hidden && settings.hidden && notice.hidden && loadError.hidden);
    };
    // A labelled checkbox; "change" saves a setting and schedules a reload of the prices.
    function addCheckbox(parent, text, checked, onChange) {
      const label = node('label', null, parent);
      const box = node('input', null, label);
      box.type = 'checkbox';
      box.checked = checked;
      box.onchange = () => onChange(box.checked);
      node('span', text, label);
      return label;
    }
    function change(key, value) {
      saveSetting(key, value);
      scheduleLoad(id, state);
    }
    function addGroup(title, optionsClass) {
      const group = node('fieldset', null, settings);
      group.className = 'settings-group';
      node('legend', title, group);
      const options = node('div', null, group);
      options.className = optionsClass;
      return options;
    }
    const tierOptions = addGroup(T.groupTiers, 'settings-options');
    for (const tier of TIERS) {
      addCheckbox(tierOptions, tier.name, enabled[tier.name], value => {
        enabled[tier.name] = value;
        change('enabled-price-tiers', { ...saved, ...enabled });
      });
    }
    const actionOptions = addGroup(T.groupPromos, 'settings-options');
    addCheckbox(actionOptions, 'AlzaPlus+', alzaPlusPromos, value => { alzaPlusPromos = value; change('alza-plus-promos', value); });
    addCheckbox(actionOptions, 'Cashback', cashbackPromos, value => { cashbackPromos = value; change('cashback-price-promos', value); });
    addCheckbox(actionOptions, T.tradeIn, tradeInPromos, value => { tradeInPromos = value; change('trade-in-promos', value); });
    const viewOptions = addGroup(T.groupView, 'settings-options view-options');
    // A checkbox with a "?" button that explains it.
    function viewOption(text, hint, checked, update) {
      const option = node('div', null, viewOptions);
      option.className = 'option';
      const row = node('div', null, option);
      row.className = 'option-row';
      addCheckbox(row, text, checked, update);
      const help = node('button', '?', row);
      help.className = 'help';
      help.type = 'button';
      help.setAttribute('aria-label', T.helpAbout + text);
      attachHelp(help, hint);
      return option;
    }
    viewOption(T.optAlways,
      T.optAlwaysHint,
      alwaysShow, value => { alwaysShow = value; change('always-show-tiers', value); });
    belowPhotoOption = viewOption(T.optLeft,
      T.optLeftHint,
      belowPhoto, value => {
        belowPhoto = value;
        saveSetting('panel-below-photo', value);
        mount(host);
      });
    belowPhotoOption.hidden = true;
    const idpRow = addGroup('Affiliate', 'option-row');
    const idpWrap = node('span', null, idpRow);
    idpWrap.className = 'idp-wrap';
    const idpInput = node('input', null, idpWrap);
    idpInput.setAttribute('aria-label', 'Affiliate');
    idpInput.type = 'text';
    idpInput.inputMode = 'numeric';
    idpInput.maxLength = 12;
    idpInput.placeholder = '1234';
    idpInput.className = 'idp-input';
    idpInput.value = affiliateId;
    const idpClear = node('button', '×', idpWrap);
    idpClear.className = 'idp-clear';
    idpClear.type = 'button';
    idpClear.title = T.clear;
    idpClear.setAttribute('aria-label', T.clearAffiliate);
    idpClear.hidden = !affiliateId;
    const idpHelp = node('button', '?', idpRow);
    idpHelp.className = 'help';
    idpHelp.type = 'button';
    idpHelp.setAttribute('aria-label', T.whatIsAffiliate);
    attachHelp(idpHelp, T.affiliateHint);
    function saveAffiliate() {
      affiliateId = idpInput.value;
      idpClear.hidden = !affiliateId;
      saveSetting('affiliate-idp', affiliateId);
    }
    idpInput.oninput = () => {
      const digits = idpInput.value.replace(/\D/g, '');
      if (digits !== idpInput.value) idpInput.value = digits;
      idpClear.hidden = !digits;
    };
    idpInput.onchange = saveAffiliate;
    idpClear.onclick = () => {
      idpInput.value = '';
      saveAffiliate();
      idpInput.focus();
    };
    const info = node('div', null, settings);
    info.className = 'settings-info';
    const version = scriptVersion();
    node('span', version ? T.version + version : 'Alza Benefit Prices', info);
    const sourceLink = node('a', T.sourceCode, info);
    sourceLink.href = 'https://github.com/dexnis-dev/Alza-Benefit-Prices/';
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    mount(host);
    return state;
  }

  // Raw API data of one tier, from the shared cache or the network. null means the run was superseded.
  // "allowStale" accepts an expired cache entry, so copying never waits for the network.
  async function tierData(id, tier, run, allowStale = false) {
    const url = apiUrl(id, tier);
    const cached = cache.get(url);
    if (cached && (allowStale || Date.now() - cached.time < CACHE_TTL)) {
      // Only the interesting case is logged: an expired entry that the copied offer still uses.
      if (Date.now() - cached.time >= CACHE_TTL) debug(tier.name + LOG.staleCache + Math.round((Date.now() - cached.time) / 1000) + ' s)');
      return cached.data;
    }
    debug(tier.name + ': GET ' + url);
    const response = await request(url, run !== null);
    debug(tier.name + ': HTTP ' + response.status + ', ' + response.responseText.length + ' B');
    if (run !== null && run !== generation) return null;
    if (response.responseText.length > 2 * 1024 * 1024) throw new Error(LOG.tooLarge);
    if (response.status === 403) throw new Error(LOG.blocked);
    if (response.status < 200 || response.status >= 300) throw new Error(LOG.apiHttp + response.status + '.');
    if (response.finalUrl && new URL(response.finalUrl).hostname !== 'webapi.alza.cz') throw new Error(LOG.redirect);
    let data;
    try { data = JSON.parse(response.responseText); }
    catch { throw new Error(LOG.noPrice); }
    cache.set(url, { data, time: Date.now() });
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
    return data;
  }

  // The offer to copy: every tier with a discount, whatever tiers, promos or view the user has switched on.
  async function buildOffer(id, allowStale = false) {
    const all = { plus: true, cashback: true, tradeIn: true };
    const found = await Promise.all(TIERS.map(async tier => {
      try {
        const data = await tierData(id, tier, null, allowStale);
        const result = extractPrice(data, tier.reference, all);
        if (!result) return null;
        // A tier without its own price still has the standard one, which tells whether it equals BASIC.
        if (result.hidden) return { tier, result: null, comparison: extractPrice(data, true, all) };
        return { tier, result, comparison: result };
      } catch (error) {
        debug(tier.name + ': ' + error.message);
        return null;
      }
    }));
    const basic = found.find(item => item?.tier.reference);
    const isicItem = found.find(item => item?.tier.name === 'ISIC');
    if (isicItem?.result && basic?.result) {
      const corrected = estimateIsicCashback(isicItem.result, basic.result);
      if (corrected !== isicItem.result) { isicItem.result = corrected; isicItem.comparison = corrected; }
    }
    const discounted = item => item?.result?.discountPercent > 0;
    const tiers = found.filter(item => item && !item.tier.reference && discounted(item)
      && (!basic || item.result.amount < basic.result.amount));
    const toEntry = (item, result = item.result) => (
      { tier: item.tier, names: [item.tier.name.toUpperCase()], amount: result.amount, result });
    // Same pairs as in the table; the folded entry is dropped from the list.
    const fold = list => {
      foldPairs(list, (target, source) => { target.names.push(...source.names); source.folded = true; });
      return list.filter(entry => !entry.folded);
    };
    let entries = fold(tiers.sort((a, b) => a.result.amount - b.result.amount).map(item => toEntry(item)));
    // Same rule as the OSTATNÍ row of the table: exactly one tier differs from BASIC, so BASIC
    // stands for all the others.
    const others = TIERS.filter(tier => !tier.reference)
      .map(tier => found.find(item => item?.tier === tier) || { tier, comparison: null });
    const lone = basic ? onlyDifferent(basic.result.amount, others, item => item.comparison?.amount ?? null) : null;
    const stands = Boolean(lone) && tiers.includes(lone);
    // BASIC (or OSTATNÍ) is listed only with a discount of its own, as in the table.
    if (entries.length && discounted(basic)) {
      entries.push({ tier: basic.tier, names: [stands ? T.others : 'BASIC'], amount: basic.result.amount, result: basic.result });
    } else if (!entries.length && discounted(basic)) {
      entries = [{ names: [], amount: basic.result.amount, result: basic.result }];
    }
    if (!entries.length) {
      // No discount anywhere: a plain price list instead (one price line when every tier is the same).
      const priced = found.filter(item => item?.result).sort((a, b) => a.result.amount - b.result.amount);
      if (!priced.length) return null;
      const plain = fold(priced.map(item => toEntry(item, { ...item.result, discountPercent: null })));
      const single = priced.every(item => item.result.amount === priced[0].result.amount);
      return { entries: single ? [{ names: ['Cena'], amount: priced[0].result.amount, result: { ...priced[0].result, discountPercent: null } }] : plain,
        original: null, plain: true, single };
    }
    const bases = entries.map(entry => entry.result.discountBaseAmount).filter(amount => amount !== null);
    const original = basic?.result.discountBaseAmount ?? (bases.length && bases.every(a => a === bases[0]) ? bases[0] : null);
    const lowest = Math.min(...entries.map(entry => entry.amount));
    return { entries, original: original !== null && lowest < original ? original : null };
  }

  // Several quick toggles trigger a single reload.
  let reloadTimer = 0;
  function scheduleLoad(id, state) {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => { if (state === panel) void load(id, state); }, 250);
  }

  async function load(id, state) {
    cancel();
    const run = generation;
    state.host.hidden = !state.loaded;
    state.table.hidden = true;
    state.copy.hidden = true;
    state.resetCopy();
    state.status.textContent = '';
    state.section.setAttribute('aria-busy', 'true');
    state.originalRow.hidden = true;
    state.loadError.hidden = true;
    let failed = 0;
    state.rows.forEach(row => { row.tr.hidden = true; row.valid = false; row.result = null; row.amount = null; row.comparisonAmount = null; row.discount.textContent = '—'; row.price.textContent = T.loading; });
    // Writes a price result into the row (also used again when ISIC is corrected).
    function renderResult(row, result) {
      row.price.textContent = result.price;
      row.discount.textContent = '—';
      if (result.discountPercent !== null) {
        row.discount.textContent = '';
        node('span', formatDiscount(result.discountPercent), row.discount).className = 'discount-value';
      }
      if (result.promo) {
        const label = node('span', promoLabel(result), row.price);
        label.className = 'promo-label';
      }
      row.amount = result.amount;
      row.result = result;
      row.valid = true;
      row.tr.hidden = false;
    }
    async function loadRow(row) {
      try {
        const data = await tierData(id, row.tier, run);
        if (run !== generation || data === null) return;
        let result = extractPrice(data, row.tier.reference);
        if (!result) throw new Error(LOG.noPrice);
        // Check equality even when a standard priceGroupType hides the row.
        const comparison = result.hidden ? extractPrice(data, true) : result;
        row.comparisonAmount = comparison?.amount ?? null;
        // With "always show", a tier without its own price falls back to the standard one.
        if (result.hidden && alwaysShow && comparison) result = comparison;
        if (result.hidden) {
          debug(row.tier.name + LOG.noOwnPrice + (comparison ? LOG.standard + comparison.price + ')' : ''));
          row.tr.hidden = true;
          return;
        }
        debug(row.tier.name + ': ' + result.price + (result.promo ? ' ' + promoLogLabel(result) : '')
          + (result.discountPercent ? ' (' + formatDiscount(result.discountPercent) + ')' : ''));
        renderResult(row, result);
      } catch (error) {
        if (run !== generation) return;
        failed++;
        row.tr.hidden = true;
        warn(row.tier.name + ': ' + error.message);
      }
    }
    // Fetch independent tiers together, then BASIC only if a price was found.
    await Promise.all(state.rows.filter(row => !row.tier.reference && enabled[row.tier.name]).map(loadRow));
    if (run !== generation) return;
    const basic = state.rows.find(row => row.tier.reference);
    if (basic && state.rows.some(row => !row.tier.reference && row.comparisonAmount !== null)) await loadRow(basic);
    if (run !== generation) return;
    const isicRow = state.rows.find(row => row.tier.name === 'ISIC');
    if (isicRow?.valid && basic?.valid) {
      const corrected = estimateIsicCashback(isicRow.result, basic.result);
      if (corrected !== isicRow.result) {
        renderResult(isicRow, corrected);
        isicRow.comparisonAmount = corrected.amount;
      }
    }
    if (run === generation) {
      filterRows(state.rows);
      // Reorder the DOM only so ties keep the configured tier order.
      const sorted = visibleRows(state.rows);
      for (const row of sorted) row.tr.parentNode.append(row.tr);
      const compared = state.rows.filter(row => row.tier.reference || enabled[row.tier.name]);
      const equalPrices = compared.length > 1 && compared.every(row =>
        row.comparisonAmount !== null && row.comparisonAmount === compared[0].comparisonAmount);
      const showNotice = equalPrices && !alwaysShow;
      const hasPrices = !showNotice && sorted.length > 0;
      const commonPrice = showNotice && basic?.valid ? basic.result : null;
      const bases = sorted.map(row => row.result.discountBaseAmount).filter(amount => amount !== null);
      const originalAmount = basic?.valid ? basic.result.discountBaseAmount ?? basic.amount
        : bases.length && bases.every(amount => amount === bases[0]) ? bases[0] : null;
      const shownOriginal = (hasPrices || commonPrice) && originalAmount !== null
        && (commonPrice ? commonPrice.amount < originalAmount : sorted.some(row => row.amount < originalAmount))
        ? originalAmount : null;
      state.originalRow.hidden = shownOriginal === null;
      state.originalPrice.textContent = shownOriginal === null ? '' : formatPanelPrice(shownOriginal);
      const labels = sorted.map(row => promoLabel(row.result));
      const sharedPromo = hasPrices && labels.length > 1 && labels[0] && labels.every(label => label === labels[0]) ? labels[0] : '';
      state.priceNote.textContent = sharedPromo;
      state.priceNote.hidden = !sharedPromo;
      state.section.classList.toggle('shared-promo', Boolean(sharedPromo));
      state.table.hidden = !hasPrices;
      state.credit.hidden = !hasPrices;
      // Nothing loaded and at least one request failed: tell the user instead of showing an empty panel.
      const loadFailed = failed > 0 && !state.rows.some(row => row.valid || row.comparisonAmount !== null);
      state.notice.hidden = !showNotice;
      state.loadError.hidden = !loadFailed;
      state.section.classList.toggle('footer-message', showNotice || loadFailed);
      state.section.classList.toggle('settings-only', !hasPrices && !showNotice && !loadFailed && state.settings.hidden);
      if (loadFailed) {
        warn(LOG.product + id + LOG.logNoTier);
      } else if (showNotice) {
        log(LOG.product + id + LOG.logEqual + (commonPrice ? ' ' + formatPrice(commonPrice.amount) : '') + '.');
      } else {
        console.groupCollapsed(...logHead, LOG.product + id + ': '
          + (sorted.map(row => row.displayName + ' ' + formatPrice(row.amount)).join(', ') || LOG.logNothing));
        if (sorted.length) {
          console.table(sorted.map(row => ({
            [LOG.colTier]: row.displayName, [LOG.colPrice]: formatPrice(row.amount),
            [LOG.colDiscount]: formatDiscount(row.result.discountPercent) || '—', [LOG.colPromo]: promoLogLabel(row.result) || '—',
          })));
        }
        console.log(LOG.logOriginal + (shownOriginal === null ? '—' : formatPrice(shownOriginal)) + (alwaysShow ? LOG.logAlways : ''));
        console.groupEnd();
      }
      state.status.textContent = loadFailed ? state.loadError.textContent : showNotice ? state.notice.textContent
        : hasPrices ? T.pricesLoaded + sorted.map(row => row.displayName + ' ' + formatPrice(row.amount)).join(', ') : '';
      state.section.setAttribute('aria-busy', 'false');
      state.loaded = true;
      state.host.hidden = false;
      // Show the copy button only when there is something to copy. Nothing loaded means nothing to copy,
      // so the same blocked requests are not repeated.
      if (loadFailed) state.copy.hidden = true;
      else buildOffer(id).then(offer => { if (run === generation) state.copy.hidden = !offer; }, () => {});
    }
  }

  function filterRows(rows) {
    const basic = rows.find(row => row.tier.reference);
    for (const row of rows) {
      row.displayName = row.tier.name.toUpperCase();
      if (row.badge) row.badge.textContent = row.displayName;
      row.extraBadges?.forEach(badge => badge.remove());
      row.extraBadges = [];
      if (alwaysShow) { row.tr.hidden = !(row.valid && enabled[row.tier.name]); continue; }
      let visible = row.valid && enabled[row.tier.name];
      if (['Gold', 'Silver', 'Bronze', 'ISIC'].includes(row.tier.name)) {
        visible = visible && basic?.valid && row.amount < basic.amount;
      }
      if (row.tier.reference) visible = visible && row.result?.discountPercent > 0;
      row.tr.hidden = !visible;
    }
    function mergeRow(target, source) {
      source.tr.hidden = true;
      target.displayName += ' + ' + source.displayName;
      const extra = node('div', source.displayName, target.badge.parentNode);
      extra.className = 'tier-badge tier-' + (source.tier.badge || source.tier.name.toLowerCase());
      target.extraBadges.push(extra);
    }
    // Only the pairs Silver + ISIC and Bronze + B2B share a row, and only when their prices match.
    foldPairs(rows.filter(row => row.valid && !row.tr.hidden), mergeRow);
    if (alwaysShow) return;
    const compared = rows.filter(row => !row.tier.reference && enabled[row.tier.name]);
    const lone = basic?.valid ? onlyDifferent(basic.amount, compared, row => row.comparisonAmount) : null;
    if (lone && !lone.tr.hidden) {
      basic.displayName = T.others;
      if (basic.badge) basic.badge.textContent = basic.displayName;
      // Without a discount of its own OSTATNÍ would only repeat the original price shown below the table.
      basic.tr.hidden = !(basic.result?.discountPercent > 0);
      // OSTATNÍ already stands for every tier priced like BASIC.
      for (const row of compared) if (row.valid && row.amount === basic.amount) row.tr.hidden = true;
    }
    // Keep BASIC only when there is another visible price to compare with it.
    if (basic && !rows.some(row => !row.tier.reference && !row.tr.hidden)) basic.tr.hidden = true;
  }

  function sync() {
    const id = productId(location.pathname, location.search);
    const language = pageLanguage();
    if (id !== activeId || language !== activeLanguage) {
      activeLanguage = language;
      T = TEXTS[language];
      cancel();
      clearTimeout(reloadTimer);
      mountObserver.disconnect();
      observedParent = null;
      panel?.dispose();
      panel?.host.remove(); panel = null; activeId = id;
      stripRetries = 0;
      clearTimeout(stripTimer);
      lastPlacement = '';
      if (id) {
        log(LOG.product + id + LOG.logLoading);
        panel = createPanel(id);
        void load(id, panel);
      }
    } else if (panel) {
      mount(panel.host);
    }
  }

  sync();
  // Detect product navigation without modifying Alza's history or scripts.
  // Navigation events (currententrychange) and the mount observer react at once; the slow timer is a safety net
  // for browsers without the Navigation API and for a re-rendered container.
  window.navigation?.addEventListener?.('currententrychange', sync);
  window.addEventListener('popstate', sync);
  const timer = setInterval(() => { if (!document.hidden) sync(); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  window.addEventListener('pagehide', event => {
    if (!event.persisted) { clearInterval(timer); cancel(); }
  });
})().catch(error => console.error('[Alza Benefit Prices] Startup failed: ' + error.message));