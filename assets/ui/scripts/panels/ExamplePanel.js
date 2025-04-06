import { BasePanel } from '../BasePanel.js';

export default class ExamplePanel extends BasePanel {
    constructor() {
        super('example-panel');
        this.init();
    }

    init() {
        this.container.classList.add('panel');
        this.container.innerHTML = `
            <div class="target-info">
                <div class="target-name"></div>
                <div class="target-vitals">
                    <div class="health-bar">
                        <div class="bar-fill"></div>
                        <div class="bar-text"></div>
                    </div>
                    <div class="mana-bar">
                        <div class="bar-fill"></div>
                        <div class="bar-text"></div>
                    </div>
                </div>
            </div>
        `;

        this.nameElement = this.container.querySelector('.target-name');
        this.healthFill = this.container.querySelector('.health-bar .bar-fill');
        this.healthText = this.container.querySelector('.health-bar .bar-text');
        this.manaFill = this.container.querySelector('.mana-bar .bar-fill');
        this.manaText = this.container.querySelector('.mana-bar .bar-text');

        this.addEventListeners();
        this.closePanel();
    }

    addEventListeners() {
        hytopia.onData(data => {
            if (data.type === 'targetUpdate') {
                this.updateTarget(data.target);
            }
        });
    }

    updateTarget(targetData) {
        if (!targetData) {
            this.closePanel();
            return;
        }

        this.openPanel();
        this.nameElement.textContent = targetData.name;

        if (targetData.health) {
            const healthPercent = (targetData.health.activeValue / targetData.health.max) * 100;
            this.healthFill.style.width = `${healthPercent}%`;
            this.healthText.textContent = `${Math.round(targetData.health.activeValue)}/${Math.round(targetData.health.max)}`;
        }

        if (targetData.mana) {
            const manaPercent = (targetData.mana.activeValue / targetData.mana.max) * 100;
            this.manaFill.style.width = `${manaPercent}%`;
            this.manaText.textContent = `${Math.round(targetData.mana.activeValue)}/${Math.round(targetData.mana.max)}`;
        }
    }
} 