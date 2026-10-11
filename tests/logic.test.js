const vm = require('vm');
const fs = require('fs');
const assert = require('assert');

// the app's main inline <script>, pulled straight out of predictions.html
const html = fs.readFileSync(__dirname + '/../predictions.html', 'utf8');
const code = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).sort((a,b) => b.length - a.length)[0];
const feed = JSON.parse(fs.readFileSync(__dirname + '/fixtures-sample.json', 'utf8'));

// --- stubs ---
const fakeEl = () => ({
  classList: { toggle(){}, add(){}, remove(){} },
  addEventListener(){},
  dataset: {}, style: {},
  set innerHTML(v){}, get innerHTML(){ return ''; },
  set textContent(v){}, get textContent(){ return ''; },
  value: '', querySelectorAll: () => [],
});
const sandbox = {
  console,
  crypto: require('crypto').webcrypto,
  Uint32Array,
  document: { getElementById: fakeEl, querySelector: fakeEl, querySelectorAll: () => [],
              createElement: fakeEl, head: { appendChild(){} },
              body: { insertAdjacentHTML(){}, appendChild(){} }, addEventListener(){}, hidden: true },
  window: { addEventListener(){}, scrollY: 0 },
  fetch: async () => ({ ok: false, status: 0 }),
  firebase: { apps: [], initializeApp(){ return { auth(){ return {}; } }; }, auth(){ return { onAuthStateChanged(){}} }, firestore(){ return {}; } },
  location: { origin: 'https://x', pathname: '/predictions.html', hostname: 'x' },
  navigator: {}, alert(){}, confirm(){ return true; }, prompt(){ return null; },
  setTimeout, setInterval: ()=>0, clearInterval(){}, Promise, Date, Math, JSON, Object, Array, Set, Number, String,
};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

function run(expr){ return vm.runInContext(expr, sandbox); }
function runJ(expr){ return JSON.parse(vm.runInContext(`JSON.stringify(${expr})`, sandbox)); }

// inject state
run(`FEED = ${JSON.stringify(feed)}`);
run(`PLAYERS = {
  tom:  { name:'Tom',  admin:true,  active:true },
  dave: { name:'Dave', admin:false, active:true },
  sam:  { name:'Sam',  admin:false, active:true },
  ret:  { name:'Retired', admin:false, active:false },
}`);
run(`CONFIG = { result:6, exact:10 }`);
run(`GAMEWEEKS = {}`);

// --- basic fixture helpers ---
assert.deepStrictEqual(runJ('allGws()'), [1,2,3], 'allGws');
assert.strictEqual(run('gwFixtures(2).length'), 5, 'gw2 fixtures');
assert.strictEqual(run('currentGw()'), 3, 'currentGw should be 3 (unfinished)');
assert.strictEqual(run('monthKeyOf(1)'), '2026-08', 'monthKey gw1');
assert.strictEqual(run('teamName(5)'), 'Liverpool');

// --- scoring: GW2 real results:
// 201 CHE 0-2 LIV, 202 TOT 1-3 MCI, 203 WHU 0-0 NEW, 204 MUN 1-2 ARS, 205 AVL 3-1 EVE
run(`PREDS[2] = {
  tom:  { pid:'tom', picks:{ 201:{h:0,a:2}, 202:{h:0,a:2}, 203:{h:1,a:1}, 204:{h:1,a:2}, 205:{h:2,a:0} } },
  dave: { pid:'dave', picks:{ 201:{h:1,a:1}, 202:{h:2,a:0} } },
  ret:  { pid:'ret', picks:{ 201:{h:0,a:2} } },
}`);
// tom: 201 exact(10), 202 result(6), 203 result draw(6), 204 exact(10), 205 result(6) = 38, exact 2, correct 5
// dave: both wrong = 0; sam: no picks = 0
let rows = runJ('scoreWeek(2)');
assert.strictEqual(rows.length, 3, 'retired player excluded, 3 rows');
assert.strictEqual(rows[0].pid, 'tom');
assert.deepStrictEqual([rows[0].pts, rows[0].exact, rows[0].correct, rows[0].predicted], [38,2,5,5], 'tom score');
assert.strictEqual(rows[0].rank, 1);
assert.strictEqual(rows[1].rank, 2, 'dave/sam tie on 0 pts but dave predicted... rank check');
assert.strictEqual(rows[2].rank, 2, 'tie at rank 2');

