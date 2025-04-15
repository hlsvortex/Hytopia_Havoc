import { BasePanel } from '../BasePanel.js';

export default class RoundResultsPanel extends BasePanel {
    constructor() {
        super('round-results-panel');
        this.eliminationDelay = 300; // ms delay between showing eliminated players
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div id="round-results-overlay" class="round-results-overlay">
                <div class="results-header">ROUND COMPLETE!</div>
                <div class="results-container">
                    <div class="results-columns">
                        <div class="results-column qualified-column">
                            <div class="column-header">QUALIFIED</div>
                            <ul class="player-list qualified-list"></ul>
                        </div>
                        <div class="results-column eliminated-column">
                            <div class="column-header">ELIMINATED</div>
                            <ul class="player-list eliminated-list"></ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.elements = {
            overlay: this.container.querySelector('#round-results-overlay'),
            qualifiedList: this.container.querySelector('.qualified-list'),
            eliminatedList: this.container.querySelector('.eliminated-list'),
        };
        this.addEventListeners();
    }

    addEventListeners() {
        hytopia.onData(data => {
            if (data.type === 'SHOW_ROUND_RESULTS') {
                this.displayResults(data.qualifiedPlayers || [], data.eliminatedPlayers || []);
            }
            if (data.type === 'CLOSE_ROUND_RESULTS') {
                this.closePanel();
            }
        });
    }

    displayResults(qualifiedPlayers = [], eliminatedPlayers = []) {
        if (!this.elements.overlay) return;

        // --- Populate Lists Immediately ---
        this.elements.qualifiedList.innerHTML = qualifiedPlayers
            .map(playerName => `<li class="player-item">${playerName}</li>`)
            .join('');
            
        // Initially hide eliminated status
        this.elements.eliminatedList.innerHTML = eliminatedPlayers
            .map(playerName => `<li class="player-item initial">${playerName}</li>`)
            .join('');
        // --- End Populate Lists ---

        this.openPanel(); // Show the panel
        
        // Add animation class
        setTimeout(() => {
            this.elements.overlay.classList.add('animate');
        }, 10);

        // --- Animate Elimination Reveal ---
        const eliminatedItems = this.elements.eliminatedList.querySelectorAll('li');
        eliminatedItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.remove('initial');
                item.classList.add('eliminated'); // Add class to trigger red styling/animation
            }, (index + 1) * this.eliminationDelay); // Stagger the reveal
        });
        // --- End Animate Elimination ---
        
        // TODO: Add logic to automatically close this panel or transition after animation?
        // This might be handled by GameManager based on the overall delay.
    }
    
    // Override open/close panel 
    openPanel() {
        this.container.style.display = 'flex'; 
        this.isOpen = true;
    }

    closePanel() {
        // Remove animation class first for smooth fade out
        if (this.elements.overlay) {
            this.elements.overlay.classList.remove('animate');
        }
        
        // Delay hiding to allow for fade out animation
        setTimeout(() => {
            this.container.style.display = 'none';
            this.isOpen = false;
            // Clear lists when closing
            if (this.elements.qualifiedList) this.elements.qualifiedList.innerHTML = '';
            if (this.elements.eliminatedList) this.elements.eliminatedList.innerHTML = '';
        }, 500);
    }
} 