// Scarica calendario e risultati della Serie A da football-data.org e li salva in data/seriea.json.
// Gira su GitHub Actions (vedi .github/workflows/serie-a.yml); la chiave sta nei Secrets del repository.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const KEY = process.env.FOOTBALL_DATA_KEY;
if (!KEY) { console.error('Manca FOOTBALL_DATA_KEY'); process.exit(1); }
const get = async p => {
  const r = await fetch('https://api.football-data.org/v4' + p, { headers: { 'X-Auth-Token': KEY } });
  if (!r.ok) throw new Error(p + ' → ' + r.status + ' ' + await r.text());
  return r.json();
};
const [T, M] = [await get('/competitions/SA/teams'), await get('/competitions/SA/matches')];
const tla = t => t.tla || t.shortName.slice(0, 3).toUpperCase();
const clean = n => String(n).replace(/\s+(FC|AC|SSC|Calcio|1907|1913)$/i, "").trim();
const out = {
  season: T.season ? `${T.season.startDate.slice(0, 4)}/${String(+T.season.startDate.slice(0, 4) + 1).slice(2)}` : '',
  updated: new Date().toISOString(),
  teams: T.teams.map(t => ({ id: String(t.id), name: clean(t.shortName || t.name), short: clean(t.shortName || t.name), tla: tla(t), crest: t.crest })),
  matches: M.matches.map(m => ({
    id: String(m.id), md: m.matchday, utc: m.utcDate, home: String(m.homeTeam.id), away: String(m.awayTeam.id),
    status: m.status, hg: m.score.fullTime.home, ag: m.score.fullTime.away,
  })),
};
// non riscrivere il file se cambia solo l'orario di aggiornamento (evita commit inutili)
const file = 'data/seriea.json';
if (existsSync(file)) {
  const old = JSON.parse(readFileSync(file, 'utf8'));
  if (JSON.stringify({ ...old, updated: 0 }) === JSON.stringify({ ...out, updated: 0 })) { console.log('Nessuna novità'); process.exit(0); }
}
writeFileSync(file, JSON.stringify(out));
console.log(`Salvate ${out.matches.length} partite, ${out.teams.length} squadre`);
