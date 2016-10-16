var request = require('request');
var restify = require('restify');
var builder = require('botbuilder');

//---------------------------------------------------------
// Configuration
//---------------------------------------------------------

// Connector
var connectorAppId = 'MyBotFrameworkAppId';
var connectorAppPassword = 'MyBotFrameworkAppPassword';

// Open Weather Map
var openWeatherMapAppId = 'MyOpenWeatherMapId';

// LUIS model
var luisModelUrl = 'MyLuisModelUrl';

//---------------------------------------------------------
// Setup
//---------------------------------------------------------

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create connector and bot
var connector = new builder.ChatConnector({
    appId: connectorAppId,
    appPassword: connectorAppPassword
});

var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Create LUIS recognizer that points at our model and pass it to IntentDialog
var recognizer = new builder.LuisRecognizer(luisModelUrl);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

//---------------------------------------------------------
// Dialogs
//---------------------------------------------------------

dialog.matches('GetWeather', [
    function (session, args, next) {
        var city = builder.EntityRecognizer.findEntity(args.entities, 'Localisation');
		
		if (!city) {
			builder.Prompts.text(session, 'De quelle ville voulez-vous connaître la météo ?');
		} else {
			next({ response: city.entity });
		}
    },
    function (session, results) {
        openweathermap(results.response, function(success, previsions) {
			if (!success) return session.send('Une erreur s\'est produite.');
			
			var message = 'Voici la météo pour ' + previsions.city + ' :\n\n' +
						  '_ Température : ' + previsions.temperature + '°C\n\n' + 
						  '_ Humidité : ' + previsions.humidity + '%\n\n' +
						  '_ Vent : ' + previsions.wind + 'km/h';
						  
			session.send(message);
		});
    }
]);

dialog.onDefault(function (session) {
    session.send('Je n\'ai pas compris votre demande, essayez plutôt de me demander la météo d\'une ville !');
});

//=========================================================
// Open Weather Map
//=========================================================

var openweathermap = function(city, callback){
	var url = 'http://api.openweathermap.org/data/2.5/weather?q=' + city + '&lang=fr&units=metric&appid=' + openWeatherMapAppId;
	
	request(url, function(err, response, body){
		try{		
			var result = JSON.parse(body);
			
			if (result.cod != 200) {
				callback(false);
			} else {
				var previsions = {
					temperature : Math.round(result.main.temp),
					humidity : result.main.humidity,
					wind: Math.round(result.wind.speed * 3.6),
					city : result.name,
				};
						
				callback(true, previsions);
			}
		} catch(e) {
			callback(false); 
		}
	});
}