// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import Icon from './ui/Icon'

// import Vuetify from 'vuetify'
// import 'vuetify/dist/vuetify.min.css'
// Vue.use(Vuetify)

import {
  Vuetify, // required
  VApp, // required
  VBtn,
  VCheckbox,
  VGrid,
  VMenu,
  VList,
  VSelect,
  VDialog,
  VToolbar,
  VTextField,
  VSlider,
  transitions
} from 'vuetify'

require('vuetify/src/stylus/app.styl')

Vue.use(Vuetify, {
  components: {
    VApp,
    Vuetify,
    VBtn,
    VCheckbox,
    VGrid,
    VList,
    VMenu,
    VSelect,
    VDialog,
    VToolbar,
    VTextField,
    VSlider
  },
  transitions
})


function requireAll (requireContext) {
  return requireContext.keys().map(requireContext)
}
requireAll(require.context('../icons', false, /.*\.svg$/))
requireAll(require.context('../icons/musical', false, /.*\.svg$/))
requireAll(require.context('../icons/percussion', false, /.*\.svg$/))

// Disable ripple ink effect by overriding Vuetify's directive
Vue.directive('ripple', (el, binding) => {})
Vue.component('icon', Icon)

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  components: { App },
  template: '<App/>'
})
