const showLogs = function(){
    if(process.env.DEBUG && process.env.DEBUG.trim().toLowerCase()==='false') return false;
    return true;
};

const log = function(...args){
    if(showLogs()) console.log(...args);
};

const lazyEqual = function(string1, string2){
    return string1.toLowerCase().trim()===string2.toLowerCase().trim();
}


module.exports = {showLogs, log, lazyEqual};