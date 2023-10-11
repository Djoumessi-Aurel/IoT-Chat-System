// Récupération des arguments du programme
const yargs = require('yargs/yargs');
const {writeFileSync} = require('fs');
var moment = require('moment');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;

const thisUser={name: argv.name || 'XYZ', pass: typeof argv.pass === 'string' ? argv.pass : ''};

//Importation des types de messages
const tm = require('./messagesRegex');

//librairie de gestion des couleurs dans la console
// import chalk from 'chalk';
const chalk = require('chalk');


var readline = require('readline');
const rl = readline.createInterface({input: process.stdin});

var net = require('net');
var client = new net.Socket();
const {log, lazyEqual} = require('../functions');

let address = process.env.HOST || '127.0.0.1';
let port = process.env.PORT || 8080;

client.connect(port, address, function() { //Lorsque le client se connecte
    // log('Connected', 'your name is:', thisUser.name);
    log(chalk.cyan('You are connected to the server'));
    process.stdout.write('>');
    client.write(JSON.stringify({from: thisUser.name, pass: thisUser.pass ,action:'client-hello'}));
});

client.on('data', function(data) { //Lorsque le client reçoit des données venant du serveur
    processData(JSON.parse(data));
    process.stdout.write('>');
});


process.on('SIGINT', () => {    
    abort();
  });

// process.stdout.write('>');

rl.on('line', (input) => {
    // log(`Received: ${input}`);
    if(input.match(tm.MSG_QUIT)){
        quit();
    }
    else if(input.match(tm.MSG_LIST_USERS)){
        listUsers();
    }
    else if (result = input.match(tm.MSG_SEND_TO_ONE)){
        sendToOne(result[1], result[2]);
    }
    else if (result = input.match(tm.MSG_SEND_TO_ALL)){
        sendToAll(result[1]);
    }
    else if(result = input.match(tm.MSG_CREATE_GROUP)){
        createGroup(result[1]);
    }
    else if(result = input.match(tm.MSG_JOIN_GROUP)){
        joinGroup(result[1]);
    }
    else if(result = input.match(tm.MSG_BROADCAST_GROUP)){
        sendToGroup(result[1], result[2]);
    }
    else if(result = input.match(tm.MSG_LIST_GROUP_MEMBERS)){
        listGroupMembers(result[1]);
    }
    else if(result = input.match(tm.MSG_LIST_GROUP_MESSAGES)){
        listGroupMessages(result[1]);
    }
    else if(input.match(tm.MSG_LIST_GROUPS)){
        listGroups();
    }
    else if(result = input.match(tm.MSG_LEAVE_GROUP)){
        leaveGroup(result[1]);
    }
    else if(result = input.match(tm.MSG_INVITE)){
        inviteInGroup(result[1], result[2]);
    }
    else if(result = input.match(tm.MSG_KICK)){
        removeFromGroup(result[1], result[2], result[3]);
    }
    else if(result = input.match(tm.MSG_BAN)){
        banFromGroup(result[1], result[2], result[3]);
    }
    else if(result = input.match(tm.MSG_UNBAN)){
        unbanFromGroup(result[1], result[2]);
    }
    else if(result = input.match(tm.MSG_LIST_GROUP_EVENTS)){
        listGroupEvents(result[1]);
    }
    else if(result = input.match(tm.MSG_SESSION_DOWNLOAD)){
        sessionDownload();
    }
    process.stdout.write('>');
    
  });


function sendToOne(name, message){
    client.write(JSON.stringify({from: thisUser.name, to: name, msg: message, action:'client-send'}))
}

function sendToAll(message){
    client.write(JSON.stringify({from: thisUser.name ,msg: message, action:'client-broadcast'}))
}

function listUsers(){
    client.write(JSON.stringify({from: thisUser.name, action:'client-list-clients'}))
}

function quit(){
    client.write(JSON.stringify({from: thisUser.name, action:'client-quit'}))
}

function abort(){ //Déconnextion forcée
    client.write(JSON.stringify({from: thisUser.name, code: 'CTRL C' ,msg: 'error_msg', action:'client-error'}))
}

function createGroup(groupName){
    client.write(JSON.stringify({from: thisUser.name, group: groupName, action:'cgroup'}))
}

function joinGroup(groupName){
    client.write(JSON.stringify({from: thisUser.name, group: groupName, action:'join'}))
}

function sendToGroup(groupName, message){
    client.write(JSON.stringify({from: thisUser.name, group: groupName, msg: message, action:'gbroadcast'}))
}

function listGroupMembers(groupName){
    client.write(JSON.stringify({from: thisUser.name, group: groupName, action:'members'}))
}

