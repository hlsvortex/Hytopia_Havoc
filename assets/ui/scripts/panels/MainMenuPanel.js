import { BasePanel } from '../BasePanel.js';
import { ModelViewer } from '../ModelViewer.js';

export default class MainMenuPanel extends BasePanel {
    constructor() {
        super('main-menu-panel');
        this.modelViewer = null;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div id="main-menu" class="main-menu">
                <!-- Top navigation bar -->
                <div class="top-nav">
                    <div class="nav-icons">
                        <div class="nav-icon home-icon active"><i class="fa-solid fa-house"></i></div>
                        <div class="nav-icon badge-icon"><i class="fa-solid fa-medal"></i></div>
                        <div class="nav-icon customize-icon"><i class="fa-solid fa-shirt"></i></div>
                        <div class="nav-icon store-icon"><i class="fa-solid fa-cart-shopping"></i></div>
                        <div class="nav-icon profile-icon"><i class="fa-solid fa-user"></i></div>
                    </div>
                    
                    <!-- Currency display -->
                    <div class="top-right-container">
                        <div class="currency-container">
                            <div class="currency kudos">
                                <div class="currency-icon"><i class="fa-solid fa-coins"></i></div>
                                <span class="currency-amount">0</span>
                            </div>
                            <div class="currency crowns">
                                <div class="currency-icon"><i class="fa-solid fa-crown"></i></div>
                                <span class="currency-amount">0</span>
                            </div>
                        </div>
                        <div class="settings-btn"><i class="fa-solid fa-gear"></i></div>
                    </div>
                </div>

                <!-- Player List Section -->
                <div class="player-list-container">
                    <div class="player-list-header">
                        <div class="player-list-title">PLAYER LOBBY</div>
                    </div>
                    <div class="player-list">
                        <!-- Player entries will be added dynamically here -->
                    </div>
                    <div class="players-needed-footer">
                        <div class="player-count">
                            <i class="fa-solid fa-users"></i>
                            <span class="player-count-text">0 / 0 PLAYERS</span>
                        </div>
                    </div>
                </div>

                <!-- Character display in center -->
                <div class="character-display">
                    <!-- Player name above character -->
                    <div class="player-name">PLAYER</div>
                    <!-- 3D model viewer -->
                    <div class="model-viewer-container">
                        <canvas id="character-model-canvas"></canvas>
                    </div>
                </div>
                
                <!-- Season progress at bottom left -->
                <div class="season-progress-container">
                    <div class="season-label">PLAYER PROGRESS</div>
                    <div class="season-progress">
                        <div class="level-badge">1</div>
                        <div class="xp-progress">
                            <span class="xp-text">0 / 100 XP</span>
                            <div class="xp-bar-container">
                                <div class="xp-bar"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Show selector at bottom right -->
                <div class="show-selector-container">
                    <!-- Play button -->
                    <div class="play-button-container">
                        <button class="play-button">
                            <div class="play-text">PLAY!</div>
                            <div class="play-mode">Solo Show</div>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.addEventListeners();
    }

    openPanel() {
        super.openPanel();
        
        // Initialize the model viewer when the panel opens if it hasn't been initialized yet
        if (!this.modelViewer) {
            setTimeout(() => {
                if (document.getElementById('character-model-canvas')) {
                    this.modelViewer = new ModelViewer('character-model-canvas');
                    console.log('Model viewer initialized');
                    
                    // Note: the ModelViewer automatically loads the default model in its constructor
                }
            }, 100);
        }
        
        // Request current player count and player list
        hytopia.sendData({
            type: 'UI_ACTION',
            action: 'REQUEST_PLAYER_COUNT'
        });
    }

    handlePlayerModelUpdate(modelUri) {
        if (!this.modelViewer) {
            console.warn('Model viewer not initialized yet');
            return;
        }
        
        // Default to the base player model if none specified
		const modelPath = '/{{CDN_ASSETS_URL}}/models/players/player.gltf';
        this.modelViewer.loadModel(modelPath);
    }

