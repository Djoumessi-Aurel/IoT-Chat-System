var moment = require('moment');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);
const {log, lazyEqual} = require('../functions')

var address = process.env.HOST || '127.0.0.1';
var port = process.env.PORT || 8080;
var users = []; //Tableau de sockets
var groups = []; //Tableau de groupes
var messages = []; //Tous les messages seront dans ce tableau
var sentMessages = []; //Contient tous les objets JSON renvoyés par le serveur

var db = new sqlite3.Database('./aurel-steve-chat.db', (err) => {
    if (err) {
      console.error(err.message); return;
    }
    console.log('Connected to the database.');
  });

  recreateGroups();
  recreateSentMessages();


io.on("connection", (socket)=>{
    log('CONNECTED from ' + socket.handshake.address + '. Socket id = ' + socket.id);
    socket.emit("you_are_connected");
    socket.on('data', function(jdata) {
        
            
            log('DATA received from ' + socket.id + ': ' + JSON.stringify(jdata));

            if(['client-send', 'client-broadcast', 'gbroadcast'].includes(jdata.action)){ //S'il s'agit d'un envoi de message
                messages.push(jdata);
            }

            let myData = {}; //Contiendra l'objet JSON à envoyer
            switch(jdata.action){
                case 'client-hello':                    
                    socket.name = jdata.from; //Ajoutons le nom du client au socket
                    socket.pass = jdata.pass;
                    socket.groups = []; //Ajoutons la liste des groupe dans lesquels le client est
                    
                    authenticate(socket); //Gère l'authentification du client
                break;
                case 'client-send': //Envoi à un client particuler
                    myData = {from: jdata.from, to: jdata.to, msg: jdata.msg,  action: 'server-send'}
                    sendToOne(myData, jdata.to);
                    sentMessages.push(myData);
                    bd_addMessage(myData);
                break;
                case 'client-broadcast': //Envoi à tout le monde sauf à l'envoyeur
                    myData = {from: jdata.from, msg: jdata.msg,  action: 'server-broadcast'};
                    sendToAll(myData, true);
                    sentMessages.push(myData);
                    bd_addMessage(myData);
                break;
                case 'client-list-clients': //Envoi à l'envoyeur uniquement
                    let tab = []; //Tableau de noms (autres que l'envoyeur)
                    users.forEach((socketValue)=>{
                        if(!(socketValue.name.toLowerCase().trim()===jdata.from.toLowerCase().trim()))
                        {
                            tab.push(socketValue.name);
                        }
                    });

                    socket.emit("data", {from: jdata.from, action: 'server-list-clients', list: tab});
                break;
                case 'client-quit': //Déconnexion normale
                    users = users.filter((socketValue)=>{
                        return socketValue.name!==jdata.from;
                    });

                    socket.emit("data", {from: jdata.from, action: 'server-quit'});
                    console.log(`IL RESTE ${users.length} utilisateurs.`);

                    //On signale à tous les autres qu'il est parti
                    myData = {from: jdata.from, type: 'normal', action: 'server-someone-left'};
                    sendToAll(myData);
                    sentMessages.push(myData);
                    //bd_addMessage(myData);
                break;
                case 'client-error': //Déconnexion forcée
                    users = users.filter((socketValue)=>{
                        return socketValue.name!==jdata.from;
                    });
                    
                    socket.emit("data", {from: jdata.from, code: jdata.code ,msg: jdata.msg, action:'server-error'});

                    console.log(`IL RESTE ${users.length} utilisateurs.`);

                    //On signale à tous les autres qu'il est parti
                    myData = {from: jdata.from, type: 'forced', action: 'server-someone-left'};
                    sendToAll(myData);
                    sentMessages.push(myData);
                    //bd_addMessage(myData);
                break;

                case 'cgroup': //Création de groupe
                    if(groupExists(jdata.group)) //Si le groupe existe déjà
                    {
                        socket.emit('data', {group: jdata.group, action: 'group-already-exists'});
                    }
                    else{
                        groups.push(jdata.group); //On crée le groupe
                        socket.groups.push(jdata.group); //Le créateur est automatiquement dans le groupe

                        myData = {from: jdata.from, group: jdata.group, action: 'cgroup'};
                        sendToAll(myData);
                        sentMessages.push(myData);
                        bd_addMessage(myData);
                        bd_addGroup(jdata.group);
                        bd_addToGroup(jdata.from, jdata.group);
                    }
                break;

                case 'join': //Rejoindre un groupe
                    if(!groupExists(jdata.group)) //Si le groupe n'existe pas
                    {
                        socket.emit('data', {group: jdata.group, action: 'group-not-exists'});
                    }
                    else{ //Si le groupe existe et que le client n'y est pas encore...
                        if(!socketInGroup(socket, jdata.group)){
                            socket.groups.push(jdata.group); //On le met dans le groupe

                            //On informe les autres membres du groupe
                            myData = {from: jdata.from, group: jdata.group, action: 'join'}
                            sendToGroup(myData, jdata.group);
                            sentMessages.push(myData);
                            bd_addMessage(myData);
                            bd_addToGroup(jdata.from, jdata.group);
                        }                        
                    }
                break;

                case 'gbroadcast': //Envoi de messages dans un groupe

                //Si le groupe n'existe pas ou si le client n'y est pas
                    if(!groupExists(jdata.group) || !socketInGroup(socket, jdata.group))
                    {
                        socket.emit('data', {group: jdata.group, action: 'not-in-group'});
                    }

                    else{ //Si le client est dans le groupe, on envoie son message aux autres gens du groupe
                        myData = {from: jdata.from, group: jdata.group, msg: jdata.msg, action: 'gbroadcast'}
                        sendToGroup(myData, jdata.group, true);
                        sentMessages.push(myData);
                        bd_addMessage(myData);
                    }                
                break;

                case 'members': //Lister les membres du groupe

                //Si le groupe n'existe pas ou si le client n'y est pas
                    if(!groupExists(jdata.group) || !socketInGroup(socket, jdata.group))
                    {
                        socket.emit('data', {group: jdata.group, action: 'not-in-group'});
                    }

                    else{ //Si le client est dans le groupe, on lui envoie la liste des membres
                        let tab = []; //Tableau de noms
                    users.forEach((socketValue)=>{
                        if(socketInGroup(socketValue, jdata.group))
                        {
                            tab.push(socketValue.name);
                        }
                    });
                        socket.emit('data', {from: jdata.from, group: jdata.group, list: tab, action: 'members'});
                    }                
                break;

                case 'msgs': //Historique des messages d'un groupe

                //Si le groupe n'existe pas ou si le client n'y est pas
                    if(!groupExists(jdata.group) || !socketInGroup(socket, jdata.group))
                    {
                        socket.emit('data', {group: jdata.group, action: 'not-in-group'});
                    }

                    else{ //Si le client est dans le groupe, on lui envoie l'historique des messages
                        socket.emit('data', {from: jdata.from, group: jdata.group, action: 'msgs',
                        list: messagesOfGroup(jdata.group)});
                    }                
                break;
                
                case 'groups': //Liste des groupes
                        socket.emit('data', {from: jdata.from, list: groups, action: 'groups'});
                break;

                case 'leave': //Retire le client d'un groupe
                    //Si le groupe n'existe pas ou si le client n'y est pas
                    if(!groupExists(jdata.group) || !socketInGroup(socket, jdata.group))
                    {
                        socket.emit('data', {group: jdata.group, action: 'not-in-group'});
                    }
                    else{//Si le client est dans le groupe
                        myData = {from: jdata.from, group: jdata.group, action: 'leave'}
                        sendToGroup(myData, jdata.group);
                        sentMessages.push(myData);
                        bd_addMessage(myData);

                        removeFromGroup(jdata.group, jdata.from);
                        bd_removeFromGroup(jdata.from, jdata.group);
                    }
                break;

                case 'invite': //Ajoute un client (invité) dans un groupe
                    if(!groupExists(jdata.group)) //Si le groupe n'existe pas
                    {
                        socket.emit('data', {group: jdata.group, action: 'group-not-exists'});
                    }
                    //Si l'envoyeur n'est pas dans le groupe
                    else if(!socketInGroup(socket, jdata.group))
                    {
                        socket.emit('data', {group: jdata.group, action: 'not-in-group'});
                    }
                    else{//Si l'envoyeur est dans le groupe alors c'est bon
                        
                        if(addToGroup(jdata.group, jdata.dest)){
                            myData = {from: jdata.from, group: jdata.group, dest: jdata.dest, action: 'invite'}
                            sendToGroup(myData, jdata.group);
                            sentMessages.push(myData);
                            bd_addMessage(myData);
                            bd_addToGroup(jdata.dest, jdata.group);
                        }
                    }
                break;

                case 'kick': //Retirer quelqu'un d'un groupe
                    //Si le groupe n'existe pas ou si l'envoyeur n'y est pas
                    if(!groupExists(jdata.group) || !socketInGroup(socket, jdata.group))
                    {
                        socket.emit('data', {group: jdata.group, action: 'not-in-group'});
                    }
                    else if(!socketInGroup(getSocketByName(jdata.dest), jdata.group)) //Si celui qu'on veut retirer n'y est pas
                    {
                        socket.emit('data', {group: jdata.group, dest: jdata.dest, action: 'dest-not-in-group'});
                    }
                    else{//Le groupe existe, l'envoyeur et le dest y sont: on peut procéder
                        myData = {from: jdata.from, group: jdata.group, dest: jdata.dest, action: 'kick', reason: jdata.reason}
                        sendToGroup(myData, jdata.group);
                        sentMessages.push(myData);
                        bd_addMessage(myData);

                        removeFromGroup(jdata.group, jdata.dest);
                        bd_removeFromGroup(jdata.dest, jdata.group);
                    }
                break;

                case 'states': //Lister tous les événements survenus dans le groupe
                    //Si le groupe n'existe pas ou si l'envoyeur n'y est pas
                    if(!groupExists(jdata.group) || !socketInGroup(socket, jdata.group))
                    {
                        socket.emit('data', {group: jdata.group, action: 'not-in-group'});
                    }
                    else{//Le groupe existe et l'envoyeur y est
                        socket.emit('data', {from: jdata.from, group: jdata.group, action: 'states',
                        list: sentMessages.filter((value)=>{
                            if(value.group){ //Si cette donnée concerne un groupe (a un attribut group)
                                return lazyEqual(value.group, jdata.group);
                            }
                            else return false;
                            })
                        });
                    }
                break;

                case 'session-download': //Télécharger sa session
                    recreateSocketSession(socket, 'session-download');
                break;

                default:
                    log(____);
            }
        });
    });


