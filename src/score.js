export function loadLiveSection() {
            document.getElementById('gameSetup').classList.add('hidden');
            document.getElementById('liveGame').classList.add('hidden');
            document.getElementById('teamModeBtn').classList.remove('active');
            document.getElementById('singleModeBtn').classList.remove('active');
            currentGameMode = null;
        }

export function selectGameMode(mode) {
            currentGameMode = mode;
            
            document.getElementById('teamModeBtn').classList.toggle('active', mode === 'team');
            document.getElementById('singleModeBtn').classList.toggle('active', mode === 'single');
            
            document.getElementById('teamModeSetup').classList.toggle('hidden', mode !== 'team');
            document.getElementById('singleModeSetup').classList.toggle('hidden', mode !== 'single');
            
            populateSelectionDropdowns(); 
            
            document.getElementById('gameSetup').classList.remove('hidden');
        }

export function populateSelectionDropdowns() {
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

export function handleSavedTeamSelection(teamNumber, value) {
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

export function startNewGame() {
            showSection('live');
        }

export function startGame() {
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

export function updateGameDisplay() {
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

export function updateMatchScoreDisplay() {
            const display = document.getElementById('matchScore');
            if (display) {
                display.textContent = `Match Score: ${matchWins1} - ${matchWins2}`;
            }
        }

export function addCustomScore(team) {
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

export function subtractCustomScore(team) {
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

export function addScore(team, points) {
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

export function showConfirmScoreUI() {
            disableScoreButtons();
            document.getElementById('gameControls').classList.add('hidden');
            document.getElementById('confirmScoreContainer').classList.remove('hidden');
            document.getElementById('confirmScoreBtn').onclick = confirmFinalScore;
            document.getElementById('correctScoreBtn').onclick = correctScore;
        }

export function confirmFinalScore() {
            if (pendingWinType === 'petaroll') {
                declarePetaroll();
            } else {
                declareWinner();
            }
            pendingWinType = null;
            document.getElementById('confirmScoreContainer').classList.add('hidden');
            document.getElementById('gameControls').classList.remove('hidden');
        }

export function correctScore() {
            enableScoreButtons();
            pendingWinType = null;
            document.getElementById('confirmScoreContainer').classList.add('hidden');
            document.getElementById('gameControls').classList.remove('hidden');
        }

export function undoScore(team) {
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

export function recalculateScoresFromHistory() {
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
export function checkForComeback(winnerTeamNum) {
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

export function declarePetaroll() {
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

export function declareWinner() {
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

export function handleMatchEnd(winnerName, gameRecord) {
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

export function playAgain() {
            if (matchOver) {
                closeWinModal();
                endGame();
            } else {
                resetGame();
                closeWinModal();
            }
        }

export function closeWinModal() {
            document.getElementById('winModal').classList.add('hidden');
        }

export function resetGame() {
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

export function endGame() {
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

export function disableScoreButtons() {
            document.querySelectorAll('.score-btn, .custom-score-input + button, .custom-score-input ~ button').forEach(button => {
                button.disabled = true;
            });
        }

export function enableScoreButtons() {
            document.querySelectorAll('.score-btn, .custom-score-input + button, .custom-score-input ~ button').forEach(button => {
                button.disabled = false;
            });
        }

        // Timer functions
export function startTurnTimer() {
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
        
export function stopTurnTimer() {
            if (turnTimer) {
                clearInterval(turnTimer);
                turnTimer = null;
            }
            document.getElementById('turnTimerDisplay').textContent = '--';
        }
        
export function updateTimerDisplay() {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            document.getElementById('turnTimerDisplay').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

