import { Entity, type EntityOptions, EntityEvent, type EventPayloads } from 'hytopia';

export default class ObstacleEntity extends Entity {
  constructor(options: EntityOptions = {}) {
    super(options);

    // Call onPhysicsUpdate every entity tick, ensuring correct 'this'
    this.on(EntityEvent.TICK, this.onPhysicsUpdate.bind(this));
  }

  /**
   * Called every entity tick to apply custom physics logic.
   * Subclasses should override this method.
   * @param payload - Contains tickDeltaMs (time since last tick)
   */
  public onPhysicsUpdate(payload: EventPayloads[EntityEvent.TICK]): void {
    // Base implementation does nothing.
  }
} 