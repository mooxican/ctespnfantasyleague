import { useState, useEffect } from 'react';

// ============ SLEEPER LEAGUE CONFIG ============
const LEAGUE_ID = '1312004917103185920';
const SLEEPER_API = 'https://api.sleeper.app/v1';
const SLEEPER_CDN = 'https://sleepercdn.com';

// Distinct color per manager (cycles by roster_id)
const TEAM_COLORS = [
  '#1E40AF', '#B91C1C', '#15803D', '#7C3AED',
  '#BE185D', '#0F766E', '#C2410C', '#4338CA',
  '#DB2777', '#65A30D', '#9333EA', '#0E7490',
];

// Static editorial headlines (Sleeper API doesn't provide news)
const headlines = [
  { id: 1, category: 'BREAKING', title: "Standings shake up after a wild Week 14", excerpt: 'A wild week of fantasy action reshuffles the playoff picture as the season nears its end.' },
  { id: 2, category: 'WAIVERS', title: "Top waiver wire pickups heading into the playoffs" },
  { id: 3, category: 'POWER RANKINGS', title: "Weekly power rankings: Who's the team to beat?" },
  { id: 4, category: 'TRADE', title: "Trade deadline recap: The moves that could swing the title" },
  { id: 5, category: 'MATCHUP', title: "Matchups to watch this week across the league" },
  { id: 6, category: 'INJURY', title: "Injury report: Who's in, who's out for the championship push" },
  { id: 7, category: 'ANALYSIS', title: "Breakout players who carried fantasy rosters this season" },
];

// ============ HELPERS ============
const makeAbbrev = (name) => {
  if (!name) return 'TM';
  const cleaned = String(name).replace(/[^a-zA-Z ]/g, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0] + (words[2]?.[0] || words[1][1] || 'X')).toUpperCase();
  return (cleaned.slice(0, 3) || 'TM').toUpperCase();
};