    addEventListeners() {
        // Play button click
        const playButton = this.container.querySelector('.play-button');
        if (playButton) {
            playButton.addEventListener('click', () => {
                this.handlePlayButtonClick();
            });
        }

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Play game with Ctrl key
            if (e.key === 'Control' && this.isOpen) {
                this.handlePlayButtonClick();
            }
        });

        // Listen for hytopia data events
        hytopia.onData(data => {

            console.log('!!Received data', data.type);
            if (data.type === 'SHOW_MAIN_MENU') {
                this.openPanel();
                
                // Enable pointer in UI
                hytopia.sendData({
                    type: 'TOGGLE_POINTER_LOCK',
                    enabled: true
                });
            }
            
            // Handle close menu request (for spectator mode)
            if (data.type === 'CLOSE_MENU') {
                this.closePanel();
                
                // Disable pointer in UI
                hytopia.sendData({
                    type: 'TOGGLE_POINTER_LOCK',
                    enabled: false
                });
            }
            
            // Update player data if received
            if (data.type === 'PLAYER_DATA_UPDATE') {
                this.updatePlayerData(data.playerData);
            }
            
            // Update player count display
            if (data.type === 'PLAYER_COUNT_UPDATE') {
                this.updatePlayerCount(data.count, data.required);
            }

            // Update player list display
            if (data.type === 'PLAYER_LIST_UPDATE') {
                this.updatePlayerList(data.players);
            }
        });
    }

    handlePlayButtonClick() {
        console.log('Play button clicked - joining game');
        
        // Check if we have enough players
        const playerCountText = this.container.querySelector('.player-count-text');
        if (playerCountText) {
            // Extract current and required player counts
            const countMatch = playerCountText.innerText.match(/(\d+)\s*\/\s*(\d+)/);
            if (countMatch) {
                const currentCount = parseInt(countMatch[1]);
                const requiredCount = parseInt(countMatch[2]);
                
                if (currentCount < requiredCount) {
                    console.log(`Not enough players: ${currentCount}/${requiredCount}`);
                    
                    // Show message in chat
					hytopia.sendData({
						type: 'UI_ACTION',
						action: 'SHOW_CHAT_MESSAGE',
						payload: {
							message: `Not enough players to start! Need ${requiredCount - currentCount} more player...`
						}
					});
                    
                    // Don't join the game or lock cursor
                    return;
                }
            }
        }
        
        // If we have enough players or couldn't determine, proceed with joining
        hytopia.sendData({
            type: 'UI_ACTION',
            action: 'JOIN_GAME'
        });
        
    }
    
    // Calculate XP required for next level
    calculateXpForNextLevel(level) {
        const baseXP = 100;
        const growthFactor = 1.5;
        return Math.floor(baseXP * Math.pow(level, growthFactor));
    }
    
    // Calculate total XP needed to reach a level
    calculateTotalXpForLevel(level) {
        if (level <= 1) return 0;
        
        let totalXP = 0;
        for (let i = 1; i < level; i++) {
            totalXP += this.calculateXpForNextLevel(i);
        }
        return totalXP;
    }
    
    // Calculate current level and progress based on total XP
    calculateLevelFromXp(totalXp) {
        let level = 1;
        let xpForNextLevel = this.calculateXpForNextLevel(level);
        let accumulatedXp = 0;
        
        while (accumulatedXp + xpForNextLevel <= totalXp) {
            accumulatedXp += xpForNextLevel;
            level++;
            xpForNextLevel = this.calculateXpForNextLevel(level);
        }
        
        const currentLevelXp = totalXp - accumulatedXp;
        const progress = currentLevelXp / xpForNextLevel;
        
        return {
            level,
            currentLevelXp,
            xpForNextLevel,
            progress
        };
    }
    
    updatePlayerData(playerData) {
        if (!playerData) return;
        
        console.log('Updating player data', playerData);
        
        // Update player name if available
        if (playerData.playerName) {
            const playerNameElement = this.container.querySelector('.player-name');
            if (playerNameElement) {
                playerNameElement.textContent = playerData.playerName;
            }
        }
        
        // Update currency values (coins and crowns)
        if (playerData.coins !== undefined) {
            const kudosAmount = this.container.querySelector('.kudos .currency-amount');
            if (kudosAmount) kudosAmount.textContent = playerData.coins;
        }
        
        if (playerData.crowns !== undefined) {
            const crownsAmount = this.container.querySelector('.crowns .currency-amount');
            if (crownsAmount) crownsAmount.textContent = playerData.crowns;
        }
        
        // Update level information and XP bar
        if (playerData.xp !== undefined) {
            // Calculate level and progress based on total XP
            const xpInfo = this.calculateLevelFromXp(playerData.xp);
            
            // Update level badge
            const levelBadge = this.container.querySelector('.level-badge');
            if (levelBadge) levelBadge.textContent = xpInfo.level;
            
            // Update XP bar and text
            const xpBar = this.container.querySelector('.xp-bar');
            const xpText = this.container.querySelector('.xp-text');
            
            if (xpBar) {
                // Set the width based on progress percentage
                xpBar.style.width = `${xpInfo.progress * 100}%`;
            }
            
            if (xpText) {
                // Format XP numbers with commas for better readability
                const currentXP = xpInfo.currentLevelXp.toLocaleString();
                const nextLevelXP = xpInfo.xpForNextLevel.toLocaleString();
                
                // Show current level XP and XP needed for next level
                xpText.innerHTML = `<span class="current-xp">${currentXP}</span> / <span class="next-level-xp">${nextLevelXP}</span> XP`;
            }
        }
        
        // Update player model if available
        if (playerData.modelUri) {
            this.handlePlayerModelUpdate(playerData.modelUri);
        }
    }

    // Update the player count display
    updatePlayerCount(count, required) {
        const playerCountText = this.container.querySelector('.player-count-text');
        if (playerCountText) {
            const plural = (count === 1) ? 'PLAYER' : 'PLAYERS';
            playerCountText.innerHTML = `<span class="count-numbers">${count} / ${required}</span> ${plural}`;
            
            // Highlight if not enough players
            if (count < required) {
                playerCountText.classList.add('not-enough-players');
            } else {
                playerCountText.classList.remove('not-enough-players');
            }
        }
    }

    // Update the player list display
    updatePlayerList(players) {
        const playerList = this.container.querySelector('.player-list');
        if (!playerList) return;
        
        // Clear current list
        playerList.innerHTML = '';
        
        // Add player entries
        if (players && players.length > 0) {
            players.forEach(player => {
                const playerEntry = document.createElement('div');
                playerEntry.className = 'player-entry';
                
                const playerName = document.createElement('div');
                playerName.className = 'player-entry-name';
                playerName.textContent = player.name;
                
                const playerLevel = document.createElement('div');
                playerLevel.className = 'player-entry-level';
                playerLevel.innerHTML = `<span class="level-text">LVL</span> <span class="level-number">${player.level}</span>`;
                
                playerEntry.appendChild(playerName);
                playerEntry.appendChild(playerLevel);
                playerList.appendChild(playerEntry);
            });
        } else {
            // No players message
            const noPlayers = document.createElement('div');
            noPlayers.className = 'no-players-message';
            noPlayers.textContent = 'Waiting for players to join...';
            playerList.appendChild(noPlayers);
        }
    }
} 