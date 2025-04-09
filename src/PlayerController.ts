import { PlayerEntity, EntityEvent, type PlayerInput, type PlayerCameraOrientation, type Vector3Like, type EventPayloads } from 'hytopia';
import MyEntityController from './MyEntityController';
import { EventEmitter } from "./utils/EventEmitter";

/**
 * Enhanced player controller that extends the base MyEntityController with additional
 * gameplay functionality such as fall detection and respawn handling.
 */
export default class PlayerController extends MyEntityController {
	// Fall detection settings
	private fallThresholdY: number = -5; // Y position threshold for considering a fall
	private lastCheckpointPosition: Vector3Like | null = null;
	private fallDetectionEnabled: boolean = true;
	private respawnCooldown: number = 0;
	private isRespawning: boolean = false;

	// Player entity associated with this controller
	public playerEntity?: PlayerEntity;
	
	// Event manager for controller-specific events
	public eventManager: EventEmitter<any> = new EventEmitter<any>();

	/**
	 * Called when the controller is attached to an entity.
	 * @param entity - The entity to attach the controller to.
	 */
	public override attach(entity: PlayerEntity): void {
		super.attach(entity);

		// Add fall detection as a TICK event handler
		entity.on(EntityEvent.TICK, this.checkForFall.bind(this));

		console.log('PlayerController attached with fall detection');
	}

	/**
	 * Check if the player has fallen below the threshold
	 */
	private checkForFall(payload: EventPayloads[EntityEvent.TICK]): void {
		const entity = payload.entity as PlayerEntity;
		if (!entity || !entity.isSpawned) return;

		// Update respawn cooldown first
		if (this.respawnCooldown > 0) {
			this.respawnCooldown -= payload.tickDeltaMs;

			// Clear respawn state when cooldown expires
			if (this.respawnCooldown <= 0) {
				this.respawnCooldown = 0;
				this.isRespawning = false;
				console.log('Respawn cooldown expired, fall detection re-enabled');
			}
		}

		// Skip fall detection if disabled or on cooldown
		if (!this.fallDetectionEnabled || this.isRespawning) return;

		// Check if player has fallen below threshold
		if (entity.position.y < this.fallThresholdY) {
			console.log(`Player fell below threshold (${this.fallThresholdY}), initiating respawn`);
			const respawnPosition = this.lastCheckpointPosition || { x: 0, y: 10, z: 0 }; 
			this.handleFall(entity, respawnPosition); 
		}
	}

	/**
	 * Handle player fall (respawn at provided position)
	 * @param entity The player entity that fell
	 * @param respawnPosition The position to respawn the player at
	 */
	public handleFall(entity: PlayerEntity, respawnPosition: Vector3Like): void {
		if (!entity.isSpawned || !entity.world || this.isRespawning) return;

		console.log(`PlayerController: Handling fall for ${entity.player?.id}, respawning at ${JSON.stringify(respawnPosition)}`);
		
		// Set respawn state and cooldown to prevent multiple respawns
		this.isRespawning = true;
		this.respawnCooldown = 2000; // 2 second cooldown

		// Reset player's velocity
		entity.setLinearVelocity({ x: 0, y: 0, z: 0 });
		entity.setAngularVelocity({ x: 0, y: 0, z: 0 });

		// Respawn at the provided respawn position (no longer uses internal lastCheckpointPosition)
		const finalRespawnPos = { ...respawnPosition }; // Clone to avoid modifying original
		finalRespawnPos.y += 0.5; // Add a small vertical offset

		entity.setPosition(finalRespawnPos);

		// Notify when player respawns (optional)
		// if (entity.player && entity.world) {
		// 	entity.world.chatManager.sendBroadcastMessage('Respawned!'); // Generic message
		// }

		console.log(`PlayerController: Respawn complete for ${entity.player?.id} at`, finalRespawnPos);
		
		// Emit event if using EventManager
		this.eventManager.emit('fallRespawn', { playerId: entity.player?.id, position: finalRespawnPos });
	}

	/**
	 * Set the fall threshold Y position
	 * @param y The Y position below which a player is considered to have fallen
	 */
	public setFallThreshold(y: number): void {
		this.fallThresholdY = y;
	}

	/**
	 * Set a checkpoint position that the player will respawn at when falling
	 * @param position The checkpoint position
	 */
	public setCheckpoint(position: Vector3Like): void {
		// Don't update the checkpoint if we're currently respawning
		if (this.isRespawning) return;

		// Make sure we store a clean copy of the position
		this.lastCheckpointPosition = {
			x: position.x,
			y: position.y + 0.5, // Add a small offset to avoid ground clipping
			z: position.z
		};
		console.log(`Checkpoint set at:`, this.lastCheckpointPosition);
	}

	/**
	 * Enable or disable fall detection
	 * @param enabled Whether fall detection is enabled
	 */
	public setFallDetectionEnabled(enabled: boolean): void {
		this.fallDetectionEnabled = enabled;
	}

	/**
	 * Override of the input handling to add checkpoint setting with a key
	 */
	public override tickWithPlayerInput(entity: PlayerEntity, input: PlayerInput, cameraOrientation: PlayerCameraOrientation, deltaTimeMs: number): void {
		// Call the parent implementation for normal movement
		super.tickWithPlayerInput(entity, input, cameraOrientation, deltaTimeMs);
		
		// Check if player pressed the C key (checkpoint)
		if (input.c) {
			// Set current position as checkpoint
			this.setCheckpoint(entity.position);

			// Provide feedback to the player
			if (entity.player && entity.world) {
				entity.world.chatManager.sendBroadcastMessage('Checkpoint set at your current position.');
			}

			input.c = false; // Consume the input
		}
	}
} 