function listGroupMessages(groupName){
    client.write(JSON.stringify({from: thisUser.name, group: groupName, action:'msgs'}))
}

function listGroups(){
    client.write(JSON.stringify({from: thisUser.name, action:'groups'}))
}

function leaveGroup(groupName){
    client.write(JSON.stringify({from: thisUser.name, group: groupName, action:'leave'}))
}

function inviteInGroup(groupName, someOne){ //invite someOne in the group goupName
    client.write(JSON.stringify({from: thisUser.name, group: groupName, dest: someOne, action:'invite'}))
}

function removeFromGroup(groupName, someOne, reason){ //retire someOne du groupe goupName, en précisant la raison
    client.write(JSON.stringify({from: thisUser.name, group: groupName, dest: someOne, reason: reason, action:'kick'}))
}

function banFromGroup(groupName, someOne, reason){ //bannit someOne du groupe goupName, en précisant la raison
    client.write(JSON.stringify({from: thisUser.name, group: groupName, dest: someOne, reason: reason, action:'ban'}))
}

function unbanFromGroup(groupName, someOne){ //débannit someOne du groupe goupName
    client.write(JSON.stringify({from: thisUser.name, group: groupName, dest: someOne, action:'unban'}))
}

function listGroupEvents(groupName){
    client.write(JSON.stringify({from: thisUser.name, group: groupName, action:'states'}))
}

function sessionDownload(){
    client.write(JSON.stringify({from: thisUser.name, action:'session-download'}))
}



