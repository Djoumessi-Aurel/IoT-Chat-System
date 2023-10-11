#include <WiFi.h>
//#include <ESP8266WiFi.h>
#include <ArduinoJson.h>
#include <vector>

#define NUM_CLIENTS 20

//Structure représentant un groupe
struct Group {
  String name; //Le nom du groupe
  std::vector<String> members; //Liste des membres du groupe
  std::vector<String> banned; //Liste des bannis du groupe
};

const char* ssid     = "********";
const char* password = "******";
std::vector<String> users_n; //Tableau des noms des clients connectés
std::vector<WiFiClient> users; //Tableau des clients connectés
String data, _from, _to, _action, toSend;
String CLIENT;
String ACTION;
std::vector<Group> groups; //Tableau des groupes
DynamicJsonDocument doc(1024); DynamicJsonDocument doc2(1024);

WiFiServer server(80); //On lance le serveur sur le port 80

void setup()
{
    Serial.begin(115200);
    pinMode(5, OUTPUT);      // set the LED pin mode

    delay(10);

    // We start by connecting to a WiFi network

    Serial.println();
    Serial.println();
    Serial.print("Connecting to ");
    Serial.println(ssid);

    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println("");
    Serial.println("WiFi connected.");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());
    
    server.begin();
    Serial.println("Server started");
}

int value = 0;

void loop(){
 checkForNew();
 checkClients();
}

