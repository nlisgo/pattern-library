'use strict';
var utils = require('../libs/elife-utils')();
module.exports = class AudioPlayer {

  // Passing window and document separately allows for independent mocking of window in order
  // to test feature support fallbacks etc.
  constructor($elm, _window = window, doc = document) {
    if (!$elm) {
      console.warn('No element provided');
      return;
    }

    if (!_window.HTMLAudioElement) {
      console.warn('Audio element not supported');
      return;
    }

    console.log('Initialising Audio Player...');

    this.uniqueId = utils.uniqueIds.get('audio', doc);
    this.$elm = $elm;
    this.$elm.id = this.uniqueId;
    this.$audioElement = this.$elm.querySelector('audio');
    this.$playButton = AudioPlayer.buildPlayButton(this);
    this.$icon = this.$playButton.querySelector('.audio-player__toggle_play_icon');
    this.$possibleProgressTrack = AudioPlayer.buildProgressIndicator(this);
    this.$progressBar = this.$possibleProgressTrack.querySelector('[class*="progress_bar"]');
    this.$timeIndicators = AudioPlayer.buildTimeIndicators(this);
    this.$currentTime = this.$timeIndicators.querySelector('[class*="current_time"]');
    this.$duration = this.$timeIndicators.querySelector('[class*="duration"]');

    if (!this.$audioElement) {
      console.warn('No audio element found');
      return;
    }

    // state
    this.duration = null;
    this.isPlaying = false;

    // setup
    this.$elm.classList.add('audio-player--js');

    // events
    this.$playButton.addEventListener('click', () => {
      this.togglePlay(this.$audioElement, this.$playButton);
    }, false);

    this.$audioElement.addEventListener('loadedmetadata', () => {
      this.duration = this.$audioElement.duration;
      this.$duration.innerHTML = AudioPlayer.secondsToMinutes(this.duration);
    });

    this.$audioElement.addEventListener('timeupdate', this.update.bind(this));
  }

  /**
   * Converts seconds to a display of minutes & seconds.
   *
   * @param {Number} seconds The time to convert, in seconds
   * @returns {string} The time in a [m]m:ss string
   */
  static secondsToMinutes(seconds) {
    let _seconds = parseInt(seconds, 10);
    let mins = Math.floor(_seconds / 60);
    let secs = _seconds % 60;
    if (secs <= 9) {
      secs = '0' + secs;
    }

    return `${mins}:${secs}`;
  }

  //noinspection JSValidateJSDoc
  /**
   * Toggles play/pause state of media file.
   *
   * @param {HTMLAudioElement} $audioElement The audio element to toggle the play state of
   * @param {HTMLButtonElement} $togglePlayButton The button controlling the playback
   */
  togglePlay($audioElement, $togglePlayButton) {
    if (this.isPlaying) {
      $audioElement.pause();
      AudioPlayer.updateIconState(this.$icon, 'play');
      $togglePlayButton.classList.add('audio-player__toggle_play--playable');
      $togglePlayButton.classList.remove('audio-player__toggle_play--pauseable');
      this.isPlaying = false;

    } else {
      $audioElement.play();
      AudioPlayer.updateIconState(this.$icon, 'pause');
      $togglePlayButton.classList.add('audio-player__toggle_play--pauseable');
      $togglePlayButton.classList.remove('audio-player__toggle_play--playable');
      this.isPlaying = true;
    }
  }

  /**
   * Update the progress bar and elapsed time indicator based on track's current time.
   */
  update() {
    let pc = (this.$audioElement.currentTime / this.duration) * 100;
    let currentTime2Dis = AudioPlayer.secondsToMinutes(Math.floor(this.$audioElement.currentTime));
    this.$progressBar.style.width = `${pc}%`;
    this.$currentTime.innerHTML = currentTime2Dis;

    if (this.$audioElement.ended) {
      AudioPlayer.updateIconState(this.$icon, 'play');
      this.isPlaying = false;
    }
  }

  /**
   * Updates the icon state for the play button.
   *
   * @param $icon {HTMLImageElement} The img to update
   * @param state {string} The state to update to (either 'play' or 'pause')
   */
  static updateIconState($icon, state) {
    if (state !== 'play' && state !== 'pause') {

      return;
    }

    $icon.src = AudioPlayer.getIconPath((state));
    $icon.alt = state;
  }

  /**
   * Event handler to determine track seek time in response to user interaction.
   *
   * @param e The user-generated click event
   * @param {AudioPlayer} player The audio player object that the new element belongs to
   */
  handleSeek(e, player) {
    var newSeekPosition = parseInt(e.offsetX, 10);
    var availableWidth = player.$possibleProgressTrack.clientWidth;
    var durationProportionToSeek = (newSeekPosition / parseInt(availableWidth, 10));
    this.seek(durationProportionToSeek * player.duration, player.$audioElement);
  }

  //noinspection JSValidateJSDoc
  /**
   * Seeks a particular time in the media file.
   *
   * @param {Number} time The time to seek
   * @param {HTMLAudioElement} $audioElement The audio element to toggle the play state of
   */
  seek(time, $audioElement) {
    $audioElement.currentTime = time;
    this.update();
  }

  /**
   * Builds the progress indicator.
   *
   * @param {AudioPlayer} player The audio player object that the new element belongs to
   * @returns {Element} The progress indicator
   */
  static buildProgressIndicator(player) {
    var $barWrapper = utils.buildElement('div',
                               ['audio-player__progress'],
                               '',
                               '#' + player.uniqueId + ' [class*="audio-player__container"]');

    utils.buildElement('div', ['audio-player__progress_bar'], '', $barWrapper);

    $barWrapper.addEventListener('click', function (e) {
      player.handleSeek(e, player);
    }, false);

    return $barWrapper;
  }

  /**
   * Builds the play button.
   *
   * @param {AudioPlayer} player The audio player object that the new element belongs to
   * @returns {Element} The play/pause button
   */
  static buildPlayButton(player) {
    var $button = utils.buildElement('button',
                              ['audio-player__toggle_play'],
                              '',
                              '#' + player.uniqueId + ' [class*="audio-player"]',
                              true);
    var $image = utils.buildElement('img',
                       ['audio-player__toggle_play_icon'],
                       '',
                       $button);
    $image.src = AudioPlayer.getIconPath('play');
    $image.alt = 'Play';
    return $button;
  }

  /**
   * Builds the current time and duration indicators.
   *
   * @param {AudioPlayer} player The audio player object that the new element belongs to
   * @returns {Element} An element containing the current time and duration indicators.
   */
  static buildTimeIndicators(player) {
    var playerId = player.uniqueId;
    var $container = utils.buildElement('div',
                                        ['audio-player__times'],
                                        '',
                                        '#' + playerId + ' [class*=audio-player__header]',
                                        true);

    utils.buildElement('span', ['audio-player__current_time'], '0:00', $container);
    utils.buildElement('span', ['audio-player__duration'], '0:00', $container);
    return $container;
  }

  static getIconPath(iconName) {

    if (iconName !== 'play' && iconName !== 'pause') {
      return;
    }

    return `../../assets/img/icons/audio-${iconName}.svg`;
  }
};