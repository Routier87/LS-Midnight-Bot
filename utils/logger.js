const chalk = require('chalk');

class Logger {
    static log(message) {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        console.log(`${chalk.gray(`[${timestamp}]`)} ${chalk.blue('[INFO]')} ${message}`);
    }
    
    static success(message) {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        console.log(`${chalk.gray(`[${timestamp}]`)} ${chalk.green('[SUCCESS]')} ${message}`);
    }
    
    static error(message) {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        console.log(`${chalk.gray(`[${timestamp}]`)} ${chalk.red('[ERROR]')} ${message}`);
    }
    
    static warn(message) {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        console.log(`${chalk.gray(`[${timestamp}]`)} ${chalk.yellow('[WARN]')} ${message}`);
    }
    
    static ticket(type, number, user) {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        console.log(`${chalk.gray(`[${timestamp}]`)} ${chalk.magenta('[TICKET]')} ${type} #${number} - ${user}`);
    }
}

module.exports = Logger;
