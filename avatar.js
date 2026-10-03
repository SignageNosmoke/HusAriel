// Ikoner, utstyr og avatar-tegning. Ingen avhengigheter, kan brukes både i nettleser og i tester.

export const P = {
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  quests: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  gift: "M4 10h16v10H4zM3 6h18v4H3zM12 6v14M12 6C10 2 6 3 7 6M12 6c2-4 6-3 5 0",
  me: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  ctrl: "M4 5h16v11H4zM8 21h8M12 16v5",
  plus: "M12 5v14M5 12h14",
  wallet: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h2",
  family: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M17 14a5 5 0 0 1 4 6",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4",
  flame: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9 10c0-1 1-2 3-2s3 1 3 2-1 2-3 2-3 1-3 2 1 2 3 2 3-1 3-2",
  washer: "M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12 18a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8 5.5h.01",
  dish: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  vac: "M7 3v9a4 4 0 0 0 4 4h5M18 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7 3h3",
  bath: "M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2",
  spark: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
  kitchen: "M5 3v7a2 2 0 0 0 4 0V3M7 10v11M16 3c-2 2-3 5-3 8h3v10",
  bed: "M3 19V6M3 14h18v5M21 14v-2a3 3 0 0 0-3-3h-7v5",
  cart: "M3 4h2l2 11h11l2-8H6M9 20h.01M17 20h.01",
  leaf: "M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19l7-7"
};
export const QUEST_ICONS = [['washer', 'Klesvask'], ['dish', 'Oppvask'], ['trash', 'Søppel'], ['vac', 'Støvsuge'], ['bath', 'Bad'], ['kitchen', 'Kjøkken'], ['bed', 'Rom/seng'], ['cart', 'Handle'], ['leaf', 'Ute/hage'], ['spark', 'Annet']];
export function ico(n) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (P[n] || P.spark) + '"/></svg>'; }

export const THEMES = {
  dusk: 'linear-gradient(145deg,#5b43d6,#a45ad6 60%,#f08fb0)',
  peach: 'linear-gradient(145deg,#ff9a76,#ff6f91)',
  mint: 'linear-gradient(145deg,#1fc8a0,#2b86d4)',
  noir: 'linear-gradient(145deg,#1d1d26,#47476a)',
  aurora: 'linear-gradient(145deg,#22c8e0,#8b5cf6 55%,#f472b6)'
};
// rarity: c=vanlig, r=sjelden, e=episk, l=legendarisk
export const ITEMS = [
  { id: 'dusk', n: 'Dusk', slot: 'theme', c: THEMES.dusk, rar: 'c' }, { id: 'peach', n: 'Peach', slot: 'theme', c: THEMES.peach, rar: 'c' },
  { id: 'mint', n: 'Mint', slot: 'theme', c: THEMES.mint, rar: 'c' }, { id: 'noir', n: 'Noir', slot: 'theme', c: THEMES.noir, rar: 'r' },
  { id: 'aurora', n: 'Aurora', slot: 'theme', c: THEMES.aurora, rar: 'e' },
  { id: 'gold', n: 'Gullring', slot: 'frame', rar: 'r' }, { id: 'holo', n: 'Holo', slot: 'frame', rar: 'e' },
  { id: 'star', n: 'Stjerne', slot: 'sticker', e: '✦', rar: 'c' }, { id: 'moon', n: 'Måne', slot: 'sticker', e: '☾', rar: 'c' },
  { id: 'bolt', n: 'Lyn', slot: 'sticker', e: '⚡', rar: 'c' }, { id: 'heart', n: 'Hjerte', slot: 'sticker', e: '♥', rar: 'c' },
  { id: 'headphones', n: 'Hodetelefoner', slot: 'acc', e: '🎧', rar: 'c' }, { id: 'glasses', n: 'Briller', slot: 'acc', e: '👓', rar: 'c' },
  { id: 'shades', n: 'Solbriller', slot: 'acc', e: '🕶️', rar: 'c' }, { id: 'cap', n: 'Caps', slot: 'acc', e: '🧢', rar: 'c' },
  { id: 'beanie', n: 'Lue', slot: 'acc', e: '🧶', rar: 'c' }, { id: 'hoops', n: 'Ringer', slot: 'acc', e: '⭕', rar: 'r' },
  { id: 'crown', n: 'Krone', slot: 'acc', e: '👑', rar: 'l' },
  { id: 'hoodie', n: 'Hettegenser', slot: 'top', e: '🧥', rar: 'c' }, { id: 'tee', n: 'T-skjorte', slot: 'top', e: '👕', rar: 'c' },
  { id: 'jacket', n: 'Skinnjakke', slot: 'top', e: '🧥', rar: 'r' },
  { id: 'cat', n: 'Katt', slot: 'pet', e: '🐱', rar: 'r' }, { id: 'ghost', n: 'Spøkelse', slot: 'pet', e: '👻', rar: 'r' }
];
export const PRICE = { c: 40, r: 90, e: 180, l: 400 };
export const RARITY_NAME = { c: 'Vanlig', r: 'Sjelden', e: 'Episk', l: 'Legendarisk' };
export const ITEMBY = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const SLOT_NAME = { theme: 'tema', frame: 'ramme', sticker: 'klistremerke', acc: 'tilbehør', top: 'overdel', pet: 'kjæledyr' };