// --- out-list excludes a player ---
run(`GAMEWEEKS = { gw2: { out:['dave'] } }`);
rows = runJ('scoreWeek(2)');
assert.deepStrictEqual(rows.map(r=>r.pid).sort(), ['sam','tom'], 'dave out');
assert.strictEqual(run(`isOut(2,'dave')`), true);

// --- override beats feed ---
run(`GAMEWEEKS = { gw2: { overrides: { 201: {h:5,a:5} } } }`);
let res = runJ(`fixtureResult(2, gwFixtures(2).find(f=>f.id===201))`);
assert.deepStrictEqual([res.h,res.a,!!res.override],[5,5,true],'override wins');
// override provides a result for an unfinished fixture too
run(`GAMEWEEKS = { gw3: { overrides: { 301: {h:2,a:1} } } }`);
res = run(`fixtureResult(3, gwFixtures(3).find(f=>f.id===301))`);
assert.strictEqual(res.h, 2, 'override on unfinished fixture');

// --- finalized week uses stored points, not CONFIG ---
run(`GAMEWEEKS = { gw2: { finalized:true, pointsUsed:{result:1, exact:3} } }`);
rows = runJ('scoreWeek(2)');
assert.strictEqual(rows[0].pts, 3+1+1+3+1, 'pointsUsed honoured (tom = 9)');

// --- season aggregation ---
run(`GAMEWEEKS = {
  gw1: { finalized:true, monthKey:'2026-08', table:[
      {pid:'tom',name:'Tom',pts:20,exact:1,correct:3},
      {pid:'dave',name:'Dave',pts:12,exact:0,correct:2},
      {pid:'sam',name:'Sam',pts:6,exact:0,correct:1}],
    winners:[{pid:'tom',name:'Tom',pts:20}], runnersUp:[{pid:'dave',name:'Dave',pts:12}] },
  gw2: { finalized:true, monthKey:'2026-09', table:[
      {pid:'dave',name:'Dave',pts:30,exact:2,correct:4},
      {pid:'tom',name:'Tom',pts:10,exact:0,correct:2}],
    winners:[{pid:'dave',name:'Dave',pts:30}], runnersUp:[{pid:'tom',name:'Tom',pts:10}] },
  gw3: { finalized:false, table:[{pid:'sam',name:'Sam',pts:99}] },
}`);
let agg = runJ('seasonAgg(null)');
assert.strictEqual(agg.length, 3);
const tom = agg.find(a=>a.pid==='tom'), dave = agg.find(a=>a.pid==='dave'), sam = agg.find(a=>a.pid==='sam');
assert.deepStrictEqual([tom.wins,tom.runs,tom.pts,tom.exact,tom.correct,tom.weeks],[1,1,30,1,5,2],'tom agg');
assert.deepStrictEqual([dave.wins,dave.runs,dave.pts],[1,1,42],'dave agg');
assert.deepStrictEqual([sam.wins,sam.pts,sam.weeks],[0,6,1],'unfinalized gw3 ignored');
// ranked by wins then points: dave (1 win, 42) above tom (1 win, 30)
assert.deepStrictEqual(agg.map(a=>a.pid), ['dave','tom','sam'], 'ordering');
// month filter
agg = runJ('seasonAgg("2026-08")');
assert.strictEqual(agg.length, 3, 'aug only has gw1 (3 players)');
assert.strictEqual(agg[0].pid, 'tom');
assert.strictEqual(agg[0].weeks, 1);

// --- codes / ids ---
assert.strictEqual(run('randomCode().length'), 8);
assert.strictEqual(run('fmtCode("ABCD2345")'), 'ABCD-2345');
assert.strictEqual(run('normCode(" abcd-23 45 ")'), 'ABCD2345');
assert.match(run('loginEmail("k3x9v2ab", 3)'), /^k3x9v2ab\.v3@predleague\.app$/);
assert.strictEqual(run('new Set(Array.from({length:50},()=>randomCode())).size'), 50, 'codes unique-ish');
assert.strictEqual(run(`/[01OIL]/.test(Array.from({length:200},()=>randomCode()).join(""))`), false, 'no confusable chars');

// --- monthLabel ---
assert.strictEqual(run('monthLabel("2026-09")'), 'September 2026');

console.log('ALL LOGIC TESTS PASSED');

