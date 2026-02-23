import { mount } from "svelte";
import ConnectedApp from "./ConnectedApp.svelte";
import "./app.css";

const app = mount(ConnectedApp, {
  target: document.getElementById("app")!,
});

export default app;
