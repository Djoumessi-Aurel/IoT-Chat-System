#include <WiFi.h>   // Utilisation de la librairie WiFi.h
#include <ArduinoJson.h>
#include "MessagesRegex.h"

const char* ssid = "*********";
const char* password = "*******";
WiFiClient client;
DynamicJsonDocument doc(1024), doc2(1024);
String data, command, toSend, username;
MessagesRegex tm;

//Adresse du serveur
const char* serverAddress = "192.168.43.38";
const int serverPort = 8080;

void setup() {
  Serial.begin(115200); delay(10);

  Serial.print("Connecting to "); Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected to WiFi network with IP Address: ");
  Serial.println(WiFi.localIP());

  //Connexion au serveur
  while (!client.connect(serverAddress, serverPort)) {
        Serial.println("Echec de la connexion au serveur");
        delay(1000);
    }
    Serial.println("Connexion au serveur réussie.Entrez votre nom: ");
    while (!Serial.available()) {
      ; // wait for user input
    }
    username = Serial.readStringUntil('\n');
    
    deserializeJson(doc2, "{}");
    doc2["from"] = username; doc2["pass"] = ""; doc2["action"] = "client-hello";
    toSend = ""; serializeJson(doc2, toSend);
    client.write(toSend.c_str());
}

void loop(){
  if(client.available()){
    data = client.readStringUntil('\r');
    deserializeJson(doc, data);
    JsonObject obj = doc.as<JsonObject>();

    processData(obj);
  }

  if(Serial.available()){
    command = Serial.readStringUntil('\n');
    Serial.println(command);

    processCommand(std::string(command.c_str()));
  }
  delay(30);
}

void processCommand(std::string cmd){
  std::smatch sm;
  
  if(regex_match (cmd, sm, tm.MSG_QUIT)){
    quit();
  }
  else if(regex_match (cmd, sm, tm.MSG_LIST_USERS)){
    listUsers();
  }
  else if(regex_match (cmd, sm, tm.MSG_SEND_TO_ONE)){
    sendToOne(sm.str(1), sm.str(2));
  }
  else if(regex_match (cmd, sm, tm.MSG_SEND_TO_ALL)){
    sendToAll(sm.str(1));
  }
  
}

void sendToOne(std::string _name, std::string message){
    deserializeJson(doc2, "{}");
    doc2["from"] = username; doc2["to"] = _name; doc2["msg"] = message; doc2["action"] = "client-send";
    toSend = ""; serializeJson(doc2, toSend);
    client.write(toSend.c_str());
}

void sendToAll(std::string message){
    deserializeJson(doc2, "{}");
    doc2["from"] = username; doc2["msg"] = message; doc2["action"] = "client-broadcast";
    toSend = ""; serializeJson(doc2, toSend);
    client.write(toSend.c_str());
}

void listUsers(){
    deserializeJson(doc2, "{}");
    doc2["from"] = username; doc2["action"] = "client-list-clients";
    toSend = ""; serializeJson(doc2, toSend);
    client.write(toSend.c_str());
}

void quit(){
    deserializeJson(doc2, "{}");
    doc2["from"] = username; doc2["action"] = "client-quit";
    toSend = ""; serializeJson(doc2, toSend);
    client.write(toSend.c_str());
}

void quitForce(){ //Déconnextion forcée
    deserializeJson(doc2, "{}");
    doc2["from"] = username; doc2["code"] = "CTRL C"; doc2["msg"] = "error_msg"; doc2["action"] = "client-error";
    toSend = ""; serializeJson(doc2, toSend);
    client.write(toSend.c_str());
}

void processData(JsonObject obj){
  String action = (const char*)obj["action"];
  String from = (const char*)obj["from"];
  
  if(action=="server-hello"){
    Serial.println(String("server>") + (const char*)obj["msg"]);
  }
  else if(action=="server-send"){
    Serial.println(from + String(">") + (const char*)obj["msg"]);
  }
  else if(action=="server-broadcast"){
    Serial.println(from + String(">") + (const char*)obj["msg"]);
  }
  else if(action=="server-list-clients"){
    int taille = obj["list"].size();
    Serial.print(String("server>Il y a ") + taille + " autres utilisateurs: ");
    for(int i=0; i<taille; i++){
      Serial.print((const char*)obj["list"][i]);
      if(i == taille -1) Serial.print(".");
      else Serial.print(", ");
    }
    Serial.println();
  }
  else if(action=="server-quit"){
    Serial.println("Déconnexion...");
    client.stop();
  }
  else if(action=="server-error"){
    Serial.println("Déconnexion forcée...");
    client.stop();
  }
  else if(action=="server-someone-left"){
    Serial.println(String("server>") + (const char*)obj["from"] + " left.");
  }
  else if(action=="server-someone-arrived"){
    Serial.println(String("server>") + (const char*)obj["from"] + " arrived.");
  }

}