void checkClients(){
  for(int i=0; i<users.size(); i++){
     if (users.at(i).connected()) {
          //client.println(input);
          if(users.at(i).available()){ //S'il y a quelque chose à lire venant de ce client...
           data = users.at(i).readStringUntil('\r');
           Serial.println(data);
           deserializeJson(doc, data);
           deserializeJson(doc2, "{}");
           JsonObject obj = doc.as<JsonObject>();
           _from = (const char*)obj["from"]; _action = (const char*)obj["action"];

           if(_action=="client-hello"){ 
           // Ce cas est géré dans la fonction checkForNew()
           }
           else if(_action=="client-send"){
            _to = (const char*)obj["to"]; String _msg =  (const char*)obj["msg"];
            doc2["from"] = _from; doc2["to"] = _to; doc2["msg"] = _msg; doc2["action"] = "server-send";
            toSend = ""; serializeJson(doc2, toSend);
            sendToOne(_to, toSend);
           }
           else if(_action=="client-broadcast"){
            String _msg =  (const char*)obj["msg"];
            doc2["from"] = _from; doc2["msg"] = _msg; doc2["action"] = "server-broadcast";
            toSend = ""; serializeJson(doc2, toSend);
            sendToOthers(_from, toSend);
           }
           else if(_action=="client-list-clients"){
            doc2["from"] = _from; doc2["action"] = "server-list-clients";
            JsonArray list = doc2.createNestedArray("list");
            getOtherClients(users_n.at(i), list);
            toSend = ""; serializeJson(doc2, toSend);
            users.at(i).write(toSend.c_str());
           }
           else if(_action=="client-quit"){
            doc2["from"] = _from; doc2["action"] = "server-quit";
            toSend = ""; serializeJson(doc2, toSend);
            users.at(i).write(toSend.c_str());
            deleteUser(users_n.at(i)); //On supprime le client du tableau

            doc2["action"] = "server-someone-left"; doc2["type"] = "normal";
            toSend = ""; serializeJson(doc2, toSend);
            sendToAll(toSend);
           }
           else if(_action=="client-error"){
            doc2["from"] = _from; doc2["action"] = "server-error";
            toSend = ""; serializeJson(doc2, toSend);
            users.at(i).write(toSend.c_str());
            deleteUser(users_n.at(i)); //On supprime le client du tableau

            doc2["action"] = "server-someone-left"; doc2["type"] = "forced";
            toSend = ""; serializeJson(doc2, toSend);
            sendToAll(toSend);
           }
           else if(_action=="cgroup"){
            String groupname = (const char*)obj["group"];
            int groupIndex = groupExists(groupname);
            
            if(groupIndex > -1) //Si le groupe existe déjà
                {
                  doc2["group"] = groupname; doc2["action"] = "group-already-exists";
                  toSend = ""; serializeJson(doc2, toSend);
                  users.at(i).write(toSend.c_str());
                }
            else{ //Le groupe n'existe pas encore
              Group a_group;
              a_group.name = groupname;
              groups.push_back(a_group); //On crée le groupe
              addToGroup(groups.size()-1, _from); //On y ajoute le créateur du groupe
              
              doc2["from"] = _from; doc2["group"] = groupname; doc2["action"] = "cgroup";
              toSend = ""; serializeJson(doc2, toSend);

              sendToAll(toSend);
            }
           }
           else if(_action=="join"){
            String groupname = (const char*)obj["group"];
            int groupIndex = groupExists(groupname);
            
            if(groupIndex == -1) //Si le groupe n'existe pas
                {
                  doc2["group"] = groupname; doc2["action"] = "group-not-exists";
                  toSend = ""; serializeJson(doc2, toSend);
                  users.at(i).write(toSend.c_str());
                }
            else{ //Le groupe existe
              
                if(!clientInGroup(groupIndex, _from)){ //Si le client n'est pas encore dans ce groupe
                  addToGroup(groupIndex, _from); //On l'y ajoute
    
                  doc2["from"] = _from; doc2["group"] = groupname; doc2["action"] = "join";
                  toSend = ""; serializeJson(doc2, toSend);
                  sendToGroup(groupIndex, toSend);
                }
                
            }
           }
           else if(_action=="gbroadcast"){
            String groupname = (const char*)obj["group"];
            String msg = (const char*)obj["msg"];
            int groupIndex = groupExists(groupname);

            //Si le groupe n'existe pas ou si le client n'y est pas
            if(groupIndex == -1 || !clientInGroup(groupIndex, _from))
                {
                  doc2["group"] = groupname; doc2["action"] = "not-in-group";
                  toSend = ""; serializeJson(doc2, toSend);
                  
                  users.at(i).write(toSend.c_str());
                }
            else{ //Le groupe existe et le client y est
                  doc2["from"] = _from; doc2["group"] = groupname;
                  doc2["msg"] = msg; doc2["action"] = "gbroadcast";
                  toSend = ""; serializeJson(doc2, toSend);
                  
                  sendToGroupExceptOne(groupIndex, toSend, _from);
                }
           }
           else if(_action=="members"){
            String groupname = (const char*)obj["group"];
            int groupIndex = groupExists(groupname);

            //Si le groupe n'existe pas ou si le client n'y est pas
            if(groupIndex == -1 || !clientInGroup(groupIndex, _from))
                {
                  doc2["group"] = groupname; doc2["action"] = "not-in-group";
                  toSend = ""; serializeJson(doc2, toSend);
                  
                  users.at(i).write(toSend.c_str());
                }
            else{ //Le groupe existe et le client y est
                  doc2["from"] = _from; doc2["group"] = groupname; doc2["action"] = "members";
                  JsonArray list = doc2.createNestedArray("list");
                  fromVectorToJsonArray(groups.at(groupIndex).members, list);
                  toSend = ""; serializeJson(doc2, toSend);
                  
                  users.at(i).write(toSend.c_str());
                }
           }
           else if(_action=="groups"){

            doc2["from"] = _from; doc2["action"] = "groups";
            JsonArray list = doc2.createNestedArray("list");
            for(int i=0; i<groups.size(); i++){
                  list.add(groups.at(i).name);
              }
            toSend = ""; serializeJson(doc2, toSend);
            
            users.at(i).write(toSend.c_str());
           }
           else if(_action=="leave"){
            String groupname = (const char*)obj["group"];
            int groupIndex = groupExists(groupname);

            //Si le groupe n'existe pas ou si le client n'y est pas
            if(groupIndex == -1 || !clientInGroup(groupIndex, _from))
                {
                  doc2["group"] = groupname; doc2["action"] = "not-in-group";
                  toSend = ""; serializeJson(doc2, toSend);
                  
                  users.at(i).write(toSend.c_str());
                }
            else{ //Le groupe existe et le client y est
                  doc2["from"] = _from; doc2["group"] = groupname; doc2["action"] = "leave";
                  toSend = ""; serializeJson(doc2, toSend);
                  sendToGroup(groupIndex, toSend);
                  
                  removeFromGroup(groupIndex, _from); //On le retire du groupe
                }
           }
           else if(_action=="invite"){
            String groupname = (const char*)obj["group"];
            String dest = (const char*)obj["dest"];
            int groupIndex = groupExists(groupname);

            if(!clientExists(dest)) continue; //Si le destinataire n'existe pas, on ne fait rien.

            //Si le groupe n'existe pas ou si le client n'y est pas
            if(groupIndex == -1 || !clientInGroup(groupIndex, _from))
                {
                  doc2["group"] = groupname; doc2["action"] = "not-in-group";
                  toSend = ""; serializeJson(doc2, toSend);
                  
                  users.at(i).write(toSend.c_str());
                }
            else{ //Le groupe existe et le client y est
                  if(!clientInGroup(groupIndex, dest)){ //Si dest n'est pas encore dans ce groupe                      
                      addToGroup(groupIndex, dest); //On l'y ajoute

                      doc2["from"] = _from; doc2["group"] = groupname; doc2["dest"] = dest; doc2["action"] = "invite";
                      toSend = ""; serializeJson(doc2, toSend);
                      sendToGroup(groupIndex, toSend); //On informe tous les membres du groupe
                  }
                }
           }
           else if(_action=="kick"){
            String groupname = (const char*)obj["group"];
            String dest = (const char*)obj["dest"], reason = (const char*)obj["reason"];
            int groupIndex = groupExists(groupname);

            if(!clientExists(dest)) continue; //Si le destinataire n'existe pas, on ne fait rien.

            //Si le groupe n'existe pas ou si le client n'y est pas
            if(groupIndex == -1 || !clientInGroup(groupIndex, _from))
                {
                  doc2["group"] = groupname; doc2["action"] = "not-in-group";
                  toSend = ""; serializeJson(doc2, toSend);
                  
                  users.at(i).write(toSend.c_str());
                }
            else{ //Le groupe existe et le client y est
                  if(!clientInGroup(groupIndex, dest)){ //Si dest (celui qu'on veut retirer) n'est pas dans ce groupe                     

                      doc2["group"] = groupname; doc2["dest"] = dest; doc2["action"] = "dest-not-in-group";
                      toSend = ""; serializeJson(doc2, toSend);
                      users.at(i).write(toSend.c_str());
                  }
                  else{//Le groupe existe, l'envoyeur et le dest y sont: on peut procéder
                      doc2["from"] = _from; doc2["group"] = groupname; doc2["dest"] = dest;
                      doc2["reason"] = reason; doc2["action"] = "kick";
                      toSend = ""; serializeJson(doc2, toSend);
                      sendToGroup(groupIndex, toSend); //On informe tous les membres du groupe

                      removeFromGroup(groupIndex, dest); //On retire dest du groupe
                  }
                }
           }
           
          }
          delay(10);
        }
  }
}

