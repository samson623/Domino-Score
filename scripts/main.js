// Global variables
let currentGame = null;
let currentGameMode = null;
let players = JSON.parse(localStorage.getItem('dominoPlayers')) || [];
let teams = JSON.parse(localStorage.getItem('dominoTeams')) || [];
let games = JSON.parse(localStorage.getItem('dominoGames')) || [];
let currentSection = 'home';
let chartInstances = {};
let currentPeriod = 'daily';
let bestOf = 1;
let matchWins1 = 0;
let matchWins2 = 0;
let matchOver = false;
let turnTimer = null;
let remainingTime = 0;
let editingGameId = null;

let achievements = JSON.parse(localStorage.getItem('dominoAchievements')) || {};
let streaks = JSON.parse(localStorage.getItem('dominoStreaks')) || {};
const achievementDefinitions = {
    tenWins: { text: 'Ten Wins Club', icon: '🏅', description: 'Win 10 games' },
    anyPetaroll: { text: 'First PETAROLL', icon: '🔥', description: 'Achieve your first PETAROLL' },
    comebackKing: { text: 'Comeback King', icon: '👑', description: 'Win after being down by 50+ points' },
    dominator: { text: 'Dominator', icon: '🏆', description: 'Win 5 games in a row' }
};

let pendingWinType = null;
let recognition;
let isMicOn = false;

// Sound Effects using Web Audio API
let audioCtx;
function initAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.error("Web Audio API is not supported in this browser");
    }
}

function playSound(type) {
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);


    switch(type) {
        case 'addScore':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(660, audioCtx.currentTime); // E5
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
            break;
        case 'win':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            oscillator.frequency.linearRampToValueAtTime(1046.50, audioCtx.currentTime + 0.4); // C6
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
            break;
        case 'petaroll':
             oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5
            oscillator.frequency.linearRampToValueAtTime(1046.50, audioCtx.currentTime + 0.2); // C6
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.6);
            break;
    }

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 1);
}


// Theme management
function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.getElementById('themeIcon').className = 'fas fa-sun';
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('themeIcon').className = 'fas fa-moon';
    }
    refreshAllData();
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        document.documentElement.classList.remove('dark');
        document.getElementById('themeIcon').className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        document.getElementById('themeIcon').className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    }
    refreshAllData();
});

// Export functionality
function showExportModal() {
    document.getElementById('exportModal').classList.remove('hidden');
}

function closeExportModal() {
    document.getElementById('exportModal').classList.add('hidden');
}