server.listen(port, () => {
    console.log("SERVER RUNNING, parameters = ", server.address());
} );


function groupExists(groupName){

    for(const g_name of groups){
        if(lazyEqual(g_name, groupName))
        {
            return true;
        }
    }
    return false;
}

function userExists(userName){

    for(const socketValue of users){
        if(lazyEqual(socketValue.name, userName))
        {
            return true;
        }
    }
    return false;
}

//Ajoute un nouveau client(socket) dans le tableau user
function addNewUser(a_socket){
    if(!userExists(a_socket.name)) users.push(a_socket);
}

function socketInGroup(a_socket, groupName){ //True si a_socket est dans le groupe groupName

    let tab = a_socket.groups || []; //Tableau des groupes auxquels appartient ce socket

    for(const g_name of tab){
        if(g_name.toLowerCase().trim()===groupName.toLowerCase().trim())
        {
            return true;
        }
    }
    return false;
}

function sendToOne(data, toName){ //Envoi d'un message à  un client précis

    users.forEach((socketValue)=>{
        if(lazyEqual(socketValue.name, toName))
        {
            socketValue.emit('data', data);
        }
    });
}

function sendToList(data, userList, except_sender=false){ //Envoyer un message à tous les clients de la liste
    //Si except_sender est à true alors: envoyer un message à tous les clients de la liste SAUF à l'envoyeur
    userList.forEach((socketValue)=>{

        if( !except_sender || (except_sender && socketValue.name.toLowerCase().trim()!==data.from.toLowerCase().trim()) )
        {
            socketValue.emit('data', data);
        }
        
    });
}

