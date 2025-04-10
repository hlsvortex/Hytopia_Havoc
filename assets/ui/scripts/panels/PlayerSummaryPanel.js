import { BasePanel } from '../BasePanel.js';

export default class PlayerSummaryPanel extends BasePanel {
    constructor() {
        super('player-summary-panel');
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div id="summary-overlay" class="summary-overlay">
                <div class="summary-header">ROUND SUMMARY</div>
                <div class="summary-content">
                    <div class="placement-info">
                        <div class="placement-rank">
                            <span id="placement-number">0</span>
                            <span class="placement-ordinal">th</span>
                        </div>
                        <div class="placement-text">PLACE</div>
                    </div>
                    
                    <div class="rewards-container">
                        <div class="reward-item">
                            <div class="reward-icon coin-icon"></div>
                            <div class="reward-amount"><span id="coins-earned">0</span> COINS</div>
                        </div>
                        <div class="reward-item">
                            <div class="reward-icon crown-icon"></div>
                            <div class="reward-amount"><span id="crowns-earned">0</span> CROWN<span id="crown-plural">S</span></div>
                        </div>
                    </div>
                    
                    <div class="summary-stats">
                        <div class="stat-item">
                            <span class="stat-label">Total Players:</span>
                            <span class="stat-value" id="total-players">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Rounds Played:</span>
                            <span class="stat-value" id="rounds-played">0</span>
                        </div>
                    </div>
                    
                    <button id="continue-button" class="continue-button">CONTINUE</button>
                </div>
            </div>
        `;
        this.elements = {
            overlay: this.container.querySelector('#summary-overlay'),
            placementNumber: this.container.querySelector('#placement-number'),
            placementOrdinal: this.container.querySelector('.placement-ordinal'),
            coinsEarned: this.container.querySelector('#coins-earned'),
            crownsEarned: this.container.querySelector('#crowns-earned'),
            crownPlural: this.container.querySelector('#crown-plural'),
            totalPlayers: this.container.querySelector('#total-players'),
            roundsPlayed: this.container.querySelector('#rounds-played'),
            continueButton: this.container.querySelector('#continue-button')
        };
        this.addEventListeners();
    }

    addEventListeners() {
        hytopia.onData(data => {
            if (data.type === 'SHOW_PLAYER_SUMMARY') {
                this.displaySummary(data);
            }
            if (data.type === 'CLOSE_PLAYER_SUMMARY') {
                this.closePanel();
            }
        });
        
        if (this.elements.continueButton) {
            this.elements.continueButton.addEventListener('click', () => {
                hytopia.sendData({ type: 'UI_ACTION', action: 'SUMMARY_CONTINUE' });
                this.closePanel();
            });
        }
    }

    displaySummary(data) {
        // Update placement with correct ordinal suffix
        if (this.elements.placementNumber) {
            this.elements.placementNumber.textContent = data.placement;
        }
        
        if (this.elements.placementOrdinal) {
            const ordinal = this.getOrdinalSuffix(data.placement);
            this.elements.placementOrdinal.textContent = ordinal;
        }
        
        // Update rewards
        if (this.elements.coinsEarned) {
            this.elements.coinsEarned.textContent = data.coinsEarned;
        }
        
        if (this.elements.crownsEarned) {
            this.elements.crownsEarned.textContent = data.crownsEarned;
            // Handle plural display
            if (this.elements.crownPlural) {
                this.elements.crownPlural.style.display = data.crownsEarned === 1 ? 'none' : 'inline';
            }
        }
        
        // Update stats
        if (this.elements.totalPlayers) {
            this.elements.totalPlayers.textContent = data.totalPlayers;
        }
        
        if (this.elements.roundsPlayed) {
            this.elements.roundsPlayed.textContent = data.roundsPlayed;
        }
        
        // Open the panel
        this.openPanel();
        
        // Add animation classes
        if (this.elements.overlay) {
            this.elements.overlay.classList.add('animate');
        }
    }
    
    getOrdinalSuffix(number) {
        const j = number % 10;
        const k = number % 100;
        
        if (j === 1 && k !== 11) {
            return 'st';
        }
        if (j === 2 && k !== 12) {
            return 'nd';
        }
        if (j === 3 && k !== 13) {
            return 'rd';
        }
        return 'th';
    }
    
    // Override open/close panel methods
    openPanel() {
        this.container.style.display = 'flex'; 
        this.isOpen = true;
    }

    closePanel() {
        // Remove animation classes
        if (this.elements.overlay) {
            this.elements.overlay.classList.remove('animate');
        }
        
        this.container.style.display = 'none';
        this.isOpen = false;
    }
} 