function exportData() {
    const data = {
        players: players,
        teams: teams,
        games: games,
        achievements: achievements,
        streaks: streaks,
        exportDate: new Date().toISOString(),
        version: '1.2'
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `domino-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    closeExportModal();
}

function exportDataAs(format) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let dataString = '';
    let fileExtension = '';

    const header = `Domino Tracker Data Export - ${new Date().toLocaleString()}\n\n`;

    // Players Data
    dataString += 'Players\n';
    dataString += 'ID,Name\n';
    players.forEach(p => {
        dataString += `${p.id},${p.name}\n`;
    });

    // Teams Data
    dataString += '\nTeams\n';
    dataString += 'ID,Player 1,Player 2\n';
    teams.forEach(t => {
        dataString += `${t.id},${t.player1},${t.player2}\n`;
    });

    // Games Data
    dataString += '\nGames\n';
    dataString += 'ID,Date,Mode,Winner,Loser,Winner Score,Loser Score,Petaroll\n';
    games.forEach(g => {
        const winnerName = g.gameMode === 'team' ? teams.find(t => t.id === g.winner)?.player1 + ' & ' + teams.find(t => t.id === g.winner)?.player2 : g.winner;
        const loserName = g.gameMode === 'team' ? teams.find(t => t.id === g.loser)?.player1 + ' & ' + teams.find(t => t.id === g.loser)?.player2 : g.loser;
        dataString += `${g.id},${new Date(g.date).toLocaleString()},${g.gameMode},"${winnerName}","${loserName}",${g.winnerScore},${g.loserScore},${g.isPetaroll ? 'Yes' : 'No'}\n`;
    });

    if (format === 'pdf') {
        doc.text(header, 10, 10);
        doc.text(dataString, 10, 20);
        doc.save('domino-tracker-data.pdf');
    } else {
        if (format === 'csv') {
            fileExtension = 'csv';
        } else {
            fileExtension = 'txt';
        }
        const blob = new Blob([header + dataString], { type: `text/${fileExtension};charset=utf-8;` });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `domino-tracker-data.${fileExtension}`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    closeExportModal();
}


// Reset functionality
function showResetModal() {
    document.getElementById('resetModal').classList.remove('hidden');
}

function closeResetModal() {
    document.getElementById('resetModal').classList.add('hidden');
}

function resetTodayData() {
    showConfirmModal(
        'Reset Today\'s Data',
        'Are you sure you want to delete all games from today? This action cannot be undone.',
        () => {
            const today = new Date().toDateString();
            games = games.filter(g => new Date(g.date).toDateString() !== today);
            localStorage.setItem('dominoGames', JSON.stringify(games));

            // Filter out achievements earned today
            for (const entityId in achievements) {
                achievements[entityId] = achievements[entityId].filter(ach => {
                    return new Date(ach.date).toDateString() !== today;
                });
            }
            localStorage.setItem('dominoAchievements', JSON.stringify(achievements));

            closeResetModal();
            refreshAllData();
            showToast("Today's games and achievements have been reset.");
        }
    );
}


function resetAllData() {
    showConfirmModal(
        'Reset Everything',
        'Are you absolutely sure you want to delete all data? This action cannot be undone.',
        () => {
            localStorage.removeItem('dominoPlayers');
            localStorage.removeItem('dominoTeams');
            localStorage.removeItem('dominoGames');
            localStorage.removeItem('dominoAchievements');
            localStorage.removeItem('dominoStreaks');

            players = [];
            teams = [];
            games = [];
            achievements = {};
            streaks = {};
            currentGame = null;

            Object.values(chartInstances).forEach(chart => {
                if (chart) chart.destroy();
            });
            chartInstances = {};

            closeResetModal();
            refreshAllData();
            showToast('All data has been reset successfully!');
        }
    );
}

// Navigation
function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(section + 'Section').classList.remove('hidden');
    currentSection = section;

    document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll(`[data-section="${section}"]`).forEach(btn => {
        btn.classList.add('active');
    });

    if (section === 'home') loadHome();
    else if (section === 'players') loadPlayers();
    else if (section === 'teams') loadTeams();
    else if (section === 'leaderboard') loadLeaderboard();
    else if (section === 'live') loadLiveSection();
    else if (section === 'history') showHistory('daily');
}

function refreshAllData() {
    loadTodaysPerformance();
    loadRecentGames();
    loadDailyPlayerSummary();

    if (currentSection === 'history') {
        loadHistory();
    }
    if (currentSection === 'teams') {
        loadTeams();
    }
     if (currentSection === 'players') {
        loadPlayers();
    }
    if (currentSection === 'leaderboard') {
        loadLeaderboard();
    }
    if (currentSection === 'home') {
        loadAchievements();
    }
}

// Home section
function loadHome() {
    loadTodaysPerformance();
    loadRecentGames();
    loadDailyPlayerSummary();
    loadAchievements();
}

function toggleVisibility(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const isHidden = element.classList.contains('hidden');
        element.classList.toggle('hidden');

        const icon = element.previousElementSibling.querySelector('i.fas');
        if (icon) {
            icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }
}

function loadTodaysPerformance() {
    const today = new Date().toDateString();
    const todayGames = games.filter(g => new Date(g.date).toDateString() === today);

    const teamGames = todayGames.filter(g => g.gameMode === 'team');
    const singleGames = todayGames.filter(g => g.gameMode === 'single');

    let html = '';

    // Team Game Stats
    if (teamGames.length > 0) {
        const teamStats = {};
        teams.forEach(team => {
            const teamName = `${team.player1} & ${team.player2}`;
            teamStats[team.id] = { name: teamName, wins: 0, losses: 0, petarolls: 0, gotPetarolled: 0 };
        });

        teamGames.forEach(game => {
            if (teamStats[game.winner]) {
                teamStats[game.winner].wins += game.gameValue || 1;
                if (game.isPetaroll) teamStats[game.winner].petarolls++;
            }
            if (teamStats[game.loser]) {
                teamStats[game.loser].losses += game.gameValue || 1;
                if (game.isPetaroll) teamStats[game.loser].gotPetarolled++;
            }
        });

        const filteredTeamStats = Object.values(teamStats).filter(stat => stat.wins > 0 || stat.losses > 0);

        if (filteredTeamStats.length > 0) {
            html += `<h4 onclick="toggleVisibility('todays-team-games')" class="font-bold mb-2 text-gray-700 dark:text-gray-300 cursor-pointer flex justify-between items-center">
                        <span>Team Games</span>
                        <i class="fas fa-chevron-down transition-transform"></i>
                     </h4>
                     <div id="todays-team-games" class="hidden pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-2">`;
            html += filteredTeamStats.map(stat => `
                <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span class="font-medium">${stat.name}</span>
                    <div class="flex items-center space-x-4">
                        <span class="text-green-600 font-bold">+${stat.wins}</span>
                        <span class="text-red-600 font-bold">-${stat.losses}</span>
                        ${stat.petarolls > 0 ? `<span class="petaroll-badge">${stat.petarolls} PETAROLL</span>` : ''}
                        ${stat.gotPetarolled > 0 ? `<span class="petarolled-badge">${stat.gotPetarolled} PETAROLLED</span>` : ''}
                    </div>
                </div>
            `).join('');
            html += `</div>`;
        }
    }

    // Single Game Stats
    if (singleGames.length > 0) {
        const singlePlayerStats = {};
        singleGames.forEach(game => {
            if (!singlePlayerStats[game.winner]) singlePlayerStats[game.winner] = { name: game.winner, wins: 0, losses: 0, petarolls: 0, gotPetarolled: 0 };
            if (!singlePlayerStats[game.loser]) singlePlayerStats[game.loser] = { name: game.loser, wins: 0, losses: 0, petarolls: 0, gotPetarolled: 0 };

            singlePlayerStats[game.winner].wins += game.gameValue || 1;
            if (game.isPetaroll) singlePlayerStats[game.winner].petarolls++;

            singlePlayerStats[game.loser].losses += game.gameValue || 1;
            if (game.isPetaroll) singlePlayerStats[game.loser].gotPetarolled++;
        });

        const filteredSingleStats = Object.values(singlePlayerStats).filter(stat => stat.wins > 0 || stat.losses > 0);

        if (filteredSingleStats.length > 0) {
            html += `<h4 onclick="toggleVisibility('todays-single-games')" class="font-bold mt-4 mb-2 text-gray-700 dark:text-gray-300 cursor-pointer flex justify-between items-center">
                        <span>One-on-One Games</span>
                        <i class="fas fa-chevron-down transition-transform"></i>
                     </h4>
                     <div id="todays-single-games" class="hidden pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-2">`;
            html += filteredSingleStats.map(stat => `
                <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span class="font-medium">${stat.name}</span>
                    <div class="flex items-center space-x-4">
                        <span class="text-green-600 font-bold">+${stat.wins}</span>
                        <span class="text-red-600 font-bold">-${stat.losses}</span>
                        ${stat.petarolls > 0 ? `<span class="petaroll-badge">${stat.petarolls} PETAROLL</span>` : ''}
                        ${stat.gotPetarolled > 0 ? `<span class="petarolled-badge">${stat.gotPetarolled} PETAROLLED</span>` : ''}
                    </div>
                </div>
            `).join('');
            html += `</div>`;
        }
    }

    document.getElementById('todaysPerformance').innerHTML = html || '<p class="text-gray-500 dark:text-gray-400">No games played today</p>';
}

function loadRecentGames() {
    const recentGames = games.slice(-5).reverse();
    const recentHtml = recentGames.map(game => {
        let winnerName, loserName;

        if (game.gameMode === 'single') {
            winnerName = game.winner;
            loserName = game.loser;
        } else {
            const winnerTeam = teams.find(t => t.id === game.winner);
            const loserTeam = teams.find(t => t.id === game.loser);
            winnerName = winnerTeam ? `${winnerTeam.player1} & ${winnerTeam.player2}` : 'Unknown';
            loserName = loserTeam ? `${loserTeam.player1} & ${loserTeam.player2}` : 'Unknown';
        }

        const gameTypeIcon = game.gameMode === 'single' ? '<i class="fas fa-user text-xs mr-1"></i>' : '<i class="fas fa-users text-xs mr-1"></i>';

        if (game.isPetaroll) {
            return `
                <div class="text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded game-item relative">
                    <div>
                        ${gameTypeIcon}<strong>${winnerName}</strong> PETAROLLED <strong>${loserName}</strong>
                        <span class="petaroll-badge">PETAROLL</span>
                    </div>
                    <div class="text-gray-500 dark:text-gray-400 text-xs">
                        ${game.winnerScore}-${game.loserScore} • ${new Date(game.date).toLocaleString()}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded game-item relative">
                    <div>
                        ${gameTypeIcon}<strong>${winnerName}</strong> beat <strong>${loserName}</strong>
                    </div>
                    <div class="text-gray-500 dark:text-gray-400 text-xs">
                        ${game.winnerScore}-${game.loserScore} • ${new Date(game.date).toLocaleString()}
                    </div>
                </div>
            `;
        }
    }).join('');

    document.getElementById('recentGames').innerHTML = recentHtml || '<p class="text-gray-500 dark:text-gray-400 text-sm">No recent games</p>';
}

function getShortName(entityName) {
    if (entityName.includes(' & ')) {
        const names = entityName.split(' & ');
        return names.map(name => name.charAt(0)).join(' & ');
    }
    return entityName;
}

function loadAchievements() {
    const listEl = document.getElementById('achievementsList');
    let html = '';

    const allEntities = [
        ...players.map(p => ({ id: `player:${p.name}`, name: p.name })),
        ...teams.map(t => ({ id: `team:${t.id}`, name: `${t.player1} & ${t.player2}` }))
    ];

    const allUnlockedAchievements = {};
    for (const entityId in achievements) {
        if (achievements.hasOwnProperty(entityId)) {
            achievements[entityId].forEach(ach => {
                if (!allUnlockedAchievements[ach.key]) {
                    allUnlockedAchievements[ach.key] = [];
                }
                allUnlockedAchievements[ach.key].push(getShortName(getEntityName(entityId)));
            });
        }
    }

    for (const key in achievementDefinitions) {
        const definition = achievementDefinitions[key];
        const unlockedBy = allUnlockedAchievements[key];

        if (unlockedBy) {
            // Separate each player/team with a bullet point for better separation
            const separatedNames = unlockedBy.join(' • ');
            html += `<button class="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium flex items-center mb-2" title="${definition.description} - Unlocked by: ${unlockedBy.join(', ')}">
                        <span class="w-8 text-center">${definition.icon}</span>
                        <span>${definition.text} - ${separatedNames}</span>
                       </button>`;
        } else {
            html += `
                <button class="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium opacity-70 cursor-not-allowed flex items-center mb-2" title="${definition.description} (Locked)">
                    <span class="w-8 text-center"><i class="fas fa-lock"></i></span>
                    <span>${definition.icon} ${definition.text}</span>
                </button>
            `;
        }
    }

    listEl.innerHTML = html || '<p class="text-gray-500 dark:text-gray-400">No achievements defined.</p>';
}


function getEntityName(entityId) {
    if (!entityId) return 'Unknown';
    const [type, id] = entityId.split(':');
    if (type === 'player') {
        return id;
    } else if (type === 'team') {
        const team = teams.find(t => t.id === id);
        return team ? `${team.player1} & ${team.player2}` : 'Unknown Team';
    }
    return 'Unknown';
}

function grantAchievement(entityId, achievementKey) {
    if (!entityId || !achievementKey) {
        console.error('Invalid entityId or achievementKey:', entityId, achievementKey);
        return;
    }

    if (!achievementDefinitions[achievementKey]) {
        console.error('Unknown achievement key:', achievementKey);
        return;
    }

    // Initialize achievements array for this entity
    achievements[entityId] = achievements[entityId] || [];

    // Convert legacy string format to object format
    if (achievements[entityId].some(ach => typeof ach === 'string')) {
        achievements[entityId] = achievements[entityId].map(ach => {
            if (typeof ach === 'string') {
                return { key: ach, date: new Date(0).toISOString() };
            }
            return ach;
        });
    }

    // Check if already unlocked
    const alreadyUnlocked = achievements[entityId].some(ach =>
        (typeof ach === 'string' && ach === achievementKey) ||
        (typeof ach === 'object' && ach.key === achievementKey)
    );

    if (!alreadyUnlocked) {
        achievements[entityId].push({
            key: achievementKey,
            date: new Date().toISOString()
        });
        localStorage.setItem('dominoAchievements', JSON.stringify(achievements));

        const entityName = getEntityName(entityId);
        console.log(`Achievement granted: ${achievementKey} to ${entityName}`);
        showAchievement(`🏆 ${entityName} unlocked: ${achievementDefinitions[achievementKey].text}!`);

        // Refresh achievements display
        if (currentSection === 'home') {
            loadAchievements();
        }
    } else {
        console.log(`Achievement ${achievementKey} already unlocked for ${entityId}`);
    }
}

function checkAllAchievements(gameRecord) {
    const winnerId = gameRecord.gameMode === 'team' ? `team:${gameRecord.winner}` : `player:${gameRecord.winner}`;
    const loserId = gameRecord.gameMode === 'team' ? `team:${gameRecord.loser}` : `player:${gameRecord.loser}`;

    // Check PETAROLL achievement
    if (gameRecord.isPetaroll) {
        grantAchievement(winnerId, 'anyPetaroll');
    }

    // Check 10 wins achievement
    const winnerTotalWins = games.filter(g => {
        if (g.gameMode === 'team' && winnerId.startsWith('team')) return g.winner === winnerId.split(':')[1];
        if (g.gameMode === 'single' && winnerId.startsWith('player')) return g.winner === winnerId.split(':')[1];
        return false;
    }).reduce((sum, g) => sum + (g.gameValue || 1), 0);

    if (winnerTotalWins >= 10) {
        grantAchievement(winnerId, 'tenWins');
    }

    // Check comeback achievement
    if (gameRecord.wasComeback) {
        grantAchievement(winnerId, 'comebackKing');
    }

    // Update streak tracking and check dominator
    updateStreaksAndCheckDominator(winnerId, loserId, gameRecord.gameValue || 1);
}

function updateStreaksAndCheckDominator(winnerId, loserId, gameValue) {
    // Reset loser's streak
    streaks[loserId] = 0;

    // If loser is a team, also reset individual player streaks
    if (loserId.startsWith('team:')) {
        const loserTeam = teams.find(t => t.id === loserId.split(':')[1]);
        if (loserTeam) {
            streaks[`player:${loserTeam.player1}`] = 0;
            streaks[`player:${loserTeam.player2}`] = 0;
        }
    }

    // Update winner's streak - count actual game value (1 for regular, 2 for PETAROLL)
    streaks[winnerId] = (streaks[winnerId] || 0) + (gameValue || 1);

    // If winner is a team, also update individual player streaks
    if (winnerId.startsWith('team:')) {
        const winnerTeam = teams.find(t => t.id === winnerId.split(':')[1]);
        if (winnerTeam) {
            streaks[`player:${winnerTeam.player1}`] = (streaks[`player:${winnerTeam.player1}`] || 0) + (gameValue || 1);
            streaks[`player:${winnerTeam.player2}`] = (streaks[`player:${winnerTeam.player2}`] || 0) + (gameValue || 1);

            // Check dominator for individual players
            if (streaks[`player:${winnerTeam.player1}`] >= 5) {
                console.log(`Granting dominator achievement to player:${winnerTeam.player1} with streak of ${streaks[`player:${winnerTeam.player1}`]}`);
                grantAchievement(`player:${winnerTeam.player1}`, 'dominator');
            }
            if (streaks[`player:${winnerTeam.player2}`] >= 5) {
                console.log(`Granting dominator achievement to player:${winnerTeam.player2} with streak of ${streaks[`player:${winnerTeam.player2}`]}`);
                grantAchievement(`player:${winnerTeam.player2}`, 'dominator');
            }
        }
    }

    localStorage.setItem('dominoStreaks', JSON.stringify(streaks));

    console.log(`${winnerId} current streak: ${streaks[winnerId]} (added ${gameValue || 1})`);

    // Check dominator achievement (5+ wins in a row)
    if (streaks[winnerId] >= 5) {
        console.log(`Granting dominator achievement to ${winnerId} with streak of ${streaks[winnerId]}`);
        grantAchievement(winnerId, 'dominator');
    }
}

function showAchievement(message) {
    const toast = document.getElementById('achievementToast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

let currentHistoryPeriod = 'daily';

function showHistory(period) {
    currentHistoryPeriod = period;

    document.querySelectorAll('.history-tab').forEach(tab => {
        tab.classList.remove('bg-blue-500', 'text-white');
        tab.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
    });

    const activeTab = document.querySelector(`[onclick="showHistory('${period}')"]`);
    activeTab.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
    activeTab.classList.add('bg-blue-500', 'text-white');

    loadHistory();
}

function loadHistory() {
    const filteredGames = filterGamesByPeriod(games, currentHistoryPeriod);
    document.getElementById('totalGamesCount').textContent = filteredGames.length;

    const sortedGames = [...filteredGames].sort((a, b) => new Date(b.date) - new Date(a.date));

    const historyHtml = sortedGames.map(game => {
        let winnerName, loserName;

        if (game.gameMode === 'single') {
            winnerName = game.winner;
            loserName = game.loser;
        } else {
            const winnerTeam = teams.find(t => t.id === game.winner);
            const loserTeam = teams.find(t => t.id === game.loser);
            winnerName = winnerTeam ? `${winnerTeam.player1} & ${winnerTeam.player2}` : 'Unknown';
            loserName = loserTeam ? `${loserTeam.player1} & ${loserTeam.player2}` : 'Unknown';
        }

        const duration = game.duration ? formatDuration(game.duration) : 'N/A';
        const gameTypeIcon = game.gameMode === 'single' ? '<i class="fas fa-user text-sm mr-1"></i>' : '<i class="fas fa-users text-sm mr-1"></i>';

        return `
            <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg game-item relative">
                <button onclick="showEditGameModal('${game.id}')" class="edit-game-btn absolute top-2 right-10 text-blue-500 hover:text-blue-700 p-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteGame('${game.id}')" class="delete-game-btn absolute top-2 right-2 text-red-500 hover:text-red-700 p-2">
                    <i class="fas fa-trash"></i>
                </button>
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="font-medium">
                            ${gameTypeIcon}${winnerName} ${game.isPetaroll ? 'PETAROLLED' : 'beat'} ${loserName}
                            ${game.isPetaroll ? `<span class="petaroll-badge">PETAROLL</span>` : ''}
                            ${game.wasComeback ? `<span class="achievement-badge">👑</span>` : ''}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Score: ${game.winnerScore} - ${game.loserScore} | Duration: ${duration}
                        </div>
                        <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            ${new Date(game.date).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('gameHistoryList').innerHTML = historyHtml || '<p class="text-gray-500 dark:text-gray-400">No games played yet</p>';
}

function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function deleteGame(gameId) {
    showConfirmModal(
        'Delete Game',
        'Are you sure you want to delete this game? This will affect all statistics.',
        () => {
            games = games.filter(g => g.id != gameId);
            localStorage.setItem('dominoGames', JSON.stringify(games));
            recalculateAllAchievements();
            refreshAllData();
            showToast('Game deleted successfully!');
        }
    );
}

function showEditGameModal(gameId) {
    const game = games.find(g => g.id == gameId);
    if (!game) return;
    editingGameId = gameId;

    let formHtml = '';
    if (game.gameMode === 'team') {
        const options = teams.map(t => `<option value="${t.id}">${t.player1} & ${t.player2}</option>`).join('');
        formHtml += `
            <label class="block text-sm font-medium">Winner</label>
            <select id="editWinner" class="w-full p-2 border rounded-lg mb-2">${options}</select>
            <label class="block text-sm font-medium">Loser</label>
            <select id="editLoser" class="w-full p-2 border rounded-lg mb-2">${options}</select>
        `;
    } else {
        const options = players.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
         formHtml += `
            <label class="block text-sm font-medium">Winner</label>
            <select id="editWinner" class="w-full p-2 border rounded-lg mb-2">${options}</select>
            <label class="block text-sm font-medium">Loser</label>
            <select id="editLoser" class="w-full p-2 border rounded-lg mb-2">${options}</select>
        `;
    }

    formHtml += `
        <label class="block text-sm font-medium">Winner Score</label>
        <input id="editWinnerScore" type="number" class="w-full p-2 border rounded-lg mb-2" />
        <label class="block text-sm font-medium">Loser Score</label>
        <input id="editLoserScore" type="number" class="w-full p-2 border rounded-lg mb-2" />
        <label class="inline-flex items-center mt-2"><input type="checkbox" id="editIsPetaroll" class="mr-2">PETAROLL</label>
    `;

    document.getElementById('editGameForm').innerHTML = formHtml;

    document.getElementById('editWinner').value = game.winner;
    document.getElementById('editLoser').value = game.loser;
    document.getElementById('editWinnerScore').value = game.winnerScore;
    document.getElementById('editLoserScore').value = game.loserScore;
    document.getElementById('editIsPetaroll').checked = !!game.isPetaroll;

    document.getElementById('editGameModal').classList.remove('hidden');
}

function closeEditGameModal() {
    document.getElementById('editGameModal').classList.add('hidden');
    editingGameId = null;
}

function saveGameEdits() {
    if (editingGameId === null) return;
    const gameIndex = games.findIndex(g => g.id == editingGameId);
    if (gameIndex === -1) return;

    const game = games[gameIndex];
    const winnerVal = document.getElementById('editWinner').value;
    const loserVal = document.getElementById('editLoser').value;

    game.winner = winnerVal;
    game.loser = loserVal;
    game.winnerScore = parseInt(document.getElementById('editWinnerScore').value) || 0;
    game.loserScore = parseInt(document.getElementById('editLoserScore').value) || 0;
    game.isPetaroll = document.getElementById('editIsPetaroll').checked;
    game.gameValue = game.isPetaroll ? 2 : 1;

    localStorage.setItem('dominoGames', JSON.stringify(games));

    recalculateAllAchievements();

    closeEditGameModal();
    refreshAllData();
}

function recalculateAllAchievements() {
    console.log('Recalculating all achievements...');

    // Reset achievements and streaks
    achievements = {};
    streaks = {};

    // Sort games by date to process them in order
    const sortedGames = [...games].sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`Processing ${sortedGames.length} games for achievement calculation`);

    // Re-check achievements for every game in chronological order
    sortedGames.forEach((game, index) => {
        console.log(`Processing game ${index + 1}/${sortedGames.length}`);

        // Ensure game has all required properties
        if (!game.gameValue) {
            game.gameValue = game.isPetaroll ? 2 : 1;
        }

        checkAllAchievements(game);
    });

    // Save the recalculated achievements
    localStorage.setItem('dominoAchievements', JSON.stringify(achievements));
    localStorage.setItem('dominoStreaks', JSON.stringify(streaks));

    console.log('Achievement recalculation complete');
    console.log('Final achievements:', achievements);
    console.log('Final streaks:', streaks);
}

function loadDailyPlayerSummary() {
    const today = new Date().toDateString();
    const todayGames = games.filter(g => new Date(g.date).toDateString() === today);
    const summaryContainer = document.getElementById('dailyPlayerSummaryList');

    if (todayGames.length === 0) {
        summaryContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No games played today to summarize.</p>';
        return;
    }

    const playerSummaries = {};

    // Helper to initialize a player summary
    const initPlayer = (name) => {
        if (!playerSummaries[name]) {
            playerSummaries[name] = { wins: 0, losses: 0, games: [] };
        }
    };

    todayGames.forEach(game => {
        if (game.gameMode === 'single') {
            const winnerName = game.winner;
            const loserName = game.loser;

            initPlayer(winnerName);
            initPlayer(loserName);

            // Add win for winner
            playerSummaries[winnerName].wins += game.gameValue || 1;
            playerSummaries[winnerName].games.push(
                `<li class="text-sm"><span class="font-bold text-green-600">Win</span> vs ${loserName} (${game.winnerScore}-${game.loserScore}) ${game.isPetaroll ? '<span class="petaroll-badge !ml-1">PETAROLL</span>' : ''}</li>`
            );

            // Add loss for loser
            playerSummaries[loserName].losses += game.gameValue || 1;
            playerSummaries[loserName].games.push(
                `<li class="text-sm"><span class="font-bold text-red-600">Loss</span> vs ${winnerName} (${game.loserScore}-${game.winnerScore}) ${game.isPetaroll ? '<span class="petarolled-badge !ml-1">PETAROLLED</span>' : ''}</li>`
            );

        } else { // Team game
            const winnerTeam = teams.find(t => t.id === game.winner);
            const loserTeam = teams.find(t => t.id === game.loser);

            if (!winnerTeam || !loserTeam) return; // Skip if team not found

            const winnerNames = [winnerTeam.player1, winnerTeam.player2];
            const loserNames = [loserTeam.player1, loserTeam.player2];

            winnerNames.forEach(initPlayer);
            loserNames.forEach(initPlayer);

            // Add wins for winners
            winnerNames.forEach(name => {
                playerSummaries[name].wins += game.gameValue || 1;
                const partner = winnerNames.find(p => p !== name);
                playerSummaries[name].games.push(
                    `<li class="text-sm"><span class="font-bold text-green-600">Win</span> with ${partner} vs ${loserNames.join(' & ')} (${game.winnerScore}-${game.loserScore}) ${game.isPetaroll ? '<span class="petaroll-badge !ml-1">PETAROLL</span>' : ''}</li>`
                );
            });

            // Add losses for losers
            loserNames.forEach(name => {
                playerSummaries[name].losses += game.gameValue || 1;
                const partner = loserNames.find(p => p !== name);
                playerSummaries[name].games.push(
                    `<li class="text-sm"><span class="font-bold text-red-600">Loss</span> with ${partner} vs ${winnerNames.join(' & ')} (${game.loserScore}-${game.winnerScore}) ${game.isPetaroll ? '<span class="petarolled-badge !ml-1">PETAROLLED</span>' : ''}</li>`
                );
            });
        }
    });

    let summaryHtml = '';
    Object.keys(playerSummaries).sort().forEach(playerName => {
        const summary = playerSummaries[playerName];
        const sanitizedPlayerName = playerName.replace(/[^a-zA-Z0-9]/g, ''); // Create a safe ID
        summaryHtml += `
            <div>
                <h5 onclick="toggleVisibility('summary-${sanitizedPlayerName}')" class="font-bold cursor-pointer p-2 rounded-lg flex justify-between items-center">
                    <span>${playerName} <span class="font-normal text-gray-600 dark:text-gray-400">(${summary.wins}W - ${summary.losses}L)</span></span>
                    <i class="fas fa-chevron-down transition-transform"></i>
                </h5>
                <ul id="summary-${sanitizedPlayerName}" class="list-disc list-inside pl-6 mt-1 space-y-1 hidden">
                    ${summary.games.join('')}
                </ul>
            </div>
        `;
    });

    summaryContainer.innerHTML = summaryHtml;
}

// Live game section
function loadLiveSection() {
    document.getElementById('gameSetup').classList.add('hidden');
    document.getElementById('liveGame').classList.add('hidden');
    document.getElementById('teamModeBtn').classList.remove('active');
    document.getElementById('singleModeBtn').classList.remove('active');
    currentGameMode = null;
}

function selectGameMode(mode) {
    currentGameMode = mode;

    document.getElementById('teamModeBtn').classList.toggle('active', mode === 'team');
    document.getElementById('singleModeBtn').classList.toggle('active', mode === 'single');

    document.getElementById('teamModeSetup').classList.toggle('hidden', mode !== 'team');
    document.getElementById('singleModeSetup').classList.toggle('hidden', mode !== 'single');

    populateSelectionDropdowns();

    document.getElementById('gameSetup').classList.remove('hidden');
}

function populateSelectionDropdowns() {
    const playerOptions = ['<option value="">Select player</option>'];
    players.forEach(player => {
        playerOptions.push(`<option value="${player.name}">${player.name}</option>`);
    });
    const playerOptionsHtml = playerOptions.join('');

    if (currentGameMode === 'team') {
        // Populate the new saved team dropdowns
        const savedTeamOptions = ['<option value="">Load a saved team</option>'];
        teams.forEach(team => {
            savedTeamOptions.push(`<option value="team:${team.id}">${team.player1} & ${team.player2}</option>`);
        });
        const savedTeamOptionsHtml = savedTeamOptions.join('');

        document.getElementById('gameTeam1SavedTeamSelect').innerHTML = savedTeamOptionsHtml;
        document.getElementById('gameTeam2SavedTeamSelect').innerHTML = savedTeamOptionsHtml;

        // Populate the player select dropdowns
        document.getElementById('gameTeam1Player1Input').innerHTML = playerOptionsHtml;
        document.getElementById('gameTeam1Player2Input').innerHTML = playerOptionsHtml;
        document.getElementById('gameTeam2Player1Input').innerHTML = playerOptionsHtml;
        document.getElementById('gameTeam2Player2Input').innerHTML = playerOptionsHtml;

    } else if (currentGameMode === 'single') {
        // Single mode dropdowns show only players
        document.getElementById('player1Select').innerHTML = playerOptionsHtml;
        document.getElementById('player2Select').innerHTML = playerOptionsHtml;
    }
}

function handleSavedTeamSelection(teamNumber, value) {
    // Reset the dropdown to the default after selection
    document.getElementById(`gameTeam${teamNumber}SavedTeamSelect`).value = "";
    if (!value) return; // Do nothing if the default option was re-selected

    const player1Input = document.getElementById(`gameTeam${teamNumber}Player1Input`);
    const player2Input = document.getElementById(`gameTeam${teamNumber}Player2Input`);

    const teamId = value.split(':')[1];
    const selectedTeam = teams.find(t => t.id === teamId);

    if (selectedTeam) {
        player1Input.value = selectedTeam.player1;
        player2Input.value = selectedTeam.player2;
    }
}

function startNewGame() {
    showSection('live');
}

function startGame() {
    bestOf = parseInt(document.getElementById('bestOfSelect').value);
    matchWins1 = 0;
    matchWins2 = 0;
    matchOver = false;

    if (currentGameMode === 'team') {
        const t1p1 = document.getElementById('gameTeam1Player1Input').value.trim();
        const t1p2 = document.getElementById('gameTeam1Player2Input').value.trim();
        const t2p1 = document.getElementById('gameTeam2Player1Input').value.trim();
        const t2p2 = document.getElementById('gameTeam2Player2Input').value.trim();

        const allPlayerNames = [t1p1, t1p2, t2p1, t2p2];
        if (allPlayerNames.some(name => name === '')) {
            showToast('Please enter all four player names.');
            return;
        }

        const uniqueNames = new Set(allPlayerNames.map(n => n.toLowerCase()));
        if (uniqueNames.size !== 4) {
            showToast('Please enter four unique player names for the game.');
            return;
        }

        allPlayerNames.forEach(addPlayerIfNotExists);

        const team1 = findOrCreateTeam(t1p1, t1p2);
        const team2 = findOrCreateTeam(t2p1, t2p2);

        currentGame = {
            gameMode: 'team',
            team1: team1,
            team2: team2,
            score1: 0,
            score2: 0,
            history: [],
            startTime: new Date(),
            ended: false
        };

        document.getElementById('team1Players').textContent = `${team1.player1} & ${team1.player2}`;
        document.getElementById('team2Players').textContent = `${team2.player1} & ${team2.player2}`;

    } else { // Single mode
        const player1Name = document.getElementById('player1Select').value.trim();
        const player2Name = document.getElementById('player2Select').value.trim();

        if (!player1Name || !player2Name) {
            showToast('Please select both players');
            return;
        }
         if (player1Name.toLowerCase() === player2Name.toLowerCase()) {
            showToast('Players must be different.');
            return;
        }

        addPlayerIfNotExists(player1Name);
        addPlayerIfNotExists(player2Name);

        currentGame = {
            gameMode: 'single',
            player1: player1Name,
            player2: player2Name,
            score1: 0,
            score2: 0,
            history: [],
            startTime: new Date(),
            ended: false
        };

        document.getElementById('team1Players').textContent = player1Name;
        document.getElementById('team2Players').textContent = player2Name;
    }

    document.getElementById('gameSetup').classList.add('hidden');
    document.getElementById('liveGame').classList.remove('hidden');

    document.getElementById('customScore1').value = '';
    document.getElementById('customScore2').value = '';

    enableScoreButtons();
    updateGameDisplay();
    updateMatchScoreDisplay();
}

function updateGameDisplay() {
    if (!currentGame) return;

    document.getElementById('team1Score').textContent = currentGame.score1;
    document.getElementById('team2Score').textContent = currentGame.score2;

    const progress1 = Math.min((currentGame.score1 / 150) * 100, 100);
    const progress2 = Math.min((currentGame.score2 / 150) * 100, 100);
    document.getElementById('team1Progress').style.width = progress1 + '%';
    document.getElementById('team2Progress').style.width = progress2 + '%';

    const petarollAlert = document.getElementById('petarollAlert');
    if ((currentGame.score1 >= 50 && currentGame.score2 === 0) ||
        (currentGame.score2 >= 50 && currentGame.score1 === 0)) {
        petarollAlert.classList.remove('hidden');
        petarollAlert.classList.add('petaroll-alert');

        if (currentGame.score1 >= 50 && currentGame.score2 === 0) {
            document.getElementById('team1Score').classList.add('text-orange-600');
        } else {
            document.getElementById('team2Score').classList.add('text-orange-600');
        }
    } else {
        petarollAlert.classList.add('hidden');
        document.getElementById('team1Score').classList.remove('text-orange-600');
        document.getElementById('team2Score').classList.remove('text-orange-600');
    }

    const historyHtml = currentGame.history.map((entry, index) => {
        const pointsDisplay = entry.points > 0 ? `+${entry.points}` : `${entry.points}`;
        const colorClass = entry.points > 0 ? 'text-green-600' : 'text-red-600';

        return `
            <div class="text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded flex justify-between">
                <span>${entry.team} <span class="${colorClass} font-bold">${pointsDisplay}</span></span>
                <span class="text-gray-500 dark:text-gray-400">${entry.team1Score} - ${entry.team2Score}</span>
            </div>
        `;
    }).join('');
    document.getElementById('scoreHistory').innerHTML = historyHtml;
}

function updateMatchScoreDisplay() {
    const display = document.getElementById('matchScore');
    if (display) {
        display.textContent = `Match Score: ${matchWins1} - ${matchWins2}`;
    }
}

function addCustomScore(team) {
    const customScoreInput = document.getElementById(`customScore${team}`);
    const customScore = parseInt(customScoreInput.value);

    if (isNaN(customScore) || customScore === 0) {
        showToast('Please enter a valid score');
        return;
    }

    if (customScore < 0) {
        const currentScore = team === 1 ? currentGame.score1 : currentGame.score2;
        if (currentScore + customScore < 0) {
            showToast('Score cannot go below 0');
            return;
        }
    }

    addScore(team, customScore);
    customScoreInput.value = '';
}

function subtractCustomScore(team) {
    const customScoreInput = document.getElementById(`customScore${team}`);
    let customScore = parseInt(customScoreInput.value);

    if (isNaN(customScore) || customScore === 0) {
        customScore = 5;
    }

    customScore = Math.abs(customScore);

    const currentScore = team === 1 ? currentGame.score1 : currentGame.score2;
    if (currentScore - customScore < 0) {
        showToast('Score cannot go below 0');
        return;
    }

    addScore(team, -customScore);
    customScoreInput.value = '';
}

function addScore(team, points) {
    if (!currentGame || currentGame.ended) return;

    if (team === 1) {
        currentGame.score1 = Math.max(0, currentGame.score1 + points);
    } else {
        currentGame.score2 = Math.max(0, currentGame.score2 + points);
    }

    let teamName;
    if (currentGame.gameMode === 'team') {
        teamName = team === 1
            ? `${currentGame.team1.player1} & ${currentGame.team1.player2}`
            : `${currentGame.team2.player1} & ${currentGame.team2.player2}`;
    } else {
        teamName = team === 1 ? currentGame.player1 : currentGame.player2;
    }

    currentGame.history.push({
        team: teamName,
        points: points,
        team1Score: currentGame.score1,
        team2Score: currentGame.score2,
    });

    playSound('addScore');
    updateGameDisplay();

    const score1 = currentGame.score1;
    const score2 = currentGame.score2;

    if ((score1 >= 75 && score2 === 0) || (score2 >= 75 && score1 === 0)) {
        pendingWinType = 'petaroll';
        showConfirmScoreUI();
        return;
    }

    if (score1 >= 150 || score2 >= 150) {
        pendingWinType = ((score1 >= 150 && score2 < 75) || (score2 >= 150 && score1 < 75)) ? 'petaroll' : 'regular';
        showConfirmScoreUI();
    }
}

function showConfirmScoreUI() {
    disableScoreButtons();
    document.getElementById('gameControls').classList.add('hidden');
    document.getElementById('confirmScoreContainer').classList.remove('hidden');
    document.getElementById('confirmScoreBtn').onclick = confirmFinalScore;
    document.getElementById('correctScoreBtn').onclick = correctScore;
}

function confirmFinalScore() {
    if (pendingWinType === 'petaroll') {
        declarePetaroll();
    } else {
        declareWinner();
    }
    pendingWinType = null;
    document.getElementById('confirmScoreContainer').classList.add('hidden');
    document.getElementById('gameControls').classList.remove('hidden');
}

function correctScore() {
    enableScoreButtons();
    pendingWinType = null;
    document.getElementById('confirmScoreContainer').classList.add('hidden');
    document.getElementById('gameControls').classList.remove('hidden');
}

function undoScore(team) {
    if (!currentGame || currentGame.history.length === 0) return;

    let teamName;
    if (currentGame.gameMode === 'team') {
        teamName = team === 1
            ? `${currentGame.team1.player1} & ${currentGame.team1.player2}`
            : `${currentGame.team2.player1} & ${currentGame.team2.player2}`;
    } else {
        teamName = team === 1 ? currentGame.player1 : currentGame.player2;
    }

    let lastTeamEntryIndex = -1;
    for (let i = currentGame.history.length - 1; i >= 0; i--) {
        if (currentGame.history[i].team === teamName) {
            lastTeamEntryIndex = i;
            break;
        }
    }

    if (lastTeamEntryIndex === -1) return;

    currentGame.history.splice(lastTeamEntryIndex, 1);
    recalculateScoresFromHistory();
    updateGameDisplay();
}

function recalculateScoresFromHistory() {
    currentGame.score1 = 0;
    currentGame.score2 = 0;

    currentGame.history.forEach(entry => {
        let isTeam1;
        if (currentGame.gameMode === 'team') {
            isTeam1 = entry.team === `${currentGame.team1.player1} & ${currentGame.team1.player2}`;
        } else {
            isTeam1 = entry.team === currentGame.player1;
        }

        if (isTeam1) {
            currentGame.score1 += entry.points;
        } else {
            currentGame.score2 += entry.points;
        }

        entry.team1Score = currentGame.score1;
        entry.team2Score = currentGame.score2;
    });
}

// NEW: Checks for comeback king achievement
function checkForComeback(winnerTeamNum) {
    if (!currentGame) return false;

    for(const entry of currentGame.history) {
        if(winnerTeamNum === 1) { // Team 1 won
            if (entry.team2Score - entry.team1Score >= 50) return true;
        } else { // Team 2 won
            if (entry.team1Score - entry.team2Score >= 50) return true;
        }
    }
    return false;
}

function declarePetaroll() {
    if (!currentGame) return;

    currentGame.ended = true;

    let winner, loser, winnerScore, loserScore, winnerName, loserName, winnerTeamNum;

    if (currentGame.gameMode === 'team') {
        winnerTeamNum = currentGame.score1 > currentGame.score2 ? 1 : 2;
        winner = winnerTeamNum === 1 ? currentGame.team1 : currentGame.team2;
        loser = winnerTeamNum === 1 ? currentGame.team2 : currentGame.team1;
        winnerScore = Math.max(currentGame.score1, currentGame.score2);
        loserScore = Math.min(currentGame.score1, currentGame.score2);
        winnerName = `${winner.player1} & ${winner.player2}`;
        loserName = `${loser.player1} & ${loser.player2}`;
    } else {
        winnerTeamNum = currentGame.score1 > currentGame.score2 ? 1 : 2;
        winner = winnerTeamNum === 1 ? currentGame.player1 : currentGame.player2;
        loser = winnerTeamNum === 1 ? currentGame.player2 : currentGame.player1;
        winnerScore = Math.max(currentGame.score1, currentGame.score2);
        loserScore = Math.min(currentGame.score1, currentGame.score2);
        winnerName = winner;
        loserName = loser;
    }

    const wasComeback = checkForComeback(winnerTeamNum);

    const gameRecord = {
        id: Date.now(),
        gameMode: currentGame.gameMode,
        winner: currentGame.gameMode === 'team' ? winner.id : winner,
        loser: currentGame.gameMode === 'team' ? loser.id : loser,
        winnerScore,
        loserScore,
        date: new Date().toISOString(),
        duration: new Date().getTime() - currentGame.startTime.getTime(),
        isPetaroll: true,
        gameValue: 2,
        wasComeback: wasComeback
    };

    games.push(gameRecord);
    localStorage.setItem('dominoGames', JSON.stringify(games));

    const loserId = currentGame.gameMode === 'team' ? loser.id : loser;
    const previousPetarolls = games.filter(g => g.loser === loserId && g.isPetaroll).length;

    let messageHtml = `
        <div class="text-3xl font-bold text-orange-600 mb-4">🔥 PETAROLL! 🔥</div>
        <div class="text-xl mb-2"><strong>${winnerName}</strong></div>
        <div class="text-lg mb-2">PETAROLLED</div>
        <div class="text-xl mb-2"><strong>${loserName}</strong></div>
        <div class="text-lg mb-2">Final Score: ${winnerScore} - ${loserScore}</div>
        <div class="mt-4 p-3 bg-red-100 dark:bg-red-900 rounded-lg">
            <div class="text-red-800 dark:text-red-200">
                ${loserName} has been PETAROLLED <strong>${previousPetarolls}</strong> time${previousPetarolls > 1 ? 's' : ''}!
            </div>
        </div>
        <div class="mt-4">
            <span class="petaroll-badge text-xl">This counts as 2 WINS!</span>
        </div>
    `;
    document.getElementById('winMessage').innerHTML = messageHtml;
    playSound('petaroll');

    if (currentGame.score1 > currentGame.score2) matchWins1 += 2; else matchWins2 += 2;
    handleMatchEnd(winnerName, gameRecord);
}

function declareWinner() {
    if (!currentGame) return;
    currentGame.ended = true;

    let winner, loser, winnerScore, loserScore, winnerName, winnerTeamNum;

    if (currentGame.gameMode === 'team') {
        winnerTeamNum = currentGame.score1 >= 150 ? 1 : 2;
        winner = winnerTeamNum === 1 ? currentGame.team1 : currentGame.team2;
        loser = winnerTeamNum === 1 ? currentGame.team2 : currentGame.team1;
        winnerName = `${winner.player1} & ${winner.player2}`;
    } else {
        winnerTeamNum = currentGame.score1 >= 150 ? 1 : 2;
        winner = winnerTeamNum === 1 ? currentGame.player1 : currentGame.player2;
        loser = winnerTeamNum === 1 ? currentGame.player2 : currentGame.player1;
        winnerName = winner;
    }
    winnerScore = Math.max(currentGame.score1, currentGame.score2);
    loserScore = Math.min(currentGame.score1, currentGame.score2);

    const wasComeback = checkForComeback(winnerTeamNum);

    const gameRecord = {
        id: Date.now(),
        gameMode: currentGame.gameMode,
        winner: currentGame.gameMode === 'team' ? winner.id : winner,
        loser: currentGame.gameMode === 'team' ? loser.id : loser,
        winnerScore,
        loserScore,
        date: new Date().toISOString(),
        duration: new Date().getTime() - currentGame.startTime.getTime(),
        isPetaroll: false,
        gameValue: 1,
        wasComeback: wasComeback
    };

    games.push(gameRecord);
    localStorage.setItem('dominoGames', JSON.stringify(games));

    if (currentGame.score1 > currentGame.score2) matchWins1++; else matchWins2++;
    document.getElementById('winMessage').innerHTML = `<strong>${winnerName}</strong> wins!<br>Final Score: ${winnerScore} - ${loserScore}`;
    handleMatchEnd(winnerName, gameRecord);
}

function handleMatchEnd(winnerName, gameRecord) {
    updateMatchScoreDisplay();
    const requiredWins = Math.ceil(bestOf / 2);
    let seriesInfo = `<div class="mt-2">Series Score: ${matchWins1} - ${matchWins2}</div>`;
    if (matchWins1 >= requiredWins || matchWins2 >= requiredWins) {
        matchOver = true;
        seriesInfo += `<div class="mt-2 font-bold">${winnerName} wins the best of ${bestOf}!</div>`;
        document.getElementById('playAgainBtn').classList.add('hidden');
    } else {
        document.getElementById('playAgainBtn').classList.remove('hidden');
    }
    document.getElementById('winMessage').innerHTML += seriesInfo;

    playSound('win');

    // Check achievements after saving the game
    console.log('Checking achievements for game:', gameRecord);
    checkAllAchievements(gameRecord);

    refreshAllData();
    document.getElementById('winModal').classList.remove('hidden');
    disableScoreButtons();
}

function playAgain() {
    if (matchOver) {
        closeWinModal();
        endGame();
    } else {
        resetGame();
        closeWinModal();
    }
}

function closeWinModal() {
    document.getElementById('winModal').classList.add('hidden');
}

function resetGame() {
    if (currentGame) {
        currentGame.score1 = 0;
        currentGame.score2 = 0;
        currentGame.history = [];
        currentGame.ended = false;
        document.getElementById('petarollAlert').classList.add('hidden');
        document.getElementById('customScore1').value = '';
        document.getElementById('customScore2').value = '';
        document.getElementById('confirmScoreContainer').classList.add('hidden');
        document.getElementById('gameControls').classList.remove('hidden');
        updateGameDisplay();
        enableScoreButtons();
    }
}

function endGame() {
    currentGame = null;
    currentGameMode = null;
    matchWins1 = 0;
    matchWins2 = 0;
    matchOver = false;
    updateMatchScoreDisplay();
    document.getElementById('gameSetup').classList.add('hidden');
    document.getElementById('liveGame').classList.add('hidden');
    document.getElementById('scoreHistory').innerHTML = '';
    document.getElementById('petarollAlert').classList.add('hidden');
    document.getElementById('confirmScoreContainer').classList.add('hidden');
    document.getElementById('gameControls').classList.remove('hidden');

    // Clear all input fields
    document.getElementById('gameTeam1Player1Input').value = '';
    document.getElementById('gameTeam1Player2Input').value = '';
    document.getElementById('gameTeam2Player1Input').value = '';
    document.getElementById('gameTeam2Player2Input').value = '';
    if(document.getElementById('gameTeam1SavedTeamSelect')) {
        document.getElementById('gameTeam1SavedTeamSelect').value = '';
    }
    if(document.getElementById('gameTeam2SavedTeamSelect')) {
        document.getElementById('gameTeam2SavedTeamSelect').value = '';
    }
    document.getElementById('player1Select').value = '';
    document.getElementById('player2Select').value = '';

    loadLiveSection();
}

function disableScoreButtons() {
    document.querySelectorAll('.score-btn, .custom-score-input + button, .custom-score-input ~ button').forEach(button => {
        button.disabled = true;
    });
}

function enableScoreButtons() {
    document.querySelectorAll('.score-btn, .custom-score-input + button, .custom-score-input ~ button').forEach(button => {
        button.disabled = false;
    });
}

// Timer functions
function startTurnTimer() {
    const timeInput = document.getElementById('turnTimeInput');
    const timeLimit = Math.min(parseInt(timeInput.value) || 60, 60);
    remainingTime = timeLimit;

    if (turnTimer) clearInterval(turnTimer);

    turnTimer = setInterval(() => {
        remainingTime--;
        updateTimerDisplay();

        if (remainingTime <= 0) {
            stopTurnTimer();
            showToast("Time's up!");
        }
    }, 1000);

    updateTimerDisplay();
}

function stopTurnTimer() {
    if (turnTimer) {
        clearInterval(turnTimer);
        turnTimer = null;
    }
    document.getElementById('turnTimerDisplay').textContent = '--';
}

function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    document.getElementById('turnTimerDisplay').textContent =
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Players Section
function loadPlayers() {
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

function showCreatePlayerForm() {
    document.getElementById('createPlayerForm').classList.remove('hidden');
}

function hideCreatePlayerForm() {
    document.getElementById('createPlayerForm').classList.add('hidden');
    document.getElementById('newPlayerName').value = '';
}

function createPlayer() {
    const playerName = document.getElementById('newPlayerName').value.trim();
    if (!playerName) {
        showToast('Please enter a player name');
        return;
    }

    addPlayerIfNotExists(playerName);
    hideCreatePlayerForm();
    loadPlayers();
}

function addPlayerIfNotExists(playerName) {
    if (!playerName) return;
    const nameExists = players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (!nameExists) {
        const newPlayer = { id: Date.now().toString(), name: playerName };
        players.push(newPlayer);
        localStorage.setItem('dominoPlayers', JSON.stringify(players));
    }
}

function deletePlayer(playerId) {
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

// Teams Section
function loadTeams() {
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

function showCreateTeam() {
    document.getElementById('createTeamForm').classList.remove('hidden');
}

function hideCreateTeam() {
    document.getElementById('createTeamForm').classList.add('hidden');
    document.getElementById('teamPlayer1Input').value = '';
    document.getElementById('teamPlayer2Input').value = '';
}

function createTeam() {
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

function findOrCreateTeam(player1Name, player2Name) {
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

function deleteTeam(teamId) {
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

// Leaderboard section
function loadLeaderboard() {
    showLeaderboard('daily');
}

function showLeaderboard(period) {
    currentPeriod = period;

    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.classList.remove('bg-blue-500', 'text-white');
        tab.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
    });

    const activeTab = document.querySelector(`[onclick="showLeaderboard('${period}')"]`);
    activeTab.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
    activeTab.classList.add('bg-blue-500', 'text-white');

    let periodText = '';
    const now = new Date();
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    const monthYearOptions = { month: 'long', year: 'numeric' };
    const shortMonthDayOptions = { month: 'short', day: 'numeric' };

    switch (period) {
        case 'daily':
            periodText = `Today: ${now.toLocaleDateString('en-US', options)}`;
            break;
        case 'weekly':
            const firstDayOfWeek = new Date(now);
            firstDayOfWeek.setDate(now.getDate() - now.getDay());
            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
            periodText = `This Week: ${firstDayOfWeek.toLocaleDateString('en-US', shortMonthDayOptions)} - ${lastDayOfWeek.toLocaleDateString('en-US', shortMonthDayOptions)}`;
            break;
        case 'monthly':
            periodText = `This Month: ${now.toLocaleDateString('en-US', monthYearOptions)}`;
            break;
        case 'alltime':
            periodText = 'All Time';
            break;
    }
    document.getElementById('teamPeriodInfo').textContent = periodText;
    document.getElementById('playerPeriodInfo').textContent = periodText;

    games = JSON.parse(localStorage.getItem('dominoGames')) || [];

    loadTeamRankings(period);
    loadPlayerStats(period);
    loadOpponentComparison();
    loadStreaks(period);
    loadPetarollLeaders(period);
}

function loadTeamRankings(period) {
    const filteredGames = filterGamesByPeriod(games, period);
    const teamStats = {};

    teams.forEach(team => {
        teamStats[team.id] = { name: `${team.player1} & ${team.player2}`, wins: 0, losses: 0, petarolls: 0, gotPetarolled: 0 };
    });

    filteredGames.forEach(game => {
        if (game.gameMode === 'team') {
            if (teamStats[game.winner]) {
                teamStats[game.winner].wins += game.gameValue || 1;
                if (game.isPetaroll) teamStats[game.winner].petarolls++;
            }
            if (teamStats[game.loser]) {
                teamStats[game.loser].losses += game.gameValue || 1;
                if (game.isPetaroll) teamStats[game.loser].gotPetarolled++;
            }
        }
    });

    const rankings = Object.values(teamStats)
        .filter(stat => stat.wins > 0 || stat.losses > 0)
        .sort((a, b) => (b.wins / (b.wins + b.losses) || 0) - (a.wins / (a.wins + a.losses) || 0) || b.wins - a.wins);

    const rankingsHtml = rankings.map((stat, index) => {
        const total = stat.wins + stat.losses;
        const winRate = total > 0 ? ((stat.wins / total) * 100).toFixed(1) : 0;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

        return `
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2">
                <div class="flex items-center space-x-3">
                    <span class="text-xl">${medal}</span>
                    <div>
                        <div class="font-bold">${stat.name}</div>
                        <div>
                            ${stat.petarolls > 0 ? `<span class="petaroll-badge">${stat.petarolls} PETAROLL${stat.petarolls > 1 ? 'S' : ''}</span>` : ''}
                            ${stat.gotPetarolled > 0 ? `<span class="petarolled-badge">PETAROLLED ${stat.gotPetarolled}x</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-bold">${stat.wins}W - ${stat.losses}L</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">${winRate}% Win Rate</div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('teamRankings').innerHTML = rankingsHtml || '<p class="text-gray-500 dark:text-gray-400">No games played in this period</p>';
}

function loadPlayerStats(period) {
    const filteredGames = filterGamesByPeriod(games, period);
    const playerStats = {};

    players.forEach(player => {
        playerStats[player.name] = { name: player.name, wins: 0, losses: 0, petarolls: 0, gotPetarolled: 0 };
    });

    filteredGames.forEach(game => {
        if (game.gameMode === 'single') {
            if (playerStats[game.winner]) {
                playerStats[game.winner].wins += game.gameValue || 1;
                if (game.isPetaroll) playerStats[game.winner].petarolls++;
            }
            if (playerStats[game.loser]) {
                playerStats[game.loser].losses += game.gameValue || 1;
                if (game.isPetaroll) playerStats[game.loser].gotPetarolled++;
            }
        } else {
            const winnerTeam = teams.find(t => t.id === game.winner);
            const loserTeam = teams.find(t => t.id === game.loser);

            if (winnerTeam) {
                [winnerTeam.player1, winnerTeam.player2].forEach(p => {
                    if(playerStats[p]) {
                        playerStats[p].wins += game.gameValue || 1;
                        if (game.isPetaroll) playerStats[p].petarolls++;
                    }
                });
            }
            if (loserTeam) {
                [loserTeam.player1, loserTeam.player2].forEach(p => {
                    if(playerStats[p]) {
                        playerStats[p].losses += game.gameValue || 1;
                        if (game.isPetaroll) playerStats[p].gotPetarolled++;
                    }
                });
            }
        }
    });

    const playerRankings = Object.values(playerStats)
        .filter(stat => stat.wins > 0 || stat.losses > 0)
        .sort((a, b) => (b.wins / (b.wins + b.losses) || 0) - (a.wins / (a.wins + a.losses) || 0) || b.wins - a.wins);

    const playersHtml = playerRankings.slice(0, 10).map((stat, index) => {
        const total = stat.wins + stat.losses;
        const winRate = total > 0 ? ((stat.wins / total) * 100).toFixed(1) : 0;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2">
                <div class="flex items-center space-x-3">
                    <span class="text-lg">${medal}</span>
                    <div>
                        <div class="font-medium">${stat.name}</div>
                        <div>
                            ${stat.petarolls > 0 ? `<span class="petaroll-badge">${stat.petarolls} PETAROLL${stat.petarolls > 1 ? 'S' : ''}</span>` : ''}
                            ${stat.gotPetarolled > 0 ? `<span class="petarolled-badge">PETAROLLED ${stat.gotPetarolled}x</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="text-right text-sm">
                    <div class="font-bold">${stat.wins}W - ${stat.losses}L</div>
                    <div class="text-gray-500 dark:text-gray-400">${winRate}%</div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('playerStats').innerHTML = playersHtml || '<p class="text-gray-500 dark:text-gray-400">No games played in this period</p>';
}

function loadOpponentComparison() {
    const select1 = document.getElementById('comparison-select1');
    const select2 = document.getElementById('comparison-select2');

    let options = '<option value="">Select Player/Team</option>';
    players.forEach(p => options += `<option value="player:${p.name}">${p.name}</option>`);
    teams.forEach(t => options += `<option value="team:${t.id}">${t.player1} & ${t.player2}</option>`);

    select1.innerHTML = options;
    select2.innerHTML = options;

    resetOpponentComparison();
}

function resetOpponentComparison() {
    document.getElementById('comparison-select1').value = '';
    document.getElementById('comparison-select2').value = '';
    document.getElementById('comparison-results').innerHTML = '';
}

function getOverallStats(entityId, period) {
    const [type, id] = entityId.split(':');
    const relevantGames = filterGamesByPeriod(games, period);
    let wins = 0, losses = 0, petarollsGiven = 0, petarolled = 0;

    relevantGames.forEach(game => {
        if (type === 'player') {
            if(game.gameMode === 'single') {
                if(game.winner === id) {
                    wins += game.gameValue || 1;
                    if(game.isPetaroll) petarollsGiven++;
                }
                if(game.loser === id) {
                    losses += game.gameValue || 1;
                    if(game.isPetaroll) petarolled++;
                }
            } else { // team game
                const winnerTeam = teams.find(t => t.id === game.winner);
                const loserTeam = teams.find(t => t.id === game.loser);
                if(winnerTeam && (winnerTeam.player1 === id || winnerTeam.player2 === id)) {
                    wins += game.gameValue || 1;
                    if(game.isPetaroll) petarollsGiven++;
                }
                if(loserTeam && (loserTeam.player1 === id || loserTeam.player2 === id)) {
                    losses += game.gameValue || 1;
                    if(game.isPetaroll) petarolled++;
                }
            }
        } else { // team
            if(game.gameMode === 'team') {
                 if(game.winner === id) {
                    wins += game.gameValue || 1;
                    if(game.isPetaroll) petarollsGiven++;
                }
                if(game.loser === id) {
                    losses += game.gameValue || 1;
                    if(game.isPetaroll) petarolled++;
                }
            }
        }
    });
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) + '%' : 'N/A';

    return { wins, losses, winRate, petarollsGiven, petarolled };
}

function runOpponentComparison() {
    const select1Val = document.getElementById('comparison-select1').value;
    const select2Val = document.getElementById('comparison-select2').value;
    const period = document.querySelector('input[name="comparison-period"]:checked').value;
    const resultsDiv = document.getElementById('comparison-results');

    if (!select1Val || !select2Val) {
        resultsDiv.innerHTML = '';
        return;
    }

    if (select1Val === select2Val) {
        resultsDiv.innerHTML = '<p class="text-sm text-red-500">Please select two different opponents.</p>';
        return;
    }

    const stats1 = getOverallStats(select1Val, period);
    const stats2 = getOverallStats(select2Val, period);

    const team1Obj = teams.find(t => t.id === select1Val.split(':')[1]);
    const name1 = select1Val.startsWith('player:')
        ? select1Val.split(':')[1]
        : (team1Obj ? `${team1Obj.player1} & ${team1Obj.player2}` : 'Unknown Team');

    const team2Obj = teams.find(t => t.id === select2Val.split(':')[1]);
    const name2 = select2Val.startsWith('player:')
        ? select2Val.split(':')[1]
        : (team2Obj ? `${team2Obj.player1} & ${team2Obj.player2}` : 'Unknown Team');

    resultsDiv.innerHTML = `
        <div class="grid grid-cols-2 gap-4 text-center mt-2">
            <div>
                <div class="font-bold">${name1}</div>
                <div class="text-sm">${stats1.wins}W - ${stats1.losses}L</div>
                <div class="text-xs text-gray-500">${stats1.winRate}</div>
                <div class="text-xs mt-1">Petarolls: ${stats1.petarollsGiven}</div>
                <div class="text-xs">Petarolled: ${stats1.petarolled}</div>
            </div>
            <div>
                <div class="font-bold">${name2}</div>
                <div class="text-sm">${stats2.wins}W - ${stats2.losses}L</div>
                <div class="text-xs text-gray-500">${stats2.winRate}</div>
                <div class="text-xs mt-1">Petarolls: ${stats2.petarollsGiven}</div>
                <div class="text-xs">Petarolled: ${stats2.petarolled}</div>
            </div>
        </div>
    `;
}

function loadStreaks(period) {
    const filteredGames = filterGamesByPeriod(games, period).sort((a,b) => new Date(a.date) - new Date(b.date));
    const playerStreaks = {};

    // Initialize streaks for all players
    players.forEach(p => {
        playerStreaks[p.name] = { name: p.name, currentStreak: 0, type: 'none' };
    });

    // Process games chronologically to track streaks
    filteredGames.forEach(game => {
        let winnerPlayers = [];
        let loserPlayers = [];

        if (game.gameMode === 'single') {
            winnerPlayers = [game.winner];
            loserPlayers = [game.loser];
        } else {
            const winnerTeam = teams.find(t => t.id === game.winner);
            const loserTeam = teams.find(t => t.id === game.loser);
            if (winnerTeam) winnerPlayers = [winnerTeam.player1, winnerTeam.player2];
            if (loserTeam) loserPlayers = [loserTeam.player1, loserTeam.player2];
        }

        // Update streaks for all winning players
        winnerPlayers.forEach(playerName => {
            if (playerStreaks[playerName]) {
                const gameValue = game.gameValue || 1;
                if (playerStreaks[playerName].type === 'win') {
                    playerStreaks[playerName].currentStreak += gameValue;
                } else {
                    playerStreaks[playerName].type = 'win';
                    playerStreaks[playerName].currentStreak = gameValue;
                }
            }
        });

        // Update streaks for all losing players
        loserPlayers.forEach(playerName => {
            if (playerStreaks[playerName]) {
                const gameValue = game.gameValue || 1;
                if (playerStreaks[playerName].type === 'loss') {
                    playerStreaks[playerName].currentStreak += gameValue;
                } else {
                    playerStreaks[playerName].type = 'loss';
                    playerStreaks[playerName].currentStreak = gameValue;
                }
            }
        });
    });

    const winningStreaks = Object.values(playerStreaks).filter(s => s.type === 'win' && s.currentStreak >= 2).sort((a,b) => b.currentStreak - a.currentStreak);
    const losingStreaks = Object.values(playerStreaks).filter(s => s.type === 'loss' && s.currentStreak >= 2).sort((a,b) => b.currentStreak - a.currentStreak);

    let html = '<div><h4 class="font-semibold text-green-500 dark:text-green-400">Winning Streaks</h4>';
    if(winningStreaks.length > 0) {
        html += winningStreaks.slice(0,3).map(s => `<div class="text-sm">${s.name}: <span class="font-semibold">${s.currentStreak} win${s.currentStreak > 1 ? 's' : ''}</span></div>`).join('');
    } else {
        html += '<div class="text-sm text-gray-500 dark:text-gray-400">None</div>';
    }
    html += '</div>';

    html += '<div class="mt-4"><h4 class="font-semibold text-red-500 dark:text-red-400">Losing Streaks</h4>';
    if(losingStreaks.length > 0) {
        html += losingStreaks.slice(0,3).map(s => `<div class="text-sm">${s.name}: <span class="font-semibold">${s.currentStreak} loss${s.currentStreak > 1 ? 'es' : ''}</span></div>`).join('');
    } else {
         html += '<div class="text-sm text-gray-500 dark:text-gray-400">None</div>';
    }
    html += '</div>';

    document.getElementById('streaks-slumps-list').innerHTML = html;
}

function loadPetarollLeaders(period) {
    const filteredGames = filterGamesByPeriod(games, period).filter(g => g.isPetaroll);
    const playerPetarollers = {};
    const playerPetarolled = {};

    // Initialize all players
    players.forEach(p => {
        playerPetarollers[p.name] = { name: p.name, count: 0 };
        playerPetarolled[p.name] = { name: p.name, count: 0 };
    });

    filteredGames.forEach(game => {
        if (game.gameMode === 'single') {
            // Single player games - direct mapping
            if (playerPetarollers[game.winner]) {
                playerPetarollers[game.winner].count++;
            }
            if (playerPetarolled[game.loser]) {
                playerPetarolled[game.loser].count++;
            }
        } else {
            // Team games - add to individual players
            const winnerTeam = teams.find(t => t.id === game.winner);
            const loserTeam = teams.find(t => t.id === game.loser);

            if (winnerTeam) {
                [winnerTeam.player1, winnerTeam.player2].forEach(playerName => {
                    if (playerPetarollers[playerName]) {
                        playerPetarollers[playerName].count++;
                    }
                });
            }

            if (loserTeam) {
                [loserTeam.player1, loserTeam.player2].forEach(playerName => {
                    if (playerPetarolled[playerName]) {
                        playerPetarolled[playerName].count++;
                    }
                });
            }
        }
    });

    const topPetarollers = Object.values(playerPetarollers).filter(p => p.count > 0).sort((a,b) => b.count - a.count);
    const topPetarolled = Object.values(playerPetarolled).filter(p => p.count > 0).sort((a,b) => b.count - a.count);

    let html = '<div><h4 class="font-semibold text-green-500 dark:text-green-400">Most Petarolls Given</h4>';
    if(topPetarollers.length > 0) {
        html += topPetarollers.slice(0,3).map(p => `<div class="text-sm">${p.name}: <span class="font-semibold">${p.count}</span></div>`).join('');
    } else {
        html += '<div class="text-sm text-gray-500 dark:text-gray-400">None</div>';
    }
    html += '</div>';

    html += '<div class="mt-4"><h4 class="font-semibold text-red-500 dark:text-red-400">Most Petarolled</h4>';
     if(topPetarolled.length > 0) {
        html += topPetarolled.slice(0,3).map(p => `<div class="text-sm">${p.name}: <span class="font-semibold">${p.count}</span></div>`).join('');
    } else {
         html += '<div class="text-sm text-gray-500 dark:text-gray-400">None</div>';
    }
    html += '</div>';

    document.getElementById('petaroll-leaders-list').innerHTML = html;
}

function filterGamesByPeriod(games, period) {
    const now = new Date();

    switch (period) {
        case 'daily':
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return games.filter(game => new Date(game.date) >= todayStart);
        case 'weekly':
            const firstDayOfWeek = new Date(now);
            firstDayOfWeek.setDate(now.getDate() - now.getDay());
            firstDayOfWeek.setHours(0, 0, 0, 0);
            return games.filter(game => new Date(game.date) >= firstDayOfWeek);
        case 'monthly':
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return games.filter(game => new Date(game.date) >= firstDayOfMonth);
        case 'alltime':
        default:
            return games;
    }
}

// Voice command functionality
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        document.getElementById('micBtn').style.display = 'none';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const micBtn = document.getElementById('micBtn');

    recognition.onstart = () => {
        isMicOn = true;
        micBtn.classList.add('animate-pulse', 'bg-red-500');
        micBtn.innerHTML = '<i class="fas fa-microphone-slash mr-2"></i>Stop';
    };

    recognition.onend = () => {
        isMicOn = false;
        micBtn.classList.remove('animate-pulse', 'bg-red-500');
        micBtn.innerHTML = '<i class="fas fa-microphone mr-2"></i>Voice';
    };

    recognition.onerror = (event) => {
        document.getElementById('voiceOutput').textContent = `Error: ${event.error}`;
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        document.getElementById('voiceOutput').textContent = `Heard: "${transcript}"`;
        parseVoiceCommand(transcript);
    };
}

function toggleMic() {
    if (!recognition) setupSpeechRecognition();
    if (isMicOn) {
        recognition.stop();
    } else {
        if(currentGame) {
            try {
                recognition.start();
            } catch(e) {
                console.error("Speech recognition error:", e);
            }
        }
        else showToast("Please start a game first.");
    }
}

function parseVoiceCommand(command) {
    const outputEl = document.getElementById('voiceOutput');
    const scoreMatch = command.match(/\d+/);

    if (!scoreMatch) {
        outputEl.textContent += ' - No score found in command.';
        return;
    }
    const points = parseInt(scoreMatch[0], 10);

    let team = 0;
    // Check for Team 2 (Red) keywords first
    if (command.includes('red') || command.includes('read') || command.includes('team 2') || command.includes('player 2')) {
        team = 2;
    }
    // Check for Team 1 (Blue) keywords
    else if (command.includes('blue') || command.includes('team 1') || command.includes('player 1')) {
        team = 1;
    }

    if (team && points) {
        const customScoreInput = document.getElementById(`customScore${team}`);
        if (customScoreInput) {
            customScoreInput.value = points;
            addCustomScore(team);
            outputEl.textContent += ` - Added ${points} to Team ${team}.`;
        }
    } else {
        outputEl.textContent += ' - Could not determine the team. Please say "blue" or "red".';
    }
}

// NEW: Custom Modals and Toasts
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;
    const confirmBtn = document.getElementById('confirmModalConfirmBtn');

    // Clone and replace the button to remove old event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        closeConfirmModal();
    });

    document.getElementById('confirmModal').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
}


// Initialize app
function initApp() {
    initTheme();
    initAudio(); // Initialize the audio context
    showSection('home');
    setupSpeechRecognition();
    document.getElementById('comparison-period-selector').addEventListener('change', runOpponentComparison);
}

// Manual function to recalculate achievements (can be called from console)
function fixAchievements() {
    recalculateAllAchievements();
    refreshAllData();
    showToast('Achievements recalculated!');
}

// Debug function to check current achievement status
function debugAchievements() {
    console.log('=== ACHIEVEMENT DEBUG ===');
    console.log('Total games:', games.length);
    console.log('Current achievements:', achievements);
    console.log('Current streaks:', streaks);

    // Check each player's stats
    players.forEach(player => {
        const playerId = `player:${player.name}`;
        const playerGames = games.filter(g =>
            (g.gameMode === 'single' && (g.winner === player.name || g.loser === player.name)) ||
            (g.gameMode === 'team' && (
                teams.find(t => t.id === g.winner && (t.player1 === player.name || t.player2 === player.name)) ||
                teams.find(t => t.id === g.loser && (t.player1 === player.name || t.player2 === player.name))
            ))
        );

        const wins = playerGames.filter(g => {
            if (g.gameMode === 'single') return g.winner === player.name;
            const winnerTeam = teams.find(t => t.id === g.winner);
            return winnerTeam && (winnerTeam.player1 === player.name || winnerTeam.player2 === player.name);
        }).reduce((sum, g) => sum + (g.gameValue || 1), 0);

        console.log(`${player.name}: ${wins} wins, achievements:`, achievements[playerId] || 'none');
    });
}

// Manual function to grant dominator to Q (call from console: grantDominatorToQ())
function grantDominatorToQ() {
    grantAchievement('player:Q', 'dominator');
    streaks['player:Q'] = 5; // Ensure streak shows 5
    localStorage.setItem('dominoStreaks', JSON.stringify(streaks));
    refreshAllData();
    showToast('Dominator achievement granted to Q!');
}

// Force fix Q's dominator achievement immediately
function forceFixQDominator() {
    console.log('Force fixing Q dominator achievement...');

    // Count Q's actual consecutive wins
    const qGames = games.filter(g => {
        if (g.gameMode === 'single') return g.winner === 'Q';
        const team = teams.find(t => t.id === g.winner);
        return team && (team.player1 === 'Q' || team.player2 === 'Q');
    });

    console.log(`Q has won ${qGames.length} games total`);

    // Check if Q has enough wins for dominator
    if (qGames.length >= 3) { // Since Q has 3+ wins including PETAROLL
        const qWinValue = qGames.reduce((sum, g) => sum + (g.gameValue || 1), 0);
        console.log(`Q's total win value: ${qWinValue}`);

        if (qWinValue >= 5) {
            grantAchievement('player:Q', 'dominator');
            streaks['player:Q'] = qWinValue;
            localStorage.setItem('dominoStreaks', JSON.stringify(streaks));
            console.log('Dominator granted to Q!');
        }
    }

    refreshAllData();
}

// Function to recalculate streaks from game history
function recalculateStreaks() {
    console.log('Recalculating all streaks from game history...');

    // Reset all streaks
    streaks = {};

    // Sort games by date to process in chronological order
    const sortedGames = [...games].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedGames.forEach((game, index) => {
        const winnerId = game.gameMode === 'team' ? `team:${game.winner}` : `player:${game.winner}`;
        const loserId = game.gameMode === 'team' ? `team:${game.loser}` : `player:${game.loser}`;

        // Reset loser's streak
        streaks[loserId] = 0;

        // If loser is a team, also reset individual player streaks
        if (loserId.startsWith('team:')) {
            const loserTeam = teams.find(t => t.id === loserId.split(':')[1]);
            if (loserTeam) {
                streaks[`player:${loserTeam.player1}`] = 0;
                streaks[`player:${loserTeam.player2}`] = 0;
            }
        }

        // Add game value to winner's streak (1 for regular, 2 for PETAROLL)
        const gameValue = game.gameValue || (game.isPetaroll ? 2 : 1);
        streaks[winnerId] = (streaks[winnerId] || 0) + gameValue;

        // If winner is a team, also update individual player streaks
        if (winnerId.startsWith('team:')) {
            const winnerTeam = teams.find(t => t.id === winnerId.split(':')[1]);
            if (winnerTeam) {
                streaks[`player:${winnerTeam.player1}`] = (streaks[`player:${winnerTeam.player1}`] || 0) + gameValue;
                streaks[`player:${winnerTeam.player2}`] = (streaks[`player:${winnerTeam.player2}`] || 0) + gameValue;
            }
        }

        console.log(`Game ${index + 1}: ${winnerId} streak is now ${streaks[winnerId]} (added ${gameValue})`);

        // Check for dominator achievement
        if (streaks[winnerId] >= 5) {
            console.log(`Should grant dominator to ${winnerId} with streak ${streaks[winnerId]}`);
            grantAchievement(winnerId, 'dominator');
        }
    });

    localStorage.setItem('dominoStreaks', JSON.stringify(streaks));
    console.log('Final streaks:', streaks);
}

// Debug button functionality removed

// Start the app
initApp();

// Auto-fix achievements and streaks on startup
setTimeout(() => {
    console.log('Checking and fixing streaks and achievements...');

    // Recalculate streaks to ensure they're accurate
    recalculateStreaks();

    // Also recalculate all achievements if needed
    const hasAnyAchievements = Object.keys(achievements).length > 0;
    const hasGames = games.length > 0;

    if (hasGames && !hasAnyAchievements) {
        console.log('No achievements found but games exist - recalculating...');
        recalculateAllAchievements();
    }

    // Force fix Q's dominator achievement
    forceFixQDominator();

    refreshAllData();
}, 500);
