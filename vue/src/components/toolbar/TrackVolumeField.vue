<template>
  <div class="layout row track-field">
    <label>
      <icon :name="track.type" />
      <span>{{ track.name }}</span>
    </label>
    <v-slider
      :min="0"
      :max="1"
      :step="0.01"
      :value="track.volume.value"
      :disabled="this.track.volume.muted"
      @input="setVolume"
      hide-details>
    </v-slider>
    <v-btn
      icon
      @click="toggleMute"
      :class="{'primary--text': !track.volume.muted}">
      <icon :name="track.volume.muted ? 'volume-mute' : 'volume-medium'" />
    </v-btn>
  </div>
</template>

<script>
export default {
  props: ['track'],
  inject: ['$player'],
  methods: {
    setVolume (value) {
      this.track.volume.value = value
      this.$player.tracks[this.track.id].audio.gain.value = value
    },
    toggleMute () {
      const muted = !this.track.volume.muted
      this.track.volume.muted = muted
      if (muted) {
        this.$player.tracks[this.track.id].audio.gain.value = 0.00001
      } else {
        this.$player.tracks[this.track.id].audio.gain.value = this.track.volume.value
      }
    }
  }
}
</script>

<style lang="scss">

.track-field {
  align-items: flex-end;
  position: relative;

  label {
    position: absolute;
    left: 0;
    top: 0;
    font-size: 85%;
    opacity: 0.9;

    .icon {
      width: 1.25rem;
      height: 1.25rem;
    }
  }

  .input-group--slider {
  }

  .btn {
    margin: 0;
    &:not(.primary--text) .icon {
      color: #555;
    }
    .icon {
      width: 1.5rem;
      height: 1.5rem;
      transition: none;
    }
  }
}
</style>