export const SKIN = ['#ffe0c7', '#f3c9a5', '#d9a37a', '#a8714a', '#7a4a2e'];
export const HAIRC = ['#2b1b12', '#6b4226', '#b5651d', '#e3b04b', '#c1403d', '#7a6ff0', '#2d2d33'];
export const TOPC = ['#ff7a59', '#7b5cf0', '#2bb6a0', '#f5c76b', '#e8e8ef', '#1d1d26'];
export const HAIRS = [['long', 'Langt'], ['bob', 'Bob'], ['pony', 'Hestehale'], ['bun', 'Knute'], ['short', 'Kort'], ['curly', 'Krøll'], ['buzz', 'Raka']];
export const PRESETS = [
  { n: 'Chill', g: 'f', skin: '#f3c9a5', hs: 'long', hc: '#6b4226', top: 'hoodie', tc: '#7b5cf0' },
  { n: 'Skater', g: 'm', skin: '#d9a37a', hs: 'short', hc: '#2b1b12', top: 'tee', tc: '#ff7a59' },
  { n: 'Indie', g: 'n', skin: '#ffe0c7', hs: 'bob', hc: '#c1403d', top: 'hoodie', tc: '#2bb6a0' },
  { n: 'Gamer', g: 'f', skin: '#a8714a', hs: 'pony', hc: '#7a6ff0', top: 'hoodie', tc: '#1d1d26' },
  { n: 'Sporty', g: 'f', skin: '#ffe0c7', hs: 'bun', hc: '#e3b04b', top: 'tee', tc: '#f5c76b' },
  { n: 'Kaos', g: 'n', skin: '#7a4a2e', hs: 'curly', hc: '#2d2d33', top: 'tee', tc: '#e8e8ef' }
];