// --- gameweek deadline lock ---
run(`GAMEWEEKS = {}`);
assert.strictEqual(run('gwDeadline(1).toISOString()'), '2026-08-15T14:00:00.000Z', 'deadline = first kickoff');
assert.strictEqual(run('gwLocked(1)'), true, 'past gw locked');
assert.strictEqual(run('gwLocked(3)'), true, 'gw3 sample first ko 29 Aug 14:00 has passed');
run(`FEED.fixtures.push({id:900, gw:9, kickoff:'2027-01-01T15:00:00Z', h:1, a:2, hs:null, as:null, finished:false})`);
assert.strictEqual(run('gwLocked(9)'), false, 'future gw unlocked');
console.log('LOCK TESTS PASSED');

// --- admin unlock override ---
run(`GAMEWEEKS = { gw1: { unlocked:true } }`);
assert.strictEqual(run('gwLocked(1)'), false, 'unlocked gw ignores past deadline');
assert.strictEqual(run('gwUnlockedByAdmin(1)'), true, 'unlock flag detected');
run(`GAMEWEEKS = { gw1: { unlocked:false } }`);
assert.strictEqual(run('gwLocked(1)'), true, 're-locked gw locks again');
assert.strictEqual(run('gwUnlockedByAdmin(9)'), false, 'future gw not flagged as admin-unlocked');
console.log('UNLOCK TESTS PASSED');

// --- money ---
run(`GAMEWEEKS = {}; SETTLEMENTS = []; CONFIG = { result:6, exact:10, stake:5 }`);
assert.strictEqual(run('gwStake(3)'), 5, 'default stake');
run(`GAMEWEEKS = { gw3: { stake: 10 } }`);

run(`GAMEWEEKS = { gw3: { finalized:true, stake:10, stakeUsed:7 } }`);
assert.strictEqual(run('gwStake(3)'), 7, 'finalised week keeps the stake it was scored with');
// winner takes the pot; joint first splits it evenly
run(`GAMEWEEKS = {}; CONFIG = { result:6, exact:10, stake:5 }`);
let money = runJ(`gwMoney(3, [{pid:'a',rank:1},{pid:'b',rank:2},{pid:'c',rank:3}])`);
assert.deepStrictEqual([money.pot, money.winShare, money.payouts], [15, 15, {a:15}], 'winner takes the whole pot');
money = runJ(`gwMoney(3, [{pid:'a',rank:1},{pid:'b',rank:1},{pid:'c',rank:3}])`);
assert.deepStrictEqual(money.payouts, {a:7.5, b:7.5}, 'joint first splits the pot evenly');
// running balances since the last settle-up
run(`GAMEWEEKS = {
  gw1: { finalized:true, stakeUsed:5, pot:15, payouts:{tom:15}, table:[{pid:'tom',name:'Tom'},{pid:'dave',name:'Dave'},{pid:'sam',name:'Sam'}] },
  gw2: { finalized:true, stakeUsed:5, pot:15, payouts:{dave:7.5, sam:7.5}, table:[{pid:'tom',name:'Tom'},{pid:'dave',name:'Dave'},{pid:'sam',name:'Sam'}] },
}; SETTLEMENTS = []`);
let bal = runJ('moneyAgg()');
assert.deepStrictEqual(bal.map(r => [r.pid, r.staked, r.won, r.net]),
  [['tom',10,15,5], ['dave',10,7.5,-2.5], ['sam',10,7.5,-2.5]], 'staked / won / net per player');
run(`SETTLEMENTS = [{ gws:[1] }]`);
bal = runJ('moneyAgg()');
assert.deepStrictEqual(bal.find(r => r.pid === 'tom').net, -5, 'settled weeks drop out of the running balance');
console.log('MONEY TESTS PASSED');

