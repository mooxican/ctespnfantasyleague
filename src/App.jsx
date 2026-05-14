import { useState, useEffect } from 'react';

// ============ SLEEPER LEAGUE CONFIG ============
const LEAGUE_ID = '1312004917103185920';
const SLEEPER_API = 'https://api.sleeper.app/v1';
const SLEEPER_STATS_API = 'https://api.sleeper.com'; // stats live on a different host
const SLEEPER_CDN = 'https://sleepercdn.com';

// ============ SITE LOGO ============
// Set this to your logo. Two ways:
//   1. A URL:  'https://example.com/my-logo.png'
//   2. A file in the project's /public folder:  '/logo.png'
//      (drop logo.png into the `public` folder, then use '/logo.png')
// Leave as '' (empty string) to fall back to the letter badge.
//
// NOTE: The current URL is a Discord attachment link, which EXPIRES after
// a while (see the `ex=` timestamp in the URL). When the logo eventually
// stops showing, re-host the image properly: save the PNG, drop it into
// the `public` folder, and change LOGO_URL to '/logo.png'.
const LOGO_URL = 'https://media.discordapp.net/attachments/1346646791554338949/1504523866171773018/CTESPN_DYNASTY.png?ex=6a074c8a&is=6a05fb0a&hm=466aeb0f8759902dd3f061246aa3365f123429fbea777b7aa5fae4509c2b21b4&=&format=webp&quality=lossless&width=1045&height=1045';

// Distinct color per manager (cycles by roster_id)
const TEAM_COLORS = [
  '#1E40AF', '#B91C1C', '#15803D', '#7C3AED',
  '#BE185D', '#0F766E', '#C2410C', '#4338CA',
  '#DB2777', '#65A30D', '#9333EA', '#0E7490',
];

// ============================================================
//  NEWS ARTICLES — EDIT THIS to add/change your own articles
// ------------------------------------------------------------
//  Each article has:
//    id       — any unique number
//    date     — publish date as 'YYYY-MM-DD'. The homepage "Latest
//               Stories" section shows the 3 newest by this date.
//    category — short label shown above the title (e.g. 'TRADE')
//    title    — the headline
//    excerpt  — 1-2 sentence summary shown on cards
//    image    — a URL to an image (paste any image link)
//    body     — the full article text. Use \n\n between paragraphs.
//    teamIds  — array of league team roster IDs this article is about.
//               These become buttons that jump to the team's page.
//               Find a team's id: it's the roster_id, shown as
//               "Roster ID #X" on each team's Overview tab. Use [] for none.
// ============================================================
const articles = [
  {
    id: 1,
  date: '2026-05-14',
    category: 'TEST',
    title: "Test Article",
    excerpt: 'This is a test of the article system of the CTESPN Dynasty Website.',
    image: 'https://media.discordapp.net/attachments/1346646791554338949/1504514190608699612/IMG_0912.jpg?ex=6a074387&is=6a05f207&hm=4da17256a1223191cc3f2a4666eac4799264a80b15cea2d05d19168a3df7e814&=&format=webp&width=1255&height=999',
    body: "This is a test of the article system of the CTESPN Dynasty Website, May 14, 2026.\n\nThis text should appear as normal with all relevant teams and buttons to redirect them. \nHooray!",
    teamIds: [3, 5, 6],
  },
];

// Articles sorted newest-first by date. Used across the site.
const articlesByDate = [...articles].sort((a, b) => new Date(b.date) - new Date(a.date));

// ============ HELPERS ============
const makeAbbrev = (name) => {
  if (!name) return 'TM';
  const cleaned = String(name).replace(/[^a-zA-Z ]/g, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0] + (words[2]?.[0] || words[1][1] || 'X')).toUpperCase();
  return (cleaned.slice(0, 3) || 'TM').toUpperCase();
};

// ============ FALLBACK MOCK DATA ============
// Used only when the Sleeper API can't be reached (e.g. inside the artifact preview sandbox).
// In a real local environment, the live fetch will succeed and this never runs.
const FALLBACK_DATA = {
  teams: [
    { id: '1', rosterId: 1, name: 'Touchdown Tornadoes',  owner: 'mike_22',     avatar: null, wins: 10, losses: 3, ties: 0, pointsFor: 1542.8, pointsAgainst: 1390.2, playerIds: ['4046','6786','4035','4983','6770','8155','6938','5849','4866','4034'], starters: ['4046','6786','4035','4983','6770','8155','6938'], primary: '#1E40AF', abbrev: 'TDT' },
    { id: '2', rosterId: 2, name: 'Dynasty Destroyers',  owner: 'sarah_b',     avatar: null, wins: 9,  losses: 4, ties: 0, pointsFor: 1510.4, pointsAgainst: 1402.1, playerIds: ['4881','7564','4866','5849','6770','4035','5859','8112','6797','4983'], starters: ['4881','7564','4866','5849','6770','4035','5859'], primary: '#B91C1C', abbrev: 'DYD' },
    { id: '3', rosterId: 3, name: 'End Zone Empire',      owner: 'dave_w',      avatar: null, wins: 8,  losses: 5, ties: 0, pointsFor: 1488.7, pointsAgainst: 1455.6, playerIds: ['6770','4983','5859','4866','8155','5849','4046','4034','6786','4881'], starters: ['6770','4983','5859','4866','8155','5849','4046'], primary: '#15803D', abbrev: 'EZE' },
    { id: '4', rosterId: 4, name: 'Hail Mary Heroes',     owner: 'jen_p',       avatar: null, wins: 7,  losses: 6, ties: 0, pointsFor: 1470.2, pointsAgainst: 1465.9, playerIds: ['5849','4866','8112','6797','4881','7564','4035','5859','6770','4983'], starters: ['5849','4866','8112','6797','4881','7564','4035'], primary: '#7C3AED', abbrev: 'HMH' },
    { id: '5', rosterId: 5, name: 'Pigskin Pirates',      owner: 'tony_k',      avatar: null, wins: 7,  losses: 6, ties: 0, pointsFor: 1455.1, pointsAgainst: 1470.3, playerIds: ['6786','4034','4046','8155','6938','4881','5859','6797','4866','7564'], starters: ['6786','4034','4046','8155','6938','4881','5859'], primary: '#BE185D', abbrev: 'PSP' },
    { id: '6', rosterId: 6, name: 'Fourth Down Phantoms', owner: 'chris_l',     avatar: null, wins: 6,  losses: 7, ties: 0, pointsFor: 1432.6, pointsAgainst: 1489.4, playerIds: ['4035','6770','5849','6797','4866','4881','7564','6786','4046','8155'], starters: ['4035','6770','5849','6797','4866','4881','7564'], primary: '#0F766E', abbrev: 'FDP' },
    { id: '7', rosterId: 7, name: 'Red Zone Renegades',   owner: 'alex_h',      avatar: null, wins: 5,  losses: 8, ties: 0, pointsFor: 1410.3, pointsAgainst: 1510.7, playerIds: ['8112','6797','4881','7564','4035','5859','6770','4983','4866','5849'], starters: ['8112','6797','4881','7564','4035','5859','6770'], primary: '#C2410C', abbrev: 'RZR' },
    { id: '8', rosterId: 8, name: 'Blitz Brigade',        owner: 'pat_m',       avatar: null, wins: 4,  losses: 9, ties: 0, pointsFor: 1380.9, pointsAgainst: 1532.4, playerIds: ['4034','4046','8155','6938','4881','5859','6797','4866','7564','6770'], starters: ['4034','4046','8155','6938','4881','5859','6797'], primary: '#4338CA', abbrev: 'BBR' },
  ],
  // Sample player database (real Sleeper player IDs map to real NFL players)
  players: {
    '4046': { full_name: 'Patrick Mahomes', position: 'QB', team: 'KC',  age: 29 },
    '6786': { full_name: 'Josh Allen',      position: 'QB', team: 'BUF', age: 28 },
    '4881': { full_name: 'Lamar Jackson',   position: 'QB', team: 'BAL', age: 28 },
    '6770': { full_name: 'Joe Burrow',      position: 'QB', team: 'CIN', age: 28 },
    '4034': { full_name: 'Christian McCaffrey', position: 'RB', team: 'SF', age: 28 },
    '4035': { full_name: 'Saquon Barkley',  position: 'RB', team: 'PHI', age: 28 },
    '4983': { full_name: 'Derrick Henry',   position: 'RB', team: 'BAL', age: 30 },
    '7564': { full_name: 'Bijan Robinson',  position: 'RB', team: 'ATL', age: 23 },
    '6797': { full_name: "Ja'Marr Chase",   position: 'WR', team: 'CIN', age: 25 },
    '8112': { full_name: 'CeeDee Lamb',     position: 'WR', team: 'DAL', age: 26 },
    '4866': { full_name: 'Tyreek Hill',     position: 'WR', team: 'MIA', age: 31 },
    '5849': { full_name: 'A.J. Brown',      position: 'WR', team: 'PHI', age: 27 },
    '8155': { full_name: 'Sam LaPorta',     position: 'TE', team: 'DET', age: 24 },
    '6938': { full_name: 'Travis Kelce',    position: 'TE', team: 'KC',  age: 35 },
    '5859': { full_name: 'Mark Andrews',    position: 'TE', team: 'BAL', age: 29 },
  },
  // Generate 4 weeks of matchups
  matchupsByWeek: (() => {
    const weeks = {};
    const pairings = [
      // week 1
      [[1,2],[3,4],[5,6],[7,8]],
      // week 2
      [[1,3],[2,4],[5,7],[6,8]],
      // week 3
      [[1,4],[2,3],[5,8],[6,7]],
      // week 4 (current week)
      [[1,5],[2,6],[3,7],[4,8]],
    ];
    pairings.forEach((week, wi) => {
      weeks[wi + 1] = [];
      week.forEach(([a, b], mi) => {
        const ptsA = Math.round((90 + Math.random() * 60) * 10) / 10;
        const ptsB = Math.round((90 + Math.random() * 60) * 10) / 10;
        weeks[wi + 1].push({ roster_id: a, matchup_id: mi + 1, points: ptsA });
        weeks[wi + 1].push({ roster_id: b, matchup_id: mi + 1, points: ptsB });
      });
    });
    return weeks;
  })(),
  currentWeek: 4,
};

