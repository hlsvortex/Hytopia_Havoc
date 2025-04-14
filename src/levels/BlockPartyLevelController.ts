import { World, PlayerEntity, Entity, type Vector3Like, Player, EntityEvent, RigidBodyType, CollisionGroup, ColliderShape } from 'hytopia';
import { SurvivalLevelController } from '../core/SurvivalLevelController';
import { type LevelConfiguration } from '../config/LevelConfiguration';
import { UIBridge } from '../core/UIBridge';
import { GameManager } from '../core/GameManager';
import { Logger } from '../utils/Logger';
import ObstacleEntity from '../obsticals/ObstacleEntity';

/**
 * BlockParty Level Controller - Blocks move toward players on a platform, and players must dodge them
 * This is a survival-type level where blocks push players off the platform
 * 
 * Configuration options:
 * - blockSpawnInterval: Time in milliseconds between block spawns (default: 2000ms)
 * - blockSpeed: Speed multiplier for blocks (default: 1.0)
 * - blockDespawnDistance: Distance after which blocks despawn (default: 20)
 * 
 * Example config:
 * {
 *   id: 'blockparty',
 *   blockSpawnInterval: 2000, // Spawn blocks every 2 seconds
 *   blockSpeed: 1.2, // 20% faster blocks
 *   showTimer: true, // Show the timer (inherited from SurvivalLevelController)
 *   timeLimitSeconds: 60, // 60-second rounds
 *   // other standard level config properties
 * }
 */

// Define interfaces for block patterns
interface BlockDefinition {
    xOffset: number;
    zOffset: number; // Add z-offset for 3D patterns
    yOffset: number; // Add y-offset for 3D patterns
    size: Vector3Like;
}

interface BlockPattern {
    color: number;
    block: string;
    blocks: BlockDefinition[];
}

export class BlockPartyLevelController extends SurvivalLevelController {
    private blockSpawnInterval: number = 2000; // Default: spawn a block every 2 seconds
    private blockSpeed: number = 1.0; // Default speed multiplier
    private blockDespawnDistance: number = 40; // Default despawn distance
    private activeBlocks: Entity[] = [];
    private blockSpawnTimeout: NodeJS.Timeout | null = null;
    private platformBounds: {min: Vector3Like, max: Vector3Like} = {
        min: {x: -15, y: 4, z: -15},
        max: {x: 15, y: 4, z: -15}
    };
    private logger = new Logger('BlockPartyLevelController');
    
