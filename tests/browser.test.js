const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
// face photo for the player-heads tests: TEST_FACE env var, else a generated stand-in
const FACE = process.env.TEST_FACE || null;
const CHROME = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);

const FIREBASE_STUB = `
(function(){
  const authObj = {
    onAuthStateChanged(cb){ setTimeout(()=>cb(null),0); },
    signOut: async()=>{},
    signInWithEmailAndPassword: async()=>{ throw {code:'auth/invalid-credential'}; },
    createUserWithEmailAndPassword: async()=>({user:{uid:'u1'}}),
  };
  const snapFor = (name) => ({
    empty: !(window.__docs && window.__docs[name] && window.__docs[name].length),
    forEach(cb){ ((window.__docs||{})[name]||[]).forEach(cb); },
  });
  const dbObj = {
    collection(name){ return {
      get: async()=> snapFor(name),
      onSnapshot(cb){ setTimeout(()=>cb(snapFor(name)),0); return ()=>{}; },
      where(){ return { onSnapshot(cb){ setTimeout(()=>cb(snapFor('none')),0); return ()=>{}; } }; },
      doc(){ return { get: async()=>({exists:false}), set: async()=>{}, delete: async()=>{},
                      onSnapshot(cb){ setTimeout(()=>cb({exists:false}),0); return ()=>{}; } }; },
    }; },
  };
  window.firebase = {
    apps: [],
    initializeApp(cfg, name){ const app = { name: name||'[DEFAULT]', auth: ()=>authObj }; window.firebase.apps.push(app); return app; },
    auth: ()=>authObj,
    firestore: Object.assign(()=>dbObj, { FieldValue: { serverTimestamp: ()=>0, delete: ()=>0 } }),
  };
})();
`;

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGE ERROR: ' + e.message));
  page.on('console', m => { if (m.type()==='error' && !/net::|Failed to load resource/.test(m.text())) errors.push('CONSOLE: ' + m.text()); });

  // serve repo files from memory; swap in a fake firebase config + stub SDK
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname === 'www.gstatic.com') return route.fulfill({ contentType:'application/javascript', body: u.pathname.includes('firebase-app') ? FIREBASE_STUB : '/*noop*/' });
    if (u.hostname.startsWith('fonts.')) return route.fulfill({ contentType:'text/css', body:'' });
    if (u.hostname !== 'league.test') return route.abort();
    let p = u.pathname === '/' ? '/predictions.html' : u.pathname;
    // always test against the frozen sample feed, never the live one
    if (p.startsWith('/data/history-')) return route.fulfill({ status:404, body:'none' });
    const file = p.startsWith('/data/fixtures.json') ? path.join(__dirname, 'fixtures-sample.json') : path.join(REPO, p.split('?')[0]);
    if (!fs.existsSync(file)) return route.fulfill({ status:404, body:'nope' });
    let body = fs.readFileSync(file);
    if (p.endsWith('predictions.html')) body = body.toString().replace('PASTE_YOUR_FIREBASE_CONFIG_HERE', 'FAKE_KEY_FOR_TEST');
    const ct = p.endsWith('.html')?'text/html':p.endsWith('.json')?'application/json':'application/octet-stream';
    return route.fulfill({ contentType: ct, body });
  });

  const assert = (cond, msg) => { if (!cond) { errors.push('ASSERT FAILED: ' + msg); } else console.log('ok -', msg); };

  // ---- 1. founder screen (no players yet) ----
  await page.goto('https://league.test/predictions.html');
  await page.waitForTimeout(400);
  assert(await page.isVisible('#view-founder'), 'founder screen shows when no players exist');
  await page.screenshot({ path: OUT + '/shot-1-founder.png' });

  // ---- 2. login screen (players exist) ----
  await page.addInitScript(() => { window.__docs = { players: [
    { id:'p1', data: ()=>({ name:'Dave', active:true }) },
    { id:'p2', data: ()=>({ name:'Sarah', active:true }) },
    { id:'p3', data: ()=>({ name:'Big Tony', active:false }) },
  ]}; });
  await page.reload(); await page.waitForTimeout(400);
  assert(await page.isVisible('#view-auth'), 'login screen shows when players exist');
  const opts = await page.$$eval('#li-player option', os => os.map(o=>o.textContent));
  assert(opts.includes('Dave') && opts.includes('Sarah'), 'player names listed');
  assert(!opts.includes('Big Tony'), 'inactive player hidden from login');
  await page.selectOption('#li-player', 'p1');
  const hiddenUser = await page.$eval('#li-user', el => el.value);
  assert(/^p1\.v1@/.test(hiddenUser), 'hidden username tracks selected player for password managers');
  const codeAttrs = await page.$eval('#li-code', el => el.type + '|' + el.autocomplete);
  assert(codeAttrs === 'password|current-password', 'code field is a real password field');
  await page.fill('#li-code', 'abcd-2345');
  await page.click('#view-auth button.btn-primary');
  await page.waitForTimeout(300);
  assert((await page.textContent('#auth-err')).includes("isn't right"), 'bad code shows friendly error');
  await page.screenshot({ path: OUT + '/shot-2-login.png' });

  // ---- 3. main app, driven with injected state ----
  await page.evaluate(() => {
    MYPID = 'tom';
    PLAYERS = {
      tom: { name:'Tom', admin:true, active:true, codeVersion:1 },
      dave:{ name:'Dave', admin:false, active:true, codeVersion:1 },
      sam: { name:'Sam', admin:false, active:true, codeVersion:1 },
      gaz: { name:'Gaz', admin:false, active:true, codeVersion:1 },
    };
    ME = PLAYERS.tom;
    CODES = { tom:'AAAA2222', dave:'BBBB3333', sam:'CCCC4444', gaz:'DDDD5555' };
    CONFIG = { result:6, exact:10, stake:5 };
    GAMEWEEKS = {
      gw1: { finalized:true, monthKey:'2026-08', pointsUsed:{result:6,exact:10},
        table:[ {pid:'dave',name:'Dave',pts:34,exact:2,correct:4,predicted:5,rank:1},
                {pid:'tom',name:'Tom',pts:24,exact:1,correct:3,predicted:5,rank:2},
                {pid:'sam',name:'Sam',pts:12,exact:0,correct:2,predicted:4,rank:3},
                {pid:'gaz',name:'Gaz',pts:6,exact:0,correct:1,predicted:5,rank:4} ],
        winners:[{pid:'dave',name:'Dave',pts:34}], runnersUp:[{pid:'tom',name:'Tom',pts:24}] },
      gw2: { finalized:true, monthKey:'2026-08', pointsUsed:{result:6,exact:10},
        table:[ {pid:'tom',name:'Tom',pts:38,exact:2,correct:5,predicted:5,rank:1},
                {pid:'sam',name:'Sam',pts:22,exact:1,correct:2,predicted:5,rank:2},
                {pid:'dave',name:'Dave',pts:18,exact:1,correct:3,predicted:5,rank:3},
                {pid:'gaz',name:'Gaz',pts:12,exact:0,correct:2,predicted:3,rank:4} ],
        winners:[{pid:'tom',name:'Tom',pts:38}], runnersUp:[{pid:'sam',name:'Sam',pts:22}] },
      gw3: { out:['gaz'], overrides: { 301: {h:2,a:1}, 302: {h:0,a:3} } },
    };
    PREDS = { 3: {
      tom: { pid:'tom', picks:{ 301:{h:2,a:1}, 302:{h:1,a:1}, 303:{h:0,a:2}, 304:{h:1,a:0}, 305:{h:3,a:1} } },
      dave:{ pid:'dave', picks:{ 301:{h:1,a:0}, 302:{h:2,a:0} } },
    } };
    predUnsub = ()=>{};
    show('app'); renderChrome(); renderAll();
  });
  await page.waitForTimeout(300);
  assert(await page.isVisible('#view-app'), 'main app visible');
  // winner celebration first: Tom won GW2
  assert(await page.isVisible('#win-overlay'), 'winner celebration shows for the champ');
  assert((await page.textContent('#win-msg')).includes('Tom'), 'winner message names the champ');
  assert(!!(await page.$('.fx-canvas')), 'confetti canvas running');
  await page.screenshot({ path: OUT + '/shot-12-champion.png' });
  await page.click('#win-overlay .btn');
  await page.waitForTimeout(900);
  // roast modal queued next: Gaz is bottom of the latest finalised week (GW2)
  assert(await page.isVisible('#roast-overlay'), 'loser roast queued after celebration');
  assert((await page.textContent('#roast-name')).includes('Gaz'), 'roast names the loser');
  await page.click('#roast-overlay .btn'); await page.waitForTimeout(100);
  assert(!(await page.isVisible('#roast-overlay')), 'roast dismisses');

  // ---- predictions tab ----
  const predictTxt = await page.textContent('#tab-predict');
  assert(!predictTxt.includes('Predictions are locked'), 'no lock banner once the week is under way (strip + grid lead)');
  assert(!predictTxt.includes("Who's predicted so far"), "who's predicted dropped once picks are locked");
  assert(await page.isVisible('#tab-predict .predgrid'), 'predictions grid renders');
  assert((await page.$$('#tab-predict .predgrid input[type=number]')).length === 10, 'two score boxes per fixture');
  assert((await page.$$('#tab-predict .predgrid input[type=number]:disabled')).length === 10, 'boxes locked after the deadline');
  const sticky = await page.$eval('#tab-predict .predgrid td.colme', el => getComputedStyle(el).position);
  assert(sticky === 'sticky', 'own column is sticky');
  // week-pulse strip: score, position, gap, games left + points available
  const stripTxt = await page.textContent('#tab-predict .pulsestrip');
  assert(stripTxt.includes('POSITION') || stripTxt.includes('position'), 'pulse strip renders');
  assert(/clear of|behind/i.test(stripTxt), 'strip shows the gap to a rival');
  assert(/up for grabs/i.test(stripTxt), 'strip shows points still available');
  // one page scroll: no inner vertical scroll box; the names row floats down with the page
  const wrapOv = await page.$eval('#tab-predict .predgrid-wrap', el => getComputedStyle(el).overflowY);
  assert(wrapOv === 'hidden', 'grid has no inner vertical scroll box');
  const pinY = await page.evaluate(() => {
    const t = document.querySelector('#tab-predict .predgrid');
    document.body.style.paddingBottom = '3000px';
    window.scrollTo(0, window.scrollY + t.getBoundingClientRect().top + 150);
    floatGridHead();
    const y = t.rows[0].cells[1].getBoundingClientRect().top;
    window.scrollTo(0, 0); floatGridHead(); document.body.style.paddingBottom = '';
    return Math.round(y);
  });
  assert(Math.abs(pinY) <= 2, 'player names row pinned to the top while the page scrolls (' + pinY + ')');
  const potTxt = await page.textContent('#tab-predict .potchip');
  assert(/£\d/.test(potTxt) && potTxt.includes('pot'), 'pot chip shows in the panel header (' + potTxt.trim() + ')');
  assert(await page.isVisible('#tab-predict .hint[data-hint=scores]'), 'one-time "tap any score" hint during play');
  assert(await page.isVisible('.signout-right .hint-bubble'), 'one-time refresh hint bubble');
  assert((await page.textContent('.signout-right')).includes('↻'), 'refresh button in the header');
  assert(await page.$('#ptr') !== null, 'pull-to-refresh pill exists');
  assert(await page.evaluate(() => typeof hardRefresh === 'function'), 'hardRefresh wired');
  // played games: real score in the boxes; my pick is a lozenge in its own pinned YOU column
  assert((await page.$$('#tab-predict td.colyou .pts-exact')).length === 1, 'my exact pick is a gold lozenge');
  assert((await page.$$('#tab-predict td.colyou .pstar')).length === 1, 'with the star above it, like everyone else');
  assert((await page.$$('#tab-predict td.colyou .pts-wrong')).length === 1, 'my wrong pick is a red lozenge');
  assert((await page.$$('#tab-predict .subrow')).length === 0, 'no Pred line under the score any more');
  assert((await page.$$('#tab-predict td.colme .tstack')).length === 10, 'badge with the team code stacked underneath');
  const youSticky = await page.$eval('#tab-predict td.colyou', el => getComputedStyle(el).position + '@' + el.style.left);
  assert(/^sticky@\d/.test(youSticky), 'YOU column pinned next to the fixture column (' + youSticky + ')');
  const ftBoxVals = await page.$$eval('#tab-predict input.pk-ftbox', els => els.map(e => e.value).join(''));
  assert(ftBoxVals === '2103', 'finished boxes show the real scores (' + ftBoxVals + ')');
  assert((await page.$$('#tab-predict input[type=number]:not([class*=pk-])')).length >= 2, 'unplayed games keep plain pick boxes');
  assert((await page.$$('#tab-predict .predgrid tr.done')).length === 2, 'finished games shaded (2 done rows)');
  const myHead = await page.$eval('#tab-predict .predgrid th.colyou', el => el.textContent);
  assert(myHead.includes('10') && myHead.includes('\u{1F947}'), 'header tally: my points and 1st medal');
  const headRow = await page.$eval('#tab-predict .predgrid tr', el => el.textContent);
  assert(headRow.includes('\u{1F480}'), 'eliminated player shows skull in header');
  const badgeCount = (await page.$$('#tab-predict .predgrid .ptsbadge')).length;
  assert(badgeCount > 0, 'others picks revealed after deadline in grid');
  await page.screenshot({ path: OUT + '/shot-3-predictions.png' });

  // ---- live in-play scoring ----
  await page.evaluate(() => { const f = FEED.fixtures.find(x=>x.id===303); f.hs = 0; f.as = 2; renderAll(); });
  await page.waitForTimeout(200);
  const liveBoxes = await page.evaluate(() => [$('pk-303-h').value, $('pk-303-a').value].join('-'));
  assert(liveBoxes === '0-2', 'live score shown in the boxes (' + liveBoxes + ')');
  assert((await page.$$('#tab-predict input.pk-livebox')).length === 2, 'live boxes marked as in play');
  const anim = await page.$eval('#tab-predict input.pk-livebox', el => getComputedStyle(el).animationName);
  assert(anim === 'none', 'live boxes do not pulse');
  // minutes played / half-time (wall clock since kickoff, feed as floor)
  await page.evaluate(() => { const f = FEED.fixtures.find(x=>x.id===303); f.__ko = f.kickoff; f.kickoff = new Date(Date.now() - 70*60000).toISOString(); f.min = 40; renderAll(); });
  await page.waitForTimeout(150);
  assert((await page.textContent('#tab-predict .strow2.live')).includes('52′'), 'second-half minutes from the wall clock');
  await page.evaluate(() => { const f = FEED.fixtures.find(x=>x.id===303); f.kickoff = new Date(Date.now() - 55*60000).toISOString(); f.min = 45; renderAll(); });
  await page.waitForTimeout(150);
  assert((await page.textContent('#tab-predict .strow2.live')).includes('HT'), 'half time shown around the interval');
  // match-facts popup: tap the live score, see scorers / cards
  await page.evaluate(() => {
    FEED.players = { 101:'Haaland', 102:'Foden', 103:'Bruno G.' };
    const f = FEED.fixtures.find(x=>x.id===303);
    f.stats = [
      { k:'goals_scored', h:[], a:[{value:2,element:101}] },
      { k:'red_cards', h:[{value:1,element:103}], a:[] },
    ];
    renderAll();
  });
  await page.waitForTimeout(150);
  await page.click('#pk-303-h', { force: true });
  await page.waitForTimeout(150);
  assert(await page.isVisible('#facts-overlay'), 'facts popup opens from the live score');
  const factsTxt = await page.textContent('#facts-overlay');
  assert(factsTxt.includes('Haaland ×2') && factsTxt.includes('Bruno G.'), 'popup lists scorers and red card');
  assert(factsTxt.includes('Live score'), 'popup header says Live score');
  // an open popup refreshes when new goals arrive
  await page.evaluate(() => {
    FEED.fixtures.find(x=>x.id===303).stats[0].a.push({value:1,element:102});
    showFacts(303);
  });
  await page.waitForTimeout(100);
  assert((await page.textContent('#facts-overlay')).includes('Foden'), 'popup picks up new scorers');
  await page.click('#facts-overlay .facts-card button');
  await page.waitForTimeout(100);
  assert(!(await page.isVisible('#facts-overlay')), 'facts popup closes');
  await page.evaluate(() => { const f = FEED.fixtures.find(x=>x.id===303); delete f.stats; delete FEED.players; renderAll(); });
  await page.waitForTimeout(100);
  await page.evaluate(() => { const f = FEED.fixtures.find(x=>x.id===303); f.kickoff = f.__ko; delete f.__ko; delete f.min; renderAll(); });
  await page.waitForTimeout(150);
  const ftYou = await page.$$eval('#tab-predict tr.done td.colyou', els => els.map(e => e.textContent.replace(/\s+/g,'')));
  assert(ftYou.length === 2 && ftYou[0].includes('2–1') && ftYou[1].includes('1–1'), 'finished games show my pick in the YOU column (' + ftYou.join('|') + ')');
  const koAlign = await page.$eval('#tab-predict .predgrid .ko', el => getComputedStyle(el).textAlign);
  assert(koAlign === 'center', 'upcoming kickoff dates centred under the boxes');
  // fixed-width lozenges; the exact-score star floats above without shifting them
  await page.evaluate(() => { PREDS[3].dave.picks[303] = { h:0, a:2 }; renderAll(); });
  await page.waitForTimeout(150);
  const badgeWs = await page.$$eval('#tab-predict .predgrid td .ptsbadge', els => [...new Set(els.map(e => Math.round(e.getBoundingClientRect().width)))]);
  assert(badgeWs.length === 1, 'grid lozenges uniform width (' + badgeWs.join(',') + ')');
  const realStars = await page.$$eval('#tab-predict .predgrid .pstar', els => els.length);
  assert(realStars === 3, 'star above exact lozenges only — my two and Dave\'s (' + realStars + ')');
  const starAbove = await page.$eval('#tab-predict .predgrid .pstar', el => {
    const badge = el.parentElement.querySelector('.ptsbadge');
    return el.getBoundingClientRect().bottom <= badge.getBoundingClientRect().top + 1;
  });
  assert(starAbove, 'star sits above the lozenge');
  const offCentre = await page.$$eval('#tab-predict .predgrid td:not(.colme)', tds => tds
    .map(td => { const b = td.querySelector('.ptsbadge'); if (!b) return 0;
      const tr = td.getBoundingClientRect(), br = b.getBoundingClientRect();
      return Math.abs((tr.top + tr.height/2) - (br.top + br.height/2)); })
    .filter(d => d > 2).length);
  assert(offCentre === 0, 'lozenges centred on their rows (' + offCentre + ' off-centre)');
  await page.evaluate(() => { delete PREDS[3].dave.picks[303]; FEED.fixtures.find(x=>x.id===303).hs = 0; FEED.fixtures.find(x=>x.id===303).as = 2; renderAll(); });
  await page.waitForTimeout(150);
  assert(!!(await page.$('#tab-predict .predgrid th.colyou .hstat')), 'my points+medal head the YOU column');
  assert((await page.$$('#tab-predict td.colyou .pts-exact')).length === 2, 'live exact counts provisionally in grid');
  const liveHead = await page.$eval('#tab-predict .predgrid th.colyou', el => el.textContent);
  assert(liveHead.includes('20'), 'header tally includes live points');
  assert((await page.$$('#tab-predict .predgrid tr.done')).length === 2, 'live game not shaded as done');
  // column order follows the live standings: as Sam, Tom (20) sits before Dave (6)
  await page.evaluate(() => { MYPID = 'sam'; ME = PLAYERS.sam; renderAll(); });
  await page.waitForTimeout(150);
  const colOrder = await page.$$eval('#tab-predict .predgrid tr:first-child th', ths => ths.map(t => t.textContent.trim()));
  assert(colOrder[1].startsWith('You') && colOrder[2].startsWith('Tom') && colOrder[3].startsWith('Dave'), 'other players ordered by who is winning (' + colOrder.join(',') + ')');
  await page.evaluate(() => { MYPID = 'tom'; ME = PLAYERS.tom; renderAll(); });
  await page.waitForTimeout(150);
  const myrowJustify = await page.$eval('#tab-predict .predgrid .myrow', el => getComputedStyle(el).justifyContent);
  assert(myrowJustify === 'center', 'badges and score boxes centred in the fixture column');
  await page.click('[data-tab=week]'); await page.waitForTimeout(200);
  const wkLive = await page.textContent('#tab-week');
  assert(wkLive.includes('LIVE'), 'week tab shows LIVE banner while a game is in play');
  assert(wkLive.includes('● '), 'live fixture marked in fixtures list');
  const pgDisplay = await page.$eval('#tab-week .pickgrid', el => getComputedStyle(el).display);
  assert(pgDisplay === 'grid', 'picks chips laid out on an even grid');
  const pgWidths = await page.$$eval('#tab-week .pickgrid .ptsbadge', els => [...new Set(els.map(e => Math.round(e.getBoundingClientRect().width)))]);
  assert(pgWidths.length === 1, 'pick chips uniform width (' + pgWidths.join(',') + ')');
  await page.screenshot({ path: OUT + '/shot-13-live.png' });
  await page.click('[data-tab=predict]'); await page.waitForTimeout(150);
  // fast-lane proxy merges raw FPL data straight into the live view
  await page.route('https://proxy.test/**', route => route.fulfill({ contentType:'application/json',
    body: JSON.stringify([{ id:303, team_h_score:4, team_a_score:4, minutes:61, finished:false,
      stats:[{ identifier:'goals_scored', h:[{value:4,element:101}], a:[{value:4,element:102}] }] }]) }));
  await page.evaluate(() => { CONFIG.liveProxy = 'proxy.test/fx'; FEED.players = { 101:'Haaland', 102:'Foden' }; return refreshLiveProxy(); });
  await page.waitForTimeout(200);
  const merged = await page.evaluate(() => { const f = FEED.fixtures.find(x=>x.id===303); return [f.hs, f.as, f.min]; });
  assert(merged.join(',') === '4,4,61', 'proxy scores merged into the feed, scheme-less URL tolerated (' + merged + ')');
  const proxyBoxes = await page.evaluate(() => [$('pk-303-h').value, $('pk-303-a').value].join('-'));
  assert(proxyBoxes === '4-4', 'grid re-rendered from proxy data — live score in the boxes (' + proxyBoxes + ')');
  await page.evaluate(() => { CONFIG.liveProxy = ''; delete FEED.players; const f = FEED.fixtures.find(x=>x.id===303); delete f.min; delete f.stats; f.hs = null; f.as = null; renderAll(); });
  await page.waitForTimeout(150);

  // ---- still-in verdict overlays ----
  await page.evaluate(() => {
    stillInChecked = false;
    GAMEWEEKS.gw3.overrides = { 301:{h:2,a:1}, 302:{h:0,a:3}, 303:{h:0,a:2}, 304:{h:5,a:5} };
    renderAll();
  });
  await page.waitForTimeout(300);
  assert(await page.isVisible('#stillin-overlay'), 'still-in verdict shows at 4/5 results');
  assert((await page.textContent('#stillin-name')).includes('STILL IN'), 'tom is still in it');
  await page.screenshot({ path: OUT + '/shot-10-stillin.png' });
  await page.click('#stillin-overlay .btn'); await page.waitForTimeout(100);
  await page.evaluate(() => {
    MYPID = 'sam'; ME = PLAYERS.sam; stillInChecked = false; renderAll();
  });
  await page.waitForTimeout(300);
  assert(await page.isVisible('#stillin-overlay'), 'loser verdict shows for eliminated player');
  assert((await page.textContent('#stillin-name')).includes('LOSER'), 'eliminated player gets LOSER');
  await page.screenshot({ path: OUT + '/shot-11-loser.png' });
  await page.click('#stillin-overlay .btn'); await page.waitForTimeout(100);
  // verdicts remember they've been shown — a refresh must not replay them
  await page.evaluate(() => { stillInChecked = false; renderAll(); });
  await page.waitForTimeout(250);
  assert(!(await page.isVisible('#stillin-overlay')), 'LOSER verdict not repeated after a refresh');
  // endgame panel: one game left, tom (20 pts) is uncatchable
  const wpTxt = await page.textContent('#tab-predict');
  assert(wpTxt.includes('Who can still win'), 'endgame win-paths panel appears with one game left');
  assert(wpTxt.includes('whatever happens'), 'uncatchable leader called out');
  assert(wpTxt.includes("can't win this week"), 'everyone else ruled out');
  await page.evaluate(() => { MYPID = 'tom'; ME = PLAYERS.tom; renderAll(); });
  await page.waitForTimeout(200);

  // ---- entering picks: auto-advance + saved-state button ----
  await page.evaluate(() => { GAMEWEEKS.gw3.unlocked = true; renderAll(); });
  await page.waitForTimeout(200);
  const liveInputs = await page.$$('#tab-predict .predgrid input[type=number]:not([disabled])');
  assert(liveInputs.length === 10, 'inputs re-enabled when admin-unlocked');
  assert(await page.$eval('#save-btn', el => el.classList.contains('btn-saved')), 'save button renders green when picks already saved');
  assert((await page.textContent('#save-btn')).includes('Saved — all in'), 'green button says all picks are in');
  await liveInputs[0].click();
  await page.keyboard.type('3');
  const focusedId = await page.evaluate(() => document.activeElement.id);
  const secondId = await liveInputs[1].evaluate(el => el.id);
  assert(focusedId === secondId, 'typing a digit advances focus to the next box');
  await page.keyboard.type('1');
  const thirdFocused = await page.evaluate(() => document.activeElement.id);
  const thirdId = await liveInputs[2].evaluate(el => el.id);
  assert(thirdFocused === thirdId, 'advance keeps chaining through the grid');
  assert(await page.$eval('#save-btn', el => el.classList.contains('btn-gold')), 'editing a pick flips the save button back to gold');
  assert((await page.textContent('#save-btn')).includes('Save predictions'), 'gold button asks to save again');
  await page.evaluate(() => renderAll());
  await page.waitForTimeout(150);
  const keptVal = await page.$eval('#tab-predict .predgrid input[type=number]:not([disabled])', el => el.value);
  assert(keptVal === '3', 're-render preserves an unsaved typed score');
  assert(await page.$eval('#save-btn', el => el.classList.contains('btn-gold')), 're-render keeps the dirty button gold');
  await page.evaluate(() => savePicks(3));
  await page.waitForTimeout(150);
  assert(await page.$eval('#save-btn', el => el.classList.contains('btn-saved')), 'save turns the button green');
  assert((await page.textContent('#save-btn')).includes('Saved — all in'), 'green button confirms all picks in after save');
  await page.screenshot({ path: OUT + '/shot-12-saved-btn.png' });
  // regression: a grid rendered before stored picks arrive must NOT blank them
  await page.evaluate(() => { const saved = PREDS[3].tom; delete PREDS[3].tom; renderAll(); PREDS[3].tom = saved; renderAll(); });
  await page.waitForTimeout(150);
  const refilled = await page.$eval('#tab-predict .predgrid input[type=number]:not([disabled])', el => el.value);
  assert(refilled === '2', 'stored picks re-fill a grid that rendered empty before they loaded');
  assert(await page.$eval('#save-btn', el => el.classList.contains('btn-saved')), 'button back to green once stored picks load');
  let confirmMsg = '';
  page.once('dialog', d => { confirmMsg = d.message(); d.dismiss(); });
  await page.evaluate(() => { document.querySelectorAll('#tab-predict .predgrid input[type=number]').forEach(i => i.value = ''); return savePicks(3); });
  assert(confirmMsg.includes('FEWER predictions'), 'saving fewer picks than stored asks for confirmation first');
  await page.evaluate(() => { GAMEWEEKS.gw3.unlocked = false; renderAll(); });
  await page.waitForTimeout(200);

  // ---- this week tab ----
  await page.click('[data-tab=week]'); await page.waitForTimeout(200);
  assert((await page.textContent('#tab-week')).includes('Gameweek 3 table'), 'week tab renders');
  const weekText = await page.textContent('#tab-week');
  assert(!weekText.includes('Gaz'), 'out player excluded from week table');
  assert(!weekText.includes('Predicted'), 'Predicted column removed from week table');
  assert(weekText.includes('💀'), 'mathematically-out players skulled in week table');
  // weekend race chart from injected score history
  await page.evaluate(() => {
    HISTORY[3] = { gw:3, events:[
      { t: 1757000000, changes:[{ id:301, hs:0, as:0, finished:false }] },
      { t: 1757003000, changes:[{ id:301, hs:2, as:1, finished:true }] },
      { t: 1757090000, changes:[{ id:302, hs:0, as:3, finished:true }] },
    ]};
    renderAll();
  });
  await page.waitForTimeout(200);
  assert(await page.isVisible('#race-svg'), 'weekend race chart renders');
  const raceLines = (await page.$$('#race-svg polyline')).length;
  assert(raceLines === 3, 'one race line per player (' + raceLines + ')');
  const raceTxt = await page.textContent('#tab-week');
  assert(raceTxt.includes('How the weekend unfolded') && raceTxt.includes('Replay'), 'race panel with replay button');
  await page.hover('#race-svg');
  await page.waitForTimeout(120);
  assert((await page.textContent('#race-tip')).trim().length > 0, 'race hover tip populates');
  // heads ride the ends of the lines
  await page.evaluate(() => {
    const mk = (col) => { const c = document.createElement('canvas'); c.width = 60; c.height = 72;
      const g = c.getContext('2d'); g.fillStyle = col; g.beginPath(); g.ellipse(30,36,24,32,0,0,Math.PI*2); g.fill();
      g.fillStyle = '#222'; g.fillRect(16,26,8,6); g.fillRect(36,26,8,6); return c.toDataURL('image/png'); };
    window._avSaved = AVATARS; AVATARS = { tom: mk('#e0a37e'), dave: mk('#b77b56') };
    renderAll();
  });
  await page.waitForTimeout(200);
  assert((await page.$$('#race-svg .race-headg image')).length === 2, 'uploaded heads sit on the line ends');
  assert((await page.$$('#race-svg .race-headg circle')).length === 1, 'head-less player gets a dot');
  const restT = await page.$eval('#race-svg .race-headg', el => el.getAttribute('transform'));
  await page.click('text=▶ Replay');
  await page.waitForTimeout(2500);
  const midT = await page.$eval('#race-svg .race-headg', el => el.getAttribute('transform'));
  assert(midT !== restT, 'replay: heads ride the line tips (' + restT + ' -> ' + midT + ')');
  await page.click('#race-svg .race-headg image');
  await page.waitForTimeout(200);
  assert(await page.isVisible('.headzoom img'), 'race-chart heads zoom too');
  await page.click('.headzoom'); await page.waitForTimeout(100);
  assert(!(await page.$('.headzoom')), 'tap dismisses the zoom early');
  await page.screenshot({ path: OUT + '/shot-19-race-replay.png' });
  await page.waitForTimeout(4000);
  const endT = await page.$eval('#race-svg .race-headg', el => el.getAttribute('transform'));
  assert(endT === restT, 'replay ends with heads back by the names (' + endT + ' vs ' + restT + ')');
  await page.screenshot({ path: OUT + '/shot-20-race-heads.png' });
  await page.evaluate(() => { AVATARS = window._avSaved; renderAll(); });
  await page.evaluate(() => { HISTORY[3] = null; renderAll(); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: OUT + '/shot-4-week.png' });
  // week tab on a finalised week (podium)
  await page.evaluate(() => { viewGw = 2; PREDS[2] = {}; renderAll(); });
  await page.waitForTimeout(200);
  assert((await page.textContent('#tab-week')).includes('Winner'), 'podium shows on finalised week');
  await page.screenshot({ path: OUT + '/shot-5-week-final.png' });

  // ---- leaderboard ----
  await page.click('[data-tab=board]'); await page.waitForTimeout(200);
  const board = await page.textContent('#tab-board');
  assert(board.includes('Roll of honour'), 'roll of honour renders');
  const seasonStrip = await page.textContent('#tab-board .pulsestrip');
  assert(/weekly wins/i.test(seasonStrip), 'season pulse strip renders');
  assert(/clear of|behind/i.test(seasonStrip), 'season strip shows gap to rival');
  assert(/net this period/i.test(seasonStrip), 'season strip shows money net');
  assert(board.includes('The pot'), 'money panel renders');
  assert((await page.$$('#tab-board table tr')).length > 3, 'leaderboard has rows');
  await page.screenshot({ path: OUT + '/shot-6-board.png' });

  // ---- admin ----
  await page.evaluate(() => { viewGw = 3; adminGw = 3; try { localStorage.removeItem('lefuck_admin_open'); } catch(e){} });
  await page.click('[data-tab=admin]'); await page.waitForTimeout(200);
  const admSecs = await page.$$eval('#tab-admin details.adm', ds => ds.map(d => d.dataset.key + (d.open ? '+' : '-')));
  assert(admSecs[0] === 'gameweek+' && admSecs.slice(1).every(x => x.endsWith('-')), 'admin: gameweek control first and open, the rest folded (' + admSecs + ')');
  assert((await page.textContent('#tab-admin details.adm[data-key=players] summary')).includes('active'), 'folded sections show a one-line status');
  await page.click('#tab-admin details.adm[data-key=players] summary'); await page.waitForTimeout(100);
  assert(await page.evaluate(() => adminOpenSet().has('players')), 'opened sections are remembered');
  await page.evaluate(() => { localStorage.setItem('lefuck_admin_open', JSON.stringify(ADMIN_ORDER)); renderAll(); });
  await page.waitForTimeout(150);
  const adminTxt = await page.textContent('#tab-admin');
  assert(adminTxt.includes('League settings'), 'admin league settings');
  assert(!!(await page.$('#cfg-stake')), 'stake config input');
  assert(!!(await page.$('#cfg-proxy')), 'live proxy URL setting');
  assert(!!(await page.$('#gw-stake')), 'per-week stake control');
  assert(adminTxt.includes('Wipe GW'), 'wipe-week tool present');
  assert(adminTxt.includes('Banter messages'), 'banter message editor present');
  assert(!!(await page.$('#msg-winner')), 'winner message textarea');
  const banterOpts = await page.$$eval('#tab-admin select option', os => os.map(o => o.textContent));
  assert(banterOpts.some(o => o.includes('Dave')), 'banter player dropdown lists roster');
  assert(adminTxt.includes('AAAA-2222'), 'admin sees login codes');
  assert(adminTxt.includes('Finalise GW'), 'finalise button');

  // ---- player heads: upload a pre-cut head, then on the banter card ----
  const photoBtns = await page.$$eval('#tab-admin .pcard button', bs => bs.filter(b => b.textContent.includes('Photo')).length);
  assert(photoBtns === 4, 'photo button on every player card (' + photoBtns + ')');
  await page.evaluate(() => openFaceEditor('gaz'));
  await page.waitForTimeout(100);
  assert(await page.isVisible('#face-overlay'), 'head upload opens');
  if (FACE){
    await page.setInputFiles('#face-file', FACE);
  } else {
    // stand-in cut-out on a plain white background, with a white "sticker"
    // inside the head that must NOT be stripped along with the background
    const png = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 400; c.height = 520;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0,0,400,520);
      g.fillStyle = '#e9b38f'; g.beginPath(); g.ellipse(200,230,110,140,0,0,Math.PI*2); g.fill();
      g.fillStyle = '#fff'; g.fillRect(160,150,80,30);
      return c.toDataURL('image/png').split(',')[1];
    });
    await page.setInputFiles('#face-file', { name:'head.png', mimeType:'image/png', buffer: Buffer.from(png, 'base64') });
  }
  await page.waitForTimeout(400);
  assert(await page.evaluate(() => !!HEAD_EDIT.img), 'head processed and previewed');
  if (!FACE){
    const alpha = await page.evaluate(() => new Promise(res => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const a = (x, y) => g.getImageData(x, y, 1, 1).data[3];
        res({ w: im.width, h: im.height, corner: a(1, 1), sticker: a(94, 64), cheek: a(Math.round(im.width/2), Math.round(im.height*0.75)) });
      };
      im.src = HEAD_EDIT.img;
    }));
    assert(alpha.corner === 0, 'white background stripped to transparent (' + JSON.stringify(alpha) + ')');
    assert(alpha.sticker > 200 && alpha.cheek > 200, 'white sticker inside the head survives');
    assert(Math.max(alpha.w, alpha.h) <= 240, 'head trimmed and scaled down');
  }
  await page.screenshot({ path: OUT + '/shot-14-face-upload.png' });
  await page.click('#face-overlay .btn-gold');
  await page.waitForTimeout(300);
  const ava = await page.evaluate(() => AVATARS.gaz || '');
  assert(/^data:image\/(webp|png)/.test(ava) && ava.length < 400000, 'head saved as a small transparent image (' + Math.round(ava.length/1024) + 'KB)');
  assert(!(await page.isVisible('#face-overlay')), 'upload closes on save');
  assert((await page.$$('#tab-admin .pcard .ava-btn')).length === 1, 'player card shows the saved head');
  // the head lands on the roast card (Gaz bottom of GW2)
  await page.evaluate(() => { try { localStorage.clear(); localStorage.setItem('lefuck_admin_open', JSON.stringify(ADMIN_ORDER)); } catch(e){} roastChecked = false; winnerChecked = true; maybeShowRoast(); });
  await page.waitForTimeout(300);
  assert(await page.isVisible('#roast-overlay'), 'roast card shows');
  assert((await page.$$('#roast-face img.bigface.ring-red')).length === 1, 'roast card shows the loser\'s head with a red glow');
  assert((await page.textContent('#roast-face .facebadge')).includes('🥄'), 'wooden spoon badge on the head');
  await page.screenshot({ path: OUT + '/shot-15-roast-face.png' });
  await page.click('#roast-overlay .btn'); await page.waitForTimeout(100);
  // ...and in the grid header and tables
  await page.click('[data-tab=predict]'); await page.waitForTimeout(150);
  assert((await page.$$('#tab-predict .predgrid th img.ava-th')).length === 0, 'out-this-week player has no column, so no head');
  await page.evaluate(() => { GAMEWEEKS.gw3.out = []; renderAll(); });
  await page.waitForTimeout(150);
  assert((await page.$$('#tab-predict .predgrid th img.ava-th')).length === 1, 'head appears above the name in the grid');
  await page.click('#tab-predict .predgrid th img.ava-th');
  await page.waitForTimeout(900);
  assert(await page.isVisible('.headzoom img'), 'tapping a head zooms it up');
  const zb = await page.$eval('.headzoom img', el => el.getBoundingClientRect().height);
  assert(zb > 150, 'zoomed head is big (' + Math.round(zb) + 'px)');
  assert((await page.textContent('.headzoom .hzname')).length > 0, 'zoom shows their name');
  await page.screenshot({ path: OUT + '/shot-21-head-zoom.png' });
  await page.waitForTimeout(3000);
  assert(!(await page.$('.headzoom')), 'zoom shrinks back and goes away by itself');
  // mathematically out: red cross through the head
  await page.evaluate(() => { AVATARS.sam = AVATARS.sam || AVATARS[Object.keys(AVATARS)[0]]; renderAll(); });
  await page.waitForTimeout(150);
  const deadHeads = await page.$$eval('#tab-predict .predgrid th .deadwrap img.ava', els => els.map(e => e.dataset.pid));
  const deadSet = await page.evaluate(() => [...eliminatedSet(viewGw)]);
  assert(deadSet.length > 0 && deadHeads.length > 0 && deadHeads.every(p => deadSet.includes(p)), 'dead players get a crossed-out head (' + deadHeads + ' / ' + deadSet + ')');
  assert((await page.$$('#tab-predict .deadwrap svg.deadx path')).length > 30, 'paintbrush X (bristle strokes) over dead heads');
  await page.screenshot({ path: OUT + '/shot-22-dead-cross.png', clip: { x: 0, y: 380, width: 1180, height: 260 } });
  await page.click('#tab-predict .predgrid th .deadwrap img.ava');
  await page.waitForTimeout(900);
  assert(!!(await page.$('.headzoom .hzwrap.hzdead .deadstamp')), 'a dead head gets the OUT stamp when zoomed');
  await page.screenshot({ path: OUT + '/shot-23-dead-zoom.png' });
  await page.click('.headzoom');
  await page.evaluate(() => { GAMEWEEKS.gw3.out = ['gaz']; renderAll(); });
  await page.click('[data-tab=board]'); await page.waitForTimeout(150);
  assert((await page.$$('#tab-board img.ava-sm')).length >= 1, 'head shown beside the name on the leaderboard');
  await page.click('[data-tab=admin]'); await page.waitForTimeout(150);
  await page.screenshot({ path: OUT + '/shot-7-admin.png' });

  // ---- bulk head upload: files matched to players by name ----
  await page.click('[data-tab=admin]'); await page.waitForTimeout(150);
  await page.click('text=📷 Upload heads');
  await page.waitForTimeout(100);
  const headPng = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 260;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0,0,200,260);
    g.fillStyle = '#c98f6b'; g.beginPath(); g.ellipse(100,120,60,80,0,0,Math.PI*2); g.fill();
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.setInputFiles('#bulk-files', [
    { name:'Dave.png', mimeType:'image/png', buffer: Buffer.from(headPng, 'base64') },
    { name:'IMG_0042.png', mimeType:'image/png', buffer: Buffer.from(headPng, 'base64') },
  ]);
  await page.waitForTimeout(500);
  const bulk = await page.evaluate(() => BULK_HEADS.map(h => [h.file.name, h.pid, !!h.url]));
  assert(bulk[0][1] === 'dave' && bulk[0][2], 'named file matched to its player and processed (' + JSON.stringify(bulk) + ')');
  assert(bulk[1][1] === '' && bulk[1][2], 'unnamed file processed but left unassigned');
  assert((await page.textContent('#bulk-save')).includes('Save 1 head'), 'save button counts matched heads');
  await page.click('#bulk-save');
  await page.waitForTimeout(300);
  assert(await page.evaluate(() => /^data:image\/(webp|png)/.test(AVATARS.dave || '')), 'bulk save stores the matched head');
  assert(!(await page.isVisible('#bulk-overlay')), 'bulk upload closes on save');

  // ---- shame the stragglers: deadline inside 24h ----
  await page.click('[data-tab=predict]'); await page.waitForTimeout(150);
  await page.evaluate(() => {
    const k = Date.now() + 3 * 3600e3;
    FEED.fixtures.filter(f => f.gw === 3).forEach((f,i) => { f._ko = f.kickoff; f.kickoff = new Date(k + i * 3600e3).toISOString(); f._hs = f.hs; f._as = f.as; f.hs = null; f.as = null; f._fin = f.finished; f.finished = false; });
    window._ov = GAMEWEEKS.gw3.overrides; GAMEWEEKS.gw3.overrides = {};
    viewGw = 3; renderAll();
  });
  await page.waitForTimeout(200);
  assert(await page.isVisible('#tab-predict .banner.nag'), 'stragglers banner shows inside 24h of the deadline');
  const nagTxt = await page.textContent('#tab-predict .banner.nag');
  assert(/to the deadline/.test(nagTxt) && nagTxt.includes('Dave') && nagTxt.includes('Sam') && !nagTxt.includes('Gaz'), 'banner names stragglers, not out players: ' + nagTxt);
  const waHref = await page.$eval('#tab-predict .banner.nag a', a => a.href);
  assert(waHref.startsWith('https://wa.me/?text=') && decodeURIComponent(waHref).includes('Still waiting on'), 'WhatsApp link carries the nag');
  await page.screenshot({ path: OUT + '/shot-13-nag.png' });
  await page.evaluate(() => {
    FEED.fixtures.filter(f => f.gw === 3).forEach(f => { f.kickoff = f._ko; f.hs = f._hs; f.as = f._as; f.finished = f._fin; });
    GAMEWEEKS.gw3.overrides = window._ov; renderAll();
  });
  await page.waitForTimeout(150);
  assert(!(await page.isVisible('#tab-predict .banner.nag')), 'no nag once locked');

  // ---- goal flash toast ----
  await page.evaluate(() => {
    const f = FEED.fixtures.find(x => x.id === 303);
    f._ko = f.kickoff; f.kickoff = new Date(Date.now() - 20 * 60e3).toISOString(); f.hs = 0; f.as = 0; f.finished = false;
    window._ov303 = GAMEWEEKS.gw3.overrides[303]; delete GAMEWEEKS.gw3.overrides[303];
    SCORE_SEEN = null; goalFlashes();
    f.as = 1; flashGoals();
  });
  await page.waitForTimeout(150);
  assert(await page.isVisible('#toasts .toast'), 'goal toast pops up');
  const toastTxt = await page.textContent('#toasts .toast');
  assert(toastTxt.includes('score!') && toastTxt.includes('0–1'), 'toast headline: ' + toastTxt);
  await page.screenshot({ path: OUT + '/shot-14-goal-toast.png' });
  await page.click('#toasts .toast');
  await page.waitForTimeout(150);
  assert(await page.isVisible('#facts-overlay'), 'tapping the toast opens the match facts');
  await page.click('#facts-overlay .btn');
  await page.evaluate(() => { const f = FEED.fixtures.find(x => x.id === 303); f.kickoff = f._ko; f.hs = null; f.as = null; if (window._ov303) GAMEWEEKS.gw3.overrides[303] = window._ov303; renderAll(); });

  // ---- finalised week: superlatives + share card ----
  await page.evaluate(() => {
    PREDS[2] = { tom:{ picks:{ 201:{h:0,a:2}, 203:{h:4,a:2} } }, sam:{ picks:{ 201:{h:1,a:1} } }, dave:{ picks:{ 201:{h:2,a:0} } } };
    viewGw = 2; navigator.canShare = undefined;
  });
  await page.click('[data-tab=week]'); await page.waitForTimeout(250);
  const wkFinal = await page.textContent('#tab-week');
  assert(wkFinal.includes('Superlatives') && wkFinal.includes('Lone genius'), 'superlatives panel on the finalised week');
  await page.click('#tab-week .sharerow .btn');
  await page.waitForTimeout(800);
  assert(await page.isVisible('#card-overlay'), 'share falls back to an image preview where the share sheet is unavailable');
  const cardDims = await page.$eval('#card-img', i => [i.naturalWidth, i.naturalHeight]);
  assert(cardDims[0] === 1080 && cardDims[1] === 1350, 'result card is 1080x1350 (' + cardDims + ')');
  const cardShot = await page.evaluate(() => CARD_CACHE[2].url.split(',')[1]);
  fs.writeFileSync(OUT + '/shot-15-result-card.png', Buffer.from(cardShot, 'base64'));
  await page.screenshot({ path: OUT + '/shot-16-card-preview.png' });
  await page.click('#card-overlay .btn:not(.btn-gold)');
  // the roast card has its own share button
  await page.evaluate(() => { CARD_GW = 2; $('roast-overlay').classList.remove('hidden'); });
  assert(await page.isVisible('#roast-overlay .sharebtn'), 'roast card offers a share button');
  await page.click('#roast-overlay .btn'); await page.waitForTimeout(100);

  // ---- leaderboard: badges + nemesis / head-to-head ----
  await page.click('[data-tab=board]'); await page.waitForTimeout(200);
  const boardTxt = await page.textContent('#tab-board');
  assert((await page.$$('#tab-board .bdgs .bdg')).length >= 3, 'badge chips beside names');
  assert(boardTxt.includes('Badges') && boardTxt.includes('Wooden Spoonist') && boardTxt.includes('Sniper'), 'badge legend panel');
  assert(boardTxt.includes('Head to head') && boardTxt.includes('Your nemesis: Dave') && boardTxt.includes('Your bunny: Gaz'), 'nemesis and bunny named');
  assert((await page.$$('#tab-board .h2hcard img.ava-h2h')).length >= 1, 'h2h card shows heads');
  await page.selectOption('#tab-board .panelhead select', 'sam');
  await page.waitForTimeout(150);
  assert((await page.textContent('#tab-board .h2hcard')).includes('Sam'), 'picking a rival swaps the h2h card');
  await page.screenshot({ path: OUT + '/shot-17-board-badges.png', fullPage: true });

  // ---- score popup: tap anywhere on the score boxes ----
  await page.click('[data-tab=predict]'); await page.waitForTimeout(150);
  await page.evaluate(() => { viewGw = 3; renderAll(); });
  await page.waitForTimeout(150);
  await page.click('#tab-predict .predgrid tr.done td.colme input[type=number]', { force: true });
  await page.waitForTimeout(150);
  assert(await page.isVisible('#facts-overlay'), 'tapping the score box itself opens the match popup');
  await page.click('#facts-overlay .btn'); await page.waitForTimeout(100);

  // ---- last man standing ----
  assert(!(await page.isVisible('[data-tab=lms]')), 'Last Man tab hidden while switched off');
  await page.click('[data-tab=admin]'); await page.waitForTimeout(150);
  assert((await page.textContent('#tab-admin')).includes('Last Man Standing'), 'admin has the LMS panel');
  await page.evaluate(() => {
    const k = Date.now() + 2 * 86400e3;
    FEED.fixtures.filter(f => f.gw === 3).forEach((f,i) => { f._ko = f.kickoff; f.kickoff = new Date(k + i * 3600e3).toISOString(); f._hs = f.hs; f._as = f.as; f.hs = null; f.as = null; f._fin = f.finished; f.finished = false; });
    window._ov = GAMEWEEKS.gw3.overrides; GAMEWEEKS.gw3.overrides = {};
    LMS = { enabled:true, buyIn:10, history:[{ no:1, startGw:1, endGw:1, pot:30, winners:[{pid:'sam',name:'Sam'}] }],
      round:{ id:'rX', no:2, startGw:1, entrants:['tom','dave','sam','gaz'], paid:{ tom:true, sam:true } } };
    LMS_PICKS = {
      rX_gw1_tom:{ round:'rX', gw:1, pid:'tom', team:1 }, rX_gw1_dave:{ round:'rX', gw:1, pid:'dave', team:4 },
      rX_gw1_sam:{ round:'rX', gw:1, pid:'sam', team:5 }, rX_gw1_gaz:{ round:'rX', gw:1, pid:'gaz', team:8 },
      rX_gw2_tom:{ round:'rX', gw:2, pid:'tom', team:5 }, rX_gw2_sam:{ round:'rX', gw:2, pid:'sam', team:6 }, rX_gw2_gaz:{ round:'rX', gw:2, pid:'gaz', team:10 },
    };
    renderChrome(); renderAll();
  });
  await page.waitForTimeout(200);
  const lmsAdmin = await page.textContent('#tab-admin');
  assert(lmsAdmin.includes('Round 2') && lmsAdmin.includes('£40') && lmsAdmin.includes('2/4 paid'), 'admin sees round, pot and who has paid');
  assert((await page.$$('#tab-admin input[onchange^="lmsSetIn"]')).length >= 4, 'admin can tick players in');
  assert(lmsAdmin.includes('Reset — start a new round'), 'admin can reset mid-round');
  assert(await page.isVisible('[data-tab=lms]'), 'Last Man tab appears when switched on');
  await page.click('[data-tab=lms]'); await page.waitForTimeout(200);
  const lmsTxt = await page.textContent('#tab-lms');
  assert(lmsTxt.includes('£40') && lmsTxt.includes('side pot'), 'LMS tab shows the pot');
  assert(lmsTxt.includes('Your pick · GW 3'), 'survivor gets the pick panel for the next gameweek');
  assert((await page.$$('#tab-lms .lmsteam:disabled')).length === 2, 'teams already used this round are disabled');
  assert((await page.$$('#tab-lms .lmsrow.lmsout')).length === 2, 'dave (draw) and gaz (defeat) are out');
  await page.click('#tab-lms .lmsteam:not(:disabled)');
  await page.waitForTimeout(200);
  assert((await page.$$('#tab-lms .lmsteam.on')).length === 1, 'tapping a team picks it');
  assert(lmsTxt.includes('Past rounds') && lmsTxt.includes('Sam'), 'past rounds listed');
  await page.screenshot({ path: OUT + '/shot-24-lms.png', fullPage: true });
  await page.click('[data-tab=predict]'); await page.waitForTimeout(150);
  await page.evaluate(() => { delete LMS_PICKS.rX_gw3_tom; renderAll(); });
  await page.waitForTimeout(100);
  assert((await page.textContent('#tab-predict')).includes("Last Man Standing: you haven't picked"), 'predictions tab nudges an LMS survivor without a pick');
  // won round
  await page.evaluate(() => {
    FEED.fixtures.filter(f => f.gw === 3).forEach(f => { f.kickoff = f._ko; f.hs = f._hs; f.as = f._as; f.finished = f._fin; });
    GAMEWEEKS.gw3.overrides = window._ov;
    LMS_PICKS.rX_gw2_sam.team = 3; setTab('lms');
  });
  await page.waitForTimeout(200);
  assert((await page.textContent('#tab-lms .lmswin')).includes('Tom'), 'winner card when one is left');
  await page.screenshot({ path: OUT + '/shot-25-lms-won.png', fullPage: true });

  // ---- mobile ----
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('[data-tab=predict]'); await page.waitForTimeout(200);
  await page.evaluate(() => { viewGw = 3; renderAll(); });
  await page.waitForTimeout(200);
  const colmeW = await page.$eval('#tab-predict .predgrid td.colme', el => el.getBoundingClientRect().width);
  assert(colmeW <= 180, 'pinned column condensed for mobile (' + Math.round(colmeW) + 'px)');
  const colInfo = await page.evaluate(() => {
    const wrapR = document.querySelector('.predgrid-wrap').getBoundingClientRect().right;
    const ths = [...document.querySelectorAll('.predgrid tr:first-child th:not(.colme)')];
    return { wrapR: Math.round(wrapR),
      cols: ths.map(t => ({ n: t.textContent.trim(), w: Math.round(t.getBoundingClientRect().width), r: Math.round(t.getBoundingClientRect().right) })) };
  });
  const visCols = colInfo.cols.filter(c => c.r <= colInfo.wrapR + 1).length;
  assert(visCols === colInfo.cols.length && visCols >= 2, 'all other player columns visible without scrolling ' + JSON.stringify(colInfo));
  const colSpace = colInfo.wrapR - 176 - 23;
  assert(colSpace >= 4 * 40, '4 player columns worth of space free (' + colSpace + 'px)');
  const gwnavJustify = await page.$eval('#tab-predict .gwnav', el => getComputedStyle(el).justifyContent);
  assert(gwnavJustify === 'center', 'gameweek header centred');
  const srOverflow = await page.evaluate(() => {
    return [...document.querySelectorAll('#tab-predict .predgrid td.colme .subrow')]
      .filter(sr => sr.getBoundingClientRect().right > sr.closest('td').getBoundingClientRect().right - 1).length;
  });
  assert(srOverflow === 0, 'sub-lines stay inside the pinned column (' + srOverflow + ' overflowing)');
  const misaligned = await page.evaluate(() => {
    let bad = 0;
    for (const td of document.querySelectorAll('#tab-predict .predgrid td.colme')){
      const boxes = [...td.querySelectorAll('.myrow input[type=number]')];
      const chips = [...td.querySelectorAll('.subrow .ssc')];
      if (boxes.length !== 2 || chips.length !== 2) continue;
      for (let i = 0; i < 2; i++){
        const b = boxes[i].getBoundingClientRect(), c = chips[i].getBoundingClientRect();
        if (Math.abs((b.left + b.width/2) - (c.left + c.width/2)) > 1.5) bad++;
      }
    }
    return bad;
  });
  assert(misaligned === 0, 'prediction digits centred under the score boxes (' + misaligned + ' off)');
  await page.evaluate(() => { document.querySelector('.predgrid-wrap').scrollLeft = 500; });
  await page.waitForTimeout(100);
  const colmeX = await page.$eval('#tab-predict .predgrid td.colme', el => el.getBoundingClientRect().x);
  assert(colmeX >= -5 && colmeX < 60, 'pinned column stays visible when scrolled (' + Math.round(colmeX) + 'px)');
  await page.screenshot({ path: OUT + '/shot-8-mobile.png' });
  await page.click('[data-tab=week]'); await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/shot-9-mobile-week.png' });
  await page.click('[data-tab=predict]'); await page.waitForTimeout(200);
  const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  assert(!hscroll, 'no horizontal scroll on mobile');
  await page.click('[data-tab=board]'); await page.waitForTimeout(200);
  const hscrollBoard = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  assert(!hscrollBoard, 'no horizontal scroll on the mobile leaderboard (badges + h2h)');
  await page.screenshot({ path: OUT + '/shot-18-mobile-board.png', fullPage: true });
  await page.click('[data-tab=lms]'); await page.waitForTimeout(200);
  const hscrollLms = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  assert(!hscrollLms, 'no horizontal scroll on the mobile Last Man tab');
  const tabsFit = await page.$eval('#tabs', el => el.scrollWidth <= el.clientWidth + 1);
  assert(tabsFit, 'five tabs fit across a phone');
  await page.screenshot({ path: OUT + '/shot-26-mobile-lms.png', fullPage: true });

  await browser.close();
  const passed = errors.length === 0;
  if (!passed){ console.log('\n' + errors.join('\n')); process.exit(1); }
  console.log('\nALL BROWSER TESTS PASSED');
})();
