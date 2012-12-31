/*
   Copyright 2011 Portland Transport

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

if (typeof com == 'undefined') com = {};
if (com.transitboard == undefined) com.transitboard = {};

if (typeof console == 'undefined') console = {
    log: function (msg) {}};

com.transitboard.audio = function () {
    var instance = this;
    trArr({
	configString: window.location.search,
	displayInterval: 30*1000,
	displayCallback: function (data) {
	    instance.data = data;
	},
	initializeCallback: function (data) {
	    instance.data = data;
	    instance.rights = '';

	    for (var agency in data.stopsConfig) {
		instance.rights += 
		data.agencyCache.agencyData(agency).rights_notice+" ";
	    }

	    instance.fillQueue();
	    instance.speakQueue();
	}
    });
};

// these are all the things to replace to make the audio understandable
com.transitboard.audio.replacements = [
    ['/', ' '], // otherwise it says "slash"
    [/ SW /g, ' southwest '],
    [/ SE /g, ' southeast '],
    [/ NE /g, ' northeast '],
    [/ NW /g, ' northwest '],
    [/ [Dd]ata /g, ' day tuh '],
    [/ Daly /g, ' day lee '] // as in Daly City, SF bay area
]

/**
 * Return TTS-friendly text, that is more likely to soud right
 * @param {string} text
 * @returns {string} ttsText
*/
com.transitboard.audio.prototype.makeTTSFriendly = function (text) {
    // pad it with spaces to allow word searches at ends.
    var ttsText = ' ' + text + ' ';
    $.each(com.transitboard.audio.replacements, function (ind, repl) {
	ttsText = ttsText.replace(repl[0], repl[1]);
    });
    return ttsText;
};

/**
 * Fill the queue with all the headsigns (which will be backref'd to the 
 * latest real-time data). The reason we put in just the headsigns is so that
 * the speaker will always have the latest real-time data. The reason we flush
 * the queue on each iteration is that headsigns can change.
 */
com.transitboard.audio.prototype.fillQueue = function () {
    // empty it
    this.queue = [];
    // byDest is really byHeadsign
    for (var sign in this.data.arrivalsQueue.byDest())
	this.queue.push(sign);
};

/** 
 * Pull one item from the queue and speak it. If the queue is empty, speak
 * the attribution and then start over
*/
com.transitboard.audio.prototype.speakQueue = function () {
    if (this.queue.length == 0)
	this.newIteration();

    var instance = this;
    var headsign = this.queue.shift();
    var arrivals = this.data.arrivalsQueue.byDest()[headsign];
    var toSpeak = headsign + ' in ';
    var times = [];
    $.each(arrivals, function (ind, arr) {
	times.push(arr.minutes());
    });
    
    toSpeak += times.join(' and ') + ' minutes';
    this.speak(this.makeTTSFriendly(toSpeak)).done(function () {
	instance.speakQueue();
    });
};

/**
 * Speak the text passed in.
 * @param {string} text Text to speak
 * @returns {jQuery.Deferred} a deferred that will be resolved when the speech
 *   is done.
*/
com.transitboard.audio.prototype.speak = function (text) {
    var df = new $.Deferred();

    console.log('Speaking ' + text);
    speak(text);

    // bind to the ended event of the <audio> element used for synthesis
    // this has to be after the speak() because speak() creates a new audio 
    // element each time.
    var interval;
    interval = setInterval(function () {
        var audio = $('#audio audio');
        if (audio.length > 0) {
            $('#audio audio').one('ended', function () {
                df.resolve();
                clearInterval(interval);
            });
        }
    }, 1000);

    return df;
};
   
/**
 * Start a new iteration: speak the copyrights, refill the queue,
 * start again.
*/ 
com.transitboard.audio.prototype.newIteration = function () {
    var instance = this;
    this.speak(this.makeTTSFriendly(
	'Transit Board Audio, a Portland Transport production. ' +
	    this.rights))
	.done(function () {
	    instance.fillQueue();
	    instance.speakQueue();
	});
};

// start it
$(document).ready(function () {
    // should be var tbda in production
    tbda = new com.transitboard.audio();
});