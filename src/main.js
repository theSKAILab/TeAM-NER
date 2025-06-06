import { createApp } from "vue";
import App from "./App.vue";
import "es6-promise/auto";
import { createStore } from "vuex";
import store from "./store";
import mitt from "mitt";

import { Quasar } from "quasar";
import quasarUserOptions from "./quasar-user-options";
import './registerServiceWorker'

const app = createApp(App)
    .use(Quasar, quasarUserOptions)
    .use(createStore(store));

app.config.globalProperties.emitter = mitt()

app.mount("#app");
