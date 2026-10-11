// ==UserScript==
// @name         Alza Benefit Prices
// @icon         https://www.alza.cz/favicon-alza.ico
// @author       Dexnis
// @namespace    local.alza-ceny
// @version      1.2.2
// @updateURL    https://raw.githubusercontent.com/DeRus0/Alza-Benefit-Prices/main/alza-benefit-prices.user.js
// @downloadURL  https://raw.githubusercontent.com/DeRus0/Alza-Benefit-Prices/main/alza-benefit-prices.user.js
// @description  Userscript pro Alza.cz a Alza.sk, který přímo na stránce produktu zobrazí ceny ceníků Gold, Silver, ISIC, Bronze, B2B a Basic včetně procentuálních slev.
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

  const country = /(?:^|\.)alza\.sk$/i.test(location.hostname) ? 'SK' : 'CZ';
  const locale = country === 'SK' ? 'sk-SK' : 'cs-CZ';
  const discountFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const priceFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const mobile = /^m\.alza\.(?:cz|sk)$/i.test(location.hostname);
  const CACHE_TTL = 5 * 60 * 1000;
  const CACHE_LIMIT = 60;
  // Shared by all panels, so returning to a product reuses its prices.
  const cache = new Map();

  // Safari Userscripts exposes asynchronous GM.* storage APIs.
  async function getSetting(key, fallback) {
    if (typeof GM !== 'undefined' && typeof GM.getValue === 'function') return await GM.getValue(key, fallback);
    if (typeof GM_getValue === 'function') return await GM_getValue(key, fallback);
    throw new Error('Rozšíření neposkytuje ukládání nastavení. Zkontroluj oprávnění skriptu.');
  }

  async function setSetting(key, value) {
    if (typeof GM !== 'undefined' && typeof GM.setValue === 'function') return await GM.setValue(key, value);
    if (typeof GM_setValue === 'function') return await GM_setValue(key, value);
    throw new Error('Rozšíření neposkytuje ukládání nastavení.');
  }

  let settingWrites = Promise.resolve();
  function saveSetting(key, value) {
    settingWrites = settingWrites.then(() => setSetting(key, value))
      .catch(error => console.warn('[Alza Benefit Prices] Nastavení: ' + error.message));
  }

  const TIERS = [
    { name: 'Gold', pgrik: 'p_pg4_e6c95' },
    { name: 'Silver', pgrik: 'p_pg3_36eef' },
    { name: 'ISIC', pgrik: 'p_pg3is1_2b2fc' },
    { name: 'Bronze', pgrik: 'p_pg5_44266' },
    { name: 'B2B', pgrik: 'p_pg6_6ce49' },
    { name: 'Basic', pgrik: 'p__26752', reference: true, badge: 'regular' },
  ];
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
    url.search = new URLSearchParams({ country, pgrik: tier.pgrik, ucik: 'GB' });
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
      let numeric = price.replace(/\s/g, '').replace(/(?:Kč|CZK|€|EUR)$/i, '').replace(/[,.][-–—]$/, '');
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
        fail(new Error('Načítání zrušeno.'));
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
        onerror: () => fail(new Error('Rozšíření nedokázalo načíst API. Zkontroluj přístup k webapi.alza.cz.')),
        ontimeout: () => fail(new Error('Alza neodpověděla do 20 sekund.')),
        onabort: () => fail(new Error('Načítání zrušeno.')),
      };
      try {
        if (typeof GM !== 'undefined' && typeof GM.xmlHttpRequest === 'function') {
          handle = GM.xmlHttpRequest(details);
        } else if (typeof GM_xmlhttpRequest === 'function') {
          handle = GM_xmlhttpRequest(details);
        } else {
          throw new Error('Rozšíření neposkytuje načítání API. Zkontroluj oprávnění skriptu.');
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
    return priceFormat.format(amount) + (country === 'SK' ? ' €' : ' Kč');
  }

  // Panel style of Alza's own prices, e.g. "549,-"; Slovak prices keep the euro sign.
  function formatPanelPrice(amount) {
    return country === 'SK' ? formatPrice(amount) : priceFormat.format(amount) + ',-';
  }

  function formatDiscount(percent) {
    return percent > 0 ? '−' + discountFormat.format(percent) + ' %' : '';
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

  function visibleRows(rows) {
    return rows.filter(row => row.valid && !row.tr.hidden).sort((a, b) => a.amount - b.amount);
  }

  async function writeClipboard(text) {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API není dostupné.');
    await navigator.clipboard.writeText(text);
  }

  // "S kódem X" -> "Ceny s kódem X" (or "Cena s kódem X" for a single price), "Cena s Cashback" -> "Ceny s Cashback".
  function pricesLabel(label, single = false) {
    return label.replace(/^S /, single ? 'Cena s ' : 'Ceny s ').replace(/^Cena /, single ? 'Cena ' : 'Ceny ');
  }

  function promoLabel(result) {
    if (!result.promo) return '';
    return result.priceType === 4 ? 'S AlzaPlus+' : result.coupon
      ? 'S kódem ' + result.coupon : result.name || 'Akční cena';
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
      return;
    }
    host.style.margin = mobile ? '0' : '0 0 12px';
    const before = tracker || document.querySelector('[data-react-client-component="alternativePricingModule"]');
    if (before) {
      host.style.order = before.style.order || '';
      if (before.previousElementSibling !== host) before.before(host);
      return;
    }
    const price = document.querySelector('.js-price-detail__main-price-box-wrapper, [data-testid="price-primary"]');
    const after = price?.closest('.price-detail__row') || price;
    if (after && after.nextElementSibling !== host) after.after(host);
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
  .gear:focus-visible,input:focus-visible,.settings-info a:focus-visible{outline:2px solid #545fef;outline-offset:2px}
  .price-notice{flex:1;color:#606060;font-size:13px}
  .equal-prices .credit{margin-top:0;padding:0 4px;justify-content:flex-start}
  .equal-prices .gear{flex-shrink:0}

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
  .settings-info a{color:inherit;text-decoration:underline;text-underline-offset:2px}
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
    section.setAttribute('aria-label', 'Ceny ceníků: ' + TIERS.map(tier => tier.name).join(', '));
    // One shared live region announces the result instead of every price cell.
    const status = node('div', null, section);
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    const table = node('table', null, section);
    const heading = node('tr', null, node('thead', null, table));
    node('th', 'Ceník', heading).scope = 'col';
    const priceHeader = node('th', 'Cena', heading);
    priceHeader.scope = 'col';
    // Shown instead of the per-row labels when every visible row has the same promo.
    const priceNote = node('span', null, priceHeader);
    priceNote.className = 'th-note';
    priceNote.hidden = true;
    node('th', 'Sleva', heading).scope = 'col';
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
    node('td', 'Původní cena', originalRow);
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
    gear.title = 'Nastavení ceníků';
    gear.setAttribute('aria-label', 'Nastavení ceníků');
    gear.setAttribute('aria-expanded', 'false');
    const copy = node('button', null, buttons);
    copy.className = 'gear';
    copy.type = 'button';
    copy.title = 'Kopírovat nabídku';
    copy.setAttribute('aria-label', 'Kopírovat nabídku');
    copy.hidden = true;
    copy.append(svgIcon('M8 8H20V21H8Z M16 8V3H3V16H8'));
    const notice = node('span', 'Všechny ceníky mají stejnou cenu', footer);
    notice.className = 'price-notice';
    notice.hidden = true;
    const credit = node('span', 'Vytvořil Dexnis', footer);
    const settings = node('div', null, section);
    // Help for the "?" buttons: a bubble on hover or focus with a mouse; on touch it stays until
    // you tap elsewhere.
    const tip = node('div', null, section);
    tip.className = 'tip';
    tip.hidden = true;
    tip.setAttribute('role', 'tooltip');
    const touchOnly = () => mobile || matchMedia('(hover: none)').matches;
    let tipText = '';
    function hideTip() { tip.hidden = true; tipText = ''; }
    function showTip(button, text) {
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
    // A tap or click anywhere else closes the bubble.
    const outside = new AbortController();
    document.addEventListener('pointerdown', event => {
      if (!event.composedPath().some(element => element.classList?.contains('help'))) hideTip();
    }, { signal: outside.signal, capture: true });
    settings.className = 'settings';
    settings.id = 'price-tier-settings';
    settings.hidden = true;
    gear.setAttribute('aria-controls', settings.id);
    const state = { dispose: () => outside.abort(), host, rows, table, section, status, priceNote, credit, notice, settings, copy, originalRow, originalPrice, loaded: false };
    let copyReset = 0;
    function setCopyState(label, className) {
      copy.className = className ? 'gear ' + className : 'gear';
      copy.title = label;
      copy.setAttribute('aria-label', label);
    }
    function resetCopy() {
      clearTimeout(copyReset);
      setCopyState('Kopírovat nabídku');
    }
    function showCopyState(label, className) {
      clearTimeout(copyReset);
      setCopyState(label, className);
      copyReset = setTimeout(resetCopy, 2000);
    }
    state.resetCopy = resetCopy;
    copy.onclick = async () => {
      try {
        // The copied offer ignores which tiers, promos and view are switched on in the panel.
        const offer = await buildOffer(id);
        if (id !== activeId) throw new Error('Stránka se mezitím změnila.');
        if (!offer) throw new Error('Žádná cena ke kopírování.');
        const title = document.querySelector('h1')?.textContent.trim() || 'Produkt Alza';
        const lines = ['## ' + title, ''];
        const original = offer.original !== null ? 'Původní cena: ~~' + formatPrice(offer.original) + '~~' : '';
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
              && ['OSTATNÍ', 'BASIC'].includes(group.entries[0].names[0]);
            for (const entry of group.entries) {
              block.push('- ' + (entry.names.length && !bare ? '**' + entry.names.join('/') + '**: ' : '') + priceText(entry));
            }
            return block.join('\n');
          });
          lines.push(blocks.join('\n'));
        }
        const url = new URL(location.href);
        const variant = url.searchParams.get('dq');
        url.search = '';
        if (variant !== null) url.searchParams.set('dq', variant);
        if (affiliateId) url.searchParams.set('idp', affiliateId);
        url.hash = '';
        lines.push('', 'Odkaz ➤ ' + url.href);
        const text = lines.join('\n');
        await writeClipboard(text);
        showCopyState('Zkopírováno', 'done');
      } catch (error) {
        showCopyState('Kopírování selhalo — zkus to znovu', 'failed');
        console.warn('[Alza Benefit Prices] Kopírování: ' + error.message);
      } finally { copy.focus({ preventScroll: true }); }
    };
    gear.onclick = () => {
      settings.hidden = !settings.hidden;
      gear.setAttribute('aria-expanded', String(!settings.hidden));
      section.classList.toggle('settings-only', table.hidden && settings.hidden && notice.hidden);
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
    const tierOptions = addGroup('Ceníky', 'settings-options');
    for (const tier of TIERS) {
      addCheckbox(tierOptions, tier.name, enabled[tier.name], value => {
        enabled[tier.name] = value;
        change('enabled-price-tiers', { ...enabled });
      });
    }
    const actionOptions = addGroup('Akce', 'settings-options');
    addCheckbox(actionOptions, 'AlzaPlus+', alzaPlusPromos, value => { alzaPlusPromos = value; change('alza-plus-promos', value); });
    addCheckbox(actionOptions, 'Cashback', cashbackPromos, value => { cashbackPromos = value; change('cashback-price-promos', value); });
    addCheckbox(actionOptions, 'Výkup', tradeInPromos, value => { tradeInPromos = value; change('trade-in-promos', value); });
    const viewOptions = addGroup('Zobrazení', 'settings-options view-options');
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
      help.setAttribute('aria-label', 'Co dělá volba: ' + text);
      attachHelp(help, hint);
      return option;
    }
    viewOption('Vždy zobrazit ceníky',
      'Zobrazí Vaše zapnuté ceníky vždycky, i když není u ceníku sleva nebo jsou všechny ceníky se stejnou cenou.',
      alwaysShow, value => { alwaysShow = value; change('always-show-tiers', value); });
    belowPhotoOption = viewOption('Přesunout ceník doleva',
      'Přesune ceník z pravého sloupce pod miniatury fotek vlevo.',
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
    idpClear.title = 'Smazat';
    idpClear.setAttribute('aria-label', 'Smazat affiliate');
    idpClear.hidden = !affiliateId;
    const idpHelp = node('button', '?', idpRow);
    idpHelp.className = 'help';
    idpHelp.type = 'button';
    idpHelp.setAttribute('aria-label', 'Co je affiliate');
    attachHelp(idpHelp, 'Číslo partnera, které se přidá do kopírovaného odkazu jako ?idp=číslo.');
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
    const version = (typeof GM_info !== 'undefined' && GM_info?.script?.version)
      || (typeof GM !== 'undefined' && GM.info?.script?.version) || '';
    node('span', version ? 'Verze ' + version : 'Alza Benefit Prices', info);
    const sourceLink = node('a', 'Zdrojový kód', info);
    sourceLink.href = 'https://github.com/dexnis-dev/Alza-Benefit-Prices/';
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    mount(host);
    return state;
  }

  // Raw API data of one tier, from the shared cache or the network. null means the run was superseded.
  async function tierData(id, tier, run) {
    const url = apiUrl(id, tier);
    const cached = cache.get(url);
    if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;
    const response = await request(url, run !== null);
    if (run !== null && run !== generation) return null;
    if (response.responseText.length > 2 * 1024 * 1024) throw new Error('Odpověď API je příliš velká.');
    if (response.status === 403) throw new Error('HTTP 403: přístup blokován.');
    if (response.status < 200 || response.status >= 300) throw new Error('API vrátilo HTTP ' + response.status + '.');
    if (response.finalUrl && new URL(response.finalUrl).hostname !== 'webapi.alza.cz') throw new Error('API přesměrovalo na jinou doménu.');
    let data;
    try { data = JSON.parse(response.responseText); }
    catch { throw new Error('Cena v odpovědi nenalezena.'); }
    cache.set(url, { data, time: Date.now() });
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
    return data;
  }

  // The offer to copy: every tier with a discount, whatever tiers, promos or view the user has switched on.
  async function buildOffer(id) {
    const all = { plus: true, cashback: true, tradeIn: true };
    const found = await Promise.all(TIERS.map(async tier => {
      try {
        const data = await tierData(id, tier, null);
        const result = extractPrice(data, tier.reference, all);
        if (!result) return null;
        // A tier without its own price still has the standard one, which tells whether it equals BASIC.
        if (result.hidden) return { tier, result: null, comparison: extractPrice(data, true, all) };
        return { tier, result, comparison: result };
      } catch (error) {
        console.warn('[Alza Benefit Prices] ' + tier.name + ': ' + error.message);
        return null;
      }
    }));
    const basic = found.find(item => item?.tier.reference);
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
    const others = found.filter(item => item && !item.tier.reference);
    const distinct = others.filter(item => item.comparison && item.comparison.amount !== basic?.result.amount);
    const stands = basic && others.length === TIERS.length - 1 && others.every(item => item.comparison)
      && distinct.length === 1 && tiers.includes(distinct[0]);
    if (entries.length && (discounted(basic) || stands)) {
      entries.push({ tier: basic.tier, names: [stands ? 'OSTATNÍ' : 'BASIC'], amount: basic.result.amount, result: basic.result });
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
    state.rows.forEach(row => { row.tr.hidden = true; row.valid = false; row.result = null; row.amount = null; row.comparisonAmount = null; row.discount.textContent = '—'; row.price.textContent = 'Načítání…'; });
    async function loadRow(row) {
      try {
        const data = await tierData(id, row.tier, run);
        if (run !== generation || data === null) return;
        let result = extractPrice(data, row.tier.reference);
        if (!result) throw new Error('Cena v odpovědi nenalezena.');
        // Check equality even when a standard priceGroupType hides the row.
        const comparison = result.hidden ? extractPrice(data, true) : result;
        row.comparisonAmount = comparison?.amount ?? null;
        // With "always show", a tier without its own price falls back to the standard one.
        if (result.hidden && alwaysShow && comparison) result = comparison;
        if (result.hidden) {
          row.tr.hidden = true;
          return;
        }
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
      } catch (error) {
        if (run !== generation) return;
        row.tr.hidden = true;
        console.warn('[Alza Benefit Prices] ' + row.tier.name + ': ' + error.message);
      }
    }
    // Fetch independent tiers together, then BASIC only if a price was found.
    await Promise.all(state.rows.filter(row => !row.tier.reference && enabled[row.tier.name]).map(loadRow));
    if (run !== generation) return;
    const basic = state.rows.find(row => row.tier.reference);
    if (basic && state.rows.some(row => !row.tier.reference && row.comparisonAmount !== null)) await loadRow(basic);
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
      state.notice.hidden = !showNotice;
      state.section.classList.toggle('equal-prices', showNotice);
      state.section.classList.toggle('settings-only', !hasPrices && !showNotice && state.settings.hidden);
      state.status.textContent = showNotice ? state.notice.textContent
        : hasPrices ? 'Ceny načteny: ' + sorted.map(row => row.displayName + ' ' + formatPrice(row.amount)).join(', ') : '';
      state.section.setAttribute('aria-busy', 'false');
      state.loaded = true;
      state.host.hidden = false;
      // Show the copy button only when there is something with a discount to copy.
      buildOffer(id).then(offer => { if (run === generation) state.copy.hidden = !offer; }, () => {});
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
    const distinct = compared.filter(row => row.comparisonAmount !== basic?.amount);
    if (basic?.valid && compared.length > 1 && compared.every(row => row.comparisonAmount !== null)
      && distinct.length === 1 && !distinct[0].tr.hidden) {
      basic.displayName = 'OSTATNÍ';
      if (basic.badge) basic.badge.textContent = basic.displayName;
      basic.tr.hidden = false;
      // OSTATNÍ already stands for every tier priced like BASIC.
      for (const row of compared) if (row.valid && row.amount === basic.amount) row.tr.hidden = true;
    }
    // Keep BASIC only when there is another visible price to compare with it.
    if (basic && !rows.some(row => !row.tier.reference && !row.tr.hidden)) basic.tr.hidden = true;
  }

  function sync() {
    const id = productId(location.pathname, location.search);
    if (id !== activeId) {
      cancel();
      clearTimeout(reloadTimer);
      mountObserver.disconnect();
      observedParent = null;
      panel?.dispose();
      panel?.host.remove(); panel = null; activeId = id;
      stripRetries = 0;
      clearTimeout(stripTimer);
      if (id) {
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
})().catch(error => console.error('[Alza Benefit Prices] Spuštění: ' + error.message));