/* TRAITEMENT DES MESSAGES (JSON) VENANT DU SERVEUR */
function processData(jdata){
        // log('Received: ' + data);
        
        switch(jdata.action){
            case 'server-hello': 
                log(chalk.blue('server>'), jdata.msg);
            break;
            case 'server-send':
                log(chalk.green(jdata.from + '>'), jdata.msg);
            break;
            case 'server-broadcast':
                log(chalk.green(jdata.from + '>'), jdata.msg);
            break;
            case 'server-list-clients':
                log(chalk.blue('server>'),
                    `Il y a ${jdata.list.length} autres utilisateurs:`, jdata.list.join(', '));
            break;
            case 'server-quit':
                log('Déconnexion...');
                client.end(); client.destroy(); rl.close();
                return;
            break;
            case 'server-error':
                log('Déconnexion forcée...');
                client.end(); client.destroy(); rl.close();
                return;
            break;
            case 'server-someone-left':
                log(chalk.blue('server>'),`${jdata.from} left.`);
            break;
            case 'server-someone-arrived':
                log(chalk.blue('server>'),`${jdata.from} arrived.`);
            break;
            case 'group-already-exists':
                log(chalk.blue('server>'),`This group already exists.`);
            break;
            case 'group-not-exists':
                log(chalk.blue('server>'),`This group doesn't exist.`);
            break;
            case 'not-in-group':
                log(chalk.blue('server>'),`You are not in a group called ${chalk.underline(jdata.group)}.`);
            break;
            case 'dest-not-in-group':
                log(chalk.blue('server>'),`${jdata.dest} is not in the group ${chalk.underline(jdata.group)}.`);
            break;
            case 'cgroup':
                if(jdata.from===thisUser.name)
                log(chalk.blue('server>'),`Group ${chalk.underline(jdata.group)} successfully created!`);
                else
                log(chalk.blue('server>'),`${jdata.from} created the group ${chalk.underline(jdata.group)}`);
            break;
            case 'join':
                if(jdata.from===thisUser.name)
                log(chalk.blue('server>'),`You successfully joined the group ${chalk.underline(jdata.group)}`);
                else
                log(chalk.blue('server>'),`${jdata.from} joined the group ${chalk.underline(jdata.group)}`);
            break;
            case 'can-not-join':
                log(chalk.blue('server>'),`You can not join the group ${chalk.underline(jdata.group)} `
                + `because you are banned from it.`);
            break;
            case 'gbroadcast':
                // if(jdata.from!==thisUser.name)
                log(`${chalk.underline(jdata.group)}>` + chalk.green(jdata.from + '>'), jdata.msg);
            break;
            case 'members':
                log(chalk.blue('server>'),`Membres du groupe ${chalk.underline(jdata.group)} (${jdata.list.length}):`, jdata.list);
            break;
            case 'msgs':
                log(`${chalk.underline(jdata.group)}> Historique des (${jdata.list.length}) messages du groupe:`);
                for(a_msg of jdata.list){
                    log(`  ${chalk.greenBright(a_msg.from + '>')}`, a_msg.msg);
                }
            break;
            case 'groups':
                log(chalk.blue('server>'),`Liste des groupes (${jdata.list.length}):`, jdata.list);
            break;
            case 'leave':
                if(jdata.from===thisUser.name)
                log(chalk.blue('server>'),`You successfully left the group ${chalk.underline(jdata.group)}`);
                else
                log(chalk.blue('server>'),`${jdata.from} left the group ${chalk.underline(jdata.group)}`);
            break;
            case 'invite':
                if(lazyEqual(jdata.from, thisUser.name))
                log(chalk.blue('server>'),`You successfully added ${jdata.dest} to the group ${chalk.underline(jdata.group)}`);
                else if(lazyEqual(jdata.dest, thisUser.name))
                log(chalk.blue('server>'),`${jdata.from} added you to the group ${chalk.underline(jdata.group)}`);
                else
                log(chalk.blue('server>'),`${jdata.from} added ${jdata.dest} to the group ${chalk.underline(jdata.group)}`);
            break;
            case 'can-not-invite':
                log(chalk.blue('server>'),`You can not add ${jdata.dest} to the group ${chalk.underline(jdata.group)} `
                + `because he is banned from it.`);
            break;
            case 'kick':
                if(lazyEqual(jdata.from, thisUser.name))
                log(chalk.blue('server>'),`You successfully removed ${jdata.dest} from the group ${chalk.underline(jdata.group)} `
                + `because ${chalk.red(jdata.reason)}`);
                else if(lazyEqual(jdata.dest, thisUser.name))
                log(chalk.blue('server>'),`${jdata.from} removed you from the group ${chalk.underline(jdata.group)} `
                + `because ${chalk.red(jdata.reason)}`);
                else
                log(chalk.blue('server>'),`${jdata.from} removed ${jdata.dest} from the group ${chalk.underline(jdata.group)} `
                + `because ${chalk.red(jdata.reason)}`);
            break;
            case 'ban':
                if(lazyEqual(jdata.from, thisUser.name))
                log(chalk.blue('server>'),`You successfully banned ${jdata.dest} from the group ${chalk.underline(jdata.group)} `
                + `because ${chalk.red(jdata.reason)}`);
                else if(lazyEqual(jdata.dest, thisUser.name))
                log(chalk.blue('server>'),`${jdata.from} banned you from the group ${chalk.underline(jdata.group)} `
                + `because ${chalk.red(jdata.reason)}`);
                else
                log(chalk.blue('server>'),`${jdata.from} banned ${jdata.dest} from the group ${chalk.underline(jdata.group)} `
                + `because ${chalk.red(jdata.reason)}`);
            break;
            case 'unban':
                if(lazyEqual(jdata.from, thisUser.name))
                log(chalk.blue('server>'),`You successfully unbanned ${jdata.dest} from the group ${chalk.underline(jdata.group)} `
                );
                else if(lazyEqual(jdata.dest, thisUser.name))
                log(chalk.blue('server>'),`${jdata.from} unbanned you from the group ${chalk.underline(jdata.group)} `
                );
                /*else
                log(chalk.blue('server>'),`${jdata.from} unbanned ${jdata.dest} from the group ${chalk.underline(jdata.group)} `
                );*/
            break;
            case 'dest-not-banned':
                log(chalk.blue('server>'),`${jdata.dest} is not banned from the group ${chalk.underline(jdata.group)}. `
                + `Therefore, unban doesn't make any sense.`);
            break;
            case 'states':
                log(`${chalk.underline(jdata.group)}> Liste de tous les événements du groupe:`);
                for(a_msg of jdata.list){
                    process.stdout.write(`   `);
                    processData(a_msg);
                }
                log(`${chalk.underline(jdata.group)}> Fin de la liste`);
            break;
            case 'session-restore':
                log(chalk.cyan(`Restauration de votre session...`));
                for(a_msg of jdata.list){
                    process.stdout.write(chalk.yellow(`.`));
                    processData(a_msg);
                }
                log(chalk.cyan(`Session restaurée.`));
            break;
            case 'session-download':
                let filename = `./downloads/${thisUser.name}-save${moment().format('YYYY-MM-DD HH-mm-ss')}.txt`;
                writeFileSync(filename, JSON.stringify(jdata.list));
                log(chalk.cyan('Sauvegarde réussie dans le fichier'), filename);
            break;
            case 'unknown-user':
                log(chalk.yellow('Identifiant ou mot de passe incorrect.'));
                client.end(); client.destroy(); rl.close();
            break;
            default:            ;
        }
        
}
