// Ce fichier présente les expressions régulières des différents types de messages qu'on peut avoir
// Les paranthèses capturent les informations concernant le message (type, message, etc.)


const messagesTypes = {
    MSG_SEND_TO_ONE : /^s;(.*?);(.*?)$/i,     //1er paramètre: nom du destinataire, 2e paramètre: message
    MSG_SEND_TO_ALL : /^b;(.*?)$/i,     //paramètre: message
    MSG_LIST_USERS : /^ls;$/i,
    MSG_QUIT : /^q;$/i,

    MSG_CREATE_GROUP : /^cg;(.*?)$/i,
    MSG_JOIN_GROUP : /^j;(.*?)$/i,
    MSG_BROADCAST_GROUP : /^bg;(.*?);(.*?)$/i,
    MSG_LIST_GROUP_MEMBERS : /^members;(.*?)$/i,
    MSG_LIST_GROUP_MESSAGES : /^messages;(.*?)$/i,
    MSG_LIST_GROUPS : /^groups;$/i,
    MSG_LEAVE_GROUP : /^leave;(.*?)$/i,
    MSG_INVITE : /^invite;(.*?);(.*?)$/i,
    MSG_KICK : /^kick;(.*?);(.*?);(.*?)$/i,
    MSG_BAN : /^ban;(.*?);(.*?);(.*?)$/i,
    MSG_UNBAN : /^unban;(.*?);(.*?)$/i,
    MSG_LIST_GROUP_EVENTS : /^states;(.*?)$/i, //Pour lister tous les événements survenus dans un groupe
    MSG_SESSION_DOWNLOAD : /^sdownload;$/i,
}

module.exports = messagesTypes