// --- still in it? (best-case elimination maths) ---
// 4 of 5 GW3 games done; 305 still to play.
run(`MYPID = 'tom'; SETTLEMENTS = []; CONFIG = { result:6, exact:10, stake:5 };
GAMEWEEKS = { gw3: { overrides: { 301:{h:1,a:0}, 302:{h:1,a:0}, 303:{h:1,a:0}, 304:{h:1,a:0} } } };
PREDS[3] = {
  tom:  { pid:'tom',  picks:{ 301:{h:1,a:0}, 302:{h:1,a:0}, 303:{h:1,a:0}, 304:{h:0,a:1}, 305:{h:2,a:0} } },
  dave: { pid:'dave', picks:{ 301:{h:2,a:0}, 302:{h:2,a:0}, 303:{h:2,a:0}, 304:{h:2,a:0}, 305:{h:0,a:2} } },
  sam:  { pid:'sam',  picks:{ 301:{h:0,a:1}, 302:{h:0,a:1}, 303:{h:0,a:1}, 304:{h:0,a:1}, 305:{h:1,a:1} } },
}`);
// tom 30 (three exacts), dave 24 (four results), sam 0
let st = runJ('stillInStatus(3)');
assert.deepStrictEqual([st.stillIn, st.leading, st.myPts, st.myBest, st.done, st.left], [true, true, 30, 40, 4, 1], 'leader still in, best case 40');
// dave's best case (his 0-2 lands): 34 vs tom 30 -> alive; sam's best (1-1): 10 vs 30 -> dead
let es = runJ('[...eliminatedSet(3)].sort()');
assert.deepStrictEqual(es, ['sam'], 'eliminatedSet flags only the mathematically dead');
run(`MYPID = 'sam'`);
st = runJ('stillInStatus(3)');
assert.strictEqual(st.stillIn, false, 'dead player told they cannot win');
run(`MYPID = 'tom'`);
console.log('STILL-IN TESTS PASSED');

// --- banter pools ---
run(`MSGS = { winner:['league {name}'], loser:[], stillin:[], out:[], perPlayer:{ dave:{ winner:['dave special {name}'], loser:[] } } }`);
assert.strictEqual(run(`pickMsg('winner', ['builtin one'], 0, {name:'X'}, 'dave')`), 'dave special X', 'personal lines replace rotation');
assert.strictEqual(run(`pickMsg('winner', ['builtin {name}'], 0, {name:'X'}, 'tom')`), 'builtin X', 'no personal -> builtins+league pool (seed 0 = builtin)');
assert.strictEqual(run(`pickMsg('winner', ['builtin {name}'], 1, {name:'X'}, 'tom')`), 'league X', 'league custom joins rotation');
assert.strictEqual(run(`pickMsg('loser', ['fallback {name}'], 5, {name:'X'}, 'dave')`), 'fallback X', 'empty personal category falls back');
console.log('BANTER TESTS PASSED');

// --- Tuesday advance ---
// weekend GW ending Sunday afternoon -> hold until Tuesday 04:00 UTC
assert.strictEqual(run(`gwHoldUntil('2026-08-30T15:30:00Z').toISOString()`), '2026-09-01T04:00:00.000Z', 'Sunday finish advances Tuesday');
// Monday night game -> still Tuesday morning
assert.strictEqual(run(`gwHoldUntil('2026-08-31T19:00:00Z').toISOString()`), '2026-09-01T04:00:00.000Z', 'Monday finish advances Tuesday');
// midweek round ending Wednesday -> 60h cap (Saturday morning), not next Tuesday
assert.strictEqual(run(`gwHoldUntil('2026-09-02T19:00:00Z').toISOString()`), '2026-09-05T07:00:00.000Z', 'midweek finish capped at 60h');
console.log('TUESDAY-ADVANCE TESTS PASSED');

// --- live in-play scoring ---
run(`GAMEWEEKS = {}; PREDS[3] = { tom: { pid:'tom', picks:{ 303:{h:0,a:2}, 304:{h:1,a:1} } } }`);
run(`FEED.fixtures.find(f=>f.id===303).hs = 0; FEED.fixtures.find(f=>f.id===303).as = 2;`);
assert.strictEqual(run(`fixtureResult(3, FEED.fixtures.find(f=>f.id===303))`), null, 'unfinished game has no final result');
assert.deepStrictEqual(runJ(`liveScore(FEED.fixtures.find(f=>f.id===303))`), {h:0,a:2,live:true}, 'liveScore for in-play game');
assert.strictEqual(run(`liveScore(FEED.fixtures.find(f=>f.id===304))`), null, 'no live score before goals data arrives');
assert.strictEqual(runJ(`scoreWeek(3).find(r=>r.pid==='tom').pts`), 0, 'default scoreWeek waits for full time');
assert.strictEqual(runJ(`scoreWeek(3,{live:true}).find(r=>r.pid==='tom').pts`), 10, 'live scoreWeek counts in-play exact');
run(`FEED.fixtures.find(f=>f.id===304).hs = 1; FEED.fixtures.find(f=>f.id===304).as = 1; FEED.fixtures.find(f=>f.id===304).kickoff = '2099-01-01T15:00:00Z'`);
assert.strictEqual(run(`liveScore(FEED.fixtures.find(f=>f.id===304))`), null, 'future kickoff is never live');
console.log('LIVE TESTS PASSED');

