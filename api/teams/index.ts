import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const basePath = process.cwd();
const teamsFile = path.join(basePath, 'database', 'teams.json');

async function ensureTeamsFile() {
  await fs.promises.mkdir(path.dirname(teamsFile), { recursive: true });
  try {
    await fs.promises.access(teamsFile);
  } catch {
    await fs.promises.writeFile(teamsFile, JSON.stringify([]), 'utf8');
  }
}

async function readTeams(): Promise<any[]> {
  await ensureTeamsFile();
  const raw = await fs.promises.readFile(teamsFile, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeTeams(data: any[]) {
  await ensureTeamsFile();
  await fs.promises.writeFile(teamsFile, JSON.stringify(data, null, 2), 'utf8');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const teams = await readTeams();
    res.status(200).json(teams);
    return;
  }

  if (req.method === 'POST') {
    const { player1, player2 } = req.body || {};
    if (typeof player1 !== 'string' || typeof player2 !== 'string') {
      res.status(400).json({ error: 'player1 and player2 are required' });
      return;
    }

    const p1 = player1.trim();
    const p2 = player2.trim();

    if (!p1 || !p2) {
      res.status(400).json({ error: 'player1 and player2 are required' });
      return;
    }

    if (p1.toLowerCase() === p2.toLowerCase()) {
      res.status(400).json({ error: 'players must be different' });
      return;
    }

    const teams = await readTeams();
    // Normalize order for dedupe
    const a = [p1, p2].sort();
    const existing = teams.find(t => t.player1 === a[0] && t.player2 === a[1]);
    if (existing) {
      res.status(200).json(existing);
      return;
    }

    const newTeam = { id: Date.now().toString(), player1: a[0], player2: a[1] };
    teams.push(newTeam);
    await writeTeams(teams);
    res.status(200).json(newTeam);
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