function sendToAll(data, except_sender=false){ //Envoyer un message à tous les clients
    //Si except_sender est à true alors: envoyer un message à tous les clients SAUF à l'envoyeur

    sendToList(data, users, except_sender);
}

function sendToGroup(data, groupName, except_sender=false){ //Envoyer un message à tous les membres d'un groupe
    //Si except_sender est à true alors: envoyer un message à tous les membres du groupe SAUF à l'envoyeur

    users.forEach((socketValue)=>{
        if( !except_sender || (except_sender && !lazyEqual(socketValue.name, data.from)) )
        {
            if(socketInGroup(socketValue, groupName)){
                socketValue.emit('data', data);
            }
        }
    });
}

function messagesOfGroup(groupName){ //retourne la liste des messages du groupe groupName
    let tab = [];
    for(a_msg of messages){
        if(a_msg.group && lazyEqual(groupName, a_msg.group)){
            tab.push(a_msg);
        }
    }
    return tab;
}

function removeFromGroup(a_group, a_user){ //Retire un client d'un groupe
//Il suffit de retirer a_group du tableau des groupes lié audit client
    users.forEach((socketValue)=>{
        if(lazyEqual(socketValue.name, a_user))
        {
            socketValue.groups = socketValue.groups.filter((value)=>{
                return !lazyEqual(value, a_group);
            })
        }
    });
}