// Fetch one complete past season given its league_id.
// Returns standings, champion, matchups, and the previous_league_id (to chain further back).
async function fetchPastSeason(leagueId) {
  const [leagueRes, usersRes, rostersRes] = await Promise.all([
    fetch(`${SLEEPER_API}/league/${leagueId}`),
    fetch(`${SLEEPER_API}/league/${leagueId}/users`),
    fetch(`${SLEEPER_API}/league/${leagueId}/rosters`),
  ]);
  const [league, users, rosters] = await Promise.all([
    leagueRes.json(), usersRes.json(), rostersRes.json()
  ]);

  // Build standings (same shape as current-season teams)
  const standings = rosters.map((roster, i) => {
    const owner = users.find(u => u.user_id === roster.owner_id);
    const teamName = owner?.metadata?.team_name || owner?.display_name || `Team ${roster.roster_id}`;
    return {
      id: String(roster.roster_id),
      rosterId: roster.roster_id,
      name: teamName,
      owner: owner?.display_name || 'Unknown',
      wins: roster.settings?.wins || 0,
      losses: roster.settings?.losses || 0,
      ties: roster.settings?.ties || 0,
      pointsFor: (roster.settings?.fpts || 0) + (roster.settings?.fpts_decimal || 0) / 100,
      pointsAgainst: (roster.settings?.fpts_against || 0) + (roster.settings?.fpts_against_decimal || 0) / 100,
      primary: TEAM_COLORS[i % TEAM_COLORS.length],
      abbrev: makeAbbrev(teamName),
    };
  }).sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);

  // Champion + full bracket. The bracket is an array of matchup objects:
  //   { r: round, m: match#, t1: rosterId, t2: rosterId, w: winner, l: loser, ... }
  // t1/t2 can also be { w: matchId } or { l: matchId } meaning "winner/loser of match X".
  let champion = null;
  let bracket = [];
  try {
    const bracketRes = await fetch(`${SLEEPER_API}/league/${leagueId}/winners_bracket`);
    const raw = await bracketRes.json();
    if (Array.isArray(raw) && raw.length) {
      bracket = raw;
      const finalRound = Math.max(...raw.map(m => m.r || 0));
      const finalMatch = raw.find(m => m.r === finalRound && m.w != null);
      if (finalMatch) champion = standings.find(t => t.rosterId === finalMatch.w) || null;
    }
  } catch {
    // bracket may not exist; champion stays null
  }

  // Past-season matchups — playoffs typically run through ~17 weeks
  const weeks = Array.from({ length: 18 }, (_, i) => i + 1);
  const matchupResults = await Promise.all(
    weeks.map(w =>
      fetch(`${SLEEPER_API}/league/${leagueId}/matchups/${w}`)
        .then(r => r.json())
        .catch(() => [])
    )
  );
  const matchupsByWeek = {};
  weeks.forEach((w, i) => {
    if (Array.isArray(matchupResults[i]) && matchupResults[i].length) {
      matchupsByWeek[w] = matchupResults[i];
    }
  });

  return {
    leagueId,
    season: league.season,
    name: league.name,
    previousLeagueId: league.previous_league_id || null,
    standings,
    champion,
    bracket,
    matchupsByWeek,
  };
}

// ============ LIVE DATA HOOK ============
function useLeagueData() {
  const [data, setData] = useState({ loading: true, error: null, usingFallback: false, league: null, teams: [], players: {}, currentWeek: 1, season: String(new Date().getFullYear()), matchupsByWeek: {}, transactions: [], history: [], draftPicks: {} });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [leagueRes, usersRes, rostersRes, stateRes] = await Promise.all([
          fetch(`${SLEEPER_API}/league/${LEAGUE_ID}`),
          fetch(`${SLEEPER_API}/league/${LEAGUE_ID}/users`),
          fetch(`${SLEEPER_API}/league/${LEAGUE_ID}/rosters`),
          fetch(`${SLEEPER_API}/state/nfl`),
        ]);
        const [league, users, rosters, nflState] = await Promise.all([
          leagueRes.json(), usersRes.json(), rostersRes.json(), stateRes.json()
        ]);

        const currentWeek = Math.max(1, Math.min(nflState.week || 1, 18));
        const season = nflState.season || String(new Date().getFullYear());

        const teams = rosters.map((roster, i) => {
          const owner = users.find(u => u.user_id === roster.owner_id);
          const teamName = owner?.metadata?.team_name || owner?.display_name || `Team ${roster.roster_id}`;
          return {
            id: String(roster.roster_id),
            rosterId: roster.roster_id,
            name: teamName,
            owner: owner?.display_name || 'Unknown',
            avatar: owner?.avatar ? `${SLEEPER_CDN}/avatars/thumbs/${owner.avatar}` : null,
            wins: roster.settings?.wins || 0,
            losses: roster.settings?.losses || 0,
            ties: roster.settings?.ties || 0,
            pointsFor: (roster.settings?.fpts || 0) + (roster.settings?.fpts_decimal || 0) / 100,
            pointsAgainst: (roster.settings?.fpts_against || 0) + (roster.settings?.fpts_against_decimal || 0) / 100,
            playerIds: roster.players || [],
            starters: roster.starters || [],
            primary: TEAM_COLORS[i % TEAM_COLORS.length],
            abbrev: makeAbbrev(teamName),
          };
        }).sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);

        const weeksToFetch = Array.from({ length: currentWeek }, (_, i) => i + 1);
        const matchupResults = await Promise.all(
          weeksToFetch.map(w => fetch(`${SLEEPER_API}/league/${LEAGUE_ID}/matchups/${w}`).then(r => r.json()))
        );
        const matchupsByWeek = {};
        weeksToFetch.forEach((w, i) => { matchupsByWeek[w] = matchupResults[i]; });

        // Fetch transactions for every week, flatten into one list.
        // Tag each with its week (the fetch index) so we can group later.
        const txnResults = await Promise.all(
          weeksToFetch.map(w => fetch(`${SLEEPER_API}/league/${LEAGUE_ID}/transactions/${w}`).then(r => r.json()))
        );
        const transactions = txnResults
          .flatMap((weekTxns, i) =>
            (weekTxns || []).map(t => ({ ...t, week: weeksToFetch[i] }))
          )
          .filter(t => t && t.status === 'complete')
          .sort((a, b) => (b.status_updated || 0) - (a.status_updated || 0));

        const playersRes = await fetch(`${SLEEPER_API}/players/nfl`);
        const players = await playersRes.json();

        // Fetch the league's drafts, then each draft's picks.
        // Build a lookup: player_id -> { round, pick, draftType, season }
        const draftPicks = {};
        try {
          const draftsRes = await fetch(`${SLEEPER_API}/league/${LEAGUE_ID}/drafts`);
          const drafts = await draftsRes.json();
          if (Array.isArray(drafts) && drafts.length) {
            const allPicks = await Promise.all(
              drafts.map(d =>
                fetch(`${SLEEPER_API}/draft/${d.draft_id}/picks`)
                  .then(r => r.json())
                  .then(picks => ({ draft: d, picks }))
                  .catch(() => ({ draft: d, picks: [] }))
              )
            );
            allPicks.forEach(({ draft, picks }) => {
              (picks || []).forEach(p => {
                if (p.player_id) {
                  draftPicks[p.player_id] = {
                    round: p.round,
                    pick: p.pick_no,
                    draftType: draft.type || 'draft',
                    season: draft.season,
                  };
                }
              });
            });
          }
        } catch (e) {
          console.warn('Could not load draft data:', e.message);
        }

        // Walk the previous_league_id chain to collect past seasons.
        // Capped at 10 to avoid runaway loops on very old leagues.
        const history = [];
        let prevId = league.previous_league_id;
        let guard = 0;
        while (prevId && guard < 10) {
          try {
            const past = await fetchPastSeason(prevId);
            history.push(past);
            prevId = past.previousLeagueId;
          } catch (e) {
            console.warn('Could not load past season:', e.message);
            break;
          }
          guard++;
        }

        if (cancelled) return;
        setData({ loading: false, error: null, usingFallback: false, league, teams, players, currentWeek, season, matchupsByWeek, transactions, history, draftPicks });
      } catch (err) {
        // Sleeper API unreachable (e.g. inside an artifact preview sandbox).
        // Fall back to demo data so the design is still viewable.
        if (cancelled) return;
        console.warn('Sleeper API blocked, using demo data:', err.message);
        setData({
          loading: false,
          error: null,
          usingFallback: true,
          league: { name: 'Demo League' },
          teams: FALLBACK_DATA.teams,
          players: FALLBACK_DATA.players,
          currentWeek: FALLBACK_DATA.currentWeek,
          season: String(new Date().getFullYear()),
          matchupsByWeek: FALLBACK_DATA.matchupsByWeek,
          transactions: [],
          history: [],
          draftPicks: {},
        });
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return data;
}