export function avatarSvg(av, eq) {
  av = av || {}; eq = eq || {};
  var s = av.skin || '#f3c9a5', h = av.hc || '#6b4226', t = av.tc || '#7b5cf0', hs = av.hs || 'long', top = eq.top || 'hoodie', acc = eq.acc, pet = eq.pet, B = '', F = '', body = '';
  if (hs === 'long') B = '<path d="M27 56C24 28 44 17 60 17s36 11 33 39l3 46H24z" fill="' + h + '"/>';
  else if (hs === 'bob') B = '<path d="M27 56C24 28 44 17 60 17s36 11 33 39v16c0 6-4 8-8 8H35c-4 0-8-2-8-8z" fill="' + h + '"/>';
  else if (hs === 'pony') B = '<path d="M86 40c16 2 22 26 10 46-4-14-8-24-12-32z" fill="' + h + '"/>';
  else if (hs === 'bun') B = '<circle cx="60" cy="14" r="10" fill="' + h + '"/>';
  else if (hs === 'curly') B = [[30, 50, 11], [90, 50, 11], [34, 34, 12], [86, 34, 12], [48, 24, 13], [72, 24, 13], [60, 21, 13]].map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="' + h + '"/>'; }).join('');
  if (hs === 'short') F = '<path d="M32 56C30 30 46 22 60 22s30 8 28 34c-4-10-10-16-18-18-10 2-22 4-28 18z" fill="' + h + '"/>';
  else if (hs === 'curly') F = '<path d="M36 52C40 38 50 34 60 34s20 4 24 18C74 44 46 44 36 52z" fill="' + h + '"/>';
  else if (hs === 'buzz') F = '<path d="M33 52C34 34 48 28 60 28s26 6 27 24C76 40 44 40 33 52z" fill="' + h + '" fill-opacity=".6"/>';
  else F = '<path d="M33 57C33 34 48 26 60 26s28 8 27 31C84 44 76 38 62 38 50 38 40 44 33 57z" fill="' + h + '"/>';
  if (top === 'jacket') body = '<path d="M20 120C20 99 36 92 60 92s40 7 40 28z" fill="#2a2a35"/><path d="M50 93L60 120 70 93z" fill="' + t + '"/><path d="M50 93L44 110M70 93L76 110" stroke="#15151c" stroke-width="2"/>';
  else if (top === 'tee') body = '<path d="M20 120C20 99 36 92 60 92s40 7 40 28z" fill="' + t + '"/><path d="M48 93Q60 105 72 93" fill="rgba(0,0,0,.22)"/>';
  else body = '<path d="M20 120C20 99 36 92 60 92s40 7 40 28z" fill="' + t + '"/><path d="M42 93C46 105 74 105 78 93" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/><path d="M54 101v10M66 101v10" stroke="#fff" stroke-width="2" opacity=".7"/>';
  var face = '<circle cx="50" cy="60" r="2.8" fill="#2a1c16"/><circle cx="70" cy="60" r="2.8" fill="#2a1c16"/><circle cx="51" cy="59" r=".9" fill="#fff"/><circle cx="71" cy="59" r=".9" fill="#fff"/>' +
    '<path d="M44 52Q50 49 56 52M64 52Q70 49 76 52" fill="none" stroke="' + h + '" stroke-width="' + (av.g === 'm' ? 3.2 : 2.2) + '" stroke-linecap="round"/>' +
    (av.g === 'f' ? '<path d="M46 58l-3-2M74 58l3-2" stroke="#2a1c16" stroke-width="1.6" stroke-linecap="round"/>' : '') +
    '<circle cx="44" cy="67" r="4" fill="#ff8fa0" opacity=".3"/><circle cx="76" cy="67" r="4" fill="#ff8fa0" opacity=".3"/>' +
    '<path d="M59 64q1 3 3 2" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="1.4" stroke-linecap="round"/><path d="M53 71Q60 77 67 71" fill="none" stroke="#a2554a" stroke-width="2.2" stroke-linecap="round"/>';
  var a = '';
  if (acc === 'headphones') a = '<path d="M33 58C31 28 89 28 87 58" fill="none" stroke="#22222a" stroke-width="4.5"/><rect x="28" y="52" width="9" height="20" rx="4.5" fill="#22222a"/><rect x="83" y="52" width="9" height="20" rx="4.5" fill="#22222a"/><rect x="30.5" y="56" width="3" height="12" rx="1.5" fill="' + t + '"/><rect x="86.5" y="56" width="3" height="12" rx="1.5" fill="' + t + '"/>';
  else if (acc === 'glasses') a = '<g fill="rgba(255,255,255,.12)" stroke="#22222a" stroke-width="2.2"><rect x="40" y="53" width="17" height="13" rx="5"/><rect x="63" y="53" width="17" height="13" rx="5"/></g><path d="M57 59h6" stroke="#22222a" stroke-width="2.2"/>';
  else if (acc === 'shades') a = '<g fill="#15151c"><rect x="39" y="53" width="19" height="13" rx="5"/><rect x="62" y="53" width="19" height="13" rx="5"/></g><path d="M58 58h4" stroke="#15151c" stroke-width="2.4"/><path d="M43 56l5 0" stroke="#fff" stroke-width="1.4" opacity=".5"/>';
  else if (acc === 'cap') a = '<path d="M32 50C32 28 48 21 60 21s28 7 28 29z" fill="#e8344f"/><path d="M26 50h68c4 0 6 2 6 4H20c0-2 2-4 6-4z" fill="#b8203a"/>';
  else if (acc === 'beanie') a = '<path d="M32 50C30 26 48 18 60 18s30 8 28 32z" fill="#f5c76b"/><rect x="31" y="44" width="58" height="9" rx="4.5" fill="#d9a032"/><circle cx="60" cy="15" r="5" fill="#f5c76b"/>';
  else if (acc === 'hoops') a = '<circle cx="35" cy="71" r="5" fill="none" stroke="#f5c76b" stroke-width="2"/><circle cx="85" cy="71" r="5" fill="none" stroke="#f5c76b" stroke-width="2"/>';
  else if (acc === 'crown') a = '<path d="M38 36L42 16L52 28L60 12L68 28L78 16L82 36z" fill="#f5c76b" stroke="#b8860b" stroke-width="2"/>';
  var p = '';
  if (pet === 'cat') p = '<g transform="translate(6 86)"><path d="M2 9L5 0l6 5 6-5 3 9v8a9 9 0 0 1-18 0z" fill="#f0a35e"/><circle cx="7.5" cy="12" r="1.4" fill="#222"/><circle cx="14.5" cy="12" r="1.4" fill="#222"/><path d="M9.5 16h3" stroke="#222" stroke-width="1.3" stroke-linecap="round"/></g>';
  else if (pet === 'ghost') p = '<g transform="translate(90 84)"><path d="M1 30V14a10 10 0 0 1 20 0v16l-3.3-3-3.3 3-3.3-3-3.3 3-3.3-3z" fill="#fff"/><circle cx="8" cy="14" r="1.7" fill="#222"/><circle cx="14" cy="14" r="1.7" fill="#222"/></g>';
  return '<svg viewBox="0 0 120 120" role="img" aria-label="Avatar">' + B + '<rect x="52" y="80" width="16" height="16" fill="' + s + '"/>' + body + '<circle cx="35" cy="60" r="4.5" fill="' + s + '"/><circle cx="85" cy="60" r="4.5" fill="' + s + '"/><ellipse cx="60" cy="58" rx="' + (av.g === 'm' ? 26 : 25) + '" ry="28" fill="' + s + '"/>' + face + F + a + p + '</svg>';
}
