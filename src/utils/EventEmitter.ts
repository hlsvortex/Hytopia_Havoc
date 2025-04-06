// Basic placeholder EventEmitter
type Listener<T> = (payload: T) => void;

export class EventEmitter<EventMap extends Record<string, any>> {
    private listeners: Map<keyof EventMap, Set<Listener<any>>> = new Map();

    on<K extends keyof EventMap>(eventName: K, listener: (payload: EventMap[K]) => void): void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName)!.add(listener as Listener<any>);
    }

    off<K extends keyof EventMap>(eventName: K, listener: (payload: EventMap[K]) => void): void {
        const eventListeners = this.listeners.get(eventName);
        if (eventListeners) {
            eventListeners.delete(listener as Listener<any>);
        }
    }

    emit<K extends keyof EventMap>(eventName: K, payload: EventMap[K]): void {
        const eventListeners = this.listeners.get(eventName);
        if (eventListeners) {
            const listenersToCall = new Set(eventListeners);
            listenersToCall.forEach(listener => {
                try {
                    listener(payload);
                } catch (error) {
                    console.error(`Error in event listener for ${String(eventName)}:`, error);
                }
            });
        }
    }
} 