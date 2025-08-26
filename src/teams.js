export function loadTeams() {
    const teamsHtml = teams.map(team => {
        const wins = games.filter(g => g.winner === team.id).reduce((sum, g) => sum + (g.gameValue || 1), 0);
        const losses = games.filter(g => g.loser === team.id).reduce((sum, g) => sum + (g.gameValue || 1), 0);
        const petarolls = games.filter(g => g.winner === team.id && g.isPetaroll).length;
        const gotPetarolled = games.filter(g => g.loser === team.id && g.isPetaroll).length;
        const totalGames = wins + losses;
        const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;

        return `
            <div class="domino-card p-6">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-xl font-bold">${team.player1} & ${team.player2}</h3>
                    <button onclick="deleteTeam('${team.id}')" class="text-red-500 hover:text-red-700">
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
                <div class="mt-3 text-center space-y-1">
                    ${petarolls > 0 ? `<span class="petaroll-badge">${petarolls} PETAROLLS</span>` : ''}
                    ${gotPetarolled > 0 ? `<span class="petarolled-badge">PETAROLLED ${gotPetarolled}x</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('teamsList').innerHTML = teamsHtml || '<div class="col-span-full text-center text-gray-500 dark:text-gray-400">No teams created yet</div>';
}

export function showCreateTeam() {
    document.getElementById('createTeamForm').classList.remove('hidden');
}

export function hideCreateTeam() {
    document.getElementById('createTeamForm').classList.add('hidden');
    document.getElementById('teamPlayer1Input').value = '';
    document.getElementById('teamPlayer2Input').value = '';
}

export function createTeam() {
    const player1Name = document.getElementById('teamPlayer1Input').value.trim();
    const player2Name = document.getElementById('teamPlayer2Input').value.trim();

    if (!player1Name || !player2Name) {
        showToast('Please enter both player names');
        return;
    }

    if (player1Name.toLowerCase() === player2Name.toLowerCase()) {
        showToast('Please enter two different player names');
        return;
    }

    addPlayerIfNotExists(player1Name);
    addPlayerIfNotExists(player2Name);

    findOrCreateTeam(player1Name, player2Name);

    hideCreateTeam();
    loadTeams();
}

export function findOrCreateTeam(player1Name, player2Name) {
    const sortedNames = [player1Name, player2Name].sort();

    let existingTeam = teams.find(team =>
        team.player1 === sortedNames[0] && team.player2 === sortedNames[1]
    );

    if (existingTeam) {
        return existingTeam;
    } else {
        const newTeam = {
            id: Date.now().toString(),
            player1: sortedNames[0],
            player2: sortedNames[1],
        };
        teams.push(newTeam);
        localStorage.setItem('dominoTeams', JSON.stringify(teams));
        return newTeam;
    }
}

export function deleteTeam(teamId) {
    showConfirmModal(
        'Delete Team',
        'Are you sure you want to delete this team? This will not delete the players.',
        () => {
            teams = teams.filter(t => t.id !== teamId);
            localStorage.setItem('dominoTeams', JSON.stringify(teams));
            loadTeams();
            showToast('Team deleted successfully.');
        }
    );
}

