import { BasePanel } from '../BasePanel.js';
import { MenuType } from '../MenuType.js';

export default class LevelSelectPanel extends BasePanel {
    constructor() {
        super('level-select-panel');
        this.init();
        this.currentLevelIndex = 0;
        this.levelSelectionInterval = null;
        this.countdownInterval = null;
        
        // Default levels in case server doesn't provide any
        this.levels = [
            { id: 'seesaw', name: 'Seesaw Showdown', image: 'level_seesaw.jpg', description: 'Navigate the treacherous seesaws to reach the finish line!', type: 'Race' },
            { id: 'gatecrash', name: 'Gate Crash', image: 'level_gatecrash.jpg', description: 'Bash through the doors and race to the finish!', type: 'Race' },
            { id: 'rotatingbeam', name: 'Spinning Beam Blitz', image: 'level_default.jpg', description: 'Dodge the spinning beams and race to the finish line!', type: 'Race' }
            // Add more level details here matching the structure
        ];
    }

    init() {
        // Main container with state classes
        this.container.innerHTML = `
            <div id="level-select" class="level-select"> 
                
                <!-- State 1: Randomizing Display -->
                <div class="randomizing-container">
                    <div class="randomizing-header">
                        <h1><i class="fa-solid fa-map-location-dot fa-bounce"></i> SELECTING ROUND</h1>
                    </div>
                    <div class="level-display-randomizing">
                        <div class="level-image-container">
                             <div class="level-badge">
                                <i class="fa-solid fa-trophy"></i>
                             </div>
                             <img class="level-image" src="">
                        </div>
                        <div class="level-info-randomizing">
                             <h2 class="level-name"><i class="fa-solid fa-medal"></i> <span class="name-text"></span></h2>
                             <p class="level-description"><i class="fa-solid fa-lightbulb"></i> <span class="description-text"></span></p>
                        </div>
                    </div>
                </div>

                <!-- State 2: Selected Level Details (Initially Hidden) -->
                <div class="selected-details-container hidden">
                    <div class="selected-level-header">
                        <span class="header-level-name">DIZZY HEIGHTS</span> 
                    </div>
                    <div class="selected-level-content">
                        <div class="selected-preview-col">
                             <img class="selected-level-image" src="">
                        </div>
                        <div class="selected-info-col">
                            <div class="level-type-tag-container">
                                <span class="level-type-tag">RACE</span>
                            </div>
                            <h3 class="how-to-play-title">HOW TO PLAY</h3>
                            <p class="selected-level-description">Navigate the obstacles and race to the finish line!</p>
                            
                            <h4 class="medals-title">MEDALS</h4>
                            <div class="medals-container">
                                <div class="medal-item gold">
                                    <div class="medal-header">Gold</div>
                                    <div class="medal-icon"><i class="fa-solid fa-medal"></i></div>
                                    <div class="medal-req">Place 1st</div>
                                </div>
                                <div class="medal-item silver">
                                     <div class="medal-header">Silver</div>
                                     <div class="medal-icon"><i class="fa-solid fa-medal"></i></div>
                                     <div class="medal-req">Place Top 20%</div>
                                </div>
                                <div class="medal-item bronze">
                                     <div class="medal-header">Bronze</div>
                                     <div class="medal-icon"><i class="fa-solid fa-medal"></i></div>
                                     <div class="medal-req">Place Top 50%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- State 3: Countdown Overlay (Initially Hidden) -->
                <div class="countdown-container hidden">
                    <h2><i class="fa-solid fa-clock"></i> STARTING IN</h2>
                    <div class="countdown">3</div>
                </div>

            </div>
        `;

        this.addEventListeners();
    }

