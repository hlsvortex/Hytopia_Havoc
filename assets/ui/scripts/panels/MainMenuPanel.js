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
                        <div class="nav-icon search-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                        <div class="nav-icon home-icon active"><i class="fa-solid fa-house"></i></div>
                        <div class="nav-icon badge-icon"><i class="fa-solid fa-medal"></i></div>
                        <div class="nav-icon customize-icon"><i class="fa-solid fa-shirt"></i></div>
                        <div class="nav-icon settings-icon"><i class="fa-solid fa-gear"></i></div>
                        <div class="nav-icon store-icon"><i class="fa-solid fa-cart-shopping"></i></div>
                        <div class="nav-icon profile-icon"><i class="fa-solid fa-user"></i></div>
                    </div>
                    
                    <!-- Currency display -->
                    <div class="top-right-container">
                        <div class="currency-container">
                            <div class="currency kudos">
                                <div class="currency-icon"><i class="fa-solid fa-coins"></i></div>
                                <span class="currency-amount">1000</span>
                            </div>
                            <div class="currency crowns">
                                <div class="currency-icon"><i class="fa-solid fa-crown"></i></div>
                                <span class="currency-amount">5</span>
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
                    <div class="season-label">SEASON PROGRESS</div>
                    <div class="season-progress">
                        <div class="level-badge">10</div>
                        <div class="xp-bar-container">
                            <div class="xp-bar"></div>
                            <span class="xp-text">1544500</span>
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
        
        // Close the main menu panel
        this.closePanel();
        
        // Send chat command to join the game
        hytopia.sendData({
            type: 'CHAT_COMMAND',
            command: '/play'
        });
        
        // Disable pointer in UI
        hytopia.sendData({
            type: 'TOGGLE_POINTER_LOCK',
            enabled: false
        });
    }
    
    updatePlayerData(playerData) {
        if (!playerData) return;
        
        // Update level information
        if (playerData.level) {
            const levelBadge = this.container.querySelector('.level-badge');
            if (levelBadge) levelBadge.textContent = playerData.level;
            
            // Update XP bar
            if (playerData.xp && playerData.xpRequired) {
                const xpBar = this.container.querySelector('.xp-bar');
                const xpText = this.container.querySelector('.xp-text');
                const xpPercent = (playerData.xp / playerData.xpRequired) * 100;
                
                if (xpBar) xpBar.style.width = `${xpPercent}%`;
                if (xpText) xpText.textContent = playerData.xp;
            }
        }
        
        // Update currency values
        if (playerData.kudos !== undefined) {
            const kudosAmount = this.container.querySelector('.kudos .currency-amount');
            if (kudosAmount) kudosAmount.textContent = playerData.kudos;
        }
        
        if (playerData.crowns !== undefined) {
            const crownsAmount = this.container.querySelector('.crowns .currency-amount');
            if (crownsAmount) crownsAmount.textContent = playerData.crowns;
        }
    }
} 