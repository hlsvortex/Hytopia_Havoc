import { PlayerCameraMode } from "hytopia";

import type { Player, PlayerEntity } from "hytopia";
import type PlayerController from "../PlayerController";
import { Team } from "../enums/Team";
import type { PlayerDataJSON } from "./PlayerDataJSON";

/**
 * Reward calculator for player placement
 */
export interface PlayerReward {
	placement: number;
	coins: number;
	crowns: number;
}

export class PlayerData {
	player: Player;
	playerController: PlayerController | null;
	playerEntity: PlayerEntity | null;

	playerName: string;
	playerLevel: number;
	playerXP: number;
	coins: number;
	crowns: number;
	ownedItemIds: string[];
	wins: number;
	modelUri: string;
	team: Team;
	lastUpdated: number;

	constructor(player: Player) {
		this.player = player;
		this.playerController = null;
		this.playerEntity = null;
		this.playerName = player.id || "Player";
		this.playerLevel = 1;
		this.playerXP = 0;
		this.coins = 0;
		this.crowns = 0;
		this.ownedItemIds = [];
		this.wins = 0;
		this.modelUri = "models/players/player.gltf";
		this.lastUpdated = Date.now();
		this.team = Team.None;
	}

	/**
	 * Convert player data to JSON format for persistence
	 */
	toJSON(): PlayerDataJSON {
		return {
			playerName: this.playerName,
			level: this.playerLevel,
			xp: this.playerXP,
			coins: this.coins,
			crowns: this.crowns,
			ownedItemIds: this.ownedItemIds,
			wins: this.wins,
			modelUri: this.modelUri,
			lastUpdated: this.lastUpdated
		};
	}

	/**
	 * Update player data from JSON
	 */
	fromJSON(data: PlayerDataJSON): void {
		this.playerName = data.playerName || this.player.id || "Player";
		this.playerLevel = data.level ?? 1;
		this.playerXP = data.xp ?? 0;
		this.coins = data.coins ?? 0;
		this.crowns = data.crowns ?? 0;
		this.ownedItemIds = data.ownedItemIds ?? [];
		this.wins = data.wins ?? 0;
		this.modelUri = data.modelUri ?? "models/players/player.gltf";
		this.lastUpdated = data.lastUpdated ?? Date.now();
	}

	public isSpawned(): boolean {
		return this.playerEntity?.isSpawned ?? false;
	}

	public playerID(): string {
		return this.player.id;
	}

	public getPlayerController(): PlayerController | null {
		return this.playerController;
	}

	public getPlayerEntity(): PlayerEntity | null {
		return this.playerEntity;
	}

	public getCoins(): number {
		return this.coins;
	}

	public getCrowns(): number {
		return this.crowns;
	}

	public addCoins(amount: number): void {
		this.coins += amount;
		this.lastUpdated = Date.now();
	}

	public addCrowns(amount: number): void {
		this.crowns += amount;
		this.lastUpdated = Date.now();
	}

	public addWin(): void {
		this.wins += 1;
		this.lastUpdated = Date.now();
	}

	public setPlayerEntity(playerEntity: PlayerEntity): void {
		this.playerEntity = playerEntity;
		this.playerController = playerEntity.controller as PlayerController;
	}

	public setSpectatorMode(): void {
		if (this.playerEntity && this.playerEntity.isSpawned) {
			this.playerEntity.despawn();
			console.log(`[GameManager] Despawned entity for ${this.player.id}`);
		}

		this.player.camera.setMode(PlayerCameraMode.SPECTATOR);
		this.playerController = null;
		this.playerEntity = null;
	}

	public leaveGame(): void {
		if (this.playerEntity && this.playerEntity.isSpawned) {
			this.playerEntity.despawn();
			console.log(`[GameManager] Despawned entity for ${this.player.id}`);
		}

		this.playerController = null;
		this.playerEntity = null;
	}

	public addXP(amount: number): void {
		this.playerXP += amount;
		this.recalculateLevel();
		this.lastUpdated = Date.now();
	}

	/**
	 * Calculate XP required for next level
	 */
	private calculateXpForNextLevel(level: number): number {
		const baseXP = 100;
		const growthFactor = 1.5;
		return Math.floor(baseXP * Math.pow(level, growthFactor));
	}

	/**
	 * Calculate total XP needed to reach a level
	 */
	private calculateTotalXpForLevel(level: number): number {
		if (level <= 1) return 0;
		
		let totalXP = 0;
		for (let i = 1; i < level; i++) {
			totalXP += this.calculateXpForNextLevel(i);
		}
		return totalXP;
	}

	/**
	 * Recalculate player level based on current XP
	 */
	private recalculateLevel(): void {
		let level = 1;
		let xpForNextLevel = this.calculateXpForNextLevel(level);
		let accumulatedXp = 0;
		
		while (accumulatedXp + xpForNextLevel <= this.playerXP) {
			accumulatedXp += xpForNextLevel;
			level++;
			xpForNextLevel = this.calculateXpForNextLevel(level);
		}
		
		this.playerLevel = level;
	}
}