    addEventListeners() {
        // Listen for data from the server using onData instead of onChatMessage
        hytopia.onData(data => {
            console.log('Received data:', data);
            
            // Check if the data contains level information
            if (data.type === 'LEVEL_SELECT_DATA' && Array.isArray(data.levels)) {
                console.log(`Received ${data.levels.length} levels from server`);
                this.levels = data.levels.map(l => ({ // Ensure structure matches
                    id: l.id,
                    name: l.name || 'Unknown Level',
                    image: l.image || 'level_default.jpg',
                    description: l.description || 'No description available.',
                    type: l.type || 'Race' // Default to Race if type missing
                }));
            }
            
            // Show level selection when requested
            if (data.type === 'SHOW_LEVEL_SELECT') {
                this.openPanel();
                this.startLevelSelection();
            }
        });
    }

    startLevelSelection() {
        // --- Clear any existing intervals first --- 
        if (this.levelSelectionInterval) {
            clearInterval(this.levelSelectionInterval);
            this.levelSelectionInterval = null;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        // --- End Interval Clearing --- 
        
        const panelElement = this.container.querySelector('#level-select');
        const randomizingContainer = this.container.querySelector('.randomizing-container');
        const detailsContainer = this.container.querySelector('.selected-details-container');
        const countdownContainer = this.container.querySelector('.countdown-container');
        const randomizingDisplay = this.container.querySelector('.level-display-randomizing');

        // --- Reset to Randomizing State --- 
        panelElement.className = 'level-select'; // Reset classes
        if(randomizingContainer) randomizingContainer.classList.remove('hidden');
        if(detailsContainer) detailsContainer.classList.add('hidden');
        if(countdownContainer) countdownContainer.classList.add('hidden');
        if (randomizingDisplay) {
            randomizingDisplay.classList.add('level-cycling');
        }
        console.log("[UI] Starting level selection randomization.");
        // --- End Reset --- 

        this.currentLevelIndex = 0;
        this.updateLevelDisplay(true); // Update the randomizing view
        
        this.levelSelectionInterval = setInterval(() => {
            this.currentLevelIndex = (this.currentLevelIndex + 1) % this.levels.length;
            this.updateLevelDisplay(true); // Update the randomizing view
        }, 150);
        
        // After 3 seconds, stop and transition
        setTimeout(() => {
            clearInterval(this.levelSelectionInterval);
            this.currentLevelIndex = Math.floor(Math.random() * this.levels.length);
            const selectedLevel = this.levels[this.currentLevelIndex];
            
            // --- Transition to Selected Details State --- 
            if (randomizingDisplay) randomizingDisplay.classList.remove('level-cycling');
            if(randomizingContainer) randomizingContainer.classList.add('hidden'); // Hide randomizing view
            if(detailsContainer) detailsContainer.classList.remove('hidden'); // Show details view
            panelElement.classList.add('state-selected-details');
            this.updateLevelDisplay(false); // Update the details view
            console.log("[UI] Transitioning to selected details view.");
            // --- End Transition --- 
            
            // --- Send selected level to server --- 
            console.log(`[UI] Level selected: ${selectedLevel.id}. Sending to server.`);
            hytopia.sendData({
                type: 'UI_ACTION',
                action: 'LEVEL_SELECTED',
                payload: { levelId: selectedLevel.id }
            });
            // --- End Send --- 

            // Show details for 5 seconds, then start countdown
            console.log("[UI] Displaying selected level info for 5 seconds...");
            setTimeout(() => {
                this.showCountdown();
            }, 5000); 
            
        }, 3000); // Duration of level cycling 
    }
    
    updateLevelDisplay(isRandomizingView) {
        // --- Guard: Only update if panel is considered open --- 
        if (!this.isOpen) {
            // console.log("[UI] updateLevelDisplay called while panel closed. Skipping."); // Optional log
            return; 
        }
        // --- End Guard ---
        
        const level = this.levels[this.currentLevelIndex];
        if (!level) return; // Guard if levels aren't loaded

        if (isRandomizingView) {
            // Update Randomizing View elements
            const levelImage = this.container.querySelector('.level-display-randomizing .level-image');
            const levelNameText = this.container.querySelector('.level-display-randomizing .name-text');
            const levelDescriptionText = this.container.querySelector('.level-display-randomizing .description-text');

            if (levelNameText) levelNameText.textContent = level.name;
            if (levelDescriptionText) levelDescriptionText.textContent = level.description;
            if (levelImage) levelImage.src = `${hytopia.cdnAssetsUrl}/ui/images/${level.image}`; 
            // Add error handling for image if needed
            // Handle image error more gracefully to avoid console spam if needed
             if (levelImage) {
                levelImage.onerror = () => { 
                    if (this.isOpen) { // Check again inside onerror
                       levelImage.src = `${hytopia.cdnAssetsUrl}/ui/images/level_default.jpg`; 
                    }
                };
                levelImage.src = `${hytopia.cdnAssetsUrl}/ui/images/${level.image}`;
            }
        } else {
             // Update Selected Details View elements
            const headerLevelName = this.container.querySelector('.header-level-name');
            const selectedImage = this.container.querySelector('.selected-level-image');
            const description = this.container.querySelector('.selected-level-description');
            const typeTag = this.container.querySelector('.level-type-tag');

            if (headerLevelName) headerLevelName.textContent = level.name.toUpperCase();
            if (description) description.textContent = level.description;
            if (typeTag) typeTag.textContent = level.type.toUpperCase();
            if (selectedImage) {
                selectedImage.onerror = () => { 
                    if (this.isOpen) { // Check again inside onerror
                        selectedImage.src = `${hytopia.cdnAssetsUrl}/ui/images/level_default.jpg`; 
                    }
                };
                selectedImage.src = `${hytopia.cdnAssetsUrl}/ui/images/${level.image}`;
            }
            // TODO: Potentially update medal requirements based on level data if available
        }
    }
    
    showCountdown() {
        const panelElement = this.container.querySelector('#level-select');
        const detailsContainer = this.container.querySelector('.selected-details-container');
        const countdownContainer = this.container.querySelector('.countdown-container');
        
        // --- Transition to Countdown State --- 
        panelElement.classList.remove('state-selected-details'); // Remove previous state
        panelElement.classList.add('state-countdown-active'); // Add countdown state
        if(detailsContainer) detailsContainer.classList.add('hidden'); // Hide details view
        if(countdownContainer) countdownContainer.classList.remove('hidden'); // Show countdown
        console.log("[UI] Transitioning to countdown view.");
        // --- End Transition --- 

        const countdownElement = countdownContainer.querySelector('.countdown');
        if (countdownElement) countdownElement.textContent = 3; 

        console.log("[UI] Countdown UI shown. Waiting 3 seconds before starting 3-2-1...");
        setTimeout(() => {
            console.log("[UI] Starting visual 3-2-1 countdown...");
            let count = 3; 
            if (countdownElement) countdownElement.textContent = count;
                
            this.countdownInterval = setInterval(() => {
                count--;
                if (countdownElement) countdownElement.textContent = count;
                
                if (count <= 0) {
                    clearInterval(this.countdownInterval);
                    if(countdownContainer) countdownContainer.classList.add('flash');
                    
                    console.log("[UI] Countdown finished. Sending ROUND_READY.");
                    hytopia.sendData({ type: 'UI_ACTION', action: 'ROUND_READY' });
                    
                    setTimeout(() => {
                         panelElement.classList.remove('state-countdown-active'); 
                         this.closePanel();
                    }, 500); 
                }
            }, 1000); 

        }, 3000); 
    }

    // Override closePanel from BasePanel to add specific cleanup
    closePanel() {
        super.closePanel(); // Call the parent method to handle basic closing
        
        // --- Clear intervals specific to this panel --- 
        if (this.levelSelectionInterval) {
            console.log("[UI] Clearing level selection interval on close.");
            clearInterval(this.levelSelectionInterval);
            this.levelSelectionInterval = null;
        }
        if (this.countdownInterval) {
            console.log("[UI] Clearing countdown interval on close.");
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        // --- End Interval Clearing --- 
        
        // Optional: Reset any state classes if needed when closing prematurely
        const panelElement = this.container.querySelector('#level-select');
         if(panelElement) {
            panelElement.classList.remove('state-selected-details', 'state-countdown-active');
         }
    }
} 