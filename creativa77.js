var Sounds = new Meteor.Collection('sounds');
var SOUNDS_DIR = '/sounds/';
var SOUNDS_FORMAT = '.mp3';
if (Meteor.isClient) {
  /**
   * waits for loud sound to happen to perform a certain action
   * @param  {Function} callback executes everytime a load sound is detected within a 100ms window
   */
  var waitForLoudSound = function (callback) {
    var checkForLoud = function (analyser, callback) {
      var MIN_LOUD_TOLERANCE = 100;
      var array =  new Uint8Array(analyser.frequencyBinCount);
      var arrayLen = array.length;
      setInterval(function() {
          analyser.getByteFrequencyData(array); // copies 0-255 frequency values into array
          var average = [].reduce.call(array, function (a, b) {
            return a + b;
          }, 0) / arrayLen;
          var isLoud = average > MIN_LOUD_TOLERANCE;
          if (isLoud) {
            callback(average);
          };
      }, 10);
    };
    if (!navigator.webkitGetUserMedia) {
      return alert('Just Chrome with webcam support for now please!');
    }
    navigator.webkitGetUserMedia({
      audio: true
    }, function (stream) {
        var aCtx = new webkitAudioContext();
        var microphone = aCtx.createMediaStreamSource(stream);
        var analyser = aCtx.createAnalyser();
        microphone.connect(analyser);
        // analyser.connect(aCtx.destination); // to output incoming sound on speakers
        checkForLoud(analyser, callback);
    }, alert);
  };
  /**
   * updates checked sound in database
   * @param  {String} checkedName name of the sound that we want to set as `checked` in the database.
   */
  var updateAndPlay = function (checkedName) {
    var previouslyChecked = Sounds.findOne({
      checked: true
    });
    var checked = Sounds.findOne({
      name: checkedName
    });
    // remove checked property from previously selected element if it's not the same as the current
    if (previouslyChecked && previouslyChecked._id !== checked._id) {
      Sounds.update(previouslyChecked._id, {
        $unset: {
          checked: true
        }
      });
    }
    Sounds.update(checked._id, {
      $set: {
        checked: true,
        checkedTime: new Date().getTime()
      }
    });
    Meteor.call('play', checkedName);
  }
  var $ = document.querySelector.bind(document);
  Template.sound_selector.events({
    'change :radio': function (ev) {
      updateAndPlay(ev.currentTarget.value);
    }
  });

  Template.sound_selector.maybeChecked = function () {
    return this.checked ? 'checked' : ''; 
  }

  Template.sound_selector.sounds = function () {
    return Sounds.find();
  }

  Template.sound_selector.currentSound = function () {
    var checked = Sounds.findOne({
      checked: true
    });
    if (checked) {
      checked = SOUNDS_DIR + checked.name + SOUNDS_FORMAT + '?time=' + checked.checkedTime;
    }
    return checked;
  }
  waitForLoudSound(function (average) {
    var checked = $('.sounds :checked');
    if ($('.js-player').paused && checked) { // do not trigger action if there is a sound being performed already
      updateAndPlay(checked.value);
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    Sounds.remove({});
    Sounds.insert({
      name: 'food-processor',
      description: 'Food Processor'
    });
    Sounds.insert({
      name: 'microwave-oven-bell',
      description: 'Microwave Oven Bell'
    });
    Sounds.insert({
      name: 'water-dripping',
      description: 'Water Dripping'
    });
    Sounds.insert({
      name: 'toaster-up',
      description: 'Toaster Up'
    });
  });
  Meteor.methods({
    play: function (soundName) {
      var soundPath = process.env.PWD + '/public' + SOUNDS_DIR + soundName + SOUNDS_FORMAT;
      var exec = Npm.require('child_process').exec;
      var isWin = /^win/.test(process.platform);
      var isMac = process.platform === 'darwin';
      var command = 'xdg-open';
      if (isWin) {
        command = 'start';
      } else if (isMac) {
        command = 'open';
      }
      exec([command, soundPath].join(' '));
    }
  });
}