function getSocketByName(user_name){ //Renvoie le socket correspondant à l'utilisateur (nom) passé en paramètres
    for(socketValue of users){
        if(lazyEqual(socketValue.name, user_name)){
            return socketValue;
        }
    }
    return false;
}

function addToGroup(a_group, user_name){ //Ajoute un client au groupe, return false s'il y a un problème
    
    if(a_socket = getSocketByName(user_name)){//Si le client existe, on a son socket

        if(!socketInGroup(a_socket, a_group)){ //Si il n'est pas encore dans le groupe, on l'y ajoute
            a_socket.groups.push(a_group); return true;
        }
        else console.log(user_name,'déjà dans le groupe', a_group);
    }
    else console.log('le client', user_name, "n'existe pas");

    return false;
}

/* FONCTIONS TRAVAILLANT AVEC LA BASE DE DONNEES */

function recreateGroups(){ //Recrée le tableau des groupes à partir de la BD
    db.serialize(() => {
        db.each(`SELECT *
                 FROM groups`, (err, row) => {
          if (err) {
            console.error(err.message); return;
          }
          groups.push(row.groupname);
        });
      });
}

function recreateSentMessages(){ //Recrée le tableau sentMessages à partir de la BD
    db.serialize(() => {
        db.each(`SELECT *
                 FROM sentMessages`, (err, row) => {
          if (err) {
            console.error(err.message); return;
          }
          let msg = {};
          if(row.from) msg.from = row.from;
          if(row.to) msg.to = row.to;
          if(row.dest) msg.dest = row.dest;
          if(row.group) msg.group = row.group;
          msg.msg = row.msg;
          if(row.reason) msg.reason = row.reason;
          if(row.action) msg.action = row.action;
          msg.time = row.time;

          sentMessages.push(msg);
        });
      });
}

function recreateSocketGroups(a_socket){ //Associe le socket aux groupes dont il fait partie, à partir de la BD
    db.serialize(() => {
        db.all(`SELECT DISTINCT groupname FROM groups_users 
        WHERE username = '${a_socket.name}'`, (err, rows) => {
          if (err) {
            console.error(err.message); return;
          }
          rows.forEach((row)=>{
            a_socket.groups.push(row.groupname);
          });
          recreateSocketSession(a_socket, 'session-restore');
        });
      });
}

function recreateSocketSession(a_socket, action){ //Récupère la session d'un client (dans un tableau de messages)
    //Et l'envoie à ce client à travers un JSON ayant un attribut 'action'
    //action peut être 'session-restore' ou 'session-download'
    let tab = [], msgList = []; let req = ''; //log('GROUPES', a_socket.groups);
    for(a_group of a_socket.groups){
        tab.push(`'${a_group}'`);
    }
    let liste = '(' + tab.join(', ') + ')';
    db.serialize(() => {
        req = `SELECT * FROM sentMessages WHERE [from] = ? OR [to] = ? OR [dest] = ? OR [group] IN ${liste} OR [action] = 'server-broadcast' OR [action] = 'cgroup'`;
        //req = `SELECT * FROM sentMessages WHERE [from] = ?`;
        db.all(req, [a_socket.name, a_socket.name, a_socket.name], (err, rows) => {
          if (err) {
            console.error(err.message); return;
          }

          rows.forEach((row)=>{
            let msg = {};
          if(row.from) msg.from = row.from;
          if(row.to) msg.to = row.to;
          if(row.dest) msg.dest = row.dest;
          if(row.group) msg.group = row.group;
          msg.msg = row.msg;
          if(row.reason) msg.reason = row.reason;
          if(row.action) msg.action = row.action;
          msg.time = row.time;
          msgList.push(msg);
          });

          //log('REQUETE=', req);
          //log('ON RECREE LA SESSION. LENGTH=', msgList.length);
          if(msgList.length>0){
            a_socket.emit('data', {from: a_socket.name, list: msgList, action: action});
          }
          
        });
      });
}

function bd_addUser(userName){ //Ajoute un user en BD
    db.run(`INSERT INTO users(username) VALUES(?)`, [userName], function(err) {
        if (err) {
          return console.log(err.message);
        }
        // get the last insert id
        console.log(`Table users: A row has been inserted with rowid ${this.lastID}`);
      });
}