void checkForNew()
{
  for (int i = 0; i < NUM_CLIENTS; i++)
  {
    WiFiClient client = server.available();
      if (client) {
      if (client.connected()) {
          //client.println(input);
          if(client.available()){
           data = client.readStringUntil('\r');
           Serial.println(data);
           deserializeJson(doc, data);
           JsonObject obj = doc.as<JsonObject>();
           Serial.print("from: "); _from = (const char*)obj["from"];
           Serial.print(_from);
           Serial.print(", action: "); _action = (const char*)obj["action"];
           Serial.println(_action);

           if(_action=="client-hello"){
            if(!clientExists(_from)){
              Serial.println("Nouveau client");
              users_n.push_back(_from); users.push_back(client);
            }
            else {Serial.println("Ancien client");}
            
            toSend = "{\"from\":\""; toSend += _from + "\",\"action\":\"server-hello\", \"msg\":\"Welcome ";
            toSend += _from; toSend += "\"}";
            client.write(toSend.c_str());
            toSend = "{\"from\":\""; toSend += _from + "\",\"action\":\"server-someone-arrived\"}";
            sendToOthers(_from, toSend);
           }
           
          }
        }
      }
  }
  delay(20);
}


bool clientExists(String _name){
  return std::find(users_n.begin(), users_n.end(), _name) != users_n.end();
}

