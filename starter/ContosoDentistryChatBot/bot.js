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

        // create a IntentRecognizer connector
        this.IntentRecognizer = new IntentRecognizer(configuration.LuisConfiguration);

        this.onMessage(async (context, next) => {
            // send user input to IntentRecognizer and collect the response in a variable

            // Send user input to LUIS
            const LuisResult = await this.IntentRecognizer.executeLuisQuery(context);

            // determine which service to respond with based on the results from LUIS //
            if (LuisResult.luisResult.prediction.topIntent === 'ScheduleAppointment' &&
                LuisResult.intents.ScheduleAppointment.score > 0.6 &&
                LuisResult.entities.$instance &&
                LuisResult.entities.$instance.time &&
                LuisResult.entities.$instance.time[0]
            ) {
                const time = LuisResult.entities.$instance.time[0].text;
                // Call api with time entity info
                const getAppointmentTime = `You can book an appointment at ${time}.`;
                console.log(getAppointmentTime);
                await context.sendActivity(getAppointmentTime);
                await next();
                return;
            }

            if (LuisResult.luisResult.prediction.topIntent === 'GetAvailability' &&
                LuisResult.intents.GetAvailability.score > 0.6 &&
                LuisResult.entities.$instance &&
                LuisResult.entities.$instance.date &&
                LuisResult.entities.$instance.date[0]
            ) {
                const date = LuisResult.entities.$instance.date[0].text;
                // Call api with date entity info
                const getAvailabilityDate = `The dentist will be available on ${date}.`;
                console.log(getAvailabilityDate);
                await context.sendActivity(getAvailabilityDate);
                await next();
                return;
            }

            await next();

            // send user input to QnA Maker and collect the response in a variable
            const qnaResults = await this.QnAMaker.getAnswers(context);
            // If an answer was received from QnA Maker, send the answer back to the user.
            if (qnaResults[0]) {
                console.log(qnaResults[0]);
                await context.sendActivity(`${qnaResults[0].answer}`);
            } else {
                // If no answers were returned from QnA Amker, reply with help.
                await context.sendActivity("I'm not sure what you are talking about. You can ask me questions about your dental session like can I book an appointment tomorrow at 11:45 am?");
            }

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            // write a custom greeting
            const welcomeText = '';
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
