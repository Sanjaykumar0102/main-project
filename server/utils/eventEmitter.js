const EventEmitter = require('events');

class AppEmitter extends EventEmitter { }

const eventEmitter = new AppEmitter();

module.exports = eventEmitter;