// --- live minutes / half-time label ---
assert.strictEqual(run(`liveLabel({})`), 'live', 'no minutes -> plain live');
assert.strictEqual(run(`liveLabel({min:0})`), 'live', 'kickoff minute -> plain live');
assert.strictEqual(run(`liveLabel({min:37})`), '37′', 'minutes played shown');
assert.strictEqual(run(`liveLabel({min:45})`), 'HT', '45 minutes reads as half time');
assert.strictEqual(run(`liveLabel({min:67})`), '67′', 'second half minutes shown');
assert.strictEqual(run(`liveLabel({min:90})`), '90′+', 'added time capped at 90+');
console.log('LIVE-LABEL TESTS PASSED');

// --- match facts (scorers / cards / own goals / pens) ---
run(`FEED.players = { '233':'Isak', '401':'Semenyo', '5':'Gordon' }`);
run(`var tf = { stats:[
  { k:'goals_scored', h:[{value:2,element:233}], a:[{value:1,element:401}] },
  { k:'red_cards', h:[{value:1,element:5}], a:[] },
  { k:'own_goals', h:[{value:1,element:5}], a:[] },
] }`);
assert.deepStrictEqual(runJ('fixtureFacts(tf)'), {
  h: ['⚽ Isak ×2', '🟥 Gordon'],
  a: ['⚽ Semenyo', '⚽ Gordon (og)'],
}, 'facts: counts, reds, own goal credited to the other side');
assert.deepStrictEqual(runJ('fixtureFacts({})'), { h:[], a:[] }, 'no stats -> no facts');
assert.strictEqual(run(`playerName(999)`), 'Player 999', 'unknown player fallback');
console.log('FACTS TESTS PASSED');

// --- wall-clock live minutes (FPL minutes lag the real clock) ---
run(`var koAgo = (mins, fm) => ({ min: fm, kickoff: new Date(Date.now() - mins*60000).toISOString() })`);
assert.strictEqual(run(`liveLabel(koAgo(30, 22))`), '30′', 'first half follows the wall clock');
assert.strictEqual(run(`liveLabel(koAgo(20, 33))`), '33′', 'feed minutes act as a floor');
assert.strictEqual(run(`liveLabel(koAgo(47, 44))`), '45′+', 'first-half stoppage');
assert.strictEqual(run(`liveLabel(koAgo(55, 45))`), 'HT', 'interval detected from clock + feed');
assert.strictEqual(run(`liveLabel(koAgo(106, 81))`), '88′', 'second half offset by the break');
assert.strictEqual(run(`liveLabel(koAgo(112, 85))`), '90′+', 'added time');
console.log('WALL-CLOCK TESTS PASSED');

// --- weekend race timeline ---
run(`GAMEWEEKS = {}; CONFIG = { result:6, exact:10 }; PREDS[3] = {
  tom: { pid:'tom', picks:{ 301:{h:1,a:0}, 302:{h:0,a:2} } },
  dave:{ pid:'dave', picks:{ 301:{h:2,a:0} } },
}`);
run(`var hist = { gw:3, events:[
  { t:1000, changes:[{id:301,hs:0,as:0,finished:false}] },
  { t:2000, changes:[{id:301,hs:1,as:0,finished:false}] },
  { t:3000, changes:[{id:301,hs:1,as:0,finished:true},{id:302,hs:0,as:2,finished:true}] },
] }`);
const tl = runJ('pointsTimeline(3, hist)');
assert.strictEqual(tl.times.length, 4, 'timeline: zero start + one point per event');
const tlTom = tl.series.find(s=>s.pid==='tom'), tlDave = tl.series.find(s=>s.pid==='dave');
assert.deepStrictEqual(tlTom.pts, [0,0,10,20], 'tom: exact appears when the goal goes in, doubles at FT sweep');
assert.deepStrictEqual(tlDave.pts, [0,0,6,6], 'dave: correct result from the 1-0 moment');
assert.strictEqual(run('pointsTimeline(3, null)'), null, 'no history -> no timeline');
console.log('RACE TESTS PASSED');

