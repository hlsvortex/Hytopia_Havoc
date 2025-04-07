import { World, Player, PlayerEvent } from 'hytopia';
import { EventEmitter } from '../utils/EventEmitter';
import { RoundManager } from './RoundManager';
import { gameConfig } from '../config/gameConfig';

type GameState = 'Lobby' | 'Starting' | 'RoundInProgress' | 'PostRound' | 'GameOver';

export class GameManager {
	private world: World;
	private state: GameState = 'Lobby';
	private players: Map<string, Player> = new Map();
	private roundManager: RoundManager | null = null;
	public events = new EventEmitter<{
		GameWon: string;
		GameEnded: string;
	}>();

	constructor(world: World) {
		this.world = world;
		console.log('[GameManager] Initialized in Lobby state.');
		this.registerHytopiaListeners();
	}

	// Check if the game is currently in progress
	public isGameInProgress(): boolean {
		return this.state === 'Starting' || this.state === 'RoundInProgress' || this.state === 'PostRound';
	}

	// Get the current game state
	public getGameState(): GameState {
		return this.state;
	}

	private registerHytopiaListeners(): void {
		this.world.on(PlayerEvent.JOINED_WORLD, this.handlePlayerJoin.bind(this));
		this.world.on(PlayerEvent.LEFT_WORLD, this.handlePlayerLeave.bind(this));
	}

	private unregisterHytopiaListeners(): void {
		this.world.off(PlayerEvent.JOINED_WORLD, this.handlePlayerJoin.bind(this));
		this.world.off(PlayerEvent.LEFT_WORLD, this.handlePlayerLeave.bind(this));
	}

	private handlePlayerJoin(payload: { player: Player }): void {
		const player = payload.player;
		console.log(`[GameManager] Player joined: ${player.id}`);
		if (!this.players.has(player.id)) {
			this.players.set(player.id, player);
			player.ui.load('ui/index.html');
			console.log(`[GameManager] Loaded UI for player ${player.id}`);
		}
		if (this.state === 'Lobby' && this.players.size >= gameConfig.minPlayersToStart) {
			this.startGame();
		}
	}

	private handlePlayerLeave(payload: { player: Player }): void {
		const player = payload.player;
		console.log(`[GameManager] Player left: ${player.id}`);
		this.players.delete(player.id);
		if (this.state === 'RoundInProgress' || this.state === 'PostRound') {
			// TODO: Notify RoundManager 
			if (this.players.size < gameConfig.absoluteMinPlayers) {
				this.endGame('NotEnoughPlayers');
			}
		} else if (this.state === 'Lobby') {
			console.log(`[GameManager] Player left during lobby. Players remaining: ${this.players.size}`);
		}
	}

	public startGame(): void {
		if (this.state !== 'Lobby') return;
		console.log(`[GameManager] Starting game with ${this.players.size} players.`);
		this.state = 'Starting';
		const initialPlayerIds = Array.from(this.players.keys());
		this.roundManager = new RoundManager(this.world, initialPlayerIds);

		this.roundManager.events.on('GameEndConditionMet', this.handleGameEndConditionMet.bind(this));

		console.log('[GameManager] Starting Round Manager...');
		this.state = 'RoundInProgress';
		this.roundManager.startNextRound();
	}

	private handleGameEndConditionMet(reason: string): void {
		console.log(`[GameManager] Received game end condition from RoundManager: ${reason}`);
		if (reason === 'LastPlayerStanding' && this.roundManager) {
			const winnerId = this.roundManager.getLastPlayerId();
			if (winnerId) {
				this.events.emit('GameWon', winnerId);
			}
		}
		this.endGame(reason);
	}

	public endGame(reason: string): void {
		if (this.state === 'GameOver') return;
		console.log(`[GameManager] Ending game. Reason: ${reason}`);
		this.state = 'GameOver';
		if (this.roundManager) {
			this.roundManager.events.off('GameEndConditionMet', this.handleGameEndConditionMet.bind(this));
			this.roundManager.cleanup();
			this.roundManager = null;
		}
		this.events.emit('GameEnded', reason);
		console.log("[GameManager] Game Over. Waiting for manual restart or further logic.");
		this.unregisterHytopiaListeners();
	}
} 