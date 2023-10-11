#include <iostream>
#include <string>
#include <regex>

// Ce fichier présente les expressions régulières des différents types de messages qu'on peut avoir
// Les paranthèses capturent les informations concernant le message (type, message, etc.)

class MessagesRegex{ //Les types de regex que le client peut entrer
  public:
   
      std::regex MSG_SEND_TO_ONE =  std::regex("^s;(.*?);(.*?)$", std::regex::icase),     //1er paramètre: nom du destinataire, 2e paramètre: message
      MSG_SEND_TO_ALL =  std::regex("^b;(.*?)$", std::regex::icase),     //paramètre= message
      MSG_LIST_USERS =  std::regex("^ls;$", std::regex::icase),
      MSG_QUIT =  std::regex("^q;$", std::regex::icase),
  
      MSG_CREATE_GROUP =  std::regex("^cg;(.*?)$", std::regex::icase),
      MSG_JOIN_GROUP =  std::regex("^j;(.*?)$", std::regex::icase),
      MSG_BROADCAST_GROUP =  std::regex("^bg;(.*?);(.*?)$", std::regex::icase),
      MSG_LIST_GROUP_MEMBERS =  std::regex("^members;(.*?)$", std::regex::icase),
      MSG_LIST_GROUP_MESSAGES =  std::regex("^messages;(.*?)$", std::regex::icase),
      MSG_LIST_GROUPS =  std::regex("^groups;$", std::regex::icase),
      MSG_LEAVE_GROUP =  std::regex("^leave;(.*?)$", std::regex::icase),
      MSG_INVITE =  std::regex("^invite;(.*?);(.*?)$", std::regex::icase),
      MSG_KICK =  std::regex("^kick;(.*?);(.*?);(.*?)$", std::regex::icase),
      MSG_BAN =  std::regex("^ban;(.*?);(.*?);(.*?)$", std::regex::icase),
      MSG_UNBAN =  std::regex("^unban;(.*?);(.*?)$", std::regex::icase),
      MSG_LIST_GROUP_EVENTS =  std::regex("^states;(.*?)$", std::regex::icase), //Pour lister tous les événements survenus dans un groupe
      MSG_SESSION_DOWNLOAD =  std::regex("^sdownload;$", std::regex::icase);
};