function bd_addMessage(jdata){ //Ajoute un message en BD
    let from = jdata.from || '', to = jdata.to || '', dest = jdata.dest || '', group = jdata.group || '', 
    msg = jdata.msg || '', action = jdata.action || '', reason = jdata.reason || '', time = moment().format('YYYY-MM-DD HH:mm:ss');

    db.run(`INSERT INTO sentMessages([from], [to], [dest], [group], [msg], [action], [reason], [time]) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
    [from, to, dest, group, msg, action, reason, time],
    function(err) {
        if (err) {
          return console.log(err.message);
        }
        // get the last insert id
        console.log(`Table sentMessages: A row has been inserted with rowid ${this.lastID}`);
      });
}

function bd_addGroup(groupName){ //Ajoute un groupe en BD
    db.run(`INSERT INTO groups([groupname]) VALUES(?)`,
    [groupName],
    function(err) {
        if (err) {
          return console.log(err.message);
        }
        // get the last insert id
        console.log(`Table groups: A row has been inserted with rowid ${this.lastID}`);
      });
}

function bd_addToGroup(userName, groupName){ //Ajoute un user à un groupe
    db.run(`INSERT INTO groups_users([groupname], [username]) VALUES(?, ?)`,
    [groupName, userName],
    function(err) {
        if (err) {
          return console.log(err.message);
        }
        // get the last insert id
        console.log(`Table groups_users: A row has been inserted with rowid ${this.lastID}`);
      });
}

function bd_removeFromGroup(userName, groupName){ //Retire un user d'un groupe
    db.run(`DELETE FROM groups_users WHERE username=? AND groupname=?`,
    [userName, groupName],
    function(err) {
        if (err) {
          return console.log(err.message);
        }
        // get the last insert id
        console.log(`Table groups_users: A row has been deleted with rowid ${this.lastID}`);
      });
}

function authenticate(a_socket){
    db.all(`SELECT * FROM users WHERE username = ?`, [a_socket.name], 
    (err, rows) => {
          if (err) {
            return console.error(err.message);
          }

          if(rows.length > 0){//Si l'utilisateur existe en BD, on vérifie son mot de passe
            //log('pass:', rows[0].password, 'socket-pass', a_socket.pass);

            //Si l'utilisateur n'a pas de mot de passe
            if(rows[0].password==='' && a_socket.pass===''){
                manageNewUser(a_socket);
                return;
            }


            bcrypt.compare(a_socket.pass, rows[0].password, function(err, result) {
                if(err) return console.error(err.message);
                if(result){//Bon mot de passe
                    manageNewUser(a_socket);
                }
                else{//Mauvais mot de passe
                    a_socket.emit('data', {from: a_socket.name, action:'unknown-user'});
                }
            });
          }
          else{ //S'il n'y  est pas encore, on l'ajoute
            bcrypt.hash(a_socket.pass, saltRounds, function(err, hash) {
                if(err){
                    return console.error(err.message);
                }
                // Sauvegarde de l'utilisateur en base de données
            db.run(`INSERT INTO users(username, password) VALUES(?, ?)`, [a_socket.name, hash], 
                function(err) {
                    if (err) {
                    return console.log(err.message);
                    }
                // get the last insert id
                console.log(`Table users: A row has been inserted with rowid ${this.lastID}`);
                manageNewUser(a_socket);
              });

            });
            
          }
        });
}

function manageNewUser(socket){ 
/*
 * Effectue les réglages nécessaires lorsque le client vient de s'authentifier (se connecter)
 * par exemple: actualiser ses groupes, restaurer sa session, actualiser le tableau d'utilisateurs, signaler aux clients.
 */
    recreateSocketGroups(socket); //On recrée le tableau de groupes du client à partir de la BD

    //On signale à tous les autres qu'il est arrivé
    myData = {from: socket.name, action: 'server-someone-arrived'};
    sendToAll(myData);
    sentMessages.push(myData);
    //bd_addMessage(myData);

    addNewUser(socket); //Ajoutons le socket au tableau des utilisateurs
    bd_addUser(socket.name);
    log('Nb Users:', users.length);
    log(users[users.length-1].name);

    socket.emit('data', {from: socket.name, action:'server-hello',  msg: 'Welcome '+socket.name+' !'});

    //ENFIN, ON RECREE LA SESSION DE L'UTILISATEUR
    //recreateSocketSession(socket);
}
