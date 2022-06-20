// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const { QnAMaker } = require('botbuilder-ai');
const DentistScheduler = require('./dentistscheduler');
const IntentRecognizer = require('./intentrecognizer');

class DentaBot extends ActivityHandler {
    constructor(configuration, qnaOptions) {
        // call the parent constructor
        super();
        if (!configuration) throw new Error('[QnaMakerBot]: Missing parameter. configuration is required');

        // create a QnAMaker connector
        this.QnAMaker = new QnAMaker(configuration.QnAConfiguration, qnaOptions);

        // create a DentistScheduler connector
        this.DentistScheduler = new DentistScheduler(configuration.SchedulerConfiguration);

        // create a IntentRecognizer connector
        this.IntentRecognizer = new IntentRecognizer(configuration.LuisConfiguration);

        this.onMessage(async (context, next) => {
            try {
                // send user input to QnA Maker and collect the response in a variable
                const qnaResults = await this.QnAMaker.getAnswers(context);

                // send user input to IntentRecognizer and collect the response in a variable
                const luisResult = await this.IntentRecognizer.executeLuisQuery(context);

                const topIntent = luisResult.luisResult.prediction.topIntent;

                let message;

                if (luisResult.intents[topIntent].score > 0.65) {
                    if (topIntent === 'GetAvailability') {
                        message = await this.DentistScheduler.getAvailability();
                    } else if (topIntent === 'ScheduleAppointment') {
                        message = await this.DentistScheduler.scheduleAppointment(this.IntentRecognizer.getTimeEntity(luisResult));
                    };
                } else if (qnaResults[0]) {
                    // If an answer was received from QnA Maker, send the answer back to the user.
                    message = qnaResults[0].answer;
                }

                if (!message) {
                    // If no answers were returned from the services, reply with help.
                    message = "I'm not sure what you are talking about. You can ask me questions about your dental session like can I book an appointment tomorrow at 11:45 am?"
                }

                await context.sendActivity(message);
            } catch (e) {
                console.error(e);
                await context.sendActivity('There are some errors with the Chat Bot. Please try later.');
            }

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            // write a custom greeting
            const welcomeText = 'Welcome to Coronado Dentistry. How may I help you?';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // by calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.DentaBot = DentaBot;