// --- kickoff presumption: live at 0-0 before FPL flips the fixture ---
run(`var justKo = { kickoff: new Date(Date.now() - 3*60000).toISOString(), hs:null, as:null, min:0, finished:false }`);
assert.deepStrictEqual(runJ('liveScore(justKo)'), {h:0,a:0,live:true,presumed:true}, 'kicked off, no FPL score yet -> live 0-0');
run(`var staleKo = { kickoff: new Date(Date.now() - 4*3600000).toISOString(), hs:null, as:null, finished:false }`);
assert.strictEqual(run('liveScore(staleKo)'), null, 'stale kickoff (postponed) never presumed live');
run(`var futureKo = { kickoff: new Date(Date.now() + 3600000).toISOString(), hs:null, as:null, finished:false }`);
assert.strictEqual(run('liveScore(futureKo)'), null, 'future kickoff not live');
console.log('KICKOFF-PRESUMPTION TESTS PASSED');

// --- endgame win paths ---
run(`GAMEWEEKS = { gw3: { overrides: { 301:{h:1,a:0}, 302:{h:1,a:0}, 303:{h:1,a:0}, 304:{h:1,a:0} } } };
CONFIG = { result:6, exact:10 };
PREDS[3] = {
  tom:  { pid:'tom',  picks:{ 301:{h:1,a:0} } },
  dave: { pid:'dave', picks:{ 301:{h:2,a:1}, 305:{h:1,a:0} } },
  sam:  { pid:'sam',  picks:{ 305:{h:2,a:0} } },
}`);
const wp = runJ('winPaths(3)');
assert.strictEqual(wp.remaining.length, 1, 'one game left');
assert.deepStrictEqual(wp.players.map(p=>p.pid), ['tom','dave'], 'sam cannot win, others listed by points');
const wpTom = wp.players[0], wpDave = wp.players[1];
assert.deepStrictEqual(wpTom.paths, ['a draw', 'AVL to win'], 'tom needs neither WHU pick to land');
assert.strictEqual(wpTom.guaranteed, false);
assert.strictEqual(wpDave.paths[0], 'WHU to win exactly 1–0', 'dave path names the exact score');
assert.strictEqual(wpDave.more, 1, 'dave has a third way');
// finalized or early weeks return nothing
run(`GAMEWEEKS = { gw3: { finalized:true } }`);
assert.strictEqual(run('winPaths(3)'), null, 'no panel on a finalised week');
console.log('WIN-PATH TESTS PASSED');

// --- proxy URL scheme tolerance ---
run(`CONFIG.liveProxy = 'lefuck-live.example.workers.dev'`);
assert.strictEqual(run('liveProxyUrl()'), 'https://lefuck-live.example.workers.dev', 'scheme-less proxy URL gets https://');
run(`CONFIG.liveProxy = 'https://x.dev/'`);
assert.strictEqual(run('liveProxyUrl()'), 'https://x.dev/', 'schemed URL untouched');
run(`CONFIG.liveProxy = ''`);
assert.strictEqual(run('liveProxyUrl()'), '', 'empty stays empty');
console.log('PROXY-URL TESTS PASSED');

// --- player heads ---
run(`AVATARS = { reeves: 'data:image/jpeg;base64,AAAA' }`);
assert.ok(run(`avatarImg('reeves', 'ava-th')`).includes('src="data:image/jpeg;base64,AAAA"'), 'avatar img rendered for a player with a head');
assert.strictEqual(run(`avatarImg('nobody', 'ava-th')`), '', 'no head -> nothing rendered (names stay as before)');
assert.strictEqual(run(`matchHeadToPlayer('Dave.png')`), 'dave', 'filename matches a player name');
assert.strictEqual(run(`matchHeadToPlayer('SAM head.webp')`), 'sam', 'case and extras ignored');
assert.strictEqual(run(`matchHeadToPlayer('IMG_4021.jpg')`), '', 'unnamed photo left for manual pick');
assert.strictEqual(run(`matchHeadToPlayer('Retired.png')`), '', 'inactive players never matched');
console.log('AVATAR TESTS PASSED');

console.log('\nALL LOGIC SUITES PASSED');
