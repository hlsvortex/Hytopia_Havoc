/**
 * CursorManager handles cursor locking and unlocking for the game.
 * It provides methods to lock and unlock the cursor, and keeps track of which UI elements
 * have requested the cursor to be unlocked.
 */
export class CursorManager {
    constructor() {
        this.isLocked = true;
        this.unlockRequests = new Set();
        this.debug = true;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the cursor manager
     */
    init() {
        this.log('CursorManager initialized');
        
        // Lock the cursor by default
        this.lockCursor();
        
        // Add event listener for the Escape key to handle exiting pointer lock
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isLocked) {
                this.unlockCursor('escape_key');
            }
        });
        
        // Handle clicks on the document to re-lock the cursor
        document.addEventListener('click', () => {
            // Only re-lock if there are no active unlock requests
            if (!this.isLocked && this.unlockRequests.size === 0) {
                this.lockCursor();
            }
        });
    }
    
    /**
     * Request the cursor to be unlocked
     * @param {string} requesterId - ID of the requester (e.g., 'inventory', 'loot')
     */
    requestUnlock(requesterId) {
        this.log(`Unlock requested by: ${requesterId}`);
        this.unlockRequests.add(requesterId);
        this.unlockCursor(requesterId);
    }
    
    /**
     * Release an unlock request
     * @param {string} requesterId - ID of the requester
     */
    releaseUnlock(requesterId) {
        this.log(`Unlock released by: ${requesterId}`);
        this.unlockRequests.delete(requesterId);
        
        // If there are no more unlock requests, lock the cursor
        if (this.unlockRequests.size === 0) {
            this.lockCursor();
        }
    }
    
    /**
     * Lock the cursor
     */
    lockCursor() {
        if (this.unlockRequests.size > 0) {
            this.log('Cannot lock cursor - active unlock requests exist');
            return;
        }
        
        this.log('Locking cursor');
        
        try {
            // Request pointer lock on the document element
            document.body.requestPointerLock();
            this.isLocked = true;
            
            // Send message to the game
            if (typeof hytopia !== 'undefined' && typeof hytopia.sendData === 'function') {
                hytopia.sendData({
                    type: 'cursorLocked'
                });
            }
        } catch (error) {
            console.error('Error locking cursor:', error);
        }
    }
    
    /**
     * Unlock the cursor
     * @param {string} reason - Reason for unlocking
     */
    unlockCursor(reason = 'unknown') {
        this.log(`Unlocking cursor (reason: ${reason})`);
        
        try {
            // Exit pointer lock
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            
            this.isLocked = false;
            
            // Send message to the game
            if (typeof hytopia !== 'undefined' && typeof hytopia.sendData === 'function') {
                hytopia.sendData({
                    type: 'cursorUnlocked'
                });
            }
        } catch (error) {
            console.error('Error unlocking cursor:', error);
        }
    }
    
    /**
     * Check if the cursor is locked
     * @returns {boolean} True if the cursor is locked
     */
    isCursorLocked() {
        return this.isLocked;
    }
    
    /**
     * Log a message if debug is enabled
     * @param {string} message - Message to log
     */
    log(message) {
        if (this.debug) {
            console.log(`[CursorManager] ${message}`);
        }
    }
}

// Create a singleton instance
const cursorManager = new CursorManager();
export default cursorManager; 