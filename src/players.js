export function loadPlayers() {
    const playersHtml = players.map(player => {
        const wins = games.filter(g => {
            if (g.gameMode === 'single') return g.winner === player.name;
            const team = teams.find(t => t.id === g.winner);
            return team && (team.player1 === player.name || team.player2 === player.name);
        }).reduce((sum, g) => sum + (g.gameValue || 1), 0);

        const losses = games.filter(g => {
            if (g.gameMode === 'single') return g.loser === player.name;
            const team = teams.find(t => t.id === g.loser);
            return team && (team.player1 === player.name || team.player2 === player.name);
        }).reduce((sum, g) => sum + (g.gameValue || 1), 0);

        const totalGames = wins + losses;
        const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;

        return `
            <div class="domino-card p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">${player.name}</h3>
                    <button onclick="deletePlayer('${player.id}')" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div class="text-2xl font-bold text-green-600">${wins}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Wins</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-red-600">${losses}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Losses</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-blue-600">${winRate}%</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Win Rate</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('playersList').innerHTML = playersHtml || '<div class="col-span-full text-center text-gray-500 dark:text-gray-400">No players added yet.</div>';
}

export function showCreatePlayerForm() {
    document.getElementById('createPlayerForm').classList.remove('hidden');
}

export function hideCreatePlayerForm() {
    document.getElementById('createPlayerForm').classList.add('hidden');
    document.getElementById('newPlayerName').value = '';
}

export function createPlayer() {
    const playerName = document.getElementById('newPlayerName').value.trim();
    if (!playerName) {
        showToast('Please enter a player name');
        return;
    }

    addPlayerIfNotExists(playerName);
    hideCreatePlayerForm();
    loadPlayers();
}

export function addPlayerIfNotExists(playerName) {
    if (!playerName) return;
    const nameExists = players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (!nameExists) {
        const newPlayer = { id: Date.now().toString(), name: playerName };
        players.push(newPlayer);
        localStorage.setItem('dominoPlayers', JSON.stringify(players));
    }
}

export function deletePlayer(playerId) {
    const playerToDelete = players.find(p => p.id === playerId);
    if (!playerToDelete) return;

    showConfirmModal(
        'Delete Player',
        `Are you sure you want to delete ${playerToDelete.name}? This will also remove them from any teams.`,
        () => {
            const isPlayerInTeam = teams.some(team => team.player1 === playerToDelete.name || team.player2 === playerToDelete.name);
            if (isPlayerInTeam) {
                teams = teams.filter(team => team.player1 !== playerToDelete.name && team.player2 !== playerToDelete.name);
                localStorage.setItem('dominoTeams', JSON.stringify(teams));
            }

            players = players.filter(p => p.id !== playerId);
            localStorage.setItem('dominoPlayers', JSON.stringify(players));
            loadPlayers();
            if (currentSection === 'teams') loadTeams();
            showToast(`${playerToDelete.name} has been deleted.`);
        }
    );
}

