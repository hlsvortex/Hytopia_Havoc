import { BasePanel } from '../BasePanel.js';

export default class PlayerSummaryPanel extends BasePanel {
    constructor() {
        super('player-summary-panel');
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div id="summary-overlay" class="summary-overlay">
                <div class="summary-header">YOUR REWARDS</div>
                <div class="summary-content">
                    <!-- Character display on the left -->
                    <div class="player-display">
                        <div class="player-model-container">
                            <i class="fa-solid fa-user-astronaut player-icon"></i>
                        </div>
                        <div class="placement-info">
                            <div class="placement-rank" id="placement-number">0</div>
                            <div class="placement-ordinal">th</div>
                            <div class="placement-text">PLACE</div>
                        </div>
                    </div>
                    
                    <!-- Rewards on the right -->
                    <div class="rewards-section">
                        <div class="rewards-row">
                            <div class="main-rewards-card">
                                <div class="rewards-title">Victory</div>
                                <div class="rewards-list">
                                    <div class="reward-item">
                                        <div class="reward-icon star-icon"><i class="fa-solid fa-coins"></i></div>
                                        <div class="reward-amount">+<span id="coins-earned">35</span></div>
                                    </div>
                                    <div class="reward-item">
                                        <div class="reward-icon xp-icon"><i class="fa-solid fa-bolt"></i></div>
                                        <div class="reward-amount">+<span id="xp-earned">3000</span></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="crown-card">
                                <div class="crown-icon"><i class="fa-solid fa-crown"></i></div>
                                <div class="crown-amount">+<span id="crowns-earned">1</span></div>
                            </div>
                        </div>
                        
                        <div class="button-container">
                            <button id="continue-button" class="continue-button play-button">
                                <div class="play-text">Claim</div>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Hidden div that still stores the original data -->
                    <div class="summary-stats" style="display: none;">
                        <div class="stat-item">
                            <span class="stat-label">Total Players:</span>
                            <span class="stat-value" id="total-players">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Rounds Played:</span>
                            <span class="stat-value" id="rounds-played-stat">0</span>
                        </div>
                    </div>
                </div>
                
                <!-- Confetti container (will be filled dynamically) -->
                <div id="confetti-container"></div>
            </div>
        `;
        this.elements = {
            overlay: this.container.querySelector('#summary-overlay'),
            placementNumber: this.container.querySelector('#placement-number'),
            placementOrdinal: this.container.querySelector('.placement-ordinal'),
            coinsEarned: this.container.querySelector('#coins-earned'),
            xpEarned: this.container.querySelector('#xp-earned'),
            crownsEarned: this.container.querySelector('#crowns-earned'),
            crownsSmall: this.container.querySelector('#crowns-small'),
            totalPlayers: this.container.querySelector('#total-players'),
            roundsPlayedStat: this.container.querySelector('#rounds-played-stat'),
            continueButton: this.container.querySelector('#continue-button'),
            confettiContainer: this.container.querySelector('#confetti-container')
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
            // Show coins earned
            const coinsBase = data.coinsEarned || 35;
            this.elements.coinsEarned.textContent = coinsBase;
        }
        
        // Calculate XP (better estimation for display)
        if (this.elements.xpEarned) {
            const estimatedXP = data.xpEarned || (data.placement === 1 ? 3000 : 
                                data.placement <= 3 ? 2000 : 
                                1000 + (11 - data.placement) * 200);
            this.elements.xpEarned.textContent = estimatedXP;
        }
        
        // Update small crown display
        if (this.elements.crownsSmall) {
            this.elements.crownsSmall.textContent = data.crownsEarned || 0;
        }
        
        // Update large crown display
        if (this.elements.crownsEarned) {
            this.elements.crownsEarned.textContent = data.crownsEarned || 0;
        }
        
        // Update stats (both visible and hidden versions)
        if (this.elements.totalPlayers) {
            this.elements.totalPlayers.textContent = data.totalPlayers;
        }
        
        if (this.elements.roundsPlayedStat) {
            this.elements.roundsPlayedStat.textContent = data.roundsPlayed;
        }
        
        // Open the panel
        this.openPanel();
        
        // Add animation classes
        if (this.elements.overlay) {
            this.elements.overlay.classList.add('animate');
        }
        
        // Create confetti
        this.createConfetti();
    }
    
    createConfetti() {
        if (!this.elements.confettiContainer) return;
        
        // Clear any existing confetti
        this.elements.confettiContainer.innerHTML = '';
        
        // Colors for confetti - brighter colors for better visibility
        const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8844', '#ff4488'];
        
        // Create 80 confetti elements
        for (let i = 0; i < 80; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // Random position
            const left = Math.random() * 100;
            
            // Random size
            const width = Math.random() * 8 + 4;
            const height = Math.random() * 12 + 8;
            
            // Random rotation
            const rotation = Math.random() * 360;
            
            // Random color
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // Random animation delay
            const delay = Math.random() * 3;
            
            // Random animation duration
            const duration = Math.random() * 2 + 3;
            
            // Apply styles
            confetti.style.left = `${left}%`;
            confetti.style.width = `${width}px`;
            confetti.style.height = `${height}px`;
            confetti.style.backgroundColor = color;
            confetti.style.transform = `rotate(${rotation}deg)`;
            confetti.style.animationDelay = `${delay}s`;
            confetti.style.animationDuration = `${duration}s`;
            
            this.elements.confettiContainer.appendChild(confetti);
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