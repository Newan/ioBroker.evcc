"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttHandler = void 0;
const mqtt = __importStar(require("mqtt"));
const events_1 = require("events");
const net = __importStar(require("net"));
// Dynamic require for aedes/aedes-persistence (may not have types)
let aedesPersistence;
let aedesModule;
try {
    aedesPersistence = require('aedes-persistence');
    aedesModule = require('aedes');
}
catch {
    // aedes/aedes-persistence not available, internal MQTT won't work
}
class MqttHandler extends events_1.EventEmitter {
    config;
    log;
    connected = false;
    reconnectCount = 0;
    mqttClient = null;
    aedesServer = null;
    netServer = null;
    maxReconnects = 20;
    internalClientId = null;
    constructor(config, log) {
        super();
        this.config = config;
        // Build a logger object (handle both ioBroker.Logger and custom loggers)
        if (log) {
            this.log = log;
        }
        else {
            this.log = {
                silly: (text) => console.log(text),
                debug: (text) => console.log(text),
                info: (text) => console.log(text),
                warn: (text) => console.warn(text),
                error: (text) => console.error(text),
            };
        }
    }
    /**
     * Connect based on the configured connection type.
     */
    connect() {
        const { connectionType, baseTopic } = this.config;
        if (connectionType === 'exmqtt') {
            this.connectExternal();
        }
        else if (connectionType === 'intmqtt') {
            this.connectInternal();
        }
        else if (connectionType === 'restapi') {
            // REST API mode - do nothing, no MQTT connection needed
            this.log.info('MQTT handler: connection type is restapi, skipping MQTT connection');
        }
        else {
            this.log.warn(`MQTT handler: unknown connection type "${connectionType}"`);
        }
    }
    /**
     * Disconnect all MQTT connections and clean up.
     */
    disconnect() {
        this.log.info('MQTT handler: disconnecting...');
        if (this.mqttClient) {
            try {
                this.mqttClient.end(true);
            }
            catch (e) {
                this.log.error(`MQTT handler: error ending mqtt client: ${e.message}`);
            }
            this.mqttClient = null;
        }
        if (this.aedesServer) {
            try {
                this.aedesServer.close();
            }
            catch (e) {
                this.log.error(`MQTT handler: error closing aedes server: ${e.message}`);
            }
            this.aedesServer = null;
        }
        if (this.netServer) {
            try {
                this.netServer.close();
            }
            catch (e) {
                this.log.error(`MQTT handler: error closing net server: ${e.message}`);
            }
            this.netServer = null;
        }
        this.removeAllListeners();
        this.connected = false;
        this.reconnectCount = 0;
        this.internalClientId = null;
    }
    /**
     * Publish a message to the configured base topic.
     *
     * @param topic - The sub-topic to publish to (baseTopic will be prepended)
     * @param payload - The payload to publish (will be JSON.stringify'd)
     * @returns Promise that resolves when published (or rejects on error)
     */
    publish(topic, payload) {
        return new Promise((resolve, reject) => {
            if (!this.mqttClient || !this.connected) {
                const errMsg = 'MQTT handler: not connected, cannot publish';
                this.log.error(errMsg);
                reject(new Error(errMsg));
                return;
            }
            const fullTopic = `${this.config.baseTopic}/${topic}`;
            const payloadStr = JSON.stringify(payload);
            this.mqttClient.publish(fullTopic, payloadStr, { qos: 1 }, (err) => {
                if (err) {
                    this.log.error(`MQTT handler: publish error on ${fullTopic}: ${err.message}`);
                    reject(err);
                }
                else {
                    this.log.debug(`MQTT handler: published to ${fullTopic}`);
                    resolve();
                }
            });
        });
    }
    // ---- Private Methods ----
    /**
     * Connect to an external MQTT broker.
     */
    connectExternal() {
        const { externalMqttServerIP, externalMqttServerPort, externalMqttServerCredentials, externalMqttServerUsername, externalMqttServerPassword, baseTopic } = this.config;
        if (!externalMqttServerIP || !externalMqttServerPort) {
            this.log.error('MQTT handler: external MQTT server IP/port not configured');
            return;
        }
        const url = `mqtt://${externalMqttServerIP}:${externalMqttServerPort}`;
        const clientId = `evcc-adapter-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const options = {
            clientId,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 10000,
        };
        if (externalMqttServerCredentials) {
            options.username = externalMqttServerUsername;
            options.password = externalMqttServerPassword;
        }
        this.log.info(`MQTT handler: connecting to external MQTT broker at ${url}`);
        try {
            this.mqttClient = mqtt.connect(url, options);
        }
        catch (e) {
            this.log.error(`MQTT handler: failed to create mqtt client: ${e.message}`);
            return;
        }
        this.setupClientHandlers(baseTopic);
    }
    /**
     * Create an internal Aedes MQTT broker and connect to it.
     */
    connectInternal() {
        const { mqttServerIPBind, listenOnAllPorts, mqttServerPort, baseTopic } = this.config;
        if (!aedesModule || !aedesPersistence) {
            this.log.error('MQTT handler: aedes or aedes-persistence modules are not available. Cannot start internal broker.');
            this.log.error('MQTT handler: please ensure aedes and aedes-persistence are installed.');
            return;
        }
        const persistence = aedesPersistence();
        this.aedesServer = aedesModule({
            persistence,
            id: `evcc-aedes-${Date.now()}`,
        });
        const bindAddress = listenOnAllPorts ? '0.0.0.0' : mqttServerIPBind || '127.0.0.1';
        this.netServer = net.createServer(this.aedesServer.handle);
        this.netServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                this.log.error(`MQTT handler: port ${mqttServerPort} is already in use. Cannot start internal broker.`);
            }
            else {
                this.log.error(`MQTT handler: net server error: ${err.message}`);
            }
            this.emit('error', err);
        });
        this.netServer.listen(mqttServerPort, bindAddress, () => {
            this.log.info(`MQTT handler: internal Aedes broker listening on ${bindAddress}:${mqttServerPort}`);
            // Wait a short moment, then connect the internal client
            setTimeout(() => {
                this.connectInternalClient(baseTopic);
            }, 200);
        });
    }
    /**
     * Connect the internal MQTT client to the local Aedes broker.
     */
    connectInternalClient(baseTopic) {
        const { mqttServerPort } = this.config;
        const url = `mqtt://127.0.0.1:${mqttServerPort}`;
        const clientId = `evcc-internal-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        this.internalClientId = clientId;
        const options = {
            clientId,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 10000,
        };
        this.log.info(`MQTT handler: connecting internal client to ${url}`);
        try {
            this.mqttClient = mqtt.connect(url, options);
        }
        catch (e) {
            this.log.error(`MQTT handler: failed to create internal mqtt client: ${e.message}`);
            return;
        }
        this.setupClientHandlers(baseTopic);
    }
    /**
     * Set up the event handlers (connect, message, error, close) on the MQTT client.
     */
    setupClientHandlers(baseTopic) {
        if (!this.mqttClient) {
            return;
        }
        this.mqttClient.on('connect', () => {
            this.log.info(`MQTT handler: connected, subscribing to ${baseTopic}/#`);
            this.connected = true;
            this.reconnectCount = 0;
            this.mqttClient?.subscribe(`${baseTopic}/#`, { qos: 1 }, (err) => {
                if (err) {
                    this.log.error(`MQTT handler: subscribe error: ${err.message}`);
                }
                else {
                    this.log.debug(`MQTT handler: subscribed to ${baseTopic}/#`);
                }
            });
            this.emit('connected');
        });
        this.mqttClient.on('message', (topic, rawPayload) => {
            // Strip base topic prefix
            const prefix = `${baseTopic}/`;
            let subTopic = topic;
            if (topic.startsWith(prefix)) {
                subTopic = topic.substring(prefix.length);
            }
            // Try to parse JSON, fallback to string
            let payload;
            try {
                payload = JSON.parse(rawPayload.toString());
            }
            catch {
                payload = rawPayload.toString();
            }
            this.log.debug(`MQTT handler: received message on ${subTopic}: ${JSON.stringify(payload)}`);
            this.emit('data', { topic: subTopic, payload });
        });
        this.mqttClient.on('error', (err) => {
            this.log.error(`MQTT handler: client error: ${err.message}`);
        });
        this.mqttClient.on('close', () => {
            this.log.info('MQTT handler: connection closed');
            this.connected = false;
            this.emit('disconnected');
            // Track reconnection attempts
            this.reconnectCount++;
            if (this.reconnectCount > this.maxReconnects) {
                this.log.error(`MQTT handler: exceeded ${this.maxReconnects} reconnect attempts. Stopping.`);
                if (this.mqttClient) {
                    this.mqttClient.end(true);
                }
            }
        });
    }
}
exports.MqttHandler = MqttHandler;
//# sourceMappingURL=mqttHandler.js.map