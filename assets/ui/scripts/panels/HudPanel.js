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

        // Create mobile jump button (only visible on mobile)
        const mobileControls = document.createElement('div');
        mobileControls.className = 'mobile-controls';
        mobileControls.innerHTML = `
            <a id="mobile-jump-button" class="mobile-button">
                <i class="fa-solid fa-arrow-up"></i>
            </a>
        `;
        
        // Append to the main panel container managed by MenuSystem
        this.panelContainer = document.getElementById('panels-container'); 
        if (this.panelContainer) {
            this.panelContainer.appendChild(topBar);
            this.panelContainer.appendChild(mobileControls);
            this.elements.topBar = topBar; // Store reference
            this.elements.mobileControls = mobileControls; // Store reference
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
        
        // Set up mobile jump button events
        const mobileJumpButton = document.getElementById('mobile-jump-button');
        if (mobileJumpButton) {
            mobileJumpButton.addEventListener('touchstart', e => {
                e.preventDefault(); // Prevents mobile highlight/select/copy popup behaviors
                mobileJumpButton.classList.add('active'); // more immediate feedback
                hytopia.pressInput(' ', true); // Space is the jump input
            });
            
            mobileJumpButton.addEventListener('touchend', e => {
                e.preventDefault();
                mobileJumpButton.classList.remove('active');
                hytopia.pressInput(' ', false);
            });
        }
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
        if(this.elements.mobileControls) this.elements.mobileControls.style.display = ''; // Use default display mode
        this.isOpen = true; 
    }
    
    hide() {
        if(this.elements.topBar) this.elements.topBar.style.display = 'none';
        if(this.elements.mobileControls) this.elements.mobileControls.style.display = 'none';
        this.isOpen = false;
    }
    
    // Override open/close panel as HUD visibility is controlled differently
    openPanel() { this.show(); }
    closePanel() { this.hide(); }
}

// Add styles for mobile controls to the document head
const mobileControlsStyle = document.createElement('style');
mobileControlsStyle.textContent = `
    /* By default, when not on mobile we hide the mobile controls */
    .mobile-controls {
        display: none;
    }

    /* If on mobile, show the mobile controls */
    body.mobile .mobile-controls {
        display: flex;
        gap: 14px;
        position: fixed;
        bottom: 8vh; /* Responsive position based on viewport height */
        right: 8vw; /* Responsive position based on viewport width */
        z-index: 1000; /* Ensure it's above other UI elements */
    }

    /* Style for the mobile button */
    .mobile-button {
        background-color: rgba(0, 0, 0, 0.5);
        border: 4px solid rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        align-items: center;
        justify-content: center;
        display: flex;
        width: 22vmin; /* Responsive size based on viewport min dimension */
        height: 22vmin; /* Using vmin ensures it scales based on the smallest viewport dimension */
        min-width: 80px; /* Minimum size to ensure it's not too small on tiny screens */
        min-height: 80px;
        max-width: 350px; /* Maximum size to ensure it's not too large on big screens */
        max-height: 350px;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform, background-color;
        box-shadow: 0 6px 10px rgba(0, 0, 0, 0.2);
        font-size: calc(16px + 1.5vmin); /* Responsive font size */
        color: rgba(255, 255, 255, 0.9);
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    }

    .mobile-button.active {
        transform: scale(0.92);
        background-color: rgba(0, 0, 0, 0.75);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }
`;
document.head.appendChild(mobileControlsStyle);