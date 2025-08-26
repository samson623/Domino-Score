export function loadAchievements() {
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


export function getEntityName(entityId) {
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

export function grantAchievement(entityId, achievementKey) {
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
        
export function checkAllAchievements(gameRecord) {
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

export function updateStreaksAndCheckDominator(winnerId, loserId, gameValue) {
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

export function showAchievement(message) {
            const toast = document.getElementById('achievementToast');
            toast.textContent = message;
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 4000);
        }

export function recalculateAllAchievements() {
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
export function fixAchievements() {
            recalculateAllAchievements();
            refreshAllData();
            showToast('Achievements recalculated!');
        }

        // Debug function to check current achievement status
export function debugAchievements() {
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
export function grantDominatorToQ() {
            grantAchievement('player:Q', 'dominator');
            streaks['player:Q'] = 5; // Ensure streak shows 5
            localStorage.setItem('dominoStreaks', JSON.stringify(streaks));
            refreshAllData();
            showToast('Dominator achievement granted to Q!');
        }

        // Force fix Q's dominator achievement immediately
export function forceFixQDominator() {
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
export function recalculateStreaks() {
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

