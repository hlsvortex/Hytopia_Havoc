import { Entity, type EntityOptions, EntityEvent, type EventPayloads } from 'hytopia';
import type { LevelController } from '../core/LevelController';

export default class ObstacleEntity extends Entity {
	protected activated: boolean = false;
	protected paused: boolean = false;
	protected levelController: LevelController | null = null;

	constructor(options: EntityOptions = {}, levelController: LevelController ) {
		super(options);
		this.levelController = levelController;
		this.levelController?.events.on('RoundGameplayStart', this.onRoundGameplayStart.bind(this));	
		// Call onPhysicsUpdate every entity tick, ensuring correct 'this'
		this.on(EntityEvent.TICK, this.onPhysicsUpdate.bind(this));

	}

	public onRoundGameplayStart(): void {
		// Activate the obstacle when gameplay starts if it's not already activated
		if (!this.activated) {
			this.activate();
		}
	}

	/**
	 * Called every entity tick to apply custom physics logic.
	 * Subclasses should override this method.
	 * @param payload - Contains tickDeltaMs (time since last tick)
	 */
	public onPhysicsUpdate(payload: EventPayloads[EntityEvent.TICK]): void {
		// Base implementation does nothing.
	}

	/**
	 * Activate the obstacle's movement or behavior.
	 * Subclasses should check this state before applying physics/movement.
	 */
	public activate(): void {
		if (!this.activated) {
			this.activated = true;
			//console.log(`[${this.constructor.name} ${this.name || this.id}] Activated`);
		}
	}

	/**
	 * Deactivate the obstacle's movement or behavior.
	 */
	public deactivate(): void {
		if (this.activated) {
			this.activated = false;
			//console.log(`[${this.constructor.name} ${this.name || this.id}] Deactivated`);
		}
	}

	public reset(): void {
	}

	public setPauseMovement(pause: boolean): void {
		this.paused = pause;
	}

	public isPaused(): boolean {
		return this.paused;
	}

	/**
	 * Check if the obstacle is currently activated.
	 */
	public isActivated(): boolean {
		return this.activated;
	}
} 