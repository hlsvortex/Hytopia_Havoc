import { World, Player, PlayerEntity, type Vector3Like } from 'hytopia';
import { SurvivalLevelController } from '../core/SurvivalLevelController';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { UIBridge } from '../core/UIBridge';
import { GameManager } from '../core/GameManager';
import { Logger } from '../utils/Logger';

/**
 * TopDrop Level Controller - platforms disappear after players stand on them
 * This is a survival-type level where blocks disappear after a player walks on them
 * 
 * Configuration options:
 * - blockDisappearTime: Time in milliseconds before a block disappears (default: 500ms)
 * - floorLevel: The Y coordinate for the floor (default: 41)
 * 
 * Example config:
 * {
 *   id: 'topdrop',
 *   blockDisappearTime: 1000, // 1 second
 *   floorLevel: 45, // Set custom floor level
 *   showTimer: false, // Hide the timer (inherited from SurvivalLevelController)
 *   // other standard level config properties
 * }
 */
export class TopDropLevelController extends SurvivalLevelController {
    private disappearingBlocks: Map<string, number> = new Map();
    private playerPositions: Map<string, Vector3Like> = new Map();
    private floorLevel: number = 41; // Default floor Y coordinate
    private blockDisappearTime: number = 500; // Default time in ms before blocks disappear
    private logger = new Logger('TopDropLevelController');
    private blockRemovalInterval: NodeJS.Timeout | null = null;
    
    /**
     * Create a new TopDrop level controller
     * @param world Game world
     * @param config Level configuration
     * @param uiBridge UI bridge
     * @param gameManager Game manager instance
     */
    constructor(
        world: World,
        config: LevelConfiguration,
        uiBridge: UIBridge | null = null,
        gameManager: GameManager
    ) {
        super(world, config, uiBridge, gameManager);
        this.logger.log('Top Drop level controller initialized');
        
        // Check if blockDisappearTime is specified in config
        if (config && typeof (config as any).blockDisappearTime === 'number') {
            this.blockDisappearTime = (config as any).blockDisappearTime;
            this.logger.log(`Block disappear time set to ${this.blockDisappearTime}ms from config`);
        } else {
            this.logger.log(`Using default block disappear time: ${this.blockDisappearTime}ms`);
        }
        
        // Check if floorLevel is specified in config
        if (config && typeof (config as any).floorLevel === 'number') {
            this.floorLevel = (config as any).floorLevel;
            this.logger.log(`Floor level set to Y=${this.floorLevel} from config`);
        }
        
        // Set TopDrop-specific goal message
        this.setGoalMessage('Stay on the platforms!');
        
        this.logger.log(`Floor level set to Y=${this.floorLevel}`);
    }

    /**
     * Activate this level - load the map and set up the play area
     */
    public override loadLevel(): void {
        this.loadMap();
        this.setupCourseBoundaries();
    }

    /**
     * Define start areas for TopDrop level
     */
    protected setupCourseBoundaries(): void {
        // Central start area
        this.addStartArea(
            { x: 14, y: this.floorLevel, z: 9 },
            { x: 3, y: this.floorLevel, z: -10 },
            42 // Spawn Height
        );
    }

    /**
     * Set up the tick handler to check for players standing on blocks and make them disappear
     */
    protected startTickHandler(): void {
        // Clear any existing interval
        if (this.blockRemovalInterval) {
            clearInterval(this.blockRemovalInterval);
            this.blockRemovalInterval = null;
        }

        // Set up new interval for block checking
        this.blockRemovalInterval = setInterval(() => {
            this.checkBlocksUnderPlayers();
        }, 50);

        this.logger.log('Tick handler set up');
    }
    
