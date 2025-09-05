import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const basePath = process.cwd();
const playersFile = path.join(basePath, 'database', 'players.json');

async function ensureFiles() {
  await fs.promises.mkdir(path.dirname(playersFile), { recursive: true });
  try {
    await fs.promises.access(playersFile);
  } catch {
    await fs.promises.writeFile(playersFile, JSON.stringify([]), 'utf8');
  }
}

async function readPlayers(): Promise<any[]> {
  await ensureFiles();
  const raw = await fs.promises.readFile(playersFile, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writePlayers(data: any[]) {
  await ensureFiles();
  await fs.promises.writeFile(playersFile, JSON.stringify(data, null, 2), 'utf8');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const players = await readPlayers();
    res.status(200).json(players);
    return;
  }

  if (req.method === 'POST') {
    const { name } = req.body || {};
    if (typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const players = await readPlayers();
    const exists = players.find((p: any) => (p.name || '').toLowerCase() === name.toLowerCase());
    if (exists) {
      res.status(200).json(exists);
      return;
    }

    const newPlayer = { id: Date.now().toString(), name: name.trim() };
    players.push(newPlayer);
    await writePlayers(players);
    res.status(200).json(newPlayer);
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
