const EventEmitter = require('events');

class SystemBus extends EventEmitter {
    constructor() {
        super();
        this.EVENTS = {
            CODE_VIOLET: 'CODE_VIOLET', // Staff Duress / Violence
            LOCKDOWN_START: 'LOCKDOWN_START',
            LOCKDOWN_END: 'LOCKDOWN_END',
            VISITOR_ARRIVED: 'VISITOR_ARRIVED',
            FIRE_ALARM: 'FIRE_ALARM'
        };
    }
}

const systemBus = new SystemBus();
module.exports = systemBus;
