import { BasePanel } from '../BasePanel.js';

export default class WinnerPanel extends BasePanel {
    constructor() {
        super('winner-panel');
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div id="winner-overlay" class="winner-overlay">
                <div class="winner-header">WINNER!</div>
                <div class="winner-content">
                    <div class="winner-player">
                        <div class="winner-crown"></div>
                        <div id="winner-name" class="winner-name">Player</div>
                    </div>
                    <div class="winner-message">Congratulations!</div>
                    <div class="winner-stats">
                        <div class="stat">Last Player Standing</div>
                    </div>
                </div>
            </div>
        `;
        this.elements = {
            overlay: this.container.querySelector('#winner-overlay'),
            winnerName: this.container.querySelector('#winner-name')
        };
        this.addEventListeners();
    }

    addEventListeners() {
        hytopia.onData(data => {
            if (data.type === 'SHOW_WINNER') {
                this.showWinner(data.winnerName);
            }
            if (data.type === 'CLOSE_WINNER') {
                this.closePanel();
            }
        });
    }

    showWinner(winnerName = 'Player') {
        // Update winner name
        if (this.elements.winnerName) {
            this.elements.winnerName.textContent = winnerName;
        }
        
        // Open the panel
        this.openPanel();
        
        // Add animation classes
        if (this.elements.overlay) {
            this.elements.overlay.classList.add('animate');
        }
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