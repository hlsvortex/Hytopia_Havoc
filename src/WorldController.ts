import { World, PlayerEntity, EntityEvent, type EventPayloads } from 'hytopia';
import { AreaComponent } from './AreaComponent';

/**
 * WorldController manages global game mechanics like player respawning and game state.
 */
export class WorldController {
  private world: World;
  private respawnAreas: AreaComponent[] = [];
  private defaultSpawnPoint = { x: 0, y: 10, z: 0 };
  private minY = -10; // Players below this Y position will be respawned

  /**
   * Creates a new WorldController.
   * @param world The game world.
   */
  constructor(world: World) {
    this.world = world;
    this.initRespawnDetection();
    console.log('WorldController initialized');
  }

  /**
   * Set up detection for players that fall below the minimum Y level.
   */
  private initRespawnDetection(): void {
    // Check every tick if any players are below the minY level
    this.world.on(EntityEvent.TICK, ({ tickDeltaMs }: EventPayloads[EntityEvent.TICK]) => {
      // Get all player entities
      const playerEntities = this.world.entityManager.getAllPlayerEntities();
      
      for (const playerEntity of playerEntities) {
        // Check if player is below minimum Y level
        if (playerEntity.position.y < this.minY) {
          this.respawnPlayer(playerEntity);
        }
      }
    });
  }

  /**
   * Register a spawn area that can be used to respawn players.
   * @param area The area to register as a spawn area.
   */
  public registerSpawnArea(area: AreaComponent): void {
    this.respawnAreas.push(area);
    console.log(`Registered spawn area with ${area.getRandomPosition() ? 'valid' : 'invalid'} positioning`);
  }

  /**
   * Respawn a player at a random spawn point.
   * @param player The player entity to respawn.
   */
  public respawnPlayer(player: PlayerEntity): void {
    // Get a random spawn area, or use default spawn point if none exist
    let spawnPosition = this.defaultSpawnPoint;
    
    if (this.respawnAreas.length > 0) {
      // Select a random spawn area
      const randomIndex = Math.floor(Math.random() * this.respawnAreas.length);
      const spawnArea = this.respawnAreas[randomIndex];
      
      // Get a random position within the spawn area
      const randomPosition = spawnArea.getRandomPosition();
      if (randomPosition) {
        spawnPosition = randomPosition;
      }
    }
    
    // Reset player's velocity and position
    player.setLinearVelocity({ x: 0, y: 0, z: 0 });
    player.setAngularVelocity({ x: 0, y: 0, z: 0 });
    player.setPosition(spawnPosition);
    
    console.log(`Player ${player.name} respawned at position:`, spawnPosition);
  }

  /**
   * Set the minimum Y position before players are respawned.
   * @param y The minimum Y position.
   */
  public setMinimumY(y: number): void {
    this.minY = y;
  }

  /**
   * Set the default spawn point used when no spawn areas are available.
   * @param position The default spawn position.
   */
  public setDefaultSpawnPoint(position: { x: number, y: number, z: number }): void {
    this.defaultSpawnPoint = position;
  }
} 