    // Block types for variety - now supporting patterns of multiple blocks
    private blockPatterns: BlockPattern[] = [
        // Single blocks
        
        // Pattern: 3 small blocks with 2-block gaps
        {
            color: 0xFF00FF,
            block: 'blocks/gold-ore.png',
            blocks: [
				{ xOffset: -9, zOffset: 0, yOffset: 0, size: { x: 1, y: 1, z: 0.5 } },
                { xOffset: -4, zOffset: 0, yOffset: 0, size: {x: 1, y: 1, z: 0.5} },
                { xOffset: 0, zOffset: 0, yOffset: 0, size: {x: 1, y: 1, z: 0.5} },
                { xOffset: 4, zOffset: 0, yOffset: 0, size: {x: 1, y: 1, z: 0.5} },
				{ xOffset: 9, zOffset: 0, yOffset: 0, size: { x: 1, y: 1, z: 0.5 } }

            ]
        },
        
        // Pattern: 5 small blocks in a row with 1-block gaps
        {
            color: 0xFFFF00,
            block: 'blocks/diamond-block.png',
            blocks: [
                { xOffset: 0, zOffset: 0, yOffset: 0, size: {x: 15, y: 0.5, z: 0.5} }
            ]
        },
        
		// Pattern: 5 small blocks in a row with 1-block gaps
		{
			color: 0xFFFF00,
			block: 'blocks/diamond-block.png',
			blocks: [
				{ xOffset: 0, zOffset: 0, yOffset: 0, size: { x: 15, y: 0.5, z: 0.5 } },
				{ xOffset: 0, zOffset: -1, yOffset: 1, size: { x: 15, y: 0.5, z: 0.5 } },
				{ xOffset: 0, zOffset: -2, yOffset: 2, size: { x: 15, y: 0.5, z: 0.5 } }
			]
		},


        // Pattern: 3 blocks of increasing size
        {
            color: 0x00FFFF,
            block: 'blocks/emerald-block.png',
            blocks: [
				{ xOffset: -12, zOffset: 0, yOffset: 0, size: { x: 1, y: 1, z: 0.5 } },
                { xOffset: -8, zOffset: 0, yOffset: 0, 	size: { x: 1, y: 1, z: 0.5 } },
                { xOffset: -4, zOffset: 0, yOffset: 0, size: {x: 1, y: 1, z: 0.5} },
                { xOffset: 0, zOffset: 0, yOffset: 0, size: {x: 2, y: 1, z: 0.5} },
                { xOffset: 4, zOffset: 0, yOffset: 0, size: {x: 1, y: 1, z: 0.5} },
                { xOffset: 8, zOffset: 0, yOffset: 0, size: { x: 1, y: 1, z: 0.5 } },
                { xOffset: 12, zOffset: 0, yOffset: 0, size: { x: 1, y: 1, z: 0.5 } }
            ]
        },
        
        // Pattern: Two medium blocks with a gap
        {
            color: 0xAA00FF,
            block: 'blocks/clay.png',
            blocks: [
				{ xOffset: -8, zOffset: 0, yOffset: 0, size: { x: 2, y: 1, z: 0.5 } },
                { xOffset: -4, zOffset: 0, yOffset: 0, size: {x: 2, y: 1, z: 0.5} },
                { xOffset: 0, zOffset: 0, yOffset: 0, size: {x: 2, y: 1, z: 0.5} },
				{ xOffset: 8, zOffset: 0, yOffset: 0, size: { x: 2, y: 1, z: 0.5 } }
            ]
        },

		// Pattern: Two medium blocks with a gap
		{
			color: 0xAA00FF,
			block: 'blocks/emerald-block.png',
			blocks: [
				{ xOffset: -14, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: -12, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: -10, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: -8, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: -6, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: -4, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: -2, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: 0, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: 2, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: 4, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: 6, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: 8, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: 10, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: 12, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
				{ xOffset: 14, zOffset: 0, yOffset: 0, size: { x: 0.5, y: 1, z: 0.5 } },
			]
		},

		{
			color: 0xAA00FF,
			block: 'blocks/emerald-block.png',
			blocks: [
				{ xOffset: 0, zOffset: 0, yOffset: 0, size: { x: 8, y: 1, z: 0.5 } },
				]
		},

		

    ];
    
    // Directions from which blocks can spawn
    private spawnDirections = [
        { name: 'NORTH', position: (x: number) => ({ x, y: 5.5, z: this.platformBounds.min.z }), velocity: { x: 0, y: 0, z: 2.5 } },
        //{ name: 'SOUTH', position: (x: number) => ({ x, y: 42, z: this.platformBounds.max.z + 5 }), velocity: { x: 0, y: 0, z: -0.1 } },
        //{ name: 'WEST', position: (z: number) => ({ x: this.platformBounds.min.x - 5, y: 42, z }), velocity: { x: 0.1, y: 0, z: 0 } },
        //{ name: 'EAST', position: (z: number) => ({ x: this.platformBounds.max.x + 5, y: 42, z }), velocity: { x: -0.1, y: 0, z: 0 } },
    ];
    
    // Base Y position where blocks should align their bottom
    private baseSpawnY: number = 4;
    
    // Add new properties
    private currentLevel: number = 1;
    private difficultyInterval: NodeJS.Timeout | null = null;
    private initialBlockSpeed: number = 1.5;
    private initialSpawnInterval: number = 3000;
    
    /**
     * Create a new BlockParty level controller
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
        this.logger.log('Block Party level controller initialized');
        
        // Set custom goal message
        this.setGoalMessage('Dodge the blocks!');
        
        // Check for custom configuration
        if (config) {
            if (typeof (config as any).blockSpawnInterval === 'number') {
                this.blockSpawnInterval = (config as any).blockSpawnInterval;
                this.logger.log(`Block spawn interval set to ${this.blockSpawnInterval}ms`);
            }
            
            if (typeof (config as any).blockSpeed === 'number') {
                this.blockSpeed = (config as any).blockSpeed;
                this.logger.log(`Block speed multiplier set to ${this.blockSpeed}`);
            }
            
            if (typeof (config as any).blockDespawnDistance === 'number') {
                this.blockDespawnDistance = (config as any).blockDespawnDistance;
                this.logger.log(`Block despawn distance set to ${this.blockDespawnDistance}`);
            }
            
            // Platform bounds can be configured for different sized platforms
            if ((config as any).platformBounds) {
                this.platformBounds = (config as any).platformBounds;
                this.logger.log(`Custom platform bounds configured`);
            }
        }
    }

    /**
     * Activate this level - load the map and set up the play area
     */
    public override loadLevel(): void {
        this.loadMap();
        this.setupCourseBoundaries();
    }

    /**
     * Define start areas for BlockParty level
     */
    protected setupCourseBoundaries(): void {
        // Center of the platform
        this.addStartArea(
            { x: -10, y: 5, z: -5 },
            { x: 10, y: 5, z: 5 },
            5 // Spawn Height
        );
    }
    
    /**
     * Start spawning blocks
     */
    private startBlockSpawner(): void {
        this.stopBlockSpawner(); // Clear any existing spawner
        
        const spawnBlock = () => {
            if (this.roundEnded) return;
            
            this.spawnBlock();
            
            // Schedule next block spawn with some randomness
            const nextSpawnTime = this.blockSpawnInterval * (0.8 + Math.random() * 0.4);
            this.blockSpawnTimeout = setTimeout(spawnBlock, nextSpawnTime);
        };
        
        // Start the block spawner
        spawnBlock();
        this.logger.log('Block spawner started');
    }
    
    /**
     * Stop spawning blocks
     */
    private stopBlockSpawner(): void {
        if (this.blockSpawnTimeout) {
            clearTimeout(this.blockSpawnTimeout);
            this.blockSpawnTimeout = null;
        }
    }
    
    /**
     * Spawn a pattern of blocks
     */
    private spawnBlock(): void {
        // Select a random block pattern
        const pattern = this.blockPatterns[Math.floor(Math.random() * this.blockPatterns.length)];
        
        // Select a random direction
        const direction = this.spawnDirections[Math.floor(Math.random() * this.spawnDirections.length)];
        
        // Find total width of pattern for bounds checking
        let minXOffset = 0;
        let maxXOffset = 0;
        
        pattern.blocks.forEach(block => {
            // Calculate X bounds
            minXOffset = Math.min(minXOffset, block.xOffset);
            maxXOffset = Math.max(maxXOffset, block.xOffset);
        });
        
		const patternWidth = Math.abs(minXOffset - maxXOffset);
		const platformWidth = 30;
		const rndRange = Math.abs(platformWidth - patternWidth) / 2;

        // Create base position based on direction
        let basePosition;
        
        if (direction.name === 'NORTH') {
			let randomX = Math.random() * (rndRange) - rndRange / 2;
			
			if (patternWidth > 20 || patternWidth == 0) { 
				randomX = 0;
			}

			basePosition = direction.position(randomX);
        } 
       
        
        // Spawn each block in the pattern
        for (const blockDef of pattern.blocks) {
            // Clone base position to avoid modifying it
            const position: Vector3Like = { 
                x: basePosition?.x || 0,
                y: basePosition?.y || 0,
                z: basePosition?.z || 0
            };
            
            // Apply offsets based on movement direction
            if (direction.name === 'NORTH' || direction.name === 'SOUTH') {
                // For north/south movement, x-offset is perpendicular to movement
                position.x += blockDef.xOffset;
                // Z-offset is along movement direction
                position.z += blockDef.zOffset; //* zAlignDirection;
            } else {
                // For east/west movement, z-offset is perpendicular to movement
                position.z += blockDef.zOffset;
                // X-offset is along movement direction
                position.x += blockDef.xOffset ;
            }
            
            // Clamp position to stay within platform boundaries
            if (direction.name === 'NORTH' || direction.name === 'SOUTH') {
                // Clamp X position (perpendicular to movement)
                //const halfSizeX = blockDef.size.x / 2;
                //position.x = Math.max(this.platformBounds.min.x + halfSizeX, 
                //                     Math.min(this.platformBounds.max.x - halfSizeX, position.x));
            }

            
            // Adjust Y position to account for both baseSpawnY and custom yOffset
            position.y = this.baseSpawnY + blockDef.size.y + blockDef.yOffset;
            
            // Create the block entity
            const block = new Entity({
                blockTextureUri: pattern.block,
                blockHalfExtents: blockDef.size,
                rigidBodyOptions: {
                    type: RigidBodyType.KINEMATIC_VELOCITY,
                    colliders: [{
                        shape: ColliderShape.BLOCK,
                        halfExtents: blockDef.size,
                        collisionGroups: {
                            belongsTo: [CollisionGroup.ENTITY],
                            collidesWith: [CollisionGroup.PLAYER, CollisionGroup.ENTITY_SENSOR]
                        }
                    }]
                }
            });
            
            // Spawn the block
            block.spawn(this.world, position);
            
            // Set block velocity scaled by speed multiplier
            const velocity = {
                x: direction.velocity.x * this.blockSpeed,
                y: direction.velocity.y * this.blockSpeed,
                z: direction.velocity.z * this.blockSpeed
            };
            
            block.setLinearVelocity(velocity);
            
            // Store the block's initial position for despawn check
            const initialPosition = {...position};
            
            // Set up tick handler to check for despawn
            const tickHandler = () => {
                if (!block.isSpawned) return;
                
                const currentPosition = block.position;
                
                // Check if the block has moved far enough to be despawned
                const distanceTraveled = Math.sqrt(
                    Math.pow(currentPosition.x - initialPosition.x, 2) +
                    Math.pow(currentPosition.z - initialPosition.z, 2)
                );
                
                if (distanceTraveled > this.blockDespawnDistance) {
                    block.off(EntityEvent.TICK, tickHandler);
                    block.despawn();
                    
                    // Remove from active blocks array
                    const index = this.activeBlocks.indexOf(block);
                    if (index >= 0) {
                        this.activeBlocks.splice(index, 1);
                    }
                }
            };
            
            block.on(EntityEvent.TICK, tickHandler);
            
            // Add to active blocks
            this.activeBlocks.push(block);
        }
        
        this.logger.log(`Spawned pattern of ${pattern.blocks.length} blocks from ${direction.name}`);
    }
    
    /**
     * Despawn all active blocks
     */
    private despawnAllBlocks(): void {
        this.activeBlocks.forEach(block => {
            if (block.isSpawned) {
                block.despawn();
            }
        });
        
        this.activeBlocks = [];
    }
    
  
    
    
    /**
     * Start the round
     */
    public override startRound(players: Player[], qualificationTarget: number): void {
        this.logger.log(`Starting Block Party round with ${players.length} players. Target: ${qualificationTarget}`);
        super.startRound(players, qualificationTarget);
        
        // Make sure all blocks are despawned at the start
        this.despawnAllBlocks();
    }
    
    /**
     * Begin actual gameplay after any intro/countdown
     */
    public override beginGameplay(): void {
        this.logger.log('Beginning Block Party gameplay');
        
        // Reset difficulty level
        this.currentLevel = 1;
        this.blockSpeed = this.initialBlockSpeed;
        this.blockSpawnInterval = this.initialSpawnInterval;
        
        // Start the block spawner
        this.startBlockSpawner();
        
        // Start difficulty progression
        this.startDifficultyProgression();
        
        // Call parent to activate obstacles, unpause players, etc.
        super.beginGameplay();
    }
    
    /**
     * Start difficulty progression - make the game harder over time
     */
    private startDifficultyProgression(): void {
        // Clear any existing interval
        if (this.difficultyInterval) {
            clearInterval(this.difficultyInterval);
            this.difficultyInterval = null;
        }
        
        // Increase difficulty every 10 seconds
        this.difficultyInterval = setInterval(() => {
            if (this.roundEnded) {
                if (this.difficultyInterval) {
                    clearInterval(this.difficultyInterval);
                    this.difficultyInterval = null;
                }
                return;
            }
            
            this.currentLevel++;
            
            // Increase speed by 10% each level
            this.blockSpeed = this.initialBlockSpeed * (1 + (this.currentLevel - 1) * 0.1);
            
            // Decrease spawn interval (faster spawns)
            this.blockSpawnInterval = Math.max(
                500, // Minimum 500ms between spawns
                this.initialSpawnInterval - (this.currentLevel - 1) * 200
            );
            
            this.logger.log(`Difficulty increased to level ${this.currentLevel}. Speed: ${this.blockSpeed.toFixed(1)}x, Interval: ${this.blockSpawnInterval}ms`);
            
            // Notify players about the difficulty increase
            if (this.uiBridge) {
                //this.uiBridge.broadcastAnimatedText("LEVEL UP!", `SPEED: ${this.blockSpeed.toFixed(1)}x`, 2000);
            }
            
        }, 20000); // Increase difficulty every 10 seconds
    }
    
    /**
     * Clean up resources
     */
    public override cleanup(): void {
        this.logger.log('Cleaning up Block Party level');
        
        // Stop the block spawner
        this.stopBlockSpawner();
        
        // Stop difficulty progression
        if (this.difficultyInterval) {
            clearInterval(this.difficultyInterval);
            this.difficultyInterval = null;
        }
        
        // Despawn all blocks
        this.despawnAllBlocks();
        
        // Call parent cleanup
        super.cleanup();
    }
    
    /**
     * End the current round
     */
    public override endRound(): void {
        // Stop spawning new blocks
        this.stopBlockSpawner();
        
        // Call parent to handle round end logic
        super.endRound();
    }
} 