class DentistScheduler {
    constructor(configuration) {
        this.getAvailability = async () => {
            const response = await fetch(configuration.SchedulerEndpoint + 'availability');
            const times = await response.json();
            let responseText = 'Current time slots available: ';
            times.map(time => {
                responseText += `${time}`;
            });
            return responseText;
        };

        this.scheduleAppointment = async (time) => {
            await fetch(configuration.SchedulerEndpoint + 'schedule', { method: 'post', body: { time: time } });
            const responseText = `An appointment was set for ${time}.`;
            return responseText;
        };
    }
}

module.exports = DentistScheduler;