// Group matchups by matchup_id (Sleeper pairs teams using shared matchup_id)
function pairMatchups(weekMatchups, teams) {
  if (!weekMatchups) return [];
  const groups = {};
  weekMatchups.forEach(m => {
    if (!groups[m.matchup_id]) groups[m.matchup_id] = [];
    groups[m.matchup_id].push(m);
  });
  return Object.values(groups).map(pair => {
    if (pair.length !== 2) return null;
    const [a, b] = pair;
    return {
      teamA: teams.find(t => t.rosterId === a.roster_id),
      teamB: teams.find(t => t.rosterId === b.roster_id),
      scoreA: a.points,
      scoreB: b.points,
    };
  }).filter(Boolean);
}

// ============ NAVBAR ============
function Navbar({ currentPage, setPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = ['Home', 'Matchups', 'News', 'Teams', 'Players', 'Standings', 'Transactions', 'History'];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <div onClick={() => setPage('Home')} className="flex items-center gap-2 cursor-pointer">
            {LOGO_URL ? (
              <img src={LOGO_URL} alt="CTESPN Dynasty League" className="w-10 h-10 object-contain rounded shrink-0" />
            ) : (
              <div className="w-10 h-10 bg-blue-700 flex items-center justify-center font-black text-white text-xl tracking-tighter rounded shrink-0">C</div>
            )}
            <span className="text-blue-900 font-display font-black text-lg lg:text-xl tracking-tight hidden sm:block">CTESPN Dynasty League</span>
          </div>
          <div className="hidden md:flex gap-1">
            {links.map(link => (
              <button key={link} onClick={() => setPage(link)}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all relative ${
                  currentPage === link ? 'text-blue-700' : 'text-gray-700 hover:text-blue-700'
                }`}>
                {link}
                {currentPage === link && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-700" />}
              </button>
            ))}
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-1 border-t border-gray-100 pt-2">
            {links.map(link => (
              <button key={link} onClick={() => { setPage(link); setMenuOpen(false); }}
                className={`text-left px-4 py-3 text-sm font-bold uppercase tracking-wider rounded ${
                  currentPage === link ? 'text-blue-700 bg-blue-50' : 'text-gray-700'
                }`}>{link}</button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

// ============ MATCHUP CARD ============
function MatchupCard({ matchup, isCurrentWeek }) {
  const { teamA, teamB, scoreA, scoreB } = matchup;
  if (!teamA || !teamB) return null;
  const aWon = scoreA > scoreB;
  const bWon = scoreB > scoreA;

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:border-blue-700 hover:shadow-md transition-all">
      <div className="px-4 py-2 flex justify-between items-center border-b border-gray-100">
        <span className="text-xs text-gray-500 font-semibold">Matchup</span>
        {isCurrentWeek ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-600">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            LIVE
          </span>
        ) : (
          <span className="text-xs font-bold text-gray-600">FINAL</span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <MatchupTeamRow team={teamA} score={scoreA} won={aWon} />
        <MatchupTeamRow team={teamB} score={scoreB} won={bWon} />
      </div>
    </div>
  );
}

function MatchupTeamRow({ team, score, won }) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 flex items-center justify-center font-black text-white text-xs rounded shrink-0" style={{ backgroundColor: team.primary }}>
          {team.abbrev}
        </div>
        <div className="min-w-0">
          <div className={`font-bold truncate ${won ? 'text-gray-900' : 'text-gray-700'}`}>{team.name}</div>
          <div className="text-xs text-gray-500">{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ''}</div>
        </div>
      </div>
      <span className={`text-2xl font-display font-black ml-2 shrink-0 ${won ? 'text-gray-900' : 'text-gray-400'}`}>
        {score?.toFixed(1) ?? '—'}
      </span>
    </div>
  );
}

// Compact single-line team row for the homepage Matchups column
function MatchupColumnRow({ team, score, won }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 flex items-center justify-center font-black text-white text-[10px] rounded shrink-0" style={{ backgroundColor: team.primary }}>
          {team.abbrev}
        </div>
        <span className={`text-sm truncate ${won ? 'font-bold text-gray-900' : 'font-semibold text-gray-600'}`}>
          {team.name}
        </span>
      </div>
      <span className={`text-lg font-display font-black ml-2 shrink-0 ${won ? 'text-gray-900' : 'text-gray-400'}`}>
        {score?.toFixed(1) ?? '—'}
      </span>
    </div>
  );
}

// ============ LOADING / ERROR ============
function LoadingScreen() {
  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-semibold">Loading your Sleeper league…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-xl border border-red-200 max-w-md">
        <h2 className="text-xl font-display font-black text-gray-900 mb-2">Couldn't load league</h2>
        <p className="text-gray-600 text-sm">{error}</p>
      </div>
    </div>
  );
}

// ============ HOME PAGE ============
function HomePage({ setPage, data, openArticle }) {
  const { teams, currentWeek, matchupsByWeek } = data;
  const currentMatchups = pairMatchups(matchupsByWeek[currentWeek], teams);
  const featured = articlesByDate[0];          // newest article = featured hero
  const latestThree = articlesByDate.slice(0, 3); // 3 newest for "Latest Stories"
  const topTwo = teams.slice(0, 2);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <div className="grid grid-cols-2 h-80">
              {topTwo[0] && (
                <div className="relative p-6 flex flex-col justify-end overflow-hidden" style={{ background: `linear-gradient(135deg, ${topTwo[0].primary}, ${topTwo[0].primary}cc)` }}>
                  <div className="absolute top-4 left-4 w-12 h-12 bg-white/10 backdrop-blur rounded flex items-center justify-center font-black text-white text-sm">
                    {topTwo[0].abbrev}
                  </div>
                  <div className="absolute -right-4 -top-4 text-white/10 text-9xl font-display font-black tracking-tighter">1</div>
                  <div className="relative z-10">
                    <div className="text-white/80 text-xs font-bold tracking-widest mb-1">LEAGUE LEADER</div>
                    <div className="text-white text-2xl font-display font-black tracking-tight leading-tight">{topTwo[0].name}</div>
                    <div className="text-white text-5xl font-display font-black mt-2">{topTwo[0].wins}-{topTwo[0].losses}</div>
                  </div>
                </div>
              )}
              {topTwo[1] && (
                <div className="relative p-6 flex flex-col justify-end overflow-hidden" style={{ background: `linear-gradient(135deg, ${topTwo[1].primary}, ${topTwo[1].primary}cc)` }}>
                  <div className="absolute top-4 right-4 w-12 h-12 bg-white/10 backdrop-blur rounded flex items-center justify-center font-black text-white text-sm">
                    {topTwo[1].abbrev}
                  </div>
                  <div className="absolute -left-4 -top-4 text-white/10 text-9xl font-display font-black tracking-tighter">2</div>
                  <div className="relative z-10 text-right">
                    <div className="text-white/80 text-xs font-bold tracking-widest mb-1">2ND PLACE</div>
                    <div className="text-white text-2xl font-display font-black tracking-tight leading-tight">{topTwo[1].name}</div>
                    <div className="text-white text-5xl font-display font-black mt-2">{topTwo[1].wins}-{topTwo[1].losses}</div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => openArticle(featured.id)} className="p-6 text-left w-full hover:bg-gray-50 transition-colors">
              <span className="inline-block px-2 py-0.5 bg-blue-700 text-white text-xs font-black tracking-widest rounded">{featured.category}</span>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-gray-900 leading-tight tracking-tight mt-3 mb-2">{featured.title}</h1>
              <p className="text-gray-600 font-body text-lg leading-relaxed">{featured.excerpt}</p>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <button className="text-sm font-display font-black text-gray-900 border-b-2 border-blue-700 pb-1">
                WEEK {currentWeek} MATCHUPS
              </button>
              <button onClick={() => setPage('Matchups')} className="text-xs text-blue-700 font-bold hover:text-blue-900">
                ALL →
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {currentMatchups.length === 0 && (
                <div className="px-5 py-6 text-sm text-gray-400 text-center">No matchups yet.</div>
              )}
              {currentMatchups.map((m, i) => {
                if (!m.teamA || !m.teamB) return null;
                const aWon = m.scoreA > m.scoreB;
                const bWon = m.scoreB > m.scoreA;
                return (
                  <div key={i} className="px-5 py-3">
                    <MatchupColumnRow team={m.teamA} score={m.scoreA} won={aWon} />
                    <MatchupColumnRow team={m.teamB} score={m.scoreB} won={bWon} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-display font-black text-gray-900 uppercase tracking-tight mb-4">Latest Stories</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestThree.map(story => (
              <button key={story.id} onClick={() => openArticle(story.id)} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-blue-700 transition-all cursor-pointer text-left">
                <div className="h-40 bg-gray-100 overflow-hidden">
                  {story.image ? (
                    <img src={story.image} alt={story.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center">
                      <span className="text-white/30 text-6xl font-display font-black tracking-tighter">FFL</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-700 tracking-widest">{story.category}</span>
                    {story.date && (
                      <span className="text-xs text-gray-400 font-semibold">
                        {new Date(story.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mt-2 leading-snug">{story.title}</h3>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MATCHUPS PAGE ============
function MatchupsPage({ data }) {
  const { teams, currentWeek, matchupsByWeek } = data;
  const [week, setWeek] = useState(currentWeek);
  const weekMatchups = pairMatchups(matchupsByWeek[week], teams);
  const weeks = Object.keys(matchupsByWeek).map(Number).sort((a, b) => a - b);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-baseline gap-4 mb-2">
          <h1 className="text-4xl sm:text-5xl font-display font-black text-gray-900 tracking-tight">MATCHUPS</h1>
          <span className="text-blue-700 font-bold">WEEK {week}</span>
        </div>
        <p className="text-gray-600 mb-6">Head-to-head fantasy results.</p>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {weeks.map(w => (
            <button key={w} onClick={() => setWeek(w)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                w === week ? 'bg-blue-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}>
              Week {w}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {weekMatchups.map((m, i) => <MatchupCard key={i} matchup={m} isCurrentWeek={week === currentWeek} />)}
          {weekMatchups.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              No matchup data available for Week {week} yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ STANDINGS PAGE ============
function StandingsPage({ data }) {
  const { teams } = data;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-4xl sm:text-5xl font-display font-black text-gray-900 tracking-tight mb-2">STANDINGS</h1>
        <p className="text-gray-600 mb-8">League standings sorted by wins, then points for.</p>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 text-xs font-bold text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-200 bg-gray-50">
            <span className="col-span-1">#</span>
            <span className="col-span-5">Team</span>
            <span className="col-span-2 text-center">W-L</span>
            <span className="col-span-2 text-right">PF</span>
            <span className="col-span-2 text-right">PA</span>
          </div>
          {teams.map((t, i) => (
            <div key={t.id} className="grid grid-cols-12 items-center px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-blue-50/50 transition-colors">
              <span className="col-span-1 text-gray-400 font-bold text-sm">{i + 1}</span>
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 flex items-center justify-center font-black text-white text-xs rounded shrink-0" style={{ backgroundColor: t.primary }}>
                  {t.abbrev}
                </div>
                <div className="min-w-0">
                  <div className="text-gray-900 font-bold truncate">{t.name}</div>
                  <div className="text-xs text-gray-500 truncate">{t.owner}</div>
                </div>
              </div>
              <span className="col-span-2 text-center text-gray-900 font-bold">{t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ''}</span>
              <span className="col-span-2 text-right text-gray-700 font-semibold">{t.pointsFor.toFixed(1)}</span>
              <span className="col-span-2 text-right text-gray-500">{t.pointsAgainst.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ TEAMS PAGE ============
function TeamsPage({ data, setPage, setActiveTeam }) {
  const { teams } = data;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-4xl sm:text-5xl font-display font-black text-gray-900 tracking-tight mb-2">TEAMS</h1>
        <p className="text-gray-600 mb-8">Click any team to view their hub.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {teams.map(t => (
            <button key={t.id} onClick={() => { setActiveTeam(t.id); setPage('TeamHub'); }}
              className="relative overflow-hidden rounded-xl shadow-sm hover:shadow-xl cursor-pointer transition-all group text-left"
              style={{ backgroundColor: t.primary }}>
              <div className="p-6 h-40 flex flex-col justify-between">
                <div className="text-white/70 font-bold text-xs tracking-widest">FANTASY</div>
                <div>
                  <div className="text-white/80 text-sm font-semibold truncate">{t.owner}</div>
                  <div className="text-white text-2xl font-display font-black tracking-tight leading-tight line-clamp-2">{t.name}</div>
                  <div className="text-white/80 text-sm font-bold mt-1">{t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ''}</div>
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 text-white/10 text-9xl font-display font-black tracking-tighter group-hover:text-white/20 transition-colors">
                {t.abbrev}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ TEAM HUB ============
function TeamHubPage({ teamId, data, setPage, openPlayer }) {
  const [tab, setTab] = useState('Overview');
  const { teams, players, matchupsByWeek, currentWeek, history } = data;
  const team = teams.find(t => t.id === teamId);
  if (!team) return null;

  // Only show the History tab if the league actually has past seasons
  const hasHistory = history && history.length > 0;
  const tabs = hasHistory
    ? ['Overview', 'Roster', 'Schedule', 'History']
    : ['Overview', 'Roster', 'Schedule'];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="relative overflow-hidden" style={{ backgroundColor: team.primary }}>
        <div className="absolute -right-12 -bottom-20 text-white/10 text-[20rem] font-display font-black tracking-tighter leading-none select-none">
          {team.abbrev}
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <button onClick={() => setPage('Teams')} className="text-white/80 hover:text-white text-sm font-bold mb-4">← All Teams</button>
          <div className="text-white/80 font-semibold text-sm">{team.owner}</div>
          <h1 className="text-4xl sm:text-6xl font-display font-black text-white tracking-tight leading-tight">{team.name}</h1>
          <div className="flex gap-4 mt-3 text-white/90 font-bold text-sm">
            <span>{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ''}</span>
            <span>•</span>
            <span>{team.pointsFor.toFixed(1)} PF</span>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative ${
                tab === t ? 'text-blue-700' : 'text-gray-600 hover:text-gray-900'
              }`}>
              {t}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" />}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'Overview' && <TeamOverview team={team} teams={teams} matchupsByWeek={matchupsByWeek} currentWeek={currentWeek} />}
        {tab === 'Roster' && <TeamRoster team={team} players={players} openPlayer={openPlayer} />}
        {tab === 'Schedule' && <TeamSchedule team={team} teams={teams} matchupsByWeek={matchupsByWeek} currentWeek={currentWeek} />}
        {tab === 'History' && <TeamHistory team={team} history={history} />}
      </div>
    </div>
  );
}

// Past-season records for one manager (matched by owner name across seasons)
function TeamHistory({ team, history }) {
  const pastRecords = history.map(season => {
    // Roster IDs can shift between seasons, so match by owner display name
    const past = season.standings.find(s => s.owner === team.owner);
    if (!past) return null;
    const rank = season.standings.findIndex(s => s.owner === team.owner) + 1;
    const wasChampion = season.champion?.owner === team.owner;
    return { season: season.season, past, rank, wasChampion };
  }).filter(Boolean);

  if (pastRecords.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        No past-season records found for this manager.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-display font-black text-gray-900 uppercase tracking-tight">Past Seasons</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {pastRecords.map(r => (
          <div key={r.season} className="flex items-center gap-4 px-6 py-4">
            <div className="text-center w-16">
              <div className="text-2xl font-display font-black text-gray-900">{r.season}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 flex items-center gap-2">
                {r.past.name}
                {r.wasChampion && (
                  <span className="text-xs font-black text-amber-600">🏆 CHAMPION</span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {r.past.wins}-{r.past.losses}{r.past.ties ? `-${r.past.ties}` : ''} · {r.past.pointsFor.toFixed(1)} PF
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Finish</div>
              <div className="text-xl font-display font-black text-gray-900">#{r.rank}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamOverview({ team }) {
  const games = team.wins + team.losses + team.ties;
  const winPct = games ? (team.wins / games).toFixed(3) : '0.000';
  const avgPF = games ? (team.pointsFor / games).toFixed(1) : '0.0';

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-display font-black text-gray-900 mb-4 uppercase tracking-tight">Team Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <InfoStat label="Manager" value={team.owner} />
            <InfoStat label="Roster ID" value={`#${team.rosterId}`} />
            <InfoStat label="Avg PPG" value={avgPF} />
            <InfoStat label="Win %" value={winPct} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-display font-black text-gray-900 mb-4 uppercase tracking-tight">Season Stats</h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            <BigStat label="Wins" value={team.wins} />
            <BigStat label="Losses" value={team.losses} />
            <BigStat label="PF" value={team.pointsFor.toFixed(0)} />
            <BigStat label="PA" value={team.pointsAgainst.toFixed(0)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoStat({ label, value }) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</div>
      <div className="text-gray-900 font-bold mt-1 truncate">{value}</div>
    </div>
  );
}

function BigStat({ label, value }) {
  return (
    <div>
      <div className="text-4xl font-display font-black text-gray-900">{value}</div>
      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

function TeamRoster({ team, players, openPlayer }) {
  const starters = new Set(team.starters || []);
  const rosterPlayers = (team.playerIds || []).map(pid => {
    const p = players[pid];
    return p ? {
      id: pid,
      name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || pid,
      pos: p.position || 'OTHER',
      team: p.team || 'FA',
      age: p.age || '—',
      isStarter: starters.has(pid),
    } : { id: pid, name: pid, pos: 'OTHER', team: 'FA', age: '—', isStarter: starters.has(pid) };
  });

  // Group players by position
  const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'OTHER'];
  const POSITION_LABELS = {
    QB: 'Quarterbacks',
    RB: 'Running Backs',
    WR: 'Wide Receivers',
    TE: 'Tight Ends',
    K: 'Kickers',
    DEF: 'Defense',
    OTHER: 'Other',
  };

  const grouped = {};
  rosterPlayers.forEach(p => {
    const key = POSITION_ORDER.includes(p.pos) ? p.pos : 'OTHER';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  // Sort each group: starters first, then by name
  Object.values(grouped).forEach(group =>
    group.sort((a, b) => (b.isStarter - a.isStarter) || a.name.localeCompare(b.name))
  );

  const orderedPositions = POSITION_ORDER.filter(p => grouped[p]?.length);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-display font-black text-gray-900 uppercase tracking-tight">Roster</h2>
        <span className="text-sm text-gray-500 font-bold">{rosterPlayers.length} PLAYERS</span>
      </div>

      {orderedPositions.map(pos => (
        <div key={pos} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
            <span
              className="inline-block px-2.5 py-1 text-xs font-black text-white rounded"
              style={{ backgroundColor: team.primary }}
            >
              {pos}
            </span>
            <h3 className="text-base font-display font-black text-gray-900 uppercase tracking-tight">
              {POSITION_LABELS[pos]}
            </h3>
            <span className="text-xs text-gray-500 font-bold ml-auto">{grouped[pos].length}</span>
          </div>
          <div className="grid grid-cols-12 text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-2 border-b border-gray-100">
            <span className="col-span-7">Player</span>
            <span className="col-span-2">NFL</span>
            <span className="col-span-2">Age</span>
            <span className="col-span-1 text-right">Role</span>
          </div>
          {grouped[pos].map(p => (
            <button
              key={p.id}
              onClick={() => openPlayer(p.id)}
              className="w-full text-left grid grid-cols-12 items-center px-6 py-3 border-b border-gray-100 last:border-0 hover:bg-blue-50/50 transition-colors"
            >
              <span className="col-span-7 font-bold text-gray-900 truncate hover:text-blue-700">{p.name}</span>
              <span className="col-span-2 text-gray-700 text-sm">{p.team}</span>
              <span className="col-span-2 text-gray-700">{p.age}</span>
              <span className="col-span-1 text-right">
                {p.isStarter ? (
                  <span className="text-xs font-black text-blue-700">START</span>
                ) : (
                  <span className="text-xs text-gray-400 font-bold">BENCH</span>
                )}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function TeamSchedule({ team, teams, matchupsByWeek, currentWeek }) {
  const weeks = Object.keys(matchupsByWeek).map(Number).sort((a, b) => a - b);
  const rows = weeks.map(w => {
    const weekData = matchupsByWeek[w];
    const myEntry = weekData?.find(m => m.roster_id === team.rosterId);
    if (!myEntry) return null;
    const oppEntry = weekData.find(m => m.matchup_id === myEntry.matchup_id && m.roster_id !== team.rosterId);
    if (!oppEntry) return null;
    const opp = teams.find(t => t.rosterId === oppEntry.roster_id);
    const played = w < currentWeek || (w === currentWeek && (myEntry.points > 0 || oppEntry.points > 0));
    const won = played && myEntry.points > oppEntry.points;
    const lost = played && myEntry.points < oppEntry.points;
    return { week: w, opp, myPoints: myEntry.points, oppPoints: oppEntry.points, played, won, lost };
  }).filter(Boolean);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-display font-black text-gray-900 uppercase tracking-tight">Schedule</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map(r => (
          <div key={r.week} className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50/50 transition-colors">
            <div className="text-center w-16">
              <div className="text-xs font-bold text-gray-500 uppercase">Week</div>
              <div className="text-2xl font-display font-black text-gray-900">{r.week}</div>
            </div>
            <div className="w-12 h-12 rounded flex items-center justify-center font-black text-white text-xs shrink-0" style={{ backgroundColor: r.opp?.primary || '#999' }}>
              {r.opp?.abbrev || '??'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 truncate">vs {r.opp?.name || 'TBD'}</div>
              <div className="text-sm text-gray-500">{r.opp?.owner}</div>
            </div>
            <div className="text-right">
              {r.played ? (
                <div className={`font-display font-black text-lg ${r.won ? 'text-green-600' : r.lost ? 'text-red-600' : 'text-gray-900'}`}>
                  {r.won ? 'W' : r.lost ? 'L' : 'T'} {r.myPoints.toFixed(1)}–{r.oppPoints.toFixed(1)}
                </div>
              ) : (
                <div className="text-blue-700 font-bold text-sm">Upcoming</div>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="p-8 text-center text-gray-500">No schedule data available.</div>}
      </div>
    </div>
  );
}

// ============ TRANSACTIONS PAGE ============
function TransactionsPage({ data, setPage, setActiveTeam, openPlayer }) {
  const { teams, players, transactions } = data;
  const [filter, setFilter] = useState('all');

  // Map roster_id -> team for quick lookup
  const teamByRoster = {};
  teams.forEach(t => { teamByRoster[t.rosterId] = t; });

  // Navigate to a team's hub page
  const goToTeam = (team) => {
    if (!team) return;
    setActiveTeam(team.id);
    setPage('TeamHub');
    window.scrollTo(0, 0);
  };

  const playerName = (pid) => {
    const p = players[pid];
    if (!p) return pid;
    return p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || pid;
  };
  const playerPos = (pid) => players[pid]?.position || '';

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'trade', label: 'Trades' },
    { key: 'waiver', label: 'Waivers' },
    { key: 'free_agent', label: 'Free Agency' },
  ];

  const filtered = (transactions || []).filter(t =>
    filter === 'all' ? true : t.type === filter
  );

  const formatDate = (ms) => {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Group the filtered transactions by week, keeping weeks in descending order
  const byWeek = {};
  filtered.forEach(txn => {
    const w = txn.week || txn.leg || 0;
    if (!byWeek[w]) byWeek[w] = [];
    byWeek[w].push(txn);
  });
  const weekNumbers = Object.keys(byWeek).map(Number).sort((a, b) => b - a);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-4xl sm:text-5xl font-display font-black text-gray-900 tracking-tight mb-2">TRANSACTIONS</h1>
        <p className="text-gray-600 mb-6">Every trade, waiver claim, and free agent signing this season.</p>

        {/* Filter buttons */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                filter === f.key ? 'bg-blue-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {weekNumbers.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            No {filter === 'all' ? '' : filters.find(f => f.key === filter)?.label.toLowerCase() + ' '}transactions found.
          </div>
        )}

        {/* Week-by-week sections */}
        <div className="space-y-8">
          {weekNumbers.map(week => (
            <div key={week}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xl font-display font-black text-gray-900 uppercase tracking-tight">
                  Week {week}
                </h2>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-bold text-gray-400">
                  {byWeek[week].length} {byWeek[week].length === 1 ? 'move' : 'moves'}
                </span>
              </div>
              <div className="space-y-3">
                {byWeek[week].map((txn) => (
                  <TransactionRow
                    key={txn.transaction_id}
                    txn={txn}
                    teamByRoster={teamByRoster}
                    playerName={playerName}
                    playerPos={playerPos}
                    formatDate={formatDate}
                    goToTeam={goToTeam}
                    openPlayer={openPlayer}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ txn, teamByRoster, playerName, playerPos, formatDate, goToTeam, openPlayer }) {
  const TYPE_STYLES = {
    trade: { label: 'TRADE', color: '#7C3AED' },
    waiver: { label: 'WAIVER', color: '#0F766E' },
    free_agent: { label: 'FREE AGENT', color: '#C2410C' },
  };
  const style = TYPE_STYLES[txn.type] || { label: txn.type?.toUpperCase() || 'MOVE', color: '#6B7280' };

  // adds: { player_id: roster_id }  drops: { player_id: roster_id }
  const adds = txn.adds || {};
  const drops = txn.drops || {};

  // Which rosters are involved
  const rosterIds = txn.roster_ids || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="inline-block px-2.5 py-1 text-xs font-black text-white rounded" style={{ backgroundColor: style.color }}>
          {style.label}
        </span>
        <span className="text-xs text-gray-400 font-semibold">{formatDate(txn.status_updated)}</span>
      </div>

      {/* Teams involved — clickable, jump to team hub */}
      <div className="flex flex-wrap gap-2 mb-3">
        {rosterIds.map(rid => {
          const team = teamByRoster[rid];
          if (!team) return null;
          return (
            <button
              key={rid}
              onClick={() => goToTeam(team)}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-gray-100 transition-colors"
            >
              <span className="w-6 h-6 flex items-center justify-center font-black text-white text-[10px] rounded" style={{ backgroundColor: team.primary }}>
                {team.abbrev}
              </span>
              <span className="text-sm font-bold text-gray-900 hover:text-blue-700">{team.name}</span>
            </button>
          );
        })}
      </div>

      {/* Player movement — player names clickable to their profile */}
      <div className="space-y-1.5">
        {Object.entries(adds).map(([pid, rid]) => {
          const team = teamByRoster[rid];
          return (
            <div key={'add' + pid} className="flex items-center gap-2 text-sm">
              <span className="text-green-600 font-black">+</span>
              <button onClick={() => openPlayer(pid)} className="font-bold text-gray-900 hover:text-blue-700">
                {playerName(pid)}
              </button>
              {playerPos(pid) && <span className="text-xs text-gray-500">{playerPos(pid)}</span>}
              {team && (
                <button onClick={() => goToTeam(team)} className="text-gray-400 text-xs hover:text-blue-700">
                  → {team.name}
                </button>
              )}
            </div>
          );
        })}
        {Object.entries(drops).map(([pid, rid]) => {
          const team = teamByRoster[rid];
          return (
            <div key={'drop' + pid} className="flex items-center gap-2 text-sm">
              <span className="text-red-600 font-black">−</span>
              <button onClick={() => openPlayer(pid)} className="font-semibold text-gray-600 hover:text-blue-700">
                {playerName(pid)}
              </button>
              {playerPos(pid) && <span className="text-xs text-gray-400">{playerPos(pid)}</span>}
              {team && (
                <button onClick={() => goToTeam(team)} className="text-gray-400 text-xs hover:text-blue-700">
                  from {team.name}
                </button>
              )}
            </div>
          );
        })}
        {Object.keys(adds).length === 0 && Object.keys(drops).length === 0 && (
          <div className="text-sm text-gray-400">No player movement recorded.</div>
        )}
      </div>
    </div>
  );
}

// ============ NEWS PAGE ============
function NewsPage({ openArticle }) {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-4xl sm:text-5xl font-display font-black text-gray-900 tracking-tight mb-2">NEWS</h1>
        <p className="text-gray-600 mb-8">League news and analysis.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articlesByDate.map(story => (
            <button key={story.id} onClick={() => openArticle(story.id)} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-blue-700 transition-all cursor-pointer text-left">
              <div className="h-40 bg-gray-100 overflow-hidden">
                {story.image ? (
                  <img src={story.image} alt={story.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center">
                    <span className="text-white/30 text-6xl font-display font-black tracking-tighter">FFL</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <span className="text-xs font-black text-blue-700 tracking-widest">{story.category}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-2 leading-snug">{story.title}</h3>
                <p className="text-gray-600 font-body mt-2 leading-relaxed">{story.excerpt}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ ARTICLE PAGE (full reading view) ============
function ArticlePage({ articleId, data, setPage, setActiveTeam }) {
  const article = articles.find(a => a.id === articleId);
  if (!article) return null;

  // Resolve linked teams from their roster IDs
  const linkedTeams = (article.teamIds || [])
    .map(id => data.teams.find(t => String(t.id) === String(id)))
    .filter(Boolean);

  const paragraphs = (article.body || '').split('\n\n').filter(Boolean);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <button onClick={() => setPage('News')} className="text-blue-700 hover:text-blue-900 text-sm font-bold mb-6">
          ← Back to News
        </button>

        <span className="inline-block px-2 py-0.5 bg-blue-700 text-white text-xs font-black tracking-widest rounded">
          {article.category}
        </span>
        <h1 className="text-3xl sm:text-5xl font-display font-black text-gray-900 tracking-tight leading-tight mt-4 mb-4">
          {article.title}
        </h1>
        <p className="text-xl text-gray-600 font-body leading-relaxed mb-6">{article.excerpt}</p>

        {article.image && (
          <img src={article.image} alt={article.title} className="w-full rounded-xl mb-8 object-cover" />
        )}

        <div className="space-y-5 mb-10">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-lg text-gray-800 font-body leading-relaxed">{para}</p>
          ))}
        </div>

        {/* Linked team buttons */}
        {linkedTeams.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-3">Teams in this story</h3>
            <div className="flex flex-wrap gap-3">
              {linkedTeams.map(team => (
                <button
                  key={team.id}
                  onClick={() => { setActiveTeam(team.id); setPage('TeamHub'); }}
                  className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-lg text-white font-bold hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: team.primary }}
                >
                  <span className="w-8 h-8 flex items-center justify-center bg-white/15 rounded font-black text-sm">
                    {team.abbrev}
                  </span>
                  <span>{team.name}</span>
                  <span className="text-white/70">→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ HISTORY PAGE ============
function HistoryPage({ data, setPage, setActiveTeam }) {
  const { history } = data;
  const [openSeason, setOpenSeason] = useState(null); // leagueId of expanded season

  if (!history || history.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="text-4xl sm:text-5xl font-display font-black text-gray-900 tracking-tight mb-2">HISTORY</h1>
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 mt-6">
            No previous seasons found — this is the league's first season. Check back next year!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-4xl sm:text-5xl font-display font-black text-gray-900 tracking-tight mb-2">HISTORY</h1>
        <p className="text-gray-600 mb-8">Past seasons, champions, and final standings.</p>

        <div className="space-y-6">
          {history.map(season => (
            <SeasonHistoryCard
              key={season.leagueId}
              season={season}
              isOpen={openSeason === season.leagueId}
              onToggle={() => setOpenSeason(openSeason === season.leagueId ? null : season.leagueId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Visual playoff bracket. Sleeper's bracket is a flat array of matchups;
// each has r (round), m (match #), t1/t2 (roster IDs or {w/l: matchId} refs),
// and w/l (winner/loser roster IDs once decided).
function PlayoffBracket({ bracket, standings }) {
  if (!bracket || bracket.length === 0) {
    return (
      <p className="text-sm text-gray-500">No playoff bracket data available for this season.</p>
    );
  }

  const teamByRoster = {};
  standings.forEach(t => { teamByRoster[t.rosterId] = t; });

  // Group matchups by round
  const rounds = {};
  bracket.forEach(m => {
    if (!rounds[m.r]) rounds[m.r] = [];
    rounds[m.r].push(m);
  });
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  roundNumbers.forEach(r => rounds[r].sort((a, b) => (a.m || 0) - (b.m || 0)));

  const roundLabel = (r, total) => {
    const fromEnd = total - r;
    if (fromEnd === 0) return 'Final';
    if (fromEnd === 1) return 'Semifinals';
    if (fromEnd === 2) return 'Quarterfinals';
    return `Round ${r}`;
  };

  // Resolve a t1/t2 slot into a team (or a placeholder label)
  const resolveSlot = (slot) => {
    if (slot == null) return null;
    if (typeof slot === 'number') return teamByRoster[slot] || null;
    // Object form: { w: matchId } or { l: matchId }
    if (typeof slot === 'object') {
      if (slot.w != null) return { placeholder: `Winner of Match ${slot.w}` };
      if (slot.l != null) return { placeholder: `Loser of Match ${slot.l}` };
    }
    return null;
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-2">
      {roundNumbers.map(r => (
        <div key={r} className="flex flex-col gap-4 min-w-[200px]">
          <div className="text-xs font-black text-gray-500 uppercase tracking-widest text-center">
            {roundLabel(r, roundNumbers.length)}
          </div>
          <div className="flex flex-col gap-4 justify-around flex-1">
            {rounds[r].map((m, i) => {
              const t1 = resolveSlot(m.t1);
              const t2 = resolveSlot(m.t2);
              return (
                <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <BracketSlot team={t1} isWinner={m.w != null && m.w === t1?.rosterId} />
                  <div className="border-t border-gray-100" />
                  <BracketSlot team={t2} isWinner={m.w != null && m.w === t2?.rosterId} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketSlot({ team, isWinner }) {
  if (!team) {
    return <div className="px-3 py-2.5 text-sm text-gray-300 italic">TBD</div>;
  }
  if (team.placeholder) {
    return <div className="px-3 py-2.5 text-xs text-gray-400 italic">{team.placeholder}</div>;
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 ${isWinner ? 'bg-blue-50' : ''}`}>
      <span
        className="w-6 h-6 flex items-center justify-center font-black text-white text-[10px] rounded shrink-0"
        style={{ backgroundColor: team.primary }}
      >
        {team.abbrev}
      </span>
      <span className={`text-sm truncate flex-1 ${isWinner ? 'font-black text-gray-900' : 'font-semibold text-gray-600'}`}>
        {team.name}
      </span>
      {isWinner && <span className="text-blue-700 text-xs font-black">✓</span>}
    </div>
  );
}

function SeasonHistoryCard({ season, isOpen, onToggle }) {
  const [week, setWeek] = useState(null);
  const weekNumbers = Object.keys(season.matchupsByWeek || {}).map(Number).sort((a, b) => a - b);
  const activeWeek = week || weekNumbers[0];
  const weekMatchups = pairMatchups(season.matchupsByWeek?.[activeWeek], season.standings);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Season header */}
      <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <span className="text-3xl font-display font-black text-gray-900">{season.season}</span>
          {season.champion && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-600 uppercase tracking-widest">🏆 Champion</span>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center font-black text-white text-[10px] rounded" style={{ backgroundColor: season.champion.primary }}>
                  {season.champion.abbrev}
                </span>
                <span className="font-bold text-gray-900">{season.champion.name}</span>
              </div>
            </div>
          )}
        </div>
        <button onClick={onToggle} className="text-sm text-blue-700 font-bold hover:text-blue-900">
          {isOpen ? 'Hide details ▲' : 'Show details ▼'}
        </button>
      </div>

      {/* Final standings — always visible */}
      <div className="grid grid-cols-12 text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-2 border-b border-gray-100 bg-gray-50">
        <span className="col-span-1">#</span>
        <span className="col-span-6">Team</span>
        <span className="col-span-2 text-center">W-L</span>
        <span className="col-span-3 text-right">Points For</span>
      </div>
      {season.standings.map((t, i) => (
        <div key={t.id} className="grid grid-cols-12 items-center px-6 py-2.5 border-b border-gray-100 last:border-0">
          <span className="col-span-1 text-gray-400 font-bold text-sm">{i + 1}</span>
          <div className="col-span-6 flex items-center gap-3 min-w-0">
            <span className="w-6 h-6 flex items-center justify-center font-black text-white text-[10px] rounded shrink-0" style={{ backgroundColor: t.primary }}>
              {t.abbrev}
            </span>
            <div className="min-w-0">
              <div className="font-bold text-gray-900 truncate">{t.name}</div>
              <div className="text-xs text-gray-500 truncate">{t.owner}</div>
            </div>
          </div>
          <span className="col-span-2 text-center text-gray-900 font-bold">{t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ''}</span>
          <span className="col-span-3 text-right text-gray-700 font-semibold">{t.pointsFor.toFixed(1)}</span>
        </div>
      ))}

      {/* Expandable: playoff bracket + matchups by week */}
      {isOpen && (
        <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-6">
          {/* Playoff bracket */}
          <div>
            <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-3">Playoff Bracket</h3>
            <PlayoffBracket bracket={season.bracket} standings={season.standings} />
          </div>

          {/* Matchups by week */}
          {weekNumbers.length > 0 && (
            <div>
              <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-3">Matchups</h3>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {weekNumbers.map(w => (
                  <button key={w} onClick={() => setWeek(w)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                      w === activeWeek ? 'bg-blue-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}>
                    Week {w}
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {weekMatchups.map((m, i) => {
                  if (!m.teamA || !m.teamB) return null;
                  const aWon = m.scoreA > m.scoreB;
                  const bWon = m.scoreB > m.scoreA;
                  return (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
                      <MatchupColumnRow team={m.teamA} score={m.scoreA} won={aWon} />
                      <MatchupColumnRow team={m.teamB} score={m.scoreB} won={bWon} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ PLAYERS PAGE (searchable database) ============
function PlayersPage({ data, openPlayer }) {
  const { players, teams } = data;
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');

  // Set of player IDs rostered anywhere in the league, for the "rostered" badge
  const rosteredIds = new Set();
  const rosterOwner = {};
  teams.forEach(t => {
    (t.playerIds || []).forEach(pid => {
      rosteredIds.add(String(pid));
      rosterOwner[String(pid)] = t;
    });
  });

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

  // Only search once the user has typed at least 2 characters —
  // rendering all ~11,000 players at once would be slow.
  const q = query.trim().toLowerCase();
  let results = [];
  if (q.length >= 2) {
    results = Object.entries(players)
      .filter(([pid, p]) => {
        if (!p) return false;
        const name = (p.full_name || `${p.first_name || ''} ${p.last_name || ''}`).toLowerCase();
        if (!name.includes(q)) return false;
        if (posFilter !== 'ALL' && p.position !== posFilter) return false;
        return true;
      })
      .slice(0, 60) // cap results for performance
      .map(([pid, p]) => ({
        id: pid,
        name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || pid,
        pos: p.position || '—',
        team: p.team || 'FA',
      }))
      .sort((a, b) => {
        // Rostered players first, then alphabetical
        const ar = rosteredIds.has(a.id) ? 0 : 1;
        const br = rosteredIds.has(b.id) ? 0 : 1;
        return ar - br || a.name.localeCompare(b.name);
      });
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-4xl sm:text-5xl font-display font-black text-gray-900 tracking-tight mb-2">PLAYERS</h1>
        <p className="text-gray-600 mb-6">Search the full NFL player database. Rostered players are marked.</p>

        {/* Search box */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players by name…"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 mb-4 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
        />

        {/* Position filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {positions.map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                posFilter === pos ? 'bg-blue-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}>
              {pos}
            </button>
          ))}
        </div>

        {/* Results */}
        {q.length < 2 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            Start typing a player's name to search.
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            No players found for "{query}".
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {results.map(p => {
              const owner = rosterOwner[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => openPlayer(p.id)}
                  className="w-full text-left flex items-center gap-4 px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-blue-50/50 transition-colors"
                >
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded w-12 text-center shrink-0">
                    {p.pos}
                  </span>
                  <span className="font-bold text-gray-900 flex-1 hover:text-blue-700">{p.name}</span>
                  <span className="text-sm text-gray-500">{p.team}</span>
                  {owner && (
                    <span
                      className="text-[10px] font-black text-white px-2 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: owner.primary }}
                      title={`Rostered by ${owner.name}`}
                    >
                      {owner.abbrev}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ PLAYER PAGE ============
function PlayerPage({ playerId, data, setPage, setActiveTeam }) {
  const { players, teams, season, transactions, history, draftPicks } = data;
  const player = players[playerId];

  // Which tab is showing
  const [tab, setTab] = useState('Profile');
  // Current-season stats — fetched on demand
  const [stats, setStats] = useState({ loading: true, error: false, data: null });
  // Past-season stats — one entry per past season
  const [pastStats, setPastStats] = useState({ loading: true, data: [] });

  useEffect(() => {
    let cancelled = false;
    setStats({ loading: true, error: false, data: null });
    setPastStats({ loading: true, data: [] });

    if (!playerId) return;

    // Current season
    fetch(`${SLEEPER_STATS_API}/stats/nfl/player/${playerId}?season=${season}&season_type=regular&grouping=season`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        setStats({ loading: false, error: false, data: json?.stats || null });
      })
      .catch(() => {
        if (!cancelled) setStats({ loading: false, error: true, data: null });
      });

    // Past seasons — one stats call per season in history
    const pastSeasonYears = (history || []).map(h => h.season).filter(Boolean);
    if (pastSeasonYears.length === 0) {
      setPastStats({ loading: false, data: [] });
    } else {
      Promise.all(
        pastSeasonYears.map(yr =>
          fetch(`${SLEEPER_STATS_API}/stats/nfl/player/${playerId}?season=${yr}&season_type=regular&grouping=season`)
            .then(r => r.json())
            .then(json => ({ season: yr, stats: json?.stats || null }))
            .catch(() => ({ season: yr, stats: null }))
        )
      ).then(results => {
        if (!cancelled) setPastStats({ loading: false, data: results });
      });
    }

    return () => { cancelled = true; };
  }, [playerId, season, history]);

  if (!player) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="text-2xl font-display font-black text-gray-900 mb-2">Player not found</h1>
          <button onClick={() => setPage('Teams')} className="text-blue-700 font-bold">← Back to Teams</button>
        </div>
      </div>
    );
  }

  const name = player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim() || playerId;

  // Find which league team rosters this player
  const rosteredBy = teams.find(t => (t.playerIds || []).includes(String(playerId)));
  const isStarter = rosteredBy?.starters?.includes(String(playerId));

  // Draft pick info for this player (if any)
  const draftInfo = draftPicks?.[String(playerId)] || null;

  // This player's transaction history in the league
  const teamByRoster = {};
  teams.forEach(t => { teamByRoster[t.rosterId] = t; });
  const playerTransactions = (transactions || [])
    .filter(txn => {
      const adds = txn.adds || {};
      const drops = txn.drops || {};
      return adds[String(playerId)] != null || drops[String(playerId)] != null;
    })
    .map(txn => {
      const adds = txn.adds || {};
      const drops = txn.drops || {};
      const addedTo = adds[String(playerId)] != null ? teamByRoster[adds[String(playerId)]] : null;
      const droppedFrom = drops[String(playerId)] != null ? teamByRoster[drops[String(playerId)]] : null;
      return { txn, addedTo, droppedFrom };
    });

  // Convert height (Sleeper gives inches as a string sometimes) to ft-in
  const formatHeight = (h) => {
    if (!h) return '—';
    const inches = parseInt(h, 10);
    if (isNaN(inches)) return h;
    return `${Math.floor(inches / 12)}'${inches % 12}"`;
  };

  const profileFields = [
    { label: 'Position', value: player.position || '—' },
    { label: 'NFL Team', value: player.team || 'Free Agent' },
    { label: 'Number', value: player.number != null ? `#${player.number}` : '—' },
    { label: 'Age', value: player.age || '—' },
    { label: 'Height', value: formatHeight(player.height) },
    { label: 'Weight', value: player.weight ? `${player.weight} lbs` : '—' },
    { label: 'Years Pro', value: player.years_exp != null ? player.years_exp : '—' },
    { label: 'College', value: player.college || '—' },
  ];

  // Pick the most relevant stat lines based on position.
  // Sleeper stat keys: pass_yd, pass_td, pass_int, rush_yd, rush_td,
  // rec, rec_yd, rec_td, gp (games played), pts_ppr, etc.
  const STAT_SETS = {
    QB: [
      { key: 'gp', label: 'Games' },
      { key: 'pass_yd', label: 'Pass Yds' },
      { key: 'pass_td', label: 'Pass TD' },
      { key: 'pass_int', label: 'INT' },
      { key: 'rush_yd', label: 'Rush Yds' },
      { key: 'rush_td', label: 'Rush TD' },
    ],
    RB: [
      { key: 'gp', label: 'Games' },
      { key: 'rush_yd', label: 'Rush Yds' },
      { key: 'rush_td', label: 'Rush TD' },
      { key: 'rec', label: 'Rec' },
      { key: 'rec_yd', label: 'Rec Yds' },
      { key: 'rec_td', label: 'Rec TD' },
    ],
    WR: [
      { key: 'gp', label: 'Games' },
      { key: 'rec', label: 'Rec' },
      { key: 'rec_yd', label: 'Rec Yds' },
      { key: 'rec_td', label: 'Rec TD' },
      { key: 'rush_yd', label: 'Rush Yds' },
      { key: 'rush_td', label: 'Rush TD' },
    ],
    TE: [
      { key: 'gp', label: 'Games' },
      { key: 'rec', label: 'Rec' },
      { key: 'rec_yd', label: 'Rec Yds' },
      { key: 'rec_td', label: 'Rec TD' },
    ],
    K: [
      { key: 'gp', label: 'Games' },
      { key: 'fgm', label: 'FG Made' },
      { key: 'fga', label: 'FG Att' },
      { key: 'xpm', label: 'XP Made' },
    ],
    DEF: [
      { key: 'gp', label: 'Games' },
      { key: 'def_td', label: 'Def TD' },
      { key: 'def_int', label: 'INT' },
      { key: 'def_sack', label: 'Sacks' },
    ],
  };
  const statSet = STAT_SETS[player.position] || [
    { key: 'gp', label: 'Games' },
    { key: 'pts_ppr', label: 'PPR Pts' },
  ];

  const fmtNum = (val) =>
    val != null ? (Number.isInteger(val) ? val : val.toFixed(1)) : '0';
  const fmtDate = (ms) =>
    ms ? new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  const accent = rosteredBy?.primary || '#1D4ED8';

  // Only show the History tab if the league has past seasons
  const hasHistory = history && history.length > 0;
  const tabs = hasHistory
    ? ['Profile', 'Stats', 'History', 'Transactions']
    : ['Profile', 'Stats', 'Transactions'];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Banner */}
      <div className="relative overflow-hidden" style={{ backgroundColor: accent }}>
        <div className="absolute -right-12 -bottom-24 text-white/10 text-[18rem] font-display font-black tracking-tighter leading-none select-none">
          {player.position || ''}
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <button onClick={() => setPage('Teams')} className="text-white/80 hover:text-white text-sm font-bold mb-4">
            ← Back to Teams
          </button>
          <div className="text-white/80 font-semibold text-sm">
            {player.position}{player.team ? ` · ${player.team}` : ''}
          </div>
          <h1 className="text-4xl sm:text-6xl font-display font-black text-white tracking-tight leading-tight">
            {name}
          </h1>
          {player.injury_status && (
            <span className="inline-block mt-3 px-2.5 py-1 bg-red-600 text-white text-xs font-black rounded uppercase tracking-wider">
              {player.injury_status}
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative ${
                tab === t ? 'text-blue-700' : 'text-gray-600 hover:text-gray-900'
              }`}>
              {t}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" />}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ===== PROFILE TAB ===== */}
        {tab === 'Profile' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-display font-black text-gray-900 mb-4 uppercase tracking-tight">Profile</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {profileFields.map(f => (
                  <div key={f.label}>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{f.label}</div>
                    <div className="text-gray-900 font-bold mt-1">{f.value}</div>
                  </div>
                ))}
              </div>
              {draftInfo && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Drafted</div>
                  <div className="text-gray-900 font-bold mt-1">
                    {draftInfo.season} · Round {draftInfo.round}, Pick {draftInfo.pick}
                    <span className="text-gray-400 font-semibold ml-2 capitalize">({draftInfo.draftType})</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Fantasy Status</div>
                {rosteredBy ? (
                  <>
                    <button
                      onClick={() => { setActiveTeam(rosteredBy.id); setPage('TeamHub'); window.scrollTo(0, 0); }}
                      className="flex items-center gap-3 w-full text-left rounded-lg p-2 -m-2 hover:bg-gray-50 transition-colors"
                    >
                      <span className="w-10 h-10 flex items-center justify-center font-black text-white text-sm rounded shrink-0" style={{ backgroundColor: rosteredBy.primary }}>
                        {rosteredBy.abbrev}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate hover:text-blue-700">{rosteredBy.name}</div>
                        <div className="text-xs text-gray-500 truncate">{rosteredBy.owner}</div>
                      </div>
                    </button>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className={`text-xs font-black ${isStarter ? 'text-blue-700' : 'text-gray-400'}`}>
                        {isStarter ? 'IN STARTING LINEUP' : 'ON BENCH'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">Not rostered in this league (free agent).</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== STATS TAB ===== */}
        {tab === 'Stats' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-display font-black text-gray-900 mb-4 uppercase tracking-tight">
              {season} Season Stats
            </h2>
            {stats.loading ? (
              <div className="flex items-center gap-3 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                Loading stats…
              </div>
            ) : stats.error ? (
              <p className="text-gray-500 text-sm">Stats couldn't be loaded right now.</p>
            ) : !stats.data ? (
              <p className="text-gray-500 text-sm">No stats recorded for this player this season.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 mb-5">
                  <div className="bg-blue-700 text-white rounded-lg px-5 py-3">
                    <div className="text-3xl font-display font-black">{fmtNum(stats.data.pts_ppr)}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-blue-100">Fantasy Pts (PPR)</div>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-5 py-3">
                    <div className="text-3xl font-display font-black text-gray-900">{fmtNum(stats.data.pts_half_ppr)}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Half-PPR</div>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-5 py-3">
                    <div className="text-3xl font-display font-black text-gray-900">{fmtNum(stats.data.pts_std)}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Standard</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {statSet.map(s => (
                    <div key={s.key} className="text-center">
                      <div className="text-3xl font-display font-black text-gray-900">{fmtNum(stats.data[s.key])}</div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== HISTORY TAB ===== */}
        {tab === 'History' && hasHistory && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-display font-black text-gray-900 mb-4 uppercase tracking-tight">
              Past Seasons
            </h2>
            {pastStats.loading ? (
              <div className="flex items-center gap-3 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                Loading past stats…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="text-left py-2 pr-4">Season</th>
                      <th className="text-right py-2 px-3">PPR</th>
                      {statSet.map(s => (
                        <th key={s.key} className="text-right py-2 px-3 whitespace-nowrap">{s.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pastStats.data.map(row => (
                      <tr key={row.season} className="border-b border-gray-100 last:border-0">
                        <td className="py-2.5 pr-4 font-display font-black text-gray-900">{row.season}</td>
                        {row.stats ? (
                          <>
                            <td className="text-right py-2.5 px-3 font-bold text-blue-700">{fmtNum(row.stats.pts_ppr)}</td>
                            {statSet.map(s => (
                              <td key={s.key} className="text-right py-2.5 px-3 text-gray-700">{fmtNum(row.stats[s.key])}</td>
                            ))}
                          </>
                        ) : (
                          <td colSpan={statSet.length + 1} className="text-right py-2.5 px-3 text-gray-400 italic">
                            No stats
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== TRANSACTIONS TAB ===== */}
        {tab === 'Transactions' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-display font-black text-gray-900 mb-4 uppercase tracking-tight">
              League Transactions
            </h2>
            {playerTransactions.length === 0 ? (
              <p className="text-gray-500 text-sm">No transactions involving this player this season.</p>
            ) : (
              <div className="space-y-2">
                {playerTransactions.map(({ txn, addedTo, droppedFrom }) => {
                  const TYPE_LABEL = { trade: 'TRADE', waiver: 'WAIVER', free_agent: 'FREE AGENT' };
                  const TYPE_COLOR = { trade: '#7C3AED', waiver: '#0F766E', free_agent: '#C2410C' };
                  return (
                    <div key={txn.transaction_id} className="flex items-center gap-3 flex-wrap py-2 border-b border-gray-100 last:border-0">
                      <span
                        className="inline-block px-2 py-0.5 text-[10px] font-black text-white rounded shrink-0"
                        style={{ backgroundColor: TYPE_COLOR[txn.type] || '#6B7280' }}
                      >
                        {TYPE_LABEL[txn.type] || (txn.type || 'MOVE').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400 font-semibold">Wk {txn.week} · {fmtDate(txn.status_updated)}</span>
                      {addedTo && (
                        <span className="text-sm text-gray-700">
                          <span className="text-green-600 font-black">+</span> Added to{' '}
                          <button
                            onClick={() => { setActiveTeam(addedTo.id); setPage('TeamHub'); window.scrollTo(0, 0); }}
                            className="font-bold text-gray-900 hover:text-blue-700"
                          >
                            {addedTo.name}
                          </button>
                        </span>
                      )}
                      {droppedFrom && (
                        <span className="text-sm text-gray-700">
                          <span className="text-red-600 font-black">−</span> Dropped from{' '}
                          <button
                            onClick={() => { setActiveTeam(droppedFrom.id); setPage('TeamHub'); window.scrollTo(0, 0); }}
                            className="font-bold text-gray-900 hover:text-blue-700"
                          >
                            {droppedFrom.name}
                          </button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ APP ============
export default function App() {
  const [page, setPage] = useState('Home');
  const [activeTeam, setActiveTeam] = useState(null);
  const [activeArticle, setActiveArticle] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null);
  const data = useLeagueData();

  // Open an article in the full reading view
  const openArticle = (id) => {
    setActiveArticle(id);
    setPage('Article');
    window.scrollTo(0, 0);
  };

  // Open a player's profile page
  const openPlayer = (playerId) => {
    setActivePlayer(playerId);
    setPage('Player');
    window.scrollTo(0, 0);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap');
        .font-display { font-family: 'Inter Tight', system-ui, sans-serif; letter-spacing: -0.02em; }
        .font-body { font-family: 'Source Serif 4', Georgia, serif; }
        body, .font-sans { font-family: 'Inter Tight', system-ui, sans-serif; }
      `}</style>

      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <Navbar currentPage={page} setPage={setPage} />
        {data.usingFallback && !data.loading && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-amber-900 text-sm">
            <strong>Demo Mode</strong> — Sleeper API is blocked in this preview. Run locally to see your real league data.
          </div>
        )}
        {data.loading ? <LoadingScreen /> :
         data.error ? <ErrorScreen error={data.error} /> :
         <>
           {page === 'Home' && <HomePage setPage={setPage} data={data} openArticle={openArticle} />}
           {page === 'Matchups' && <MatchupsPage data={data} />}
           {page === 'Standings' && <StandingsPage data={data} />}
           {page === 'Transactions' && <TransactionsPage data={data} setPage={setPage} setActiveTeam={setActiveTeam} openPlayer={openPlayer} />}
           {page === 'Teams' && <TeamsPage data={data} setPage={setPage} setActiveTeam={setActiveTeam} />}
           {page === 'Players' && <PlayersPage data={data} openPlayer={openPlayer} />}
           {page === 'History' && <HistoryPage data={data} setPage={setPage} setActiveTeam={setActiveTeam} />}
           {page === 'TeamHub' && <TeamHubPage teamId={activeTeam} data={data} setPage={setPage} openPlayer={openPlayer} />}
           {page === 'News' && <NewsPage openArticle={openArticle} />}
           {page === 'Article' && <ArticlePage articleId={activeArticle} data={data} setPage={setPage} setActiveTeam={setActiveTeam} />}
           {page === 'Player' && <PlayerPage playerId={activePlayer} data={data} setPage={setPage} setActiveTeam={setActiveTeam} />}
         </>}
        <footer className="bg-blue-950 text-white py-10 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              {LOGO_URL ? (
                <img src={LOGO_URL} alt="CTESPN Dynasty League" className="w-10 h-10 object-contain rounded bg-white" />
              ) : (
                <div className="w-10 h-10 bg-white flex items-center justify-center font-black text-blue-700 text-xl rounded">C</div>
              )}
              <span className="font-display font-black text-xl tracking-tight">CTESPN Dynasty League</span>
            </div>
            <p className="text-blue-200 text-sm">Powered by Sleeper API · League {LEAGUE_ID}</p>
          </div>
        </footer>
      </div>
    </>
  );
}
