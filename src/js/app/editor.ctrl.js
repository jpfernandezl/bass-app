(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('EditModeController', EditModeController)

  function EditModeController($scope, $timeout, context, workspace, audioPlayer, audioVisualiser, projectManager, Drums,
                         BassSection, DrumSection, BassTrackSection, DrumTrackSection, HighlightTimeline, swiperControl) {


    $scope.swiperControl = swiperControl;
    $scope.slides = [];
    audioPlayer.setPlaybackSpeed(1);


    $scope.player.playbackRangeChanged = function() {
      console.log('playbackRangeChanged');
      var firstBar = $scope.player.playbackRange.start;
      var lastBar = $scope.player.playbackRange.end - 1;
      audioPlayer.playbackRange = {
        start: {
          bar: firstBar,
          beat: 1
        },
        end: {
          bar: lastBar,
          beat: workspace.section.timeSignature.top
        }
      };
      var firstBeat = (firstBar - 1) * workspace.section.timeSignature.top;
      var lastBeat = (lastBar) * workspace.section.timeSignature.top - 1;
      swiperControl.setVisibleRange(firstBeat, lastBeat);
    }


    timeline = new HighlightTimeline(swiperControl);

    $scope.ui.bpmChanged = function(value) {
      console.log('bpm changed: '+value);
      audioPlayer.setBpm(workspace.section.bpm);
    };

    function beatPrepared(evt) {
      if (evt.playbackActive && !$scope.player.visibleBeatsOnly) {
        var slide = evt.flatIndex - swiperControl.firstSlide;
        // console.log('flatIndex: '+evt.flatIndex+' slide: '+slide);
        // console.log('active index: '+swiperControl.barSwiper.activeIndex);
        if (slide < swiperControl.barSwiper.activeIndex) {
          // compute index of 'cloned' looped slide
          slide = swiperControl.lastSlide - swiperControl.firstSlide + 1 + slide;
        }
        // console.log('slide to '+slide);

        var timeToBeat = evt.startTime - evt.eventTime;
        // console.log(slide-$scope.barSwiper.activeIndex);
        // console.log(timeToBeat);
        //setTimeout(function() {
          swiperControl.barSwiper.slideTo(
            slide,
            (slide === 0)? 0 : workspace.section.animationDuration,
            true
          );
        //}, parseInt(timeToBeat*1000)-50);
      }


      if (!audioVisualiser.enabled && $scope.player.graphEnabled) {
        audioVisualiser.activate(workspace.track.audio);
      }
      if (audioVisualiser.enabled && !$scope.player.graphEnabled) {
        audioVisualiser.deactivate();
      }
      if (audioVisualiser.enabled) {
        audioVisualiser.beatSync(evt);
      }

      timeline.beatSync(evt);
    }

    function updateLockedPlayerRange() {
      console.log('** updateLockedPlayerRange');
      // var sFlatIndex = swiperControl.barSwiper.snapIndex
      var sFlatIndex = swiperControl.firstSlide + swiperControl.barSwiper.snapIndex * workspace.section.beatsPerSlide;
      var eFlatIndex = sFlatIndex + workspace.section.beatsPerView - 1;
      audioPlayer.playbackRange = {
        start: {
          bar: parseInt(sFlatIndex / workspace.section.timeSignature.top) + 1,
          beat: (sFlatIndex % workspace.section.timeSignature.top) + 1
        },
        end: {
          bar: parseInt(eFlatIndex / workspace.section.timeSignature.top) + 1,
          beat: (eFlatIndex % workspace.section.timeSignature.top) + 1
        }
      };
    }

    var timeline;
    $scope.player.play = function() {
      if ($scope.player.visibleBeatsOnly) {
        updateLockedPlayerRange();
        // TODO: swiper slide size change also affect updateLockedPlayerRange
        swiperControl.barSwiper.on('transitionEnd', updateLockedPlayerRange);
      } else {
        if ($scope.player.loop) {
          var playbackRange = swiperControl.lastSlide-swiperControl.firstSlide + 1;
          if (playbackRange > workspace.section.beatsPerView) {
            swiperControl.createLoop();
          }
        }
        // go to start as soon as possible
        if (swiperControl.barSwiper.activeIndex > 0) {
          swiperControl.barSwiper.slideTo(0, 0, true);
        }
      }
      $scope.player.playing = true;
      audioPlayer.setBpm(workspace.section.bpm);
      timeline.start();

      audioPlayer.fetchResources(workspace.section)
        .then(audioPlayer.play.bind(audioPlayer, workspace.section, beatPrepared, $scope.player.countdown));

    };

    $scope.player.stop = function() {
      $scope.player.playing = false;
      audioPlayer.stop();
    };

    function playbackStopped() {
      if ($scope.player.playing && $scope.player.loop) {
        // loop mode
        audioPlayer.play(workspace.section, beatPrepared);
        return;
      }
      $scope.player.playing = false;
      audioVisualiser.deactivate();
      timeline.stop();

      // TODO: check if loop slides was created properly, this is not reliable
      if ($scope.player.loop) {
        var playbackRange = swiperControl.lastSlide-swiperControl.firstSlide + 1;
        if (playbackRange > workspace.section.beatsPerView) {
          swiperControl.destroyLoop();
        }
      }
      if ($scope.player.visibleBeatsOnly) {
        swiperControl.barSwiper.off('transitionEnd', updateLockedPlayerRange);
      }
    }
    audioPlayer.on('playbackStopped', playbackStopped);


    $scope.playDrumSound = function(drumName) {
      var sound = {
        drum: drumName,
        volume: 0.85
      };
      audioPlayer.playDrumSample(workspace.track, sound);
    };


    function createSlides(trackSection) {
      var timeSignature = workspace.section.timeSignature;

      var slides = [];
      trackSection.forEachBeat(function(beat) {
        var slideId = beat.bar+'_'+beat.index;
        slides.push({
          id: slideId,
          beat: beat.beat,
          type: workspace.track.type
        });
      });
      $scope.slides = slides;
    }

    function updateSwiperSlides() {
      $timeout(function() {
        swiperControl.setSlides($scope.slides, {
          slidesPerView: workspace.section.beatsPerView,
          slidesPerGroup: workspace.section.beatsPerSlide
        });
        $scope.player.playbackRangeChanged();
      });
    }

    $scope.initializeWorkspace = function(bassTrack, drumsTrack) {
      workspace.bassSection = new BassSection(workspace.section);
      workspace.drumSection = new DrumSection(workspace.section);
      assignTrack(workspace.bassSection, bassTrack);
      assignTrack(workspace.drumSection, drumsTrack);
      workspace.trackSection = (!workspace.trackSection || workspace.trackSection.type === 'bass')? workspace.bassSection : workspace.drumSection;
      workspace.track = workspace.trackSection.track;
      $scope.ui.trackId = workspace.track.id;
    };


    function clearSectionWorkspace() {
      audioVisualiser.clear();

      workspace.bassSection.forEachBeat(function(beat) {
        workspace.bassSection.clearBeat(beat.beat);
      });
      workspace.drumSection.forEachBeat(function(beat) {
        workspace.drumSection.clearBeat(beat.beat);
      });
    };

    function sectionLoaded(section) {
      audioVisualiser.clear();
      audioVisualiser.reinitialize();
      console.log('sectionLoaded');
      console.log(section);
      if (workspace.section) {
        for (var trackId in workspace.section.tracks) {
          var track = workspace.section.tracks[trackId];
          if (track.convertToTrackSection) {
            var convertedTrack = track.convertToTrackSection();
            convertedTrack.audio = track.audio;
            convertedTrack.instrument = track.instrument;
            workspace.section.tracks[trackId] = convertedTrack;
          }
        }
      }
      workspace.section = section;
      $scope.player.playbackRange.start = 1;
      $scope.player.playbackRange.end = section.length + 1;
      // $scope.player.playbackRangeChanged();

      var bassTrack;
      var drumsTrack;
      if (workspace.bassSection) {
        // choose already selected bass track
        bassTrack = projectManager.project.tracksMap[workspace.bassSection.track.id];
      }
      if (!bassTrack) {
        bassTrack = projectManager.project.tracksMap['bass_0'];
      }
      if (workspace.drumSection) {
        // choose already selected bass track
        drumsTrack = projectManager.project.tracksMap[workspace.drumSection.track.id];
      }
      if (!drumsTrack) {
        drumsTrack = projectManager.project.tracksMap['drums_0'];
      }

      $scope.initializeWorkspace(bassTrack, drumsTrack);
      if (section.tracks[bassTrack.id]) {
        var track = section.tracks[bassTrack.id];
        console.log('loading section data into editor');
        workspace.bassSection.loadBeats(track.data || track.rawData());
      }
      if (section.tracks[drumsTrack.id]) {
        var track = section.tracks[drumsTrack.id];
        workspace.drumSection.loadBeats(track.data || track.rawData());
      }
      section.tracks[bassTrack.id] = workspace.bassSection;
      section.tracks[drumsTrack.id] = workspace.drumSection;

      createSlides(workspace.trackSection);
      $timeout(function() {
        swiperControl.setSlides($scope.slides, {
          slidesPerView: workspace.section.beatsPerView,
          slidesPerGroup: workspace.section.beatsPerSlide
        });
        $scope.player.playbackRangeChanged();
        $scope.$broadcast('rzSliderForceRender');
      });
    }

    projectManager.on('sectionCreated', clearSectionWorkspace);
    projectManager.on('sectionLoaded', sectionLoaded);


    function assignTrack(trackSection, track) {
      trackSection.instrument = track.instrument;
      trackSection.track = track;
      trackSection.audio = track.audio;
    };


    $scope.ui.selectTrack = function(trackId) {
      console.log('selectTrack: '+trackId);
      var track = projectManager.project.tracksMap[trackId];
      if (workspace.track === track) {
        return;
      }
      if (workspace.track.type !== track.type) {
        workspace.trackSection = track.type === 'bass'? workspace.bassSection : workspace.drumSection;
        swiperControl.switchInstrument(track.type);
      }

      if (workspace.trackSection.track.id !== track.id) {

        // Save/Convert sounds from instrument workspace into simple track data
        var convertedTrack = workspace.trackSection.convertToTrackSection();

        // id of actual instrument's track (currently loaded)
        var instrumentTrackId = workspace.trackSection.track.id;
        var instrumentTrack = projectManager.project.tracksMap[instrumentTrackId];
        convertedTrack.audio = instrumentTrack.audio;
        convertedTrack.instrument = instrumentTrack.instrument;
        workspace.section.tracks[instrumentTrackId] = convertedTrack;

        // Clear instrument workspace
        workspace.trackSection.forEachBeat(function(beat) {
          workspace.trackSection.clearBeat(beat.beat);
        });

        // Load instrument workspace with selected track data
        assignTrack(workspace.trackSection, track);
        if (workspace.section.tracks && workspace.section.tracks[track.id]) {
          workspace.trackSection.loadBeats(workspace.section.tracks[track.id].data || []);
        }
        workspace.section.tracks[track.id] = workspace.trackSection;
      }
      workspace.track = track;
    };

    if (workspace.section) {
      sectionLoaded(workspace.section);
    }

    $scope.updateSlides = function() {
      workspace.bassSection.setLength(workspace.section.length);
      workspace.drumSection.setLength(workspace.section.length);
      createSlides(workspace.trackSection);
      $scope.player.playbackRange.end = workspace.section.length + 1;
      updateSwiperSlides();
    };


    $scope.$on('$destroy', function() {
      projectManager.un('sectionCreated', clearSectionWorkspace);
      projectManager.un('sectionLoaded', sectionLoaded);
      audioPlayer.un('playbackStopped', playbackStopped);
    });
    window.sw = swiperControl;

  }
})();
