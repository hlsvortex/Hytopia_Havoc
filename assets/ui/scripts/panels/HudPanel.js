import { BasePanel } from '../BasePanel.js';

export default class HudPanel extends BasePanel {
    constructor() {
        // HUD is special: it doesn't have a container ID in HTML by default,
        // it just adds elements directly to the main container.
        // We'll manage its visibility differently.
        super('hud-panel', true); // Mark as always open conceptually
        this.elements = {};
        this.init();
        this.hide(); // Start hidden until game starts
    }

    init() {
        // Create HUD elements programmatically
        const topBar = document.createElement('div');
        topBar.id = 'hud-top-bar';
        topBar.className = 'hud-top-bar';

        const goalContainer = document.createElement('div');
        goalContainer.className = 'hud-goal-container';
        goalContainer.innerHTML = `
            <div class="hud-goal-text">Race to the Finish!</div>
        `;
        this.elements.goalText = goalContainer.querySelector('.hud-goal-text');

        const statusContainer = document.createElement('div');
        statusContainer.className = 'hud-status-container';
        statusContainer.innerHTML = `
            <div class="hud-status-label">QUALIFIED</div>
            <div class="hud-status-count">0 / 15</div>
            <div class="hud-timer hidden"><i class="fa-solid fa-stopwatch"></i> <span class="timer-value">1:30</span></div>
        `;
        this.elements.statusLabel = statusContainer.querySelector('.hud-status-label');
        this.elements.statusCount = statusContainer.querySelector('.hud-status-count');
        this.elements.timer = statusContainer.querySelector('.hud-timer');
        this.elements.timerValue = statusContainer.querySelector('.timer-value');

        topBar.appendChild(goalContainer);
        topBar.appendChild(statusContainer);

        // Append to the main panel container managed by MenuSystem
        this.panelContainer = document.getElementById('panels-container'); 
        if (this.panelContainer) {
            this.panelContainer.appendChild(topBar);
             this.elements.topBar = topBar; // Store reference
        } else {
            console.error("HUDPanel: Could not find panels-container element!");
        }
        
        this.addEventListeners();
    }

    addEventListeners() {
        hytopia.onData(data => {
            if (data.type === 'UPDATE_HUD') {
                this.updateHud(data.hudData);
            }
             if (data.type === 'SHOW_HUD') {
                this.show();
            }
            if (data.type === 'HIDE_HUD') {
                this.hide();
            }
        });
    }

    updateHud(hudData) {
        if (!hudData || !this.elements.topBar) return;

        this.show(); // Ensure HUD is visible when updated

        if (hudData.goal) {
            this.elements.goalText.textContent = hudData.goal;
        }

        // Update Status (Qualified/Eliminated)
        if (hudData.statusLabel) {
            this.elements.statusLabel.textContent = hudData.statusLabel.toUpperCase();
        }
        if (hudData.currentCount !== undefined && hudData.totalCount !== undefined) {
            this.elements.statusCount.textContent = `${hudData.currentCount} / ${hudData.totalCount}`;
             // Optional: Add class based on label for styling
            const statusContainer = this.elements.statusLabel.parentElement;
            if(hudData.statusLabel.toLowerCase() === 'eliminated') {
                statusContainer.classList.add('status-eliminated');
                statusContainer.classList.remove('status-qualified');
            } else {
                 statusContainer.classList.add('status-qualified');
                 statusContainer.classList.remove('status-eliminated');
            }
        }

        // Update Timer
        if (hudData.timer !== undefined && hudData.timer !== null) {
            this.elements.timer.classList.remove('hidden');
            const minutes = Math.floor(hudData.timer / 60);
            const seconds = hudData.timer % 60;
            this.elements.timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            // Optional: Add warning class if time is low
            if(hudData.timer <= 15) { 
                this.elements.timer.classList.add('low-time');
            } else {
                this.elements.timer.classList.remove('low-time');
            }
        } else {
            this.elements.timer.classList.add('hidden');
             this.elements.timer.classList.remove('low-time');
        }
    }
    
    show() {
        if(this.elements.topBar) this.elements.topBar.style.display = 'flex';
        this.isOpen = true; 
    }
    
    hide() {
         if(this.elements.topBar) this.elements.topBar.style.display = 'none';
         this.isOpen = false;
    }
    
    // Override open/close panel as HUD visibility is controlled differently
    openPanel() { this.show(); }
    closePanel() { this.hide(); }
} 