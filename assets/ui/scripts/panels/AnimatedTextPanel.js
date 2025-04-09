import { BasePanel } from '../BasePanel.js';

export default class AnimatedTextPanel extends BasePanel {
    constructor() {
        super('animated-text-panel');
        this.init();
        //this.hide(); // Start hidden
    }

    init() {
        this.container.innerHTML = `
            <div id="animated-text-overlay" class="animated-text-overlay">
                <div class="animated-text-line line-1"></div>
                <div class="animated-text-line line-2"></div>
            </div>
        `;
        this.elements = {
            overlay: this.container.querySelector('#animated-text-overlay'),
            line1: this.container.querySelector('.line-1'),
            line2: this.container.querySelector('.line-2'),
        };
        this.addEventListeners();
    }

    addEventListeners() {
        hytopia.onData(data => {
            if (data.type === 'SHOW_ANIMATED_TEXT') {
                this.showText(data.textLine1, data.textLine2, data.duration);
            }
        });
    }

    showText(line1 = '', line2 = '', duration = 3000) {
        if (!this.elements.overlay) return;
        
        this.elements.line1.textContent = line1;
        this.elements.line2.textContent = line2;
        
        // Reset animation classes
        this.elements.overlay.classList.remove('visible', 'animate-in', 'animate-out');
        
        // Trigger visibility and animation
        this.openPanel(); // Make container visible
        this.elements.overlay.classList.add('visible');
        this.elements.overlay.classList.add('animate-in');

        // Automatically hide after duration
        setTimeout(() => {
            this.elements.overlay.classList.add('animate-out');
             // Wait for fade out animation before hiding completely
             setTimeout(() => {
                 this.closePanel();
                 this.elements.overlay.classList.remove('visible', 'animate-in', 'animate-out');
             }, 500); // Matches animation duration
        }, duration);
    }
    
    // Override open/close panel to handle visibility correctly
    openPanel() {
        this.container.style.display = 'flex'; 
        this.isOpen = true;
    }

    closePanel() {
        this.container.style.display = 'none';
        this.isOpen = false;
    }
} 