// ============ LIVE DATA HOOK ============
function useLeagueData() {
  const [data, setData] = useState({ loading: true, error: null, league: null, teams: [], players: {}, currentWeek: 1, matchupsByWeek: {} });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1. League info + users + rosters + NFL state in parallel
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

        // 2. Merge users + rosters into "teams"
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

        // 3. Fetch all weekly matchups up through current week (parallel)
        const weeksToFetch = Array.from({ length: currentWeek }, (_, i) => i + 1);
        const matchupResults = await Promise.all(
          weeksToFetch.map(w => fetch(`${SLEEPER_API}/league/${LEAGUE_ID}/matchups/${w}`).then(r => r.json()))
        );
        const matchupsByWeek = {};
        weeksToFetch.forEach((w, i) => { matchupsByWeek[w] = matchupResults[i]; });

        // 4. Fetch all NFL players (large file ~5MB — cached after first load)
        const playersRes = await fetch(`${SLEEPER_API}/players/nfl`);
        const players = await playersRes.json();

        if (cancelled) return;
        setData({ loading: false, error: null, league, teams, players, currentWeek, matchupsByWeek });
      } catch (err) {
        if (!cancelled) setData(d => ({ ...d, loading: false, error: err.message }));
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
  const links = ['Home', 'Matchups', 'News', 'Teams', 'Standings'];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <div onClick={() => setPage('Home')} className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 bg-blue-700 flex items-center justify-center font-black text-white text-xl tracking-tighter rounded">G</div>
            <span className="text-blue-900 font-display font-black text-2xl tracking-tight hidden sm:block">GRIDIRON</span>
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
function HomePage({ setPage, data }) {
  const { teams, currentWeek, matchupsByWeek } = data;
  const currentMatchups = pairMatchups(matchupsByWeek[currentWeek], teams);
  const featured = headlines[0];
  const newsList = headlines.slice(1);
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
            <div className="p-6">
              <span className="inline-block px-2 py-0.5 bg-blue-700 text-white text-xs font-black tracking-widest rounded">{featured.category}</span>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-gray-900 leading-tight tracking-tight mt-3 mb-2">{featured.title}</h1>
              <p className="text-gray-600 font-body text-lg leading-relaxed">{featured.excerpt}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200">
              <button className="text-sm font-display font-black text-gray-900 border-b-2 border-blue-700 pb-1">NEWS</button>
            </div>
            <div className="divide-y divide-gray-100">
              {newsList.slice(0, 6).map(story => (
                <article key={story.id} className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex gap-3 items-start">
                  <svg className="w-4 h-4 text-gray-400 mt-1 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v2H7V5zm0 4h6v2H7V9zm0 4h4v2H7v-2z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-sm font-bold text-gray-900 leading-snug hover:text-blue-700">{story.title}</h3>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-display font-black text-gray-900 uppercase tracking-tight">Week {currentWeek} Matchups</h2>
            <button onClick={() => setPage('Matchups')} className="text-sm text-blue-700 font-bold hover:text-blue-900">VIEW ALL →</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentMatchups.slice(0, 4).map((m, i) => <MatchupCard key={i} matchup={m} isCurrentWeek={true} />)}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-display font-black text-gray-900 uppercase tracking-tight mb-4">Latest Stories</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsList.slice(0, 6).map(story => (
              <article key={story.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-blue-700 transition-all cursor-pointer">
                <div className="h-40 bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center">
                  <span className="text-white/30 text-6xl font-display font-black tracking-tighter">FFL</span>
                </div>
                <div className="p-5">
                  <span className="text-xs font-black text-blue-700 tracking-widest">{story.category}</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-2 leading-snug">{story.title}</h3>
                </div>
              </article>
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
function TeamHubPage({ teamId, data, setPage }) {
  const [tab, setTab] = useState('Overview');
  const { teams, players, matchupsByWeek, currentWeek } = data;
  const team = teams.find(t => t.id === teamId);
  if (!team) return null;

  const tabs = ['Overview', 'Roster', 'Schedule'];

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
        {tab === 'Roster' && <TeamRoster team={team} players={players} />}
        {tab === 'Schedule' && <TeamSchedule team={team} teams={teams} matchupsByWeek={matchupsByWeek} currentWeek={currentWeek} />}
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

function TeamRoster({ team, players }) {
  const starters = new Set(team.starters || []);
  const rosterPlayers = (team.playerIds || []).map(pid => {
    const p = players[pid];
    return p ? {
      id: pid,
      name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || pid,
      pos: p.position || '—',
      team: p.team || 'FA',
      age: p.age || '—',
      isStarter: starters.has(pid),
    } : { id: pid, name: pid, pos: '—', team: 'FA', age: '—', isStarter: starters.has(pid) };
  }).sort((a, b) => (b.isStarter - a.isStarter) || a.pos.localeCompare(b.pos));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-display font-black text-gray-900 uppercase tracking-tight">Roster ({rosterPlayers.length})</h2>
      </div>
      <div className="grid grid-cols-12 text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-3 border-b border-gray-200 bg-gray-50">
        <span className="col-span-1">Pos</span>
        <span className="col-span-6">Player</span>
        <span className="col-span-2">NFL</span>
        <span className="col-span-2">Age</span>
        <span className="col-span-1 text-right">Role</span>
      </div>
      {rosterPlayers.map((p) => (
        <div key={p.id} className="grid grid-cols-12 items-center px-6 py-3 border-b border-gray-100 last:border-0 hover:bg-blue-50/50 transition-colors">
          <span className="col-span-1">
            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded">{p.pos}</span>
          </span>
          <span className="col-span-6 font-bold text-gray-900 truncate">{p.name}</span>
          <span className="col-span-2 text-gray-700 text-sm">{p.team}</span>
          <span className="col-span-2 text-gray-700">{p.age}</span>
          <span className="col-span-1 text-right">
            {p.isStarter ? (
              <span className="text-xs font-black text-blue-700">START</span>
            ) : (
              <span className="text-xs text-gray-400 font-bold">BENCH</span>
            )}
          </span>
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

// ============ NEWS PAGE ============
function NewsPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-4xl sm:text-5xl font-display font-black text-gray-900 tracking-tight mb-2">NEWS</h1>
        <p className="text-gray-600 mb-8">League news and analysis.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {headlines.map(story => (
            <article key={story.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-blue-700 transition-all cursor-pointer">
              <div className="h-40 bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center">
                <span className="text-white/30 text-6xl font-display font-black tracking-tighter">FFL</span>
              </div>
              <div className="p-5">
                <span className="text-xs font-black text-blue-700 tracking-widest">{story.category}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-2 leading-snug">{story.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ APP ============
export default function App() {
  const [page, setPage] = useState('Home');
  const [activeTeam, setActiveTeam] = useState(null);
  const data = useLeagueData();

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
        {data.loading ? <LoadingScreen /> :
         data.error ? <ErrorScreen error={data.error} /> :
         <>
           {page === 'Home' && <HomePage setPage={setPage} data={data} />}
           {page === 'Matchups' && <MatchupsPage data={data} />}
           {page === 'Standings' && <StandingsPage data={data} />}
           {page === 'Teams' && <TeamsPage data={data} setPage={setPage} setActiveTeam={setActiveTeam} />}
           {page === 'TeamHub' && <TeamHubPage teamId={activeTeam} data={data} setPage={setPage} />}
           {page === 'News' && <NewsPage />}
         </>}
        <footer className="bg-blue-950 text-white py-10 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white flex items-center justify-center font-black text-blue-700 text-xl rounded">G</div>
              <span className="font-display font-black text-xl tracking-tight">GRIDIRON</span>
            </div>
            <p className="text-blue-200 text-sm">Powered by Sleeper API · League {LEAGUE_ID}</p>
          </div>
        </footer>
      </div>
    </>
  );
}