    /**
     * Process tick updates - check for blocks under players and schedule them for removal
     */
    private checkBlocksUnderPlayers(): void {
        const currentTime = Date.now();
        const blocksToRemove: string[] = [];
        
        // Check which blocks need to be removed
        this.disappearingBlocks.forEach((disappearTime, blockKey) => {
            if (currentTime >= disappearTime) {
                blocksToRemove.push(blockKey);
                
                // Parse block position
                const [xStr, yStr, zStr] = blockKey.split(',');
                const x = parseInt(xStr);
                const y = parseInt(yStr);
                const z = parseInt(zStr);
                
                // Remove the block
                try {
                    this.world.chunkLattice.setBlock({ x, y, z }, 0);
                   // this.logger.log(`Removed block at ${x}, ${y}, ${z}`);
                } catch (error) {
                    this.logger.error(`Failed to remove block at ${x}, ${y}, ${z}: ${error}`);
                }
            }
        });
        
        // Remove processed blocks from tracking
        blocksToRemove.forEach(key => {
            this.disappearingBlocks.delete(key);
        });
        
        // Check each player position
        const players = this.gameManager.getPlayers();
        for (const player of players) {
            const playerId = player.id;
            const playerEntity = this.gameManager.getPlayerEntity(playerId);
            
            if (!playerEntity || !player || !playerEntity.isSpawned) continue;
            
            // Skip eliminated players
            if (this.eliminatedPlayerIds.has(playerId)) continue;
            
            // Get player position
            const position = playerEntity.position;
            
            // Calculate the fractional parts of position to check if near an edge
            const xFraction = position.x - Math.floor(position.x);
            const zFraction = position.z - Math.floor(position.z);
            
            // Check the block beneath the player
            const blockPos = {
                x: Math.floor(position.x),
                y: Math.floor(position.y) - 1, // Block beneath player
                z: Math.floor(position.z)
            };

            // Update player position tracking
            this.playerPositions.set(playerId, { ...position });
            
            // Mark blocks for disappearing
            this.checkAndMarkBlock(blockPos);
            
            // Check adjacent blocks if player is close to an edge (within 0.1 units)
            const edgeThreshold = 0.1;
            
            // Check if near left edge (low X)
            if (xFraction <= edgeThreshold) {
                this.checkAndMarkBlock({
                    x: blockPos.x - 1,
                    y: blockPos.y,
                    z: blockPos.z
                });
            }
            
            // Check if near right edge (high X)
            if (xFraction >= (1 - edgeThreshold)) {
                this.checkAndMarkBlock({
                    x: blockPos.x + 1,
                    y: blockPos.y,
                    z: blockPos.z
                });
            }
            
            // Check if near back edge (low Z)
            if (zFraction <= edgeThreshold) {
                this.checkAndMarkBlock({
                    x: blockPos.x,
                    y: blockPos.y,
                    z: blockPos.z - 1
                });
            }
            
            // Check if near front edge (high Z)
            if (zFraction >= (1 - edgeThreshold)) {
                this.checkAndMarkBlock({
                    x: blockPos.x,
                    y: blockPos.y,
                    z: blockPos.z + 1
                });
            }
            
            // Check diagonal blocks if in corner
            if (xFraction <= edgeThreshold && zFraction <= edgeThreshold) {
                this.checkAndMarkBlock({
                    x: blockPos.x - 1,
                    y: blockPos.y,
                    z: blockPos.z - 1
                });
            }
            
            if (xFraction <= edgeThreshold && zFraction >= (1 - edgeThreshold)) {
                this.checkAndMarkBlock({
                    x: blockPos.x - 1,
                    y: blockPos.y,
                    z: blockPos.z + 1
                });
            }
            
            if (xFraction >= (1 - edgeThreshold) && zFraction <= edgeThreshold) {
                this.checkAndMarkBlock({
                    x: blockPos.x + 1,
                    y: blockPos.y,
                    z: blockPos.z - 1
                });
            }
            
            if (xFraction >= (1 - edgeThreshold) && zFraction >= (1 - edgeThreshold)) {
                this.checkAndMarkBlock({
                    x: blockPos.x + 1,
                    y: blockPos.y,
                    z: blockPos.z + 1
                });
            }
        }
    }
    
    /**
     * Check if a block exists at position and mark it for disappearing
     */
    private checkAndMarkBlock(blockPos: Vector3Like): void {
        try {
            // Get block at position
            const blockId = this.world.chunkLattice.getBlockId(blockPos);
            
            // If there's a block (not air) and it's not already scheduled for removal
            if (blockId !== 0) {
                const blockKey = `${blockPos.x},${blockPos.y},${blockPos.z}`;
                
                // If not already scheduled to disappear
                if (!this.disappearingBlocks.has(blockKey)) {
                    // Schedule block to disappear using configured time
                    this.disappearingBlocks.set(blockKey, Date.now() + this.blockDisappearTime);
                }
            }
        } catch (error) {
            this.logger.error(`Error checking block at position (${blockPos.x}, ${blockPos.y}, ${blockPos.z}): ${error}`);
        }
    }

    /**
     * Begin gameplay - start tick handler and activate parent behavior
     */
    public override beginGameplay(): void {
        super.beginGameplay();
        this.startTickHandler();
    }
    
    /**
     * Start the round
     */
    public override startRound(players: Player[], qualificationTarget: number): void {
        this.logger.log(`Starting round with ${players.length} players. Target: ${qualificationTarget}`);
        super.startRound(players, qualificationTarget);
        
        // Clear any existing blocks scheduled for removal
        this.disappearingBlocks.clear();
        
        // Clear player position tracking
        this.playerPositions.clear();
    }
    
    /**
     * Clean up resources
     */
    public override cleanup(): void {
        this.logger.log('Cleaning up Top Drop level');
        
        // Clear block tracking
        this.disappearingBlocks.clear();
        
        // Clear player positions
        this.playerPositions.clear();
        
        // Clear interval
        if (this.blockRemovalInterval) {
            clearInterval(this.blockRemovalInterval);
            this.blockRemovalInterval = null;
        }
        
        // Call parent cleanup
        super.cleanup();
    }
} 