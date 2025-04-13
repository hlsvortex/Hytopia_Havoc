import { BasePanel } from '../BasePanel.js';

export default class MainMenuPanel extends BasePanel {
    constructor() {
        super('main-menu-panel');
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

                <!-- Character display in center -->
                <div class="character-display">
                    <!-- Character will be shown here -->
                    <div class="character-placeholder">
                        <i class="fa-solid fa-person fa-5x"></i>
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
                    <div class="show-selector-button">
                        <span>SHOW SELECTOR</span>
                        <div class="key-shortcut">Ctrl</div>
                    </div>
                    
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
        });
    }

    handlePlayButtonClick() {
        console.log('Play button clicked - joining game');
        
        // Send JOIN_GAME action to the server via UIBridge
        hytopia.sendData({
            type: 'UI_ACTION',
            action: 'JOIN_GAME'
        });
        
        // No need to close panel here, server can decide if needed
        // this.closePanel();
        
        // Disable pointer in UI immediately for better feel
        hytopia.sendData({
            type: 'TOGGLE_POINTER_LOCK',
            enabled: false
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
    }
} 