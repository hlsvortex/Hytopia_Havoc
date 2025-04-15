import { BasePanel } from '../BasePanel.js';

export default class WinnerPanel extends BasePanel {
    constructor() {
        super('winner-panel');
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div id="winner-overlay" class="winner-overlay">
                <div class="winner-content">
                    <div class="winner-banner">
                        <div class="winner-player">
                            <div id="winner-name" class="winner-name">Player</div>
                            <div class="winner-message">HAS WON THE GAME!</div>
                            <div class="winner-icon-container">
                                <i class="fa-solid fa-crown"></i>
                            </div>
                        </div>
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
        // First make sure display is set before adding animation class
        this.container.style.display = 'block';
        
        // Update winner name
        if (this.elements.winnerName) {
            this.elements.winnerName.textContent = winnerName;
        }
        
        // Use setTimeout to ensure the animation triggers properly
        setTimeout(() => {
            if (this.elements.overlay) {
                this.elements.overlay.classList.add('animate');
            }
            this.isOpen = true;
        }, 10);
    }
    
    closePanel() {
        // Remove animation class first
        if (this.elements.overlay) {
            this.elements.overlay.classList.remove('animate');
        }
        
        // Add a small delay to allow the fade animation to complete
        setTimeout(() => {
            this.container.style.display = 'none';
            this.isOpen = false;
        }, 300);
    }
} 