void sendToOne(String _name, String myData)
{
  for(int i=0; i<users_n.size(); i++){
    if(users_n.at(i)==_name && users.at(i).connected()){
      users.at(i).write(myData.c_str()); break;
    }
  }
}

void sendToAll(String myData)
{
  for(int i=0; i<users_n.size(); i++){
    if(users.at(i).connected()){
      users.at(i).write(myData.c_str());
    }
  }
}

void sendToOthers(String _name, String myData)
{
  for(int i=0; i<users_n.size(); i++){
    if(users_n.at(i)!=_name && users.at(i).connected()){
      users.at(i).write(myData.c_str());
    }
  }
}

void sendToGroup(int _groupIndex, String myData)
{
  for(int i=0; i<users_n.size(); i++){
    if(clientInGroup(_groupIndex ,users_n.at(i)) && users.at(i).connected()){
      users.at(i).write(myData.c_str());
    }
  }
}

void sendToGroupExceptOne(int _groupIndex, String myData, String exclu) //Envoie à tous les mêmbres d'un groupe, sauf à un en particulier (exclu)
{
  for(int i=0; i<users_n.size(); i++){
    if(clientInGroup(_groupIndex ,users_n.at(i)) && users_n.at(i)!=exclu && users.at(i).connected()){
      users.at(i).write(myData.c_str());
    }
  }
}

void deleteUser(String _name){
  for(int i=0; i<users_n.size(); i++){
    if(users_n.at(i)==_name){
      users_n.erase(users_n.begin() + i);
      users.erase(users.begin() + i);
      break;
    }
  }
  Serial.print(users.size()); Serial.println(" utilisateur(s) restant(s))");
}

void getOtherClients(String _name, JsonArray& liste)
{
  for(int i=0; i<users_n.size(); i++){
    if(users_n.at(i)!=_name){
      liste.add(users_n.at(i));
    }
  }
}

void fromVectorToJsonArray(std::vector<String> vec, JsonArray& liste) //Remplis un JsonArray à partir d'un vector
{
  for(int i=0; i<vec.size(); i++){
      liste.add(vec.at(i));
  }
}

int groupExists(String _groupname){
  for(int i=0; i<groups.size(); i++){
    if(groups.at(i).name==_groupname){
      return i;
    }
  }
  return -1;
}

void addToGroup(int _groupIndex, String _username){
  int i = _groupIndex;
  if(i > -1){
    groups.at(i).members.push_back(_username);
  }
}

void removeFromGroup(int _groupIndex, String _username){
  int i = _groupIndex;
  if(i > -1){//Si le groupe existe
    int j = indexInVector(groups.at(i).members, _username); //indice de l'utilisateur dans le groupe
    if(j > -1){ //Si l'utilisateur est dans le groupe
      groups.at(i).members.erase(groups.at(i).members.begin() + j);
    }
  }
}

bool clientInGroup(int _groupIndex, String _username){
  int i = _groupIndex;
  if(i > -1){
    return std::find(groups.at(i).members.begin(), groups.at(i).members.end(), _username) != groups.at(i).members.end();
  }
  return false;
}

void banFromGroup(int _groupIndex, String _username){
  int i = _groupIndex;
  if(i > -1){
    groups.at(i).banned.push_back(_username);
  }
}

void deBanFromGroup(int _groupIndex, String _username){
  int i = _groupIndex;
  if(i > -1){
    int j = indexInVector(groups.at(i).banned, _username); //indice de l'utilisateur dans les bannis du groupe
    if(j > -1){ //Si l'utilisateur est dans le groupe
      groups.at(i).banned.erase(groups.at(i).banned.begin() + j);
    }
  }
}

bool clientIsBanned(int _groupIndex, String _username){
  int i = _groupIndex;
  if(i > -1){
    return std::find(groups.at(i).banned.begin(), groups.at(i).banned.end(), _username) != groups.at(i).banned.end();
  }
  return false;
}

int indexInVector(std::vector<String>& vec, String value){ //Renvoie l'indice d'une valeur dans un tableau, et -1 si la valeur n'y est pas
  for(int i=0; i<vec.size(); i++){
    if(vec.at(i) == value){
      return i;
    }
  }
  return -1;
}
