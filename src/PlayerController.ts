import { PlayerEntity, EntityEvent, type PlayerInput, type PlayerCameraOrientation, type Vector3Like, type EventPayloads, Entity, Vector3, Player, PlayerEvent } from 'hytopia';
import MyEntityController from './MyEntityController';
import { EventEmitter } from "./utils/EventEmitter";
import { GameManager } from './core/GameManager';

declare module 'hytopia' {
	interface BaseEntityController {
		gameManager: GameManager;
		setGameManager(gameManager: GameManager): void;
		Respawn( ): void;
	}
}
declare module 'hytopia' {
	export enum PlayerEvent {
		PLAYER_DEATH = "PLAYER.DEATH",
		PLAYER_ELIMINATED = "PLAYER.ELIMINATED",
		PLAYER_RESPAWN = "PLAYER.RESPAWN",
	}

	/** Event payloads for Entity emitted events. @public */
	export interface PlayerEventPayloads {
		/** Emitted when an entity collides with a block type. */
		[PlayerEvent.PLAYER_DEATH]: {
			playerController: PlayerController;
			reason: 'falling' | 'obstacle' | 'lava' | 'other';
		};
		
		[PlayerEvent.PLAYER_ELIMINATED]: {
			playerController: PlayerController;
		};

		[PlayerEvent.PLAYER_RESPAWN]: {
			playerController: PlayerController;
		};
	}
}

/**
 * Enhanced player controller that extends the base MyEntityController with additional
 * gameplay functionality such as fall detection and respawn handling.
 */
export default class PlayerController extends MyEntityController {
	// Fall detection settings
	private fallThresholdY: number = -5; // Y position threshold for considering a fall
	private lastCheckpointPosition: Vector3Like | null = null;
	private fallDetectionEnabled: boolean = true;
	private isRespawning: boolean = false;
	private isDead: boolean = false;
	protected pauseMovement: boolean = false;

	// Player entity associated with this controller
	public playerEntity?: PlayerEntity;

	/**
	 * Called when the	 controller is attached to an entity.
	 * @param entity - The entity to attach the controller to.
	 */
	public override attach(entity: PlayerEntity): void {
		super.attach(entity);
		this.playerEntity = entity;
		this.pauseMovement = true;
		
		//thison(PlayerEvent.PLAYER_DEATH, this.handlePlayerDeath.bind(this));

		// Add fall detection as a TICK event handler
		entity.on(EntityEvent.TICK, this.checkForFall.bind(this));
		console.log('PlayerController attached with fall detection');
	}

	public getPlayerEntity(): PlayerEntity {
		if (!this.playerEntity) {
			throw new Error('Player entity not attached to PlayerController');
		}
		return this.playerEntity;
	}

	public setGameManager(gameManager: GameManager): void {
		this.gameManager = gameManager;
	}
	
	public setPauseMovement(pause: boolean): void {
		console.log(`[PlayerController] Setting pause movement to ${pause}`);
		this.pauseMovement = pause;
	}

	/**
	 * Check if the player has fallen below the threshold
	 */
	private checkForFall(payload: EventPayloads[EntityEvent.TICK]): void {
		const entity = payload.entity as PlayerEntity;
		if (!entity || !entity.isSpawned) return;

		// Skip fall detection if disabled or on cooldown
		if (!this.fallDetectionEnabled || this.isRespawning) return;

		// Check if player has fallen below threshold
		if (entity.position.y < this.fallThresholdY) {
			//console.log(`Player fell below threshold (${this.fallThresholdY}), initiating respawn`);
			const respawnPosition = this.lastCheckpointPosition || { x: 0, y: 10, z: 0 }; 
			this.handleFall(entity, respawnPosition); 
		}
	}

	public RespawnAtCheckpoint( ): void {
		//console.log(`[PlayerController] Respawning player ${this.playerEntity?.player?.id}`);

		if (!this.playerEntity || !this.playerEntity.world ) return;
		
		this.isDead = false;
		//this.isRespawning = false;
		//this.respawnCooldown = 2000; // 2 second cooldown
	
		const respawnPosition = this.lastCheckpointPosition || { x: 0, y: 10, z: 0 }; 

		this.playerEntity.setPosition(respawnPosition);
		this.playerEntity.setLinearVelocity({ x: 0, y: 0, z: 0 });
		this.playerEntity.setAngularVelocity({ x: 0, y: 0, z: 0 });

	}

	/**
	 * Handle player fall (respawn at provided position)
	 * @param entity The player entity that fell
	 * @param respawnPosition The position to respawn the player at
	 */
	public handleFall(entity: PlayerEntity, respawnPosition: Vector3Like): void {
		if (!entity.isSpawned || !entity.world|| this.isDead) return;

		this.isDead = true;
		//this.emit(PlayerEvent.PLAYER_DEATH, { playerController: this, reason: 'falling' });
		
		const levelController = this.gameManager.getActiveLevel();
		if (!levelController) return;
		

		if (levelController.getConfig().onPlayerDeath === 'RespawnAtCheckPoint') {
			this.resetInput = true;
			this.RespawnAtCheckpoint();
		} else if (levelController.getConfig().onPlayerDeath === 'Eliminated') {
			this.resetInput = true;
			levelController.eliminatePlayer(entity);
		}


		/*
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
		*/

		// Notify when player respawns (optional)
		// if (entity.player && entity.world) {
		// 	entity.world.chatManager.sendBroadcastMessage('Respawned!'); // Generic message
		// }

		//entity.emit(PlayerEvent.PLAYER_DEATH, { reason: 'falling' });

		//console.log(`PlayerController: Respawn complete for ${entity.player?.id} at`, finalRespawnPos);
		
		// Emit event if using EventManager
		//this.eventManager.emit('fallRespawn', { playerId: entity.player?.id, position: finalRespawnPos });
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
		
		if (this.pauseMovement)  {
			entity.setLinearVelocity({ x: 0, y: 0, z: 0 });
			this.resetInput = true;
			input.w = false;
			input.a = false;
			input.s = false;
			input.d = false;
			return; 
		}
	}
} 